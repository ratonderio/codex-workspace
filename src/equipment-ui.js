export function indexEquipmentDefinitions(definitions = []) {
  return new Map(definitions.map((definition) => [definition.id, definition]));
}

export function buildEquipmentViewModel({
  equipmentDefinitions = [],
  ownedEquipmentIds = [],
  equippedBySlot = {},
} = {}) {
  const definitionById = indexEquipmentDefinitions(equipmentDefinitions);

  const ownedEquipment = ownedEquipmentIds
    .map((equipmentId) => definitionById.get(equipmentId))
    .filter(Boolean);

  const equippedEquipment = Object.fromEntries(
    Object.entries(equippedBySlot)
      .map(([slot, equipmentId]) => [slot, definitionById.get(equipmentId)])
      .filter(([, definition]) => Boolean(definition)),
  );

  return {
    ownedEquipment,
    equippedEquipment,
  };
}
