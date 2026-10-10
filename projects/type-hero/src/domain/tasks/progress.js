function isObjectRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeTaskProgressEntry(source) {
  const entry = isObjectRecord(source) ? source : {};

  return {
    level: Number.isFinite(entry.level) ? entry.level : 0,
    masteryTier: Number.isFinite(entry.masteryTier) ? entry.masteryTier : 0,
    masteryMultiplier: Number.isFinite(entry.masteryMultiplier)
      ? entry.masteryMultiplier
      : 1,
    elapsed: Number.isFinite(entry.elapsed) ? entry.elapsed : 0,
  };
}
