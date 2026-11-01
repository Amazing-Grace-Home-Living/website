import test from 'node:test';
import assert from 'node:assert/strict';
import { createAcademyHarness as engine } from './helpers/academy.mjs';

test('new boards are full, stable, and playable', () => {
  const { run } = engine();
  assert.equal(run(`Array.from({length: 100}, () => createPlayableGrid()).every(g =>
    g.flat().length === 49 && g.flat().every(Boolean) && !findMatches(g).length && hasLegalMove(g))`), true);
});

test('fallback board is playable even when random candidates are dead', () => {
  const { run } = engine();
  assert.equal(run(`(() => {
    createInitialGrid = () => Array.from({length: 7}, (_, r) =>
      Array.from({length: 7}, (_, c) => GEM_TYPES[(r+c)%5]));
    const g = createPlayableGrid();
    return findMatches(g).length === 0 && hasLegalMove(g);
  })()`), true);
});

test('input and decisions cannot change a resolving board', () => {
  const { run } = engine();
  assert.equal(run(`(() => {
    resolving = true;
    const before = JSON.stringify(grid);
    handleCellClick(0, 0);
    handlePlayerChoice('System Break');
    return JSON.stringify(grid) === before && selectedCell === null && awarenessLevel === 0 && movesLeft === 20;
  })()`), true);
});

test('decisions are limited and unlock after a successful match resolves', () => {
  const { run } = engine();
  run(`handlePlayerChoice('System Break'); handlePlayerChoice('Architect Move')`);
  assert.equal(run('awarenessLevel'), 15);
  assert.equal(run('integrityImpact'), 90);
  run('processMatches()'); // Stable board: complete the resolution phase.
  run(`handlePlayerChoice('Architect Move')`);
  assert.equal(run('awarenessLevel'), 20);
  assert.equal(run('integrityImpact'), 100);
  run(`movesLeft = 0; handlePlayerChoice('System Break')`);
  assert.equal(run('awarenessLevel'), 20);
});

test('restart cancels a pending cascade and restores a clean session', () => {
  const { run, timers } = engine();
  run(`grid[0][0] = grid[0][1] = grid[0][2] = 'heart'; processMatches()`);
  assert.equal(run('resolving'), true);
  assert.equal(timers.size, 1);
  run('initGame()');
  assert.equal(timers.size, 0);
  assert.equal(run('resolving'), false);
  assert.equal(run('score'), 0);
  assert.equal(run('movesLeft'), 20);
  assert.equal(run('findMatches(grid).length'), 0);
});

test('dead-board recovery preserves score and moves', () => {
  const { run } = engine();
  run(`grid = Array.from({length: 7}, (_, r) => Array.from({length: 7}, (_, c) => GEM_TYPES[(r+c)%5])); score = 120; movesLeft = 8;`);
  assert.equal(run('hasLegalMove(grid)'), false);
  run('ensurePlayableBoard()');
  assert.equal(run('hasLegalMove(grid)'), true);
  assert.equal(run('findMatches(grid).length'), 0);
  assert.equal(run('score'), 120);
  assert.equal(run('movesLeft'), 8);
});

test('final move completes all cascades before game over', () => {
  const { run, timers, elements } = engine();
  run(`movesLeft = 0; grid[0][0] = grid[0][1] = grid[0][2] = 'heart'; processMatches()`);
  let steps = 0;
  while (timers.size && steps++ < 200) {
    const [id, callback] = timers.entries().next().value;
    timers.delete(id);
    callback();
  }
  assert.ok(steps < 200);
  assert.equal(run('resolving'), false);
  assert.equal(run('findMatches(grid).length'), 0);
  assert.match(elements.get('modal-message').innerText, /Final Score:/);
  assert.equal(elements.get('btn-choice-systembreak').disabled, true);
});

