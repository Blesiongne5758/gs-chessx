import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { Chess } from 'chess.js';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { getIceServers } from '../lib/webrtc';
const ChessBoard3D = lazy(() => import('./ChessBoard3D'));
import ChessPiece2D from './ChessPiece2D';
import { CHESS_SKIN_LIST, resolveChessSkin } from '../lib/chessSkins';

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

export default function GameRoom({ user, timeControl, match, onBack, onSocial }) {
  const base = timeControl?.base ?? 600;
  const inc = timeControl?.inc ?? 0;

  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [whiteTime, setWhiteTime] = useState(base);
  const [blackTime, setBlackTime] = useState(base);
  const [result, setResult] = useState(null); // string when the game is finished
  const [incomingDraw, setIncomingDraw] = useState(false);
  const [drawPending, setDrawPending] = useState(false);
  const [gameChannelReady, setGameChannelReady] = useState(false);
  const [skinMode, setSkinMode] = useState('3d');
  const [skinId, setSkinId] = useState('holy');
  const [customization, setCustomization] = useState(DEFAULT_CUSTOMIZATION);
  const gameChannelRef = useRef(null);
  const myColor = match?.color === 'black' ? 'b' : 'w';
  const isMultiplayer = Boolean(match?.roomId);

  const turn = game.turn();
  const history = game.history({ verbose: true });
  const lastMove = history[history.length - 1];
  const finishGame = useCallback((message) => {
    setResult(message);
    if (isMultiplayer) gameChannelRef.current?.send({ type: 'broadcast', event: 'result', payload: { result: message } });
  }, [isMultiplayer]);

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
        if (payload.result) setResult(payload.result);
      } catch { toast.error('Langkah dari lawan tidak dapat dimuat.'); }
    });
    channel.on('broadcast', { event: 'result' }, ({ payload }) => setResult(payload.result));
    channel.on('broadcast', { event: 'draw-offer' }, ({ payload }) => {
      if (payload.playerId !== user.id) setIncomingDraw(true);
    });
    channel.on('broadcast', { event: 'draw-response' }, ({ payload }) => {
      if (payload.to !== user.id) return;
      setDrawPending(false);
      if (payload.accepted) setResult('Remis — disepakati');
      else toast('Tawaran remis ditolak.');
    });
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') setGameChannelReady(true);
      else if (['CLOSED', 'CHANNEL_ERROR', 'TIMED_OUT'].includes(status)) setGameChannelReady(false);
    });
    return () => { gameChannelRef.current = null; supabase.removeChannel(channel); };
  }, [isMultiplayer, match?.roomId, user.id]);

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
    if (whiteTime === 0) finishGame('Waktu Putih habis — Hitam menang');
    else if (blackTime === 0) finishGame('Waktu Hitam habis — Putih menang');
  }, [whiteTime, blackTime, result, finishGame]);

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
    if (isMultiplayer && !gameChannelReady) return;
    if (result || (isMultiplayer && turn !== myColor)) return;
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
      if (isMultiplayer) gameChannelRef.current?.send({ type: 'broadcast', event: 'move', payload: { playerId: user.id, pgn: next.pgn(), whiteTime: turn === 'w' ? whiteTime + inc : whiteTime, blackTime: turn === 'b' ? blackTime + inc : blackTime, result: over } });
      if (over) setResult(over);
      else if (next.inCheck()) toast('Skak!', { icon: '⚠️' });
      return;
    }

    if (piece && piece.color === turn) setSelectedSquare(square);
    else setSelectedSquare(null);
  }

  function resetGame() {
    if (isMultiplayer) { onBack(); return; }
    setGame(new Chess());
    setSelectedSquare(null);
    setWhiteTime(base);
    setBlackTime(base);
    setResult(null);
  }

  function resign() {
    if (result) return;
    const resigningColor = isMultiplayer ? myColor : turn;
    finishGame(`${resigningColor === 'w' ? 'Putih' : 'Hitam'} menyerah — ${resigningColor === 'w' ? 'Hitam' : 'Putih'} menang`);
  }

  function offerDraw(accept = false) {
    if (isMultiplayer && !gameChannelReady) { toast.error('Menghubungkan ke lawan. Coba lagi sebentar.'); return; }
    if (!isMultiplayer) { setResult('Remis — disepakati'); return; }
    if (incomingDraw) {
      setIncomingDraw(false);
      if (accept) finishGame('Remis — disepakati');
      else gameChannelRef.current?.send({ type: 'broadcast', event: 'draw-response', payload: { to: match.opponent?.id, accepted: false } });
      return;
    }
    if (drawPending) return;
    setDrawPending(true);
    gameChannelRef.current?.send({ type: 'broadcast', event: 'draw-offer', payload: { playerId: user.id } });
  }

  function renderBoard() {
    const board = game.board();
    const skinSet = resolveChessSkin(skinId, customization);
    const kingInCheck = game.inCheck()
      ? board.flat().find((p) => p && p.type === 'k' && p.color === turn)?.square
      : null;
    if (skinMode === '3d') {
      return <Suspense fallback={<div className="grid h-full place-items-center rounded-xl border border-gold/30 bg-graphite text-sm text-gold">Memuat papan 3D…</div>}><ChessBoard3D board={board} selectedSquare={selectedSquare} validTargets={validTargets} lastMove={lastMove} kingInCheck={kingInCheck} onSquareClick={handleSquareClick} skin={skinId} customization={customization} /></Suspense>;
    }
    const squares = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = String.fromCharCode(97 + col) + (8 - row);
        const piece = board[row][col];
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
            className={`relative flex items-center justify-center cursor-pointer select-none ${bg || 'bg-transparent'} ${
              isSelected ? 'ring-4 ring-gold ring-inset' : ''
            } hover:brightness-110 transition`}
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
  const youName = user?.isGuest ? 'You (Guest)' : user?.user_metadata?.username || user?.email?.split('@')[0] || 'You';
  const opponentName = match?.opponent?.username || 'Lawan';
  const blackName = isMultiplayer ? (myColor === 'b' ? youName : opponentName) : 'Opponent (Black)';
  const whiteName = isMultiplayer ? (myColor === 'w' ? youName : opponentName) : `${youName} (White)`;
  const activeSkin = resolveChessSkin(skinId, customization);

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
              name={`${blackName} (Black)`}
              sub={isMultiplayer ? 'Quick Match' : 'Local hot-seat'}
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
            <div className="space-y-2"><div className="flex items-center justify-between gap-3"><div><div className="text-xs uppercase tracking-widest text-gray-500">Skin bidak</div><div className="mt-1 text-[11px] text-gray-500">{CHESS_SKIN_LIST.find((skin) => skin.id === skinId)?.description}</div></div><div className="flex shrink-0 rounded-lg border border-gold/25 bg-graphite p-1"><button onClick={() => setSkinMode('3d')} aria-pressed={skinMode === '3d'} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${skinMode === '3d' ? 'bg-gold text-obsidian' : 'text-gray-300'}`}>3D</button><button onClick={() => setSkinMode('2d')} aria-pressed={skinMode === '2d'} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${skinMode === '2d' ? 'bg-gold text-obsidian' : 'text-gray-300'}`}>2D</button></div></div><div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">{CHESS_SKIN_LIST.map((skin) => <button key={skin.id} onClick={() => setSkinId(skin.id)} aria-pressed={skinId === skin.id} className={`rounded-md border px-2 py-1.5 text-[11px] font-semibold transition ${skinId === skin.id ? 'border-gold bg-gold text-obsidian shadow-[0_0_14px_rgba(212,175,55,.24)]' : 'border-white/10 bg-graphite text-gray-300 hover:border-gold/50'}`}>{skin.shortLabel}</button>)}</div>{skinId === 'custom' && <CustomNeonControls value={customization} onChange={setCustomization} />}</div>
            {isMultiplayer && !gameChannelReady && <p role="status" className="rounded border border-amber-400/40 bg-amber-400/10 p-2 text-center text-xs text-amber-200">Menghubungkan ke pertandingan. Langkah akan aktif setelah tersambung.</p>}
            <div className="aspect-square">
              {skinMode === '3d' ? renderBoard() : <div className="w-full h-full grid grid-cols-8 grid-rows-8 rounded-lg overflow-hidden border-4 shadow-2xl" style={{ borderColor: toCssColor(activeSkin.board.frame) }}>{renderBoard()}</div>}
            </div>
            {result && (
              <div className="bg-gold/10 border border-gold rounded-lg p-4 text-center">
                <div className="text-gold font-cinzel font-bold text-xl mb-2">{result}</div>
                <button onClick={resetGame} className="px-6 py-2 bg-gold text-obsidian font-bold rounded hover:bg-champagne">
                  {isMultiplayer ? 'Kembali ke Lobby' : 'Main Lagi'}
                </button>
              </div>
            )}
          </div>

          {/* Right — White / you + history */}
          <div className="space-y-4">
            <PlayerCard
              icon="♔"
              iconClass="bg-gold text-obsidian"
              name={whiteName}
              sub={isMultiplayer ? 'Quick Match' : 'Local hot-seat'}
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
          {isMultiplayer && <MultiplayerVoice roomId={match.roomId} userId={user.id} opponentName={opponentName} />}
          <button onClick={onSocial} className="px-6 py-2 bg-slate text-gray-300 rounded hover:bg-gray-700">
            🎙️ Voice / Video
          </button>
          <button onClick={onSocial} className="px-6 py-2 bg-slate text-gray-300 rounded hover:bg-gray-700">
            💬 Chat
          </button>
          <button
            onClick={() => !result && offerDraw()}
            disabled={Boolean(result) || drawPending}
            className="px-6 py-2 bg-slate text-gray-300 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {drawPending ? 'Menunggu jawaban remis…' : '🤝 Tawarkan remis'}
          </button>
          {incomingDraw && <><span className="self-center text-sm text-amber-200">Lawan menawarkan remis</span><button onClick={() => offerDraw(true)} className="rounded bg-emerald px-4 py-2 font-semibold text-obsidian">Terima remis</button><button onClick={() => offerDraw(false)} className="rounded bg-slate px-4 py-2">Tolak remis</button></>}
          <button onClick={resign} className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            🏳️ Resign
          </button>
        </div>
      </div>
    </div>
  );
}

