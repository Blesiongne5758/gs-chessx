import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeStandings,
  pairRound,
  planStart,
  planAdvance,
  validateReport,
  isRoundComplete,
  maxRounds,
} from '../supabase/functions/_shared/swiss.js';

function rng(seed) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

function makePlayers(n) {
  return Array.from({ length: n }, (_, i) => ({ player_id: `p${String(i + 1).padStart(2, '0')}`, rating: 2400 - i * 25 }));
}

/** Run a full tournament with random results; return state. */
function simulate(n, rounds, seed) {
  const rand = rng(seed);
  const participants = makePlayers(n);
  let t = { format: 'swiss', status: 'upcoming', rounds, current_round: 0 };
  const start = planStart(t, participants);
  t = { ...t, ...start.tournamentPatch };
  let pairings = start.newPairings.map((p, i) => ({ ...p, id: `g${i}` }));
  let guard = 0;
  while (t.status === 'running' && guard++ < 100) {
    for (const g of pairings.filter((p) => p.round === t.current_round && p.result === null)) {
      validateReport(t, g, '1-0');
      const r = rand();
      // higher rated wins more often
      const wr = participants.find((p) => p.player_id === g.white_id).rating;
      const br = participants.find((p) => p.player_id === g.black_id).rating;
      const pWhite = 0.4 + (wr - br) / 2000;
      g.result = r < pWhite ? '1-0' : r < pWhite + 0.25 ? '1/2-1/2' : '0-1';
    }
    const plan = planAdvance(t, participants, pairings);
    if (plan.tournamentPatch) t = { ...t, ...plan.tournamentPatch };
    pairings = [...pairings, ...plan.newPairings.map((p, i) => ({ ...p, id: `g${pairings.length + i}` }))];
  }
  return { t, pairings, participants };
}

test('round 1 is top half vs bottom half with alternating colors', () => {
  const s = computeStandings(makePlayers(8), []);
  const boards = pairRound(s);
  const pairs = boards.map((b) => [b.white_id, b.black_id].sort().join('-'));
  assert.deepEqual(pairs, ['p01-p05', 'p02-p06', 'p03-p07', 'p04-p08']);
  assert.equal(boards[0].white_id, 'p01');
  assert.equal(boards[1].white_id, 'p06');
  assert.equal(boards[2].white_id, 'p03');
});

test('odd field: lowest-ranked player gets a bye worth 1 point', () => {
  const parts = makePlayers(5);
  const plan = planStart({ format: 'swiss', status: 'upcoming', rounds: 3 }, parts);
  const bye = plan.newPairings.find((p) => p.black_id === null);
  assert.equal(bye.white_id, 'p05');
  assert.equal(bye.result, 'bye');
  assert.equal(plan.participantStats.find((s) => s.player_id === 'p05').score, 1);
});

test('rejects non-swiss, started, or too-small tournaments', () => {
  assert.throws(() => planStart({ format: 'arena', status: 'upcoming' }, makePlayers(4)), /Swiss/);
  assert.throws(() => planStart({ format: 'swiss', status: 'running' }, makePlayers(4)), /dimulai/);
  assert.throws(() => planStart({ format: 'swiss', status: 'upcoming' }, makePlayers(1)), /Minimal 2/);
});

test('validateReport guards', () => {
  const t = { status: 'running', current_round: 2 };
  assert.throws(() => validateReport(t, { round: 2, black_id: 'x' }, '2-0'), /tidak valid/);
  assert.throws(() => validateReport(t, { round: 1, black_id: 'x' }, '1-0'), /ronde berjalan/);
  assert.throws(() => validateReport(t, { round: 2, black_id: null }, '1-0'), /Bye/);
  assert.throws(() => validateReport({ ...t, status: 'finished' }, { round: 2, black_id: 'x' }, '1-0'), /tidak sedang/);
});

test('does not advance until the round is complete', () => {
  const parts = makePlayers(4);
  let t = { format: 'swiss', status: 'upcoming', rounds: 3 };
  const s = planStart(t, parts);
  t = { ...t, ...s.tournamentPatch };
  const pairings = s.newPairings;
  pairings[0].result = '1-0';
  const plan = planAdvance(t, parts, pairings);
  assert.equal(plan.newPairings.length, 0);
  assert.equal(plan.tournamentPatch, null);
  assert.equal(isRoundComplete(pairings, 1), false);
});

