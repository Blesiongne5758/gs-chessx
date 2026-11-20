-- GS-ChessX — Supabase schema
-- Jalankan di Supabase Dashboard → SQL Editor, lalu jalankan
-- supabase/migrations/002_edit_profile.sql.

-- ============ PROFILES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text,
  avatar_url text,
  country text default 'ID',
  rating integer not null default 1200,
  games_played integer not null default 0,
  wins integer not null default 0,
  is_pro boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create a profile row on signup, column-level update grants,
-- username format rule and the "avatars" storage bucket:
-- see supabase/migrations/002_edit_profile.sql (run it right after this file).

-- ============ FRIENDSHIPS ============
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create policy "Users see own friendships"
  on public.friendships for select
  using (auth.uid() in (requester_id, addressee_id));

create policy "Users send friend requests"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

create policy "Addressee responds to requests"
  on public.friendships for update
  using (auth.uid() = addressee_id);

-- ============ GAMES ============
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  white_id uuid references public.profiles(id),
  black_id uuid references public.profiles(id),
  time_control text not null default '10+0',
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn text not null default '',
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished', 'aborted')),
  result text check (result in ('1-0', '0-1', '1/2-1/2')),
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;

create policy "Games are viewable by everyone" on public.games for select using (true);
create policy "Players create games" on public.games for insert
  with check (auth.uid() in (white_id, black_id));
create policy "Players update their games" on public.games for update
  using (auth.uid() in (white_id, black_id));

-- ============ MOVES (Realtime) ============
create table if not exists public.moves (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  ply integer not null,
  san text not null,
  fen text not null,
  player_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (game_id, ply)
);

alter table public.moves enable row level security;

create policy "Moves are viewable by everyone" on public.moves for select using (true);
create policy "Players insert own moves" on public.moves for insert
  with check (
    auth.uid() = player_id
    and exists (select 1 from public.games g where g.id = game_id and auth.uid() in (g.white_id, g.black_id))
  );

alter publication supabase_realtime add table public.moves;
alter publication supabase_realtime add table public.games;

-- ============ TOURNAMENTS ============
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  format text not null check (format in ('swiss', 'knockout', 'arena')),
  status text not null default 'upcoming' check (status in ('upcoming', 'running', 'finished')),
  prize_pool text,
  starts_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.tournaments enable row level security;
create policy "Tournaments are viewable by everyone" on public.tournaments for select using (true);
