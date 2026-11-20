// GS-ChessX — Swiss pairing engine (pure JavaScript, no dependencies).
//
// Shared by the Supabase Edge Function (supabase/functions/swiss) and the
// browser (guest/demo mode), so both use exactly the same rules.
//
// Pairing rules (simplified FIDE Dutch system):
//   1. Players are ranked by score, then rating.
//   2. Players never meet the same opponent twice.
//   3. Within a score group the top half plays the bottom half (1 vs n/2+1, ...).
//      If a group can't be paired, players "float" to the nearest score group.
//   4. Colors: nobody gets the same color three times in a row and the
//      white/black difference never exceeds 2. Otherwise colors alternate,
//      and when both players want the same color the higher-ranked player gets it.
//   5. With an odd number of players, the lowest-ranked player who hasn't had
//      a bye yet gets a bye worth BYE_POINTS.
// If the strict rules make a round impossible (tiny fields, late rounds), the
// color rule is relaxed first, then rematches are allowed as a last resort.

export const BYE_POINTS = 1;
export const RESULTS = ['1-0', '0-1', '1/2-1/2'];
const SEARCH_BUDGET = 200000;

// ---------------------------------------------------------------- standings

/**
 * Build per-player stats from pairings.
 * @param {{player_id: string, rating?: number, withdrawn?: boolean}[]} participants
 * @param {{round: number, white_id: string, black_id: string|null, result: string|null}[]} pairings
 * @returns {object[]} players sorted by score, Buchholz, rating
 */
export function computeStandings(participants, pairings) {
  const map = new Map();
  for (const p of participants) {
    map.set(p.player_id, {
      id: p.player_id,
      rating: p.rating ?? 1200,
      withdrawn: !!p.withdrawn,
      score: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      buchholz: 0,
      colors: [],
      opponents: new Set(),
      hadBye: false,
    });
  }

  const ordered = [...pairings].sort((a, b) => a.round - b.round || (a.board ?? 0) - (b.board ?? 0));
  for (const g of ordered) {
    const w = map.get(g.white_id);
    const b = g.black_id ? map.get(g.black_id) : null;
    if (!g.black_id) {
      if (w) {
        w.hadBye = true;
        if (g.result === 'bye') w.score += BYE_POINTS;
      }
      continue;
    }
    if (w) {
      w.colors.push('w');
      w.opponents.add(g.black_id);
    }
    if (b) {
      b.colors.push('b');
      b.opponents.add(g.white_id);
    }
    if (g.result === '1-0') {
      if (w) { w.score += 1; w.wins += 1; }
      if (b) b.losses += 1;
    } else if (g.result === '0-1') {
      if (b) { b.score += 1; b.wins += 1; }
      if (w) w.losses += 1;
    } else if (g.result === '1/2-1/2') {
      if (w) { w.score += 0.5; w.draws += 1; }
      if (b) { b.score += 0.5; b.draws += 1; }
    }
  }

  for (const p of map.values()) {
    let bh = 0;
    for (const o of p.opponents) bh += map.get(o)?.score ?? 0;
    p.buchholz = bh;
  }

  return [...map.values()].sort(compareRank);
}

function compareRank(a, b) {
  return b.score - a.score || b.buchholz - a.buchholz || b.rating - a.rating || (a.id < b.id ? -1 : 1);
}

// Pairing order ignores Buchholz (only score, then rating) like the Dutch system.
function comparePairingOrder(a, b) {
  return b.score - a.score || b.rating - a.rating || (a.id < b.id ? -1 : 1);
}

// ---------------------------------------------------------------- colors

function colorDiff(p) {
  let d = 0;
  for (const c of p.colors) d += c === 'w' ? 1 : -1;
  return d; // whites - blacks
}

/** 'w' | 'b' | null — a color the player MUST get (absolute rule). */
function mustColor(p) {
  const d = colorDiff(p);
  const n = p.colors.length;
  const last2 = n >= 2 && p.colors[n - 1] === p.colors[n - 2] ? p.colors[n - 1] : null;
  if (d >= 2 || last2 === 'w') return 'b';
  if (d <= -2 || last2 === 'b') return 'w';
  return null;
}

/** Positive = wants white, negative = wants black, 0 = no preference. */
function whitePreference(p) {
  const last = p.colors[p.colors.length - 1];
  return -colorDiff(p) * 2 + (last === 'b' ? 1 : last === 'w' ? -1 : 0);
}

