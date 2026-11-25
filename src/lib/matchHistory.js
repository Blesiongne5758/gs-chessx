/**
 * GS-ChessX — Match History Service
 * Saves and retrieves competitive and friendly match history,
 * with Supabase persistence and localStorage mirroring.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_PREFIX = 'gs_chessx_matches_';

export function getLocalMatches(userId = 'guest') {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalMatch(userId = 'guest', match) {
  try {
    const current = getLocalMatches(userId);
    const updated = [match, ...current.filter((m) => m.id !== match.id)].slice(0, 50);
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Saves a completed match to Supabase games table and local storage.
 */
export async function recordMatchHistory({
  id = crypto.randomUUID(),
  user,
  opponent,
  playerColor = 'w',
  result = '1/2-1/2', // '1-0' | '0-1' | '1/2-1/2' | custom text
  outcome = 'draw', // 'win' | 'loss' | 'draw'
  pgn = '',
  fen = '',
  timeControl = 'Rapid (10+0)',
  movesCount = 0,
  ratingBefore = 1200,
  ratingAfter = 1200,
  ratingDelta = 0,
  isAi = false,
}) {
  const isWhite = playerColor === 'w';
  const whiteName = isWhite ? (user?.user_metadata?.username || user?.username || 'Player') : (opponent?.username || 'Opponent');
  const blackName = !isWhite ? (user?.user_metadata?.username || user?.username || 'Player') : (opponent?.username || 'Opponent');

  const matchRecord = {
    id,
    white_id: isWhite ? user?.id : opponent?.id,
    black_id: !isWhite ? user?.id : opponent?.id,
    white_name: whiteName,
    black_name: blackName,
    player_color: playerColor,
    time_control: typeof timeControl === 'object' ? timeControl.label : timeControl,
    result,
    outcome,
    pgn,
    fen,
    moves_count: movesCount,
    rating_before: ratingBefore,
    rating_after: ratingAfter,
    rating_delta: ratingDelta,
    is_ai: isAi,
    created_at: new Date().toISOString(),
  };

  // Always mirror in localStorage for instant access
  const userId = user?.id || 'guest';
  saveLocalMatch(userId, matchRecord);

  // If Supabase is available and not guest / not AI, save to games table
  if (isSupabaseConfigured && user?.id && !user?.isGuest && !isAi) {
    try {
      const cleanResult = result.includes('1-0')
        ? '1-0'
        : result.includes('0-1')
        ? '0-1'
        : result.includes('1/2')
        ? '1/2-1/2'
        : null;

      await supabase.from('games').upsert({
        id,
        white_id: isWhite ? user.id : opponent?.id || null,
        black_id: !isWhite ? user.id : opponent?.id || null,
        time_control: typeof timeControl === 'object' ? timeControl.label : timeControl,
        fen: fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        pgn: pgn || '',
        status: 'finished',
        result: cleanResult,
      });
    } catch {
      // Non-blocking: local mirror ensures UX continues smoothly
    }
  }

  return matchRecord;
}

/**
 * Fetches match history for a user, combining remote and local records.
 */
export async function fetchUserMatchHistory(user) {
  const userId = user?.id || 'guest';
  const localList = getLocalMatches(userId);

  if (!isSupabaseConfigured || !user?.id || user?.isGuest) {
    return localList;
  }

  try {
    const { data, error } = await supabase
      .from('games')
      .select('id, white_id, black_id, time_control, fen, pgn, status, result, created_at, white:profiles!white_id(username, avatar_url, rating), black:profiles!black_id(username, avatar_url, rating)')
      .or(`white_id.eq.${user.id},black_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data) return localList;

    const remoteRecords = data.map((g) => {
      const isWhite = g.white_id === user.id;
      let outcome = 'draw';
      if (g.result === '1-0') outcome = isWhite ? 'win' : 'loss';
      else if (g.result === '0-1') outcome = isWhite ? 'loss' : 'win';

      return {
        id: g.id,
        white_id: g.white_id,
        black_id: g.black_id,
        white_name: g.white?.username || 'White',
        black_name: g.black?.username || 'Black',
        white_avatar: g.white?.avatar_url,
        black_avatar: g.black?.avatar_url,
        player_color: isWhite ? 'w' : 'b',
        time_control: g.time_control,
        result: g.result || 'Finished',
        outcome,
        pgn: g.pgn,
        fen: g.fen,
        created_at: g.created_at,
      };
    });

    // Merge remote with local (avoiding duplicates)
    const remoteIds = new Set(remoteRecords.map((r) => r.id));
    const merged = [...remoteRecords, ...localList.filter((m) => !remoteIds.has(m.id))];
    merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return merged;
  } catch {
    return localList;
  }
}

/**
 * Triggers a client-side download of a PGN file.
 */
export function downloadPgn(match) {
  const pgnContent = match.pgn || '';
  if (!pgnContent) return;
  const filename = `GS-ChessX_${match.white_name || 'White'}_vs_${match.black_name || 'Black'}_${match.id?.slice(0, 8)}.pgn`;
  const blob = new Blob([pgnContent], { type: 'application/x-chess-pgn' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
