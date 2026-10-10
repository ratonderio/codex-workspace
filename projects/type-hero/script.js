import {
  createDefaultStatsState,
  getStatById,
  statRegistry,
} from './src/domain/stats/registry.js';
import { getJobById, jobRegistry } from './src/domain/jobs/registry.js';
import { buildEquipmentViewModel } from './src/equipment-ui.js';
import { createSaveService } from './src/save-service.js';
import { normalizeTaskProgressEntry } from './src/domain/tasks/progress.js';
import { validateEquipmentDefinitions } from './src/domain/equipment/schema.js';
import { mergeContentPacks } from './src/content/pack-loader.js';

const MASTERY_LEVEL_STEP = 100;
const MASTERY_BONUS_STEP = 0.05;
const LOOP_MS = 100;
const JOB_LEVEL_XP_BASE = 24;
const JOB_LEVEL_XP_SCALE = 1.28;

const state = {
  runtime: {
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
  },
  equipmentDefinitions: [],
  taskDefinitions: [],
};

function createEventBus() {
  const listenersByEvent = new Map();

  return {
    on(eventName, callback) {
      const existing = listenersByEvent.get(eventName) ?? [];
      existing.push(callback);
      listenersByEvent.set(eventName, existing);
    },
    emit(eventName, payload) {
      const listeners = listenersByEvent.get(eventName) ?? [];
      listeners.forEach((listener) => listener(payload));
    },
  };
}

const eventBus = createEventBus();

function toLocalId(scopedId = '') {
  const separatorIndex = scopedId.indexOf(':');
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
      type: 'stat',
      stat: stat.id,
    })),
    ...jobRegistry.map((job) => ({
      id: job.id,
      label: job.label,
      type: 'job',
      job: job.id,
    })),
    { id: 'idle', label: 'Idle', type: 'idle' },
  ];
}

let taskMeta = {};
let taskOrder = [];
let masteryTaskOrder = [];

let activeTask = 'idle';
let previousTimestamp = performance.now();

const statCardsContainer = document.querySelector('.stats');
const controlsContainer = document.querySelector('.controls');
const masteryGridEl = document.querySelector('.mastery-grid');
const equipmentDetailsEl = document.querySelector('#equipment-details');

const economyEls = {
  money: document.querySelector('#money-value'),
  jobXp: document.querySelector('#job-xp-value'),
  jobLevel: document.querySelector('#job-level-value'),
};

const activeTaskEl = document.querySelector('#active-task strong');
const nextGainEl = document.querySelector('#next-gain');


function isFileProtocol() {
  return globalThis.location?.protocol === 'file:';
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
  if (taskName === 'idle') {
    return '<button class="task-btn idle" data-task="idle">Idle</button>';
  }

  if (task.type === 'job') {
    return `<button class="task-btn work" data-task="${taskName}">${task.label} <span>+$ / +XP</span></button>`;
  }

  return `<button class="task-btn" data-task="${taskName}">${task.label} <span>+${taskName.toUpperCase().slice(0, 3)}</span></button>`;
}

function createMasteryCardMarkup(taskName) {
  return `<article class="mastery-card" id="mastery-${taskName}"></article>`;
}

function rebuildTaskCollections() {
  const definitions = Array.isArray(state.taskDefinitions) && state.taskDefinitions.length > 0
    ? state.taskDefinitions
    : buildDefaultTaskDefinitions();

  const nextMeta = {};
  const seen = new Set();

  definitions.forEach((task) => {
    if (!task?.id || seen.has(task.id)) {
      return;
    }

    if (task.type === 'stat') {
      const linkedStatId = task.stat ?? task.id;
      const resolvedStat = getStatById(linkedStatId) ?? getStatById(toLocalId(linkedStatId));
      if (!resolvedStat) {
        return;
      }

      nextMeta[task.id] = {
        label: task.label ?? `${resolvedStat.label} Training`,
        type: 'stat',
        stat: resolvedStat.id,
      };
      seen.add(task.id);
      return;
    }

    if (task.type === 'job') {
      const linkedJobId = task.job ?? task.id;
      const resolvedJob = getJobById(linkedJobId) ?? getJobById(toLocalId(linkedJobId));
      if (!resolvedJob) {
        return;
      }

      nextMeta[task.id] = {
        label: task.label ?? resolvedJob.label,
        type: 'job',
        job: resolvedJob.id,
      };
      seen.add(task.id);
      return;
    }

    if (task.type === 'idle') {
      nextMeta[task.id] = {
        label: task.label ?? 'Idle',
        type: 'idle',
      };
      seen.add(task.id);
    }
  });

  if (!nextMeta.idle) {
    nextMeta.idle = { label: 'Idle', type: 'idle' };
  }

  taskMeta = nextMeta;
  taskOrder = [...Object.keys(taskMeta).filter((taskId) => taskId !== 'idle'), 'idle'];
  masteryTaskOrder = taskOrder.filter((taskName) => taskName !== 'idle');
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

  if (task?.type === 'job') {
    return getJobById(task.job)?.baseSeconds ?? 4;
  }

  return getStatById(task?.stat)?.growth.taskBaseSeconds ?? 2.5;
}

