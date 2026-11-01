import { WIDTH, HEIGHT, MOVE_KEYS, WAVES } from './content.js';
import { QUESTION_BY_ID, createQuizPlan, validateQuizPlan, legacyQuizPlan, normalizeReview } from './quiz-bank.js';
export const SAVE_KEY = 'amazing-grace-vim-defense-v1';
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const unit = (x, y) => { const length = Math.hypot(x, y); return length > 0 ? { x: x / length, y: y / length } : null; };

export class DefenseGame {
  constructor(mode = 'bash', random = Math.random, options = {}) {
    this.mode = mode === 'vim' ? 'vim' : 'bash'; this.random = random;
    this.phase = 'ready'; this.wave = 1; this.score = 0;
    this.player = { x: WIDTH / 2, y: HEIGHT / 2 + 75, hp: 100 };
    this.core = 100; this.facing = { x: 0, y: -1 }; this.aim = { x: WIDTH / 2, y: 0 };
    this.keys = new Set(); this.mouseFiring = false;
    this.stock = 2; this.drones = []; this.enemies = []; this.shots = []; this.effects = [];
    this.primaryCooldown = 0; this.mouseCooldown = 0; this.time = 0;
    this.remaining = 0; this.spawnClock = 0; this.quizIndex = 0; this.quizResults = [];
    this.message = 'Ready. Move with H/L, J or arrows. Hold Space to fire. Press B/K/D for a drone.';
    this.quizPlan = validateQuizPlan(options.quizPlan) ? options.quizPlan.map(pair => [...pair]) : createQuizPlan(random, options.review);
    this.assist = options.assist === true; this.assistedTarget = null;
  }
  questions() { return (this.quizPlan[this.wave - 1] || []).map(id => QUESTION_BY_ID[id]); }
  currentQuestion() { return this.questions()[this.quizIndex]; }
  releaseInputs() { this.keys.clear(); this.mouseFiring = false; this.assistedTarget = null; }
  setKey(key, down) {
    if (this.phase !== 'running' && down) return;
    if (down) this.keys.add(key); else this.keys.delete(key);
    const direction = MOVE_KEYS[key];
    if (down && direction) this.facing = { x: direction[0], y: direction[1] };
  }
  startWave() {
    if (this.phase !== 'ready') return false;
    this.phase = 'running'; this.remaining = WAVES[this.wave - 1].count; this.spawnClock = 0;
    this.enemies = []; this.shots = []; this.drones = []; this.effects = [];
    this.primaryCooldown = 0; this.mouseCooldown = 0; this.releaseInputs();
    this.message = `Wave ${this.wave}: ${WAVES[this.wave - 1].name}. Protect the core.`;
    return true;
  }
  pause() {
    if (this.phase !== 'running') return;
    this.phase = 'paused'; this.releaseInputs(); this.message = 'Paused. Select Resume, or focus the arena and press i / Enter.';
  }
  resume() { if (this.phase === 'paused') { this.phase = 'running'; this.message = 'Back in the arena.'; } }
  deploy() {
    if (this.phase !== 'running' || this.stock < 1 || this.drones.length >= 3) return false;
    this.stock--; this.drones.push({ ttl: 14, cooldown: 0, angle: this.time });
    this.message = 'Drone deployed: 14 seconds of automatic support. Up to three may be active.';
    return true;
  }
  fire(direction, source, origin = this.player) {
    if (!direction || this.phase !== 'running') return;
    this.shots.push({ x: origin.x, y: origin.y, vx: direction.x * 460, vy: direction.y * 460, ttl: 2,
      damage: source === 'drone' ? 16 : 18, source });
  }
  spawn() {
    const wave = WAVES[this.wave - 1], side = Math.floor(this.random() * 4), spot = this.random();
    const x = side === 0 ? 10 : side === 1 ? WIDTH - 10 : 20 + spot * (WIDTH - 40);
    const y = side === 2 ? 10 : side === 3 ? HEIGHT - 10 : 20 + spot * (HEIGHT - 40);
    const boss = this.wave === WAVES.length && this.remaining === 1;
    this.enemies.push({ x, y, hp: boss ? 260 : wave.hp, maxHp: boss ? 260 : wave.hp,
      speed: boss ? 13 : wave.speed, radius: boss ? 23 : 11, damage: boss ? 30 : 9, boss });
  }
  tick(dt) {
    if (this.phase !== 'running' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05); this.time += dt;
    let dx = 0, dy = 0;
    for (const key of this.keys) { const delta = MOVE_KEYS[key]; if (delta) { dx += delta[0]; dy += delta[1]; } }
    const movement = unit(dx, dy);
    if (movement) { this.player.x = clamp(this.player.x + movement.x * 190 * dt, 15, WIDTH - 15); this.player.y = clamp(this.player.y + movement.y * 190 * dt, 15, HEIGHT - 15); }
    this.primaryCooldown -= dt; this.mouseCooldown -= dt;
    if (this.keys.has(' ') && this.primaryCooldown <= 0) { this.fire(this.facing, 'primary'); this.primaryCooldown = 0.16; }
    this.assistedTarget = this.assist && !this.mouseFiring ? this.enemies.filter(enemy => enemy.hp > 0).reduce((best, enemy) =>
      !best || Math.hypot(enemy.x - WIDTH / 2, enemy.y - HEIGHT / 2) < Math.hypot(best.x - WIDTH / 2, best.y - HEIGHT / 2) ? enemy : best, null) : null;
    const targetPoint = this.mouseFiring ? this.aim : this.assistedTarget;
    if ((this.mouseFiring || (this.assist && this.keys.has(' ') && targetPoint)) && this.mouseCooldown <= 0) {
      this.fire(unit(targetPoint.x - this.player.x, targetPoint.y - this.player.y), this.mouseFiring ? 'mouse' : 'assist'); this.mouseCooldown = 0.21;
    }
    this.spawnClock -= dt;
    if (this.remaining > 0 && this.spawnClock <= 0) { this.spawn(); this.remaining--; this.spawnClock = 0.85; }
    for (const drone of this.drones) {
      drone.ttl -= dt; drone.cooldown -= dt; drone.angle += dt * 2;
      if (drone.ttl <= 0) continue;
      const origin = { x: this.player.x + Math.cos(drone.angle) * 30, y: this.player.y + Math.sin(drone.angle) * 30 };
      const target = this.enemies.reduce((best, enemy) => !best || Math.hypot(enemy.x - origin.x, enemy.y - origin.y) < Math.hypot(best.x - origin.x, best.y - origin.y) ? enemy : best, null);
      if (target && drone.cooldown <= 0) { this.fire(unit(target.x - origin.x, target.y - origin.y), 'drone', origin); drone.cooldown = 0.3; }
    }
    this.drones = this.drones.filter(d => d.ttl > 0);
    for (const shot of this.shots) {
      shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.ttl -= dt;
      if (shot.ttl <= 0) continue;
      const target = this.enemies.find(e => e.hp > 0 && Math.hypot(e.x - shot.x, e.y - shot.y) < e.radius + 5);
      if (target) { target.hp -= shot.damage; shot.ttl = 0; }
    }
    this.shots = this.shots.filter(s => s.ttl > 0 && s.x >= -20 && s.x <= WIDTH + 20 && s.y >= -20 && s.y <= HEIGHT + 20);
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) { this.score += enemy.boss ? 200 : 25; this.effects.push({ x: enemy.x, y: enemy.y, ttl: 0.35 }); continue; }
      const direction = unit(WIDTH / 2 - enemy.x, HEIGHT / 2 - enemy.y);
      if (direction) { enemy.x += direction.x * enemy.speed * dt; enemy.y += direction.y * enemy.speed * dt; }
      if (Math.hypot(enemy.x - WIDTH / 2, enemy.y - HEIGHT / 2) < enemy.radius + 19) {
        this.core = Math.max(0, this.core - enemy.damage); enemy.hp = 0;
      } else if (Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y) < enemy.radius + 12) {
        this.player.hp = Math.max(0, this.player.hp - enemy.damage); enemy.hp = 0;
      }
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
    this.effects.forEach(e => { e.ttl -= dt; }); this.effects = this.effects.filter(e => e.ttl > 0);
    if (this.core <= 0 || this.player.hp <= 0) { this.phase = 'lost'; this.releaseInputs(); this.message = 'Defense breached. Retry the wave checkpoint, or start a new run.'; return; }
    if (this.remaining === 0 && this.enemies.length === 0) this.endWave();
  }
  endWave() {
    if (this.phase !== 'running') return;
    this.releaseInputs(); this.drones = []; this.shots = [];
    if (this.wave === WAVES.length) { this.phase = 'won'; this.message = 'Five waves secured! Your defense milestone is complete.'; return; }
    this.phase = this.mode === 'bash' ? 'quiz' : 'intermission';
    this.quizIndex = 0; this.quizResults = [];
    this.message = this.mode === 'bash' ? 'Bash briefing: correct first responses earn bonus drone charges. You may review or skip.' : 'Wave secured. Refit, then select the next wave.';
  }
  answerQuiz(answer) {
    if (this.phase !== 'quiz') return null;
    const question = this.currentQuestion();
    if (!question || !Number.isInteger(answer) || answer < 0 || answer >= question.options.length) return null;
    if (this.quizResults[this.quizIndex]) return this.quizResults[this.quizIndex];
    const correct = answer === question.answer;
    const result = { questionId: question.id, answer, correct, bonus: correct && this.stock < 8 ? 1 : 0 };
    this.stock += result.bonus; this.quizResults[this.quizIndex] = result;
    return result;
  }
  nextQuestion() {
    if (this.phase !== 'quiz' || !this.quizResults[this.quizIndex]) return false;
    if (this.quizIndex + 1 < this.questions().length) this.quizIndex++;
    else this.phase = 'intermission';
    return true;
  }
  nextWave() {
    if (!['quiz', 'intermission'].includes(this.phase) || this.wave >= WAVES.length) return false;
    this.wave++; this.phase = 'ready'; this.quizIndex = 0; this.quizResults = [];
    this.stock = Math.min(8, this.stock + 1); this.core = Math.min(100, this.core + 15); this.player.hp = Math.min(100, this.player.hp + 20);
    this.player.x = WIDTH / 2; this.player.y = HEIGHT / 2 + 75;
    this.message = `Wave ${this.wave} refit: +1 standard drone charge, up to 15 core and 20 hull restored.`;
    return true;
  }
  checkpoint() {
    if (!['ready', 'quiz', 'intermission'].includes(this.phase)) return null;
    return { version: 2, mode: this.mode, phase: this.phase, wave: this.wave, score: this.score,
      hp: this.player.hp, core: this.core, stock: this.stock, quizIndex: this.quizIndex,
      quizPlan: this.quizPlan.map(pair => [...pair]), assist: this.assist,
      quizResults: this.quizResults.map(r => ({ ...r })) };
  }
}

