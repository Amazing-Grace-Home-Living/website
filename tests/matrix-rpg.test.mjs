import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, QUESTS, ROLES } from '../src/game/matrix-rpg/content.js';
import { newAdventure, normalizeAdventure, questUnlocked, chapterUnlocked, chapterComplete, checkProof, validRoute, finishQuest, adventureSummary, createAdventureStore, RPG_KEY } from '../src/game/matrix-rpg/engine.js';
import { emptyProgress, completeLevel, normalizeProgress, levelUnlocked, recordQuiz, progressSummary } from '../src/game/learning/progression.js';
import { LESSONS } from '../src/game/learning/curriculum.js';

function route(board) {
  const queue = [[board.start]], seen = new Set();
  while (queue.length) {
    const path = queue.shift(), current = path.at(-1), mask = board.keys.map(k => Number(path.includes(k))).join('');
    if (validRoute(board, path)) return path;
    const key = `${current}:${mask}`;
    if (seen.has(key) || path.length - 1 >= board.budget) continue;
    seen.add(key);
    for (const delta of [-board.size, board.size, -1, 1]) {
      const next = current + delta;
      if (next < 0 || next >= board.size ** 2 || board.blocked.includes(next)) continue;
      if (Math.abs(Math.floor(next / board.size) - Math.floor(current / board.size)) + Math.abs(next % board.size - current % board.size) !== 1) continue;
      if (next === board.goal && !board.keys.every(k => path.includes(k))) continue;
      queue.push([...path, next]);
    }
  }
  throw Error('Unsolvable route');
}
function proof(q) {
  if (q.type === 'memory') return { sequence: q.reverse ? [...q.sequence].reverse() : [...q.sequence] };
  if (q.type === 'route') return { path: route(q.board) };
  if (q.type === 'choice') return { choice: q.choices[0].id };
  return { answers: q.questions.map(question => question.answer) };
}
function through(count = QUESTS.length, role = 'navigator') {
  return QUESTS.slice(0, count).reduce((state, q) => finishQuest(state, q.id, proof(q)), newAdventure(role));
}

test('all roles can enter the first region; guardians and later regions require completed quests', () => {
  assert.equal(chapterUnlocked(newAdventure(), 'garden'), false);
  for (const role of ROLES) {
    const state = newAdventure(role.id);
    assert.equal(questUnlocked(state, 'echo-trail'), true);
    assert.equal(questUnlocked(state, 'root-guardian'), false);
    assert.equal(chapterUnlocked(state, 'commons'), false);
    assert.throws(() => finishQuest(state, 'root-guardian', proof(QUESTS[3])), /earlier region/);
  }
  const state = through(4);
  assert.equal(chapterComplete(state, 'garden'), true);
  assert.equal(chapterUnlocked(state, 'commons'), true);
  assert.equal(chapterUnlocked(state, 'archive'), false);
});

test('recall exercises require correct order, with explicit reverse recall in the archive', () => {
  const echo = QUESTS.find(q => q.id === 'echo-trail'), mirror = QUESTS.find(q => q.id === 'mirror-echo');
  assert.equal(checkProof(echo, { sequence: echo.sequence }), true);
  assert.equal(checkProof(echo, { sequence: [0, 0, 0, 0] }), false);
  assert.equal(checkProof(mirror, { sequence: mirror.sequence }), false);
  assert.equal(checkProof(mirror, { sequence: [...mirror.sequence].reverse() }), true);
  assert.equal(checkProof(echo, { sequence: Array(4) }), false);
});

test('route puzzles are solvable within budget and reject diagonals, jumps, walls, missing keys, and extra moves', () => {
  for (const quest of QUESTS.filter(q => q.type === 'route')) {
    const path = route(quest.board);
    assert.equal(validRoute(quest.board, path), true);
    assert.ok(path.length - 1 <= quest.board.budget);
    assert.equal(validRoute(quest.board, [20, 16, 12, 8, 4]), false);
    assert.equal(validRoute(quest.board, [20, 4]), false);
    assert.equal(validRoute(quest.board, [20, 15, 10, 5, 0, 1, 2, 3, 4]), false);
    assert.equal(validRoute(quest.board, [...path, 9]), false);
    assert.equal(validRoute({ ...quest.board, budget: 1 }, path), false);
    assert.equal(validRoute(quest.board, Array(5)), false);
  }
});

