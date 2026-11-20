-- GS-ChessX — Migration 004: Automatic Swiss pairing
-- Jalankan di Supabase SQL Editor setelah 003_tournaments.sql.
-- Pairing dibuat oleh Edge Function `swiss` (supabase/functions/swiss) dengan service role.

-- 1) Admins (tournament directors). Users cannot change this column themselves:
--    migration 002 only grants UPDATE on (username, avatar_url, country).
alter table public.profiles add column if not exists is_admin boolean not null default false;
-- Jadikan akun Anda admin:
--   update public.profiles set is_admin = true where email = 'anda@email.com';

-- 2) Round tracking + tiebreaks
alter table public.tournaments add column if not exists current_round integer not null default 0;
alter table public.tournament_participants
  add column if not exists buchholz numeric(6,1) not null default 0,
  add column if not exists withdrawn boolean not null default false;

-- 3) Pairings (one row per board; black_id null = bye)
create table if not exists public.tournament_pairings (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round integer not null check (round >= 1),
  board integer not null check (board >= 1),
  white_id uuid not null references public.profiles(id),
  black_id uuid references public.profiles(id),
  result text check (result in ('1-0', '0-1', '1/2-1/2', 'bye')),
  game_id uuid references public.games(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Unique board per round also stops two concurrent requests from pairing the same round twice.
  unique (tournament_id, round, board),
  check (white_id is distinct from black_id),
  check ((black_id is null) = (result is not distinct from 'bye'))
);

create index if not exists tournament_pairings_round_idx on public.tournament_pairings (tournament_id, round);
create index if not exists tournament_pairings_white_idx on public.tournament_pairings (white_id);
create index if not exists tournament_pairings_black_idx on public.tournament_pairings (black_id);

alter table public.tournament_pairings enable row level security;

drop policy if exists "Pairings are viewable by everyone" on public.tournament_pairings;
create policy "Pairings are viewable by everyone"
  on public.tournament_pairings for select using (true);
-- No insert/update/delete policies: only the Edge Function (service role) writes pairings.

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tournament_pairings_touch on public.tournament_pairings;
create trigger tournament_pairings_touch
  before update on public.tournament_pairings
  for each row execute function public.touch_updated_at();

do $$
begin
  alter publication supabase_realtime add table public.tournament_pairings;
exception when duplicate_object then null;
end $$;

-- 4) (Opsional) Mulai turnamen Swiss otomatis saat starts_at tiba, via pg_cron + pg_net.
--    Aktifkan extension pg_cron & pg_net di Dashboard → Database → Extensions, lalu jalankan
--    (ganti <PROJECT_REF> dan <SERVICE_ROLE_KEY>):
--
-- select cron.schedule('swiss-tick', '* * * * *', $$
--   select net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/swiss',
--     headers := jsonb_build_object('Content-Type', 'application/json',
--                                   'Authorization', 'Bearer <SERVICE_ROLE_KEY>'),
--     body := '{"action":"tick"}'::jsonb
--   );
-- $$);