for (const [n, rounds] of [[2, 3], [3, 5], [4, 3], [5, 5], [6, 5], [7, 5], [7, 6], [8, 5], [8, 7], [9, 5], [10, 9], [11, 9], [12, 11], [13, 12], [14, 13], [18, 17], [24, 21], [26, 9], [40, 10], [64, 10], [127, 11], [256, 12], [16, 7], [21, 7], [32, 7], [64, 9]]) {
  test(`full simulation: ${n} players, ${rounds} rounds — invariants hold over ${n > 64 ? 30 : 200} seeds`, () => {
    for (let seed = 1; seed <= (n > 64 ? 30 : 200); seed++) {
      const { t, pairings, participants } = simulate(n, rounds, seed);
      assert.equal(t.status, 'finished', 'tournament finishes');
      const expectedRounds = Math.min(rounds, maxRounds(n));
      assert.equal(t.current_round, expectedRounds);

      const met = new Set();
      const colors = new Map(participants.map((p) => [p.player_id, []]));
      const byes = new Map();
      for (let r = 1; r <= expectedRounds; r++) {
        const games = pairings.filter((p) => p.round === r);
        const seen = new Set();
        for (const g of games) {
          for (const id of [g.white_id, g.black_id].filter(Boolean)) {
            assert.ok(!seen.has(id), `round ${r}: ${id} paired twice`);
            seen.add(id);
          }
          if (!g.black_id) {
            byes.set(g.white_id, (byes.get(g.white_id) || 0) + 1);
            continue;
          }
          const key = [g.white_id, g.black_id].sort().join('-');
          assert.ok(!met.has(key), `rematch ${key} in round ${r} (n=${n}, seed=${seed})`);
          met.add(key);
          colors.get(g.white_id).push('w');
          colors.get(g.black_id).push('b');
        }
        assert.equal(seen.size, n, `round ${r}: everyone plays or has a bye`);
        assert.equal(games.filter((g) => !g.black_id).length, n % 2, 'one bye iff odd');
      }
      for (const [id, c] of byes) assert.ok(c <= 1, `${id} got ${c} byes`);
      for (const [id, c] of colors) {
        const diff = c.filter((x) => x === 'w').length - c.filter((x) => x === 'b').length;
        assert.ok(Math.abs(diff) <= 2, `${id} color diff ${diff}`);
        for (let i = 2; i < c.length; i++) assert.ok(!(c[i] === c[i - 1] && c[i] === c[i - 2]), `${id} same color 3x: ${c.join('')}`);
      }
      const final = computeStandings(participants, pairings);
      const total = final.reduce((s, p) => s + p.score, 0);
      assert.equal(total, (Math.floor(n / 2) + (n % 2)) * expectedRounds, 'points conserved');
      assert.equal(t.winner_id, final[0].id);
    }
  });
}

test('pairs within score groups first (round 2, 8 players)', () => {
  const parts = makePlayers(8);
  const s = planStart({ format: 'swiss', status: 'upcoming', rounds: 3 }, parts);
  for (const g of s.newPairings) g.result = '1-0';
  const plan = planAdvance({ status: 'running', current_round: 1, rounds: 3 }, parts, s.newPairings);
  const st = new Map(computeStandings(parts, s.newPairings).map((p) => [p.id, p.score]));
  for (const g of plan.newPairings) assert.equal(st.get(g.white_id), st.get(g.black_id), 'same score group');
});

test('maxRounds caps by field size', () => {
  assert.equal(maxRounds(2), 1);
  assert.equal(maxRounds(5), 4);
  assert.equal(maxRounds(6), 5);
  assert.equal(maxRounds(7), 6);
  assert.equal(maxRounds(8), 5);
  assert.equal(maxRounds(24), 21);
  assert.equal(maxRounds(40), 10);
  assert.equal(maxRounds(1024), 14);
  const plan = planStart({ format: 'swiss', status: 'upcoming', rounds: 7 }, makePlayers(8));
  assert.equal(plan.tournamentPatch.rounds, 5);
});
