const FINAL_REVIEW_DATE = new Date("2026-05-06T09:00:00");

const CONFIG = {
  updateMs: 1000,
  statStepMinutes: 5,
  statsMin: 0,
  statsMax: 100,
};

const BASE_STATS = {
  sleep: 72,
  stress: 24,
  energy: 70,
  progress: 6,
  health: 85,
};

const ACTIONS = [
  { name: "Coffee", effects: { energy: +12, stress: +4, sleep: -5 } },
  { name: "Instant Noodles", effects: { energy: +8, health: -5, stress: -2 } },
  { name: "Printing Paper", effects: { progress: +6, stress: -1 } },
  { name: "Model Materials", effects: { progress: +8, stress: +4, energy: -3 } },
  { name: "USB Save", effects: { stress: -10, progress: +2 } },
  { name: "Red Pen Notes", effects: { progress: +4, stress: +1 } },
  { name: "Desk Nap", effects: { sleep: +16, energy: +8, progress: -2 } },
  { name: "Crit Encouragement", effects: { stress: -8, health: +4 } },
  { name: "Computer Boost", effects: { progress: +10, energy: -9, stress: +2 } },
  { name: "Model Boost", effects: { progress: +11, stress: +6, energy: -4 } },
];

const SCHEDULE_EFFECTS = {
  school: { progress: +0.35, stress: +0.30, energy: -0.30, sleep: -0.22, health: -0.08 },
  dinner: { energy: +0.28, stress: -0.25, health: +0.14, sleep: +0.05 },
  projectDigital: { progress: +0.45, energy: -0.45, sleep: -0.25, stress: +0.20, health: -0.12 },
  projectModel: { progress: +0.42, stress: +0.42, energy: -0.30, sleep: -0.20, health: -0.10 },
  sleep: { sleep: +0.65, energy: +0.48, stress: -0.35, health: +0.21 },
  passive: { sleep: -0.12, stress: +0.10, energy: -0.12, health: -0.05 },
};

const STATE = {
  running: false,
  playerName: "",
  gender: "male",
  stats: { ...BASE_STATS },
  lastUpdateAt: Date.now(),
  timerId: null,
  miniTimerId: null,
  miniTimeLeft: 0,
  miniScore: 0,
};

const statOrder = ["sleep", "stress", "energy", "progress", "health"];

const els = {
  startScreen: document.getElementById("startScreen"),
  gameScreen: document.getElementById("gameScreen"),
  endScreen: document.getElementById("endScreen"),
  startBtn: document.getElementById("startBtn"),
  restartBtn: document.getElementById("restartBtn"),
  studentName: document.getElementById("studentName"),
  studentDisplayName: document.getElementById("studentDisplayName"),
  studentAvatar: document.getElementById("studentAvatar"),
  periodLabel: document.getElementById("periodLabel"),
  clockLabel: document.getElementById("clockLabel"),
  liveClock: document.getElementById("liveClock"),
  countdown: document.getElementById("countdown"),
  statusText: document.getElementById("statusText"),
  statsContainer: document.getElementById("statsContainer"),
  actionsContainer: document.getElementById("actionsContainer"),
  endTitle: document.getElementById("endTitle"),
  endMessage: document.getElementById("endMessage"),
  startMiniBtn: document.getElementById("startMiniBtn"),
  miniArea: document.getElementById("miniArea"),
  miniScore: document.getElementById("miniScore"),
  miniTimer: document.getElementById("miniTimer"),
};

function clamp(v) {
  return Math.max(CONFIG.statsMin, Math.min(CONFIG.statsMax, v));
}

