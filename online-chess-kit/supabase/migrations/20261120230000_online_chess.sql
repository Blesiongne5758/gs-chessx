-- GS-ChessX online chess schema. Apply once with Supabase CLI or SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.chess_games (
  id uuid primary key default gen_random_uuid(),
  white_player_id uuid not null references auth.users(id) on delete cascade,
  black_player_id uuid references auth.users(id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting','active','completed','resigned','timeout','draw','cancelled')),
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn text not null default '',
  ply integer not null default 0 check (ply >= 0),
  turn text not null default 'white' check (turn in ('white','black')),
  base_seconds integer not null default 600 check (base_seconds > 0),
  increment_seconds integer not null default 0 check (increment_seconds >= 0),
  white_seconds numeric(10,3) not null,
  black_seconds numeric(10,3) not null,
  turn_started_at timestamptz,
  winner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chess_games_distinct_players check (black_player_id is null or white_player_id <> black_player_id),
  constraint active_game_has_players_and_clock check (
    status <> 'active' or (black_player_id is not null and turn_started_at is not null)
  )
);

create table if not exists public.chess_moves (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.chess_games(id) on delete cascade,
  ply integer not null check (ply > 0),
  player_id uuid not null references auth.users(id) on delete cascade,
  from_square text not null check (from_square ~ '^[a-h][1-8]$'),
  to_square text not null check (to_square ~ '^[a-h][1-8]$'),
  promotion text check (promotion is null or promotion in ('q','r','b','n')),
  san text not null,
  uci text not null,
  fen_after text not null,
  created_at timestamptz not null default now(),
  unique (game_id, ply)
);

create index if not exists chess_games_white_idx on public.chess_games(white_player_id);
create index if not exists chess_games_black_idx on public.chess_games(black_player_id);
create index if not exists chess_moves_game_ply_idx on public.chess_moves(game_id, ply);

alter table public.chess_games enable row level security;
alter table public.chess_moves enable row level security;

-- Participants may read a game and its move history. No client-side writes.
drop policy if exists chess_games_read_participant on public.chess_games;
create policy chess_games_read_participant on public.chess_games
  for select to authenticated
  using ((select auth.uid()) = white_player_id or (select auth.uid()) = black_player_id);

drop policy if exists chess_moves_read_participant on public.chess_moves;
create policy chess_moves_read_participant on public.chess_moves
  for select to authenticated
  using (exists (
    select 1 from public.chess_games g
    where g.id = chess_moves.game_id
      and ((select auth.uid()) = g.white_player_id or (select auth.uid()) = g.black_player_id)
  ));

revoke all on public.chess_games from anon, authenticated;
revoke all on public.chess_moves from anon, authenticated;
grant select on public.chess_games, public.chess_moves to authenticated;
grant select, insert, update on public.chess_games, public.chess_moves to service_role;
grant usage, select on sequence public.chess_moves_id_seq to service_role;

-- This RPC is callable only by the Edge Function's service-role client.
-- It rechecks participant, active status, turn, sequence and clock while holding a row lock.
create or replace function public.commit_chess_move(
  p_game_id uuid,
  p_player_id uuid,
  p_expected_ply integer,
  p_from text,
  p_to text,
  p_promotion text,
  p_san text,
  p_uci text,
  p_fen text,
  p_pgn text,
  p_next_turn text,
  p_next_status text,
  p_winner_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  g public.chess_games%rowtype;
  elapsed numeric(10,3);
  remaining numeric(10,3);
  next_white numeric(10,3);
  next_black numeric(10,3);
  expected_color text;
  winner uuid;
begin
  if p_player_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_from !~ '^[a-h][1-8]$' or p_to !~ '^[a-h][1-8]$' then raise exception 'INVALID_SQUARE'; end if;
  if p_promotion is not null and p_promotion not in ('q','r','b','n') then raise exception 'INVALID_PROMOTION'; end if;
  if p_next_turn not in ('white','black') or p_next_status not in ('active','completed') then raise exception 'INVALID_NEXT_STATE'; end if;

  select * into g from public.chess_games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if p_player_id <> g.white_player_id and p_player_id is distinct from g.black_player_id then raise exception 'NOT_A_PLAYER'; end if;
  if g.status <> 'active' then raise exception 'GAME_NOT_ACTIVE'; end if;
  if g.ply <> p_expected_ply then raise exception 'STALE_GAME_STATE'; end if;
  expected_color := case when p_player_id = g.white_player_id then 'white' else 'black' end;
  if g.turn <> expected_color then raise exception 'NOT_YOUR_TURN'; end if;

  elapsed := greatest(0, extract(epoch from (clock_timestamp() - coalesce(g.turn_started_at, clock_timestamp())))::numeric);
  remaining := case when g.turn = 'white' then g.white_seconds else g.black_seconds end - elapsed;
  if remaining <= 0 then
    winner := case when g.turn = 'white' then g.black_player_id else g.white_player_id end;
    update public.chess_games set
      status = 'timeout', winner_id = winner,
      white_seconds = case when g.turn = 'white' then 0 else g.white_seconds end,
      black_seconds = case when g.turn = 'black' then 0 else g.black_seconds end,
      turn_started_at = null, updated_at = clock_timestamp()
    where id = g.id;
    return jsonb_build_object('error','TIME_EXPIRED','winner_id',winner,'status','timeout');
  end if;

  next_white := g.white_seconds;
  next_black := g.black_seconds;
  if g.turn = 'white' then next_white := remaining + g.increment_seconds;
  else next_black := remaining + g.increment_seconds; end if;

  insert into public.chess_moves(game_id, ply, player_id, from_square, to_square, promotion, san, uci, fen_after)
  values (g.id, g.ply + 1, p_player_id, p_from, p_to, p_promotion, p_san, p_uci, p_fen);

  update public.chess_games set
    fen = p_fen,
    pgn = p_pgn,
    ply = g.ply + 1,
    turn = p_next_turn,
    status = p_next_status,
    white_seconds = next_white,
    black_seconds = next_black,
    turn_started_at = case when p_next_status = 'active' then clock_timestamp() else null end,
    winner_id = p_winner_id,
    updated_at = clock_timestamp()
  where id = g.id;

  return jsonb_build_object(
    'id', g.id, 'fen', p_fen, 'pgn', p_pgn, 'ply', g.ply + 1,
    'turn', p_next_turn, 'status', p_next_status,
    'white_seconds', next_white, 'black_seconds', next_black,
    'turn_started_at', case when p_next_status = 'active' then clock_timestamp() else null end
  );
end;
$$;

revoke all on function public.commit_chess_move(uuid,uuid,integer,text,text,text,text,text,text,text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.commit_chess_move(uuid,uuid,integer,text,text,text,text,text,text,text,text,text,uuid) to service_role;

create or replace function public.claim_chess_timeout(p_game_id uuid, p_player_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  g public.chess_games%rowtype;
  remaining numeric(10,3);
  winner uuid;
begin
  select * into g from public.chess_games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  if p_player_id <> g.white_player_id and p_player_id is distinct from g.black_player_id then raise exception 'NOT_A_PLAYER'; end if;
  if g.status <> 'active' then raise exception 'GAME_NOT_ACTIVE'; end if;
  remaining := case when g.turn = 'white' then g.white_seconds else g.black_seconds end
    - greatest(0, extract(epoch from (clock_timestamp() - coalesce(g.turn_started_at, clock_timestamp())))::numeric);
  if remaining > 0 then return jsonb_build_object('error','CLOCK_RUNNING','remaining',remaining); end if;
  winner := case when g.turn = 'white' then g.black_player_id else g.white_player_id end;
  update public.chess_games set status = 'timeout', winner_id = winner,
    white_seconds = case when g.turn = 'white' then 0 else g.white_seconds end,
    black_seconds = case when g.turn = 'black' then 0 else g.black_seconds end,
    turn_started_at = null, updated_at = clock_timestamp()
  where id = g.id;
  return jsonb_build_object('status','timeout','winner_id',winner);
end;
$$;
revoke all on function public.claim_chess_timeout(uuid,uuid) from public, anon, authenticated;
grant execute on function public.claim_chess_timeout(uuid,uuid) to service_role;

-- Publish row changes for client subscriptions. Safe to run repeatedly.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chess_games') then
    alter publication supabase_realtime add table public.chess_games;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chess_moves') then
    alter publication supabase_realtime add table public.chess_moves;
  end if;
end $$;