function colorsClash(a, b) {
  const ma = mustColor(a);
  return ma !== null && ma === mustColor(b);
}

function colorPenalty(a, b) {
  const pa = whitePreference(a);
  const pb = whitePreference(b);
  return pa !== 0 && Math.sign(pa) === Math.sign(pb) ? 1 : 0;
}

/** Decide colors for a pair. `a` is the higher-ranked player. */
function allocateColors(a, b, board) {
  const ma = mustColor(a);
  const mb = mustColor(b);
  if (ma) return ma === 'w' ? [a, b] : [b, a];
  if (mb) return mb === 'w' ? [b, a] : [a, b];
  const pa = whitePreference(a);
  const pb = whitePreference(b);
  if (pa > pb) return [a, b];
  if (pb > pa) return [b, a];
  if (pa !== 0) return pa > 0 ? [a, b] : [b, a]; // same wish: higher-ranked gets it
  return board % 2 === 1 ? [a, b] : [b, a]; // no history: alternate by board
}

// ---------------------------------------------------------------- matching

function tryMatch(pool, { allowRematch, enforceColors }, accept = null) {
  let budget = SEARCH_BUDGET;

  function dfs(unpaired, acc) {
    if (unpaired.length === 0) return !accept || accept(acc) ? acc : null;
    if (--budget <= 0) return null;

    const [p, ...rest] = unpaired;
    const group = rest.filter((q) => q.score === p.score);
    const ideal = Math.floor((group.length + 1) / 2) - 1; // Dutch: top half vs bottom half

    const candidates = rest
      .filter((q) => (allowRematch || !p.opponents.has(q.id)) && (!enforceColors || !colorsClash(p, q)))
      .map((q) => {
        const gi = group.indexOf(q);
        return {
          q,
          key: [
            Math.abs(p.score - q.score),
            allowRematch && p.opponents.has(q.id) ? 1 : 0,
            colorPenalty(p, q),
            gi >= 0 ? Math.abs(gi - ideal) : 0,
            rest.indexOf(q),
          ],
        };
      })
      .sort((x, y) => {
        for (let i = 0; i < x.key.length; i++) if (x.key[i] !== y.key[i]) return x.key[i] - y.key[i];
        return 0;
      });

    for (const { q } of candidates) {
      const res = dfs(
        rest.filter((r) => r !== q),
        [...acc, [p, q]],
      );
      if (res) return res;
      if (budget <= 0) return null;
    }
    return null;
  }

  return dfs(pool, []);
}

// ---------------------------------------------------------------- lookahead
// Greedy round-by-round pairing can paint itself into a corner in small fields
// (e.g. 6 players / 5 rounds), where a later round has no rematch-free pairing.
// Before accepting a round we check that the remaining rounds can still be
// scheduled without rematches (and without second byes). Bounded search: if the
// budget runs out we optimistically accept.
const LOOKAHEAD_MAX_PLAYERS = 24;
const LOOKAHEAD_BUDGET = 20000;

const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

function mustFromColors(colors) {
  return mustColor({ colors });
}

function canScheduleRest(ids, played, byeHad, colorsById, roundsLeft) {
  let budget = LOOKAHEAD_BUDGET;

  function schedule(k, playedSet, byes, colors) {
    if (k === 0) return true;
    const odd = ids.length % 2 === 1;
    const byeOptions = odd ? ids.filter((id) => !byes.has(id)) : [null];
    for (const bye of byeOptions) {
      const pool = bye ? ids.filter((id) => id !== bye) : ids;
      const nextByes = bye ? new Set([...byes, bye]) : byes;
      const ok = match(pool, playedSet, colors, (pairs, nextColors) => {
        const np = new Set(playedSet);
        for (const [a, b] of pairs) np.add(pairKey(a, b));
        return schedule(k - 1, np, nextByes, nextColors);
      });
      if (ok || budget <= 0) return true; // budget exhausted: assume feasible
    }
    return false;
  }

  // Find a rematch-free perfect matching that also respects the absolute color rules.
  function match(pool, playedSet, colors, onComplete, acc = [], next = colors) {
    if (pool.length === 0) return onComplete(acc, next);
    if (--budget <= 0) return true;
    const [a, ...rest] = pool;
    const ma = mustFromColors(colors.get(a));
    for (const b of rest) {
      if (playedSet.has(pairKey(a, b))) continue;
      const mb = mustFromColors(colors.get(b));
      for (const aWhite of [true, false]) {
        if ((aWhite && (ma === 'b' || mb === 'w')) || (!aWhite && (ma === 'w' || mb === 'b'))) continue;
        const nc = new Map(next);
        nc.set(a, [...colors.get(a), aWhite ? 'w' : 'b']);
        nc.set(b, [...colors.get(b), aWhite ? 'b' : 'w']);
        if (match(rest.filter((x) => x !== b), playedSet, colors, onComplete, [...acc, [a, b]], nc)) return true;
        if (budget <= 0) return true;
      }
    }
    return false;
  }

  return schedule(roundsLeft, played, byeHad, colorsById);
}

