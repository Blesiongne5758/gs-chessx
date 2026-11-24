import { supabase } from './supabaseClient';
import { loadGuestProfile } from './profile';
import {
  computeStandings,
  planStart,
  planAdvance,
  validateReport,
  isRoundComplete,
} from '../../supabase/functions/_shared/swiss.js';
import { toTournamentRow } from './tournamentForm';

export const FORMAT_LABEL = { swiss: 'Swiss', knockout: 'Knockout', arena: 'Arena' };
export const FORMAT_DESC = {
  swiss: 'Opponents are paired based on scores each round.',
  knockout: 'Single elimination — lose once and you are out.',
  arena: 'Play as many games as possible within the allotted time.',
};

// ---------------- Demo data (guest mode / Supabase not configured) ----------------
const DEMO_KEY = 'gs-chessx-demo-tournaments-joined';
const DEMO_NAMES = [
  'ChessKing99', 'QueenSlayer', 'KudaHitam', 'BentengDepok', 'PionRebel', 'GM_Nusantara',
  'SkakMatLuh', 'BishopBandung', 'Garuda_Rook', 'AnarchyKnight', 'HolyPaladin', 'Rapid_Rina',
];
const t0 = Date.now();
const H = 3600_000;

function demoPlayers(n, seed, withScores) {
  return Array.from({ length: n }, (_, i) => {
    const name = DEMO_NAMES[(i + seed) % DEMO_NAMES.length] + (i >= DEMO_NAMES.length ? `_${i}` : '');
    const games = withScores ? 3 + ((i * 7 + seed) % 4) : 0;
    const wins = withScores ? Math.max(0, games - ((i + seed) % 4)) : 0;
    const draws = withScores ? (i % 2) : 0;
    const losses = Math.max(0, games - wins - draws);
    return {
      player: { id: `demo-${seed}-${i}`, username: name, avatar_url: null, rating: 2400 - i * 37 - seed * 11 },
      score: wins + draws * 0.5,
      wins,
      draws,
      losses,
      joined_at: new Date(t0 - (n - i) * 60_000).toISOString(),
    };
  });
}

const DEMO = [
  {
    id: 'demo-1', name: 'Holy Kingdom Blitz Arena', format: 'arena', status: 'upcoming', time_control: '3+2',
    max_players: 128, rounds: null, prize_pool: '5,000 Gems', is_pro_only: false,
    description: '60-minute Arena — play as many games as possible, streak wins grant bonus points.',
    starts_at: new Date(t0 + 2.25 * H).toISOString(), ends_at: new Date(t0 + 3.25 * H).toISOString(),
    _players: demoPlayers(12, 0, false),
  },
  {
    id: 'demo-2', name: 'Anarchy Rebellion Swiss', format: 'swiss', status: 'upcoming', time_control: '10+0',
    max_players: 64, rounds: 7, prize_pool: 'Exclusive Skin + 3,000 Gems', is_pro_only: false,
    description: 'Swiss for all skill levels. Opponents each round are paired automatically by score.',
    starts_at: new Date(t0 + 24 * H).toISOString(), ends_at: new Date(t0 + 28 * H).toISOString(),
    _players: demoPlayers(8, 3, false),
  },
  {
    id: 'demo-3', name: 'Grandmaster Knockout', format: 'knockout', status: 'upcoming', time_control: '5+3',
    max_players: 32, rounds: 5, prize_pool: 'Pro 1 Year', is_pro_only: true,
    description: '32-player single elimination. Lose once and you are out.',
    starts_at: new Date(t0 + 72 * H).toISOString(), ends_at: new Date(t0 + 77 * H).toISOString(),
    _players: demoPlayers(5, 5, false),
  },
  {
    id: 'demo-4', name: 'Bullet Mayhem', format: 'arena', status: 'running', time_control: '1+0',
    max_players: 256, rounds: null, prize_pool: '1,000 Gems', is_pro_only: false,
    description: '30-minute bullet arena. Fast, intense, fun.',
    starts_at: new Date(t0 - 10 * 60_000).toISOString(), ends_at: new Date(t0 + 20 * 60_000).toISOString(),
    _players: demoPlayers(12, 1, true),
  },
  {
    id: 'demo-5', name: 'Weekly Rapid Swiss #47', format: 'swiss', status: 'finished', time_control: '10+5',
    max_players: 64, rounds: 5, prize_pool: '2,000 Gems', is_pro_only: false,
    description: 'Weekly 5-round Swiss tournament.',
    starts_at: new Date(t0 - 72 * H).toISOString(), ends_at: new Date(t0 - 69 * H).toISOString(),
    _players: demoPlayers(10, 2, true),
  },
];