function formatDateTime(date) {
  const dateText = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeText = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateText} • ${timeText}`;
}

function updateClockAndCountdown() {
  const now = new Date();
  els.liveClock.textContent = formatDateTime(now);
  els.clockLabel.textContent = formatDateTime(now);

  const diff = FINAL_REVIEW_DATE - now;
  if (diff <= 0) {
    els.countdown.textContent = "Final review day is here";
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  els.countdown.textContent = `${days}d ${hours}h ${mins}m`;
}

function periodType(date) {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour >= 10 && hour < 18) return "school";
  if (hour >= 18 && hour < 19) return "dinner";
  if (hour >= 19 || hour < 2) return "project";
  return "sleep";
}

function periodText(period) {
  if (period === "school") return "Current phase: School (10:00–18:00)";
  if (period === "dinner") return "Current phase: Dinner (18:00–19:00)";
  if (period === "project") return "Current phase: Project Work (19:00–02:00)";
  return "Current phase: Sleep (after 02:00)";
}

function adjustStats(changes) {
  Object.entries(changes).forEach(([k, v]) => {
    STATE.stats[k] = clamp(STATE.stats[k] + v);
  });
}

function createStatsUI() {
  els.statsContainer.innerHTML = "";
  statOrder.forEach((key) => {
    const row = document.createElement("div");
    row.className = "stat-row";
    row.innerHTML = `
      <strong>${capitalize(key)}</strong>
      <div class="bar"><div id="fill-${key}" class="fill"></div></div>
      <span id="value-${key}">0</span>
    `;
    els.statsContainer.appendChild(row);
  });
}

function renderStats() {
  statOrder.forEach((key) => {
    const value = Math.round(STATE.stats[key]);
    const fill = document.getElementById(`fill-${key}`);
    const label = document.getElementById(`value-${key}`);
    fill.style.width = `${value}%`;
    fill.style.background = statColor(key, value);
    label.textContent = value;
  });
}

function statColor(stat, value) {
  if (stat === "stress") {
    if (value >= 75) return "var(--bad)";
    if (value >= 45) return "var(--warn)";
    return "var(--good)";
  }
  if (value <= 28) return "var(--bad)";
  if (value <= 55) return "var(--warn)";
  return "var(--good)";
}

function createActionButtons() {
  els.actionsContainer.innerHTML = "";
  ACTIONS.forEach((action) => {
    const btn = document.createElement("button");
    btn.className = "btn action-btn";
    btn.type = "button";
    btn.textContent = action.name;
    btn.addEventListener("click", () => {
      adjustStats(action.effects);
      els.statusText.textContent = `${action.name} used. Studio morale adjusted.`;
      renderStats();
      checkEnding();
    });
    els.actionsContainer.appendChild(btn);
  });
}

function applyRealTimeEffects() {
  if (!STATE.running) return;

  const now = Date.now();
  const elapsedMs = now - STATE.lastUpdateAt;
  const stepMs = CONFIG.statStepMinutes * 60 * 1000;
  const steps = Math.floor(elapsedMs / stepMs);

  if (steps <= 0) {
    refreshLiveState(new Date(now));
    return;
  }

  for (let i = 0; i < steps; i += 1) {
    const sampleDate = new Date(STATE.lastUpdateAt + (i + 1) * stepMs);
    const period = periodType(sampleDate);

    if (period === "school") {
      adjustStats(SCHEDULE_EFFECTS.school);
    } else if (period === "dinner") {
      adjustStats(SCHEDULE_EFFECTS.dinner);
    } else if (period === "project") {
      if (sampleDate.getMinutes() % 10 === 0) {
        adjustStats(SCHEDULE_EFFECTS.projectDigital);
      } else {
        adjustStats(SCHEDULE_EFFECTS.projectModel);
      }
    } else {
      adjustStats(SCHEDULE_EFFECTS.sleep);
    }

    adjustStats(SCHEDULE_EFFECTS.passive);
  }

  STATE.lastUpdateAt += steps * stepMs;
  refreshLiveState(new Date(now));
  renderStats();
  checkEnding();
}

function refreshLiveState(dateObj) {
  const period = periodType(dateObj);
  els.periodLabel.textContent = periodText(period);

  if (period === "school") {
    els.statusText.textContent = `${STATE.playerName} is at school studio hours.`;
  } else if (period === "dinner") {
    els.statusText.textContent = `${STATE.playerName} is taking a dinner break.`;
  } else if (period === "project") {
    els.statusText.textContent = `${STATE.playerName} is pushing project work late into the night.`;
  } else {
    els.statusText.textContent = `${STATE.playerName} is sleeping after a long studio day.`;
  }
}

function checkEnding() {
  const s = STATE.stats;
  const burnout = s.health <= 0 || s.energy <= 0 || s.sleep <= 0 || s.stress >= 100;

  if (burnout) {
    endGame(
      "Burnout Ending: Desk Goblin Mode",
      `${STATE.playerName} tried to render with zero sleep and submitted an emotional support section cut. Time for recovery.`
    );
    return;
  }

  const now = new Date();
  if (now >= FINAL_REVIEW_DATE) {
    if (s.progress >= 65 && s.health > 20) {
      endGame(
        "Success Ending: Final Review Survivor",
        `${STATE.playerName} made it to May 6, 2026 and presented with courage, trace paper, and a mostly coherent narrative.`
      );
    } else {
      endGame(
        "Deadline Ending: Presentation by Vibes",
        `${STATE.playerName} reached final review day, but the boards were held together by glue, caffeine, and wishful thinking.`
      );
    }
  }
}

function endGame(title, message) {
  STATE.running = false;
  clearInterval(STATE.timerId);
  clearInterval(STATE.miniTimerId);
  els.gameScreen.classList.add("hidden");
  els.endScreen.classList.remove("hidden");
  els.endTitle.textContent = title;
  els.endMessage.textContent = message;
}

function startGame() {
  const name = els.studentName.value.trim();
  if (!name) {
    alert("Please enter a student name.");
    return;
  }

  STATE.playerName = name;
  STATE.gender = document.querySelector('input[name="gender"]:checked').value;
  STATE.stats = { ...BASE_STATS };
  STATE.running = true;
  STATE.lastUpdateAt = Date.now();

  els.studentDisplayName.textContent = `${STATE.playerName} (${capitalize(STATE.gender)})`;
  els.studentAvatar.className = `avatar ${STATE.gender}`;
  createStatsUI();
  createActionButtons();
  renderStats();
  updateClockAndCountdown();
  refreshLiveState(new Date());

  els.startScreen.classList.add("hidden");
  els.endScreen.classList.add("hidden");
  els.gameScreen.classList.remove("hidden");

  clearInterval(STATE.timerId);
  STATE.timerId = setInterval(() => {
    updateClockAndCountdown();
    applyRealTimeEffects();
  }, CONFIG.updateMs);
}

function spawnBubble() {
  const bubble = document.createElement("button");
  bubble.type = "button";
  bubble.className = "bubble";

  const area = els.miniArea.getBoundingClientRect();
  bubble.style.left = `${Math.random() * Math.max(10, area.width - 36)}px`;
  bubble.style.top = `${Math.random() * Math.max(10, area.height - 36)}px`;

  bubble.addEventListener("click", () => {
    STATE.miniScore += 1;
    els.miniScore.textContent = `Score: ${STATE.miniScore}`;
    bubble.remove();
  });

  els.miniArea.appendChild(bubble);
  setTimeout(() => bubble.remove(), 850);
}

function startMiniGame() {
  if (!STATE.running) return;

  clearInterval(STATE.miniTimerId);
  STATE.miniTimeLeft = 8;
  STATE.miniScore = 0;
  els.miniArea.innerHTML = "";
  els.miniScore.textContent = "Score: 0";
  els.miniTimer.textContent = `Time: ${STATE.miniTimeLeft}`;

  STATE.miniTimerId = setInterval(() => {
    STATE.miniTimeLeft -= 1;
    spawnBubble();
    spawnBubble();
    els.miniTimer.textContent = `Time: ${STATE.miniTimeLeft}`;

    if (STATE.miniTimeLeft <= 0) {
      clearInterval(STATE.miniTimerId);
      const stressRelief = Math.min(20, STATE.miniScore * 1.8);
      adjustStats({ stress: -stressRelief, health: Math.min(6, STATE.miniScore * 0.3) });
      els.statusText.textContent = `Bubble Breather complete. Stress reduced by ${Math.round(stressRelief)}.`;
      renderStats();
      checkEnding();
    }
  }, 1000);
}

function restartGame() {
  clearInterval(STATE.timerId);
  clearInterval(STATE.miniTimerId);
  STATE.running = false;
  els.studentName.value = "";
  els.startScreen.classList.remove("hidden");
  els.gameScreen.classList.add("hidden");
  els.endScreen.classList.add("hidden");
  updateClockAndCountdown();
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

els.startBtn.addEventListener("click", startGame);
els.restartBtn.addEventListener("click", restartGame);
els.startMiniBtn.addEventListener("click", startMiniGame);

updateClockAndCountdown();
setInterval(updateClockAndCountdown, 1000);