test('educational answers are checked and unsuccessful proof cannot mutate a save', () => {
  const state = newAdventure('navigator'), q = QUESTS[1], before = JSON.stringify(state);
  assert.throws(() => finishQuest(state, q.id, { answers: [99, 99, 99] }), /Not quite/);
  assert.equal(JSON.stringify(state), before);
  assert.equal(checkProof(q, { answers: q.questions.map(question => question.answer) }), true);
  assert.equal(checkProof(q, { answers: [] }), false);
});

test('story alternatives have equal rewards and replay keeps the original journal decision', () => {
  const q = QUESTS.find(q => q.type === 'choice'), first = newAdventure('mediator');
  const outcomes = q.choices.map(c => finishQuest(first, q.id, { choice: c.id }));
  assert.equal(new Set(outcomes.map(s => adventureSummary(s).xp)).size, 1);
  assert.equal(new Set(q.choices.map(c => c.outcome)).size, q.choices.length);
  const replay = finishQuest(outcomes[0], q.id, { choice: q.choices[1].id });
  assert.equal(replay.choices[q.id], q.choices[0].id);
  assert.equal(adventureSummary(replay).xp, q.xp);
});

test('all twelve quests form a complete, finite RPG with three relics and no duplicate XP', () => {
  const state = through(), summary = adventureSummary(state);
  assert.equal(summary.completed, 12); assert.equal(summary.chapters, 3);
  assert.equal(summary.relics.length, 3); assert.equal(summary.xp, 410); assert.equal(summary.level, 5);
  assert.deepEqual(summary.skills, { observation: 2, reasoning: 4, reflection: 3, knowledge: 3 });
  assert.deepEqual(finishQuest(state, QUESTS[0].id, proof(QUESTS[0])), state);
  assert.equal(adventureSummary({ ...state, role: 'archivist' }).xp, 410);
});

test('save normalization drops unknown, duplicate, impossible, or incomplete choice checkpoints', () => {
  const raw = { version: 1, role: 'navigator', completed: ['core-guardian', 'root-guardian', 'echo-trail', 'echo-trail', 'garden-council', '<script>'], choices: { 'garden-council': 'unknown' } };
  assert.deepEqual(normalizeAdventure(raw).completed, ['echo-trail']);
  assert.deepEqual(normalizeAdventure({ ...raw, version: 999 }), newAdventure());
  assert.deepEqual(normalizeAdventure({ ...raw, role: '<script>' }), newAdventure());
});

test('storage resumes valid checkpoints, recovers corrupt saves, and handles quota or privacy failures', () => {
  const values = new Map(), storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const a = createAdventureStore(storage); a.save(through(2));
  assert.deepEqual(createAdventureStore(storage).read(), through(2));
  values.set(RPG_KEY, '{broken'); assert.deepEqual(createAdventureStore(storage).read(), newAdventure());
  const blocked = createAdventureStore({ getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } });
  blocked.read(); blocked.save(through(2)); assert.equal(blocked.persistent, false);
  assert.equal(blocked.read().completed.length, 2);
  const quota = createAdventureStore({ getItem: () => JSON.stringify(newAdventure()), setItem() { throw Error('quota'); } });
  quota.save(through(2)); assert.equal(quota.read().completed.length, 2);
});

test('RPG campaign milestones require earlier regions and provide an alternative Nexus practice prerequisite', () => {
  let campaign = emptyProgress();
  assert.throws(() => completeLevel(campaign, 'rpg-archive'), /locked/);
  assert.deepEqual(normalizeProgress({ version: 1, quizzes: {}, completedLevels: ['rpg-archive'] }).completedLevels, []);
  campaign = completeLevel(campaign, 'rpg-garden');
  assert.equal(levelUnlocked(campaign, 'tower-nexus'), false);
  campaign = recordQuiz(campaign, 'foundations', LESSONS[0].questions.map(q => q.answer)).state;
  assert.equal(levelUnlocked(campaign, 'tower-nexus'), true);
  for (const chapter of CHAPTERS.slice(1)) campaign = completeLevel(campaign, chapter.milestone);
  assert.equal(progressSummary(campaign).xp, 375);
  assert.ok(progressSummary(campaign).badges.includes('Signalkeeper'));
});