// Pre-simulate the finished demo Swiss with the real engine so its pairings and standings agree.
function seededRandom(seed) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

function simulateDemoSwiss(t, seed) {
  const rand = seededRandom(seed);
  const participants = t._players.map((r) => ({ player_id: r.player.id, rating: r.player.rating }));
  const start = planStart({ ...t, status: 'upcoming' }, participants);
  let state = { ...t, ...start.tournamentPatch };
  let pairings = start.newPairings.map((p, i) => ({ ...p, id: `${t.id}-g${i}` }));
  while (state.status === 'running') {
    for (const g of pairings) {
      if (g.result === null) {
        const r = rand();
        g.result = r < 0.42 ? '1-0' : r < 0.67 ? '1/2-1/2' : '0-1';
      }
    }
    const plan = planAdvance(state, participants, pairings);
    if (plan.tournamentPatch) state = { ...state, ...plan.tournamentPatch };
    pairings = [...pairings, ...plan.newPairings.map((p, i) => ({ ...p, id: `${t.id}-g${pairings.length + i}` }))];
  }
  t.status = 'finished';
  t.current_round = state.current_round;
  t.rounds = state.rounds;
  t.winner_id = state.winner_id;
  t._pairings = pairings;
}
simulateDemoSwiss(DEMO.find((d) => d.id === 'demo-5'), 47);

// ---- Demo tournaments created on the admin page (guest mode) ----
const CREATED_KEY = 'gs-chessx-demo-created';

