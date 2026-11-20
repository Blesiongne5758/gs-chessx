-- GS-ChessX — Migration 002: Edit Profile (username + avatar)
-- Jalankan di Supabase SQL Editor jika schema.sql sudah pernah dijalankan sebelumnya.
-- (Proyek baru cukup menjalankan supabase/schema.sql yang sudah mencakup isi file ini.)

-- 1) Users may only update their own username / avatar_url / country.
--    Without this, the row-level "update own profile" policy would let a user set
--    their own rating, wins or is_pro from the browser.
revoke update on public.profiles from anon, authenticated;
grant update (username, avatar_url, country) on public.profiles to authenticated;

-- 2) Username format: 3–20 chars, letters / digits / underscore.
alter table public.profiles drop constraint if exists username_format;
alter table public.profiles
  add constraint username_format check (username ~ '^[A-Za-z0-9_]{3,20}$') not valid;

-- 3) Sanitize usernames produced by the signup trigger so they satisfy the rule above.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base text;
begin
  base := regexp_replace(
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    '[^A-Za-z0-9_]', '_', 'g'
  );
  base := left(rpad(base, 3, '_'), 15);
  insert into public.profiles (id, username, email, avatar_url)
  values (new.id, base || '_' || substr(replace(new.id::text, '-', ''), 1, 4), new.email,
          new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) Public "avatars" storage bucket (2 MB, images only).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 5) Storage policies: anyone can view; users write only inside their own folder "<user_id>/...".
drop policy if exists "Avatar images are public" on storage.objects;
create policy "Avatar images are public"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Users delete own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
