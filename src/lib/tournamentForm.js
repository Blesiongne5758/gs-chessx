// Pure helpers for the admin "create Swiss tournament" form.
// No browser / Supabase imports so they can be unit-tested with node:test.
import { maxRounds, defaultRounds } from '../../supabase/functions/_shared/swiss.js';

export const LIMITS = {
  nameMin: 3,
  nameMax: 80,
  descriptionMax: 500,
  prizeMax: 80,
  playersMin: 2,
  playersMax: 1024,
  roundsMin: 1,
  roundsMax: 30,
  baseMax: 180, // minutes
  incMax: 180, // seconds
};

export const TIME_PRESETS = [
  { label: 'Bullet 1+0', value: '1+0' },
  { label: 'Blitz 3+2', value: '3+2' },
  { label: 'Blitz 5+3', value: '5+3' },
  { label: 'Rapid 10+0', value: '10+0' },
  { label: 'Rapid 10+5', value: '10+5' },
  { label: 'Rapid 15+10', value: '15+10' },
  { label: 'Classical 30+20', value: '30+20' },
];

export const PLAYER_PRESETS = [8, 16, 32, 64, 128, 256];

export const TIME_CONTROL_RULE = /^(\d{1,3})\+(\d{1,3})$/;

export function parseTimeControl(tc) {
  const m = TIME_CONTROL_RULE.exec(String(tc ?? '').trim());
  if (!m) return null;
  return { base: Number(m[1]), inc: Number(m[2]) };
}

/** Rough minutes for one round: both clocks (40 moves of increment) + 5 min break for pairing. */
export function estimateRoundMinutes(tc) {
  const p = parseTimeControl(tc);
  if (!p) return null;
  return Math.ceil(2 * (p.base + (40 * p.inc) / 60) + 5);
}

/** Planned rounds when `rounds` is null ("otomatis") for a given field size. */
export function plannedRounds(rounds, players) {
  const n = Math.max(2, players);
  return Math.min(rounds || defaultRounds(n), maxRounds(n));
}

export function estimateEnd(startsAt, tc, rounds, players) {
  const per = estimateRoundMinutes(tc);
  const start = startsAt ? new Date(startsAt) : null;
  if (!per || !start || Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + per * plannedRounds(rounds, players) * 60_000);
}

/** `Date` → value for <input type="datetime-local"> in the browser's local time. */
export function toLocalInput(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function emptyForm(now = new Date()) {
  // Default: tomorrow at 19:00 local time
  const start = new Date(now);
  start.setDate(start.getDate() + 1);
  start.setHours(19, 0, 0, 0);
  return {
    name: '',
    description: '',
    time_control: '10+0',
    max_players: 64,
    rounds: null, // null = otomatis
    prize_pool: '',
    starts_at: toLocalInput(start),
    ends_at: '',
    is_pro_only: false,
  };
}

export function formFromTournament(t) {
  return {
    name: t.name ?? '',
    description: t.description ?? '',
    time_control: t.time_control ?? '10+0',
    max_players: t.max_players ?? 64,
    rounds: t.rounds ?? null,
    prize_pool: t.prize_pool ?? '',
    starts_at: toLocalInput(t.starts_at),
    ends_at: toLocalInput(t.ends_at),
    is_pro_only: !!t.is_pro_only,
  };
}

/**
 * Validate form values. Returns `{}` when valid, otherwise `{ field: message }`.
 * @param {object} f form values
 * @param {{ now?: Date, minPlayers?: number }} opts minPlayers = already registered (when editing)
 */
export function validateTournament(f, { now = new Date(), minPlayers = 0 } = {}) {
  const e = {};
  const name = (f.name ?? '').trim();
  if (name.length < LIMITS.nameMin) e.name = `Name must be at least ${LIMITS.nameMin} characters.`;
  else if (name.length > LIMITS.nameMax) e.name = `Name must be at most ${LIMITS.nameMax} characters.`;

  if ((f.description ?? '').length > LIMITS.descriptionMax)
    e.description = `Description must be at most ${LIMITS.descriptionMax} characters.`;
  if ((f.prize_pool ?? '').length > LIMITS.prizeMax) e.prize_pool = `Prize pool must be at most ${LIMITS.prizeMax} characters.`;

  const tc = parseTimeControl(f.time_control);
  if (!tc) e.time_control = 'Time control format must be minutes+seconds, e.g. 10+5.';
  else if (tc.base < 1 || tc.base > LIMITS.baseMax) e.time_control = `Base time must be 1–${LIMITS.baseMax} minutes.`;
  else if (tc.inc > LIMITS.incMax) e.time_control = `Increment must be at most ${LIMITS.incMax} seconds.`;

  const mp = Number(f.max_players);
  if (!Number.isInteger(mp) || mp < LIMITS.playersMin || mp > LIMITS.playersMax)
    e.max_players = `Player quota must be ${LIMITS.playersMin}–${LIMITS.playersMax}.`;
  else if (mp < minPlayers) e.max_players = `${minPlayers} players already registered; quota cannot be smaller.`;

  if (f.rounds !== null && f.rounds !== '' && f.rounds !== undefined) {
    const r = Number(f.rounds);
    if (!Number.isInteger(r) || r < LIMITS.roundsMin || r > LIMITS.roundsMax)
      e.rounds = `Number of rounds must be ${LIMITS.roundsMin}–${LIMITS.roundsMax}.`;
    else if (!e.max_players && r > maxRounds(mp))
      e.rounds = `With a quota of ${mp} players, maximum ${maxRounds(mp)} rounds without rematches.`;
  }

  const start = f.starts_at ? new Date(f.starts_at) : null;
  if (!start || Number.isNaN(start.getTime())) e.starts_at = 'Start time is required.';
  else if (start.getTime() <= now.getTime() + 60_000) e.starts_at = 'Start time must be in the future.';

  if (f.ends_at) {
    const end = new Date(f.ends_at);
    if (Number.isNaN(end.getTime())) e.ends_at = 'Invalid end time.';
    else if (start && !e.starts_at && end <= start) e.ends_at = 'End time must be after start time.';
  }
  return e;
}

/** Form values → row for `public.tournaments` (only client-writable columns). */
export function toTournamentRow(f, players) {
  const start = new Date(f.starts_at);
  const end = f.ends_at ? new Date(f.ends_at) : estimateEnd(start, f.time_control, f.rounds, players ?? f.max_players);
  return {
    name: f.name.trim(),
    description: f.description?.trim() || null,
    format: 'swiss',
    time_control: f.time_control.trim(),
    max_players: Number(f.max_players),
    rounds: f.rounds === null || f.rounds === '' ? null : Number(f.rounds),
    prize_pool: f.prize_pool?.trim() || null,
    starts_at: start.toISOString(),
    ends_at: end ? end.toISOString() : null,
    is_pro_only: !!f.is_pro_only,
  };
}
