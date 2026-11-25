import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { Chess } from 'chess.js';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { getIceServers } from '../lib/webrtc';
const ChessBoard3D = lazy(() => import('./ChessBoard3D'));
import ChessPiece2D from './ChessPiece2D';
import HistoricalSplash from './HistoricalSplash';
import TopNav, { FooterNav } from './TopNav';
import { CHESS_SKIN_LIST, resolveChessSkin } from '../lib/chessSkins';
import { calculateGlicko2 } from '../lib/glicko2';
import { recordMatchHistory, downloadPgn } from '../lib/matchHistory';
import { addNotification } from '../lib/notifications';

const PIECES = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

const DEFAULT_CUSTOMIZATION = {
  primary: '#67E8F9',
  primaryDark: '#2563EB',
  secondary: '#F0ABFC',
  secondaryDark: '#A21CAF',
  particleCount: 12,
  particleSpeed: 1,
  particleSize: 0.035,
  aura: true,
};

const AI_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function checkGameOverPosition(g) {
  if (g.isCheckmate()) return `Checkmate — ${g.turn() === 'w' ? 'Black' : 'White'} wins`;
  if (g.isStalemate()) return 'Draw — stalemate';
  if (g.isThreefoldRepetition()) return 'Draw — threefold repetition';
  if (g.isInsufficientMaterial()) return 'Draw — insufficient material';
  if (g.isDraw()) return 'Draw — 50-move rule';
  return null;
}

function chooseComputerMove(position, level = 10) {
  const moves = position.moves({ verbose: true });
  if (!moves.length) return null;
  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const score = (AI_VALUES[move.captured] || 0)
      + (move.san?.includes('+') ? 60 : 0)
      + Math.random() * Math.max(0, 11 - level) * 20;
    if (score > bestScore) { best = move; bestScore = score; }
  }
  return { from: best.from, to: best.to, promotion: best.promotion || 'q' };
}

