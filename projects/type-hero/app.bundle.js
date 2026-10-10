(() => {
  // src/domain/stats/registry.js
  var STAT_CATEGORIES = Object.freeze({
    CORE: "core",
    COMBAT: "combat",
    SOCIAL: "social",
    UTILITY: "utility"
  });
  var INFINITE_CAP = Number.POSITIVE_INFINITY;
  var statRegistry = Object.freeze([
    Object.freeze({
      id: "strength",
      label: "Strength",
      category: STAT_CATEGORIES.CORE,
      baseValue: 0,
      growth: Object.freeze({
        rewardPerCompletion: 1,
        taskBaseSeconds: 2.5,
        taskScaleFactor: 0.38
      }),
      caps: Object.freeze({
        points: INFINITE_CAP
      }),
      derivedDependencies: Object.freeze([])
    }),
    Object.freeze({
      id: "endurance",
      label: "Endurance",
      category: STAT_CATEGORIES.CORE,
      baseValue: 0,
      growth: Object.freeze({
        rewardPerCompletion: 1,
        taskBaseSeconds: 2.5,
        taskScaleFactor: 0.38
      }),
      caps: Object.freeze({
        points: INFINITE_CAP
      }),
      derivedDependencies: Object.freeze([])
    }),
    Object.freeze({
      id: "dexterity",
      label: "Dexterity",
      category: STAT_CATEGORIES.CORE,
      baseValue: 0,
      growth: Object.freeze({
        rewardPerCompletion: 1,
        taskBaseSeconds: 2.5,
        taskScaleFactor: 0.38
      }),
      caps: Object.freeze({
        points: INFINITE_CAP
      }),
      derivedDependencies: Object.freeze([])
    })
  ]);
  var statCategories = Object.freeze(Object.values(STAT_CATEGORIES));
  function createDefaultStatsState() {
    return Object.fromEntries(
      statRegistry.map((stat) => [stat.id, { points: stat.baseValue }])
    );
  }
  function getStatById(statId) {
    return statRegistry.find((stat) => stat.id === statId);
  }
  function sanitizeStats(inputStats = {}) {
    return Object.fromEntries(
      statRegistry.map((stat) => {
        const rawPoints = inputStats?.[stat.id]?.points;
        const normalizedPoints = Number.isFinite(rawPoints) ? rawPoints : stat.baseValue;
        const cap = Number.isFinite(stat.caps.points) ? stat.caps.points : INFINITE_CAP;
        const clampedPoints = Math.min(Math.max(normalizedPoints, stat.baseValue), cap);
        return [stat.id, { points: clampedPoints }];
      })
    );
  }

  // src/domain/jobs/registry.js
  var jobRegistry = Object.freeze([
    Object.freeze({
      id: "warehouse",
      label: "Warehouse Shift",
      baseSeconds: 3.2,
      scaleFactor: 0.22,
      moneyBase: 6,
      xpBase: 4
    }),
    Object.freeze({
      id: "courier",
      label: "Courier Route",
      baseSeconds: 4,
      scaleFactor: 0.18,
      moneyBase: 9,
      xpBase: 5
    }),
    Object.freeze({
      id: "artisan",
      label: "Artisan Contract",
      baseSeconds: 5.6,
      scaleFactor: 0.16,
      moneyBase: 14,
      xpBase: 7
    })
  ]);
  function getJobById(jobId) {
    return jobRegistry.find((job) => job.id === jobId);
  }

  // src/domain/equipment/schema.js
  var ALLOWED_EQUIPMENT_SLOTS = Object.freeze([
    "head",
    "chest",
    "hands",
    "legs",
    "feet",
    "weapon",
    "offhand",
    "accessory"
  ]);
  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }
  function isValidEffectValue(value) {
    return Number.isFinite(value) && value > 0;
  }
  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }
  function validateEquipmentDefinitions(definitions = []) {
    const errors = [];
    if (!Array.isArray(definitions)) {
      return {
        isValid: false,
        errors: ["Equipment definitions must be an array."]
      };
    }
    const seenIds = /* @__PURE__ */ new Set();
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
        loreRefs
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
          `${path}.slot: '${slot}' is invalid. Allowed slots: ${ALLOWED_EQUIPMENT_SLOTS.join(", ")}.`
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
              `${path}.baseEffects.${effectName}: must be a finite number greater than 0.`
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
      errors
    };
  }
  function assertValidEquipmentDefinitions(definitions = []) {
    const result = validateEquipmentDefinitions(definitions);
    if (!result.isValid) {
      throw new TypeError(`Invalid equipment definitions:
- ${result.errors.join("\n- ")}`);
    }
    return definitions;
  }

  // src/equipment-ui.js
  function indexEquipmentDefinitions(definitions = []) {
    const validDefinitions = assertValidEquipmentDefinitions(definitions);
    return new Map(validDefinitions.map((definition) => [definition.id, definition]));
  }
  function buildEquipmentViewModel({
    equipmentDefinitions = [],
    ownedEquipmentIds = [],
    equippedBySlot = {}
  } = {}) {
    const definitionById = indexEquipmentDefinitions(equipmentDefinitions);
    const ownedEquipment = ownedEquipmentIds.map((equipmentId) => definitionById.get(equipmentId)).filter(Boolean);
    const equippedEquipment = Object.fromEntries(
      Object.entries(equippedBySlot).map(([slot, equipmentId]) => [slot, definitionById.get(equipmentId)]).filter(([, definition]) => Boolean(definition))
    );
    return {
      ownedEquipment,
      equippedEquipment
    };
  }

  // src/domain/tasks/progress.js
  function isObjectRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }
  function normalizeTaskProgressEntry(source) {
    const entry = isObjectRecord(source) ? source : {};
    return {
      level: Number.isFinite(entry.level) ? entry.level : 0,
      masteryTier: Number.isFinite(entry.masteryTier) ? entry.masteryTier : 0,
      masteryMultiplier: Number.isFinite(entry.masteryMultiplier) ? entry.masteryMultiplier : 1,
      elapsed: Number.isFinite(entry.elapsed) ? entry.elapsed : 0
    };
  }

  // src/save-service.js
  var SAVE_KEY = "game-save";
  var SAVE_VERSION = 2;
  var migrations = {
    1: (payload) => {
      const runtimeState = payload.runtimeState && typeof payload.runtimeState === "object" ? payload.runtimeState : {};
      const legacyEquipped = runtimeState.equippedEquipmentIds && typeof runtimeState.equippedEquipmentIds === "object" ? runtimeState.equippedEquipmentIds : {};
      return {
        ...payload,
        saveVersion: 2,
        runtimeState: {
          ...runtimeState,
          equippedBySlot: runtimeState.equippedBySlot && typeof runtimeState.equippedBySlot === "object" ? runtimeState.equippedBySlot : legacyEquipped
        }
      };
    }
  };
  var defaultRuntimeState = Object.freeze({
    stats: Object.freeze(createDefaultStatsState()),
    taskProgress: {},
    money: 0,
    job: {
      xp: 0,
      level: 1
    },
    ownedEquipmentIds: [],
    equippedBySlot: {},
    itemXp: {},
    itemRank: {}
  });
  function cloneDefaultState() {
    return {
      stats: createDefaultStatsState(),
      taskProgress: {},
      money: 0,
      job: {
        xp: 0,
        level: 1
      },
      ownedEquipmentIds: [],
      equippedBySlot: {},
      itemXp: {},
      itemRank: {}
    };
  }
  function sanitizeTaskProgress(taskProgress) {
    if (!taskProgress || typeof taskProgress !== "object") {
      return {};
    }
    return Object.fromEntries(
      Object.entries(taskProgress).map(([taskId, progress]) => {
        return [taskId, normalizeTaskProgressEntry(progress)];
      })
    );
  }
  function sanitizeRuntimeState(state2 = {}) {
    return {
      stats: sanitizeStats(state2.stats),
      taskProgress: sanitizeTaskProgress(state2.taskProgress),
      money: Number.isFinite(state2.money) ? state2.money : 0,
      job: {
        xp: Number.isFinite(state2.job?.xp) ? state2.job.xp : 0,
        level: Number.isFinite(state2.job?.level) ? state2.job.level : 1
      },
      ownedEquipmentIds: Array.isArray(state2.ownedEquipmentIds) ? state2.ownedEquipmentIds : [],
      equippedBySlot: state2.equippedBySlot && typeof state2.equippedBySlot === "object" ? state2.equippedBySlot : state2.equippedEquipmentIds && typeof state2.equippedEquipmentIds === "object" ? state2.equippedEquipmentIds : {},
      itemXp: state2.itemXp && typeof state2.itemXp === "object" ? state2.itemXp : {},
      itemRank: state2.itemRank && typeof state2.itemRank === "object" ? state2.itemRank : {}
    };
  }
  function migrateSavePayload(payload) {
    if (!payload || typeof payload !== "object") {
      return null;
    }
    let version = Number.isInteger(payload.saveVersion) ? payload.saveVersion : 1;
    if (version < 1 || version > SAVE_VERSION) {
      return null;
    }
    let migrated = {
      ...payload,
      saveVersion: version
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
  function buildSavePayload(runtimeState) {
    return {
      saveVersion: SAVE_VERSION,
      runtimeState: sanitizeRuntimeState(runtimeState)
    };
  }
  function saveGame(runtimeState, storage = globalThis.localStorage) {
    if (!storage) {
      return false;
    }
    const payload = buildSavePayload(runtimeState);
    storage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  }
  function loadGame(storage = globalThis.localStorage) {
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
        ...sanitizeRuntimeState(migrated.runtimeState)
      };
    } catch {
      return defaults;
    }
  }
  function createSaveService({
    getRuntimeState,
    on,
    intervalMs = 3e4,
    storage = globalThis.localStorage
  } = {}) {
    let intervalId;
    function persistNow() {
      if (!getRuntimeState) {
        return false;
      }
      return saveGame(getRuntimeState(), storage);
    }
    function start() {
      intervalId = setInterval(persistNow, intervalMs);
      if (on) {
        on("task:changed", persistNow);
        on("task:masteryChanged", persistNow);
        on("task:levelChanged", persistNow);
      }
    }
    function stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = void 0;
      }
    }
    return {
      start,
      stop,
      saveGame: persistNow,
      loadGame: () => loadGame(storage)
    };
  }

  // src/content/pack-loader.js
  function isPlainObject2(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }
  function isNonEmptyString2(value) {
    return typeof value === "string" && value.trim().length > 0;
  }
  function splitScopedId(id) {
    if (!isNonEmptyString2(id)) {
      return null;
    }
    const separatorIndex = id.indexOf(":");
    if (separatorIndex < 0) {
      return null;
    }
    return {
      namespace: id.slice(0, separatorIndex),
      localId: id.slice(separatorIndex + 1)
    };
  }
  function resolveScopedId(packId, rawId) {
    if (!isNonEmptyString2(packId)) {
      throw new TypeError("packId must be a non-empty string.");
    }
    if (!isNonEmptyString2(rawId)) {
      throw new TypeError("content entry id must be a non-empty string.");
    }
    const scopedParts = splitScopedId(rawId);
    if (!scopedParts) {
      return `${packId}:${rawId}`;
    }
    if (!isNonEmptyString2(scopedParts.namespace) || !isNonEmptyString2(scopedParts.localId)) {
      throw new TypeError(`content entry id '${rawId}' has an invalid namespace format.`);
    }
    return rawId;
  }
  function toPackRecord(packId, source) {
    if (!isPlainObject2(source)) {
      throw new TypeError(`Pack '${packId}' must be an object.`);
    }
    const metadata = source.pack ?? {};
    if (!isPlainObject2(metadata)) {
      throw new TypeError(`Pack '${packId}' has invalid pack metadata.`);
    }
    const name = isNonEmptyString2(metadata.name) ? metadata.name : packId;
    const version = isNonEmptyString2(metadata.version) ? metadata.version : "0.0.0";
    const loreNamespace = isNonEmptyString2(metadata.loreNamespace) ? metadata.loreNamespace : packId;
    const dependencies = Array.isArray(metadata.dependencies) ? metadata.dependencies : [];
    if (dependencies.some((dependencyId) => !isNonEmptyString2(dependencyId))) {
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
      skills: source.skills
    };
  }
  function resolvePackOrder(activePackIds, packsById) {
    const order = [];
    const stateByPackId = /* @__PURE__ */ new Map();
    function visit(packId, path = []) {
      const status = stateByPackId.get(packId);
      if (status === "visited") {
        return;
      }
      if (status === "visiting") {
        throw new TypeError(`Detected cyclic pack dependency: ${[...path, packId].join(" -> ")}`);
      }
      const pack = packsById.get(packId);
      if (!pack) {
        throw new TypeError(`Missing pack '${packId}' required by active pack selection.`);
      }
      stateByPackId.set(packId, "visiting");
      const sortedDependencies = [...pack.dependencies].sort(
        (left, right) => left.localeCompare(right)
      );
      sortedDependencies.forEach((dependencyId) => visit(dependencyId, [...path, packId]));
      stateByPackId.set(packId, "visited");
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
      if (!isPlainObject2(entry)) {
        throw new TypeError(`Pack '${packId}' ${collectionName}[${index}] must be an object.`);
      }
      const resolvedId = resolveScopedId(packId, entry.id);
      if (indexById.has(resolvedId)) {
        throw new TypeError(`Duplicate content id collision in ${collectionName}: '${resolvedId}'.`);
      }
      const mergedEntry = {
        ...entry,
        id: resolvedId,
        sourcePackId: packId
      };
      indexById.set(resolvedId, mergedEntry);
      target.push(mergedEntry);
    });
  }
  function mergeStats(target, indexById, packId, statsSource) {
    if (statsSource == null) {
      return;
    }
    const additions = Array.isArray(statsSource) ? statsSource : statsSource.additions ?? [];
    const overrides = Array.isArray(statsSource?.overrides) ? statsSource.overrides : [];
    if (!Array.isArray(additions) || !Array.isArray(overrides)) {
      throw new TypeError(`Pack '${packId}' stats.json must be an array or { additions, overrides }.`);
    }
    additions.forEach((entry, index) => {
      if (!isPlainObject2(entry)) {
        throw new TypeError(`Pack '${packId}' stats.additions[${index}] must be an object.`);
      }
      const resolvedId = resolveScopedId(packId, entry.id);
      if (indexById.has(resolvedId)) {
        throw new TypeError(`Duplicate stat id collision: '${resolvedId}'.`);
      }
      const mergedEntry = {
        ...entry,
        id: resolvedId,
        sourcePackId: packId
      };
      indexById.set(resolvedId, mergedEntry);
      target.push(mergedEntry);
    });
    overrides.forEach((entry, index) => {
      if (!isPlainObject2(entry)) {
        throw new TypeError(`Pack '${packId}' stats.overrides[${index}] must be an object.`);
      }
      const resolvedId = resolveScopedId(packId, entry.id);
      const existing = indexById.get(resolvedId);
      if (!existing) {
        throw new TypeError(
          `Pack '${packId}' attempted to override missing stat '${resolvedId}'.`
        );
      }
      const updated = {
        ...existing,
        ...entry,
        id: resolvedId,
        sourcePackId: packId
      };
      const targetIndex = target.findIndex((stat) => stat.id === resolvedId);
      target[targetIndex] = updated;
      indexById.set(resolvedId, updated);
    });
  }
  function mergeContentPacks({ packs = {}, activePackIds = [] } = {}) {
    const packIds = Object.keys(packs).sort((left, right) => left.localeCompare(right));
    const packMap = new Map(packIds.map((packId) => [packId, toPackRecord(packId, packs[packId])]));
    const normalizedActivePackIds = activePackIds.length > 0 ? [...new Set(activePackIds)] : packIds;
    if (normalizedActivePackIds.some((packId) => !packMap.has(packId))) {
      const missingPackId = normalizedActivePackIds.find((packId) => !packMap.has(packId));
      throw new TypeError(`Active pack '${missingPackId}' does not exist.`);
    }
    const resolvedOrder = resolvePackOrder(normalizedActivePackIds, packMap);
    const stats = [];
    const equipment = [];
    const tasks = [];
    const skills = [];
    const statIndex = /* @__PURE__ */ new Map();
    const equipmentIndex = /* @__PURE__ */ new Map();
    const taskIndex = /* @__PURE__ */ new Map();
    const skillIndex = /* @__PURE__ */ new Map();
    resolvedOrder.forEach((packId) => {
      const pack = packMap.get(packId);
      mergeStats(stats, statIndex, packId, pack.stats);
      mergeUniqueCollection({
        target: equipment,
        indexById: equipmentIndex,
        packId,
        sourceEntries: pack.equipment,
        collectionName: "equipment"
      });
      mergeUniqueCollection({
        target: tasks,
        indexById: taskIndex,
        packId,
        sourceEntries: pack.tasks,
        collectionName: "tasks"
      });
      mergeUniqueCollection({
        target: skills,
        indexById: skillIndex,
        packId,
        sourceEntries: pack.skills,
        collectionName: "skills"
      });
    });
    const metadata = resolvedOrder.map((packId) => {
      const pack = packMap.get(packId);
      return {
        id: packId,
        name: pack.name,
        version: pack.version,
        dependencies: [...pack.dependencies],
        loreNamespace: pack.loreNamespace
      };
    });
    return {
      activePackIds: normalizedActivePackIds,
      resolvedOrder,
      metadata,
      stats,
      equipment,
      tasks,
      skills
    };
  }

  // script.js
  var MASTERY_LEVEL_STEP = 100;
  var MASTERY_BONUS_STEP = 0.05;
  var LOOP_MS = 100;
  var JOB_LEVEL_XP_BASE = 24;
  var JOB_LEVEL_XP_SCALE = 1.28;
  var state = {
    runtime: {
      stats: createDefaultStatsState(),
      taskProgress: {},
      money: 0,
      job: {
        xp: 0,
        level: 1
      },
      ownedEquipmentIds: [],
      equippedBySlot: {},
      itemXp: {},
      itemRank: {}
    },
    equipmentDefinitions: [],
    taskDefinitions: []
  };
  function createEventBus() {
    const listenersByEvent = /* @__PURE__ */ new Map();
    return {
      on(eventName, callback) {
        const existing = listenersByEvent.get(eventName) ?? [];
        existing.push(callback);
        listenersByEvent.set(eventName, existing);
      },
      emit(eventName, payload) {
        const listeners = listenersByEvent.get(eventName) ?? [];
        listeners.forEach((listener) => listener(payload));
      }
    };
  }
  var eventBus = createEventBus();
  function toLocalId(scopedId = "") {
    const separatorIndex = scopedId.indexOf(":");
    if (separatorIndex < 0) {
      return scopedId;
    }
    return scopedId.slice(separatorIndex + 1);
  }
  function buildDefaultTaskDefinitions() {
    return [
      ...statRegistry.map((stat) => ({
        id: stat.id,
        label: `${stat.label} Training`,
        type: "stat",
        stat: stat.id
      })),
      ...jobRegistry.map((job) => ({
        id: job.id,
        label: job.label,
        type: "job",
        job: job.id
      })),
      { id: "idle", label: "Idle", type: "idle" }
    ];
  }
  var taskMeta = {};
  var taskOrder = [];
  var masteryTaskOrder = [];
  var activeTask = "idle";
  var previousTimestamp = performance.now();
  var statCardsContainer = document.querySelector(".stats");
  var controlsContainer = document.querySelector(".controls");
  var masteryGridEl = document.querySelector(".mastery-grid");
  var equipmentDetailsEl = document.querySelector("#equipment-details");
  var economyEls = {
    money: document.querySelector("#money-value"),
    jobXp: document.querySelector("#job-xp-value"),
    jobLevel: document.querySelector("#job-level-value")
  };
  var activeTaskEl = document.querySelector("#active-task strong");
  var nextGainEl = document.querySelector("#next-gain");
  function isFileProtocol() {
    return globalThis.location?.protocol === "file:";
  }
  function titleCase(input) {
    return input.charAt(0).toUpperCase() + input.slice(1);
  }
  function createStatCardMarkup(stat) {
    return `
    <article class="stat-card" data-stat="${stat.id}" data-category="${stat.category}">
      <h2>${stat.label}</h2>
      <p class="stat-meta">Category: ${titleCase(stat.category)}</p>
      <p class="stat-value" id="${stat.id}-value">${stat.baseValue}</p>
      <div class="progress-track">
        <div class="progress-fill" id="${stat.id}-progress"></div>
      </div>
      <p class="progress-label" id="${stat.id}-label">Idle</p>
    </article>
  `;
  }
  function createTaskButtonMarkup(taskName, task) {
    if (taskName === "idle") {
      return '<button class="task-btn idle" data-task="idle">Idle</button>';
    }
    if (task.type === "job") {
      return `<button class="task-btn work" data-task="${taskName}">${task.label} <span>+$ / +XP</span></button>`;
    }
    return `<button class="task-btn" data-task="${taskName}">${task.label} <span>+${taskName.toUpperCase().slice(0, 3)}</span></button>`;
  }
  function createMasteryCardMarkup(taskName) {
    return `<article class="mastery-card" id="mastery-${taskName}"></article>`;
  }
  function rebuildTaskCollections() {
    const definitions = Array.isArray(state.taskDefinitions) && state.taskDefinitions.length > 0 ? state.taskDefinitions : buildDefaultTaskDefinitions();
    const nextMeta = {};
    const seen = /* @__PURE__ */ new Set();
    definitions.forEach((task) => {
      if (!task?.id || seen.has(task.id)) {
        return;
      }
      if (task.type === "stat") {
        const linkedStatId = task.stat ?? task.id;
        const resolvedStat = getStatById(linkedStatId) ?? getStatById(toLocalId(linkedStatId));
        if (!resolvedStat) {
          return;
        }
        nextMeta[task.id] = {
          label: task.label ?? `${resolvedStat.label} Training`,
          type: "stat",
          stat: resolvedStat.id
        };
        seen.add(task.id);
        return;
      }
      if (task.type === "job") {
        const linkedJobId = task.job ?? task.id;
        const resolvedJob = getJobById(linkedJobId) ?? getJobById(toLocalId(linkedJobId));
        if (!resolvedJob) {
          return;
        }
        nextMeta[task.id] = {
          label: task.label ?? resolvedJob.label,
          type: "job",
          job: resolvedJob.id
        };
        seen.add(task.id);
        return;
      }
      if (task.type === "idle") {
        nextMeta[task.id] = {
          label: task.label ?? "Idle",
          type: "idle"
        };
        seen.add(task.id);
      }
    });
    if (!nextMeta.idle) {
      nextMeta.idle = { label: "Idle", type: "idle" };
    }
    taskMeta = nextMeta;
    taskOrder = [...Object.keys(taskMeta).filter((taskId) => taskId !== "idle"), "idle"];
    masteryTaskOrder = taskOrder.filter((taskName) => taskName !== "idle");
  }
  function toTaskProgress(source) {
    return normalizeTaskProgressEntry(source);
  }
  function ensureTaskState() {
    const existing = state.runtime.taskProgress ?? {};
    const nextProgress = {};
    masteryTaskOrder.forEach((taskName) => {
      nextProgress[taskName] = toTaskProgress(existing[taskName]);
    });
    state.runtime.taskProgress = nextProgress;
  }
  function baseSecondsForTask(taskName) {
    const task = taskMeta[taskName];
    if (task?.type === "job") {
      return getJobById(task.job)?.baseSeconds ?? 4;
    }
    return getStatById(task?.stat)?.growth.taskBaseSeconds ?? 2.5;
  }
  function scaleFactorForTask(taskName) {
    const task = taskMeta[taskName];
    if (task?.type === "job") {
      return getJobById(task.job)?.scaleFactor ?? 0.2;
    }
    return getStatById(task?.stat)?.growth.taskScaleFactor ?? 0.3;
  }
  function renderStaticCollections() {
    statCardsContainer.innerHTML = statRegistry.map(createStatCardMarkup).join("");
    controlsContainer.innerHTML = taskOrder.map((taskName) => createTaskButtonMarkup(taskName, taskMeta[taskName])).join("");
    masteryGridEl.innerHTML = masteryTaskOrder.map(createMasteryCardMarkup).join("");
  }
  var statEls = {};
  var masteryEls = {};
  var buttons = [];
  function bindTaskControls() {
    statEls = Object.fromEntries(
      statRegistry.map((stat) => {
        const id = stat.id;
        return [
          id,
          {
            value: document.querySelector(`#${id}-value`),
            bar: document.querySelector(`#${id}-progress`),
            label: document.querySelector(`#${id}-label`),
            card: document.querySelector(`[data-stat="${id}"]`)
          }
        ];
      })
    );
    masteryEls = Object.fromEntries(
      masteryTaskOrder.map((taskName) => [
        taskName,
        document.querySelector(`#mastery-${taskName}`)
      ])
    );
    buttons = [...document.querySelectorAll(".task-btn")];
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        selectTask(button.dataset.task);
      });
    });
  }
  function secondsForNextCompletion(taskName) {
    if (taskName === "idle") {
      return Infinity;
    }
    const currentTaskLevel = state.runtime.taskProgress[taskName].level;
    return baseSecondsForTask(taskName) * (1 + currentTaskLevel * scaleFactorForTask(taskName));
  }
  function updateTaskMastery(taskName) {
    const task = state.runtime.taskProgress[taskName];
    const tier = Math.floor(task.level / MASTERY_LEVEL_STEP);
    task.masteryTier = tier;
    task.masteryMultiplier = 1 + tier * MASTERY_BONUS_STEP;
  }
  function gainJobExperience(amount) {
    state.runtime.job.xp += amount;
    let required = JOB_LEVEL_XP_BASE * JOB_LEVEL_XP_SCALE ** (state.runtime.job.level - 1);
    while (state.runtime.job.xp >= required) {
      state.runtime.job.xp -= required;
      state.runtime.job.level += 1;
      required = JOB_LEVEL_XP_BASE * JOB_LEVEL_XP_SCALE ** (state.runtime.job.level - 1);
    }
  }
  function applyTaskReward(taskName) {
    const task = state.runtime.taskProgress[taskName];
    task.level += 1;
    updateTaskMastery(taskName);
    if (taskMeta[taskName]?.type === "job") {
      const job = getJobById(taskMeta[taskName].job);
      const moneyGain = (job?.moneyBase ?? 0) * state.runtime.job.level * task.masteryMultiplier;
      const xpGain = (job?.xpBase ?? 0) * task.masteryMultiplier;
      state.runtime.money += moneyGain;
      gainJobExperience(xpGain);
      return;
    }
    const trainedStat = taskMeta[taskName].stat;
    const statDefinition = getStatById(trainedStat);
    const rewardPerCompletion = statDefinition?.growth.rewardPerCompletion ?? 1;
    const statGain = rewardPerCompletion * task.masteryMultiplier;
    state.runtime.stats[trainedStat].points += statGain;
  }
  function selectTask(taskName) {
    if (!taskMeta[taskName]) {
      return;
    }
    activeTask = taskName;
    buttons.forEach((button) => {
      button.classList.toggle("active", button.dataset.task === taskName);
    });
    Object.entries(statEls).forEach(([statName, els]) => {
      const training = taskMeta[taskName].stat === statName;
      els.card.classList.toggle("training", training);
    });
    activeTaskEl.textContent = taskMeta[taskName].label;
    eventBus.emit("task:changed", { taskName });
  }
  function loop() {
    const now = performance.now();
    const deltaSeconds = (now - previousTimestamp) / 1e3;
    previousTimestamp = now;
    if (activeTask !== "idle") {
      const elapsedStore = state.runtime.taskProgress[activeTask];
      elapsedStore.elapsed += deltaSeconds;
      let needed = secondsForNextCompletion(activeTask);
      while (elapsedStore.elapsed >= needed) {
        elapsedStore.elapsed -= needed;
        applyTaskReward(activeTask);
        eventBus.emit("task:levelChanged", { taskName: activeTask });
        eventBus.emit("task:masteryChanged", { taskName: activeTask });
        needed = secondsForNextCompletion(activeTask);
      }
    }
    render();
  }
  function renderMasteryCard(taskName, card) {
    const task = state.runtime.taskProgress[taskName];
    card.innerHTML = `
    <h3>${taskMeta[taskName].label}</h3>
    <p>Task Level: <strong>${task.level}</strong></p>
    <p>Mastery Tier: <strong>${task.masteryTier}</strong></p>
    <p>Multiplier: <strong>x${task.masteryMultiplier.toFixed(2)}</strong></p>
  `;
  }
  function renderEquipmentTemplates() {
    if (!equipmentDetailsEl) {
      return;
    }
    const model = buildEquipmentViewModel({
      equipmentDefinitions: state.equipmentDefinitions,
      ownedEquipmentIds: state.runtime.ownedEquipmentIds,
      equippedBySlot: state.runtime.equippedBySlot
    });
    const rows = state.equipmentDefinitions.map((item) => {
      const effects = Object.entries(item.baseEffects ?? {}).map(([effect, value]) => `${effect}: x${value}`).join(", ");
      const owned = model.ownedEquipment.some((ownedItem) => ownedItem.id === item.id);
      const equipped = Object.values(model.equippedEquipment).some((equippedItem) => equippedItem.id === item.id);
      return `<li><strong>${item.name}</strong> (${item.slot}) \u2014 ${effects || "No effects"}${owned ? " \u2022 owned" : ""}${equipped ? " \u2022 equipped" : ""}</li>`;
    }).join("");
    equipmentDetailsEl.innerHTML = `<ul>${rows || "<li>No equipment templates found.</li>"}</ul>`;
  }
  function render() {
    statRegistry.forEach((stat) => {
      const statName = stat.id;
      const els = statEls[statName];
      const stateForStat = state.runtime.stats[statName];
      const neededSeconds = secondsForNextCompletion(statName);
      const progress = Math.min(state.runtime.taskProgress[statName].elapsed / neededSeconds * 100, 100);
      els.value.textContent = stateForStat.points.toFixed(2);
      els.bar.style.width = `${progress.toFixed(2)}%`;
      els.label.textContent = `Next completion in ${neededSeconds.toFixed(1)}s`;
    });
    const requiredXp = JOB_LEVEL_XP_BASE * JOB_LEVEL_XP_SCALE ** (state.runtime.job.level - 1);
    economyEls.money.textContent = `$${state.runtime.money.toFixed(2)}`;
    economyEls.jobXp.textContent = `${state.runtime.job.xp.toFixed(2)} / ${requiredXp.toFixed(2)}`;
    economyEls.jobLevel.textContent = `${state.runtime.job.level}`;
    Object.entries(masteryEls).forEach(([taskName, card]) => {
      renderMasteryCard(taskName, card);
    });
    if (activeTask === "idle") {
      nextGainEl.textContent = "Next completion in --";
      return;
    }
    const elapsedStore = state.runtime.taskProgress[activeTask];
    const remaining = Math.max(secondsForNextCompletion(activeTask) - elapsedStore.elapsed, 0);
    nextGainEl.textContent = `Next completion in ${remaining.toFixed(1)}s`;
  }
  async function loadEquipmentDefinitions() {
    if (isFileProtocol()) {
      return;
    }
    try {
      const response = await fetch("./data/equipment.json");
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      const validation = validateEquipmentDefinitions(payload);
      if (validation.isValid) {
        state.equipmentDefinitions = payload;
        return;
      }
      console.error("Skipping invalid equipment definitions.", validation.errors);
    } catch {
    }
  }
  async function loadTaskDefinitions() {
    if (isFileProtocol()) {
      state.taskDefinitions = buildDefaultTaskDefinitions();
      return;
    }
    try {
      const [pack, tasks] = await Promise.all([
        fetch("./content/packs/base/pack.json"),
        fetch("./content/packs/base/tasks.json")
      ]);
      if (!pack.ok || !tasks.ok) {
        state.taskDefinitions = buildDefaultTaskDefinitions();
        return;
      }
      const merged = mergeContentPacks({
        packs: {
          base: {
            pack: await pack.json(),
            tasks: await tasks.json()
          }
        },
        activePackIds: ["base"]
      });
      state.taskDefinitions = merged.tasks;
    } catch {
      state.taskDefinitions = buildDefaultTaskDefinitions();
    }
  }
  var saveService = createSaveService({
    getRuntimeState: () => state.runtime,
    on: eventBus.on.bind(eventBus),
    intervalMs: 1e4
  });
  async function init() {
    state.runtime = saveService.loadGame();
    await loadTaskDefinitions();
    rebuildTaskCollections();
    ensureTaskState();
    renderStaticCollections();
    bindTaskControls();
    await loadEquipmentDefinitions();
    renderEquipmentTemplates();
    selectTask("idle");
    render();
    saveService.start();
    setInterval(loop, LOOP_MS);
    globalThis.addEventListener("beforeunload", () => {
      saveService.saveGame();
    });
  }
  init();
})();
