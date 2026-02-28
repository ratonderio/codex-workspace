import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeTaskProgressEntry } from '../src/domain/tasks/progress.js';

test('normalizes malformed task progress entries to safe defaults', () => {
  assert.deepEqual(normalizeTaskProgressEntry(null), {
    level: 0,
    masteryTier: 0,
    masteryMultiplier: 1,
    elapsed: 0,
  });

  assert.deepEqual(normalizeTaskProgressEntry(42), {
    level: 0,
    masteryTier: 0,
    masteryMultiplier: 1,
    elapsed: 0,
  });
});

test('preserves valid numeric task progress values', () => {
  assert.deepEqual(
    normalizeTaskProgressEntry({
      level: 12,
      masteryTier: 1,
      masteryMultiplier: 1.05,
      elapsed: 3.5,
    }),
    {
      level: 12,
      masteryTier: 1,
      masteryMultiplier: 1.05,
      elapsed: 3.5,
    },
  );
});
