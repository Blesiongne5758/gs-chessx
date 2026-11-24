import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import Avatar from './Avatar';
import TopNav, { FooterNav } from './TopNav';
import { loadGuestProfile } from '../lib/profile';

const TIME_CONTROLS = [
  { label: '⚡ Bullet (1+0)', desc: 'Fast & furious', base: 60, inc: 0 },
  { label: '⚡ Blitz (3+2)', desc: 'Most popular', base: 180, inc: 2 },
  { label: '⚡ Rapid (10+0)', desc: 'Strategic play', base: 600, inc: 0 },
  { label: '🎯 Classical (30+0)', desc: 'Deep thinking', base: 1800, inc: 0 },
  { label: '🤖 VS AI (10 level)', desc: 'Lawan komputer — tidak memakai pemain online', base: 600, inc: 0, mode: 'ai', aiLevel: 10 },
];

const FEATURE_TILES = [
  { key: 'quick', icon: 'ϟ', title: 'Quick Match', desc: 'Find an opponent instantly', tone: 'gold' },
  { key: 'learning', icon: '♞', title: 'Chess Academy', desc: 'Learn & improve', tone: 'blue' },
  { key: 'tournaments', icon: '♜', title: 'Tournaments', desc: 'Join the competition', tone: 'violet' },
  { key: 'shop', icon: '◆', title: 'Shop', desc: 'Get exclusive items', tone: 'green' },
  { key: 'social', icon: '♟', title: 'Friends & Chat', desc: 'Connect with friends', tone: 'cyan' },
  { key: 'profile', icon: '⚙', title: 'Settings', desc: 'Manage your account', tone: 'slate' },
];

