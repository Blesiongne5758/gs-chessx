import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import TopNav, { FooterNav } from './TopNav';
import { fetchProfile } from '../lib/profile';
import {
  WALLET_STATUS,
  connectEvmWallet,
  connectSolanaWallet,
  disconnectWallet,
  getTokenConfig,
  getWalletCapabilities,
  saveWalletConnection,
  shortenAddress,
} from '../lib/wallet';

function StatusPill({ status }) {
  const isPending = status === WALLET_STATUS.pending;
  const connected = status === WALLET_STATUS.connected || isPending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
      connected
        ? isPending
          ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
          : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
        : 'border-white/10 bg-white/5 text-gray-500'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? (isPending ? 'bg-amber-300' : 'bg-emerald-300') : 'bg-gray-600'}`} />
      {isPending ? 'Pending verification' : connected ? 'Connected' : 'Not connected'}
    </span>
  );
}

export default function Wallet({ user, onNavigate, onEditProfile, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [capabilities, setCapabilities] = useState(() => getWalletCapabilities());
  const token = useMemo(() => getTokenConfig(), []);

  useEffect(() => {
    fetchProfile(user)
      .then(setProfile)
      .catch((exception) => setError(exception.message))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return undefined;
    const handleAccountsChanged = () => setCapabilities(getWalletCapabilities());
    window.ethereum.on?.('accountsChanged', handleAccountsChanged);
    return () => window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
  }, []);

  const walletStatus = profile?.wallet_status || WALLET_STATUS.disconnected;
  const connected = Boolean(profile?.wallet_address);

  async function connect(kind) {
    if (user?.isGuest) {
      toast('Sign in to link a wallet to your player profile.');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const connection = kind === 'solana' ? await connectSolanaWallet() : await connectEvmWallet();
      const saved = await saveWalletConnection(user, connection);
      setProfile((current) => ({ ...current, ...saved }));
      toast.success('Wallet linked. Server verification is pending for this placeholder phase.');
    } catch (exception) {
      setError(exception.message || 'Wallet connection failed.');
    } finally {
      setConnecting(false);
    }
  }

  async function unlink() {
    setConnecting(true);
    setError(null);
    try {
      const saved = await disconnectWallet(user);
      setProfile((current) => ({ ...current, ...saved }));
      toast.success('Wallet unlinked from your GS-ChessX profile.');
    } catch (exception) {
      setError(exception.message || 'Could not unlink wallet.');
    } finally {
      setConnecting(false);
    }
  }

  async function copyAddress() {
    if (!profile?.wallet_address) return;
    await navigator.clipboard.writeText(profile.wallet_address);
    toast.success('Public wallet address copied.');
  }

  return (
    <div className="min-h-screen bg-obsidian text-white flex flex-col">
      <TopNav active="wallet" onNavigate={onNavigate} profile={{ username: profile?.username }} onEditProfile={onEditProfile} onLogout={onLogout} isAdmin={user?.isGuest} user={user} />
      <main className="mx-auto flex-1 w-full max-w-5xl px-4 py-8 pb-28 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-gold">Web3 utility layer</p>
            <h1 className="mt-2 font-cinzel text-3xl font-bold text-white">Crypto Wallet</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-400">Connect a public wallet to prepare future GS-ChessX rewards. Private keys never enter GS-ChessX.</p>
          </div>
          <StatusPill status={walletStatus} />
        </div>

        {user?.isGuest && (
          <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">Guest mode is local-only. Sign in to link a wallet to a persistent account.</div>
        )}
        {error && <div role="alert" className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</div>}

        <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <section className="rounded-2xl border border-gold/30 bg-graphite p-5 shadow-xl shadow-black/20 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Linked public address</p>
                <h2 className="mt-2 font-cinzel text-xl font-bold text-gold">Your wallet identity</h2>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-gold/30 bg-gold/10 text-2xl">◈</div>
            </div>

            {loading ? (
              <div className="py-14 text-center text-sm text-gray-500">Loading wallet profile…</div>
            ) : connected ? (
              <div className="mt-7 space-y-4">
                <div className="rounded-xl border border-white/10 bg-obsidian p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm text-white">{shortenAddress(profile.wallet_address)}</span>
                    <button type="button" onClick={copyAddress} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-gray-300 hover:border-gold/50 hover:text-gold">Copy</button>
                  </div>
                  <div className="mt-3 grid gap-3 text-xs text-gray-400 sm:grid-cols-3">
                    <div><span className="block text-gray-600">Network</span><strong className="text-gray-200">{profile.wallet_chain || 'EVM'}</strong></div>
                    <div><span className="block text-gray-600">Chain ID</span><strong className="text-gray-200">{profile.wallet_chain_id || 'Placeholder'}</strong></div>
                    <div><span className="block text-gray-600">Ownership</span><strong className="text-amber-200">Pending server check</strong></div>
                  </div>
                </div>
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-100/80">The signature flow confirms user intent locally. Production ownership verification must recover the signer on a trusted Edge Function before rewards are released.</div>
                <button type="button" onClick={unlink} disabled={connecting} className="w-full rounded-xl border border-rose-400/30 bg-rose-500/5 py-3 text-sm font-bold text-rose-200 hover:bg-rose-500/15 disabled:opacity-50">{connecting ? 'Working…' : 'Unlink wallet'}</button>
              </div>
            ) : (
              <div className="mt-7 space-y-3">
                <button type="button" onClick={() => connect('evm')} disabled={connecting || !capabilities.evm} className="flex w-full items-center justify-between rounded-xl bg-gold px-4 py-3 text-left font-bold text-obsidian hover:bg-champagne disabled:cursor-not-allowed disabled:opacity-45"><span>Connect EVM wallet</span><span>→</span></button>
                <button type="button" onClick={() => connect('solana')} disabled={connecting || !capabilities.solana} className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left font-bold text-white hover:border-gold/50 disabled:cursor-not-allowed disabled:opacity-45"><span>Connect Solana wallet</span><span>→</span></button>
                {!capabilities.evm && !capabilities.solana && <p className="rounded-lg border border-white/10 bg-white/[.03] p-3 text-xs text-gray-500">No injected wallet detected in this browser. Install MetaMask, Phantom, or another compatible wallet extension.</p>}
                <p className="pt-2 text-xs leading-relaxed text-gray-500">Connecting requests only a public address and an ownership signature. It never requests a seed phrase, private key, or token approval.</p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-cyan-300/20 bg-[#101923] p-5 shadow-xl shadow-black/20 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-200/60">Distribution module</p>
            <h2 className="mt-2 font-cinzel text-xl font-bold text-cyan-100">{token.tokenSymbol} rewards</h2>
            <div className="mt-5 rounded-xl border border-cyan-300/15 bg-black/20 p-4">
              <div className="flex items-center justify-between text-sm"><span className="text-gray-400">Available balance</span><strong className="text-cyan-100">— {token.tokenSymbol}</strong></div>
              <div className="mt-3 flex items-center justify-between text-sm"><span className="text-gray-400">Contract</span><strong className="font-mono text-xs text-gray-500">{token.tokenContract ? shortenAddress(token.tokenContract) : 'Not configured'}</strong></div>
            </div>
            <button type="button" disabled className="mt-5 w-full rounded-xl bg-cyan-300/20 py-3 text-sm font-bold text-cyan-100 opacity-60">Claim rewards — coming after contract setup</button>
            <ul className="mt-5 space-y-2 text-xs leading-relaxed text-gray-400">
              <li>• Reward eligibility will be calculated server-side.</li>
              <li>• Claims will require an explicit wallet transaction approval.</li>
              <li>• No token transfer is active in this placeholder phase.</li>
            </ul>
          </section>
        </div>

        <section className="mt-5 rounded-2xl border border-white/10 bg-[#12141c] p-5 sm:p-6">
          <h2 className="font-cinzel text-lg font-bold text-gold">Security boundary</h2>
          <div className="mt-3 grid gap-3 text-sm text-gray-400 sm:grid-cols-3">
            <p><strong className="block text-white">Non-custodial</strong>GS-ChessX never receives or stores private keys.</p>
            <p><strong className="block text-white">User approval</strong>Future claims will be signed by the user’s wallet.</p>
            <p><strong className="block text-white">Server verified</strong>Production rewards require signature recovery and anti-replay checks.</p>
          </div>
        </section>
      </main>
      <FooterNav active="profile" onNavigate={onNavigate} onEditProfile={onEditProfile} />
    </div>
  );
}
