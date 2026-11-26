-- GS-ChessX — read-only claim metadata
-- Eligibility and allocations belong to a trusted server/Merkle service.
-- Do not expose token balances, proofs, or signing secrets in profiles.

alter table public.profiles
  add column if not exists wallet_ownership_verified_at timestamptz,
  add column if not exists wallet_claim_checked_at timestamptz;

revoke update on public.profiles from anon, authenticated;
grant update (username, avatar_url, country, wallet_address, wallet_chain, wallet_chain_id, wallet_status, wallet_connected_at, wallet_ownership_verified_at, wallet_claim_checked_at) on public.profiles to authenticated;
