import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORIES, PUZZLES, QUIZ } from '../src/lib/chessLearningContent.js';

test('STORIES library contains at least 10 stories with full fields', () => {
  assert.ok(STORIES.length >= 10, `Expected at least 10 stories, got ${STORIES.length}`);
  for (const story of STORIES) {
    assert.ok(story.year && typeof story.year === 'string', 'Story must have a year string');
    assert.ok(story.title && typeof story.title === 'string', 'Story must have a title');
    assert.ok(story.text && typeof story.text === 'string' && story.text.length > 50, 'Story must have descriptive text');
    assert.ok(story.lesson && typeof story.lesson === 'string', 'Story must have a lesson');
  }
});

test('PUZZLES library contains at least 12 puzzles with valid 8x8 positions', () => {
  assert.ok(PUZZLES.length >= 12, `Expected at least 12 puzzles, got ${PUZZLES.length}`);
  for (const puzzle of PUZZLES) {
    assert.ok(puzzle.label, 'Puzzle must have a label');
    assert.ok(Array.isArray(puzzle.position) && puzzle.position.length === 8, 'Position must have 8 rows');
    for (const row of puzzle.position) {
      assert.equal(row.length, 8, `Each row in position must be exactly 8 chars, got ${row}`);
    }
    assert.ok(Array.isArray(puzzle.options) && puzzle.options.length >= 3, 'Puzzle must have at least 3 options');
    assert.ok(puzzle.answer >= 0 && puzzle.answer < puzzle.options.length, 'Answer must be in options range');
    assert.ok(puzzle.explanation, 'Puzzle must have an explanation');
  }
});

test('QUIZ library contains at least 15 quiz questions', () => {
  assert.ok(QUIZ.length >= 15, `Expected at least 15 questions, got ${QUIZ.length}`);
  for (const q of QUIZ) {
    assert.ok(q.question, 'Quiz item must have a question');
    assert.ok(Array.isArray(q.options) && q.options.length >= 3, 'Quiz item must have at least 3 options');
    assert.ok(q.answer >= 0 && q.answer < q.options.length, 'Answer must be in options range');
    assert.ok(q.explanation, 'Quiz item must have an explanation');
  }
});
