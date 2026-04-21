const FINAL_REVIEW_DATE = new Date("2026-05-06T09:00:00");

const SETTINGS = {
  startDate: new Date("2026-04-21T10:00:00"),
  tickMinutes: 30,
  tickMs: 1500,
  dayStartHour: 10,
  schoolEndHour: 18,
  dinnerEndHour: 19,
  workEndHour: 2,
  statsMin: 0,
  statsMax: 100,
  passiveDrain: {
    sleep: 1.4,
    stress: 0.7,
    energy: 1.2,
    progress: 0,
    health: 0.45,
  },
};

const ACTIONS = [
  { name: "Coffee ☕", effects: { energy: +12, stress: +4, sleep: -5 } },
  { name: "Instant noodles 🍜", effects: { energy: +8, health: -6, stress: -2 } },
  { name: "Printing paper 🧻", effects: { progress: +6, stress: -1 } },
  { name: "Model materials 🧱", effects: { progress: +9, stress: +4, energy: -4 } },
  { name: "USB save 💾", effects: { stress: -10, progress: +2 } },
  { name: "Red pen ✍️", effects: { progress: +4, stress: +2 } },
  { name: "Desk nap 😴", effects: { sleep: +18, energy: +8, progress: -2 } },
  { name: "Crit encouragement 🗣️", effects: { stress: -8, health: +4 } },
  { name: "Computer work boost 💻", effects: { progress: +10, energy: -9, stress: +2 } },
  { name: "Model making boost ✂️", effects: { progress: +12, stress: +6, energy: -4 } },
];

const STATE = {
  playerName: "",
  gender: "male",
  currentTime: new Date(SETTINGS.startDate),
  running: false,
  gameIntervalId: null,
  miniIntervalId: null,
  miniTimeLeft: 0,
  miniScore: 0,
  stats: {
    sleep: 72,
    stress: 24,
    energy: 70,
    progress: 5,
    health: 85,
  },
};

const statOrder = ["sleep", "stress", "energy", "progress", "health"];

const els = {
  startScreen: document.getElementById("startScreen"),
  gameScreen: document.getElementById("gameScreen"),
  endScreen: document.getElementById("endScreen"),
  startBtn: document.getElementById("startBtn"),
  studentName: document.getElementById("studentName"),
  studentDisplayName: document.getElementById("studentDisplayName"),
  studentAvatar: document.getElementById("studentAvatar"),
  timeLabel: document.getElementById("timeLabel"),
  statusText: document.getElementById("statusText"),
  statsContainer: document.getElementById("statsContainer"),
  actionsContainer: document.getElementById("actionsContainer"),
  countdown: document.getElementById("countdown"),
  endTitle: document.getElementById("endTitle"),
  endMessage: document.getElementById("endMessage"),
  restartBtn: document.getElementById("restartBtn"),
  startMiniBtn: document.getElementById("startMiniBtn"),
  miniArea: document.getElementById("miniArea"),
  miniScore: document.getElementById("miniScore"),
  miniTimer: document.getElementById("miniTimer"),
};

function clamp(v) {
  return Math.max(SETTINGS.statsMin, Math.min(SETTINGS.statsMax, v));
}

function formatClock(date) {
  const dayCount = Math.floor((date - SETTINGS.startDate) / (1000 * 60 * 60 * 24)) + 1;
  const hour = date.getHours();
  const minute = date.getMinutes().toString().padStart(2, "0");
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `Day ${dayCount} • ${h12}:${minute} ${suffix}`;
}

function updateCountdown() {
  const diff = FINAL_REVIEW_DATE - STATE.currentTime;
  if (diff <= 0) {
    els.countdown.textContent = "Final review day is here!";
    return;
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  els.countdown.textContent = `${days} days, ${hours} hours`;
}

function periodType(date) {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour >= SETTINGS.dayStartHour && hour < SETTINGS.schoolEndHour) return "school";
  if (hour >= SETTINGS.schoolEndHour && hour < SETTINGS.dinnerEndHour) return "dinner";
  if (hour >= SETTINGS.dinnerEndHour || hour < SETTINGS.workEndHour) return "project";
  return "sleep";
}