export function restoreCheckpoint(raw) {
  if (![1, 2].includes(raw?.version) || !['vim', 'bash'].includes(raw.mode) || !['ready', 'quiz', 'intermission'].includes(raw.phase) ||
      !Number.isInteger(raw.wave) || raw.wave < 1 || raw.wave > WAVES.length ||
      !Number.isInteger(raw.stock) || raw.stock < 0 || raw.stock > 8 ||
      !Number.isSafeInteger(raw.score) || raw.score < 0 ||
      !Number.isFinite(raw.hp) || raw.hp <= 0 || raw.hp > 100 || !Number.isFinite(raw.core) || raw.core <= 0 || raw.core > 100 ||
      !Number.isInteger(raw.quizIndex) || raw.quizIndex < 0 || raw.quizIndex > 1 || !Array.isArray(raw.quizResults) || raw.quizResults.length > 2) return null;
  if (raw.phase === 'quiz' && (raw.mode !== 'bash' || raw.wave >= WAVES.length)) return null;
  if (raw.phase === 'intermission' && raw.wave >= WAVES.length) return null;
  if (raw.phase === 'ready' && (raw.quizIndex !== 0 || raw.quizResults.length)) return null;
  const plan = raw.version === 1 ? legacyQuizPlan() : raw.quizPlan;
  if (!validateQuizPlan(plan) || (raw.version === 2 && typeof raw.assist !== 'boolean')) return null;
  for (let i = 0; i < raw.quizResults.length; i++) {
    const r = raw.quizResults[i], q = QUESTION_BY_ID[plan[raw.wave - 1]?.[i]];
    if (!q || !r || !Number.isInteger(r.answer) || r.answer < 0 || r.answer >= q.options.length ||
        r.correct !== (r.answer === q.answer) || ![0, 1].includes(r.bonus) || (!r.correct && r.bonus !== 0) ||
        (raw.version === 2 && r.questionId !== q.id)) return null;
  }
  if (raw.quizIndex > raw.quizResults.length) return null;
  const game = new DefenseGame(raw.mode, Math.random, { quizPlan: plan, assist: raw.assist }); game.phase = raw.phase; game.wave = raw.wave; game.score = raw.score;
  game.player.hp = raw.hp; game.core = raw.core; game.stock = raw.stock; game.quizIndex = raw.quizIndex;
  game.quizResults = raw.quizResults.map((r, i) => ({ ...r, questionId: plan[raw.wave - 1][i] }));
  game.message = 'Wave checkpoint restored. Controls are released until you resume.';
  return game;
}

export const emptyDefenseRecord = () => ({ version: 1, best: 0, wins: 0, checkpoint: null, review: {}, assist: false });
export function normalizeDefenseRecord(raw) {
  if (raw?.version !== 1 || !Number.isSafeInteger(raw.best) || raw.best < 0 || !Number.isSafeInteger(raw.wins) || raw.wins < 0) return null;
  return { version: 1, best: raw.best, wins: raw.wins, checkpoint: restoreCheckpoint(raw.checkpoint)?.checkpoint() || null,
    review: normalizeReview(raw.review), assist: raw.assist === true };
}
