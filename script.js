const stats = {
  strength: { points: 0 },
  endurance: { points: 0 },
  dexterity: { points: 0 },
};

const economy = {
  money: 0,
  jobXp: 0,
  jobLevel: 1,
};

const taskMeta = {
  strength: { label: "Lift Weights", stat: "strength" },
  endurance: { label: "Long Run", stat: "endurance" },
  dexterity: { label: "Precision Drill", stat: "dexterity" },
  work: { label: "Warehouse Shift", stat: null },
  idle: { label: "Idle", stat: null },
};

const taskState = {
  strength: { level: 0, masteryTier: 0, masteryMultiplier: 1, elapsed: 0 },
  endurance: { level: 0, masteryTier: 0, masteryMultiplier: 1, elapsed: 0 },
  dexterity: { level: 0, masteryTier: 0, masteryMultiplier: 1, elapsed: 0 },
  work: { level: 0, masteryTier: 0, masteryMultiplier: 1, elapsed: 0 },
};

const BASE_SECONDS = {
  strength: 2.5,
  endurance: 2.5,
  dexterity: 2.5,
  work: 3.2,
};

const SCALE_FACTOR = {
  strength: 0.38,
  endurance: 0.38,
  dexterity: 0.38,
  work: 0.22,
};

const MASTERY_LEVEL_STEP = 100;
const MASTERY_BONUS_STEP = 0.05;
const LOOP_MS = 100;

let activeTask = "idle";
let previousTimestamp = performance.now();

const statEls = {
  strength: {
    value: document.querySelector("#strength-value"),
    bar: document.querySelector("#strength-progress"),
    label: document.querySelector("#strength-label"),
    card: document.querySelector('[data-stat="strength"]'),
  },
  endurance: {
    value: document.querySelector("#endurance-value"),
    bar: document.querySelector("#endurance-progress"),
    label: document.querySelector("#endurance-label"),
    card: document.querySelector('[data-stat="endurance"]'),
  },
  dexterity: {
    value: document.querySelector("#dexterity-value"),
    bar: document.querySelector("#dexterity-progress"),
    label: document.querySelector("#dexterity-label"),
    card: document.querySelector('[data-stat="dexterity"]'),
  },
};

const economyEls = {
  money: document.querySelector("#money-value"),
  jobXp: document.querySelector("#job-xp-value"),
  jobLevel: document.querySelector("#job-level-value"),
};

const masteryEls = {
  strength: document.querySelector("#mastery-strength"),
  endurance: document.querySelector("#mastery-endurance"),
  dexterity: document.querySelector("#mastery-dexterity"),
  work: document.querySelector("#mastery-work"),
};

const activeTaskEl = document.querySelector("#active-task strong");
const nextGainEl = document.querySelector("#next-gain");
const buttons = [...document.querySelectorAll(".task-btn")];

function secondsForNextCompletion(taskName) {
  if (taskName === "idle") {
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

  if (taskName === "work") {
    const moneyGain = 6 * economy.jobLevel * task.masteryMultiplier;
    const xpGain = 4 * task.masteryMultiplier;
    economy.money += moneyGain;
    economy.jobXp += xpGain;
    return;
  }

  const trainedStat = taskMeta[taskName].stat;
  const statGain = 1 * task.masteryMultiplier;
  stats[trainedStat].points += statGain;
}

function selectTask(taskName) {
  activeTask = taskName;

  buttons.forEach((button) => {
    button.classList.toggle("active", button.dataset.task === taskName);
  });

  Object.entries(statEls).forEach(([statName, els]) => {
    const training = taskMeta[taskName].stat === statName;
    els.card.classList.toggle("training", training);
  });

  activeTaskEl.textContent = taskMeta[taskName].label;
}

function loop() {
  const now = performance.now();
  const deltaSeconds = (now - previousTimestamp) / 1000;
  previousTimestamp = now;

  if (activeTask !== "idle") {
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
  Object.entries(statEls).forEach(([statName, els]) => {
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

  if (activeTask === "idle") {
    nextGainEl.textContent = "Next completion in --";
    return;
  }

  const elapsedStore = taskState[activeTask];
  const remaining = Math.max(secondsForNextCompletion(activeTask) - elapsedStore.elapsed, 0);
  nextGainEl.textContent = `Next completion in ${remaining.toFixed(1)}s`;
}

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    selectTask(button.dataset.task);
  });
});

selectTask("idle");
render();
setInterval(loop, LOOP_MS);
