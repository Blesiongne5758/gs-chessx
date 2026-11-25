import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TIME_CONTROL_CATEGORIES,
  TIME_CONTROL_PRESETS,
  DEFAULT_TIME_CONTROL,
  getCategoryPresets,
  getDefaultCategoryPreset,
  normalizeTimeControl,
} from '../src/lib/timeControls.js';

test('defines the 4 required categories in English: rapid, blitz, bullet, classic', () => {
  const ids = TIME_CONTROL_CATEGORIES.map((c) => c.id);
  assert.deepEqual(ids, ['rapid', 'blitz', 'bullet', 'classic']);

  const names = TIME_CONTROL_CATEGORIES.map((c) => c.name);
  assert.deepEqual(names, ['Rapid', 'Blitz', 'Bullet', 'Classic']);
});

test('retrieves default preset for each category', () => {
  assert.equal(getDefaultCategoryPreset('rapid').label, 'Rapid (10+0)');
  assert.equal(getDefaultCategoryPreset('blitz').label, 'Blitz (3+2)');
  assert.equal(getDefaultCategoryPreset('bullet').label, 'Bullet (1+0)');
  assert.equal(getDefaultCategoryPreset('classic').label, 'Classic (30+0)');
});

test('retrieves presets for each category', () => {
  const rapidPresets = getCategoryPresets('rapid');
  assert.ok(rapidPresets.length >= 2);
  assert.ok(rapidPresets.some((p) => p.name === '10+0'));

  const blitzPresets = getCategoryPresets('blitz');
  assert.ok(blitzPresets.length >= 2);
  assert.ok(blitzPresets.some((p) => p.name === '3+2'));

  const bulletPresets = getCategoryPresets('bullet');
  assert.ok(bulletPresets.length >= 2);
  assert.ok(bulletPresets.some((p) => p.name === '1+0'));

  const classicPresets = getCategoryPresets('classic');
  assert.ok(classicPresets.length >= 1);
  assert.ok(classicPresets.some((p) => p.name === '30+0'));
});

test('normalizes string and object inputs', () => {
  assert.equal(normalizeTimeControl(null).label, 'Rapid (10+0)');
  assert.equal(normalizeTimeControl('bullet').label, 'Bullet (1+0)');
  assert.equal(normalizeTimeControl('blitz').label, 'Blitz (3+2)');
  assert.equal(normalizeTimeControl('rapid').label, 'Rapid (10+0)');
  assert.equal(normalizeTimeControl('classic').label, 'Classic (30+0)');
  assert.equal(normalizeTimeControl('Classical (30+0)').label, 'Classic (30+0)');
  assert.equal(normalizeTimeControl({ label: 'Blitz (3+2)' }).base, 180);
  assert.equal(normalizeTimeControl({ label: 'Bullet (1+0)' }).base, 60);
  assert.equal(normalizeTimeControl({ label: 'Classic (30+0)' }).base, 1800);
});
