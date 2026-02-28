import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSavePayload, loadGame } from '../src/save-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixture(name) {
  return JSON.parse(
    readFileSync(path.join(__dirname, 'fixtures', name), 'utf8'),
  );
}

function storageWithPayload(payload) {
  return {
    getItem: () => JSON.stringify(payload),
    setItem: () => {},
  };
}

test('migrates v1 payload and preserves runtime data while renaming equipment key', () => {
  const legacySave = fixture('save-v1-equippedEquipmentIds.json');

  const loaded = loadGame(storageWithPayload(legacySave));

  assert.deepEqual(loaded.ownedEquipmentIds, legacySave.runtimeState.ownedEquipmentIds);
  assert.deepEqual(loaded.equippedBySlot, legacySave.runtimeState.equippedEquipmentIds);
  assert.equal(loaded.money, legacySave.runtimeState.money);
  assert.deepEqual(loaded.job, legacySave.runtimeState.job);
  assert.deepEqual(loaded.taskProgress, legacySave.runtimeState.taskProgress);
});

test('treats unversioned legacy payloads as v1 and upgrades them', () => {
  const unversionedSave = fixture('save-v1-unversioned.json');

  const loaded = loadGame(storageWithPayload(unversionedSave));

  assert.deepEqual(loaded.ownedEquipmentIds, unversionedSave.runtimeState.ownedEquipmentIds);
  assert.deepEqual(loaded.equippedBySlot, unversionedSave.runtimeState.equippedEquipmentIds);
});

test('buildSavePayload always emits latest version and new equipment key', () => {
  const payload = buildSavePayload({
    ownedEquipmentIds: ['amulet-1'],
    equippedEquipmentIds: { neck: 'amulet-1' },
  });

  assert.equal(payload.saveVersion, 2);
  assert.deepEqual(payload.runtimeState.equippedBySlot, { neck: 'amulet-1' });
  assert.equal('equippedEquipmentIds' in payload.runtimeState, false);
});


test('loadGame sanitizes malformed task progress entries', () => {
  const loaded = loadGame(
    storageWithPayload({
      saveVersion: 2,
      runtimeState: {
        taskProgress: {
          strength: {
            level: 'bad',
            masteryTier: null,
            masteryMultiplier: undefined,
            elapsed: 'bad',
          },
          courier: 42,
        },
      },
    }),
  );

  assert.deepEqual(loaded.taskProgress, {
    strength: {
      level: 0,
      masteryTier: 0,
      masteryMultiplier: 1,
      elapsed: 0,
    },
    courier: {
      level: 0,
      masteryTier: 0,
      masteryMultiplier: 1,
      elapsed: 0,
    },
  });
});

test('buildSavePayload normalizes task progress shape', () => {
  const payload = buildSavePayload({
    taskProgress: {
      warehouse: {
        level: 3,
        masteryTier: 0,
        masteryMultiplier: 1,
        elapsed: 1.2,
      },
      artisan: {
        level: Number.NaN,
      },
    },
  });

  assert.deepEqual(payload.runtimeState.taskProgress, {
    warehouse: {
      level: 3,
      masteryTier: 0,
      masteryMultiplier: 1,
      elapsed: 1.2,
    },
    artisan: {
      level: 0,
      masteryTier: 0,
      masteryMultiplier: 1,
      elapsed: 0,
    },
  });
});
