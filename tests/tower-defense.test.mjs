import test from 'node:test';
import assert from 'node:assert/strict';
import { TowerDefenseGame } from '../src/game/tower-defense/tower-defense-engine.js';
import { campaign } from '../src/game/learning/campaign-store.js';
import { LESSONS } from '../src/game/learning/curriculum.js';
import { progressSummary } from '../src/game/learning/progression.js';

function game(stage = 'nexus') {
  const g = Object.create(TowerDefenseGame.prototype);
  Object.assign(g, {
    stage, status: 'ready', path: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    wave: 1, waveActive: false, enemiesToSpawn: 0, spawnTimer: 0, autoTimer: null,
    autoWave: false, credits: 160, health: 25, score: 0,
    towers: [], enemies: [], projectiles: [], floatingTexts: [],
    vault: { economy: 0, integrity: 0, damage: 0, points: 100 },
    selectedTowerKey: 'pulse',
    setupUI() {}, updateHUD() {}, saveVault() {}, announce(text) { this.message = text; },
  });
  return g;
}

test('locked missions reject wave starts, placement, and stage switching', () => {
  const g = game(); g.status = 'locked'; g.startWave(); g.placeTower(1, 1);
  assert.equal(g.waveActive, false); assert.equal(g.towers.length, 0);
  g.switchStage('boss'); assert.equal(g.stage, 'nexus'); assert.match(g.message, /Locked/);
});

test('restart clears pending spawns, effects, timers, budget, health, and score', () => {
  const g = game();
  g.wave = 4; g.waveActive = true; g.enemiesToSpawn = 20; g.spawnTimer = 30; g.autoWave = true;
  g.projectiles = [{}]; g.enemies = [{}]; g.towers = [{}]; g.score = 200;
  g.autoTimer = setTimeout(() => assert.fail('restart timer was not canceled'), 100);
  g.resetMission();
  assert.equal(g.enemiesToSpawn, 0); assert.equal(g.spawnTimer, 0);
  assert.equal(g.wave, 1); assert.equal(g.score, 0); assert.equal(g.autoTimer, null);
  assert.equal(g.projectiles.length + g.enemies.length + g.towers.length, 0);
  assert.equal(g.health, 25); assert.equal(g.credits, 160); assert.equal(g.autoWave, false);
});

test('loss never awards completion or leaves a spawn running', () => {
  const g = game(); g.health = 1; g.waveActive = true; g.enemiesToSpawn = 2;
  g.enemies = [{ pathIdx: 1, x: 60, y: 20, speed: 1, slowDuration: 0 }];
  g.update();
  assert.equal(g.status, 'lost'); assert.equal(g.enemiesToSpawn, 0);
  assert.equal(campaign.read().completedLevels.includes('tower-nexus'), false);
  const points = g.vault.points; g.update(); assert.equal(g.vault.points, points);
});

test('final wave awards one mission completion; intermediate waves do not', () => {
  campaign.quiz('foundations', LESSONS[0].questions.map(q => q.answer)); campaign.complete('match-1');
  const g = game(); g.waveActive = true; g.update();
  assert.equal(g.status, 'ready'); assert.equal(g.wave, 2);
  assert.equal(campaign.read().completedLevels.includes('tower-nexus'), false);
  g.wave = 3; g.waveActive = true; g.update();
  assert.equal(g.status, 'won'); assert.equal(g.waveActive, false);
  assert.equal(campaign.read().completedLevels.includes('tower-nexus'), true);
  const xp = progressSummary(campaign.read()).xp;
  const replay = game(); replay.wave = 3; replay.waveActive = true; replay.update();
  assert.equal(progressSummary(campaign.read()).xp, xp);
});

test('splash damage removes and rewards all killed enemies', () => {
  const g = game();
  const enemy = x => ({ x, y: 20, hp: 1, reward: 15, pathIdx: 0, speed: 0, slowDuration: 0 });
  const target = enemy(20); g.enemies = [target, enemy(25)];
  g.projectiles = [{ x: 20, y: 20, target, speed: 9, damage: 30, effect: 'splash' }];
  g.update();
  assert.equal(g.enemies.length, 0); assert.equal(g.credits, 190);
});