test('all displayed objectives are required before the mission knowledge checkpoint', () => {
  const { run } = engine();
  run('score = 500; matchesThisLevel = 2; checkMissionProgress()');
  assert.equal(run('missionState'), 'playing');
  run('matchesThisLevel = 3; checkMissionProgress()');
  assert.equal(run('missionState'), 'quiz');
  assert.equal(run('player.xp'), 0);
  run('player.currentCampaignLevel = 1; setupCurrentMission(); score = 1200; starsThisLevel = 4; checkMissionProgress()');
  assert.equal(run('missionState'), 'playing');
  run('starsThisLevel = 5; checkMissionProgress()'); assert.equal(run('missionState'), 'quiz');
  run('player.currentCampaignLevel = 2; setupCurrentMission(); score = 1800; bestComboThisLevel = 2; checkMissionProgress()');
  assert.equal(run('missionState'), 'playing');
  run('bestComboThisLevel = 3; checkMissionProgress()'); assert.equal(run('missionState'), 'quiz');
});

test('wrong quiz answers require retry; question and mission XP cannot be farmed', () => {
  const { run, click, elements } = engine();
  run('score = 500; matchesThisLevel = 3; checkMissionProgress()');
  run(`selectedAnswerIndex = 0; document.getElementById('quiz-submit-btn').disabled = false`);
  click('quiz-submit-btn');
  assert.equal(elements.get('quiz-submit-btn').innerText, 'TRY AGAIN');
  assert.equal(run('player.currentCampaignLevel'), 0); assert.equal(run('player.xp'), 0);
  click('quiz-submit-btn');
  run(`selectedAnswerIndex = 1; document.getElementById('quiz-submit-btn').disabled = false`);
  click('quiz-submit-btn'); assert.equal(run('player.xp'), 25);
  // Restarting after a correct response must not award the question twice.
  run('initGame(); score = 500; matchesThisLevel = 3; checkMissionProgress()');
  run(`selectedAnswerIndex = 1; document.getElementById('quiz-submit-btn').disabled = false`);
  click('quiz-submit-btn'); assert.equal(run('player.xp'), 25);
  click('quiz-submit-btn'); assert.equal(run('player.xp'), 75);
  assert.equal(run('player.currentCampaignLevel'), 1);
  click('quiz-submit-btn'); run('completeLevel()'); assert.equal(run('player.xp'), 75);
});

test('completed campaign remains completed on reload and malformed profile data is ignored', () => {
  const { run, saves } = engine();
  saves.set('graceNexusProgress', JSON.stringify({ version: 2, player: { currentCampaignLevel: 4, xp: 800, badges: ['First Spark'], certificates: ['Earth Guardian'] } }));
  run('initGame()'); assert.equal(run('missionState'), 'all-complete');
  assert.equal(run('player.currentCampaignLevel'), 4); assert.equal(run('movesLeft'), 0);
  run('completeLevel()'); assert.equal(run('player.xp'), 800);
  const fresh = engine();
  fresh.saves.set('graceNexusProgress', JSON.stringify({ version: 2, player: { currentCampaignLevel: 999, xp: -1, badges: ['<img src=x onerror=alert(1)>'], certificates: 'broken', answeredQuestionIds: 'broken' } }));
  fresh.run('initGame()');
  assert.equal(fresh.run('player.badges.length'), 0); assert.equal(fresh.run('player.certificates.length'), 0); assert.equal(fresh.run('player.xp'), 0);
});

test('hints are free and identify a real legal swap without changing the board', () => {
  const { run, click } = engine(); const before = run('JSON.stringify(grid)');
  click('btn-hint');
  assert.equal(run('hintCells.length'), 2); assert.equal(run('movesLeft'), 20); assert.equal(run('score'), 0);
  assert.equal(run('JSON.stringify(grid)'), before);
  assert.equal(run('findMatches(applySwap(grid, hintCells[0].r, hintCells[0].c, hintCells[1].r, hintCells[1].c)).length > 0'), true);
});
