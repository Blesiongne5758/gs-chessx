import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTournament,
  toTournamentRow,
  parseTimeControl,
  estimateRoundMinutes,
  estimateEnd,
  plannedRounds,
  emptyForm,
  formFromTournament,
  toLocalInput,
} from '../src/lib/tournamentForm.js';

const NOW = new Date('2026-11-20T12:00:00');
const valid = () => ({ ...emptyForm(NOW), name: 'Depok Rapid Swiss' });

test('default form + name is valid', () => {
  assert.deepEqual(validateTournament(valid(), { now: NOW }), {});
});

test('name rules', () => {
  assert.ok(validateTournament({ ...valid(), name: '  ab ' }, { now: NOW }).name);
  assert.ok(validateTournament({ ...valid(), name: 'x'.repeat(81) }, { now: NOW }).name);
});

test('time control format', () => {
  for (const tc of ['10', '10+', '+5', 'a+b', '10 + 5', '0+5', '181+0', '10+181'])
    assert.ok(validateTournament({ ...valid(), time_control: tc }, { now: NOW }).time_control, tc);
  for (const tc of ['1+0', '3+2', '10+5', '180+180']) assert.equal(validateTournament({ ...valid(), time_control: tc }, { now: NOW }).time_control, undefined, tc);
  assert.deepEqual(parseTimeControl('15+10'), { base: 15, inc: 10 });
});

test('player quota and registered minimum', () => {
  assert.ok(validateTournament({ ...valid(), max_players: 1 }, { now: NOW }).max_players);
  assert.ok(validateTournament({ ...valid(), max_players: 2000 }, { now: NOW }).max_players);
  assert.ok(validateTournament({ ...valid(), max_players: 12.5 }, { now: NOW }).max_players);
  assert.match(validateTournament({ ...valid(), max_players: 8 }, { now: NOW, minPlayers: 10 }).max_players, /10 pemain/);
});

test('rounds: null = auto, capped by maxRounds of the quota', () => {
  assert.equal(validateTournament({ ...valid(), rounds: null }, { now: NOW }).rounds, undefined);
  assert.ok(validateTournament({ ...valid(), rounds: 0 }, { now: NOW }).rounds);
  assert.ok(validateTournament({ ...valid(), rounds: 31 }, { now: NOW }).rounds);
  // 8 players → max 5 rounds
  assert.equal(validateTournament({ ...valid(), max_players: 8, rounds: 5 }, { now: NOW }).rounds, undefined);
  assert.match(validateTournament({ ...valid(), max_players: 8, rounds: 6 }, { now: NOW }).rounds, /maksimal 5/);
  assert.equal(plannedRounds(null, 64), 6);
  assert.equal(plannedRounds(null, 5), 3);
  assert.equal(plannedRounds(9, 8), 5);
});

test('start must be in the future, end after start', () => {
  assert.ok(validateTournament({ ...valid(), starts_at: '' }, { now: NOW }).starts_at);
  assert.ok(validateTournament({ ...valid(), starts_at: '2026-11-20T11:00' }, { now: NOW }).starts_at);
  assert.ok(validateTournament({ ...valid(), starts_at: '2026-11-21T19:00', ends_at: '2026-11-21T18:00' }, { now: NOW }).ends_at);
  assert.equal(validateTournament({ ...valid(), starts_at: '2026-11-21T19:00', ends_at: '2026-11-21T23:00' }, { now: NOW }).ends_at, undefined);
});

test('estimates', () => {
  assert.equal(estimateRoundMinutes('10+0'), 25);
  assert.equal(estimateRoundMinutes('3+2'), 14); // 2*(3+1.33)+5 = 13.67
  const end = estimateEnd('2026-11-21T19:00', '10+0', null, 16); // 4 rounds × 25
  assert.equal(toLocalInput(end), '2026-11-21T20:40');
});

test('toTournamentRow: trims, nulls empties, auto end, swiss format', () => {
  const row = toTournamentRow({ ...valid(), name: '  Swiss X ', description: '   ', prize_pool: '', starts_at: '2026-11-21T19:00', max_players: 16 });
  assert.equal(row.name, 'Swiss X');
  assert.equal(row.description, null);
  assert.equal(row.prize_pool, null);
  assert.equal(row.format, 'swiss');
  assert.equal(row.rounds, null);
  assert.equal(new Date(row.ends_at) - new Date(row.starts_at), 4 * 25 * 60_000);
  assert.deepEqual(Object.keys(row).sort(), ['description', 'ends_at', 'format', 'is_pro_only', 'max_players', 'name', 'prize_pool', 'rounds', 'starts_at', 'time_control']);
});

test('formFromTournament round-trips', () => {
  const t = { name: 'A b c', time_control: '5+3', max_players: 32, rounds: 5, starts_at: '2026-11-22T12:00:00.000Z', ends_at: null, is_pro_only: true };
  const f = formFromTournament(t);
  const row = toTournamentRow(f);
  assert.equal(row.rounds, 5);
  assert.equal(row.is_pro_only, true);
  assert.equal(row.starts_at, '2026-11-22T12:00:00.000Z');
});
