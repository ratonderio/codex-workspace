import {
  createDefaultStatsState,
  getStatById,
  statRegistry,
} from './src/domain/stats/registry.js';

const stats = createDefaultStatsState();

const economy = {
  money: 0,
  jobXp: 0,
  jobLevel: 1,
};

const statTaskMeta = Object.fromEntries(
  statRegistry.map((stat) => [
    stat.id,
    {
      label: `${stat.label} Training`,
      stat: stat.id,
    },
  ]),
);

const taskMeta = {
  ...statTaskMeta,
  work: { label: 'Warehouse Shift', stat: null },
  idle: { label: 'Idle', stat: null },
};

const taskState = Object.fromEntries(
  Object.keys(taskMeta)
    .filter((taskName) => taskName !== 'idle')
    .map((taskName) => [
      taskName,
      { level: 0, masteryTier: 0, masteryMultiplier: 1, elapsed: 0 },
    ]),
);

const BASE_SECONDS = Object.fromEntries([
  ...statRegistry.map((stat) => [stat.id, stat.growth.taskBaseSeconds]),
  ['work', 3.2],
]);

const SCALE_FACTOR = Object.fromEntries([
  ...statRegistry.map((stat) => [stat.id, stat.growth.taskScaleFactor]),
  ['work', 0.22],
]);

const MASTERY_LEVEL_STEP = 100;
const MASTERY_BONUS_STEP = 0.05;
const LOOP_MS = 100;

let activeTask = 'idle';
let previousTimestamp = performance.now();

const statCardsContainer = document.querySelector('.stats');
const controlsContainer = document.querySelector('.controls');
const masteryGridEl = document.querySelector('.mastery-grid');

const economyEls = {
  money: document.querySelector('#money-value'),
  jobXp: document.querySelector('#job-xp-value'),
  jobLevel: document.querySelector('#job-level-value'),
};

const activeTaskEl = document.querySelector('#active-task strong');
const nextGainEl = document.querySelector('#next-gain');

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
  if (taskName === 'work') {
    return `<button class="task-btn work" data-task="work">${task.label} <span>+$ / +XP</span></button>`;
  }

  if (taskName === 'idle') {
    return '<button class="task-btn idle" data-task="idle">Idle</button>';
  }

  return `<button class="task-btn" data-task="${taskName}">${task.label} <span>+${taskName.toUpperCase().slice(0, 3)}</span></button>`;
}

function createMasteryCardMarkup(taskName) {
  return `<article class="mastery-card" id="mastery-${taskName}"></article>`;
}

function renderStaticCollections() {
  statCardsContainer.innerHTML = statRegistry.map(createStatCardMarkup).join('');

  const taskButtonOrder = [...statRegistry.map((stat) => stat.id), 'work', 'idle'];
  controlsContainer.innerHTML = taskButtonOrder
    .map((taskName) => createTaskButtonMarkup(taskName, taskMeta[taskName]))
    .join('');

  const masteryTaskOrder = [...statRegistry.map((stat) => stat.id), 'work'];
  masteryGridEl.innerHTML = masteryTaskOrder.map(createMasteryCardMarkup).join('');
}

renderStaticCollections();

const statEls = Object.fromEntries(
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

const masteryEls = {
  ...Object.fromEntries(
    Object.keys(statTaskMeta).map((taskName) => [
      taskName,
      document.querySelector(`#mastery-${taskName}`),
    ]),
  ),
  work: document.querySelector('#mastery-work'),
};

const buttons = [...document.querySelectorAll('.task-btn')];

function secondsForNextCompletion(taskName) {
  if (taskName === 'idle') {
    return Infinity;
  }

  const currentTaskLevel = taskState[taskName].level;
  return BASE_SECONDS[taskName] * (1 + currentTaskLevel * SCALE_FACTOR[taskName]);
}

function updateTaskMastery(taskName) {
  const level = taskState[taskName].level;
  const tier = Math.floor(level / MASTERY_LEVEL_STEP);
  taskState[taskName].masteryTier = tier;
  taskState[taskName].masteryMultiplier = 1 + tier * MASTERY_BONUS_STEP;
}

function applyTaskReward(taskName) {
  const task = taskState[taskName];
  task.level += 1;
  updateTaskMastery(taskName);

  if (taskName === 'work') {
    const moneyGain = 6 * economy.jobLevel * task.masteryMultiplier;
    const xpGain = 4 * task.masteryMultiplier;
    economy.money += moneyGain;
    economy.jobXp += xpGain;
    return;
  }

  const trainedStat = taskMeta[taskName].stat;
  const statDefinition = getStatById(trainedStat);
  const rewardPerCompletion = statDefinition?.growth.rewardPerCompletion ?? 1;
  const statGain = rewardPerCompletion * task.masteryMultiplier;
  stats[trainedStat].points += statGain;
}

function selectTask(taskName) {
  activeTask = taskName;

  buttons.forEach((button) => {
    button.classList.toggle('active', button.dataset.task === taskName);
  });

  Object.entries(statEls).forEach(([statName, els]) => {
    const training = taskMeta[taskName].stat === statName;
    els.card.classList.toggle('training', training);
  });

  activeTaskEl.textContent = taskMeta[taskName].label;
}

function loop() {
  const now = performance.now();
  const deltaSeconds = (now - previousTimestamp) / 1000;
  previousTimestamp = now;

  if (activeTask !== 'idle') {
    const elapsedStore = taskState[activeTask];
    elapsedStore.elapsed += deltaSeconds;

    const needed = secondsForNextCompletion(activeTask);
    while (elapsedStore.elapsed >= needed) {
      elapsedStore.elapsed -= needed;
      applyTaskReward(activeTask);
    }
  }

  render();
}

function renderMasteryCard(taskName, card) {
  const task = taskState[taskName];
  card.innerHTML = `
    <h3>${taskMeta[taskName].label}</h3>
    <p>Task Level: <strong>${task.level}</strong></p>
    <p>Mastery Tier: <strong>${task.masteryTier}</strong></p>
    <p>Multiplier: <strong>x${task.masteryMultiplier.toFixed(2)}</strong></p>
  `;
}

function render() {
  statRegistry.forEach((stat) => {
    const statName = stat.id;
    const els = statEls[statName];
    const state = stats[statName];
    const neededSeconds = secondsForNextCompletion(statName);
    const progress = Math.min((taskState[statName].elapsed / neededSeconds) * 100, 100);

    els.value.textContent = state.points.toFixed(2);
    els.bar.style.width = `${progress.toFixed(2)}%`;
    els.label.textContent = `Next completion in ${neededSeconds.toFixed(1)}s`;
  });

  economyEls.money.textContent = `$${economy.money.toFixed(2)}`;
  economyEls.jobXp.textContent = economy.jobXp.toFixed(2);
  economyEls.jobLevel.textContent = `${economy.jobLevel} (placeholder)`;

  Object.entries(masteryEls).forEach(([taskName, card]) => {
    renderMasteryCard(taskName, card);
  });

  if (activeTask === 'idle') {
    nextGainEl.textContent = 'Next completion in --';
    return;
  }

  const elapsedStore = taskState[activeTask];
  const remaining = Math.max(secondsForNextCompletion(activeTask) - elapsedStore.elapsed, 0);
  nextGainEl.textContent = `Next completion in ${remaining.toFixed(1)}s`;
}

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    selectTask(button.dataset.task);
  });
});

selectTask('idle');
render();
setInterval(loop, LOOP_MS);
