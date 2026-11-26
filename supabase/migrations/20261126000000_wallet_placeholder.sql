-- GS-ChessX — non-custodial wallet placeholder
-- Stores public wallet metadata only. Never store private keys, seed phrases, or token secrets.

alter table public.profiles
  add column if not exists wallet_address text,
  add column if not exists wallet_chain text,
  add column if not exists wallet_chain_id text,
  add column if not exists wallet_status text not null default 'disconnected',
  add column if not exists wallet_connected_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_wallet_status_check;

alter table public.profiles
  add constraint profiles_wallet_status_check
  check (wallet_status in ('disconnected', 'pending_verification', 'connected'));

create unique index if not exists profiles_wallet_address_unique
  on public.profiles (lower(wallet_address))
  where wallet_address is not null;

-- Existing profile update policy intentionally grants only editable columns.
-- Add only public wallet metadata; rewards and balances must be written by a trusted server later.
revoke update on public.profiles from anon, authenticated;
grant update (username, avatar_url, country, wallet_address, wallet_chain, wallet_chain_id, wallet_status, wallet_connected_at) on public.profiles to authenticated;
