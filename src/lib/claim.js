import {
  AbiCoder,
  BrowserProvider,
  Contract,
  concat,
  getAddress,
  isAddress,
  keccak256,
} from 'ethers';
import { getTokenConfig } from './wallet';

export const MERKLE_CLAIM_ABI = [
  'function merkleRoot() view returns (bytes32)',
  'function claimed(uint256 index) view returns (bool)',
  'function claim(uint256 index, address account, uint256 amount, bytes32[] proof)',
];

const abiCoder = AbiCoder.defaultAbiCoder();
const ZERO_HASH = `0x${'0'.repeat(64)}`;

export function getClaimConfig() {
  const token = getTokenConfig();
  const merkleRoot = import.meta.env.VITE_MEMECOIN_MERKLE_ROOT || '';
  const proofUrl = import.meta.env.VITE_MEMECOIN_PROOF_URL || '';
  return {
    contract: token.tokenContract,
    chainId: token.chainId,
    merkleRoot,
    proofUrl,
    configured: Boolean(token.tokenContract && token.chainId && merkleRoot && proofUrl),
  };
}

export function hashGsxLeaf({ index, account, amount }) {
  if (!/^\d+$/.test(String(index))) {
    throw new Error('Allocation index is invalid.');
  }
  if (!isAddress(account)) throw new Error('Allocation account is invalid.');
  if (!/^\d+$/.test(String(amount)) || amount === '0') throw new Error('Allocation amount is invalid.');
  const encoded = abiCoder.encode(['uint256', 'address', 'uint256'], [BigInt(index), getAddress(account), BigInt(amount)]);
  return keccak256(keccak256(encoded));
}

function hashSortedPair(left, right) {
  const ordered = BigInt(left) <= BigInt(right) ? [left, right] : [right, left];
  return keccak256(concat(ordered));
}

export function verifyMerkleProof({ root, leaf, proof }) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(root) || root.toLowerCase() === ZERO_HASH) return false;
  if (!/^0x[0-9a-fA-F]{64}$/.test(leaf)) return false;
  if (!Array.isArray(proof) || proof.some((node) => !/^0x[0-9a-fA-F]{64}$/.test(node))) return false;
  let computed = leaf;
  for (const sibling of proof) computed = hashSortedPair(computed, sibling);
  return computed.toLowerCase() === root.toLowerCase();
}

function normalizeProofPayload(payload, address) {
  const index = String(payload?.index ?? '');
  const amount = String(payload?.amount || '');
  const proof = Array.isArray(payload?.proof) ? payload.proof : [];
  if (!/^\d+$/.test(index)) throw new Error('Eligibility response has an invalid index.');
  if (!/^\d+$/.test(amount) || amount === '0') throw new Error('Eligibility response has an invalid amount.');
  if (!proof.every((item) => /^0x[0-9a-fA-F]{64}$/.test(item))) throw new Error('Eligibility response has an invalid Merkle proof.');
  if (payload.account && String(payload.account).toLowerCase() !== String(address).toLowerCase()) throw new Error('Eligibility response does not match this wallet.');
  const allocation = { index, amount, proof, account: getAddress(address), merkleRoot: payload.merkleRoot || null };
  const leaf = hashGsxLeaf(allocation);
  return { ...allocation, leaf };
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
  const serviceRoot = allocation.merkleRoot || config.merkleRoot;
  if (serviceRoot.toLowerCase() !== config.merkleRoot.toLowerCase()) throw new Error('Eligibility proof root does not match the configured contract root.');
  if (!verifyMerkleProof({ root: config.merkleRoot, leaf: allocation.leaf, proof: allocation.proof })) throw new Error('Eligibility Merkle proof failed local verification.');
  return { configured: true, eligible: true, allocation };
}

export async function readOnChainClaimState(index) {
  const config = getClaimConfig();
  if (!config.contract || !config.chainId) throw new Error('GSX contract configuration is incomplete.');
  if (typeof window === 'undefined' || !window.ethereum) return { available: false, reason: 'No injected EVM provider is available for an on-chain read.' };
  if (!isAddress(config.contract)) throw new Error('GSX contract address is invalid.');
  const provider = new BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(config.chainId)) throw new Error(`Wrong network. Expected chain ID ${config.chainId}, received ${network.chainId}.`);
  const contract = new Contract(getAddress(config.contract), MERKLE_CLAIM_ABI, provider);
  const [root, alreadyClaimed] = await Promise.all([contract.merkleRoot(), contract.claimed(BigInt(index))]);
  if (root.toLowerCase() !== config.merkleRoot.toLowerCase()) throw new Error('On-chain Merkle root does not match the configured root.');
  return { available: true, root, alreadyClaimed };
}