function applyScheduleEffects() {
  const period = periodType(STATE.currentTime);

  if (period === "school") {
    adjustStats({ progress: +1.4, stress: +1.4, energy: -1.5, sleep: -0.8, health: -0.2 });
    setStatus(`${STATE.playerName} is in studio from 10 AM to 6 PM. Pin-up anxiety is building.`);
  } else if (period === "dinner") {
    adjustStats({ energy: +2, stress: -1.4, health: +1, sleep: +0.2 });
    setStatus("Dinner break (6 PM–7 PM). Tiny joy. Big deadlines.");
  } else if (period === "project") {
    const digitalFocus = Math.random() < 0.5;
    if (digitalFocus) {
      adjustStats({ progress: +2.1, energy: -2.5, sleep: -1, stress: +0.8, health: -0.4 });
      setStatus("Digital work sprint: layers, renders, and laptop fan screaming.");
    } else {
      adjustStats({ progress: +2, stress: +2.2, energy: -1.6, sleep: -0.8, health: -0.3 });
      setStatus("Physical model session: glue fingers and foam board confetti.");
    }
  } else {
    adjustStats({ sleep: +3.2, energy: +2.5, stress: -1.6, health: +1.2 });
    setStatus("Sleep phase after 2 AM. The desk lamp finally rests.");
  }

  adjustStats({
    sleep: -SETTINGS.passiveDrain.sleep,
    stress: +SETTINGS.passiveDrain.stress,
    energy: -SETTINGS.passiveDrain.energy,
    health: -SETTINGS.passiveDrain.health,
  });
}

function adjustStats(changes) {
  Object.entries(changes).forEach(([k, val]) => {
    STATE.stats[k] = clamp(STATE.stats[k] + val);
  });
}

function createStatUI() {
  els.statsContainer.innerHTML = "";
  for (const key of statOrder) {
    const row = document.createElement("div");
    row.className = "stat-row";
    row.innerHTML = `
      <strong>${capitalize(key)}</strong>
      <div class="bar"><div id="fill-${key}" class="fill"></div></div>
      <span id="label-${key}">0</span>
    `;
    els.statsContainer.appendChild(row);
  }
}

function renderStats() {
  for (const key of statOrder) {
    const value = Math.round(STATE.stats[key]);
    const fill = document.getElementById(`fill-${key}`);
    const label = document.getElementById(`label-${key}`);

    fill.style.width = `${value}%`;
    fill.style.background = statColor(key, value);
    label.textContent = value;
  }
}

function statColor(stat, value) {
  if (stat === "stress") {
    if (value > 70) return "var(--danger)";
    if (value > 45) return "var(--warn)";
    return "var(--ok)";
  }
  if (value < 30) return "var(--danger)";
  if (value < 55) return "var(--warn)";
  return "var(--ok)";
}

function createActionButtons() {
  els.actionsContainer.innerHTML = "";
  ACTIONS.forEach((action) => {
    const btn = document.createElement("button");
    btn.className = "btn action-btn";
    btn.textContent = action.name;
    btn.addEventListener("click", () => {
      adjustStats(action.effects);
      if (action.name.includes("Coffee")) {
        setStatus("Caffeine deployed. Heartbeat now in 3/4 time.");
      } else if (action.name.includes("USB")) {
        setStatus("Saved successfully. Catastrophic file-loss avoided.");
      } else {
        setStatus(`${action.name} used for ${STATE.playerName}.`);
      }
      renderStats();
      checkEnding();
    });
    els.actionsContainer.appendChild(btn);
  });
}

