const board = document.querySelector('canvas');
const context = board.getContext('2d');
const start = document.querySelector('#start');
const status = document.querySelector('#status');
const score = document.querySelector('#score');
const shipY = 366;
const keys = { ArrowLeft: 'left', ArrowRight: 'right', Space: 'fire' };
const heldKeys = new Set();
const pointers = new Map();
let ship = 240;
let shields = 3;
let points = 0;
let wave = 1;
let time = 0;
let cooldown = 0;
let spawned = 0;
let drones = [];
let shots = [];
let running = false;
let lastFrame = 0;

function draw() {
  context.fillStyle = '#101826';
  context.fillRect(0, 0, board.width, board.height);
  context.fillStyle = '#30425a';
  for (let i = 0; i < 46; i++) context.fillRect(i * 83 % 479, i * 31 % 397, 2, 2);
  context.fillStyle = '#7ee8df';
  context.beginPath();
  context.moveTo(ship, shipY - 15);
  context.lineTo(ship + 15, shipY + 11);
  context.lineTo(ship - 15, shipY + 11);
  context.fill();
  context.fillStyle = '#ffe182';
  for (const shot of shots) context.fillRect(shot.x - 2, shot.y, 4, 10);
  context.fillStyle = '#ed9b8d';
  for (const drone of drones) {
    context.beginPath();
    context.moveTo(drone.x, drone.y + 12);
    context.lineTo(drone.x - 19, drone.y - 7);
    context.lineTo(drone.x + 19, drone.y - 7);
    context.fill();
  }
}

function finish(message) {
  running = false;
  status.textContent = message;
  start.hidden = false;
  start.textContent = 'Play again';
  start.focus();
}

function update(dt) {
  const controls = new Set([...heldKeys, ...pointers.values()]);
  ship = Math.max(18, Math.min(462, ship + (Number(controls.has('right')) - Number(controls.has('left'))) * 260 * dt));
  cooldown -= dt;
  if (controls.has('fire') && cooldown <= 0) {
    shots.push({ x: ship, y: shipY - 18 });
    cooldown = 0.16;
  }
  time += dt;
  const total = 6 + wave * 2;
  if (spawned < total && time >= spawned * (1.25 - wave * 0.15)) {
    const lanes = [240, 160, 320, 80, 400];
    drones.push({ x: lanes[spawned++ % lanes.length], y: -12 });
  }
  for (const shot of shots) shot.y -= 410 * dt;
  for (const drone of drones) drone.y += (42 + 16 * wave) * dt;
  for (const drone of drones) {
    const hit = shots.findIndex(shot => Math.abs(shot.x - drone.x) < 19 && Math.abs(shot.y - drone.y) < 12);
    if (hit !== -1) {
      shots.splice(hit, 1);
      drone.removed = true;
      points += 100;
    } else if (drone.y >= shipY + 12) {
      drone.removed = true;
      shields = Math.max(0, shields - 1);
    }
  }
  shots = shots.filter(shot => shot.y > -10);
  drones = drones.filter(drone => !drone.removed);
  if (shields === 0) finish('The relay fell. Try again.');
  else if (spawned === total && drones.length === 0) {
    if (wave === 3) finish('Relay defended. You cleared all three waves.');
    else {
      wave++;
      spawned = 0;
      time = -1;
      status.textContent = `Wave ${wave} incoming.`;
    }
  }
  const readout = `Score ${points} · Shields ${shields} · Wave ${wave}`;
  if (score.textContent !== readout) score.textContent = readout;
}

function frame(timestamp) {
  if (!running) return;
  update(Math.min(0.05, (timestamp - (lastFrame || timestamp)) / 1000));
  lastFrame = timestamp;
  draw();
  if (running) requestAnimationFrame(frame);
}

start.addEventListener('click', () => {
  ship = 240;
  shields = 3;
  points = 0;
  wave = 1;
  time = cooldown = spawned = lastFrame = 0;
  drones = [];
  shots = [];
  status.textContent = 'Wave 1 incoming.';
  start.hidden = true;
  running = true;
  board.focus();
  requestAnimationFrame(frame);
});
window.addEventListener('keydown', event => {
  if (!running || !Object.hasOwn(keys, event.code) || event.target.closest('a, button')) return;
  event.preventDefault();
  heldKeys.add(keys[event.code]);
});
window.addEventListener('keyup', event => heldKeys.delete(keys[event.code]));
window.addEventListener('blur', () => { heldKeys.clear(); pointers.clear(); });
for (const button of document.querySelectorAll('[data-control]')) {
  button.addEventListener('keydown', event => {
    if (event.code === 'Space' || event.code === 'Enter') heldKeys.add(button.dataset.control);
  });
  button.addEventListener('keyup', event => {
    if (event.code === 'Space' || event.code === 'Enter') heldKeys.delete(button.dataset.control);
  });
  button.addEventListener('blur', () => heldKeys.delete(button.dataset.control));
  button.addEventListener('pointerdown', event => {
    button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, button.dataset.control);
  });
  button.addEventListener('lostpointercapture', event => pointers.delete(event.pointerId));
}
draw();
