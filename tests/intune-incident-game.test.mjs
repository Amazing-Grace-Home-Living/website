import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCENARIOS, MAX_POINTS, MISSION_STORAGE_KEY, startMission, submitDecision, missionScore, isComplete, normalizeMission } from '../lms/microsoft-intune/mission/engine.mjs';

test('Intune Ops contains six original, actionable incident scenarios with unique valid options', () => {
  assert.equal(SCENARIOS.length, 6);
  assert.equal(MAX_POINTS, 600);
  assert.match(MISSION_STORAGE_KEY, /intune/);
  assert.equal(new Set(SCENARIOS.map(s => s.id)).size, 6);
  for (const scenario of SCENARIOS) {
    assert.ok(scenario.title && scenario.brief && scenario.prompt && scenario.learn.startsWith('https://learn.microsoft.com/'));
    assert.ok(scenario.evidence.length >= 2);
    assert.equal(new Set(scenario.options.map(o => o.id)).size, scenario.options.length);
    assert.deepEqual(scenario.options.map(o => o.points).sort((a, b) => b - a), [100, 40, 0]);
    for (const option of scenario.options) assert.ok(option.label && option.feedback);
  }
});

test('full correct route gives 600, persists best, and rejects play after completion', () => {
  let state = startMission();
  for (const scenario of SCENARIOS) {
    const best = scenario.options.find(o => o.points === 100);
    state = submitDecision(state, scenario.id, best.id);
  }
  assert.equal(isComplete(state), true);
  assert.equal(missionScore(state), 600);
  assert.equal(state.best, 600);
  assert.throws(() => submitDecision(state, SCENARIOS[0].id, 'compare-sources'), /active scenario/);
  const replay = { ...startMission(), best: state.best };
  assert.equal(replay.best, 600);
  assert.equal(missionScore(replay), 0);
});

test('partial credit and risky choices score deterministically and do not overwrite the best', () => {
  let state = startMission();
  state = submitDecision(state, SCENARIOS[0].id, SCENARIOS[0].options.find(o => o.points === 40).id);
  state = submitDecision(state, SCENARIOS[1].id, SCENARIOS[1].options.find(o => o.points === 0).id);
  assert.equal(missionScore(state), 40);
  assert.equal(state.best, 40);
  assert.throws(() => submitDecision(state, SCENARIOS[2].id, 'not-a-real-option'), /Unknown decision/);
  assert.throws(() => submitDecision(state, SCENARIOS[0].id, SCENARIOS[0].options[0].id), /active scenario/);
});

test('malformed storage cannot inject choices or invent a high best score', () => {
  assert.deepEqual(normalizeMission(null), startMission());
  const prefix = SCENARIOS[0].options[0].id;
  const valid = normalizeMission({ version: 1, choices: [prefix, 'invalid', SCENARIOS[2].options[0].id], best: 9900 });
  assert.deepEqual(valid.choices, [prefix]);
  assert.equal(valid.best, 0);
  assert.deepEqual(normalizeMission({ version: 99, choices: [prefix], best: -1 }), startMission());
});

test('game is linked from the existing LMS, course, and arcade without external API calls', () => {
  const route = '/lms/microsoft-intune/mission/';
  const get = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  for (const page of ['lms/index.html', 'lms/microsoft-intune/index.html', 'arcade/index.html']) {
    assert.ok(get(page).includes(route), page + ' should surface the mission');
  }
  const html = get('lms/microsoft-intune/mission/index.html');
  const app = get('lms/microsoft-intune/mission/game.mjs');
  assert.match(html, /No live tenant or login required/);
  assert.match(html, /mission-progress/);
  assert.doesNotMatch(app, /\bfetch\s*\(|XMLHttpRequest|firebase\.auth|graph\.microsoft/);
  assert.match(app, /localStorage/);
});
