import test from 'node:test';
import assert from 'node:assert/strict';
import { DefenseGame, restoreCheckpoint } from '../src/game/vim-defense/engine.js';
import { QUIZZES, MOVE_KEYS, WIDTH, HEIGHT } from '../src/game/vim-defense/content.js';
import { QUESTION_POOLS, QUESTION_BY_ID, createQuizPlan, legacyQuizPlan, validateQuizPlan, recordReview, normalizeReview } from '../src/game/vim-defense/quiz-bank.js';
import { emptyProgress, completeLevel, progressSummary } from '../src/game/learning/progression.js';

function seeded() { let seed = 123456; return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); }
function running(mode = 'bash') { const g = new DefenseGame(mode, seeded()); g.startWave(); return g; }
function breakTime() { const g = running(); g.endWave(); return g; }

test('h j k l match arrow directions, set weapon facing, and diagonal speed is normalized', () => {
  for (const [key, alias] of [['h', 'ArrowLeft'], ['j', 'ArrowDown'], ['k', 'ArrowUp'], ['l', 'ArrowRight']]) {
    const a = running(), b = running(); a.setKey(key, true); b.setKey(alias, true); a.tick(1 / 60); b.tick(1 / 60);
    assert.deepEqual(a.player, b.player);
    assert.deepEqual(a.facing, { x: MOVE_KEYS[key][0], y: MOVE_KEYS[key][1] });
  }
  const g = running(), start = { ...g.player }; g.setKey('h', true); g.setKey('k', true); g.tick(0.05);
  assert.ok(Math.abs(Math.hypot(g.player.x - start.x, g.player.y - start.y) - 190 * 0.05) < 0.001);
  g.player.x = 15; g.player.y = 15; g.tick(0.05); assert.equal(g.player.x, 15); assert.equal(g.player.y, 15);
});

test('Space and mouse fire independent directions during the same simulation step', () => {
  const g = running(); g.facing = { x: -1, y: 0 }; g.aim = { x: g.player.x, y: g.player.y - 100 };
  g.setKey(' ', true); g.mouseFiring = true; g.tick(1 / 60);
  const primary = g.shots.find(s => s.source === 'primary'), mouse = g.shots.find(s => s.source === 'mouse');
  assert.ok(primary.vx < 0); assert.equal(primary.vy, 0);
  assert.equal(mouse.vx, 0); assert.ok(mouse.vy < 0);
  assert.equal(g.shots.length, 2);
});

test('drone charges are consumed once, active drones cap at three and expire', () => {
  const g = running(); g.stock = 5; g.remaining = 100; g.spawnClock = 1000;
  assert.equal(g.deploy(), true); assert.equal(g.deploy(), true); assert.equal(g.deploy(), true);
  assert.equal(g.deploy(), false); assert.equal(g.stock, 2);
  for (let frame = 0; frame < 15 * 60; frame++) g.tick(1 / 60);
  assert.equal(g.drones.length, 0); assert.equal(g.stock, 2);
  g.stock = 0; assert.equal(g.deploy(), false);
});

test('pause clears all held inputs, freezes the game, and never fires on resume', () => {
  const g = running(); g.setKey('l', true); g.setKey(' ', true); g.mouseFiring = true;
  g.pause(); const before = JSON.stringify(g.player); g.tick(0.05);
  assert.equal(g.phase, 'paused'); assert.equal(JSON.stringify(g.player), before);
  assert.equal(g.keys.size, 0); assert.equal(g.mouseFiring, false);
  assert.equal(g.deploy(), false); g.resume(); g.tick(1 / 60); assert.equal(g.shots.length, 0);
});

test('Bash rewards happen once per question and survive checkpoint reload', () => {
  const g = breakTime(), question = g.currentQuestion(), initial = g.stock;
  assert.equal(g.answerQuiz(99), null);
  const correct = g.answerQuiz(question.answer); assert.equal(correct.bonus, 1);
  assert.equal(g.stock, initial + 1); g.answerQuiz(question.answer); assert.equal(g.stock, initial + 1);
  const restored = restoreCheckpoint(g.checkpoint()); assert.ok(restored);
  restored.answerQuiz(question.answer); assert.equal(restored.stock, initial + 1);
  restored.nextQuestion(); restored.answerQuiz((restored.currentQuestion().answer + 1) % 3);
  const before = restored.stock; restored.answerQuiz(restored.currentQuestion().answer); assert.equal(restored.stock, before);
  restored.nextQuestion(); assert.equal(restored.phase, 'intermission');
  assert.equal(restored.startWave(), false);
});

