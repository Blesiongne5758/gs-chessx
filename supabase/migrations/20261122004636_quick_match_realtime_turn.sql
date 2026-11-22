-- Quick Match membership is stored so private Realtime topics can be authorized.
create table if not exists public.quick_matches (
  id uuid primary key,
  white_id uuid not null references public.profiles(id) on delete cascade,
  black_id uuid not null references public.profiles(id) on delete cascade,
  time_control text not null default 'Rapid (10+0)',
  created_at timestamptz not null default now(),
  constraint quick_matches_distinct_players check (white_id <> black_id)
);

alter table public.quick_matches enable row level security;
revoke all on table public.quick_matches from anon, authenticated;
grant select, insert on table public.quick_matches to authenticated;

drop policy if exists "Players can read their quick matches" on public.quick_matches;
create policy "Players can read their quick matches"
  on public.quick_matches for select to authenticated
  using ((select auth.uid()) in (white_id, black_id));

drop policy if exists "A player can create an accepted quick match" on public.quick_matches;
create policy "A player can create an accepted quick match"
  on public.quick_matches for insert to authenticated
  with check (
    (select auth.uid()) in (white_id, black_id)
    and white_id <> black_id
  );

-- The shared lobby is private: only signed-in users can publish presence or
-- send/receive Quick Match challenge and response broadcasts.
drop policy if exists "Authenticated users can read quick match lobby" on realtime.messages;
create policy "Authenticated users can read quick match lobby"
  on realtime.messages for select to authenticated
  using (
    realtime.topic() = 'quick-match-lobby'
    and extension in ('broadcast', 'presence')
  );

drop policy if exists "Authenticated users can publish to quick match lobby" on realtime.messages;
create policy "Authenticated users can publish to quick match lobby"
  on realtime.messages for insert to authenticated
  with check (
    realtime.topic() = 'quick-match-lobby'
    and extension in ('broadcast', 'presence')
  );

-- Game and voice signals are broadcast only to the two authenticated players
-- recorded in the match membership table.
drop policy if exists "Quick match players can receive private match broadcasts" on realtime.messages;
create policy "Quick match players can receive private match broadcasts"
  on realtime.messages for select to authenticated
  using (
    extension = 'broadcast'
    and (
      (realtime.topic() like 'chess-game:%' and exists (
        select 1 from public.quick_matches m
        where m.id::text = split_part(realtime.topic(), ':', 2)
          and (select auth.uid()) in (m.white_id, m.black_id)
      ))
      or
      (realtime.topic() like 'chess-voice:%' and exists (
        select 1 from public.quick_matches m
        where m.id::text = split_part(realtime.topic(), ':', 2)
          and (select auth.uid()) in (m.white_id, m.black_id)
      ))
    )
  );

drop policy if exists "Quick match players can send private match broadcasts" on realtime.messages;
create policy "Quick match players can send private match broadcasts"
  on realtime.messages for insert to authenticated
  with check (
    extension = 'broadcast'
    and (
      (realtime.topic() like 'chess-game:%' and exists (
        select 1 from public.quick_matches m
        where m.id::text = split_part(realtime.topic(), ':', 2)
          and (select auth.uid()) in (m.white_id, m.black_id)
      ))
      or
      (realtime.topic() like 'chess-voice:%' and exists (
        select 1 from public.quick_matches m
        where m.id::text = split_part(realtime.topic(), ':', 2)
          and (select auth.uid()) in (m.white_id, m.black_id)
      ))
    )
  );
