-- Private direct messages between accepted friends.
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint chat_messages_distinct_users check (sender_id <> recipient_id)
);
create index if not exists chat_messages_pair_created_idx
  on public.chat_messages (sender_id, recipient_id, created_at desc);
create index if not exists chat_messages_recipient_created_idx
  on public.chat_messages (recipient_id, created_at desc);

alter table public.chat_messages enable row level security;
revoke all on table public.chat_messages from anon, authenticated;
grant select, insert on table public.chat_messages to authenticated;

create policy "Friends can read their direct messages"
  on public.chat_messages for select to authenticated
  using (
    (select auth.uid()) in (sender_id, recipient_id)
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = sender_id and f.addressee_id = recipient_id)
          or (f.requester_id = recipient_id and f.addressee_id = sender_id))
    )
  );
create policy "Friends can send direct messages"
  on public.chat_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = sender_id and f.addressee_id = recipient_id)
          or (f.requester_id = recipient_id and f.addressee_id = sender_id))
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

-- WebRTC call signaling is transient app data; media never passes through Postgres.
create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('offer', 'answer', 'candidate', 'hangup')),
  payload jsonb,
  created_at timestamptz not null default now(),
  constraint call_signals_distinct_users check (sender_id <> recipient_id)
);
create index if not exists call_signals_pair_created_idx
  on public.call_signals (sender_id, recipient_id, created_at desc);
alter table public.call_signals enable row level security;
revoke all on table public.call_signals from anon, authenticated;
grant select, insert, delete on table public.call_signals to authenticated;
create policy "Friends can read call signals"
  on public.call_signals for select to authenticated
  using (
    (select auth.uid()) in (sender_id, recipient_id)
    and exists (
      select 1 from public.friendships f where f.status = 'accepted'
        and ((f.requester_id = sender_id and f.addressee_id = recipient_id)
          or (f.requester_id = recipient_id and f.addressee_id = sender_id))
    )
  );
create policy "Friends can create their own call signals"
  on public.call_signals for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.friendships f where f.status = 'accepted'
        and ((f.requester_id = sender_id and f.addressee_id = recipient_id)
          or (f.requester_id = recipient_id and f.addressee_id = sender_id))
    )
  );
create policy "Friends can clear call signals"
  on public.call_signals for delete to authenticated
  using (
    (select auth.uid()) in (sender_id, recipient_id)
    and exists (
      select 1 from public.friendships f where f.status = 'accepted'
        and ((f.requester_id = sender_id and f.addressee_id = recipient_id)
          or (f.requester_id = recipient_id and f.addressee_id = sender_id))
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'call_signals'
  ) then
    alter publication supabase_realtime add table public.call_signals;
  end if;
end $$;

-- Keep request participants immutable and let only the addressee accept or block.
drop policy if exists "Users send friend requests" on public.friendships;
create policy "Users send friend requests"
  on public.friendships for insert to authenticated
  with check (requester_id = (select auth.uid()) and requester_id <> addressee_id and status = 'pending');
drop policy if exists "Addressee responds to requests" on public.friendships;
revoke update on table public.friendships from anon, authenticated;
grant update (status) on table public.friendships to authenticated;
create policy "Addressee responds to requests"
  on public.friendships for update to authenticated
  using (addressee_id = (select auth.uid()) and status = 'pending')
  with check (addressee_id = (select auth.uid()) and status in ('accepted', 'blocked'));
