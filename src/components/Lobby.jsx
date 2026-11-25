import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import Avatar from './Avatar';
import TopNav, { FooterNav } from './TopNav';
import { loadGuestProfile } from '../lib/profile';
import { TIME_CONTROL_CATEGORIES, getDefaultCategoryPreset } from '../lib/timeControls';
import { AI_LEVEL_PROFILES } from '../lib/stockfishEngine';

const TIME_CONTROLS = [
  { label: '⚡ Bullet (1+0)', desc: 'Fast & furious', base: 60, inc: 0 },
  { label: '⚡ Blitz (3+2)', desc: 'Most popular', base: 180, inc: 2 },
  { label: '⚡ Rapid (10+0)', desc: 'Strategic play', base: 600, inc: 0 },
  { label: '🎯 Classic (30+0)', desc: 'Deep thinking', base: 1800, inc: 0 },
  { label: '🤖 VS Stockfish AI', desc: 'Play against Stockfish engine offline (10 levels)', base: 600, inc: 0, mode: 'ai', aiLevel: 10 },
];

const FEATURE_TILES = [
  { key: 'quick', icon: 'ϟ', title: 'Quick Match', desc: 'Find an opponent instantly', tone: 'gold' },
  { key: 'leaderboard', icon: '🏆', title: 'Leaderboard', desc: 'Competitive Glicko-2 ranks', tone: 'gold' },
  { key: 'history', icon: '📜', title: 'Match History', desc: 'Past games & PGN replay', tone: 'slate' },
  { key: 'learning', icon: '♞', title: 'Chess Academy', desc: 'Learn & improve', tone: 'blue' },
  { key: 'tournaments', icon: '♜', title: 'Tournaments', desc: 'Join the competition', tone: 'violet' },
  { key: 'social', icon: '♟', title: 'Friends & Chat', desc: 'Connect with friends', tone: 'cyan' },
];

