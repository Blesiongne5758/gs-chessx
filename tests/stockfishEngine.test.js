import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import {
  AI_LEVEL_PROFILES,
  parseUciMove,
  parseUciInfo,
  chooseFallbackMove,
  stockfishEngine,
} from '../src/lib/stockfishEngine.js';

test('AI_LEVEL_PROFILES defines 10 progressive difficulty levels', () => {
  for (let lvl = 1; lvl <= 10; lvl++) {
    const profile = AI_LEVEL_PROFILES[lvl];
    assert.ok(profile, `Profile for level ${lvl} should exist`);
    assert.equal(profile.level, lvl);
    assert.ok(profile.title, `Profile ${lvl} should have a title`);
    assert.ok(profile.elo >= 800, `Profile ${lvl} elo >= 800`);
    assert.ok(profile.skillLevel >= 0 && profile.skillLevel <= 20, `Profile ${lvl} skillLevel in [0, 20]`);
    assert.ok(profile.depth >= 1, `Profile ${lvl} depth >= 1`);
    assert.ok(profile.movetime >= 200, `Profile ${lvl} movetime >= 200`);
  }

  // Ensure ascending skill levels
  assert.ok(AI_LEVEL_PROFILES[10].skillLevel > AI_LEVEL_PROFILES[1].skillLevel);
  assert.ok(AI_LEVEL_PROFILES[10].elo > AI_LEVEL_PROFILES[1].elo);
});

test('parseUciMove parses 4-character and 5-character promotion UCI strings', () => {
  assert.deepEqual(parseUciMove('e2e4'), { from: 'e2', to: 'e4' });
  assert.deepEqual(parseUciMove('g1f3'), { from: 'g1', to: 'f3' });
  assert.deepEqual(parseUciMove('e7e8q'), { from: 'e7', to: 'e8', promotion: 'q' });
  assert.deepEqual(parseUciMove('a2a1n'), { from: 'a2', to: 'a1', promotion: 'n' });

  assert.equal(parseUciMove(''), null);
  assert.equal(parseUciMove(null), null);
  assert.equal(parseUciMove('e2'), null);
});

test('parseUciInfo extracts depth, centipawn evaluation, mate, and pv moves', () => {
  const cpLine = 'info depth 8 seldepth 10 multipv 1 score cp 65 nodes 1200 nps 600000 pv e2e4 e7e5';
  const cpParsed = parseUciInfo(cpLine);
  assert.ok(cpParsed);
  assert.equal(cpParsed.depth, 8);
  assert.equal(cpParsed.type, 'cp');
  assert.equal(cpParsed.value, 65);
  assert.equal(cpParsed.label, '+0.65');
  assert.equal(cpParsed.pv, 'e2e4 e7e5');

  const negCpLine = 'info depth 6 score cp -120 pv d7d5';
  const negParsed = parseUciInfo(negCpLine);
  assert.ok(negParsed);
  assert.equal(negParsed.value, -120);
  assert.equal(negParsed.label, '-1.20');

  const mateLine = 'info depth 12 score mate 2 pv f7f8q';
  const mateParsed = parseUciInfo(mateLine);
  assert.ok(mateParsed);
  assert.equal(mateParsed.type, 'mate');
  assert.equal(mateParsed.value, 2);
  assert.equal(mateParsed.label, 'M+2');

  assert.equal(parseUciInfo(''), null);
  assert.equal(parseUciInfo('Stockfish version 10'), null);
});

test('chooseFallbackMove selects legal moves for standard positions', () => {
  const chess = new Chess();
  const move = chooseFallbackMove(chess, 10);
  assert.ok(move);
  assert.ok(move.from);
  assert.ok(move.to);

  // Validate that move is legal by executing it
  const result = chess.move(move);
  assert.ok(result);
  assert.equal(chess.history().length, 1);
});

test('stockfishEngine controller exposes required methods and safe fallbacks', async () => {
  assert.equal(typeof stockfishEngine.init, 'function');
  assert.equal(typeof stockfishEngine.requestMove, 'function');
  assert.equal(typeof stockfishEngine.terminate, 'function');

  // In Node environment without window/Worker, requestMove falls back cleanly
  const chess = new Chess();
  const move = await stockfishEngine.requestMove(chess.fen(), 5, chess);
  assert.ok(move);
  assert.ok(move.from);
  assert.ok(move.to);
});
