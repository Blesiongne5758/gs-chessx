import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import type { SupabaseClient } from "@supabase/supabase-js";

type GameRow = {
  id: string;
  white_player_id: string;
  black_player_id: string | null;
  status: string;
  fen: string;
  pgn: string;
  ply: number;
  turn: "white" | "black";
  white_seconds: number;
  black_seconds: number;
  turn_started_at: string | null;
  winner_id: string | null;
};

type MoveRow = {
  id: number;
  ply: number;
  player_id: string;
  from_square: Square;
  to_square: Square;
  promotion: string | null;
  san: string;
};

type Props = {
  supabase: SupabaseClient;
  gameId: string;
  userId: string;
};

const GLYPHS: Record<string, string> = {
  wk: "♔", wq: "♕", wr: "♖", wb: "♗", wn: "♘", wp: "♙",
  bk: "♚", bq: "♛", br: "♜", bb: "♝", bn: "♞", bp: "♟",
};

export default function OnlineChessGame({ supabase, gameId, userId }: Props) {
  const [game, setGame] = useState<GameRow | null>(null);
  const [moves, setMoves] = useState<MoveRow[]>([]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [secondsNow, setSecondsNow] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const timeoutClaimed = useRef(false);

  const chess = useMemo(() => {
    if (!game) return new Chess();
    const instance = new Chess();
    try {
      if (game.pgn) instance.loadPgn(game.pgn);
      else instance.load(game.fen);
    } catch {
      instance.load(game.fen);
    }
    return instance;
  }, [game]);

  const loadSnapshot = useCallback(async () => {
    const [gameResult, movesResult] = await Promise.all([
      supabase.from("chess_games").select("*").eq("id", gameId).single(),
      supabase.from("chess_moves").select("*").eq("game_id", gameId).order("ply", { ascending: true }),
    ]);
    if (gameResult.error) throw gameResult.error;
    if (movesResult.error) throw movesResult.error;
    setGame(gameResult.data as GameRow);
    setMoves((movesResult.data ?? []) as MoveRow[]);
    setSelected(null);
    timeoutClaimed.current = false;
  }, [gameId, supabase]);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        await loadSnapshot();
        if (!alive) return;
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Gagal memuat pertandingan");
      }
    };
    void refresh();

    const channel = supabase
      .channel(`chess-game:${gameId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "chess_games", filter: `id=eq.${gameId}`,
      }, () => { void refresh(); })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "chess_moves", filter: `game_id=eq.${gameId}`,
      }, () => { void refresh(); })
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [gameId, loadSnapshot, supabase]);

  useEffect(() => {
    const timer = window.setInterval(() => setSecondsNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const isWhite = game?.white_player_id === userId;
  const isPlayer = Boolean(game && (isWhite || game.black_player_id === userId));
  const playerColor = isWhite ? "white" : "black";
  const canMove = Boolean(game && isPlayer && game.status === "active" && game.turn === playerColor && !busy);
  const elapsed = game?.status === "active" && game.turn_started_at
    ? Math.max(0, (secondsNow - Date.parse(game.turn_started_at)) / 1000)
    : 0;
  const whiteLeft = Math.max(0, (game?.white_seconds ?? 0) - (game?.turn === "white" ? elapsed : 0));
  const blackLeft = Math.max(0, (game?.black_seconds ?? 0) - (game?.turn === "black" ? elapsed : 0));
  const activeClock = game?.turn === "white" ? whiteLeft : blackLeft;

  useEffect(() => {
    if (!game || game.status !== "active" || activeClock > 0 || timeoutClaimed.current) return;
    timeoutClaimed.current = true;
    void (async () => {
      const { data, error: callError } = await supabase.functions.invoke("make-move", {
        body: { action: "claim_timeout", gameId },
      });
      if (callError && !callError.message.includes("409")) setError(callError.message);
      if (data?.error === "CLOCK_RUNNING") timeoutClaimed.current = false;
      void loadSnapshot();
    })();
  }, [activeClock, game, gameId, loadSnapshot, supabase]);

  const legalTargets = selected
    ? chess.moves({ square: selected, verbose: true }).map((move) => move.to)
    : [];

  async function sendMove(from: Square, to: Square) {
    if (!game || !canMove) return;
    setBusy(true);
    setError("");
    try {
      // Queen promotion by default; present a promotion chooser in production if desired.
      const piece = chess.get(from);
      const promotion = piece?.type === "p" && (to.endsWith("8") || to.endsWith("1")) ? "q" : undefined;
      const { data, error: invokeError } = await supabase.functions.invoke("make-move", {
        body: { gameId, from, to, promotion, expectedPly: game.ply },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      setSelected(null);
      timeoutClaimed.current = false;
      await loadSnapshot();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Langkah gagal dikirim";
      setError(message);
      if (message.includes("STALE_GAME_STATE")) await loadSnapshot();
    } finally {
      setBusy(false);
    }
  }

  function clickSquare(square: Square) {
    if (!canMove) return;
    const piece = chess.get(square);
    if (selected && legalTargets.includes(square)) {
      void sendMove(selected, square);
      return;
    }
    if (piece && piece.color === (isWhite ? "w" : "b")) setSelected(square);
    else setSelected(null);
  }

  if (!game) return <div role="status">Memuat pertandingan online…</div>;
  if (!isPlayer) return <div role="alert">Akun ini bukan peserta pertandingan.</div>;

  return (
    <section className="online-chess" aria-label="Pertandingan catur online">
      <header>
        <strong>{game.status === "active" ? `Giliran ${game.turn}` : `Status: ${game.status}`}</strong>
        <div>Putih: {formatClock(whiteLeft)} · Hitam: {formatClock(blackLeft)}</div>
        <small>Langkah tersimpan: {game.ply}</small>
      </header>

      <div className="online-chess-board" role="grid" aria-label="Papan catur">
        {chess.board().flatMap((row, rowIndex) => row.map((piece, colIndex) => {
          const square = `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}` as Square;
          const isLight = (rowIndex + colIndex) % 2 === 0;
          const selectedSquare = square === selected;
          const validTarget = legalTargets.includes(square);
          const last = moves[moves.length - 1];
          const isLastMove = last && (last.from_square === square || last.to_square === square);
          return (
            <button
              key={square}
              type="button"
              role="gridcell"
              aria-label={`${square}${piece ? ` ${piece.color === "w" ? "putih" : "hitam"} ${piece.type}` : " kosong"}`}
              aria-pressed={selectedSquare}
              disabled={!canMove}
              onClick={() => clickSquare(square)}
              className={`chess-square ${isLight ? "light" : "dark"} ${isLastMove ? "last-move" : ""} ${selectedSquare ? "selected" : ""}`}
            >
              {piece && <span className={piece.color === "w" ? "piece white-piece" : "piece black-piece"}>{GLYPHS[`${piece.color}${piece.type}`]}</span>}
              {validTarget && <i className={piece ? "capture-dot" : "move-dot"} aria-hidden="true" />}
              <small>{rowIndex === 7 ? String.fromCharCode(97 + colIndex) : ""}{colIndex === 0 ? `${8 - rowIndex}` : ""}</small>
            </button>
          );
        }))}
      </div>

      <ol className="online-move-list" aria-label="Riwayat langkah">
        {moves.map((move) => <li key={move.id}>{Math.ceil(move.ply / 2)}{move.ply % 2 ? "." : "…"} {move.san}</li>)}
      </ol>
      {error && <p role="alert">{error}</p>}
      <p aria-live="polite">{busy ? "Mengirim langkah…" : canMove ? "Giliran Anda" : "Menunggu lawan…"}</p>
    </section>
  );
}

function formatClock(seconds: number) {
  const total = Math.ceil(seconds);
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}
