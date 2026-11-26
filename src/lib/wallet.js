import { supabase } from './supabaseClient';

export const WALLET_CONFIG = {
  chainName: import.meta.env.VITE_WALLET_CHAIN_NAME || 'Network not selected',
  chainId: import.meta.env.VITE_WALLET_CHAIN_ID || '',
  tokenSymbol: import.meta.env.VITE_MEMECOIN_SYMBOL || 'GSX',
  tokenContract: import.meta.env.VITE_MEMECOIN_CONTRACT || '',
  tokenDecimals: Number(import.meta.env.VITE_MEMECOIN_DECIMALS || 18),
};

export const WALLET_STATUS = {
  disconnected: 'disconnected',
  connected: 'connected',
  pending: 'pending_verification',
};

function getEthereumProvider() {
  if (typeof window === 'undefined') return null;
  return window.ethereum || null;
}

function getSolanaProvider() {
  if (typeof window === 'undefined') return null;
  return window.solana || null;
}

export function getWalletCapabilities() {
  return {
    evm: Boolean(getEthereumProvider()),
    solana: Boolean(getSolanaProvider()),
  };
}

export function shortenAddress(address) {
  if (!address || address.length < 12) return address || 'Not connected';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function normalizeEvmAddress(address) {
  return String(address || '').trim().toLowerCase();
}

function buildChallenge(address, chainId) {
  return [
    'GS-ChessX wallet ownership verification',
    '',
    `Wallet: ${address}`,
    `Chain ID: ${chainId || 'unknown'}`,
    'This signature does not authorize token transfers or spend funds.',
    'It only proves that you control this public wallet address.',
  ].join('\n');
}

export async function connectEvmWallet() {
  const provider = getEthereumProvider();
  if (!provider) throw new Error('No compatible EVM wallet found. Install MetaMask or another injected wallet.');

  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  const address = normalizeEvmAddress(accounts?.[0]);
  if (!address) throw new Error('The wallet did not return a public address.');

  const chainId = await provider.request({ method: 'eth_chainId' });
  const message = buildChallenge(address, chainId);
  let signature = null;
  try {
    signature = await provider.request({ method: 'personal_sign', params: [message, address] });
  } catch (error) {
    if (error?.code === 4001) throw new Error('Signature request was rejected. Wallet connection was not verified.');
    throw error;
  }

  return {
    address,
    chain: 'EVM',
    chainId,
    signature,
    message,
    status: WALLET_STATUS.pending,
  };
}

export async function connectSolanaWallet() {
  const provider = getSolanaProvider();
  if (!provider?.connect) throw new Error('No compatible Solana wallet found. Install a wallet extension first.');
  const response = await provider.connect();
  const address = response?.publicKey?.toString?.() || provider.publicKey?.toString?.();
  if (!address) throw new Error('The wallet did not return a public address.');
  return {
    address,
    chain: 'Solana',
    chainId: 'solana',
    signature: null,
    message: null,
    status: WALLET_STATUS.pending,
  };
}

export async function saveWalletConnection(user, connection) {
  if (!user || user.isGuest) {
    throw new Error('Sign in with a real account before linking a wallet.');
  }
  const { data, error } = await supabase
    .from('profiles')
    .update({
      wallet_address: connection.address,
      wallet_chain: connection.chain,
      wallet_chain_id: connection.chainId || null,
      wallet_status: connection.status,
      wallet_connected_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select('id, wallet_address, wallet_chain, wallet_chain_id, wallet_status, wallet_connected_at')
    .single();
  if (error) throw error;
  return data;
}

export async function disconnectWallet(user) {
  if (!user || user.isGuest) return null;
  const { data, error } = await supabase
    .from('profiles')
    .update({
      wallet_address: null,
      wallet_chain: null,
      wallet_chain_id: null,
      wallet_status: WALLET_STATUS.disconnected,
      wallet_connected_at: null,
    })
    .eq('id', user.id)
    .select('id, wallet_address, wallet_chain, wallet_chain_id, wallet_status, wallet_connected_at')
    .single();
  if (error) throw error;
  return data;
}

export function getTokenConfig() {
  return {
    ...WALLET_CONFIG,
    configured: Boolean(WALLET_CONFIG.tokenContract && WALLET_CONFIG.chainId),
  };
}
