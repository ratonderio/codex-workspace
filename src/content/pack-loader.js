function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function splitScopedId(id) {
  if (!isNonEmptyString(id)) {
    return null;
  }

  const separatorIndex = id.indexOf(':');
  if (separatorIndex < 0) {
    return null;
  }

  return {
    namespace: id.slice(0, separatorIndex),
    localId: id.slice(separatorIndex + 1),
  };
}

export function resolveScopedId(packId, rawId) {
  if (!isNonEmptyString(packId)) {
    throw new TypeError('packId must be a non-empty string.');
  }

  if (!isNonEmptyString(rawId)) {
    throw new TypeError('content entry id must be a non-empty string.');
  }

  const scopedParts = splitScopedId(rawId);
  if (!scopedParts) {
    return `${packId}:${rawId}`;
  }

  if (!isNonEmptyString(scopedParts.namespace) || !isNonEmptyString(scopedParts.localId)) {
    throw new TypeError(`content entry id '${rawId}' has an invalid namespace format.`);
  }

  return rawId;
}

function toPackRecord(packId, source) {
  if (!isPlainObject(source)) {
    throw new TypeError(`Pack '${packId}' must be an object.`);
  }

  const metadata = source.pack ?? {};
  if (!isPlainObject(metadata)) {
    throw new TypeError(`Pack '${packId}' has invalid pack metadata.`);
  }

  const name = isNonEmptyString(metadata.name) ? metadata.name : packId;
  const version = isNonEmptyString(metadata.version) ? metadata.version : '0.0.0';
  const loreNamespace = isNonEmptyString(metadata.loreNamespace)
    ? metadata.loreNamespace
    : packId;
  const dependencies = Array.isArray(metadata.dependencies)
    ? metadata.dependencies
    : [];

  if (dependencies.some((dependencyId) => !isNonEmptyString(dependencyId))) {
    throw new TypeError(`Pack '${packId}' contains invalid dependency IDs.`);
  }

  return {
    packId,
    name,
    version,
    loreNamespace,
    dependencies,
    stats: source.stats,
    equipment: source.equipment,
    tasks: source.tasks,
    skills: source.skills,
  };
}

function resolvePackOrder(activePackIds, packsById) {
  const order = [];
  const stateByPackId = new Map();

  function visit(packId, path = []) {
    const status = stateByPackId.get(packId);
    if (status === 'visited') {
      return;
    }

    if (status === 'visiting') {
      throw new TypeError(`Detected cyclic pack dependency: ${[...path, packId].join(' -> ')}`);
    }

    const pack = packsById.get(packId);
    if (!pack) {
      throw new TypeError(`Missing pack '${packId}' required by active pack selection.`);
    }

    stateByPackId.set(packId, 'visiting');

    const sortedDependencies = [...pack.dependencies].sort((left, right) =>
      left.localeCompare(right),
    );
    sortedDependencies.forEach((dependencyId) => visit(dependencyId, [...path, packId]));

    stateByPackId.set(packId, 'visited');
    order.push(packId);
  }

  activePackIds.forEach((packId) => visit(packId));
  return order;
}

function mergeUniqueCollection({ target, indexById, packId, sourceEntries, collectionName }) {
  if (sourceEntries == null) {
    return;
  }

  if (!Array.isArray(sourceEntries)) {
    throw new TypeError(`Pack '${packId}' ${collectionName}.json must be an array.`);
  }

  sourceEntries.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      throw new TypeError(`Pack '${packId}' ${collectionName}[${index}] must be an object.`);
    }

    const resolvedId = resolveScopedId(packId, entry.id);
    if (indexById.has(resolvedId)) {
      throw new TypeError(`Duplicate content id collision in ${collectionName}: '${resolvedId}'.`);
    }

    const mergedEntry = {
      ...entry,
      id: resolvedId,
      sourcePackId: packId,
    };

    indexById.set(resolvedId, mergedEntry);
    target.push(mergedEntry);
  });
}

function mergeStats(target, indexById, packId, statsSource) {
  if (statsSource == null) {
    return;
  }

  const additions = Array.isArray(statsSource)
    ? statsSource
    : statsSource.additions ?? [];
  const overrides = Array.isArray(statsSource?.overrides)
    ? statsSource.overrides
    : [];

  if (!Array.isArray(additions) || !Array.isArray(overrides)) {
    throw new TypeError(`Pack '${packId}' stats.json must be an array or { additions, overrides }.`);
  }

  additions.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      throw new TypeError(`Pack '${packId}' stats.additions[${index}] must be an object.`);
    }

    const resolvedId = resolveScopedId(packId, entry.id);
    if (indexById.has(resolvedId)) {
      throw new TypeError(`Duplicate stat id collision: '${resolvedId}'.`);
    }

    const mergedEntry = {
      ...entry,
      id: resolvedId,
      sourcePackId: packId,
    };

    indexById.set(resolvedId, mergedEntry);
    target.push(mergedEntry);
  });

  overrides.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      throw new TypeError(`Pack '${packId}' stats.overrides[${index}] must be an object.`);
    }

    const resolvedId = resolveScopedId(packId, entry.id);
    const existing = indexById.get(resolvedId);

    if (!existing) {
      throw new TypeError(
        `Pack '${packId}' attempted to override missing stat '${resolvedId}'.`,
      );
    }

    const updated = {
      ...existing,
      ...entry,
      id: resolvedId,
      sourcePackId: packId,
    };

    const targetIndex = target.findIndex((stat) => stat.id === resolvedId);
    target[targetIndex] = updated;
    indexById.set(resolvedId, updated);
  });
}

export function mergeContentPacks({ packs = {}, activePackIds = [] } = {}) {
  const packIds = Object.keys(packs).sort((left, right) => left.localeCompare(right));
  const packMap = new Map(packIds.map((packId) => [packId, toPackRecord(packId, packs[packId])]));

  const normalizedActivePackIds =
    activePackIds.length > 0 ? [...new Set(activePackIds)] : packIds;

  if (normalizedActivePackIds.some((packId) => !packMap.has(packId))) {
    const missingPackId = normalizedActivePackIds.find((packId) => !packMap.has(packId));
    throw new TypeError(`Active pack '${missingPackId}' does not exist.`);
  }

  const resolvedOrder = resolvePackOrder(normalizedActivePackIds, packMap);

  const stats = [];
  const equipment = [];
  const tasks = [];
  const skills = [];

  const statIndex = new Map();
  const equipmentIndex = new Map();
  const taskIndex = new Map();
  const skillIndex = new Map();

  resolvedOrder.forEach((packId) => {
    const pack = packMap.get(packId);

    mergeStats(stats, statIndex, packId, pack.stats);
    mergeUniqueCollection({
      target: equipment,
      indexById: equipmentIndex,
      packId,
      sourceEntries: pack.equipment,
      collectionName: 'equipment',
    });
    mergeUniqueCollection({
      target: tasks,
      indexById: taskIndex,
      packId,
      sourceEntries: pack.tasks,
      collectionName: 'tasks',
    });
    mergeUniqueCollection({
      target: skills,
      indexById: skillIndex,
      packId,
      sourceEntries: pack.skills,
      collectionName: 'skills',
    });
  });

  const metadata = resolvedOrder.map((packId) => {
    const pack = packMap.get(packId);
    return {
      id: packId,
      name: pack.name,
      version: pack.version,
      dependencies: [...pack.dependencies],
      loreNamespace: pack.loreNamespace,
    };
  });

  return {
    activePackIds: normalizedActivePackIds,
    resolvedOrder,
    metadata,
    stats,
    equipment,
    tasks,
    skills,
  };
}
