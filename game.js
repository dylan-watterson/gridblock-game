const GRID = 50;
const CELL = 10;
const MOVE_DELAY = 20; // milliseconds between steps when holding a key — lower = faster

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ─── Game State ───────────────────────────────────────────────
// These variables hold the current state of the game
// They change constantly as the player moves and levels load

let px, py;           // Player position (x = column, y = row)
let tx, ty;           // Target position
let obstacles;        // Array of obstacle positions [{x, y}, {x, y}, ...]
let moves;            // How many moves the player has made this level
let currentLevel;     // Which level we're currently on (0 = level 1)
let totalMoves = 0;   // Running total across all levels
let gameOver = false; // True when all levels are complete

let timerStart = null;    // Timestamp of first move
let timerInterval = null; // The clock that updates the display

// ─── Initialise ───────────────────────────────────────────────

function loadLevel(index) {
  currentLevel = index;

  // Pull the level data out of the levels array in levels.js
  // levels[0] is level 1, levels[1] is level 2, etc.
  const level = levels[index];

  // Set player position from the level data
  px = level.playerStart.x;
  py = level.playerStart.y;

  // Set target position from the level data
  tx = level.target.x;
  ty = level.target.y;

  // Set obstacles from the level data
  obstacles = level.obstacles;

  // Reset move counter for the new level
  moves = 0;

  // Update all the text on screen
  // currentLevel + 1 because humans count from 1, code counts from 0
  document.getElementById('level').textContent = currentLevel + 1;
  document.getElementById('moves').textContent = 0;
  document.getElementById('total').textContent = totalMoves;
  document.getElementById('msg').textContent = 'use arrow keys or WASD to move';

  // Keep the dropdown in sync with the current level
  document.getElementById('level-select').value = index;

  // Draw the level and focus the canvas so keyboard input works immediately
  draw();
  canvas.focus();
}

function restartGame() {
  gameOver = false;
  totalMoves = 0;
  clearInterval(timerInterval);
  timerStart = null;
  timerInterval = null;
  document.getElementById('timer').textContent = '0.000s';
  document.getElementById('score-screen').style.display = 'none';
  loadLevel(0);
}

function nextLevel() {
  const next = currentLevel + 1;

  if (next < levels.length) {
    loadLevel(next);
  } else {
    // No more levels — game complete!
    gameOver = true;
    clearInterval(timerInterval);

    // Calculate score
    const elapsedMs = Date.now() - timerStart;
    const elapsedSecs = elapsedMs / 1000;
    const penalty = Math.round(elapsedMs / 100);
    const score = totalMoves + penalty;

    // Populate score screen
    document.getElementById('final-moves').textContent = totalMoves;
    document.getElementById('final-time').textContent = elapsedSecs.toFixed(3) + 's';
    document.getElementById('final-penalty').textContent = penalty;
    document.getElementById('final-score').textContent = score;

    // Show score screen
    document.getElementById('score-screen').style.display = 'flex';
  }
}

// ─── Dev Tools ────────────────────────────────────────────────

// Populate the level select dropdown from the levels array
// DEV ONLY — remove before shipping
function buildLevelSelect() {
  const select = document.getElementById('level-select');
  levels.forEach((level, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `Level ${i + 1}`;
    select.appendChild(option);
  });
}

// Jump directly to any level — resets timer and move counts
// DEV ONLY — remove before shipping
function jumpToLevel(index) {
  gameOver = false;
  moves = 0;
  totalMoves = 0;
  clearInterval(timerInterval);
  timerStart = null;
  timerInterval = null;
  document.getElementById('timer').textContent = '0.000s';
  document.getElementById('score-screen').style.display = 'none';
  loadLevel(parseInt(index));
}

// ─── Drawing ──────────────────────────────────────────────────
// This function redraws the entire canvas from scratch every time something moves
// Order matters - things drawn later appear on top of things drawn earlier

function draw() {
  // 1. Fill the whole canvas with the background colour
  ctx.fillStyle = '#f5f4ef';
  ctx.fillRect(0, 0, 500, 500);

  // 2. Draw every grid cell
  // Loop through every column (x) and every row (y)
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      ctx.fillStyle = '#e0dfd8';
      // The +1 and -1 leave a 1px gap between cells, creating the grid lines
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 1, CELL - 1);
    }
  }

  // 3. Draw obstacles (dark squares that block movement)
  // forEach loops through every obstacle in the array
  obstacles.forEach(o => {
    ctx.fillStyle = '#444441'; // dark grey
    ctx.fillRect(o.x * CELL + 1, o.y * CELL + 1, CELL - 1, CELL - 1);
  });

  // 4. Draw the target (green square the player needs to reach)
  // Draw a light green background cell first
  ctx.fillStyle = '#E1F5EE';
  ctx.fillRect(tx * CELL + 1, ty * CELL + 1, CELL - 1, CELL - 1);
  // Then draw a smaller darker green square on top, centred inside
  ctx.fillStyle = '#1D9E75';
  ctx.fillRect(tx * CELL + 3, ty * CELL + 3, CELL - 5, CELL - 5);

  // 5. Draw the player (purple square) - drawn last so it appears on top
  ctx.fillStyle = '#7F77DD';
  ctx.fillRect(px * CELL + 1, py * CELL + 1, CELL - 1, CELL - 1);
}