function scaleFactorForTask(taskName) {
  const task = taskMeta[taskName];

  if (task?.type === 'job') {
    return getJobById(task.job)?.scaleFactor ?? 0.2;
  }

  return getStatById(task?.stat)?.growth.taskScaleFactor ?? 0.3;
}

function renderStaticCollections() {
  statCardsContainer.innerHTML = statRegistry.map(createStatCardMarkup).join('');

  controlsContainer.innerHTML = taskOrder
    .map((taskName) => createTaskButtonMarkup(taskName, taskMeta[taskName]))
    .join('');

  masteryGridEl.innerHTML = masteryTaskOrder.map(createMasteryCardMarkup).join('');
}

let statEls = {};
let masteryEls = {};
let buttons = [];

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
          card: document.querySelector(`[data-stat="${id}"]`),
        },
      ];
    }),
  );

  masteryEls = Object.fromEntries(
    masteryTaskOrder.map((taskName) => [
      taskName,
      document.querySelector(`#mastery-${taskName}`),
    ]),
  );

  buttons = [...document.querySelectorAll('.task-btn')];
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      selectTask(button.dataset.task);
    });
  });
}

function secondsForNextCompletion(taskName) {
  if (taskName === 'idle') {
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

  if (taskMeta[taskName]?.type === 'job') {
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
    button.classList.toggle('active', button.dataset.task === taskName);
  });

  Object.entries(statEls).forEach(([statName, els]) => {
    const training = taskMeta[taskName].stat === statName;
    els.card.classList.toggle('training', training);
  });

  activeTaskEl.textContent = taskMeta[taskName].label;
  eventBus.emit('task:changed', { taskName });
}

function loop() {
  const now = performance.now();
  const deltaSeconds = (now - previousTimestamp) / 1000;
  previousTimestamp = now;

  if (activeTask !== 'idle') {
    const elapsedStore = state.runtime.taskProgress[activeTask];
    elapsedStore.elapsed += deltaSeconds;

    let needed = secondsForNextCompletion(activeTask);
    while (elapsedStore.elapsed >= needed) {
      elapsedStore.elapsed -= needed;
      applyTaskReward(activeTask);
      eventBus.emit('task:levelChanged', { taskName: activeTask });
      eventBus.emit('task:masteryChanged', { taskName: activeTask });
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
    equippedBySlot: state.runtime.equippedBySlot,
  });

  const rows = state.equipmentDefinitions
    .map((item) => {
      const effects = Object.entries(item.baseEffects ?? {})
        .map(([effect, value]) => `${effect}: x${value}`)
        .join(', ');
      const owned = model.ownedEquipment.some((ownedItem) => ownedItem.id === item.id);
      const equipped = Object.values(model.equippedEquipment).some((equippedItem) => equippedItem.id === item.id);

      return `<li><strong>${item.name}</strong> (${item.slot}) — ${effects || 'No effects'}${owned ? ' • owned' : ''}${equipped ? ' • equipped' : ''}</li>`;
    })
    .join('');

  equipmentDetailsEl.innerHTML = `<ul>${rows || '<li>No equipment templates found.</li>'}</ul>`;
}

function render() {
  statRegistry.forEach((stat) => {
    const statName = stat.id;
    const els = statEls[statName];
    const stateForStat = state.runtime.stats[statName];
    const neededSeconds = secondsForNextCompletion(statName);
    const progress = Math.min((state.runtime.taskProgress[statName].elapsed / neededSeconds) * 100, 100);

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

  if (activeTask === 'idle') {
    nextGainEl.textContent = 'Next completion in --';
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
    const response = await fetch('./data/equipment.json');
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    const validation = validateEquipmentDefinitions(payload);
    if (validation.isValid) {
      state.equipmentDefinitions = payload;
      return;
    }

    console.error('Skipping invalid equipment definitions.', validation.errors);
  } catch {
    // Best effort; keep app running without equipment definitions.
  }
}

async function loadTaskDefinitions() {
  if (isFileProtocol()) {
    state.taskDefinitions = buildDefaultTaskDefinitions();
    return;
  }

  try {
    const [pack, tasks] = await Promise.all([
      fetch('./content/packs/base/pack.json'),
      fetch('./content/packs/base/tasks.json'),
    ]);

    if (!pack.ok || !tasks.ok) {
      state.taskDefinitions = buildDefaultTaskDefinitions();
      return;
    }

    const merged = mergeContentPacks({
      packs: {
        base: {
          pack: await pack.json(),
          tasks: await tasks.json(),
        },
      },
      activePackIds: ['base'],
    });

    state.taskDefinitions = merged.tasks;
  } catch {
    state.taskDefinitions = buildDefaultTaskDefinitions();
  }
}

const saveService = createSaveService({
  getRuntimeState: () => state.runtime,
  on: eventBus.on.bind(eventBus),
  intervalMs: 10_000,
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

  selectTask('idle');
  render();
  saveService.start();
  setInterval(loop, LOOP_MS);

  globalThis.addEventListener('beforeunload', () => {
    saveService.saveGame();
  });
}

init();
