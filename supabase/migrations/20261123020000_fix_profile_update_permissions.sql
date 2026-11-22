-- GS-ChessX — Fix profile editing permissions
-- Run once in Supabase Dashboard → SQL Editor.
-- Users can update only their own editable profile columns; rating/stats/admin fields remain protected.

alter table public.profiles enable row level security;

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke update on public.profiles from anon, authenticated;
grant update (username, avatar_url, country) on public.profiles to authenticated;

grant select on public.profiles to anon, authenticated;