// ─── Movement ─────────────────────────────────────────────────

// Check if a given grid position contains an obstacle
// .some() returns true if ANY obstacle in the array matches
function isObstacle(x, y) {
  return obstacles.some(o => o.x === x && o.y === y);
}

// Try to move the player by dx columns and dy rows
// dx = -1 means move left, dx = 1 means move right
// dy = -1 means move up,   dy = 1 means move down
function tryMove(dx, dy) {
  // Stop all movement if the game is over
  if (gameOver) return;

  // Start timer on the very first move of the game
  if (totalMoves === 0 && moves === 0 && !timerStart) {
    timerStart = Date.now();
    timerInterval = setInterval(() => {
      const elapsed = (Date.now() - timerStart) / 1000;
      document.getElementById('timer').textContent = elapsed.toFixed(3) + 's';
    }, 10);
  }

  // Calculate where the player would end up
  const nx = px + dx;
  const ny = py + dy;

  // Stop if the move would go outside the grid
  if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) return;

  // Stop if the move would land on an obstacle
  if (isObstacle(nx, ny)) return;

  // The move is valid - update the player position
  px = nx;
  py = ny;
  moves++;

  // Update the move counter on screen
  document.getElementById('moves').textContent = moves;

  // Check if the player has reached the target
  if (px === tx && py === ty) {
    totalMoves += moves; // add this level's moves to the running total
    document.getElementById('total').textContent = totalMoves;
    document.getElementById('msg').textContent = `got it in ${moves} moves!`;
    nextLevel();
  }

  // Redraw the canvas to show the updated player position
  draw();
}

// ─── Input ────────────────────────────────────────────────────

// Map each key to a direction as [dx, dy]
// e.g. ArrowUp means move 0 columns, -1 rows (up)
const keyMap = {
  ArrowUp:    [0, -1],  w: [0, -1], W: [0, -1],
  ArrowDown:  [0, 1],   s: [0, 1],  S: [0, 1],
  ArrowLeft:  [-1, 0],  a: [-1, 0], A: [-1, 0],
  ArrowRight: [1, 0],   d: [1, 0],  D: [1, 0]
};

let heldKey = null;      // tracks which key is currently being held
let moveInterval = null; // the repeating timer that fires every MOVE_DELAY ms

function startMoving(dir) {
  // Move immediately on first press — no waiting for the first repeat
  tryMove(dir[0], dir[1]);
  // Then keep moving every MOVE_DELAY ms while the key is held
  moveInterval = setInterval(() => tryMove(dir[0], dir[1]), MOVE_DELAY);
}

function stopMoving() {
  // Cancel the repeating timer and clear the held key
  clearInterval(moveInterval);
  moveInterval = null;
  heldKey = null;
}

document.addEventListener('keydown', (e) => {
  const dir = keyMap[e.key];
  if (!dir) return;
  e.preventDefault();
  // Ignore repeat events the OS fires — we handle our own repeating
  if (e.repeat) return;
  // If a different key was already held, stop it first
  if (heldKey) stopMoving();
  heldKey = e.key;
  startMoving(dir);
});

document.addEventListener('keyup', (e) => {
  // Only stop if the released key is the one we're currently tracking
  if (e.key === heldKey) stopMoving();
});

// ─── Touch controller (iOS) ───────────────────────────────────
// Full width up/down, split left/right in the middle

function bindZone(id, dx, dy) {
  const zone = document.getElementById(id);
  let interval = null;

  function start(e) {
    e.preventDefault();
    tryMove(dx, dy);
    interval = setInterval(() => tryMove(dx, dy), MOVE_DELAY);
  }

  function stop(e) {
    e.preventDefault();
    clearInterval(interval);
    interval = null;
  }

  zone.addEventListener('touchstart', start, { passive: false });
  zone.addEventListener('touchend',   stop,  { passive: false });
  zone.addEventListener('mousedown',  start);
  zone.addEventListener('mouseup',    stop);
  zone.addEventListener('mouseleave', stop);
}

bindZone('zone-up',    0, -1);
bindZone('zone-left', -1,  0);
bindZone('zone-right', 1,  0);
bindZone('zone-down',  0,  1);

// ─── Start ────────────────────────────────────────────────────

// Kick everything off by loading the first level (index 0)
buildLevelSelect();
loadLevel(0);