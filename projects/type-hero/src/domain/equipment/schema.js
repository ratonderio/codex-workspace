const ALLOWED_EQUIPMENT_SLOTS = Object.freeze([
  'head',
  'chest',
  'hands',
  'legs',
  'feet',
  'weapon',
  'offhand',
  'accessory',
]);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidEffectValue(value) {
  return Number.isFinite(value) && value > 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function validateEquipmentDefinitions(definitions = []) {
  const errors = [];

  if (!Array.isArray(definitions)) {
    return {
      isValid: false,
      errors: ['Equipment definitions must be an array.'],
    };
  }

  const seenIds = new Set();

  definitions.forEach((definition, index) => {
    const path = `entry[${index}]`;

    if (!isPlainObject(definition)) {
      errors.push(`${path}: must be an object.`);
      return;
    }

    const {
      id,
      name,
      slot,
      tier,
      tags,
      baseEffects,
      flavorText,
      loreRefs,
    } = definition;

    if (!isNonEmptyString(id)) {
      errors.push(`${path}.id: must be a non-empty string.`);
    } else if (seenIds.has(id)) {
      errors.push(`${path}.id: duplicate id '${id}'.`);
    } else {
      seenIds.add(id);
    }

    if (!isNonEmptyString(name)) {
      errors.push(`${path}.name: must be a non-empty string.`);
    }

    if (!ALLOWED_EQUIPMENT_SLOTS.includes(slot)) {
      errors.push(
        `${path}.slot: '${slot}' is invalid. Allowed slots: ${ALLOWED_EQUIPMENT_SLOTS.join(', ')}.`,
      );
    }

    if (!Number.isInteger(tier) || tier < 1) {
      errors.push(`${path}.tier: must be an integer >= 1.`);
    }

    if (!Array.isArray(tags) || tags.some((tag) => !isNonEmptyString(tag))) {
      errors.push(`${path}.tags: must be an array of non-empty strings.`);
    }

    if (!isPlainObject(baseEffects) || Object.keys(baseEffects).length === 0) {
      errors.push(`${path}.baseEffects: must be a non-empty object.`);
    } else {
      Object.entries(baseEffects).forEach(([effectName, effectValue]) => {
        if (!isNonEmptyString(effectName)) {
          errors.push(`${path}.baseEffects: contains an empty effect key.`);
        }

        if (!isValidEffectValue(effectValue)) {
          errors.push(
            `${path}.baseEffects.${effectName}: must be a finite number greater than 0.`,
          );
        }
      });
    }

    if (!isNonEmptyString(flavorText)) {
      errors.push(`${path}.flavorText: must be a non-empty string.`);
    }

    if (!Array.isArray(loreRefs) || loreRefs.some((ref) => !isNonEmptyString(ref))) {
      errors.push(`${path}.loreRefs: must be an array of non-empty strings.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function assertValidEquipmentDefinitions(definitions = []) {
  const result = validateEquipmentDefinitions(definitions);

  if (!result.isValid) {
    throw new TypeError(`Invalid equipment definitions:\n- ${result.errors.join('\n- ')}`);
  }

  return definitions;
}

export const equipmentSlots = ALLOWED_EQUIPMENT_SLOTS;