export default function GameRoom({
  user,
  timeControl,
  match,
  onBack,
  onSocial,
  onNavigate,
  onEditProfile,
  onLogout,
  onOpenLeaderboard,
  onOpenHistory,
}) {
  const base = timeControl?.base ?? 600;
  const inc = timeControl?.inc ?? 0;

  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [whiteTime, setWhiteTime] = useState(base);
  const [blackTime, setBlackTime] = useState(base);
  const [result, setResult] = useState(null);
  const [ratingChange, setRatingChange] = useState(null);
  const [incomingDraw, setIncomingDraw] = useState(false);
  const [drawPending, setDrawPending] = useState(false);
  const [gameChannelReady, setGameChannelReady] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [skinMode, setSkinMode] = useState('2d');
  const [skinId, setSkinId] = useState('classic');
  const [customization, setCustomization] = useState(DEFAULT_CUSTOMIZATION);
  const [showHistoricalSplash, setShowHistoricalSplash] = useState(true);
  const [replayStep, setReplayStep] = useState(null); // null when live, number when in replay mode
  const [autoReplaying, setAutoReplaying] = useState(false);

  const gameChannelRef = useRef(null);
  const [playerSide, setPlayerSide] = useState(() => (match?.color === 'black' ? 'b' : 'w'));
  const [callTrigger, setCallTrigger] = useState(null);
  const isMultiplayer = Boolean(match?.roomId);
  const isAiMatch = match?.mode === 'ai';
  const isSpectator = Boolean(match?.isSpectator);

  function handleVoiceTalk() {
    if (isMultiplayer && !isSpectator) {
      setCallTrigger({ type: 'voice', timestamp: Date.now() });
    } else {
      onSocial?.();
    }
  }

  function handleVideoTalk() {
    if (isMultiplayer && !isSpectator) {
      setCallTrigger({ type: 'video', timestamp: Date.now() });
    } else {
      onSocial?.();
    }
  }

  useEffect(() => {
    if (match?.color) {
      setPlayerSide(match.color === 'black' ? 'b' : 'w');
    }
  }, [match?.color]);

  function handleSideChange(side) {
    if (side === playerSide) return;
    setPlayerSide(side);
    setSelectedSquare(null);
    toast.success(
      side === 'b'
        ? 'Atheist (Black) pieces active — your pieces are now at the bottom.'
        : 'Religion (White) pieces active — your pieces are now at the bottom.'
    );
  }

  const turn = game.turn();
  const fullHistory = useMemo(() => game.history({ verbose: true }), [game]);
  const lastMove = fullHistory[fullHistory.length - 1];

  // Board state builder for step replay
  const replayPositions = useMemo(() => {
    const walker = new Chess();
    const states = [walker.board()];
    for (const m of fullHistory) {
      walker.move(m);
      states.push(walker.board());
    }
    return states;
  }, [fullHistory]);

  // Current display board
  const displayBoard = useMemo(() => {
    if (replayStep !== null && replayPositions[replayStep]) {
      return replayPositions[replayStep];
    }
    return game.board();
  }, [game, replayStep, replayPositions]);

  // Handle Game Finish & Glicko-2 calculation
  const finishGame = useCallback((message) => {
    setResult(message);

    if (isMultiplayer && !isSpectator) {
      gameChannelRef.current?.send({ type: 'broadcast', event: 'result', payload: { result: message } });

      // Save match & compute Glicko-2 rating
      let outcome = 'draw';
      let score = 0.5;
      const isPlayerWhite = playerSide === 'w';
      if (message.includes('White wins')) {
        outcome = isPlayerWhite ? 'win' : 'loss';
        score = isPlayerWhite ? 1.0 : 0.0;
      } else if (message.includes('Black wins')) {
        outcome = isPlayerWhite ? 'loss' : 'win';
        score = isPlayerWhite ? 0.0 : 1.0;
      }

      const playerStats = { rating: user?.user_metadata?.rating || 1200 };
      const oppStats = { rating: match?.opponent?.rating || 1200 };
      const glicko = calculateGlicko2(playerStats, oppStats, score);
      setRatingChange(glicko.delta);

      recordMatchHistory({
        id: match.roomId,
        user,
        opponent: match.opponent,
        playerColor: playerSide,
        result: message,
        outcome,
        pgn: game.pgn(),
        fen: game.fen(),
        timeControl,
        movesCount: fullHistory.length,
        ratingBefore: playerStats.rating,
        ratingAfter: glicko.newRating,
        ratingDelta: glicko.delta,
        isAi: false,
      });

      addNotification(user?.id, {
        title: outcome === 'win' ? '🏆 Victory!' : outcome === 'loss' ? '🏳️ Defeat' : '🤝 Draw',
        message: `${message} (${glicko.delta >= 0 ? '+' + glicko.delta : glicko.delta} Glicko-2 ELO)`,
        type: 'game_result',
      });
    } else if (isAiMatch) {
      let outcome = 'draw';
      if (message.includes('White wins')) outcome = playerSide === 'w' ? 'win' : 'loss';
      else if (message.includes('Black wins')) outcome = playerSide === 'b' ? 'win' : 'loss';

      recordMatchHistory({
        user,
        opponent: { username: `Computer Level ${match?.aiLevel || 10}` },
        playerColor: playerSide,
        result: message,
        outcome,
        pgn: game.pgn(),
        fen: game.fen(),
        timeControl,
        movesCount: fullHistory.length,
        ratingDelta: outcome === 'win' ? 10 : outcome === 'loss' ? -8 : 0,
        isAi: true,
      });
    }
  }, [isMultiplayer, isSpectator, playerSide, match, user, timeControl, game, fullHistory.length, isAiMatch]);

  useEffect(() => {
    if (!isMultiplayer) return undefined;
    const channel = supabase.channel(`chess-game:${match.roomId}`, { config: { private: true, broadcast: { self: false } } });
    gameChannelRef.current = channel;

    channel.on('broadcast', { event: 'move' }, ({ payload }) => {
      if (payload.playerId === user.id) return;
      try {
        const next = new Chess();
        next.loadPgn(payload.pgn);
        setGame(next);
        setWhiteTime(payload.whiteTime);
        setBlackTime(payload.blackTime);
        setReplayStep(null); // return to live on new move
        if (payload.result) setResult(payload.result);
      } catch {
        toast.error('Could not process opponent move.');
      }
    });

    channel.on('broadcast', { event: 'result' }, ({ payload }) => setResult(payload.result));

    channel.on('broadcast', { event: 'request-state' }, () => {
      if (!isSpectator) {
        channel.send({
          type: 'broadcast',
          event: 'sync-state',
          payload: { pgn: game.pgn(), whiteTime, blackTime, result },
        });
      }
    });

    channel.on('broadcast', { event: 'sync-state' }, ({ payload }) => {
      if (isSpectator && payload?.pgn) {
        try {
          const synced = new Chess();
          synced.loadPgn(payload.pgn);
          setGame(synced);
          if (payload.whiteTime) setWhiteTime(payload.whiteTime);
          if (payload.blackTime) setBlackTime(payload.blackTime);
          if (payload.result) setResult(payload.result);
        } catch {
          // ignore sync failure
        }
      }
    });

    channel.on('broadcast', { event: 'draw-offer' }, ({ payload }) => {
      if (payload.playerId !== user.id && !isSpectator) setIncomingDraw(true);
    });

    channel.on('broadcast', { event: 'draw-response' }, ({ payload }) => {
      if (payload.to !== user.id) return;
      setDrawPending(false);
      if (payload.accepted) finishGame('Draw — agreed');
      else toast('Draw offer declined.');
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setGameChannelReady(true);
        if (isSpectator) {
          channel.send({ type: 'broadcast', event: 'request-state', payload: {} });
        }
      } else if (['CLOSED', 'CHANNEL_ERROR', 'TIMED_OUT'].includes(status)) {
        setGameChannelReady(false);
      }
    });

    return () => {
      gameChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [isMultiplayer, match?.roomId, user.id, isSpectator, game, whiteTime, blackTime, result, finishGame]);

  // VS AI logic
  useEffect(() => {
    const aiColor = playerSide === 'w' ? 'b' : 'w';
    if (!isAiMatch || result || turn !== aiColor) return undefined;
    setAiThinking(true);
    const timer = window.setTimeout(() => {
      setGame((current) => {
        const next = new Chess();
        next.loadPgn(current.pgn());
        const move = chooseComputerMove(next, match?.aiLevel || 10);
        if (!move) {
          setAiThinking(false);
          return current;
        }
        next.move(move);
        const over = checkGameOverPosition(next);
        if (over) finishGame(over);
        setAiThinking(false);
        return next;
      });
    }, 550);
    return () => window.clearTimeout(timer);
  }, [isAiMatch, match?.aiLevel, result, turn, playerSide, finishGame]);

  // Clock
  useEffect(() => {
    if (result || fullHistory.length === 0) return undefined;
    const timer = setInterval(() => {
      if (turn === 'w') setWhiteTime((t) => Math.max(0, t - 1));
      else setBlackTime((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [turn, result, fullHistory.length]);

  // Auto Replay timer
  useEffect(() => {
    if (!autoReplaying) return undefined;
    const interval = setInterval(() => {
      setReplayStep((step) => {
        const current = step ?? fullHistory.length;
        if (current >= fullHistory.length) {
          setAutoReplaying(false);
          return null;
        }
        return current + 1;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [autoReplaying, fullHistory.length]);

  // Flag fall
  useEffect(() => {
    if (result) return;
    if (whiteTime === 0) finishGame('White time out — Black wins');
    else if (blackTime === 0) finishGame('Black time out — White wins');
  }, [whiteTime, blackTime, result, finishGame]);

  useEffect(() => {
    if (result) toast(result, { icon: '🏁' });
  }, [result]);

  const validTargets = useMemo(() => {
    if (!selectedSquare || replayStep !== null || isSpectator) return [];
    return game.moves({ square: selectedSquare, verbose: true }).map((m) => m.to);
  }, [game, selectedSquare, replayStep, isSpectator]);

  const captured = useMemo(() => {
    const byWhite = [];
    const byBlack = [];
    for (const m of fullHistory) {
      if (m.captured) (m.color === 'w' ? byWhite : byBlack).push(PIECES[m.color === 'w' ? 'b' : 'w'][m.captured]);
    }
    return { byWhite, byBlack };
  }, [fullHistory]);

  function handleSquareClick(square) {
    if (isSpectator) return;
    if (replayStep !== null) {
      setReplayStep(null); // return to live position
    }
    if (isMultiplayer && !gameChannelReady) return;
    if (result) return;
    if (isMultiplayer && turn !== playerSide) return;
    if (isAiMatch && turn !== playerSide) return;

    const piece = game.get(square);

    if (selectedSquare && validTargets.includes(square)) {
      const next = new Chess();
      next.loadPgn(game.pgn());
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
      const over = checkGameOverPosition(next);
      if (isMultiplayer) {
        gameChannelRef.current?.send({
          type: 'broadcast',
          event: 'move',
          payload: {
            playerId: user.id,
            pgn: next.pgn(),
            whiteTime: turn === 'w' ? whiteTime + inc : whiteTime,
            blackTime: turn === 'b' ? blackTime + inc : blackTime,
            result: over,
          },
        });
      }
      if (over) finishGame(over);
      else if (next.inCheck()) toast('Check!', { icon: '⚠️' });
      return;
    }

    if (piece && piece.color === turn && (!isAiMatch && !isMultiplayer ? true : piece.color === playerSide)) {
      setSelectedSquare(square);
    } else {
      setSelectedSquare(null);
    }
  }

  function resetGame() {
    if (isMultiplayer || isSpectator) {
      onBack();
      return;
    }
    setGame(new Chess());
    setSelectedSquare(null);
    setWhiteTime(base);
    setBlackTime(base);
    setResult(null);
    setRatingChange(null);
    setReplayStep(null);
  }

  function resign() {
    if (result || isSpectator) return;
    const resigningColor = (isMultiplayer || isAiMatch) ? playerSide : turn;
    finishGame(`${resigningColor === 'w' ? 'Religion (White)' : 'Atheist (Black)'} resigned — ${resigningColor === 'w' ? 'Atheist (Black)' : 'Religion (White)'} wins`);
  }

  function offerDraw(accept = false) {
    if (isSpectator) return;
    if (isMultiplayer && !gameChannelReady) {
      toast.error('Connecting to opponent. Please try again shortly.');
      return;
    }
    if (!isMultiplayer) {
      finishGame('Draw — agreed');
      return;
    }
    if (incomingDraw) {
      setIncomingDraw(false);
      if (accept) finishGame('Draw — agreed');
      else gameChannelRef.current?.send({ type: 'broadcast', event: 'draw-response', payload: { to: match.opponent?.id, accepted: false } });
      return;
    }
    if (drawPending) return;
    setDrawPending(true);
    gameChannelRef.current?.send({ type: 'broadcast', event: 'draw-offer', payload: { playerId: user.id } });
  }

  // PGN Replay Navigators
  function goToReplayStep(step) {
    const clamped = Math.max(0, Math.min(fullHistory.length, step));
    setReplayStep(clamped);
  }

  function handleCopyPgn() {
    navigator.clipboard.writeText(game.pgn());
    toast.success('PGN copied to clipboard!');
  }

  function renderBoard() {
    const skinSet = resolveChessSkin(skinId, customization);
    const kingInCheck = game.inCheck()
      ? displayBoard.flat().find((p) => p && p.type === 'k' && p.color === turn)?.square
      : null;

    if (skinMode === '3d') {
      return (
        <Suspense fallback={<div className="grid h-full place-items-center rounded-xl border border-gold/30 bg-graphite text-sm text-gold">Loading 3D board…</div>}>
          <ChessBoard3D
            board={displayBoard}
            selectedSquare={selectedSquare}
            validTargets={validTargets}
            lastMove={lastMove}
            kingInCheck={kingInCheck}
            onSquareClick={handleSquareClick}
            skin={skinId}
            customization={customization}
            whiteName={whiteName}
            blackName={blackName}
            capturedByWhite={captured.byWhite}
            capturedByBlack={captured.byBlack}
            playerSide={playerSide}
          />
        </Suspense>
      );
    }

    const squares = [];
    const isFlipped = playerSide === 'b';

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const row = isFlipped ? 7 - r : r;
        const col = isFlipped ? 7 - c : c;
        const square = String.fromCharCode(97 + col) + (8 - row);
        const piece = displayBoard[row][col];
        const isLight = (row + col) % 2 === 0;
        const isSelected = selectedSquare === square;
        const isValidMove = validTargets.includes(square);
        const isLastMove = lastMove && (square === lastMove.from || square === lastMove.to);

        const tileColor = isLight ? toCssColor(skinSet.board.light) : toCssColor(skinSet.board.dark);
        let bg = '';
        if (isLastMove) bg = isLight ? 'bg-[#E6D27A]' : 'bg-[#BFA34A]';
        if (kingInCheck === square) bg = 'bg-crimson';

        squares.push(
          <div
            key={square}
            onClick={() => handleSquareClick(square)}
            className={`relative flex items-center justify-center select-none ${bg || 'bg-transparent'} ${
              isSelected ? 'ring-4 ring-gold ring-inset' : ''
            } ${isSpectator ? '' : 'cursor-pointer hover:brightness-110'} transition`}
            style={bg ? undefined : { backgroundColor: tileColor }}
          >
            {piece && <ChessPiece2D type={piece.type} color={piece.color} skin={skinId} customization={customization} />}
            {isValidMove && (
              <div
                className={`absolute rounded-full ${
                  piece ? 'inset-1 border-4 border-emerald/60' : 'w-4 h-4 bg-emerald/60'
                }`}
              />
            )}
            {c === 0 && <span className="absolute top-0.5 left-1 text-[10px] font-bold text-black/50">{8 - row}</span>}
            {r === 7 && (
              <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-black/50">{String.fromCharCode(97 + col)}</span>
            )}
          </div>
        );
      }
    }
    return squares;
  }

  const sans = fullHistory.map((m) => m.san);
  const youName = isSpectator
    ? (match?.whitePlayer || 'White')
    : user?.isGuest
    ? 'You (Guest)'
    : user?.user_metadata?.username || user?.email?.split('@')[0] || 'You';

  const opponentName = isSpectator
    ? (match?.blackPlayer || 'Black')
    : isAiMatch
    ? 'Computer'
    : match?.opponent?.username || 'Opponent';

  const isPlayerBlack = playerSide === 'b';
  const youLabel = isSpectator ? youName : isPlayerBlack ? `${youName} (Atheist / Black)` : `${youName} (Religion / White)`;
  const oppLabel = isSpectator ? opponentName : isPlayerBlack ? `${opponentName} (Religion / White)` : `${opponentName} (Atheist / Black)`;
  const youTime = isPlayerBlack ? blackTime : whiteTime;
  const oppTime = isPlayerBlack ? whiteTime : blackTime;
  const youTurn = isPlayerBlack ? turn === 'b' : turn === 'w';
  const oppTurn = isPlayerBlack ? turn === 'w' : turn === 'b';
  const youCaptured = isPlayerBlack ? captured.byBlack : captured.byWhite;
  const oppCaptured = isPlayerBlack ? captured.byWhite : captured.byBlack;
  const whiteName = isPlayerBlack ? oppLabel : youLabel;
  const blackName = isPlayerBlack ? youLabel : oppLabel;
  const activeSkin = resolveChessSkin(skinId, customization);

  return (
    <div className="min-h-screen bg-obsidian flex flex-col">
      <TopNav
        active="game"
        onNavigate={onNavigate}
        profile={{ username: youName }}
        onEditProfile={onEditProfile}
        onLogout={onLogout}
        isAdmin={user?.isGuest}
        user={user}
        onOpenLeaderboard={onOpenLeaderboard}
        onOpenHistory={onOpenHistory}
      />

      {/* Top Status & Controls */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-4 text-sm">
        <button onClick={onBack} className="text-gray-300 hover:text-white transition flex items-center gap-1 font-semibold">
          ← {isSpectator ? 'Leave Spectator' : 'Back to Lobby'}
        </button>

        <div className="flex items-center gap-3">
          {isSpectator && (
            <span className="flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-300 animate-pulse">
              <span>👁️</span> Spectator Mode (Live)
            </span>
          )}
          <span className="rounded-lg bg-white/5 border border-white/10 px-3 py-1 text-xs text-gray-300">
            {timeControl?.label || 'Rapid (10+0)'}
          </span>
        </div>
      </div>

      {/* Main Game Arena */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,560px)_1fr] gap-6 max-w-6xl w-full">
          {/* Left Column — Opponent */}
          <div className="space-y-4">
            <PlayerCard
              icon={isPlayerBlack ? '♔' : '♚'}
              iconClass={isPlayerBlack ? 'bg-gold text-obsidian' : 'bg-black text-white'}
              name={oppLabel}
              sub={isSpectator ? 'Black Player' : isMultiplayer ? 'Quick Match Opponent' : isAiMatch ? `Computer · Level ${match?.aiLevel || 10}` : 'Local hot-seat'}
              time={oppTime}
              active={oppTurn && !result}
            />
            <div className="bg-graphite border border-gold/30 rounded-xl p-4 shadow-md">
              <h3 className="text-gold font-bold mb-2 text-xs uppercase tracking-wider">{isPlayerBlack ? '♔ Captured by White' : '♟ Captured by Black'}</h3>
              <div className="text-2xl min-h-8">{oppCaptured.join('') || '—'}</div>
            </div>
          </div>

          {/* Center Column — Board */}
          <div className="space-y-3">
            {/* Faction / Side Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/30 bg-[#12141c] p-2.5 shadow-md">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-300">Choose Side:</span>
                <span className="text-[11px] text-gray-400 hidden sm:inline">(pieces at bottom)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSideChange('w')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    playerSide === 'w'
                      ? 'bg-gradient-to-r from-gold to-champagne text-obsidian shadow-md shadow-gold/25'
                      : 'bg-white/[.05] text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                  title="Choose Religion / White (White pieces at bottom)"
                >
                  <span>🕊️</span>
                  <span>Religion (White)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSideChange('b')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    playerSide === 'b'
                      ? 'bg-gradient-to-r from-rose-700 via-rose-900 to-graphite text-white border border-rose-400/40 shadow-md shadow-rose-900/30'
                      : 'bg-white/[.05] text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                  title="Choose Atheist / Black (Black pieces at bottom)"
                >
                  <span>🏴</span>
                  <span>Atheist (Black)</span>
                </button>
              </div>
            </div>

            {/* Board & Piece Skin — slide-down dropdown */}
            <SkinDropdown
              skinId={skinId}
              onSkinChange={setSkinId}
              skinMode={skinMode}
              onModeChange={setSkinMode}
              customization={customization}
              onCustomizationChange={setCustomization}
            />

            {isMultiplayer && !gameChannelReady && (
              <p role="status" className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-2 text-center text-xs text-amber-200">
                Connecting to match server…
              </p>
            )}
            {isAiMatch && aiThinking && (
              <p role="status" className="rounded-xl border border-gold/40 bg-gold/10 p-2 text-center text-xs text-gold">
                Computer is calculating best move…
              </p>
            )}

            {/* Board Container */}
            <div className="aspect-square">
              {skinMode === '3d' ? (
                renderBoard()
              ) : (
                <div className="w-full h-full grid grid-cols-8 grid-rows-8 rounded-xl overflow-hidden border-4 shadow-2xl" style={{ borderColor: toCssColor(activeSkin.board.frame) }}>
                  {renderBoard()}
                </div>
              )}
            </div>

            {/* In-Game PGN Replay Scrubber */}
            {fullHistory.length > 0 && (
              <div className="rounded-xl border border-gold/30 bg-[#12141c] p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="font-semibold text-gold">🎞️ PGN Replay</span>
                  <span>
                    {replayStep === null ? (
                      <span className="text-emerald-400 font-bold">● Live Game</span>
                    ) : (
                      <span className="text-amber-300 font-bold">Step {replayStep} / {fullHistory.length}</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 justify-center">
                  <button
                    type="button"
                    onClick={() => goToReplayStep(0)}
                    disabled={replayStep === 0}
                    className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 hover:border-gold hover:text-gold disabled:opacity-30"
                    title="First move"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    onClick={() => goToReplayStep((replayStep ?? fullHistory.length) - 1)}
                    disabled={replayStep === 0}
                    className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 hover:border-gold hover:text-gold disabled:opacity-30"
                    title="Previous move"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoReplaying(!autoReplaying)}
                    className="rounded bg-gold/20 border border-gold/40 px-3 py-1 text-xs font-bold text-gold hover:bg-gold hover:text-obsidian transition"
                  >
                    {autoReplaying ? '❚❚ Pause' : '▶ Play'}
                  </button>
                  <button
                    type="button"
                    onClick={() => goToReplayStep((replayStep ?? fullHistory.length - 1) + 1)}
                    disabled={replayStep === null || replayStep >= fullHistory.length}
                    className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 hover:border-gold hover:text-gold disabled:opacity-30"
                    title="Next move"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    onClick={() => { setReplayStep(null); setAutoReplaying(false); }}
                    className={`rounded border px-2.5 py-1 text-xs font-bold transition ${
                      replayStep === null
                        ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300'
                        : 'border-gold/40 bg-white/5 text-gray-300 hover:border-gold hover:text-gold'
                    }`}
                    title="Return to live position"
                  >
                    Live ▶|
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPgn}
                    className="ml-auto rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-300 hover:text-white"
                    title="Copy PGN"
                  >
                    📋
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadPgn({ pgn: game.pgn(), white_name: whiteName, black_name: blackName })}
                    className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-300 hover:text-white"
                    title="Export PGN file"
                  >
                    💾
                  </button>
                </div>
              </div>
            )}

            {/* Game Result Banner */}
            {result && (
              <div className="bg-gold/10 border border-gold rounded-xl p-5 text-center shadow-lg animate-fade-in">
                <div className="text-gold font-cinzel font-bold text-xl mb-1">{result}</div>
                {ratingChange !== null && (
                  <div className={`text-sm font-mono font-bold mb-3 ${ratingChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    Rating Update: {ratingChange >= 0 ? `+${ratingChange}` : ratingChange} Glicko-2 ELO
                  </div>
                )}
                <div className="flex justify-center gap-3">
                  <button onClick={resetGame} className="px-6 py-2 bg-gold text-obsidian font-bold rounded-lg hover:bg-champagne transition shadow-md shadow-gold/25">
                    {isMultiplayer || isSpectator ? 'Back to Lobby' : 'Play Again'}
                  </button>
                  <button onClick={handleCopyPgn} className="px-4 py-2 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition">
                    📋 Copy PGN
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column — You & Move History */}
          <div className="space-y-4">
            <PlayerCard
              icon={isPlayerBlack ? '♚' : '♔'}
              iconClass={isPlayerBlack ? 'bg-black text-white' : 'bg-gold text-obsidian'}
              name={youLabel}
              sub={isSpectator ? 'White Player' : 'Your pieces (Bottom side of board)'}
              time={youTime}
              active={youTurn && !result}
            />

            <div className="bg-graphite border border-gold/30 rounded-xl p-4 shadow-md">
              <h3 className="text-gold font-bold mb-2 text-xs uppercase tracking-wider">{isPlayerBlack ? '♟ Captured by Black' : '♙ Captured by White'}</h3>
              <div className="text-2xl min-h-8">{youCaptured.join('') || '—'}</div>
            </div>

            <div className="bg-graphite border border-gold/30 rounded-xl p-4 shadow-md">
              <h3 className="text-gold font-bold mb-2 text-xs uppercase tracking-wider flex items-center justify-between">
                <span>📜 Move History</span>
                <span className="text-[10px] text-gray-400 font-normal">Click move to replay</span>
              </h3>
              <div className="h-44 overflow-y-auto font-mono text-xs grid grid-cols-[2rem_1fr_1fr] gap-y-1 content-start pr-1">
                {Array.from({ length: Math.ceil(sans.length / 2) }).map((_, i) => (
                  <div key={i} className="contents">
                    <span className="text-gray-500 py-0.5">{i + 1}.</span>
                    <button
                      type="button"
                      onClick={() => goToReplayStep(i * 2 + 1)}
                      className={`text-left px-1 py-0.5 rounded transition ${
                        replayStep === i * 2 + 1
                          ? 'bg-gold text-obsidian font-bold'
                          : 'text-white hover:bg-white/10 hover:text-gold'
                      }`}
                    >
                      {sans[i * 2]}
                    </button>
                    {sans[i * 2 + 1] ? (
                      <button
                        type="button"
                        onClick={() => goToReplayStep(i * 2 + 2)}
                        className={`text-left px-1 py-0.5 rounded transition ${
                          replayStep === i * 2 + 2
                            ? 'bg-gold text-obsidian font-bold'
                            : 'text-gray-400 hover:bg-white/10 hover:text-gold'
                        }`}
                      >
                        {sans[i * 2 + 1]}
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-graphite border-t border-gold/30 p-4 pb-24 sm:pb-20">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-3">
          {isMultiplayer && !isSpectator && (
            <MultiplayerMediaCall
              roomId={match.roomId}
              userId={user.id}
              opponentName={opponentName}
              callTrigger={callTrigger}
              onEndCall={() => setCallTrigger(null)}
            />
          )}
          {!isAiMatch && (
            <>
              <button
                type="button"
                onClick={handleVoiceTalk}
                className="flex items-center gap-2 rounded-lg bg-slate px-5 py-2 text-gray-300 transition hover:bg-gray-700 hover:text-white"
                title="Start Voice Talk"
              >
                <span>🎙️</span>
                <span>Voice Talk</span>
              </button>
              <button
                type="button"
                onClick={handleVideoTalk}
                className="flex items-center gap-2 rounded-lg bg-slate px-5 py-2 text-gray-300 transition hover:bg-gray-700 hover:text-white"
                title="Start Video Talk"
              >
                <span>📹</span>
                <span>Video Talk</span>
              </button>
              <button
                type="button"
                onClick={onSocial}
                className="flex items-center gap-2 rounded-lg bg-slate px-5 py-2 text-gray-300 transition hover:bg-gray-700 hover:text-white"
                title="Open Chat"
              >
                <span>💬</span>
                <span>Chat</span>
              </button>
            </>
          )}
          {!isSpectator && (
            <button
              onClick={() => !result && offerDraw()}
              disabled={Boolean(result) || drawPending}
              className="px-5 py-2 bg-slate text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
            >
              {drawPending ? 'Waiting for draw response…' : '🤝 Offer Draw'}
            </button>
          )}
          {incomingDraw && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/40 px-3 py-1.5">
              <span className="text-xs text-amber-200">Opponent offered a draw:</span>
              <button onClick={() => offerDraw(true)} className="rounded-lg bg-emerald-500 px-3 py-1 font-bold text-xs text-obsidian">Accept</button>
              <button onClick={() => offerDraw(false)} className="rounded-lg bg-slate px-3 py-1 text-xs">Decline</button>
            </div>
          )}
          {!isSpectator && (
            <button onClick={resign} className="px-5 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition">
              🏳️ Resign
            </button>
          )}
        </div>
      </div>

      {showHistoricalSplash && <HistoricalSplash onContinue={() => setShowHistoricalSplash(false)} />}
      <FooterNav active="game" onNavigate={onNavigate} onEditProfile={onEditProfile} />
    </div>
  );
}

function MultiplayerMediaCall({ roomId, userId, opponentName, callTrigger, onEndCall }) {
  const [active, setActive] = useState(false);
  const [callType, setCallType] = useState('voice'); // 'voice' | 'video'
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [connected, setConnected] = useState(false);
  const [channelReady, setChannelReady] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const channelRef = useRef(null);
  const remoteMediaRef = useRef(null);
  const localVideoRef = useRef(null);
  const pendingCandidates = useRef([]);
  const createPeerRef = useRef(null);

  useEffect(() => {
    const channel = supabase.channel(`chess-voice:${roomId}`, { config: { private: true, broadcast: { self: false } } });
    channelRef.current = channel;

    async function ensurePeer(type = 'voice') {
      if (peerRef.current) return peerRef.current;
      setCallType(type);
      const withVideo = type === 'video';
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withVideo ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
      });
      streamRef.current = stream;

      if (withVideo && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const peer = new RTCPeerConnection({ iceServers: await getIceServers() });
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      peer.ontrack = (event) => {
        if (remoteMediaRef.current) {
          remoteMediaRef.current.srcObject = event.streams[0];
        }
      };

      peer.onicecandidate = ({ candidate }) => {
        if (candidate) {
          channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: { from: userId, kind: 'candidate', candidate: candidate.toJSON() },
          });
        }
      };

      peer.onconnectionstatechange = () => setConnected(peer.connectionState === 'connected');
      peer.oniceconnectionstatechange = () => {
        if (peer.iceConnectionState === 'failed') {
          toast.error(`${type === 'video' ? 'Video' : 'Voice'} connection failed. Please check your network connection.`);
        }
      };

      setActive(true);
      return peer;
    }
    createPeerRef.current = ensurePeer;

    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      if (payload.from === userId) return;
      if (payload.kind === 'candidate' && !peerRef.current) {
        pendingCandidates.current.push(payload.candidate);
        return;
      }
      try {
        const incomingType = payload.callType || 'voice';
        const peer = payload.kind === 'offer' ? await ensurePeer(incomingType) : peerRef.current;
        if (!peer) return;
        if (payload.kind === 'offer') {
          setCallType(incomingType);
          setMinimized(false);
          await peer.setRemoteDescription(payload.description);
          for (const candidate of pendingCandidates.current.splice(0)) await peer.addIceCandidate(candidate);
          await peer.setLocalDescription(await peer.createAnswer());
          await channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: { from: userId, kind: 'answer', callType: incomingType, description: peer.localDescription },
          });
        } else if (payload.kind === 'answer' && peer.signalingState === 'have-local-offer') {
          await peer.setRemoteDescription(payload.description);
          for (const candidate of pendingCandidates.current.splice(0)) await peer.addIceCandidate(candidate);
        } else if (payload.kind === 'candidate') {
          if (peer.remoteDescription) await peer.addIceCandidate(payload.candidate);
          else pendingCandidates.current.push(payload.candidate);
        } else if (payload.kind === 'hangup') {
          peer.close();
          peerRef.current = null;
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          setActive(false);
          setConnected(false);
          setCameraOff(false);
          onEndCall?.();
        }
      } catch (error) {
        toast.error(error.message || 'Could not connect talk.');
      }
    });

    channel.subscribe((status) => setChannelReady(status === 'SUBSCRIBED'));
    return () => {
      peerRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      createPeerRef.current = null;
      if (channelRef.current === channel) channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [roomId, userId]);

  async function startCall(type = 'voice') {
    if (!channelReady) {
      toast.error('Connecting channel. Please try again shortly.');
      return;
    }
    setCallType(type);
    try {
      const peer = await createPeerRef.current(type);
      setActive(true);
      if (peer.signalingState !== 'stable') return;
      await peer.setLocalDescription(
        await peer.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: type === 'video',
        })
      );
      await channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: { from: userId, kind: 'offer', callType: type, description: peer.localDescription },
      });
    } catch (error) {
      toast.error(
        error.name === 'NotAllowedError'
          ? `Please allow permission for ${type === 'video' ? 'camera and microphone' : 'microphone'}.`
          : error.message || 'Media unavailable.'
      );
    }
  }

  // Handle external trigger from bottom buttons
  useEffect(() => {
    if (!callTrigger) return;
    setMinimized(false);
    startCall(callTrigger.type);
  }, [callTrigger]);

  function toggleMute() {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  }

  function toggleCamera() {
    const next = !cameraOff;
    streamRef.current?.getVideoTracks().forEach((track) => { track.enabled = !next; });
    setCameraOff(next);
  }

  function hangup() {
    channelRef.current?.send({ type: 'broadcast', event: 'signal', payload: { from: userId, kind: 'hangup' } });
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    pendingCandidates.current = [];
    setActive(false);
    setConnected(false);
    setMuted(false);
    setCameraOff(false);
    onEndCall?.();
  }

  const isVideo = callType === 'video';
  const status = active
    ? connected
      ? `Connected · ${opponentName}`
      : `Connecting ${isVideo ? 'video' : 'voice'}…`
    : channelReady
    ? `Ready for 2-way ${isVideo ? 'video' : 'voice'} talk`
    : 'Connecting channel…';

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 rounded-xl border border-gold/50 bg-graphite/95 p-3 shadow-2xl backdrop-blur transition-all ${
        isVideo && active && !minimized ? 'w-[min(24rem,calc(100vw-2rem))]' : 'w-[min(22rem,calc(100vw-2rem))]'
      }`}
    >
      {/* Remote Media (video or audio) */}
      {isVideo ? (
        <video
          ref={remoteMediaRef}
          autoPlay
          playsInline
          className={`w-full rounded-lg bg-black object-cover ${minimized || !active ? 'hidden' : 'aspect-video mb-2'}`}
        />
      ) : (
        <audio ref={remoteMediaRef} autoPlay />
      )}

      {/* Local Video Preview PiP */}
      {isVideo && active && !minimized && (
        <div className="relative">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`absolute bottom-3 right-2 w-20 aspect-video rounded border border-gold/50 bg-black/90 object-cover ${cameraOff ? 'hidden' : ''}`}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald' : active ? 'bg-amber-400' : 'bg-gray-500'}`} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
          {isVideo ? '📹 Video Talk' : '🎙️ Voice Talk'}{' '}
          <span className="font-normal text-gray-400">{status}</span>
        </span>
        <button
          onClick={() => setMinimized((value) => !value)}
          className="rounded px-2 py-1 text-gray-300 hover:bg-slate"
          aria-label={minimized ? 'Expand call panel' : 'Minimize call panel'}
        >
          {minimized ? '□' : '—'}
        </button>
      </div>

      {!minimized && (
        <div className="mt-3 flex flex-wrap gap-2">
          {!active ? (
            <>
              <button
                onClick={() => startCall('voice')}
                disabled={!channelReady}
                className="flex items-center gap-1.5 rounded-lg bg-gold px-3 py-2 text-xs font-bold text-obsidian shadow-md shadow-gold/20 disabled:opacity-50 hover:bg-champagne transition"
              >
                <span>🎙️</span>
                <span>Start Voice Talk</span>
              </button>
              <button
                onClick={() => startCall('video')}
                disabled={!channelReady}
                className="flex items-center gap-1.5 rounded-lg border border-gold/40 bg-white/10 px-3 py-2 text-xs font-bold text-white shadow-md hover:bg-white/20 transition disabled:opacity-50"
              >
                <span>📹</span>
                <span>Start Video Talk</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className="rounded-lg bg-slate px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate/80 transition"
              >
                {muted ? 'Unmute' : 'Mute'}
              </button>
              {isVideo && (
                <button
                  onClick={toggleCamera}
                  className="rounded-lg bg-slate px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate/80 transition"
                >
                  {cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
                </button>
              )}
              <button
                onClick={hangup}
                className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800 transition"
              >
                End Call
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SkinDropdown({ skinId, onSkinChange, skinMode, onModeChange, customization, onCustomizationChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const activeSkin = CHESS_SKIN_LIST.find((s) => s.id === skinId) || CHESS_SKIN_LIST[0];

  // Close on outside click
  useEffect(() => {
    if (!open) return undefined;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-gold/30 bg-[#12141c] px-3.5 py-2.5 text-xs font-semibold text-white shadow-md hover:border-gold/60 transition"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-gold font-bold uppercase tracking-wider text-[10px]">Board &amp; Piece Skin</span>
          <span className="truncate text-gray-300">— {activeSkin.shortLabel}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {/* 2D/3D pill inline */}
          <span
            className="rounded-md border border-gold/25 bg-graphite px-1.5 py-0.5 text-[10px] font-bold text-gold"
          >
            {skinMode.toUpperCase()}
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Slide-Down Panel */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[520px] opacity-100' : 'max-h-0 opacity-0'}`}
        aria-hidden={!open}
      >
        <div className="mt-1 rounded-xl border border-gold/25 bg-[#0e1018] p-3 shadow-2xl shadow-black/60 space-y-3">

          {/* 2D / 3D Mode Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Board Render</span>
            <div className="flex rounded-lg border border-gold/20 bg-graphite p-0.5">
              {['2d', '3d'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onModeChange(mode)}
                  aria-pressed={skinMode === mode}
                  className={`rounded-md px-4 py-1 text-xs font-bold transition ${
                    skinMode === mode ? 'bg-gold text-obsidian shadow-sm' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/8" />

          {/* Skin List */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Piece &amp; Board Skin</span>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {CHESS_SKIN_LIST.map((skin) => {
                const isActive = skinId === skin.id;
                return (
                  <button
                    key={skin.id}
                    type="button"
                    onClick={() => { onSkinChange(skin.id); if (skin.id !== 'custom') setOpen(false); }}
                    aria-pressed={isActive}
                    className={`flex flex-col items-start rounded-lg border px-2.5 py-2 text-left transition ${
                      isActive
                        ? 'border-gold bg-gold/15 text-gold shadow-[0_0_12px_rgba(212,175,55,.18)]'
                        : 'border-white/8 bg-white/[.03] text-gray-300 hover:border-gold/40 hover:bg-white/[.06] hover:text-white'
                    }`}
                  >
                    <span className="font-bold text-[11px] leading-tight">{skin.shortLabel}</span>
                    <span className={`text-[10px] leading-tight mt-0.5 ${isActive ? 'text-gold/70' : 'text-gray-500'}`}>
                      {skin.description.length > 36 ? skin.description.slice(0, 36) + '…' : skin.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active skin description */}
          <p className="text-[10px] text-gray-500 italic border-t border-white/8 pt-2">
            {activeSkin.description}
          </p>

          {/* Custom Neon Controls (only when custom is selected) */}
          {skinId === 'custom' && (
            <CustomNeonControls value={customization} onChange={onCustomizationChange} />
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ icon, iconClass, name, sub, time, active }) {
  return (
    <div className={`bg-graphite border rounded-xl p-4 shadow-md transition ${active ? 'border-gold shadow-gold/20' : 'border-gold/30'}`}>
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

function CustomNeonControls({ value, onChange }) {
  const update = (key, next) => onChange((current) => ({ ...current, [key]: next }));
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-cyan-300/20 bg-[#101525] p-3 text-[11px] text-gray-300 sm:grid-cols-4">
      <label className="flex items-center gap-2"><input type="color" value={value.primary} onChange={(event) => update('primary', event.target.value)} className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0" /><span>Holy neon</span></label>
      <label className="flex items-center gap-2"><input type="color" value={value.secondary} onChange={(event) => update('secondary', event.target.value)} className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0" /><span>Anarchy neon</span></label>
      <label className="col-span-2 flex flex-col gap-1">Particle count <input type="range" min="4" max="24" step="1" value={value.particleCount} onChange={(event) => update('particleCount', Number(event.target.value))} /><span className="text-gray-500">{value.particleCount} particles</span></label>
      <label className="col-span-2 flex flex-col gap-1">Orbit speed <input type="range" min="0.25" max="2.5" step="0.05" value={value.particleSpeed} onChange={(event) => update('particleSpeed', Number(event.target.value))} /><span className="text-gray-500">{value.particleSpeed.toFixed(2)}×</span></label>
      <label className="col-span-2 flex flex-col gap-1">Particle size <input type="range" min="0.02" max="0.07" step="0.005" value={value.particleSize} onChange={(event) => update('particleSize', Number(event.target.value))} /><span className="text-gray-500">{value.particleSize.toFixed(3)}</span></label>
      <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={value.aura} onChange={(event) => update('aura', event.target.checked)} className="accent-cyan-300" /> Enable King &amp; Queen aura</label>
    </div>
  );
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function toCssColor(value) {
  return `#${value.toString(16).padStart(6, '0')}`;
}