function makeLookahead(active, byePlayer, roundsLeft) {
  if (!roundsLeft || active.length > LOOKAHEAD_MAX_PLAYERS) return null;
  const ids = active.map((p) => p.id);
  const basePlayed = new Set();
  const byeHad = new Set();
  for (const p of active) {
    for (const o of p.opponents) basePlayed.add(pairKey(p.id, o));
    if (p.hadBye) byeHad.add(p.id);
  }
  if (byePlayer) byeHad.add(byePlayer.id);
  return (pairs) => {
    const played = new Set(basePlayed);
    const colors = new Map(active.map((p) => [p.id, p.colors]));
    for (const [a, b] of pairs) {
      played.add(pairKey(a.id, b.id));
      // Same color rule the real allocation uses (board parity only matters with no history).
      const [w, bl] = allocateColors(a, b, 1);
      colors.set(w.id, [...w.colors, 'w']);
      colors.set(bl.id, [...bl.colors, 'b']);
    }
    return canScheduleRest(ids, played, byeHad, colors, roundsLeft);
  };
}

const LEVELS = [
  { allowRematch: false, enforceColors: true, lookahead: true },
  { allowRematch: false, enforceColors: false, lookahead: true },
  { allowRematch: false, enforceColors: false, lookahead: false },
  { allowRematch: true, enforceColors: false, lookahead: false },
];

/**
 * Pair one round.
 * @param {object[]} standings output of computeStandings()
 * @param {{roundsLeft?: number}} [opts] rounds still to be played AFTER this one (enables lookahead)
 * @returns {{board: number, white_id: string, black_id: string|null, result: string|null}[]}
 */
export function pairRound(standings, { roundsLeft = 0 } = {}) {
  const active = standings.filter((p) => !p.withdrawn).sort(comparePairingOrder);
  if (active.length < 2) throw new Error('Minimal 2 pemain untuk membuat pairing.');

  for (const level of LEVELS) {
    let byePlayer = null;
    let pairs = null;

    if (active.length % 2 === 1) {
      // Lowest-ranked first; players who already had a bye are tried last.
      const byeOrder = [...active].reverse().sort((a, b) => Number(a.hadBye) - Number(b.hadBye));
      for (const cand of byeOrder) {
        if (cand.hadBye && !level.allowRematch) continue; // a 2nd bye only as last resort
        const pool = active.filter((p) => p !== cand);
        pairs = tryMatch(pool, level, level.lookahead ? makeLookahead(active, cand, roundsLeft) : null);
        if (pairs) {
          byePlayer = cand;
          break;
        }
      }
    } else {
      pairs = tryMatch(active, level, level.lookahead ? makeLookahead(active, null, roundsLeft) : null);
    }

    if (pairs) return buildBoards(pairs, byePlayer, active);
  }
  throw new Error('Pairing tidak dapat dibuat.');
}

function buildBoards(pairs, byePlayer, ranked) {
  const rank = new Map(ranked.map((p, i) => [p.id, i]));
  const ordered = pairs
    .map(([x, y]) => (rank.get(x.id) < rank.get(y.id) ? [x, y] : [y, x]))
    .sort(([a1, b1], [a2, b2]) => Math.max(a2.score, b2.score) - Math.max(a1.score, b1.score) || rank.get(a1.id) - rank.get(a2.id));

  const boards = ordered.map(([a, b], i) => {
    const [white, black] = allocateColors(a, b, i + 1);
    return { board: i + 1, white_id: white.id, black_id: black.id, result: null };
  });
  if (byePlayer) boards.push({ board: boards.length + 1, white_id: byePlayer.id, black_id: null, result: 'bye' });
  return boards;
}