test('quiz skip still refits, while VIM mode has no quiz and all stocks remain bounded', () => {
  const g = breakTime(); g.core = 80; g.player.hp = 80; const stock = g.stock;
  assert.equal(g.nextWave(), true); assert.equal(g.phase, 'ready'); assert.equal(g.wave, 2);
  assert.equal(g.stock, stock + 1); assert.equal(g.core, 95); assert.equal(g.player.hp, 100);
  const vim = running('vim'); vim.endWave(); assert.equal(vim.phase, 'intermission'); assert.equal(vim.answerQuiz(0), null);
  const full = breakTime(); full.stock = 8; assert.equal(full.answerQuiz(full.currentQuestion().answer).bonus, 0);
  full.nextWave(); assert.equal(full.stock, 8);
});

test('invalid checkpoints are rejected; quiz restore does not recreate combat entities or inputs', () => {
  const g = breakTime(); g.answerQuiz(g.currentQuestion().answer); const save = g.checkpoint();
  const restored = restoreCheckpoint(save); assert.equal(restored.phase, 'quiz'); assert.equal(restored.shots.length, 0); assert.equal(restored.keys.size, 0);
  for (const overrides of [{ wave: 6 }, { stock: -1 }, { hp: 0 }, { core: 999 }, { score: -1 }, { phase: 'running' }, { quizIndex: 9 }, { mode: 'unknown' }, { quizResults: [{ answer: 99, correct: true, bonus: 1 }] }]) assert.equal(restoreCheckpoint({ ...save, ...overrides }), null);
  assert.equal(restoreCheckpoint(null), null);
});

test('breached enemies cause damage, give no kill points, and loss cannot advance a wave', () => {
  const g = running(); g.core = 1; g.remaining = 0;
  g.enemies = [{ x: WIDTH / 2, y: HEIGHT / 2, hp: 20, maxHp: 20, speed: 20, radius: 11, damage: 9 }];
  g.tick(1 / 60); assert.equal(g.phase, 'lost'); assert.equal(g.score, 0); assert.equal(g.nextWave(), false);
});

test('actual five-wave combat is winnable with directional aim and drone support', () => {
  for (const mode of ['bash', 'vim']) {
    const g = running(mode); let steps = 0;
    while (g.phase !== 'won' && g.phase !== 'lost' && steps++ < 60000) {
      if (g.phase === 'running') {
        if (g.stock && g.drones.length < 2) g.deploy();
        const target = g.enemies.reduce((best, e) => !best || Math.hypot(e.x - WIDTH / 2, e.y - HEIGHT / 2) < Math.hypot(best.x - WIDTH / 2, best.y - HEIGHT / 2) ? e : best, null);
        if (target) { g.aim = { x: target.x, y: target.y }; g.mouseFiring = true; }
        g.tick(1 / 60);
      } else if (g.phase === 'quiz') {
        const q = g.currentQuestion(); g.answerQuiz(q.answer); g.nextQuestion();
      } else if (g.phase === 'intermission') { g.nextWave(); g.startWave(); }
    }
    assert.equal(g.phase, 'won', `${mode}: core ${g.core}, hull ${g.player.hp}, wave ${g.wave}, steps ${steps}`);
    assert.ok(g.score > 0); assert.equal(g.wave, 5);
    assert.equal(g.startWave(), false); assert.equal(g.checkpoint(), null);
  }
});

test('defense completion awards one LMS milestone and badge', () => {
  let state = completeLevel(emptyProgress(), 'vim-defense'); const summary = progressSummary(state);
  assert.equal(summary.xp, 100); assert.ok(summary.badges.includes('Home row defender'));
  state = completeLevel(state, 'vim-defense'); assert.equal(progressSummary(state).xp, 100);
});

test('keyboard target assist adds an aimed support stream and manual mouse fire takes priority', () => {
  const g = running(); g.assist = true; g.remaining = 100; g.spawnClock = 1000;
  const enemy = x => ({ x, y: 240, hp: 100, maxHp: 100, speed: 0, radius: 11, damage: 9 });
  g.enemies = [enemy(600), enemy(450)]; g.facing = { x: -1, y: 0 }; g.setKey(' ', true); g.tick(1 / 60);
  assert.equal(g.assistedTarget, g.enemies[1]);
  assert.ok(g.shots.some(s => s.source === 'primary' && s.vx < 0));
  assert.ok(g.shots.some(s => s.source === 'assist' && s.vx > 0 && s.vy < 0));
  g.mouseFiring = true; g.mouseCooldown = 0; g.aim = { x: 300, y: 400 }; g.tick(1 / 60);
  assert.equal(g.assistedTarget, null); assert.ok(g.shots.some(s => s.source === 'mouse' && s.vx < 0 && s.vy > 0));
  g.pause(); assert.equal(g.assistedTarget, null);
});

