import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  assertValidEquipmentDefinitions,
  validateEquipmentDefinitions,
} from '../src/domain/equipment/schema.js';
import { indexEquipmentDefinitions } from '../src/equipment-ui.js';

const equipmentFixtures = JSON.parse(
  readFileSync(new URL('../content/packs/base/equipment.json', import.meta.url), 'utf8'),
);

test('accepts current equipment content schema', () => {
  const result = validateEquipmentDefinitions(equipmentFixtures);
  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, []);
});

test('rejects duplicate IDs and malformed effect values', () => {
  const invalid = [
    {
      ...equipmentFixtures[0],
      baseEffects: {
        strengthGainMultiplier: 0,
      },
    },
    {
      ...equipmentFixtures[0],
      slot: 'tail',
    },
  ];

  const result = validateEquipmentDefinitions(invalid);
  assert.equal(result.isValid, false);
  assert.equal(
    result.errors.some((error) => error.includes("duplicate id 'iron_grip_gloves'")),
    true,
  );
  assert.equal(result.errors.some((error) => error.includes("slot: 'tail' is invalid")), true);
  assert.equal(
    result.errors.some((error) =>
      error.includes('baseEffects.strengthGainMultiplier: must be a finite number greater than 0.'),
    ),
    true,
  );
});

test('indexing throws when equipment data is invalid', () => {
  assert.throws(
    () => indexEquipmentDefinitions([{ id: '', name: 'Broken' }]),
    /Invalid equipment definitions/,
  );
  assert.doesNotThrow(() => assertValidEquipmentDefinitions(equipmentFixtures));
});
