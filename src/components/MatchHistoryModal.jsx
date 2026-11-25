import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { fetchUserMatchHistory, downloadPgn } from '../lib/matchHistory';
import Avatar from './Avatar';

export default function MatchHistoryModal({ isOpen, onClose, user, onReplayMatch }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    async function load() {
      setLoading(true);
      const data = await fetchUserMatchHistory(user);
      if (active) {
        setMatches(data || []);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [isOpen, user]);

  if (!isOpen) return null;

  function copyPgn(match) {
    if (!match.pgn) {
      toast.error('No PGN moves recorded for this match.');
      return;
    }
    navigator.clipboard.writeText(match.pgn);
    toast.success('PGN copied to clipboard!');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl border border-gold/40 bg-[#10121a] p-5 sm:p-6 shadow-2xl shadow-gold/10 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold/20 text-2xl text-gold border border-gold/30">
              📜
            </span>
            <div>
              <h2 className="font-cinzel text-xl font-bold text-gold">Match History</h2>
              <p className="text-xs text-gray-400">Competitive match logs, Glicko-2 ratings &amp; PGN replays</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto divide-y divide-white/5 pr-1">
          {loading ? (
            <div className="py-16 text-center text-sm text-gold">Loading matches…</div>
          ) : matches.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              <span className="text-3xl block mb-2 opacity-50">♟</span>
              No matches recorded yet. Play a Quick Match or VS AI game!
            </div>
          ) : (
            matches.map((m) => {
              const isWin = m.outcome === 'win';
              const isLoss = m.outcome === 'loss';
              const badgeClass = isWin
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : isLoss
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

              const outcomeText = isWin ? 'Victory' : isLoss ? 'Defeat' : 'Draw';
              const isPlayerWhite = m.player_color === 'w';
              const oppName = isPlayerWhite ? m.black_name : m.white_name;
              const oppAvatar = isPlayerWhite ? m.black_avatar : m.white_avatar;

              return (
                <div key={m.id} className="py-3.5 hover:bg-white/[0.02] rounded-xl px-2 transition">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${badgeClass}`}>
                        {outcomeText}
                      </span>
                      <Avatar name={oppName} url={oppAvatar} size="h-9 w-9 text-xs" />
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm text-white">vs {oppName || 'Opponent'}</strong>
                          <span className="text-[10px] rounded bg-white/10 px-1.5 py-0.5 text-gray-300">
                            {isPlayerWhite ? '🕊️ Religion (White)' : '🏴 Atheist (Black)'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                          <span>{m.time_control || 'Rapid (10+0)'}</span>
                          <span>·</span>
                          <time>{new Date(m.created_at).toLocaleDateString()}</time>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                      {m.rating_delta !== undefined && m.rating_delta !== 0 && (
                        <span
                          className={`font-mono text-xs font-bold px-2 py-1 rounded ${
                            m.rating_delta > 0
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {m.rating_delta > 0 ? `+${m.rating_delta}` : m.rating_delta} ELO
                        </span>
                      )}

                      <button
                        onClick={() => {
                          onReplayMatch?.(m);
                          onClose();
                        }}
                        className="rounded-lg bg-gold/15 border border-gold/40 px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold hover:text-obsidian transition"
                        title="Replay this game move-by-move"
                      >
                        ▶ Replay
                      </button>

                      <button
                        onClick={() => copyPgn(m)}
                        className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-white/10 transition"
                        title="Copy PGN notation to clipboard"
                      >
                        📋
                      </button>

                      <button
                        onClick={() => downloadPgn(m)}
                        className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-white/10 transition"
                        title="Download .PGN file"
                      >
                        💾
                      </button>
                    </div>
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