export default function Lobby({ user, onPlay, onLogout, onEditProfile, onNavigate }) {
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
      setLeaderError('Mode guest tidak terhubung ke leaderboard realtime. Masuk atau daftar untuk melihat pemain Supabase.');
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

  function startQuickMatch() {
    onPlay(TIME_CONTROLS[2]);
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
    else if (key === 'profile') onEditProfile();
    else if (key === 'shop') toast('Shop segera hadir — koleksi eksklusif sedang disiapkan.');
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
          <div className="absolute -right-10 bottom-[-80px] text-[14rem] leading-none text-gold/30 blur-[1px] sm:right-20 sm:text-[18rem]">♔</div>
          <div className="absolute inset-y-0 right-0 w-3/5 opacity-30 [background-image:linear-gradient(30deg,transparent_48%,rgba(245,158,11,.5)_49%,transparent_50%),linear-gradient(150deg,transparent_48%,rgba(255,255,255,.18)_49%,transparent_50%)] [background-size:44px_44px]" />
          <div className="relative z-10 flex min-h-[265px] max-w-xl flex-col justify-center p-6 sm:min-h-[330px] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Your next move starts here</p>
            <h1 className="mt-3 max-w-md font-cinzel text-4xl font-bold leading-[.95] text-white sm:text-6xl">Play chess.<br /><span className="text-gold">Grow together.</span></h1>
            <p className="mt-4 max-w-sm text-sm text-gray-300 sm:text-base">Temukan lawan, asah strategi, dan bangun warisanmu di papan GS-ChessX.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" onClick={startQuickMatch} className="rounded-full bg-gradient-to-r from-gold to-champagne px-6 py-3 text-sm font-extrabold text-obsidian shadow-lg shadow-gold/25 transition hover:-translate-y-0.5 hover:shadow-gold/40">Mulai bermain <span aria-hidden="true">›</span></button>
              <button type="button" onClick={startAiMatch} className="rounded-full border border-white/20 bg-black/25 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-gold/60 hover:text-gold">VS AI</button>
            </div>
          </div>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2" aria-hidden="true"><span className="h-2 w-7 rounded-full bg-gold" /><span className="h-2 w-2 rounded-full bg-white/40" /><span className="h-2 w-2 rounded-full bg-white/40" /></div>
        </section>

        <section className="relative mt-5 mx-3 rounded-[1.75rem] border border-gold/50 bg-gradient-to-br from-[#17181f] via-[#11131a] to-[#252014] p-4 shadow-[0_18px_50px_rgba(0,0,0,.55)] sm:mx-8 sm:p-5">
          <div className="flex items-center gap-4">
            <button type="button" onClick={onEditProfile} className="shrink-0 rounded-full ring-2 ring-gold/80 ring-offset-2 ring-offset-[#15161b]" aria-label="Edit profile"><Avatar name={username} url={profile?.avatar_url} size="h-16 w-16 text-2xl sm:h-20 sm:w-20 sm:text-3xl" /></button>
            <div className="min-w-0 flex-1"><p className="truncate font-cinzel text-xl font-bold text-gold sm:text-2xl">{username}</p><p className="text-sm text-gray-300">🇮🇩 Indonesia</p><span className="mt-2 inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">★ {rank}</span></div>
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
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center"><div className="grid h-32 w-full place-items-center rounded-2xl border border-gold/30 bg-[radial-gradient(circle,rgba(245,158,11,.35),transparent_52%),linear-gradient(135deg,#211b0d,#090a0e)] sm:h-36 sm:w-44"><div className="text-center"><div className="text-7xl leading-none text-gold drop-shadow-[0_0_15px_rgba(245,158,11,.7)]">♜</div><span className="text-[10px] uppercase tracking-[.28em] text-gold/70">championship</span></div></div><div className="flex-1"><h3 className="font-cinzel text-xl font-bold text-white">GS-ChessX Championship</h3><p className="mt-2 text-sm text-gray-300">▣ &nbsp;25 Oct 2026, 19:00 WIB</p><p className="mt-1 text-sm text-gray-300">♟ &nbsp;128 Players</p><button type="button" onClick={() => onNavigate('tournaments')} className="mt-4 rounded-full bg-gold px-5 py-2 text-sm font-bold text-obsidian transition hover:bg-champagne">Register now →</button></div></div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-[#15171d] p-5 shadow-xl sm:p-6"><div className="flex items-center justify-between"><h2 className="font-cinzel text-xl font-bold">Your Stats</h2><span className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">This month⌄</span></div><div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-2"><Stat value={wins} label="Wins" color="text-gold" /><Stat value={Math.max(games - wins, 0)} label="Losses" color="text-rose-400" /><Stat value={`${winRate}%`} label="Win rate" color="text-emerald-400" /><Stat value={rating} label="Max rating" color="text-violet-300" /></div></div>
        </section>

        <section className="mt-8 rounded-[1.75rem] border border-white/10 bg-[#111319] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.25em] text-gold">Community pulse</p><h2 className="mt-1 font-cinzel text-xl font-bold">Top players</h2><p className="mt-1 text-[11px] text-gray-500">{lastLeaderSync ? `Live · diperbarui ${lastLeaderSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Menyinkronkan pemain…'}</p></div><button type="button" onClick={() => onNavigate('social')} className="text-sm text-gray-400 hover:text-white">Friends {friends.length} →</button></div>{leaderError ? <p className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">Top players belum dapat dimuat: {leaderError}</p> : leaders.length === 0 ? <p className="mt-5 text-sm text-gray-500">Belum ada profil pemain di database. Pemain baru akan muncul otomatis setelah registrasi dan sinkronisasi.</p> : <div className="mt-5 grid gap-2 sm:grid-cols-2">{leaders.slice(0, 4).map((player, index) => <LeaderboardRow key={player.id} rank={index + 1} name={player.username} avatarUrl={player.avatar_url} rating={player.rating} games={player.games_played} isNew={player.created_at && Date.now() - new Date(player.created_at).getTime() < 7 * 24 * 60 * 60 * 1000} isYou={player.id === user.id} />)}</div>}</section>
      </main>

      {/* VS AI Setup Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gold/40 bg-[#12141a] p-6 shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <h2 className="font-cinzel text-xl font-bold text-white">Main Lawan Komputer</h2>
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
                  Pilih Bidak / Kubu Ideologi
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
                    <span className="text-[10px] text-gold font-bold">Putih</span>
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
                    <span className="text-[10px] text-rose-300 font-bold">Hitam</span>
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
                    <strong className="text-xs">Acak</strong>
                    <span className="text-[10px] text-azure font-bold">Auto</span>
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-gray-400">
                  {aiFaction === 'white'
                    ? 'Bidak Putih di bawah, Anda bergerak lebih dulu.'
                    : aiFaction === 'black'
                    ? 'Bidak Hitam di bawah, komputer (Putih) bergerak lebih dulu.'
                    : 'Kubu dipilih secara acak saat pertandingan dimulai.'}
                </p>
              </div>

              {/* Difficulty Level */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gold">
                    Tingkat Kesulitan AI
                  </label>
                  <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold">
                    Level {aiLevel} {aiLevel === 10 ? '(Master)' : aiLevel >= 7 ? '(Mahir)' : aiLevel >= 4 ? '(Menengah)' : '(Pemula)'}
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
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>1 (Santai)</span>
                  <span>5 (Klub)</span>
                  <span>10 (Grandmaster)</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="flex-1 rounded-xl border border-white/15 bg-white/[.04] py-3 text-sm font-semibold text-gray-300 hover:bg-white/10 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmAiMatch}
                className="flex-1 rounded-xl bg-gradient-to-r from-gold to-champagne py-3 text-sm font-extrabold text-obsidian shadow-lg shadow-gold/25 hover:shadow-gold/40 transition"
              >
                Mulai Main ›
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
  return <div className={`flex items-center gap-3 rounded-xl p-3 ${isYou ? 'border border-gold/30 bg-gold/10' : 'bg-white/[.04]'}`}><span className="w-5 text-center font-bold text-gold">{rank}</span><Avatar name={name} url={avatarUrl} size="h-8 w-8 text-sm" /><span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{name} {isYou && <span className="text-xs text-gold">(You)</span>} {isNew && <span className="rounded-full bg-emerald/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">New</span>}<small className="block text-[10px] font-normal text-gray-500">{games ?? 0} games</small></span><span className="text-sm font-bold text-gold">{rating ?? 1200}</span></div>;
}