function setStatus(text) {
  els.statusText.textContent = text;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function tick() {
  if (!STATE.running) return;
  STATE.currentTime = new Date(STATE.currentTime.getTime() + SETTINGS.tickMinutes * 60000);
  applyScheduleEffects();
  updateCountdown();
  els.timeLabel.textContent = formatClock(STATE.currentTime);
  renderStats();
  checkEnding();
}

function checkEnding() {
  const s = STATE.stats;
  const burnout = s.health <= 0 || s.energy <= 0 || s.sleep <= 0 || s.stress >= 100;

  if (burnout) {
    endGame(
      "Burnout Ending: The All-Nighter Ate Reality",
      `${STATE.playerName} attempted to submit a stapler as a concept model and called it "post-structural minimalism." Recovery day unlocked.`
    );
    return;
  }

  if (STATE.currentTime >= FINAL_REVIEW_DATE) {
    if (s.progress >= 65 && s.health > 20) {
      endGame(
        "Success Ending: Final Review Survivor 🎉",
        `${STATE.playerName} made it to May 6, 2026 and presented bravely. Jury comments included "promising," "chaotic," and "surprisingly buildable."`
      );
    } else {
      endGame(
        "Burnout Ending: Deadline Arrived, Soul Loading...",
        `${STATE.playerName} reached final review day but the boards were 40% vibes and 60% panic. Still iconic.`
      );
    }
  }
}

function endGame(title, message) {
  STATE.running = false;
  clearInterval(STATE.gameIntervalId);
  clearInterval(STATE.miniIntervalId);
  els.gameScreen.classList.add("hidden");
  els.endScreen.classList.remove("hidden");
  els.endTitle.textContent = title;
  els.endMessage.textContent = message;
}

function startGame() {
  const name = els.studentName.value.trim();
  if (!name) {
    alert("Please enter a student name first.");
    return;
  }

  const gender = document.querySelector('input[name="gender"]:checked').value;

  STATE.playerName = name;
  STATE.gender = gender;
  STATE.currentTime = new Date(SETTINGS.startDate);
  STATE.stats = { sleep: 72, stress: 24, energy: 70, progress: 5, health: 85 };
  STATE.running = true;

  els.studentDisplayName.textContent = `${STATE.playerName} (${capitalize(STATE.gender)})`;
  els.timeLabel.textContent = formatClock(STATE.currentTime);
  els.studentAvatar.className = `avatar ${STATE.gender}`;
  els.studentAvatar.innerHTML = '<div class="body"></div>';
  setStatus(`Welcome ${STATE.playerName}. Final review is coming. Keep the model alive (and yourself too).`);

  createStatUI();
  createActionButtons();
  renderStats();
  updateCountdown();

  els.startScreen.classList.add("hidden");
  els.endScreen.classList.add("hidden");
  els.gameScreen.classList.remove("hidden");

  clearInterval(STATE.gameIntervalId);
  STATE.gameIntervalId = setInterval(tick, SETTINGS.tickMs);
}

function spawnBubble() {
  const bubble = document.createElement("button");
  bubble.className = "bubble";
  bubble.type = "button";

  const area = els.miniArea.getBoundingClientRect();
  const x = Math.random() * Math.max(5, area.width - 40);
  const y = Math.random() * Math.max(5, area.height - 40);

  bubble.style.left = `${x}px`;
  bubble.style.top = `${y}px`;

  bubble.addEventListener("click", () => {
    STATE.miniScore += 1;
    els.miniScore.textContent = `Score: ${STATE.miniScore}`;
    bubble.remove();
  });

  els.miniArea.appendChild(bubble);

  setTimeout(() => bubble.remove(), 900);
}

function startMiniGame() {
  if (!STATE.running) return;

  clearInterval(STATE.miniIntervalId);
  els.miniArea.innerHTML = "";
  STATE.miniTimeLeft = 8;
  STATE.miniScore = 0;
  els.miniScore.textContent = "Score: 0";
  els.miniTimer.textContent = `Time: ${STATE.miniTimeLeft}`;

  STATE.miniIntervalId = setInterval(() => {
    STATE.miniTimeLeft -= 1;
    spawnBubble();
    spawnBubble();
    els.miniTimer.textContent = `Time: ${STATE.miniTimeLeft}`;

    if (STATE.miniTimeLeft <= 0) {
      clearInterval(STATE.miniIntervalId);
      const stressRelief = Math.min(20, STATE.miniScore * 1.8);
      adjustStats({ stress: -stressRelief, health: +Math.min(6, STATE.miniScore * 0.3) });
      setStatus(`Mini game complete. Stress reduced by ${Math.round(stressRelief)}.`);
      renderStats();
      checkEnding();
    }
  }, 1000);
}

function restart() {
  clearInterval(STATE.gameIntervalId);
  clearInterval(STATE.miniIntervalId);
  els.studentName.value = "";
  els.startScreen.classList.remove("hidden");
  els.gameScreen.classList.add("hidden");
  els.endScreen.classList.add("hidden");
}

els.startBtn.addEventListener("click", startGame);
els.restartBtn.addEventListener("click", restart);
els.startMiniBtn.addEventListener("click", startMiniGame);

updateCountdown();
