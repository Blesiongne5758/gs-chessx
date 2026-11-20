import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import TopNav from './TopNav';
import Avatar from './Avatar';
import SwissPanel from './SwissPanel';
import { fetchProfile } from '../lib/profile';
import {
  FORMAT_LABEL,
  FORMAT_DESC,
  fetchTournaments,
  fetchStandings,
  joinTournament,
  leaveTournament,
  subscribeTournaments,
  startSwiss,
  demoResetSwiss,
  formatCountdown,
  formatDateTime,
} from '../lib/tournaments';

const TABS = [
  { key: 'upcoming', label: 'Akan Datang' },
  { key: 'running', label: 'Berlangsung' },
  { key: 'finished', label: 'Selesai' },
];
const FORMATS = ['all', 'arena', 'swiss', 'knockout'];

const FORMAT_STYLE = {
  arena: 'bg-amber/15 text-amber border-amber/40',
  swiss: 'bg-azure/15 text-azure border-azure/40',
  knockout: 'bg-crimson/15 text-crimson border-crimson/40',
};

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export default function Tournaments({ user, onNavigate, onEditProfile, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [tournaments, setTournaments] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [format, setFormat] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [standingsKey, setStandingsKey] = useState(0);
  const now = useNow();

  const reload = useCallback(() => {
    setStandingsKey((k) => k + 1);
    return fetchTournaments(user)
      .then((list) => {
        setTournaments(list);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [user]);

  useEffect(() => {
    fetchProfile(user).then(setProfile).catch(() => {});
    reload();
    return subscribeTournaments(user, reload);
  }, [user, reload]);

  const counts = useMemo(() => {
    const c = { upcoming: 0, running: 0, finished: 0 };
    (tournaments || []).forEach((t) => (c[t.status] = (c[t.status] || 0) + 1));
    return c;
  }, [tournaments]);

  const visible = useMemo(() => {
    const list = (tournaments || []).filter((t) => t.status === tab && (format === 'all' || t.format === format));
    // Finished: newest first. Others: soonest first.
    return tab === 'finished' ? [...list].reverse() : list;
  }, [tournaments, tab, format]);

  const featured = useMemo(() => (tournaments || []).find((t) => t.status === 'upcoming'), [tournaments]);
  const selected = tournaments?.find((t) => t.id === selectedId) || null;
  // Guests run the demo as tournament director; real accounts need profiles.is_admin.
  const isAdmin = user.isGuest || !!profile?.is_admin;

  async function toggleJoin(t) {
    setBusyId(t.id);
    try {
      if (t.joined) {
        await leaveTournament(user, t);
        toast.success(`Batal ikut ${t.name}`);
      } else {
        await joinTournament(user, t);
        toast.success(`Terdaftar di ${t.name}`);
      }
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-obsidian p-6">
      <TopNav
        active="tournaments"
        onNavigate={onNavigate}
        profile={profile}
        onEditProfile={onEditProfile}
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header + featured */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h1 className="text-4xl font-cinzel font-bold text-gold mb-2">🏆 Tournaments</h1>
            <p className="text-gray-400">
              Bertanding melawan pemain lain dalam format Arena, Swiss, atau Knockout. Daftar sebelum turnamen dimulai.
            </p>
            {user.isGuest && (
              <p className="mt-3 text-xs text-amber">Mode tamu — data turnamen adalah contoh dan pendaftaran disimpan di browser ini.</p>
            )}
          </div>

          {featured && (
            <div className="lg:col-span-2 bg-gradient-to-br from-gold/20 via-graphite to-graphite border border-gold/50 rounded-xl p-6 flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <div className="text-xs uppercase tracking-widest text-gold mb-1">Turnamen Berikutnya</div>
                <h2 className="text-2xl font-cinzel font-bold text-white mb-1">{featured.name}</h2>
                <div className="flex flex-wrap gap-2 text-sm text-gray-300">
                  <FormatBadge format={featured.format} />
                  <span>⏱ {featured.time_control}</span>
                  <span>👥 {featured.player_count}/{featured.max_players}</span>
                  {featured.prize_pool && <span>🎁 {featured.prize_pool}</span>}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">Dimulai dalam</div>
                <div className="text-3xl font-mono font-bold text-gold whitespace-nowrap" data-testid="featured-countdown">
                  {formatCountdown(new Date(featured.starts_at).getTime() - now)}
                </div>
                <JoinButton t={featured} busy={busyId === featured.id} onClick={() => toggleJoin(featured)} className="mt-3 w-full" />
              </div>
            </div>
          )}
        </div>

        {/* Tabs + format filter */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex gap-2 bg-graphite border border-gold/20 rounded-lg p-1" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  tab === t.key ? 'bg-gold text-obsidian' : 'text-gray-300 hover:text-white'
                }`}
              >
                {t.label} <span className="opacity-70">({counts[t.key]})</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-3 py-1 rounded-full text-sm border transition ${
                  format === f ? 'border-gold text-gold bg-gold/10' : 'border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'Semua' : FORMAT_LABEL[f]}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {error ? (
          <div className="bg-red-600/20 border border-red-600 text-red-400 px-4 py-3 rounded">
            Gagal memuat turnamen: {error}
          </div>
        ) : tournaments === null ? (
          <div className="text-gray-400 text-center py-16">Memuat turnamen...</div>
        ) : visible.length === 0 ? (
          <div className="bg-graphite border border-gold/20 rounded-xl text-gray-400 text-center py-16">
            Belum ada turnamen di kategori ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visible.map((t) => (
              <TournamentCard
                key={t.id}
                t={t}
                now={now}
                busy={busyId === t.id}
                onOpen={() => setSelectedId(t.id)}
                onToggleJoin={() => toggleJoin(t)}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <TournamentDetail
          key={selected.id}
          refreshKey={standingsKey}
          user={user}
          isAdmin={isAdmin}
          onChanged={reload}
          t={selected}
          now={now}
          busy={busyId === selected.id}
          onToggleJoin={() => toggleJoin(selected)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function FormatBadge({ format }) {
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-bold ${FORMAT_STYLE[format] || ''}`}>
      {FORMAT_LABEL[format] || format}
    </span>
  );
}

function JoinButton({ t, busy, onClick, className = '' }) {
  if (t.status !== 'upcoming') return null;
  const full = !t.joined && t.player_count >= t.max_players;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={busy || full}
      className={`px-4 py-2 rounded font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
        t.joined ? 'bg-slate text-gray-200 hover:bg-gray-700' : 'bg-gold text-obsidian hover:bg-champagne'
      } ${className}`}
    >
      {busy ? 'Memproses...' : t.joined ? 'Batal Ikut' : full ? 'Penuh' : 'Daftar'}
    </button>
  );
}

function StatusLine({ t, now }) {
  const start = new Date(t.starts_at).getTime();
  const end = t.ends_at ? new Date(t.ends_at).getTime() : null;
  if (t.status === 'upcoming')
    return <span className="text-gold font-mono">⏳ {formatCountdown(start - now)}</span>;
  if (t.status === 'running')
    return (
      <span className="text-emerald font-medium flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
        LIVE{end ? ` · sisa ${formatCountdown(end - now)}` : ''}
      </span>
    );
  return <span className="text-gray-400">Selesai {formatDateTime(t.ends_at || t.starts_at)}</span>;
}

function TournamentCard({ t, now, busy, onOpen, onToggleJoin }) {
  const pct = Math.min(100, Math.round((t.player_count / t.max_players) * 100));
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className={`bg-graphite border rounded-xl p-5 cursor-pointer transition hover:border-gold/70 flex flex-col ${
        t.joined ? 'border-gold/60' : 'border-gold/20'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-lg font-bold text-white leading-snug">{t.name}</h3>
        <div className="flex gap-1 shrink-0">
          {t.is_pro_only && <span className="px-2 py-0.5 rounded bg-gold text-obsidian text-xs font-bold">PRO</span>}
          {t.joined && <span className="px-2 py-0.5 rounded bg-emerald/20 text-emerald text-xs font-bold">Terdaftar</span>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300 mb-3">
        <FormatBadge format={t.format} />
        <span>⏱ {t.time_control}</span>
        {t.rounds && (
          <span>
            {t.status === 'running' && t.current_round ? `Ronde ${t.current_round}/${t.rounds}` : `${t.rounds} ronde`}
          </span>
        )}
      </div>

      <div className="text-sm text-gray-400 mb-1">📅 {formatDateTime(t.starts_at)}</div>
      {t.prize_pool && <div className="text-sm text-gray-400 mb-3">🎁 {t.prize_pool}</div>}

      <div className="mt-auto">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Pemain</span>
          <span>
            {t.player_count}/{t.max_players}
          </span>
        </div>
        <div className="h-2 bg-obsidian rounded-full overflow-hidden mb-4">
          <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <StatusLine t={t} now={now} />
          <JoinButton t={t} busy={busy} onClick={onToggleJoin} />
        </div>
      </div>
    </div>
  );
}

function TournamentDetail({ user, t, now, busy, onToggleJoin, onClose, isAdmin, onChanged, refreshKey }) {
  const [standings, setStandings] = useState(null);
  const [error, setError] = useState(null);
  const isSwiss = t.format === 'swiss';
  const started = t.status !== 'upcoming';
  const [view, setView] = useState(isSwiss && t.status === 'running' ? 'pairings' : 'standings');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchStandings(user, t.id)
      .then(setStandings)
      .catch((e) => setError(e.message));
  }, [user, t.id, refreshKey]);

  const scores = useMemo(() => new Map((standings || []).map((r) => [r.player?.id, r.score])), [standings]);

  async function handleStart() {
    setStarting(true);
    try {
      const res = await startSwiss(user, t);
      toast.success(`Turnamen dimulai. Ronde 1: ${res?.boards ?? ''} papan dipasangkan.`);
      setView('pairings');
      await onChanged();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setStarting(false);
    }
  }

  async function handleReset() {
    demoResetSwiss(t);
    setView('standings');
    await onChanged();
  }

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const showScores = t.status !== 'upcoming';
  const winner = t.status === 'finished' && standings?.[0];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-graphite border-2 border-gold rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tournament-title"
      >
        <div className="flex justify-between items-start gap-4 mb-4">
          <div>
            <h2 id="tournament-title" className="text-2xl font-cinzel font-bold text-gold">
              {t.name}
            </h2>
            <div className="mt-1">
              <StatusLine t={t} now={now} />
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl" aria-label="Tutup">
            ✕
          </button>
        </div>

        {t.description && <p className="text-gray-300 mb-4">{t.description}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-sm">
          <Info label="Format" value={<FormatBadge format={t.format} />} hint={FORMAT_DESC[t.format]} />
          <Info label="Waktu" value={t.time_control} />
          <Info
            label="Ronde"
            value={t.status === 'running' && t.current_round ? `${t.current_round} dari ${t.rounds}` : (t.rounds ?? '—')}
          />
          <Info label="Mulai" value={formatDateTime(t.starts_at)} />
          <Info label="Selesai" value={formatDateTime(t.ends_at)} />
          <Info label="Pemain" value={`${t.player_count}/${t.max_players}`} />
          {t.prize_pool && <Info label="Hadiah" value={t.prize_pool} />}
          {t.is_pro_only && <Info label="Akses" value={<span className="text-gold font-bold">Khusus Pro</span>} />}
        </div>

        {winner && (
          <div className="bg-gold/10 border border-gold rounded-lg p-4 mb-4 flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <Avatar name={winner.player?.username} url={winner.player?.avatar_url} size="w-10 h-10" />
            <div>
              <div className="text-xs text-gray-400">Juara</div>
              <div className="text-gold font-bold">
                {winner.player?.username} · {winner.score} poin
              </div>
            </div>
          </div>
        )}

        {isSwiss && isAdmin && t.status === 'upcoming' && (
          <div className="bg-azure/10 border border-azure/40 rounded-lg p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 text-sm text-gray-300">
              <div className="font-bold text-azure">Admin turnamen</div>
              Menutup pendaftaran dan membuat pairing Ronde 1 otomatis. Ronde berikutnya dipasangkan otomatis begitu semua
              hasil masuk.
            </div>
            <button
              onClick={handleStart}
              disabled={starting || t.player_count < 2}
              className="px-4 py-2 bg-azure text-white font-bold rounded hover:brightness-110 disabled:opacity-50 whitespace-nowrap"
            >
              {starting ? 'Memulai...' : '▶ Mulai & Pairing R1'}
            </button>
          </div>
        )}

        {isSwiss && started ? (
          <div className="flex gap-2 mb-3" role="tablist">
            {[
              { key: 'pairings', label: '♟ Pairing' },
              { key: 'standings', label: '📊 Klasemen' },
            ].map((v) => (
              <button
                key={v.key}
                role="tab"
                aria-selected={view === v.key}
                onClick={() => setView(v.key)}
                className={`px-4 py-2 rounded-md text-sm font-bold transition ${
                  view === v.key ? 'bg-gold text-obsidian' : 'bg-obsidian text-gray-300 hover:text-white'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        ) : (
          <h3 className="text-lg font-bold text-gold mb-2">{showScores ? '📊 Klasemen' : '👥 Peserta Terdaftar'}</h3>
        )}

        {isSwiss && started && view === 'pairings' ? (
          <SwissPanel user={user} t={t} isAdmin={isAdmin} scores={scores} onChanged={onChanged} refreshKey={refreshKey} />
        ) : error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : standings === null ? (
          <div className="text-gray-400 py-6 text-center">Memuat...</div>
        ) : standings.length === 0 ? (
          <div className="text-gray-400 py-6 text-center">Belum ada peserta. Jadilah yang pertama.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="py-2 w-10">#</th>
                  <th className="py-2">Pemain</th>
                  <th className="py-2 text-right">Rating</th>
                  {showScores && (
                    <>
                      <th className="py-2 text-right">M/S/K</th>
                      {isSwiss && (
                        <th className="py-2 text-right" title="Buchholz: jumlah poin semua lawan">
                          BH
                        </th>
                      )}
                      <th className="py-2 text-right">Poin</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {standings.map((row, i) => {
                  const isYou = row.player?.id === user.id;
                  return (
                    <tr key={row.player?.id ?? i} className={`border-b border-gray-800 ${isYou ? 'bg-gold/10' : ''}`}>
                      <td className="py-2 text-gold font-bold">
                        {showScores ? ({ 0: '🥇', 1: '🥈', 2: '🥉' }[i] ?? i + 1) : i + 1}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <Avatar name={row.player?.username} url={row.player?.avatar_url} size="w-7 h-7 text-xs" />
                          <span className="text-white">{row.player?.username}</span>
                          {isYou && <span className="text-xs text-gold">(You)</span>}
                        </div>
                      </td>
                      <td className="py-2 text-right text-gray-300">{row.player?.rating ?? '—'}</td>
                      {showScores && (
                        <>
                          <td className="py-2 text-right text-gray-400 font-mono">
                            {row.wins}/{row.draws}/{row.losses}
                          </td>
                          {isSwiss && (
                            <td className="py-2 text-right text-gray-400 font-mono">{Number(row.buchholz ?? 0).toFixed(1)}</td>
                          )}
                          <td className="py-2 text-right text-gold font-bold font-mono">{Number(row.score).toFixed(1)}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          {user.isGuest && isSwiss && started && t.id !== 'demo-5' && (
            <button onClick={handleReset} className="px-4 py-2 text-gray-400 hover:text-white text-sm mr-auto">
              ↺ Reset demo
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 bg-slate text-gray-300 rounded hover:bg-gray-700">
            Tutup
          </button>
          <JoinButton t={t} busy={busy} onClick={onToggleJoin} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, hint }) {
  return (
    <div className="bg-obsidian rounded-lg p-3" title={hint}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-white">{value}</div>
    </div>
  );
}
