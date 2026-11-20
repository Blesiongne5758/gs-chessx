import { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import toast from 'react-hot-toast';

const PIECES = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

export default function GameRoom({ user, timeControl, onBack }) {
  const base = timeControl?.base ?? 600;
  const inc = timeControl?.inc ?? 0;

  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [whiteTime, setWhiteTime] = useState(base);
  const [blackTime, setBlackTime] = useState(base);
  const [result, setResult] = useState(null); // string when the game is finished

  const turn = game.turn();
  const history = game.history({ verbose: true });
  const lastMove = history[history.length - 1];

  // Clock: only the side to move ticks, and only while the game is running and at least one move was made.
  useEffect(() => {
    if (result || history.length === 0) return undefined;
    const timer = setInterval(() => {
      if (turn === 'w') setWhiteTime((t) => Math.max(0, t - 1));
      else setBlackTime((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [turn, result, history.length]);

  // Flag fall
  useEffect(() => {
    if (result) return;
    if (whiteTime === 0) setResult('Waktu Putih habis — Hitam menang');
    else if (blackTime === 0) setResult('Waktu Hitam habis — Putih menang');
  }, [whiteTime, blackTime, result]);

  useEffect(() => {
    if (result) toast(result, { icon: '🏁' });
  }, [result]);

  const validTargets = useMemo(() => {
    if (!selectedSquare) return [];
    return game.moves({ square: selectedSquare, verbose: true }).map((m) => m.to);
  }, [game, selectedSquare]);

  const captured = useMemo(() => {
    const byWhite = [];
    const byBlack = [];
    for (const m of history) {
      if (m.captured) (m.color === 'w' ? byWhite : byBlack).push(PIECES[m.color === 'w' ? 'b' : 'w'][m.captured]);
    }
    return { byWhite, byBlack };
  }, [history]);

  function checkGameOver(g) {
    if (g.isCheckmate()) return `Skakmat — ${g.turn() === 'w' ? 'Hitam' : 'Putih'} menang`;
    if (g.isStalemate()) return 'Remis — stalemate';
    if (g.isThreefoldRepetition()) return 'Remis — pengulangan tiga kali';
    if (g.isInsufficientMaterial()) return 'Remis — material tidak cukup';
    if (g.isDraw()) return 'Remis — aturan 50 langkah';
    return null;
  }

  function handleSquareClick(square) {
    if (result) return;
    const piece = game.get(square);

    if (selectedSquare && validTargets.includes(square)) {
      // Rebuild from PGN so move history (and threefold-repetition detection) is preserved
      const next = new Chess();
      next.loadPgn(game.pgn());
      // chess.js v1 throws on illegal moves, so validate via validTargets first and guard anyway.
      try {
        next.move({ from: selectedSquare, to: square, promotion: 'q' });
      } catch {
        setSelectedSquare(null);
        return;
      }
      if (inc) {
        if (turn === 'w') setWhiteTime((t) => t + inc);
        else setBlackTime((t) => t + inc);
      }
      setGame(next);
      setSelectedSquare(null);
      const over = checkGameOver(next);
      if (over) setResult(over);
      else if (next.inCheck()) toast('Skak!', { icon: '⚠️' });
      return;
    }

    if (piece && piece.color === turn) setSelectedSquare(square);
    else setSelectedSquare(null);
  }

  function resetGame() {
    setGame(new Chess());
    setSelectedSquare(null);
    setWhiteTime(base);
    setBlackTime(base);
    setResult(null);
  }

  function resign() {
    if (result) return;
    setResult(`${turn === 'w' ? 'Putih' : 'Hitam'} menyerah — ${turn === 'w' ? 'Hitam' : 'Putih'} menang`);
  }

  function renderBoard() {
    const board = game.board();
    const kingInCheck = game.inCheck()
      ? board.flat().find((p) => p && p.type === 'k' && p.color === turn)?.square
      : null;
    const squares = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = String.fromCharCode(97 + col) + (8 - row);
        const piece = board[row][col];
        const isLight = (row + col) % 2 === 0;
        const isSelected = selectedSquare === square;
        const isValidMove = validTargets.includes(square);
        const isLastMove = lastMove && (square === lastMove.from || square === lastMove.to);

        let bg = isLight ? 'bg-[#E8C39E]' : 'bg-[#A67B5B]';
        if (isLastMove) bg = isLight ? 'bg-[#E6D27A]' : 'bg-[#BFA34A]';
        if (kingInCheck === square) bg = 'bg-crimson';

        squares.push(
          <div
            key={square}
            onClick={() => handleSquareClick(square)}
            className={`relative flex items-center justify-center cursor-pointer select-none ${bg} ${
              isSelected ? 'ring-4 ring-gold ring-inset' : ''
            } hover:brightness-110 transition`}
          >
            {piece && (
              <span
                className={`text-3xl sm:text-5xl leading-none ${
                  piece.color === 'w' ? 'text-white [text-shadow:0_0_2px_#000,0_2px_4px_#000]' : 'text-black [text-shadow:0_1px_2px_#fff8]'
                }`}
              >
                {PIECES[piece.color][piece.type]}
              </span>
            )}
            {isValidMove && (
              <div
                className={`absolute rounded-full ${
                  piece ? 'inset-1 border-4 border-emerald/60' : 'w-4 h-4 bg-emerald/60'
                }`}
              />
            )}
            {col === 0 && <span className="absolute top-0.5 left-1 text-[10px] text-black/50">{8 - row}</span>}
            {row === 7 && (
              <span className="absolute bottom-0.5 right-1 text-[10px] text-black/50">{String.fromCharCode(97 + col)}</span>
            )}
          </div>,
        );
      }
    }
    return squares;
  }

  const sans = history.map((m) => m.san);
  const youName = user?.isGuest ? 'You (Guest)' : user?.email?.split('@')[0] || 'You';

  return (
    <div className="min-h-screen bg-obsidian flex flex-col">
      {/* Header */}
      <nav className="flex justify-between items-center p-4 bg-graphite border-b border-gold/30">
        <button onClick={onBack} className="px-4 py-2 text-gray-300 hover:text-white">
          ← Back to Lobby
        </button>
        <div className="text-xl font-cinzel font-bold text-gold">♟️ GS-ChessX</div>
        <div className="text-gray-400 text-sm">{timeControl?.label}</div>
      </nav>

      {/* Game Area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,560px)_1fr] gap-6 max-w-6xl w-full">
          {/* Left — Black / opponent */}
          <div className="space-y-4">
            <PlayerCard
              icon="♚"
              iconClass="bg-black text-white"
              name="Opponent (Black)"
              sub="Local hot-seat"
              time={blackTime}
              active={turn === 'b' && !result}
            />
            <div className="bg-graphite border border-gold/30 rounded-lg p-4">
              <h3 className="text-gold font-bold mb-2">♟ Captured by Black</h3>
              <div className="text-2xl min-h-8">{captured.byBlack.join('') || '—'}</div>
            </div>
          </div>

          {/* Center — Board */}
          <div className="space-y-3">
            <div className="aspect-square">
              <div className="w-full h-full grid grid-cols-8 grid-rows-8 border-4 border-[#6B4423] rounded-lg overflow-hidden shadow-2xl">
                {renderBoard()}
              </div>
            </div>
            {result && (
              <div className="bg-gold/10 border border-gold rounded-lg p-4 text-center">
                <div className="text-gold font-cinzel font-bold text-xl mb-2">{result}</div>
                <button onClick={resetGame} className="px-6 py-2 bg-gold text-obsidian font-bold rounded hover:bg-champagne">
                  Main Lagi
                </button>
              </div>
            )}
          </div>

          {/* Right — White / you + history */}
          <div className="space-y-4">
            <PlayerCard
              icon="♔"
              iconClass="bg-gold text-obsidian"
              name={`${youName} (White)`}
              sub="Local hot-seat"
              time={whiteTime}
              active={turn === 'w' && !result}
            />
            <div className="bg-graphite border border-gold/30 rounded-lg p-4">
              <h3 className="text-gold font-bold mb-2">♙ Captured by White</h3>
              <div className="text-2xl min-h-8">{captured.byWhite.join('') || '—'}</div>
            </div>
            <div className="bg-graphite border border-gold/30 rounded-lg p-4">
              <h3 className="text-gold font-bold mb-2">📜 Move History</h3>
              <div className="h-48 overflow-y-auto font-mono text-sm grid grid-cols-[2.5rem_1fr_1fr] gap-y-1 content-start">
                {Array.from({ length: Math.ceil(sans.length / 2) }).map((_, i) => (
                  <div key={i} className="contents">
                    <span className="text-gray-500">{i + 1}.</span>
                    <span className="text-white">{sans[i * 2]}</span>
                    <span className="text-gray-400">{sans[i * 2 + 1] || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-graphite border-t border-gold/30 p-4">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-4">
          <button onClick={() => toast('Voice call (WebRTC) segera hadir')} className="px-6 py-2 bg-slate text-gray-300 rounded hover:bg-gray-700">
            🎙️ Voice Call
          </button>
          <button onClick={() => toast('Chat segera hadir')} className="px-6 py-2 bg-slate text-gray-300 rounded hover:bg-gray-700">
            💬 Chat
          </button>
          <button
            onClick={() => !result && setResult('Remis — disepakati')}
            className="px-6 py-2 bg-slate text-gray-300 rounded hover:bg-gray-700"
          >
            🤝 Offer Draw
          </button>
          <button onClick={resign} className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            🏳️ Resign
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ icon, iconClass, name, sub, time, active }) {
  return (
    <div className={`bg-graphite border rounded-lg p-4 ${active ? 'border-gold' : 'border-gold/30'}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${iconClass}`}>{icon}</div>
        <div>
          <div className="text-white font-bold">{name}</div>
          <div className="text-xs text-gray-400">{sub}</div>
        </div>
      </div>
      <div className={`text-3xl font-mono font-bold ${time <= 30 ? 'text-crimson' : active ? 'text-emerald' : 'text-gray-400'}`}>
        {formatTime(time)}
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
