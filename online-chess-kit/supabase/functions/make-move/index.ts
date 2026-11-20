import { createClient } from "npm:@supabase/supabase-js@2.109.0";
import { Chess } from "npm:chess.js@1.4.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type MoveBody = {
  action?: "move" | "claim_timeout";
  gameId: string;
  from?: string;
  to?: string;
  promotion?: "q" | "r" | "b" | "n";
  expectedPly?: number;
};

const respond = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "METHOD_NOT_ALLOWED" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return respond({ error: "AUTH_REQUIRED" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY");
    return respond({ error: "SERVER_CONFIG_ERROR" }, 500);
  }

  // Validate the caller's JWT separately; never accept player_id from the request body.
  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return respond({ error: "INVALID_SESSION" }, 401);
  const playerId = authData.user.id;

  let body: MoveBody;
  try {
    body = await req.json();
  } catch {
    return respond({ error: "INVALID_JSON" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return respond({ error: "INVALID_REQUEST_BODY" }, 400);
  }
  if (typeof body.gameId !== "string") return respond({ error: "GAME_ID_REQUIRED" }, 400);

  // Privileged key is server-only. Participant and turn authorization are checked here and again in SQL.
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: game, error: readError } = await admin
    .from("chess_games")
    .select("id, white_player_id, black_player_id, fen, pgn, ply, turn, status")
    .eq("id", body.gameId)
    .maybeSingle();

  if (readError) {
    console.error("Game read failed", readError);
    return respond({ error: "GAME_READ_FAILED" }, 500);
  }
  if (!game) return respond({ error: "GAME_NOT_FOUND" }, 404);
  if (playerId !== game.white_player_id && playerId !== game.black_player_id) {
    return respond({ error: "NOT_A_PLAYER" }, 403);
  }
  if (game.status !== "active") return respond({ error: "GAME_NOT_ACTIVE" }, 409);

  if (body.action === "claim_timeout") {
    const { data, error } = await admin.rpc("claim_chess_timeout", {
      p_game_id: game.id,
      p_player_id: playerId,
    });
    if (error) return rpcError(error.message);
    if (data?.error === "CLOCK_RUNNING") {
      return respond({ error: "CLOCK_RUNNING", remaining: data.remaining }, 409);
    }
    return respond({ game: data });
  }

  if (body.action && body.action !== "move") return respond({ error: "INVALID_ACTION" }, 400);
  const { from, to, promotion, expectedPly } = body;
  if (typeof from !== "string" || typeof to !== "string" || !Number.isInteger(expectedPly) || (expectedPly as number) < 0) {
    return respond({ error: "FROM_TO_AND_EXPECTED_PLY_REQUIRED" }, 400);
  }
  if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) {
    return respond({ error: "INVALID_SQUARE" }, 400);
  }
  if (promotion !== undefined && !["q", "r", "b", "n"].includes(promotion)) {
    return respond({ error: "INVALID_PROMOTION" }, 400);
  }
  if (expectedPly !== game.ply) {
    return respond({ error: "STALE_GAME_STATE", currentPly: game.ply, currentFen: game.fen }, 409);
  }
  const playerColor = playerId === game.white_player_id ? "white" : "black";
  if (playerColor !== game.turn) return respond({ error: "NOT_YOUR_TURN", turn: game.turn }, 409);

  let chess: Chess;
  try {
    chess = new Chess();
    if (game.pgn) chess.loadPgn(game.pgn);
    else chess.load(game.fen);
    // Reject a mismatched persisted FEN/PGN rather than computing from an ambiguous state.
    if (chess.fen() !== game.fen) {
      console.error("PGN/FEN mismatch for game", game.id);
      return respond({ error: "CORRUPT_GAME_STATE" }, 500);
    }
  } catch (error) {
    console.error("Could not load chess position", error);
    return respond({ error: "CORRUPT_GAME_STATE" }, 500);
  }

  let move;
  try {
    move = chess.move({ from, to, ...(promotion ? { promotion } : {}) });
  } catch {
    move = null;
  }
  if (!move) return respond({ error: "ILLEGAL_MOVE" }, 422);

  const nextTurn = chess.turn() === "w" ? "white" : "black";
  const nextStatus = chess.isGameOver() ? "completed" : "active";
  const winnerId = chess.isCheckmate()
    ? (nextTurn === "white" ? game.white_player_id : game.black_player_id)
    : null;

  const { data, error } = await admin.rpc("commit_chess_move", {
    p_game_id: game.id,
    p_player_id: playerId,
    p_expected_ply: expectedPly,
    p_from: move.from,
    p_to: move.to,
    p_promotion: move.promotion ?? null,
    p_san: move.san,
    p_uci: `${move.from}${move.to}${move.promotion ?? ""}`,
    p_fen: chess.fen(),
    p_pgn: chess.pgn(),
    p_next_turn: nextTurn,
    p_next_status: nextStatus,
    p_winner_id: winnerId,
  });

  if (error) return rpcError(error.message);
  if (data?.error === "TIME_EXPIRED") return respond({ error: "TIME_EXPIRED", game: data }, 409);

  return respond({
    game: data,
    move: {
      from: move.from,
      to: move.to,
      promotion: move.promotion ?? null,
      san: move.san,
      uci: `${move.from}${move.to}${move.promotion ?? ""}`,
    },
  });
});

function rpcError(message: string): Response {
  const code = [
    "GAME_NOT_FOUND", "NOT_A_PLAYER", "GAME_NOT_ACTIVE", "STALE_GAME_STATE",
    "NOT_YOUR_TURN", "INVALID_SQUARE", "INVALID_PROMOTION", "INVALID_NEXT_STATE",
  ].find((candidate) => message.includes(candidate));
  const status = code === "NOT_A_PLAYER" ? 403 : code ? 409 : 500;
  if (!code) console.error("RPC failed", message);
  return respond({ error: code ?? "MOVE_COMMIT_FAILED" }, status);
}
