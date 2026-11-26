import { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';

export default function FloatingActiveMatch({ activeMatch, onRejoin, onAbandon }) {
  const [confirmingAbandon, setConfirmingAbandon] = useState(false);
  const [abandoning, setAbandoning] = useState(false);

  if (!activeMatch || activeMatch.isSpectator || activeMatch.mode === 'ai') {
    return null;
  }

  const oppName = activeMatch.opponent?.username || 'Opponent';
  const playerColor = activeMatch.color === 'black' ? 'Atheist (Black)' : 'Religion (White)';
  const timeControlLabel = activeMatch.timeControl?.label || 'Rapid (10+0)';

  async function handleConfirmAbandon() {
    try {
      setAbandoning(true);
      // Broadcast abandon event to the match channel so the opponent gets notified immediately
      if (activeMatch.roomId) {
        const channel = supabase.channel(`chess-game:${activeMatch.roomId}`);
        await channel.send({
          type: 'broadcast',
          event: 'player-abandoned',
          payload: {
            roomId: activeMatch.roomId,
            abandonedBy: activeMatch.userId,
            reason: 'player_quit',
          },
        });
        supabase.removeChannel(channel);
      }
      onAbandon?.(activeMatch);
      toast.success('Match ended. You conceded the game.');
    } catch {
      onAbandon?.(activeMatch);
    } finally {
      setAbandoning(false);
      setConfirmingAbandon(false);
    }
  }

  return (
    <div
      role="region"
      aria-label="Ongoing match status"
      className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-50 max-w-sm w-[calc(100vw-1.5rem)] sm:w-96 rounded-2xl border-2 border-gold/70 bg-[#12141c]/95 p-3.5 sm:p-4 text-white shadow-2xl shadow-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-gold">
            Live Match In Progress
          </span>
        </div>
        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-mono font-bold text-gold border border-gold/30">
          {timeControlLabel}
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs">
        <div>
          <p className="font-semibold text-gray-200">
            vs <span className="text-white font-bold">{oppName}</span>
          </p>
          <p className="text-[11px] text-gray-400">
            Playing as <span className="text-gold font-medium">{playerColor}</span>
          </p>
        </div>
        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
          ● Turn in progress
        </span>
      </div>

      {!confirmingAbandon ? (
        <div className="mt-3.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onRejoin(activeMatch)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-gold via-champagne to-gold px-3 py-2 text-xs font-black text-obsidian shadow-md shadow-gold/25 hover:brightness-110 active:scale-95 transition"
          >
            <span>⚔️</span>
            <span>Rejoin Match</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirmingAbandon(true)}
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/25 active:scale-95 transition"
            title="Concede & end the match"
          >
            Resign &amp; End
          </button>
        </div>
      ) : (
        <div className="mt-3.5 rounded-xl border border-rose-500/50 bg-rose-950/40 p-2.5 text-center">
          <p className="text-[11px] font-semibold text-rose-200">
            Concede and end this match now?
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Your opponent will be awarded the win.
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={abandoning}
              onClick={handleConfirmAbandon}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition"
            >
              {abandoning ? 'Ending…' : 'Yes, Resign'}
            </button>
            <button
              type="button"
              disabled={abandoning}
              onClick={() => setConfirmingAbandon(false)}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-white/20 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