export default function Lobby({
  user,
  onPlay,
  onLogout,
  onEditProfile,
  onNavigate,
  onOpenLeaderboard,
  onOpenHistory,
}) {
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [leaderError, setLeaderError] = useState('');
  const [lastLeaderSync, setLastLeaderSync] = useState(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiFaction, setAiFaction] = useState('white');
  const [aiLevel, setAiLevel] = useState(10);

  useEffect(() => {
    if (user.isGuest) {
      setProfile(loadGuestProfile());
      setLeaders([]);
      setLastLeaderSync(null);
      setLeaderError('Guest mode is offline. Log in or create an account to view the realtime leaderboard.');
      return;
    }

    let alive = true;
    async function load() {
      const [{ data: prof }, { data: fr }, { data: lb, error: lbError }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('friendships')
          .select(`
            id, status,
            requester:profiles!requester_id(id, username, avatar_url, rating),
            addressee:profiles!addressee_id(id, username, avatar_url, rating)
          `)
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq('status', 'accepted'),
        supabase.from('profiles').select('id, username, rating, avatar_url, games_played, wins, created_at').order('rating', { ascending: false }).order('created_at', { ascending: false }).limit(10),
      ]);

      if (!alive) return;
      setLeaderError(lbError?.message || '');
      setLastLeaderSync(new Date());
      setProfile(prof);
      setFriends((fr || []).map((f) => ({
        friendshipId: f.id,
        ...(f.requester?.id === user.id ? f.addressee : f.requester),
      })));
      setLeaders(lb || []);
    }

    load();
    const profileChannel = supabase
      .channel(`dashboard-profiles-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, load)
      .subscribe();
    const refreshTimer = window.setInterval(load, 15_000);

    return () => {
      alive = false;
      supabase.removeChannel(profileChannel);
      window.clearInterval(refreshTimer);
    };
  }, [user]);

  const username = profile?.username || user.email?.split('@')[0] || 'Player';
  const games = profile?.games_played ?? 0;
  const wins = profile?.wins ?? 0;
  const winRate = games > 0 ? ((wins / games) * 100).toFixed(1) : '0.0';
  const rating = profile?.rating ?? 1200;
  const rank = rating >= 2400 ? 'Grandmaster' : rating >= 2200 ? 'Master' : rating >= 2000 ? 'Expert' : rating >= 1800 ? 'Advanced' : rating >= 1500 ? 'Club Player' : 'Apprentice';

  function startQuickMatch(tc) {
    onPlay(tc || getDefaultCategoryPreset('rapid'));
  }

  function startAiMatch(event) {
    event?.stopPropagation?.();
    setAiModalOpen(true);
  }

  function confirmAiMatch() {
    setAiModalOpen(false);
    onPlay({
      ...TIME_CONTROLS[4],
      aiLevel,
      color: aiFaction,
    });
  }

  function activateFeature(key) {
    if (key === 'quick') startQuickMatch();
    else if (key === 'leaderboard') onOpenLeaderboard?.();
    else if (key === 'history') onOpenHistory?.();
    else if (key === 'profile') onEditProfile();
    else if (key === 'shop') toast('Shop coming soon — exclusive items in development.');
    else onNavigate(key);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#08090d] text-white flex flex-col">
      <TopNav
        active="lobby"
        onNavigate={onNavigate}
        profile={{ username, avatar_url: profile?.avatar_url }}
        onEditProfile={onEditProfile}
        onLogout={onLogout}
        isAdmin={user.isGuest || !!profile?.is_admin}
        user={user}
        onOpenLeaderboard={onOpenLeaderboard}
        onOpenHistory={onOpenHistory}
      />

      <main className="mx-auto max-w-7xl px-4 pb-24 sm:pb-20 sm:px-6 lg:px-8 flex-1 w-full">
        {/* Mobile View Title: GS-ChessX */}
        <div className="flex sm:hidden items-center justify-between pt-2 pb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-gold/40 bg-gold/10 text-xl text-gold shadow-[0_0_12px_rgba(212,175,55,.25)]">♟</span>
            <div>
              <h1 className="font-cinzel text-2xl font-bold leading-none text-gold drop-shadow-[0_2px_8px_rgba(212,175,55,.3)]">
                GS-ChessX
              </h1>
              <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400 mt-0.5">The Battle of Ideologies</p>
            </div>
          </div>
          <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[10px] font-semibold text-gold">
            Online Lobby
          </span>
        </div>

        <section className="relative isolate mt-2 sm:mt-4 min-h-[265px] overflow-hidden rounded-[2rem] border border-gold/40 bg-[#15130f] shadow-[0_20px_70px_rgba(245,158,11,.15)] sm:min-h-[330px]">
          <div className="absolute inset-0 bg-cover bg-center opacity-45 mix-blend-screen" style={{ backgroundImage: "url('/historical-reykjavik.png')" }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_73%_46%,rgba(245,158,11,.38),transparent_26%),linear-gradient(120deg,#0d1118_0%,#1d1b16_46%,#39270e_100%)]" />
          <div className="absolute -right-20 -top-36 h-[28rem] w-[28rem] rounded-full border-[26px] border-gold/10 shadow-[0_0_100px_rgba(245,158,11,.32)]" />
          <div className="hidden sm:block absolute -right-10 bottom-[-80px] text-[18rem] leading-none text-gold/20 blur-[1px] select-none pointer-events-none sm:right-20">♔</div>
          <div className="sm:hidden absolute right-2 bottom-3 text-8xl text-gold/15 leading-none select-none pointer-events-none">♔</div>
          <div className="absolute inset-y-0 right-0 w-3/5 opacity-30 [background-image:linear-gradient(30deg,transparent_48%,rgba(245,158,11,.5)_49%,transparent_50%),linear-gradient(150deg,transparent_48%,rgba(255,255,255,.18)_49%,transparent_50%)] [background-size:44px_44px]" />
          <div className="relative z-10 flex min-h-[265px] max-w-xl flex-col justify-center p-6 sm:min-h-[330px] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Your next move starts here</p>
            <h1 className="mt-3 max-w-md font-cinzel text-4xl font-bold leading-[.95] text-white sm:text-6xl">Play chess.<br /><span className="text-gold">Grow together.</span></h1>
            <p className="mt-4 max-w-sm text-sm text-gray-300 sm:text-base">Find opponents, sharpen strategies, and build your legacy on the GS-ChessX board.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => startQuickMatch()} className="rounded-full bg-gradient-to-r from-gold to-champagne px-6 py-3 text-sm font-extrabold text-obsidian shadow-lg shadow-gold/25 transition hover:-translate-y-0.5 hover:shadow-gold/40">Play Now <span aria-hidden="true">›</span></button>
              <button type="button" onClick={startAiMatch} className="rounded-full border border-white/20 bg-black/25 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-gold/60 hover:text-gold">VS AI</button>
            </div>
            {/* Quick Match Time Control Presets */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mr-1">Quick Match:</span>
              {TIME_CONTROL_CATEGORIES.map((cat) => {
                const preset = getDefaultCategoryPreset(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => startQuickMatch(preset)}
                    className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-black/40 px-3 py-1 text-xs font-semibold text-gray-200 backdrop-blur transition hover:border-gold hover:bg-gold/15 hover:text-gold"
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name} ({preset.name})</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2" aria-hidden="true"><span className="h-2 w-7 rounded-full bg-gold" /><span className="h-2 w-2 rounded-full bg-white/40" /><span className="h-2 w-2 rounded-full bg-white/40" /></div>
        </section>

        <section className="relative mt-5 mx-1 sm:mx-8 rounded-[1.75rem] border border-gold/50 bg-gradient-to-br from-[#17181f] via-[#11131a] to-[#252014] p-4 shadow-[0_18px_50px_rgba(0,0,0,.55)] sm:p-5">
          <div className="flex items-center gap-4">
            <button type="button" onClick={onEditProfile} className="shrink-0 rounded-full ring-2 ring-gold/80 ring-offset-2 ring-offset-[#15161b]" aria-label="Edit profile"><Avatar name={username} url={profile?.avatar_url} size="h-16 w-16 text-2xl sm:h-20 sm:w-20 sm:text-3xl" /></button>
            <div className="min-w-0 flex-1"><p className="truncate font-cinzel text-xl font-bold text-gold sm:text-2xl">{username}</p><p className="text-sm text-gray-300">Player</p><span className="mt-2 inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">★ {rank}</span></div>
            <button type="button" onClick={onEditProfile} className="rounded-full border border-gold/40 bg-gold/15 px-3 py-2 text-gold transition hover:bg-gold hover:text-obsidian" aria-label="Open profile">›</button>
          </div>
          <div className="mt-5 grid grid-cols-3 divide-x divide-white/15 border-t border-white/10 pt-4 text-center"><MiniStat icon="♜" value={rating} label="ELO Rating" /><MiniStat icon="▥" value={`${winRate}%`} label="Win Rate" tone="emerald" /><MiniStat icon="♟" value={games} label="Games" /></div>
        </section>

        <section className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {FEATURE_TILES.map((tile) => (
            <button type="button" key={tile.key} onClick={() => activateFeature(tile.key)} className={`feature-tile feature-${tile.tone} group relative min-h-[104px] overflow-hidden rounded-2xl border p-4 text-left transition hover:-translate-y-1 hover:shadow-xl sm:min-h-[125px] sm:p-5`}>
              <span className="absolute -right-2 -top-5 text-8xl font-serif opacity-10 transition group-hover:scale-110">{tile.icon}</span>
              <span className="relative z-10 flex h-full flex-col justify-between"><span className="text-3xl font-bold text-white drop-shadow sm:text-4xl">{tile.icon}</span><span><strong className="block text-sm sm:text-base">{tile.title}</strong><small className="mt-1 block text-[11px] text-white/70 sm:text-xs">{tile.desc}</small></span></span><span className="absolute bottom-3 right-3 grid h-7 w-7 place-items-center rounded-full bg-white/20 text-xl leading-none text-white">›</span>
            </button>
          ))}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-[1.75rem] border border-gold/35 bg-gradient-to-br from-[#171719] to-[#0f1014] p-5 shadow-xl sm:p-6">
            <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-3xl text-gold">♜</span><div><h2 className="font-cinzel text-xl font-bold">Upcoming Tournament</h2><p className="text-xs text-gray-500">Your next challenge</p></div></div><button type="button" onClick={() => onNavigate('tournaments')} className="text-sm font-bold text-gold hover:text-champagne">View all →</button></div>
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center"><div className="grid h-32 w-full place-items-center rounded-2xl border border-gold/30 bg-[radial-gradient(circle,rgba(245,158,11,.35),transparent_52%),linear-gradient(135deg,#211b0d,#090a0e)] sm:h-36 sm:w-44"><div className="text-center"><div className="text-7xl leading-none text-gold drop-shadow-[0_0_15px_rgba(245,158,11,.7)]">♜</div><span className="text-[10px] uppercase tracking-[.28em] text-gold/70">championship</span></div></div><div className="flex-1"><h3 className="font-cinzel text-xl font-bold text-white">GS-ChessX Championship</h3><p className="mt-2 text-sm text-gray-300">▣ &nbsp;Grand Swiss System</p><p className="mt-1 text-sm text-gray-300">♟ &nbsp;128 Players · Official Bracket</p><button type="button" onClick={() => onNavigate('tournaments')} className="mt-4 rounded-full bg-gold px-5 py-2 text-sm font-bold text-obsidian transition hover:bg-champagne">Register now →</button></div></div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-[#15171d] p-5 shadow-xl sm:p-6"><div className="flex items-center justify-between"><h2 className="font-cinzel text-xl font-bold">Your Stats</h2><span className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">All-time</span></div><div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-2"><Stat value={wins} label="Wins" color="text-gold" /><Stat value={Math.max(games - wins, 0)} label="Losses" color="text-rose-400" /><Stat value={`${winRate}%`} label="Win rate" color="text-emerald-400" /><Stat value={rating} label="Max rating" color="text-violet-300" /></div></div>
        </section>

        {/* Community Pulse / Top Players Section */}
        <section className="mt-8 rounded-[1.75rem] border border-white/10 bg-[#111319] p-4 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.25em] text-gold font-semibold">Community Pulse</p>
              <h2 className="mt-1 font-cinzel text-xl font-bold text-white">Top Players</h2>
              <p className="mt-1 text-[11px] text-gray-500">
                {lastLeaderSync ? `Live · updated ${lastLeaderSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Syncing players…'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold hover:text-obsidian transition shadow-sm"
              >
                🏆 Live Leaderboard
              </button>
              <button
                type="button"
                onClick={() => onNavigate('social')}
                className="text-xs sm:text-sm font-semibold text-gray-400 hover:text-white transition"
              >
                Friends ({friends.length}) →
              </button>
            </div>
          </div>

          {leaderError ? (
            <p className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
              Unable to load leaderboard: {leaderError}
            </p>
          ) : leaders.length === 0 ? (
            <p className="mt-5 text-sm text-gray-500">
              No player profiles in the database yet. New players will appear automatically after registration.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {leaders.slice(0, 4).map((player, index) => (
                <LeaderboardRow
                  key={player.id}
                  rank={index + 1}
                  name={player.username}
                  avatarUrl={player.avatar_url}
                  rating={player.rating}
                  games={player.games_played}
                  isNew={player.created_at && Date.now() - new Date(player.created_at).getTime() < 7 * 24 * 60 * 60 * 1000}
                  isYou={player.id === user.id}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* VS AI Setup Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gold/40 bg-[#12141a] p-6 shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <div>
                  <h2 className="font-cinzel text-xl font-bold text-white">Stockfish AI Opponent</h2>
                  <p className="text-[11px] text-gray-400">Powered by official Stockfish.js engine</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {/* Faction Choice */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gold mb-2">
                  Select Side / Ideology Faction
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAiFaction('white')}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center transition ${
                      aiFaction === 'white'
                        ? 'border-gold bg-gold/20 text-white shadow-md shadow-gold/20 ring-1 ring-gold'
                        : 'border-white/10 bg-white/[.04] text-gray-400 hover:border-gold/40 hover:text-gray-200'
                    }`}
                  >
                    <span className="text-2xl">🕊️</span>
                    <strong className="text-xs">Religion</strong>
                    <span className="text-[10px] text-gold font-bold">White</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiFaction('black')}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center transition ${
                      aiFaction === 'black'
                        ? 'border-rose-400 bg-rose-950/40 text-white shadow-md shadow-rose-950/50 ring-1 ring-rose-400'
                        : 'border-white/10 bg-white/[.04] text-gray-400 hover:border-rose-400/40 hover:text-gray-200'
                    }`}
                  >
                    <span className="text-2xl">🏴</span>
                    <strong className="text-xs">Atheist</strong>
                    <span className="text-[10px] text-rose-300 font-bold">Black</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiFaction('random')}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center transition ${
                      aiFaction === 'random'
                        ? 'border-azure bg-azure/20 text-white shadow-md shadow-azure/20 ring-1 ring-azure'
                        : 'border-white/10 bg-white/[.04] text-gray-400 hover:border-azure/40 hover:text-gray-200'
                    }`}
                  >
                    <span className="text-2xl">🎲</span>
                    <strong className="text-xs">Random</strong>
                    <span className="text-[10px] text-azure font-bold">Auto</span>
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-gray-400">
                  {aiFaction === 'white'
                    ? 'White pieces at bottom. You move first.'
                    : aiFaction === 'black'
                    ? 'Black pieces at bottom. Computer (White) moves first.'
                    : 'Side randomly assigned when match starts.'}
                </p>
              </div>

              {/* Difficulty Level */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gold">
                      AI Difficulty Level
                    </label>
                    <span className="rounded bg-gold/10 px-1.5 py-0.5 text-[9px] font-bold text-gold border border-gold/30">
                      Stockfish.js
                    </span>
                  </div>
                  <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold">
                    Level {aiLevel} · {AI_LEVEL_PROFILES[aiLevel]?.title || 'Stockfish'} (~{AI_LEVEL_PROFILES[aiLevel]?.elo || 1500} Elo)
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={aiLevel}
                  onChange={(e) => setAiLevel(Number(e.target.value))}
                  className="w-full accent-gold cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>Lv 1 (800 Elo)</span>
                  <span>Lv 5 (1600 Elo)</span>
                  <span>Lv 10 (2600+ GM)</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="flex-1 rounded-xl border border-white/15 bg-white/[.04] py-3 text-sm font-semibold text-gray-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAiMatch}
                className="flex-1 rounded-xl bg-gradient-to-r from-gold to-champagne py-3 text-sm font-extrabold text-obsidian shadow-lg shadow-gold/25 hover:shadow-gold/40 transition"
              >
                Start Game ›
              </button>
            </div>
          </div>
        </div>
      )}

      <FooterNav active="lobby" onNavigate={onNavigate} onEditProfile={onEditProfile} />
    </div>
  );
}

function MiniStat({ icon, value, label, tone = 'text-gold' }) {
  return <div className="px-2"><div className={`text-xl font-bold ${tone}`}>{icon} <span className="text-lg text-white sm:text-xl">{value}</span></div><div className="mt-1 text-[10px] uppercase tracking-wide text-gray-500 sm:text-xs">{label}</div></div>;
}

function Stat({ value, label, color }) {
  return <div className="text-center"><div className={`text-2xl font-bold ${color}`}>{value}</div><div className="mt-1 text-xs text-gray-400">{label}</div></div>;
}

function LeaderboardRow({ rank, name, avatarUrl, rating, games, isNew, isYou }) {
  const rankColors = {
    1: 'bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 text-obsidian shadow-amber-500/30 border-amber-300/80',
    2: 'bg-gradient-to-br from-slate-200 via-gray-300 to-slate-400 text-obsidian shadow-slate-300/30 border-slate-200/80',
    3: 'bg-gradient-to-br from-amber-700 via-orange-800 to-amber-900 text-white shadow-orange-900/30 border-amber-600/80',
  };

  const badgeStyle = rankColors[rank] || 'bg-white/10 text-gray-300 border-white/10';

  return (
    <div
      className={`group relative flex items-center justify-between gap-3 rounded-2xl border p-3 sm:p-3.5 transition-all hover:border-gold/40 hover:bg-[#181a24] ${
        isYou
          ? 'border-gold/50 bg-gold/10 shadow-[0_4px_20px_rgba(212,175,55,0.15)] ring-1 ring-gold/30'
          : 'border-white/10 bg-[#14161f]/80'
      }`}
    >
      {/* Left: Rank Badge + Avatar + User Info */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <div
          className={`grid h-7 w-7 sm:h-8 sm:w-8 shrink-0 place-items-center rounded-xl border text-xs sm:text-sm font-black shadow-md ${badgeStyle}`}
        >
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
        </div>

        <div className="relative shrink-0">
          <Avatar name={name} url={avatarUrl} size="h-9 w-9 sm:h-10 sm:w-10 text-sm" />
          {isYou && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald ring-2 ring-[#111319]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="truncate text-xs sm:text-sm font-bold text-white group-hover:text-gold transition">
              {name}
            </span>
            {isYou && (
              <span className="rounded-full bg-gold/20 px-1.5 py-0.2 text-[9px] font-extrabold uppercase text-gold">
                You
              </span>
            )}
            {isNew && (
              <span className="rounded-full bg-emerald/20 px-1.5 py-0.2 text-[9px] font-extrabold uppercase text-emerald-300">
                New
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] sm:text-xs text-gray-400">
            <span>🎮 {games ?? 0} matches</span>
          </div>
        </div>
      </div>

      {/* Right: Rating Pill */}
      <div className="shrink-0 text-right">
        <div className="inline-flex flex-col items-end rounded-xl border border-gold/30 bg-gold/10 px-2.5 py-1 sm:px-3 sm:py-1 shadow-sm">
          <span className="font-mono text-xs sm:text-sm font-black text-gold">
            {rating ?? 1200}
          </span>
          <span className="text-[8px] uppercase tracking-wider text-gold/70 font-semibold">
            ELO
          </span>
        </div>
      </div>
    </div>
  );
}