// ---------------------------------------------------------------- tournament flow

/**
 * Most rounds a Swiss can schedule for this field while keeping every rule
 * (no rematches, color limits). Determined empirically with 200 random
 * tournaments per field size (see tests/swiss.test.js):
 *   ≤ 7 players  → full round-robin length (n-1)
 *   8–24 players → n-3 (near round-robin lengths occasionally dead-end)
 *   > 24 players → ceil(log2 n) + 4 (lookahead is disabled for big fields; real
 *                  Swiss events use ~log2(n) + 2 rounds anyway)
 */
export function maxRounds(playerCount) {
  const n = playerCount;
  if (n <= 7) return Math.max(1, n - 1);
  if (n <= LOOKAHEAD_MAX_PLAYERS) return n - 3;
  return Math.ceil(Math.log2(n)) + 4;
}

export function defaultRounds(playerCount) {
  return Math.max(1, Math.ceil(Math.log2(Math.max(2, playerCount))));
}

export function isRoundComplete(pairings, round) {
  const games = pairings.filter((p) => p.round === round);
  return games.length > 0 && games.every((p) => p.result !== null && p.result !== undefined);
}

function statsRows(standings) {
  return standings.map((p) => ({
    player_id: p.id,
    score: p.score,
    wins: p.wins,
    draws: p.draws,
    losses: p.losses,
    buchholz: p.buchholz,
  }));
}

/**
 * Plan the start of a Swiss tournament (round 1).
 * @returns {{tournamentPatch: object, newPairings: object[], participantStats: object[]}}
 */
export function planStart(tournament, participants) {
  if (tournament.format !== 'swiss') throw new Error('Hanya turnamen Swiss yang memakai pairing otomatis.');
  if (tournament.status !== 'upcoming') throw new Error('Turnamen sudah dimulai.');
  const active = participants.filter((p) => !p.withdrawn);
  if (active.length < 2) throw new Error('Minimal 2 peserta untuk memulai turnamen.');

  // A Swiss can't schedule more rounds than a round-robin without rematches.
  const rounds = Math.min(tournament.rounds || defaultRounds(active.length), maxRounds(active.length));
  const standings = computeStandings(participants, []);
  const newPairings = pairRound(standings, { roundsLeft: rounds - 1 }).map((p) => ({ ...p, round: 1 }));
  return {
    tournamentPatch: { status: 'running', current_round: 1, rounds },
    newPairings,
    participantStats: statsRows(computeStandings(participants, newPairings)),
  };
}

/**
 * After a result changes: recompute stats and, if the current round is complete,
 * pair the next round or finish the tournament.
 */
export function planAdvance(tournament, participants, pairings) {
  const round = tournament.current_round || 0;
  const plan = { tournamentPatch: null, newPairings: [], participantStats: [] };

  if (tournament.status === 'running' && isRoundComplete(pairings, round)) {
    if (round >= (tournament.rounds || 0)) {
      const final = computeStandings(participants, pairings);
      plan.tournamentPatch = { status: 'finished', winner_id: final[0]?.id ?? null };
    } else {
      const standings = computeStandings(participants, pairings);
      plan.newPairings = pairRound(standings, { roundsLeft: tournament.rounds - (round + 1) }).map((p) => ({
        ...p,
        round: round + 1,
      }));
      plan.tournamentPatch = { current_round: round + 1 };
    }
  }

  plan.participantStats = statsRows(computeStandings(participants, [...pairings, ...plan.newPairings]));
  return plan;
}

/** Validate a result report. Throws with a user-facing message. */
export function validateReport(tournament, pairing, result) {
  if (!RESULTS.includes(result)) throw new Error('Hasil tidak valid.');
  if (!pairing) throw new Error('Pairing tidak ditemukan.');
  if (tournament.status !== 'running') throw new Error('Turnamen tidak sedang berlangsung.');
  if (!pairing.black_id) throw new Error('Bye tidak memerlukan hasil.');
  if (pairing.round !== tournament.current_round) throw new Error('Hanya hasil ronde berjalan yang bisa diubah.');
}
