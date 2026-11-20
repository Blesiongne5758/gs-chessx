import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const TIME_CONTROLS = [
  { label: '⚡ Bullet (1+0)', desc: 'Fast & furious', base: 60, inc: 0 },
  { label: '⚡ Blitz (3+2)', desc: 'Most popular', base: 180, inc: 2 },
  { label: '⚡ Rapid (10+0)', desc: 'Strategic play', base: 600, inc: 0 },
  { label: '🎯 Classical (30+0)', desc: 'Deep thinking', base: 1800, inc: 0 },
  { label: '🤖 vs AI (10 levels)', desc: 'Practice mode — segera hadir', base: 600, inc: 0 },
];

export default function Lobby({ user, onPlay, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    if (user.isGuest) {
      setProfile({ username: 'Guest', rating: 1200, games_played: 0, wins: 0 });
      return;
    }

    async function load() {
      const [{ data: prof }, { data: fr }, { data: lb }] = await Promise.all([
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
        supabase.from('profiles').select('id, username, rating').order('rating', { ascending: false }).limit(10),
      ]);

      setProfile(prof);
      // Each friendship row has both sides; show the *other* user.
      setFriends(
        (fr || []).map((f) => ({
          friendshipId: f.id,
          ...(f.requester?.id === user.id ? f.addressee : f.requester),
        })),
      );
      setLeaders(lb || []);
    }

    load();
  }, [user]);

  const username = profile?.username || user.email?.split('@')[0] || 'Player';
  const games = profile?.games_played ?? 0;
  const winRate = games > 0 ? ((profile.wins / games) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-obsidian p-6">
      {/* Header */}
      <nav className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div className="text-3xl font-cinzel font-bold text-gold">♟️ GS-ChessX</div>
        <div className="flex flex-wrap gap-2 items-center">
          {['Lobby', 'Tournaments', 'Social', 'Shop'].map((item) => (
            <button key={item} className="px-4 py-2 text-gray-300 hover:text-white">
              {item}
            </button>
          ))}
          <div className="flex items-center gap-2">
            <Avatar name={username} size="w-10 h-10" />
            <button onClick={onLogout} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-graphite border border-gold/30 rounded-xl p-6">
          <div className="text-center mb-4">
            <Avatar name={username} size="w-24 h-24 mx-auto mb-3 text-3xl" />
            <h2 className="text-2xl font-bold text-gold font-cinzel">{username}</h2>
            <div className="text-gray-400 text-sm">🇮🇩 Indonesia</div>
          </div>

          <div className="space-y-2 text-sm">
            <Row label="ELO Rating:" value={<span className="text-gold font-bold">{profile?.rating ?? 1200}</span>} />
            <Row label="Win Rate:" value={<span className="text-emerald font-bold">{winRate}%</span>} />
            <Row label="Games:" value={<span className="text-white">{games}</span>} />
          </div>

          <button className="w-full mt-4 py-2 bg-slate text-gray-300 rounded hover:bg-gray-700">Edit Profile</button>
        </div>

        {/* Quick Match */}
        <div className="bg-graphite border border-gold/30 rounded-xl p-6">
          <h3 className="text-xl font-bold text-gold mb-4">⚡ Quick Match</h3>
          <div className="space-y-3">
            {TIME_CONTROLS.map((tc) => (
              <button
                key={tc.label}
                onClick={() => onPlay(tc)}
                className="w-full p-4 bg-slate hover:bg-gray-700 rounded-lg text-left transition"
              >
                <div className="font-bold text-white">{tc.label}</div>
                <div className="text-xs text-gray-400">{tc.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Online Friends */}
        <div className="bg-graphite border border-gold/30 rounded-xl p-6">
          <h3 className="text-xl font-bold text-gold mb-4">👥 Friends</h3>
          <div className="space-y-2">
            {friends.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No friends yet</div>
            ) : (
              friends.map((friend) => (
                <div key={friend.friendshipId} className="flex items-center gap-3 p-3 bg-slate rounded-lg">
                  <div className="w-2 h-2 bg-emerald rounded-full" />
                  <div className="flex-1">
                    <div className="text-white font-medium">{friend.username}</div>
                    <div className="text-xs text-gray-400">Rating: {friend.rating}</div>
                  </div>
                  <button className="px-3 py-1 bg-gold text-obsidian rounded text-sm font-bold">Challenge</button>
                </div>
              ))
            )}
          </div>
          <button className="w-full mt-4 py-2 bg-slate text-gray-300 rounded hover:bg-gray-700">View All Friends</button>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="max-w-7xl mx-auto mt-6 bg-graphite border border-gold/30 rounded-xl p-6">
        <h3 className="text-xl font-bold text-gold mb-4">🏆 Leaderboard</h3>
        <div className="space-y-2">
          {leaders.length === 0 ? (
            <div className="text-gray-400 text-center py-4">Leaderboard akan muncul setelah ada pemain terdaftar.</div>
          ) : (
            leaders.map((p, i) => (
              <LeaderboardRow key={p.id} rank={i + 1} name={p.username} rating={p.rating} isYou={p.id === user.id} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, size }) {
  return (
    <div className={`${size} bg-gold rounded-full flex items-center justify-center text-obsidian font-bold`}>
      {name?.[0]?.toUpperCase() || 'U'}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      {value}
    </div>
  );
}

function LeaderboardRow({ rank, name, rating, isYou }) {
  const medal = { 1: '🥇', 2: '🥈', 3: '🥉' }[rank] || rank;
  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg ${isYou ? 'bg-gold/10 border border-gold/30' : 'bg-slate'}`}>
      <div className="w-8 text-center font-bold text-gold">{medal}</div>
      <div className="flex-1 text-white font-medium">
        {name} {isYou && <span className="text-xs text-gold">(You)</span>}
      </div>
      <div className="text-gold font-bold">{rating}</div>
    </div>
  );
}
