import { createDefaultStatsState, sanitizeStats } from './domain/stats/registry.js';

const SAVE_KEY = 'game-save';
const SAVE_VERSION = 2;

const migrations = {
  1: (payload) => {
    const runtimeState = payload.runtimeState && typeof payload.runtimeState === 'object'
      ? payload.runtimeState
      : {};
    const legacyEquipped =
      runtimeState.equippedEquipmentIds && typeof runtimeState.equippedEquipmentIds === 'object'
        ? runtimeState.equippedEquipmentIds
        : {};

    return {
      ...payload,
      saveVersion: 2,
      runtimeState: {
        ...runtimeState,
        equippedBySlot:
          runtimeState.equippedBySlot && typeof runtimeState.equippedBySlot === 'object'
            ? runtimeState.equippedBySlot
            : legacyEquipped,
      },
    };
  },
};

export const defaultRuntimeState = Object.freeze({
  stats: Object.freeze(createDefaultStatsState()),
  taskProgress: {},
  money: 0,
  job: {
    xp: 0,
    level: 1,
  },
  ownedEquipmentIds: [],
  equippedBySlot: {},
  itemXp: {},
  itemRank: {},
});

function cloneDefaultState() {
  return {
    stats: createDefaultStatsState(),
    taskProgress: {},
    money: 0,
    job: {
      xp: 0,
      level: 1,
    },
    ownedEquipmentIds: [],
    equippedBySlot: {},
    itemXp: {},
    itemRank: {},
  };
}

function sanitizeRuntimeState(state = {}) {
  const equippedBySlot =
    state.equippedBySlot && typeof state.equippedBySlot === 'object'
      ? state.equippedBySlot
      : state.equippedEquipmentIds && typeof state.equippedEquipmentIds === 'object'
        ? state.equippedEquipmentIds
        : {};

  return {
    stats: sanitizeStats(state.stats),
    taskProgress:
      state.taskProgress && typeof state.taskProgress === 'object'
        ? state.taskProgress
        : {},
    money: Number.isFinite(state.money) ? state.money : 0,
    job: {
      xp: Number.isFinite(state.job?.xp) ? state.job.xp : 0,
      level: Number.isFinite(state.job?.level) ? state.job.level : 1,
    },
    ownedEquipmentIds: Array.isArray(state.ownedEquipmentIds)
      ? state.ownedEquipmentIds
      : [],
    equippedBySlot,
    equippedBySlot:
      state.equippedBySlot && typeof state.equippedBySlot === 'object'
        ? state.equippedBySlot
        : state.equippedEquipmentIds && typeof state.equippedEquipmentIds === 'object'
          ? state.equippedEquipmentIds
          : {},
    itemXp: state.itemXp && typeof state.itemXp === 'object' ? state.itemXp : {},
    itemRank: state.itemRank && typeof state.itemRank === 'object' ? state.itemRank : {},
  };
}

function migrateSavePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  let version = Number.isInteger(payload.saveVersion) ? payload.saveVersion : 1;
  if (version < 1 || version > SAVE_VERSION) {
    return null;
  }

  let migrated = {
    ...payload,
    saveVersion: version,
  };

  while (version < SAVE_VERSION) {
    const migration = migrations[version];
    if (!migration) {
      return null;
    }

    migrated = migration(migrated);
    version = migrated.saveVersion;
  }

  return migrated;
}

export function buildSavePayload(runtimeState) {
  return {
    saveVersion: SAVE_VERSION,
    runtimeState: sanitizeRuntimeState(runtimeState),
  };
}

export function saveGame(runtimeState, storage = globalThis.localStorage) {
  if (!storage) {
    return false;
  }

  const payload = buildSavePayload(runtimeState);
  storage.setItem(SAVE_KEY, JSON.stringify(payload));
  return true;
}

export function loadGame(storage = globalThis.localStorage) {
  const defaults = cloneDefaultState();

  if (!storage) {
    return defaults;
  }

  const raw = storage.getItem(SAVE_KEY);
  if (!raw) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw);
    const migrated = migrateSavePayload(parsed);
    if (!migrated) {
      return defaults;
    }

    return {
      ...defaults,
      ...sanitizeRuntimeState(migrated.runtimeState),
    };
  } catch {
    return defaults;
  }
}

export function createSaveService({
  getRuntimeState,
  on,
  intervalMs = 30_000,
  storage = globalThis.localStorage,
} = {}) {
  let intervalId;

  function persistNow() {
    if (!getRuntimeState) {
      return false;
    }

    return saveGame(getRuntimeState(), storage);
  }

  function start() {
    // Save game on interval.
    intervalId = setInterval(persistNow, intervalMs);

    // Save game on task changes.
    if (on) {
      on('task:changed', persistNow);
      on('task:masteryChanged', persistNow);
      on('task:levelChanged', persistNow);
    }
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  }

  return {
    start,
    stop,
    saveGame: persistNow,
    loadGame: () => loadGame(storage),
  };
}
