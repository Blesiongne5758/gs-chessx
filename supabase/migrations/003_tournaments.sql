-- GS-ChessX — Migration 003: Tournaments page (details, participants, join/leave)
-- Jalankan di Supabase SQL Editor setelah 002_edit_profile.sql.

-- 1) Extra tournament details
alter table public.tournaments
  add column if not exists description text,
  add column if not exists time_control text not null default '3+2',
  add column if not exists max_players integer not null default 64 check (max_players between 2 and 1024),
  add column if not exists rounds integer,
  add column if not exists ends_at timestamptz,
  add column if not exists is_pro_only boolean not null default false,
  add column if not exists winner_id uuid references public.profiles(id);

-- 2) Participants / standings
create table if not exists public.tournament_participants (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  score numeric(5,1) not null default 0,
  wins integer not null default 0,
  draws integer not null default 0,
  losses integer not null default 0,
  joined_at timestamptz not null default now(),
  primary key (tournament_id, player_id)
);

create index if not exists tournament_participants_player_idx on public.tournament_participants (player_id);

alter table public.tournament_participants enable row level security;

drop policy if exists "Participants are viewable by everyone" on public.tournament_participants;
create policy "Participants are viewable by everyone"
  on public.tournament_participants for select using (true);

-- Users register themselves; status/capacity/Pro rules are enforced by the trigger below.
drop policy if exists "Users join tournaments" on public.tournament_participants;
create policy "Users join tournaments"
  on public.tournament_participants for insert to authenticated
  with check (auth.uid() = player_id);

-- Users may withdraw only before the tournament starts.
drop policy if exists "Users leave upcoming tournaments" on public.tournament_participants;
create policy "Users leave upcoming tournaments"
  on public.tournament_participants for delete to authenticated
  using (
    auth.uid() = player_id
    and exists (select 1 from public.tournaments t where t.id = tournament_id and t.status = 'upcoming')
  );

-- Scores are written by the server (service role) only: no update policy, no grants.
revoke update on public.tournament_participants from anon, authenticated;

-- 3) Registration rules (row lock on the tournament prevents over-filling under concurrency)
create or replace function public.check_tournament_registration()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  t public.tournaments%rowtype;
  taken integer;
begin
  select * into t from public.tournaments where id = new.tournament_id for update;
  if not found then
    raise exception 'Turnamen tidak ditemukan.';
  end if;
  if t.status <> 'upcoming' then
    raise exception 'Pendaftaran sudah ditutup.';
  end if;
  if t.is_pro_only and not coalesce((select is_pro from public.profiles where id = new.player_id), false) then
    raise exception 'Turnamen ini khusus pemain Pro.';
  end if;
  select count(*) into taken from public.tournament_participants where tournament_id = new.tournament_id;
  if taken >= t.max_players then
    raise exception 'Turnamen sudah penuh.';
  end if;
  -- Clients may not seed their own score
  new.score := 0; new.wins := 0; new.draws := 0; new.losses := 0; new.joined_at := now();
  return new;
end;
$$;

drop trigger if exists before_tournament_join on public.tournament_participants;
create trigger before_tournament_join
  before insert on public.tournament_participants
  for each row execute function public.check_tournament_registration();

-- 4) Realtime so player counts update live
do $$
begin
  alter publication supabase_realtime add table public.tournament_participants;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.tournaments;
exception when duplicate_object then null;
end $$;

-- 5) Sample tournaments (only if the table is still empty)
insert into public.tournaments (name, description, format, status, time_control, max_players, rounds, prize_pool, starts_at, ends_at, is_pro_only)
select * from (values
  ('Holy Kingdom Blitz Arena', 'Arena 60 menit — main sebanyak mungkin, setiap kemenangan beruntun dapat bonus poin.', 'arena', 'upcoming', '3+2', 128, null::int, '5.000 Gems', now() + interval '2 hours 15 minutes', now() + interval '3 hours 15 minutes', false),
  ('Anarchy Rebellion Swiss', 'Swiss 7 ronde untuk semua level. Pasangan ditentukan berdasarkan skor.', 'swiss', 'upcoming', '10+0', 64, 7, 'Skin Eksklusif + 3.000 Gems', now() + interval '1 day', now() + interval '1 day 4 hours', false),
  ('Grandmaster Knockout', 'Sistem gugur 32 pemain. Kalah sekali langsung tersingkir.', 'knockout', 'upcoming', '5+3', 32, 5, 'Pro 1 Tahun', now() + interval '3 days', now() + interval '3 days 5 hours', true),
  ('Bullet Mayhem', 'Arena bullet 30 menit. Cepat, brutal, menyenangkan.', 'arena', 'running', '1+0', 256, null::int, '1.000 Gems', now() - interval '10 minutes', now() + interval '20 minutes', false),
  ('Weekly Rapid Swiss #47', 'Swiss mingguan 5 ronde.', 'swiss', 'finished', '10+5', 64, 5, '2.000 Gems', now() - interval '3 days', now() - interval '3 days' + interval '3 hours', false)
) as v(name, description, format, status, time_control, max_players, rounds, prize_pool, starts_at, ends_at, is_pro_only)
where not exists (select 1 from public.tournaments);
