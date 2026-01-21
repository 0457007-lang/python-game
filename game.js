
// Simple "Dodge the Blocks" game
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const restartBtn = document.getElementById("restart");

const W = canvas.width;
const H = canvas.height;

// Player properties
const player = {
  x: W / 2 - 20,
  y: H - 70,
  w: 40,
  h: 40,
  color: "#00d5ff",
  speed: 5,
};

// Input state
const keys = new Set();
window.addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function collides(a, b) {
  return !(
    a.x + a.w < b.x ||
    a.x > b.x + b.w ||
    a.y + a.h < b.y ||
    a.y > b.y + b.h
  );
}

// Enemies (falling blocks)
const blocks = [];
function spawnBlock() {
  const w = 30 + Math.random() * 30;
  const x = Math.random() * (W - w);
  const y = -40;
  const speed = 2.5 + Math.random() * 3.5;
  blocks.push({ x, y, w, h: 20 + Math.random() * 20, speed, color: "#ff4d4d" });
}

// Game state
let score = 0;
let alive = true;
let spawnTimer = 0;
let spawnInterval = 50; // frames

function reset() {
  player.x = W / 2 - 20;
  score = 0;
  alive = true;
  blocks.length = 0;
  spawnTimer = 0;
  spawnInterval = 50;
  restartBtn.hidden = true;
}

function update() {
  if (!alive) return;

  // Move player
  if (keys.has("arrowleft") || keys.has("a")) player.x -= player.speed;
  if (keys.has("arrowright") || keys.has("d")) player.x += player.speed;
  player.x = Math.max(0, Math.min(W - player.w, player.x));

  // Spawning blocks
  spawnTimer++;
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    spawnBlock();
    // Increase difficulty gradually
    if (spawnInterval > 18) spawnInterval -= 0.5;
  }

  // Move blocks & check collisions
  for (const b of blocks) {
    b.y += b.speed;
    if (collides(player, b)) {
      alive = false;
      restartBtn.hidden = false;
    }
  }

  // Remove off-screen blocks and add score
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].y > H) {
      blocks.splice(i, 1);
      score++;
      scoreEl.textContent = score;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // Background grid effect
  ctx.fillStyle = "#0e1428";
  ctx.fillRect(0, 0, W, H);

  // Player
  rect(player.x, player.y, player.w, player.h, player.color);

  // Blocks
  for (const b of blocks) rect(b.x, b.y, b.w, b.h, b.color);

  if (!alive) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffd54a";
    ctx.font = "24px system-ui, Arial";
    ctx.textAlign = "center";
    ctx.fillText("Game Over! Press Restart", W / 2, H / 2);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

restartBtn.addEventListener("click", reset);

// Start
reset();
loop();
