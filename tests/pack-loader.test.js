import test from 'node:test';
import assert from 'node:assert/strict';

import { mergeContentPacks, resolveScopedId } from '../src/content/pack-loader.js';

test('resolves unscoped IDs into pack-scoped IDs', () => {
  assert.equal(resolveScopedId('base', 'sword'), 'base:sword');
  assert.equal(resolveScopedId('base', 'expansion:sword'), 'expansion:sword');
});

test('merges packs deterministically with dependencies and stat overrides', () => {
  const merged = mergeContentPacks({
    packs: {
      base: {
        pack: {
          name: 'Base',
          version: '1.0.0',
          dependencies: [],
          loreNamespace: 'base',
        },
        stats: {
          additions: [{ id: 'strength', label: 'Strength', baseValue: 1 }],
        },
        equipment: [{ id: 'gloves', name: 'Gloves' }],
      },
      expansion: {
        pack: {
          name: 'Expansion',
          version: '1.0.0',
          dependencies: ['base'],
          loreNamespace: 'expansion',
        },
        stats: {
          overrides: [{ id: 'base:strength', baseValue: 5 }],
        },
        tasks: [{ id: 'quest', label: 'Quest' }],
      },
    },
    activePackIds: ['expansion'],
  });

  assert.deepEqual(merged.resolvedOrder, ['base', 'expansion']);
  assert.equal(merged.stats[0].id, 'base:strength');
  assert.equal(merged.stats[0].baseValue, 5);
  assert.equal(merged.equipment[0].id, 'base:gloves');
  assert.equal(merged.tasks[0].id, 'expansion:quest');
});

test('rejects collisions across merged packs', () => {
  assert.throws(
    () =>
      mergeContentPacks({
        packs: {
          base: {
            pack: { dependencies: [] },
            equipment: [{ id: 'base:shared', name: 'Shared A' }],
          },
          alt: {
            pack: { dependencies: [] },
            equipment: [{ id: 'base:shared', name: 'Shared B' }],
          },
        },
      }),
    /Duplicate content id collision/,
  );
});
