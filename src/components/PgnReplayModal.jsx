import { useState, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import toast from 'react-hot-toast';
import ChessPiece2D from './ChessPiece2D';
import { downloadPgn } from '../lib/matchHistory';

export default function PgnReplayModal({ isOpen, onClose, match }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const autoPlayTimer = useRef(null);

  // Parse all positions from PGN
  const { positions, moves, whiteName, blackName, result } = useMemo(() => {
    if (!match?.pgn) {
      const c = new Chess();
      return {
        positions: [c.board()],
        moves: [],
        whiteName: match?.white_name || 'White',
        blackName: match?.black_name || 'Black',
        result: match?.result || '*',
        headers: {},
      };
    }

    try {
      const chess = new Chess();
      chess.loadPgn(match.pgn);
      const history = chess.history({ verbose: true });

      // Replay from start to gather board states at each move
      const walker = new Chess();
      const states = [walker.board()];
      const moveList = [];

      for (const m of history) {
        walker.move(m);
        states.push(walker.board());
        moveList.push({
          san: m.san,
          from: m.from,
          to: m.to,
          color: m.color,
          captured: m.captured,
        });
      }

      return {
        positions: states,
        moves: moveList,
        whiteName: match?.white_name || 'White',
        blackName: match?.black_name || 'Black',
        result: match?.result || '*',
      };
    } catch {
      const fallback = new Chess();
      return {
        positions: [fallback.board()],
        moves: [],
        whiteName: match?.white_name || 'White',
        blackName: match?.black_name || 'Black',
        result: match?.result || '*',
      };
    }
  }, [match]);

  useEffect(() => {
    setCurrentStep(positions.length - 1);
    setIsPlaying(false);
  }, [positions]);

  useEffect(() => {
    if (!isPlaying) {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
      return;
    }
    autoPlayTimer.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= positions.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1100);

    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [isPlaying, positions.length]);

  if (!isOpen || !match) return null;

  const currentBoard = positions[currentStep] || positions[0];
  const lastMove = currentStep > 0 ? moves[currentStep - 1] : null;

  function goToStep(step) {
    const target = Math.max(0, Math.min(positions.length - 1, step));
    setCurrentStep(target);
  }

  function handleCopyPgn() {
    if (!match.pgn) return;
    navigator.clipboard.writeText(match.pgn);
    toast.success('PGN copied to clipboard!');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-4xl rounded-2xl border border-gold/40 bg-[#10121a] p-4 sm:p-6 shadow-2xl shadow-gold/15 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold/20 text-2xl text-gold border border-gold/30">
              🎞️
            </span>
            <div>
              <h2 className="font-cinzel text-lg sm:text-xl font-bold text-gold">PGN Replay &amp; Analysis</h2>
              <p className="text-xs text-gray-400">
                {whiteName} (White) vs {blackName} (Black) · Result: <strong className="text-gold">{result}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPgn}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-white/10 transition"
              title="Copy PGN"
            >
              📋 Copy PGN
            </button>
            <button
              onClick={() => downloadPgn(match)}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-white/10 transition"
              title="Download PGN"
            >
              💾 Export
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="mt-4 flex-1 grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6 overflow-y-auto">
          {/* Left: Chessboard */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-[420px] aspect-square rounded-xl overflow-hidden border-4 border-[#6b4423] shadow-2xl grid grid-cols-8 grid-rows-8 bg-[#171411]">
              {Array.from({ length: 64 }).map((_, index) => {
                const r = Math.floor(index / 8);
                const c = index % 8;
                const square = String.fromCharCode(97 + c) + (8 - r);
                const piece = currentBoard?.[r]?.[c];
                const isLight = (r + c) % 2 === 0;
                const isLast = lastMove && (lastMove.from === square || lastMove.to === square);

                return (
                  <div
                    key={square}
                    className={`relative flex items-center justify-center select-none ${
                      isLast
                        ? isLight ? 'bg-[#E6D27A]' : 'bg-[#BFA34A]'
                        : isLight ? 'bg-[#c4a482]' : 'bg-[#6b4423]'
                    }`}
                  >
                    {piece && (
                      <ChessPiece2D
                        type={piece.type}
                        color={piece.color}
                        skin="holy"
                      />
                    )}
                    {c === 0 && (
                      <span className="absolute top-0.5 left-1 text-[9px] font-bold text-black/50">
                        {8 - r}
                      </span>
                    )}
                    {r === 7 && (
                      <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-black/50">
                        {String.fromCharCode(97 + c)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Replay Controls Bar */}
            <div className="mt-4 w-full max-w-[420px] space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Start</span>
                <span className="font-mono text-gold font-bold">
                  Move {currentStep} / {positions.length - 1}
                  {lastMove ? ` (${lastMove.san})` : ' (Initial)'}
                </span>
                <span>End</span>
              </div>

              <input
                type="range"
                min="0"
                max={Math.max(0, positions.length - 1)}
                value={currentStep}
                onChange={(e) => goToStep(Number(e.target.value))}
                className="w-full accent-gold cursor-pointer"
              />

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => goToStep(0)}
                  disabled={currentStep === 0}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 hover:border-gold hover:text-gold disabled:opacity-30 transition"
                  title="First Move"
                >
                  |◀
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(currentStep - 1)}
                  disabled={currentStep === 0}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 hover:border-gold hover:text-gold disabled:opacity-30 transition"
                  title="Previous Move"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="rounded-lg bg-gold px-4 py-1.5 text-sm font-bold text-obsidian hover:bg-champagne transition shadow-md shadow-gold/20"
                  title={isPlaying ? 'Pause' : 'Auto Play'}
                >
                  {isPlaying ? '❚❚ Pause' : '▶ Play'}
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(currentStep + 1)}
                  disabled={currentStep >= positions.length - 1}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 hover:border-gold hover:text-gold disabled:opacity-30 transition"
                  title="Next Move"
                >
                  ▶
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(positions.length - 1)}
                  disabled={currentStep >= positions.length - 1}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 hover:border-gold hover:text-gold disabled:opacity-30 transition"
                  title="Last Move"
                >
                  ▶|
                </button>
              </div>
            </div>
          </div>

          {/* Right: Move List */}
          <div className="flex flex-col border border-white/10 rounded-xl bg-black/30 p-3 h-full max-h-[460px]">
            <h3 className="text-xs font-bold text-gold uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Moves List</span>
              <span className="text-[10px] text-gray-400 font-normal">Click to jump</span>
            </h3>

            <div className="flex-1 overflow-y-auto font-mono text-xs divide-y divide-white/5 pr-1">
              {Array.from({ length: Math.ceil(moves.length / 2) }).map((_, i) => {
                const moveNum = i + 1;
                const whiteMove = moves[i * 2];
                const blackMove = moves[i * 2 + 1];
                const whiteStep = i * 2 + 1;
                const blackStep = i * 2 + 2;

                return (
                  <div key={i} className="grid grid-cols-[2rem_1fr_1fr] py-1 items-center">
                    <span className="text-gray-500">{moveNum}.</span>
                    <button
                      type="button"
                      onClick={() => goToStep(whiteStep)}
                      className={`text-left px-2 py-0.5 rounded transition ${
                        currentStep === whiteStep
                          ? 'bg-gold text-obsidian font-bold'
                          : 'text-gray-200 hover:bg-white/10 hover:text-gold'
                      }`}
                    >
                      {whiteMove?.san || ''}
                    </button>
                    {blackMove ? (
                      <button
                        type="button"
                        onClick={() => goToStep(blackStep)}
                        className={`text-left px-2 py-0.5 rounded transition ${
                          currentStep === blackStep
                            ? 'bg-gold text-obsidian font-bold'
                            : 'text-gray-300 hover:bg-white/10 hover:text-gold'
                        }`}
                      >
                        {blackMove.san}
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 border-t border-white/10 pt-2 text-[11px] text-gray-400">
              Result: <strong className="text-white">{result}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