test('all five waves can be completed with Space, drones, and target assist without pointer aiming', () => {
  const g = running('vim'); g.assist = true; g.setKey(' ', true); let steps = 0;
  while (g.phase !== 'won' && g.phase !== 'lost' && steps++ < 60000) {
    if (g.phase === 'running') { if (g.stock && g.drones.length < 2) g.deploy(); g.tick(1 / 60); }
    else if (g.phase === 'intermission') { g.nextWave(); g.startWave(); g.setKey(' ', true); }
  }
  assert.equal(g.phase, 'won', `wave ${g.wave}, core ${g.core}, hull ${g.player.hp}`);
});

test('question plans vary, keep topic boundaries, and prioritize misses before unseen and answered cards', () => {
  assert.equal(QUESTION_POOLS.flat().length, 24); assert.equal(Object.keys(QUESTION_BY_ID).length, 24);
  const random = seeded(), plans = Array.from({ length: 8 }, () => createQuizPlan(random));
  assert.ok(new Set(plans.map(plan => JSON.stringify(plan))).size > 1);
  assert.ok(plans.every(validateQuizPlan));
  const review = recordReview({}, 'pwd', false), plan = createQuizPlan(seeded(), review);
  assert.ok(plan[0].includes('pwd')); assert.notEqual(plan[0][0], plan[0][1]);
  assert.equal(validateQuizPlan([['pwd', 'pwd'], ...legacyQuizPlan().slice(1)]), false);
  for (const q of QUESTION_POOLS.flat()) assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length && q.explanation);
});

test('version-2 checkpoints retain their exact quiz plan and reject mismatched results', () => {
  const g = breakTime(); g.assist = true; g.answerQuiz(g.currentQuestion().answer);
  const checkpoint = g.checkpoint(), restored = restoreCheckpoint(checkpoint);
  assert.equal(checkpoint.version, 2); assert.deepEqual(restored.quizPlan, g.quizPlan); assert.equal(restored.assist, true);
  assert.equal(restored.currentQuestion().id, g.currentQuestion().id);
  const before = restored.stock; restored.answerQuiz(restored.currentQuestion().answer); assert.equal(restored.stock, before);
  assert.equal(restoreCheckpoint({ ...checkpoint, quizPlan: [] }), null);
  assert.equal(restoreCheckpoint({ ...checkpoint, quizResults: [{ ...checkpoint.quizResults[0], questionId: 'unknown' }] }), null);
});

test('legacy checkpoints migrate without changing the original questions or issuing duplicate rewards', () => {
  const legacy = { version: 1, mode: 'bash', phase: 'quiz', wave: 1, score: 200, hp: 100, core: 100, stock: 3, quizIndex: 0,
    quizResults: [{ answer: QUIZZES[0][0].answer, correct: true, bonus: 1 }] };
  const restored = restoreCheckpoint(legacy); assert.ok(restored);
  assert.deepEqual(restored.quizPlan, legacyQuizPlan()); assert.equal(restored.currentQuestion().id, 'pwd');
  restored.answerQuiz(QUIZZES[0][0].answer); assert.equal(restored.stock, 3);
  assert.equal(restored.checkpoint().version, 2);
});

test('review history records response counts and ignores malformed or unknown cards', () => {
  let review = recordReview({}, 'pwd', false); review = recordReview(review, 'pwd', true);
  assert.deepEqual(review.pwd, { attempts: 2, correct: 1, lastCorrect: true });
  assert.deepEqual(recordReview(review, 'unknown', true), review);
  assert.deepEqual(recordReview(review, 'constructor', true), review);
  assert.deepEqual(normalizeReview({ pwd: { attempts: 1, correct: 9, lastCorrect: true } }), {});
  assert.deepEqual(normalizeReview({ '<script>': { attempts: 1, correct: 1, lastCorrect: true } }), {});
  assert.deepEqual(normalizeReview({ pwd: { attempts: 1, correct: 0, lastCorrect: true } }), {});
});