function loadCreated() {
  try {
    return JSON.parse(localStorage.getItem(CREATED_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCreated(list) {
  localStorage.setItem(CREATED_KEY, JSON.stringify(list));
}

/** Built-in demos + admin-created demos, each with `_players` (bots fill created ones). */
function allDemo() {
  const created = loadCreated().map((c) => ({
    ...c,
    _players: demoPlayers(Math.min(c._bots ?? 0, c.max_players), c._seed ?? 7, false).map((r) => ({
      ...r,
      player: { ...r.player, id: `${c.id}-bot-${r.player.id}` },
    })),
  }));
  return [...DEMO, ...created];
}

function findDemo(id) {
  return allDemo().find((d) => d.id === id);
}

// ---- Demo Swiss state (guest acts as tournament director) ----
const SWISS_KEY = 'gs-chessx-demo-swiss';

function loadSwissState() {
  try {
    return JSON.parse(localStorage.getItem(SWISS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveSwissState(all) {
  localStorage.setItem(SWISS_KEY, JSON.stringify(all));
}

function demoMerged(t) {
  const st = loadSwissState()[t.id];
  return st ? { ...t, ...st.patch } : t;
}

function demoPairings(t) {
  return loadSwissState()[t.id]?.pairings || t._pairings || [];
}

function demoPlayerMap(t) {
  const map = new Map(t._players.map((r) => [r.player.id, r.player]));
  if (demoJoined().has(t.id)) {
    const g = loadGuestProfile();
    map.set('guest', { id: 'guest', username: g.username, avatar_url: g.avatar_url, rating: g.rating });
  }
  return map;
}

function demoParticipants(t) {
  return [...demoPlayerMap(t).values()].map((p) => ({ player_id: p.id, rating: p.rating }));
}

function demoJoined() {
  try {
    return new Set(JSON.parse(localStorage.getItem(DEMO_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveDemoJoined(set) {
  localStorage.setItem(DEMO_KEY, JSON.stringify([...set]));
}

function sortStandings(rows) {
  return [...rows].sort(
    (a, b) =>
      b.score - a.score || (b.buchholz ?? 0) - (a.buchholz ?? 0) || (b.player?.rating ?? 0) - (a.player?.rating ?? 0),
  );
}

// ---------------- Public API ----------------

/** Returns tournaments with `player_count` and `joined` (whether the current user is registered). */
export async function fetchTournaments(user) {
  if (user.isGuest) {
    const joined = demoJoined();
    return allDemo().map((d) => {
      // eslint-disable-next-line no-unused-vars
      const { _players, _pairings, _bots, _seed, ...t } = demoMerged(d);
      return { ...t, player_count: _players.length + (joined.has(t.id) ? 1 : 0), joined: joined.has(t.id) };
    });
  }

  const [{ data, error }, { data: mine, error: mineErr }] = await Promise.all([
    supabase.from('tournaments').select('*, tournament_participants(count)').order('starts_at', { ascending: true }),
    supabase.from('tournament_participants').select('tournament_id').eq('player_id', user.id),
  ]);
  if (error) throw error;
  if (mineErr) throw mineErr;

  const joined = new Set((mine || []).map((r) => r.tournament_id));
  return (data || []).map(({ tournament_participants: tp, ...t }) => ({
    ...t,
    player_count: tp?.[0]?.count ?? 0,
    joined: joined.has(t.id),
  }));
}

export async function fetchStandings(user, tournamentId) {
  if (user.isGuest) {
    const t = findDemo(tournamentId);
    if (!t) return [];
    const pairings = demoPairings(t);
    if (t.format === 'swiss' && pairings.length > 0) {
      const players = demoPlayerMap(t);
      return computeStandings(demoParticipants(t), pairings).map((p) => ({
        player: players.get(p.id),
        score: p.score,
        wins: p.wins,
        draws: p.draws,
        losses: p.losses,
        buchholz: p.buchholz,
        joined_at: null,
      }));
    }
    const rows = [...t._players];
    if (demoJoined().has(tournamentId)) {
      const g = loadGuestProfile();
      rows.push({
        player: { id: 'guest', username: g.username, avatar_url: g.avatar_url, rating: g.rating },
        score: 0, wins: 0, draws: 0, losses: 0, joined_at: new Date().toISOString(),
      });
    }
    return sortStandings(rows);
  }

  const { data, error } = await supabase
    .from('tournament_participants')
    .select('score, wins, draws, losses, buchholz, joined_at, player:profiles(id, username, avatar_url, rating)')
    .eq('tournament_id', tournamentId);
  if (error) throw error;
  return sortStandings(data || []);
}

export async function joinTournament(user, tournament) {
  if (tournament.status !== 'upcoming') throw new Error('Pendaftaran sudah ditutup.');
  if (tournament.player_count >= tournament.max_players) throw new Error('Turnamen sudah penuh.');

  if (user.isGuest) {
    if (tournament.is_pro_only) throw new Error('Turnamen ini khusus pemain Pro.');
    const set = demoJoined();
    set.add(tournament.id);
    saveDemoJoined(set);
    return;
  }

  const { error } = await supabase
    .from('tournament_participants')
    .insert({ tournament_id: tournament.id, player_id: user.id });
  if (error) {
    if (error.code === '23505') throw new Error('You are already registered for this tournament.');
    throw new Error(error.message);
  }
}

export async function leaveTournament(user, tournament) {
  if (tournament.status !== 'upcoming') throw new Error('Cannot withdraw after tournament has started.');

  if (user.isGuest) {
    const set = demoJoined();
    set.delete(tournament.id);
    saveDemoJoined(set);
    return;
  }

  const { error } = await supabase
    .from('tournament_participants')
    .delete()
    .eq('tournament_id', tournament.id)
    .eq('player_id', user.id);
  if (error) throw new Error(error.message);
}

/** Subscribe to participant/tournament changes. Returns an unsubscribe function. */
export function subscribeTournaments(user, onChange) {
  if (user.isGuest) return () => {};
  const channel = supabase
    .channel('tournaments-page')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_participants' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_pairings' }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ---------------- Swiss pairing ----------------

const PROFILE_COLS = 'id, username, avatar_url, rating';

/** Pairings for a tournament with `white` / `black` profile objects attached. */
export async function fetchPairings(user, tournamentId) {
  if (user.isGuest) {
    const t = findDemo(tournamentId);
    if (!t) return [];
    const players = demoPlayerMap(t);
    return demoPairings(t)
      .map((p) => ({ ...p, white: players.get(p.white_id), black: p.black_id ? players.get(p.black_id) : null }))
      .sort((a, b) => a.round - b.round || a.board - b.board);
  }
  const { data, error } = await supabase
    .from('tournament_pairings')
    .select(`*, white:profiles!white_id(${PROFILE_COLS}), black:profiles!black_id(${PROFILE_COLS})`)
    .eq('tournament_id', tournamentId)
    .order('round', { ascending: true })
    .order('board', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function invokeSwiss(body) {
  const { data, error } = await supabase.functions.invoke('swiss', { body });
  if (error) {
    let message = error.message;
    try {
      const payload = await error.context.json();
      if (payload?.error) message = payload.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return data;
}

function demoUpdate(t, mutate) {
  const all = loadSwissState();
  const cur = all[t.id] || { patch: {}, pairings: [] };
  const next = mutate(cur);
  all[t.id] = next;
  saveSwissState(all);
  return next;
}

function withIds(t, rows, offset) {
  return rows.map((p, i) => ({ ...p, id: `${t.id}-g${offset + i}` }));
}

/** Close registration and pair round 1. Admin only (guest acts as admin in demo mode). */
export async function startSwiss(user, tournament) {
  if (!user.isGuest) return invokeSwiss({ action: 'start', tournament_id: tournament.id });

  const base = findDemo(tournament.id);
  const merged = demoMerged(base);
  const plan = planStart(merged, demoParticipants(base));
  demoUpdate(base, () => ({ patch: plan.tournamentPatch, pairings: withIds(base, plan.newPairings, 0) }));
  return { round: 1, boards: plan.newPairings.length };
}

function demoApplyResult(base, pairingId, result) {
  const merged = demoMerged(base);
  const pairings = demoPairings(base).map((p) => ({ ...p }));
  const target = pairings.find((p) => p.id === pairingId);
  validateReport(merged, target, result);
  target.result = result;
  const plan = planAdvance(merged, demoParticipants(base), pairings);
  const nextPairings = [...pairings, ...withIds(base, plan.newPairings, pairings.length)];
  demoUpdate(base, (cur) => ({ patch: { ...cur.patch, ...(plan.tournamentPatch || {}) }, pairings: nextPairings }));
  return {
    newRound: plan.newPairings.length > 0,
    finished: plan.tournamentPatch?.status === 'finished',
    round: plan.tournamentPatch?.current_round ?? merged.current_round,
  };
}

/** Record or correct a result; the next round is paired automatically when the round completes. */
export async function reportResult(user, tournament, pairing, result) {
  if (!user.isGuest) return invokeSwiss({ action: 'report', pairing_id: pairing.id, result });
  return demoApplyResult(findDemo(tournament.id), pairing.id, result);
}

/** Demo helper: fill every pending board of the current round with a random result. */
export function demoFillRandomRound(tournament) {
  const base = findDemo(tournament.id);
  const merged = demoMerged(base);
  const pending = demoPairings(base).filter((p) => p.round === merged.current_round && p.result === null);
  let last = null;
  for (const p of pending) {
    const r = Math.random();
    last = demoApplyResult(base, p.id, r < 0.42 ? '1-0' : r < 0.67 ? '1/2-1/2' : '0-1');
  }
  return last;
}

/** Demo helper: undo everything done to a demo Swiss tournament. */
export function demoResetSwiss(tournament) {
  const all = loadSwissState();
  delete all[tournament.id];
  saveSwissState(all);
}

export { isRoundComplete };

// ---------------- Admin: create / edit / delete ----------------

function friendlyDbError(error) {
  const msg = error?.message || 'Failed to save tournament.';
  if (error?.code === '42501' || /row-level security|permission denied/i.test(msg))
    return new Error('Only administrators can manage tournaments, and only before tournament begins.');
  if (/tournaments_name_len/.test(msg)) return new Error('Tournament name must be 3–80 characters.');
  if (/tournaments_time_control_fmt/.test(msg)) return new Error('Time control format must be minutes+seconds, e.g. 10+5.');
  if (/tournaments_rounds_range/.test(msg)) return new Error('Number of rounds must be 1–30.');
  if (/tournaments_ends_after_start/.test(msg)) return new Error('End time must be after start time.');
  return new Error(msg);
}

/**
 * Create a Swiss tournament. `demo.bots` = sample players added in guest mode so it can be tried.
 * @returns the created tournament row
 */
export async function createTournament(user, form, { bots = 0 } = {}) {
  const row = toTournamentRow(form);
  if (user.isGuest) {
    const list = loadCreated();
    const t = {
      ...row,
      id: `demo-new-${Date.now().toString(36)}`,
      status: 'upcoming',
      current_round: 0,
      winner_id: null,
      created_at: new Date().toISOString(),
      _bots: Math.max(0, Math.min(Number(bots) || 0, row.max_players - 1)),
      _seed: list.length + 4,
    };
    saveCreated([...list, t]);
    return t;
  }
  const { data, error } = await supabase.from('tournaments').insert(row).select().single();
  if (error) throw friendlyDbError(error);
  return data;
}

export async function updateTournament(user, tournament, form) {
  if (tournament.status !== 'upcoming') throw new Error('Tournaments that have already started cannot be edited.');
  // Keep the auto-estimated end aligned with the current field size.
  const row = toTournamentRow(form, Math.max(2, tournament.player_count || form.max_players));
  // eslint-disable-next-line no-unused-vars
  const { format, ...patch } = row;
  if (user.isGuest) {
    const list = loadCreated();
    const i = list.findIndex((c) => c.id === tournament.id);
    if (i < 0) throw new Error('Built-in sample tournaments cannot be edited.');
    list[i] = { ...list[i], ...patch };
    saveCreated(list);
    return list[i];
  }
  const { data, error } = await supabase
    .from('tournaments')
    .update(patch)
    .eq('id', tournament.id)
    .eq('status', 'upcoming')
    .select()
    .maybeSingle();
  if (error) throw friendlyDbError(error);
  if (!data) throw new Error('Tournament has already started or you are not an administrator.');
  return data;
}

export async function deleteTournament(user, tournament) {
  if (tournament.status !== 'upcoming') throw new Error('Tournaments that have already started cannot be deleted.');
  if (user.isGuest) {
    const list = loadCreated();
    if (!list.some((c) => c.id === tournament.id)) throw new Error('Built-in sample tournaments cannot be deleted.');
    saveCreated(list.filter((c) => c.id !== tournament.id));
    demoResetSwiss(tournament);
    const joined = demoJoined();
    joined.delete(tournament.id);
    saveDemoJoined(joined);
    return;
  }
  const { data, error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', tournament.id)
    .eq('status', 'upcoming')
    .select('id');
  if (error) throw friendlyDbError(error);
  if (!data?.length) throw new Error('Turnamen sudah dimulai atau Anda bukan admin.');
}

/** Whether a demo tournament was created on the admin page (and so is editable). */
export function isDemoCreated(t) {
  return typeof t.id === 'string' && t.id.startsWith('demo-new-');
}

// ---------------- Formatting helpers ----------------
export function formatCountdown(ms) {
  if (ms <= 0) return 'Segera dimulai';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d} hari ${h} jam`;
  if (h > 0) return `${h} jam ${m} mnt`;
  return `${m} mnt ${sec} dtk`;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}
