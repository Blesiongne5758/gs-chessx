-- GS-ChessX — Migration 005: Admin membuat / mengubah / menghapus turnamen
-- Jalankan di Supabase SQL Editor setelah 004_swiss_pairing.sql.
--
-- Aturan:
--   * Hanya profiles.is_admin = true yang boleh insert / update / delete.
--   * Admin hanya bisa mengubah atau menghapus turnamen yang BELUM dimulai (status 'upcoming').
--   * Kolom status, current_round, winner_id, created_by tidak bisa diisi dari browser —
--     status dikelola Edge Function `swiss` (service role).

alter table public.tournaments
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

-- 1) Helper: is the caller an admin? (security definer so it can read profiles under RLS)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2) Data rules (apply to everyone, including the service role)
do $$
begin
  alter table public.tournaments drop constraint if exists tournaments_name_len;
  alter table public.tournaments add constraint tournaments_name_len
    check (char_length(btrim(name)) between 3 and 80);

  alter table public.tournaments drop constraint if exists tournaments_description_len;
  alter table public.tournaments add constraint tournaments_description_len
    check (description is null or char_length(description) <= 500);

  alter table public.tournaments drop constraint if exists tournaments_prize_len;
  alter table public.tournaments add constraint tournaments_prize_len
    check (prize_pool is null or char_length(prize_pool) <= 80);

  alter table public.tournaments drop constraint if exists tournaments_time_control_fmt;
  alter table public.tournaments add constraint tournaments_time_control_fmt
    check (time_control ~ '^[0-9]{1,3}\+[0-9]{1,3}$');

  alter table public.tournaments drop constraint if exists tournaments_rounds_range;
  alter table public.tournaments add constraint tournaments_rounds_range
    check (rounds is null or rounds between 1 and 30);

  alter table public.tournaments drop constraint if exists tournaments_ends_after_start;
  alter table public.tournaments add constraint tournaments_ends_after_start
    check (ends_at is null or starts_at is null or ends_at > starts_at);
end $$;

-- 3) Column-level privileges: browsers can only write the descriptive columns.
revoke insert, update, delete on public.tournaments from anon, authenticated;
grant insert (name, description, format, time_control, max_players, rounds, prize_pool, starts_at, ends_at, is_pro_only)
  on public.tournaments to authenticated;
grant update (name, description, time_control, max_players, rounds, prize_pool, starts_at, ends_at, is_pro_only)
  on public.tournaments to authenticated;
grant delete on public.tournaments to authenticated;

-- 4) Row-level policies
drop policy if exists "Admins create tournaments" on public.tournaments;
create policy "Admins create tournaments"
  on public.tournaments for insert to authenticated
  with check (public.is_admin() and status = 'upcoming');

drop policy if exists "Admins edit upcoming tournaments" on public.tournaments;
create policy "Admins edit upcoming tournaments"
  on public.tournaments for update to authenticated
  using (public.is_admin() and status = 'upcoming')
  with check (public.is_admin() and status = 'upcoming');

drop policy if exists "Admins delete upcoming tournaments" on public.tournaments;
create policy "Admins delete upcoming tournaments"
  on public.tournaments for delete to authenticated
  using (public.is_admin() and status = 'upcoming');

-- 5) Extra checks for changes made from the browser (auth.uid() is null for the service role)
create or replace function public.check_tournament_admin_write()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  registered integer;
begin
  if auth.uid() is null then
    return new; -- service role / SQL editor: trusted
  end if;

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.status := 'upcoming';
    new.current_round := 0;
    new.winner_id := null;
    if new.starts_at is null or new.starts_at <= now() then
      raise exception 'Waktu mulai harus di masa depan.';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.starts_at is distinct from old.starts_at and (new.starts_at is null or new.starts_at <= now()) then
    raise exception 'Waktu mulai harus di masa depan.';
  end if;
  if new.max_players < old.max_players then
    select count(*) into registered from public.tournament_participants where tournament_id = old.id;
    if new.max_players < registered then
      raise exception 'Sudah ada % pemain terdaftar; kuota tidak boleh lebih kecil.', registered;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists before_tournament_admin_write on public.tournaments;
create trigger before_tournament_admin_write
  before insert or update on public.tournaments
  for each row execute function public.check_tournament_admin_write();
