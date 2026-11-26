import { getTokenConfig } from './wallet';

export const MERKLE_CLAIM_ABI = [
  'function merkleRoot() view returns (bytes32)',
  'function claimed(uint256 index) view returns (bool)',
  'function claim(uint256 index, address account, uint256 amount, bytes32[] proof)',
];

export function getClaimConfig() {
  const token = getTokenConfig();
  return {
    contract: token.tokenContract,
    chainId: token.chainId,
    merkleRoot: import.meta.env.VITE_MEMECOIN_MERKLE_ROOT || '',
    proofUrl: import.meta.env.VITE_MEMECOIN_PROOF_URL || '',
    configured: Boolean(token.tokenContract && token.chainId && import.meta.env.VITE_MEMECOIN_MERKLE_ROOT && import.meta.env.VITE_MEMECOIN_PROOF_URL),
  };
}

function normalizeProofPayload(payload, address) {
  const index = Number(payload?.index);
  const amount = String(payload?.amount || '');
  const proof = Array.isArray(payload?.proof) ? payload.proof : [];
  if (!Number.isSafeInteger(index) || index < 0) throw new Error('Eligibility response has an invalid index.');
  if (!/^\d+$/.test(amount) || amount === '0') throw new Error('Eligibility response has an invalid amount.');
  if (!proof.every((item) => /^0x[0-9a-fA-F]{64}$/.test(item))) throw new Error('Eligibility response has an invalid Merkle proof.');
  if (payload.account && String(payload.account).toLowerCase() !== String(address).toLowerCase()) throw new Error('Eligibility response does not match this wallet.');
  return { index, amount, proof, account: address, merkleRoot: payload.merkleRoot || null };
}

export async function fetchClaimEligibility(address) {
  const config = getClaimConfig();
  if (!address) throw new Error('Connect a wallet before checking eligibility.');
  if (!config.configured) return { configured: false, eligible: false, reason: 'Claim contract and proof service are not configured yet.' };

  const url = new URL(config.proofUrl);
  url.searchParams.set('address', address);
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Eligibility service returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (payload?.eligible === false) return { configured: true, eligible: false, reason: payload.reason || 'This wallet is not eligible.' };
  const allocation = normalizeProofPayload(payload, address);
  if (allocation.merkleRoot && allocation.merkleRoot.toLowerCase() !== config.merkleRoot.toLowerCase()) {
    throw new Error('Eligibility proof root does not match the configured contract root.');
  }
  return { configured: true, eligible: true, allocation };
}
