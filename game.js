
// ---- DOM refs
const timeEl = document.getElementById("time");
const nightEl = document.getElementById("night");
const powerEl = document.getElementById("power");
const bgImg = document.getElementById("bg");
const enemyImg = document.getElementById("enemy");
const staticImg = document.getElementById("static");
const overlayText = document.getElementById("overlayText");
const jumpscare = document.getElementById("jumpscare");

const cam1Btn = document.getElementById("cam1Btn");
const cam2Btn = document.getElementById("cam2Btn");
const officeBtn = document.getElementById("officeBtn");
const doorBtn = document.getElementById("doorBtn");
const lightBtn = document.getElementById("lightBtn");

// ---- Assets (backgrounds)
const SCENE = {
  OFFICE: "assets/office.png",
  CAM1: "assets/cam1.png",
  CAM2: "assets/cam2.png",
};

// ---- Game state
let night = 1;
let minutes = 0;       // in-game minutes (0..360)
let showScene = "OFFICE"; // OFFICE | CAM1 | CAM2
let doorClosed = false;
let lightOn = false;
let power = 100;
let alive = true;
let won = false;

// Enemy state
// positions: "CAM1", "CAM2", "HALL" (approach), "ATTACK"
let enemyPos = "CAM1";
let enemyVisible = false; // if should draw enemy image
let nextMoveAt = 0;       // ms timestamp when enemy can move again

// Timing
const REAL_MS_PER_MIN = 250;  // speed of clock: 4 real sec = 1 in-game min  (90s full night)
const LOOP_DT = 100;          // game loop dt
let lastTick = performance.now();

// ---- Utility
function setScene(scene) {
  showScene = scene;
  switch (scene) {
    case "OFFICE": bgImg.src = SCENE.OFFICE; break;
    case "CAM1": bgImg.src = SCENE.CAM1; break;
    case "CAM2": bgImg.src = SCENE.CAM2; break;
  }
  // cam static when not office
  staticImg.style.opacity = scene === "OFFICE" ? 0 : 0.25 + Math.random() * 0.2;
  overlayText.textContent = scene === "OFFICE" ? "" : scene;
  overlayText.style.opacity = scene === "OFFICE" ? 0 : 0.8;
  // sound("cam"); // enable after adding audio files
}

function formatClock(mins) {
  // 12:00 AM .. 6:00 AM (0..360 mins)
  const hours = Math.floor(mins / 60); // 0..6
  const label = hours === 0 ? "12" : String(hours);
  return `${label}:00 ${hours < 6 ? "AM" : "AM"}`;
}

function setDoor(closed) {
  doorClosed = !!closed;
  doorBtn.textContent = `Door: ${doorClosed ? "CLOSED" : "OPEN"}`;
  // sound("door");
}

function setLight(on) {
  lightOn = !!on;
  lightBtn.textContent = lightOn ? "Light: ON" : "Light";
}

// ---- Audio (optional)
const sounds = {};
function loadSound(name, file) {
  const a = new Audio(file);
  a.volume = 0.35;
  sounds[name] = a;
}
function sound(name) { try { sounds[name].currentTime = 0; sounds[name].play(); } catch {} }

// Preload (only works if files exist; safe to comment out lines you don't have yet)
["power","door","cam","scream"].forEach(n => {
  // loadSound(n, `assets/${n}.wav`);
});

// ---- Buttons
cam1Btn.onclick = () => setScene("CAM1");
cam2Btn.onclick = () => setScene("CAM2");
officeBtn.onclick = () => setScene("OFFICE");
doorBtn.onclick = () => setDoor(!doorClosed);
lightBtn.onmousedown = () => setLight(true);
lightBtn.onmouseup = () => setLight(false);
lightBtn.onmouseleave = () => setLight(false);

// ---- Enemy AI
function enemyCanMove(now) { return now >= nextMoveAt; }
function scheduleNextMove(now) {
  // Base delay, faster later in the night
  const nightProgress = minutes / 360; // 0..1
  const base = 3500 - 2000 * nightProgress; // 3.5s -> 1.5s
  nextMoveAt = now + (base + Math.random() * 800);
}

