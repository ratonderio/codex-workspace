const STAT_CATEGORIES = Object.freeze({
  CORE: 'core',
  COMBAT: 'combat',
  SOCIAL: 'social',
  UTILITY: 'utility',
});

const INFINITE_CAP = Number.POSITIVE_INFINITY;

export const statRegistry = Object.freeze([
  Object.freeze({
    id: 'strength',
    label: 'Strength',
    category: STAT_CATEGORIES.CORE,
    baseValue: 0,
    growth: Object.freeze({
      rewardPerCompletion: 1,
      taskBaseSeconds: 2.5,
      taskScaleFactor: 0.38,
    }),
    caps: Object.freeze({
      points: INFINITE_CAP,
    }),
    derivedDependencies: Object.freeze([]),
  }),
  Object.freeze({
    id: 'endurance',
    label: 'Endurance',
    category: STAT_CATEGORIES.CORE,
    baseValue: 0,
    growth: Object.freeze({
      rewardPerCompletion: 1,
      taskBaseSeconds: 2.5,
      taskScaleFactor: 0.38,
    }),
    caps: Object.freeze({
      points: INFINITE_CAP,
    }),
    derivedDependencies: Object.freeze([]),
  }),
  Object.freeze({
    id: 'dexterity',
    label: 'Dexterity',
    category: STAT_CATEGORIES.CORE,
    baseValue: 0,
    growth: Object.freeze({
      rewardPerCompletion: 1,
      taskBaseSeconds: 2.5,
      taskScaleFactor: 0.38,
    }),
    caps: Object.freeze({
      points: INFINITE_CAP,
    }),
    derivedDependencies: Object.freeze([]),
  }),
]);

export const statCategories = Object.freeze(Object.values(STAT_CATEGORIES));

export function createDefaultStatsState() {
  return Object.fromEntries(
    statRegistry.map((stat) => [stat.id, { points: stat.baseValue }]),
  );
}

export function getStatById(statId) {
  return statRegistry.find((stat) => stat.id === statId);
}

export function getStatsByCategory(category) {
  return statRegistry.filter((stat) => stat.category === category);
}

export function sanitizeStats(inputStats = {}) {
  return Object.fromEntries(
    statRegistry.map((stat) => {
      const rawPoints = inputStats?.[stat.id]?.points;
      const normalizedPoints = Number.isFinite(rawPoints) ? rawPoints : stat.baseValue;
      const cap = Number.isFinite(stat.caps.points) ? stat.caps.points : INFINITE_CAP;
      const clampedPoints = Math.min(Math.max(normalizedPoints, stat.baseValue), cap);

      return [stat.id, { points: clampedPoints }];
    }),
  );
}
