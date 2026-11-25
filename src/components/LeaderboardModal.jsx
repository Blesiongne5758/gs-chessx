import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import Avatar from './Avatar';
import { getRankTier } from '../lib/glicko2';

export default function LeaderboardModal({ isOpen, onClose, user, onChallengePlayer }) {
  const [leaders, setLeaders] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;

    async function fetchLeaders() {
      if (!isSupabaseConfigured) {
        setLeaders([
          { id: '1', username: 'Magnus_AI', rating: 2850, games_played: 140, wins: 128, country: 'NO' },
          { id: '2', username: 'Hikaru_Grand', rating: 2795, games_played: 120, wins: 104, country: 'US' },
          { id: '3', username: 'Kasparov_Legend', rating: 2780, games_played: 95, wins: 82, country: 'RU' },
          { id: '4', username: 'Vishy_Tiger', rating: 2690, games_played: 88, wins: 70, country: 'IN' },
          { id: '5', username: 'Ding_Dragon', rating: 2620, games_played: 74, wins: 56, country: 'CN' },
        ]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, country, rating, games_played, wins')
        .order('rating', { ascending: false })
        .limit(50);

      if (!active) return;
      if (!error && data) setLeaders(data);
      setLoading(false);
    }

    fetchLeaders();

    const channel = supabase
      .channel('live-leaderboard-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchLeaders)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = leaders.filter((p) =>
    (p.username || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl border border-gold/40 bg-[#10121a] p-5 sm:p-6 shadow-2xl shadow-gold/10 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold/20 text-2xl text-gold border border-gold/30">
              🏆
            </span>
            <div>
              <h2 className="font-cinzel text-xl font-bold text-gold">Live Leaderboard</h2>
              <p className="text-xs text-gray-400">Competitive Glicko-2 Global Rankings &amp; Tiers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search player username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white placeholder-gray-500 focus:border-gold focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Feed</span>
          </div>
        </div>

        {/* Leaders List */}
        <div className="mt-4 flex-1 overflow-y-auto divide-y divide-white/5 pr-1">
          {loading ? (
            <div className="py-16 text-center text-sm text-gold">Loading rankings…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">No players found matching &ldquo;{search}&rdquo;</div>
          ) : (
            filtered.map((player, index) => {
              const rank = index + 1;
              const tier = getRankTier(player.rating);
              const winRate =
                player.games_played > 0
                  ? ((player.wins / player.games_played) * 100).toFixed(1)
                  : '0.0';
              const isCurrentUser = user && player.id === user.id;

              return (
                <div
                  key={player.id || rank}
                  className={`flex flex-wrap items-center justify-between gap-3 p-3 transition rounded-xl ${
                    isCurrentUser
                      ? 'bg-gold/10 border border-gold/40'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-lg font-bold text-xs ${
                        rank === 1
                          ? 'bg-amber-400 text-obsidian shadow-md shadow-amber-400/30'
                          : rank === 2
                          ? 'bg-slate-300 text-obsidian shadow-md'
                          : rank === 3
                          ? 'bg-amber-700 text-white shadow-md'
                          : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      {rank}
                    </span>
                    <Avatar name={player.username} url={player.avatar_url} size="h-9 w-9 text-xs" />
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-semibold text-white">
                          {player.username || 'Player'}
                        </strong>
                        {isCurrentUser && (
                          <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-gold">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <span>{tier.badge}</span>
                        <span className={tier.color}>{tier.title}</span>
                        <span>·</span>
                        <span>{player.wins || 0}W / {player.games_played || 0}G ({winRate}%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono text-base font-bold text-gold">
                        {player.rating || 1200}
                      </div>
                      <div className="text-[10px] text-gray-400">Glicko-2 ELO</div>
                    </div>

                    {!isCurrentUser && onChallengePlayer && (
                      <button
                        onClick={() => {
                          onChallengePlayer(player);
                          onClose();
                        }}
                        className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold hover:text-obsidian transition"
                      >
                        ⚔️ Challenge
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