function enemyStep(now) {
  if (!enemyCanMove(now)) return;
  scheduleNextMove(now);

  // Simple state machine
  if (enemyPos === "CAM1") {
    // 60% stay, 40% move to CAM2
    enemyPos = Math.random() < 0.4 ? "CAM2" : "CAM1";
  } else if (enemyPos === "CAM2") {
    // 40% approach hall, 30% back to CAM1, 30% stay
    const r = Math.random();
    if (r < 0.4) enemyPos = "HALL";
    else if (r < 0.7) enemyPos = "CAM1";
    else enemyPos = "CAM2";
  } else if (enemyPos === "HALL") {
    // 50% attempt attack, else bounce back to cams
    if (Math.random() < 0.5) enemyPos = "ATTACK";
    else enemyPos = Math.random() < 0.5 ? "CAM1" : "CAM2";
  } else if (enemyPos === "ATTACK") {
    // resolve attack this tick
    attemptAttack();
  }
}

function drawEnemy() {
  // enemy is visible if in current camera OR peeking in office/hall with light
  enemyVisible = false;

  if (showScene === "CAM1" && enemyPos === "CAM1") enemyVisible = true;
  if (showScene === "CAM2" && enemyPos === "CAM2") enemyVisible = true;

  // If in hall, only visible in office when light is on
  if (showScene === "OFFICE" && enemyPos === "HALL" && lightOn) enemyVisible = true;

  enemyImg.style.opacity = enemyVisible ? 0.9 : 0;
}

function attemptAttack() {
  // If door is closed, block the attack and push enemy back
  if (doorClosed) {
    enemyPos = "CAM1";
    // slight power penalty for “slam”
    power = Math.max(0, power - 2);
    // sound("door");
    return;
  }

  // Door open -> jumpscare (lose)
  alive = false;
  jumpscare.style.display = "block";
  overlayText.style.opacity = 0;
  enemyImg.style.opacity = 0;
  staticImg.style.opacity = 0;
  // sound("scream");
}

// ---- Power & Time
function drainPower(dtMs) {
  // Base drain
  let drain = 0.004; // ~0.4% per 10s idle (approx)
  if (showScene !== "OFFICE") drain += 0.010; // camera
  if (doorClosed) drain += 0.020;             // door
  if (lightOn) drain += 0.012;                // light

  power = Math.max(0, power - drain * (dtMs / 16.67)); // scale by 60fps units

  // visual hints
  powerEl.classList.toggle("low", power <= 25 && power > 10);
  powerEl.classList.toggle("critical", power <= 10);
}

function tickClock(dtMs) {
  // Advance in-game minutes by real milliseconds
  minutes += dtMs / REAL_MS_PER_MIN;
  if (minutes > 360) minutes = 360;
}

// ---- Main loop
function update(now) {
  const dt = now - lastTick;
  lastTick = now;

  if (!alive || won) return;

  // Time & power
  tickClock(dt);
  drainPower(dt);

  // Enemy logic
  enemyStep(now);
  drawEnemy();

  // UI updates
  const hour = Math.floor(minutes / 60); // 0..6
  timeEl.textContent = `${hour === 0 ? 12 : hour}:00 AM`;
  powerEl.textContent = `Power: ${power.toFixed(0)}%`;
  nightEl.textContent = `Night ${night}`;

  // Random camera static flicker
  if (showScene !== "OFFICE") {
    staticImg.style.opacity = 0.18 + Math.random() * 0.25;
  }

  // Power out -> blackout behavior (simple)
  if (power <= 0) {
    overlayText.textContent = "POWER OUT";
    overlayText.style.opacity = 0.9;
    staticImg.style.opacity = 0;
    // brief delay then force attack
    if (enemyPos !== "ATTACK") {
      setTimeout(() => { enemyPos = "ATTACK"; attemptAttack(); }, 1200);
    }
  }

  // Win at 6 AM
  if (minutes >= 360 && alive) {
    won = true;
    overlayText.textContent = "6:00 AM - You Survived!";
    overlayText.style.opacity = 1;
  }

  requestAnimationFrame(update);
}

function resetGame() {
  minutes = 0;
  showScene = "OFFICE";
  setScene("OFFICE");
  setDoor(false);
  setLight(false);
  power = 100;
  alive = true;
  won = false;
  enemyPos = "CAM1";
  scheduleNextMove(performance.now());
  jumpscare.style.display = "none";
  overlayText.style.opacity = 0;
  enemyImg.style.opacity = 0;
  requestAnimationFrame(ts => { lastTick = ts; update(ts); });
}

// Click anywhere after losing to restart
jumpscare.addEventListener("click", resetGame);

// Start
resetGame();