function MultiplayerVoice({ roomId, userId, opponentName }) {
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [channelReady, setChannelReady] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const channelRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pendingCandidates = useRef([]);
  const createPeerRef = useRef(null);

  useEffect(() => {
    const channel = supabase.channel(`chess-voice:${roomId}`, { config: { private: true, broadcast: { self: false } } });
    channelRef.current = channel;
    async function ensurePeer() {
      if (peerRef.current) return peerRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const peer = new RTCPeerConnection({ iceServers: await getIceServers() });
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      peer.ontrack = (event) => { if (remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0]; };
      peer.onicecandidate = ({ candidate }) => {
        if (candidate) channel.send({ type: 'broadcast', event: 'signal', payload: { from: userId, kind: 'candidate', candidate: candidate.toJSON() } });
      };
      peer.onconnectionstatechange = () => setConnected(peer.connectionState === 'connected');
      peer.oniceconnectionstatechange = () => { if (peer.iceConnectionState === 'failed') toast.error('Koneksi suara gagal; jaringan mungkin memerlukan TURN.'); };
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
        const peer = payload.kind === 'offer' ? await ensurePeer() : peerRef.current;
        if (!peer) return;
        if (payload.kind === 'offer') {
          await peer.setRemoteDescription(payload.description);
          for (const candidate of pendingCandidates.current.splice(0)) await peer.addIceCandidate(candidate);
          await peer.setLocalDescription(await peer.createAnswer());
          await channel.send({ type: 'broadcast', event: 'signal', payload: { from: userId, kind: 'answer', description: peer.localDescription } });
        } else if (payload.kind === 'answer' && peer.signalingState === 'have-local-offer') {
          await peer.setRemoteDescription(payload.description);
          for (const candidate of pendingCandidates.current.splice(0)) await peer.addIceCandidate(candidate);
        } else if (payload.kind === 'candidate') {
          if (peer.remoteDescription) await peer.addIceCandidate(payload.candidate);
          else pendingCandidates.current.push(payload.candidate);
        } else if (payload.kind === 'hangup') {
          peer.close(); peerRef.current = null; streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setActive(false); setConnected(false);
        }
      } catch (error) { toast.error(error.message || 'Tidak dapat menyambungkan voice talk.'); }
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

  async function startVoice() {
    if (!channelReady) { toast.error('Menghubungkan kanal suara. Coba lagi sebentar.'); return; }
    try {
      const peer = await createPeerRef.current();
      setActive(true);
      if (peer.signalingState !== 'stable') return;
      await peer.setLocalDescription(await peer.createOffer());
      await channelRef.current.send({ type: 'broadcast', event: 'signal', payload: { from: userId, kind: 'offer', description: peer.localDescription } });
    } catch (error) { toast.error(error.name === 'NotAllowedError' ? 'Izinkan akses mikrofon untuk voice talk.' : (error.message || 'Mikrofon tidak tersedia.')); }
  }
  function toggleMute() {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  }
  function hangup() {
    channelRef.current?.send({ type: 'broadcast', event: 'signal', payload: { from: userId, kind: 'hangup' } });
    peerRef.current?.close(); peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;
    pendingCandidates.current = [];
    setActive(false); setConnected(false); setMuted(false);
  }
  const status = active ? (connected ? `Tersambung · ${opponentName}` : 'Menghubungkan suara…') : channelReady ? 'Siap bicara 2 arah' : 'Menghubungkan kanal…';
  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-gold/50 bg-graphite/95 p-3 shadow-2xl backdrop-blur">
      <audio ref={remoteAudioRef} autoPlay />
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald' : active ? 'bg-amber-400' : 'bg-gray-500'}`} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">TalkVoice <span className="font-normal text-gray-400">{status}</span></span>
        <button onClick={() => setMinimized((value) => !value)} className="rounded px-2 py-1 text-gray-300 hover:bg-slate" aria-label={minimized ? 'Buka panel voice' : 'Kecilkan panel voice'}>{minimized ? '□' : '—'}</button>
      </div>
      {!minimized && <div className="mt-3 flex flex-wrap gap-2">
        {!active ? <button onClick={startVoice} disabled={!channelReady} className="rounded bg-gold px-3 py-2 text-sm font-bold text-obsidian disabled:opacity-50">🎙️ Mulai bicara</button> : <>
          <button onClick={toggleMute} className="rounded bg-slate px-3 py-2 text-sm text-white">{muted ? 'Aktifkan mikrofon' : 'Bisukan'}</button>
          <button onClick={hangup} className="rounded bg-red-700 px-3 py-2 text-sm text-white">Akhiri suara</button>
        </>}
      </div>}
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

function CustomNeonControls({ value, onChange }) {
  const update = (key, next) => onChange((current) => ({ ...current, [key]: next }));
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-cyan-300/20 bg-[#101525] p-3 text-[11px] text-gray-300 sm:grid-cols-4">
      <label className="flex items-center gap-2"><input type="color" value={value.primary} onChange={(event) => update('primary', event.target.value)} className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0" /><span>Holy neon</span></label>
      <label className="flex items-center gap-2"><input type="color" value={value.secondary} onChange={(event) => update('secondary', event.target.value)} className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0" /><span>Anarchy neon</span></label>
      <label className="col-span-2 flex flex-col gap-1">Partikel <input type="range" min="4" max="24" step="1" value={value.particleCount} onChange={(event) => update('particleCount', Number(event.target.value))} /><span className="text-gray-500">{value.particleCount} partikel</span></label>
      <label className="col-span-2 flex flex-col gap-1">Kecepatan orbit <input type="range" min="0.25" max="2.5" step="0.05" value={value.particleSpeed} onChange={(event) => update('particleSpeed', Number(event.target.value))} /><span className="text-gray-500">{value.particleSpeed.toFixed(2)}×</span></label>
      <label className="col-span-2 flex flex-col gap-1">Ukuran partikel <input type="range" min="0.02" max="0.07" step="0.005" value={value.particleSize} onChange={(event) => update('particleSize', Number(event.target.value))} /><span className="text-gray-500">{value.particleSize.toFixed(3)}</span></label>
      <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={value.aura} onChange={(event) => update('aura', event.target.checked)} className="accent-cyan-300" /> Aktifkan aura raja &amp; ratu</label>
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
