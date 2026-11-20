import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import { fetchPairings, reportResult, demoFillRandomRound } from '../lib/tournaments';

const RESULT_BUTTONS = [
  { value: '1-0', label: '1-0', title: 'Putih menang' },
  { value: '1/2-1/2', label: '½-½', title: 'Remis' },
  { value: '0-1', label: '0-1', title: 'Hitam menang' },
];

function resultLabel(r) {
  if (r === '1/2-1/2') return '½-½';
  if (r === 'bye') return 'BYE';
  return r || 'vs';
}

/** Pairings per round for Swiss tournaments, with result entry for admins. */
export default function SwissPanel({ user, t, isAdmin, scores, onChanged, refreshKey }) {
  const [pairings, setPairings] = useState(null);
  const [error, setError] = useState(null);
  const [round, setRound] = useState(t.current_round || 1);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    fetchPairings(user, t.id)
      .then(setPairings)
      .catch((e) => setError(e.message));
  }, [user, t.id, t.current_round, t.status, refreshKey]);

  // Follow the tournament to the newest round when it advances.
  useEffect(() => {
    if (t.current_round) setRound(t.current_round);
  }, [t.current_round]);

  const rounds = useMemo(() => {
    const max = Math.max(0, ...(pairings || []).map((p) => p.round));
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [pairings]);

  const boards = (pairings || []).filter((p) => p.round === round);
  const pending = boards.filter((p) => p.result === null).length;
  const isCurrent = t.status === 'running' && round === t.current_round;
  const canEdit = isAdmin && isCurrent;

  const myBoard = (pairings || []).find(
    (p) => p.round === t.current_round && (p.white_id === user.id || p.black_id === user.id),
  );

  async function submit(pairing, result) {
    setBusy(pairing.id);
    try {
      const res = await reportResult(user, t, pairing, result);
      if (res?.finished) toast.success('Turnamen selesai. Juara sudah ditentukan.', { icon: '🏆' });
      else if (res?.newRound) toast.success(`Ronde ${res.round} sudah dipasangkan otomatis.`);
      await onChanged();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function fillRandom() {
    const res = demoFillRandomRound(t);
    if (res?.finished) toast.success('Turnamen selesai.', { icon: '🏆' });
    else if (res?.newRound) toast.success(`Ronde ${res.round} sudah dipasangkan otomatis.`);
    await onChanged();
  }

  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (pairings === null) return <div className="text-gray-400 py-6 text-center">Memuat pairing...</div>;
  if (rounds.length === 0)
    return <div className="text-gray-400 py-6 text-center">Pairing dibuat otomatis saat turnamen dimulai.</div>;

  return (
    <div>
      {myBoard && t.status === 'running' && (
        <div className="bg-emerald/10 border border-emerald/40 rounded-lg p-3 mb-3 text-sm" data-testid="my-board">
          <span className="text-emerald font-bold">Ronde {t.current_round}: </span>
          {myBoard.black_id ? (
            <span className="text-gray-200">
              Papan {myBoard.board} — Anda bermain {myBoard.white_id === user.id ? 'Putih' : 'Hitam'} melawan{' '}
              <b>{myBoard.white_id === user.id ? myBoard.black?.username : myBoard.white?.username}</b>
              {myBoard.result ? ` (hasil: ${resultLabel(myBoard.result)})` : ''}
            </span>
          ) : (
            <span className="text-gray-200">Anda mendapat bye (+1 poin) ronde ini.</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3" role="tablist" aria-label="Pilih ronde">
        {rounds.map((r) => (
          <button
            key={r}
            role="tab"
            aria-selected={round === r}
            onClick={() => setRound(r)}
            className={`w-10 h-9 rounded text-sm font-bold transition ${
              round === r ? 'bg-gold text-obsidian' : 'bg-obsidian text-gray-300 hover:text-white'
            }`}
          >
            R{r}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-auto">
          {isCurrent
            ? pending > 0
              ? `Menunggu ${pending} hasil — ronde berikutnya dipasangkan otomatis`
              : 'Semua hasil masuk'
            : `Ronde ${round} selesai`}
        </span>
      </div>

      <div className="space-y-2">
        {boards.map((p) => {
          const mine = p.white_id === user.id || p.black_id === user.id;
          return (
            <div
              key={p.id}
              className={`grid grid-cols-[1.75rem_minmax(0,1fr)_auto] sm:grid-cols-[2rem_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 p-2 rounded-lg text-sm ${
                mine ? 'bg-gold/10 border border-gold/40' : 'bg-obsidian'
              }`}
              data-testid="pairing-row"
            >
              <span className="text-gray-500 font-mono text-xs row-span-2 sm:row-span-1">#{p.board}</span>
              <div className="col-start-2 row-start-1 min-w-0">
                <PlayerCell player={p.white} score={scores.get(p.white_id)} color="w" />
              </div>
              <div className="col-start-3 row-start-1 row-span-2 sm:row-span-1 flex justify-center">
              {p.black_id ? (
                canEdit ? (
                  <div className="flex flex-col sm:flex-row gap-1">
                    {RESULT_BUTTONS.map((b) => (
                      <button
                        key={b.value}
                        title={b.title}
                        disabled={busy === p.id}
                        onClick={() => submit(p, b.value)}
                        className={`px-2 py-1 rounded font-mono text-xs font-bold transition disabled:opacity-50 ${
                          p.result === b.value ? 'bg-gold text-obsidian' : 'bg-slate text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className={`px-2 font-mono font-bold ${p.result ? 'text-gold' : 'text-gray-500'}`}>
                    {resultLabel(p.result)}
                  </span>
                )
              ) : (
                <span className="px-2 font-mono font-bold text-emerald">BYE</span>
              )}
              </div>
              <div className="col-start-2 row-start-2 sm:col-start-4 sm:row-start-1 min-w-0">
                {p.black_id ? (
                  <PlayerCell player={p.black} score={scores.get(p.black_id)} color="b" alignRight />
                ) : (
                  <span className="block sm:text-right text-gray-500 text-xs">+1 poin</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {user.isGuest && isCurrent && pending > 0 && (
        <button
          onClick={fillRandom}
          className="mt-3 w-full py-2 bg-slate text-gray-300 rounded hover:bg-gray-700 text-sm"
        >
          🎲 Demo: isi hasil acak untuk ronde ini
        </button>
      )}
    </div>
  );
}

function PlayerCell({ player, score, color, alignRight }) {
  return (
    <div className={`flex items-center gap-2 min-w-0 ${alignRight ? 'sm:flex-row-reverse sm:text-right' : ''}`}>
      <span
        className={`w-3 h-3 rounded-sm border shrink-0 ${color === 'w' ? 'bg-white border-gray-400' : 'bg-black border-gray-500'}`}
        title={color === 'w' ? 'Putih' : 'Hitam'}
      />
      <Avatar name={player?.username} url={player?.avatar_url} size="w-6 h-6 text-xs shrink-0" />
      <span className="text-white truncate">{player?.username ?? '—'}</span>
      {score !== undefined && <span className="text-gray-500 font-mono text-xs shrink-0">({Number(score).toFixed(1)})</span>}
    </div>
  );
}
