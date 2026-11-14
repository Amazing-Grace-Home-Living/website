import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS } from '../src/game/learning/curriculum.js';
import { emptyProgress, normalizeProgress, gradeQuiz, recordQuiz, completeLevel, levelUnlocked, lessonUnlocked, progressSummary, CAMPAIGN_KEY } from '../src/game/learning/progression.js';
import { createCampaignStore } from '../src/game/learning/campaign-store.js';
import { newGame, SAVE_KEY } from '../src/game/progress.js';

const answers = id => LESSONS.find(l => l.id === id).questions.map(q => q.answer);
const passed = (state, id) => recordQuiz(state, id, answers(id)).state;
function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('Nexus requires both a quiz pass and either puzzle completion', () => {
  const initial = emptyProgress();
  assert.equal(levelUnlocked(initial, 'tower-nexus'), false);
  const quiz = passed(initial, 'foundations');
  assert.equal(levelUnlocked(quiz, 'tower-nexus'), false);
  assert.equal(levelUnlocked(completeLevel(quiz, 'match-1'), 'tower-nexus'), true);
  assert.equal(levelUnlocked(completeLevel(quiz, 'matrix-session'), 'tower-nexus'), true);
  assert.equal(levelUnlocked(completeLevel(quiz, 'bible-quiz'), 'tower-nexus'), false);
  assert.throws(() => completeLevel(initial, 'tower-nexus'), /locked/);
  assert.equal(initial.completedLevels.length, 0);
});

test('quiz grading requires a full submission and three correct; failure is retryable', () => {
  for (const malformed of [[], [0], Array(4), [-1, 0, 0, 0], [99, 0, 0, 0], [null, 0, 0, 0]]) assert.throws(() => gradeQuiz('foundations', malformed));
  const correct = answers('foundations');
  const wrong = correct.map(a => (a + 1) % 3);
  let outcome = recordQuiz(emptyProgress(), 'foundations', wrong);
  assert.equal(outcome.result.passed, false);
  outcome = recordQuiz(outcome.state, 'foundations', correct);
  assert.equal(outcome.result.passed, true);
  outcome = recordQuiz(outcome.state, 'foundations', wrong);
  assert.deepEqual(outcome.state.quizzes.foundations, { best: 4, attempts: 3 });
  const three = [...correct]; three[0] = wrong[0];
  assert.equal(gradeQuiz('foundations', three).passed, true);
  three[1] = wrong[1]; assert.equal(gradeQuiz('foundations', three).passed, false);
});

test('full campaign follows lesson and defense prerequisites, with idempotent XP', () => {
  let state = emptyProgress();
  assert.equal(lessonUnlocked(state, 'tactics'), false);
  assert.throws(() => recordQuiz(state, 'adaptation', answers('adaptation')));
  state = completeLevel(passed(state, 'foundations'), 'match-1');
  state = completeLevel(state, 'tower-nexus');
  assert.equal(lessonUnlocked(state, 'tactics'), true);
  assert.equal(levelUnlocked(state, 'tower-syndicate'), false);
  state = completeLevel(passed(state, 'tactics'), 'tower-syndicate');
  state = completeLevel(passed(state, 'adaptation'), 'tower-boss');
  const summary = progressSummary(state);
  assert.equal(summary.xp, 650);
  assert.equal(summary.missions, 3);
  assert.ok(summary.badges.includes('Campaign champion'));
  state = completeLevel(state, 'tower-boss');
  state = passed(state, 'adaptation');
  assert.equal(progressSummary(state).xp, summary.xp);
});

test('invalid, future, duplicate, or impossible progress cannot unlock stages', () => {
  assert.deepEqual(normalizeProgress({ version: 9 }), emptyProgress());
  const raw = { version: 1, quizzes: { adaptation: { best: 4, attempts: 1 } }, completedLevels: ['tower-boss', 'unknown', 'match-1', 'match-1'] };
  assert.deepEqual(normalizeProgress(raw).completedLevels, ['match-1']);
  assert.deepEqual(normalizeProgress(raw).quizzes, {});
  assert.equal(levelUnlocked(emptyProgress(), 'unknown'), false);
});

test('storage roundtrip and multiple store instances merge progress', () => {
  const storage = memoryStorage(), a = createCampaignStore(storage), b = createCampaignStore(storage);
  a.quiz('foundations', answers('foundations')); b.complete('match-1');
  assert.equal(levelUnlocked(a.read(), 'tower-nexus'), true);
  assert.deepEqual(createCampaignStore(storage).read(), a.read());
});

test('corrupt or unavailable storage falls back without crashing or losing in-tab progress', () => {
  const storage = memoryStorage(); storage.setItem(CAMPAIGN_KEY, '{broken');
  const store = createCampaignStore(storage);
  assert.deepEqual(store.read(), emptyProgress());
  store.quiz('foundations', answers('foundations')); store.complete('matrix-session');
  assert.equal(levelUnlocked(store.read(), 'tower-nexus'), true);
  const blocked = createCampaignStore({ getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } });
  blocked.quiz('foundations', answers('foundations')); blocked.complete('match-1');
  assert.equal(levelUnlocked(blocked.read(), 'tower-nexus'), true);
  assert.equal(blocked.persistent, false);
  // An old persisted value must not overwrite a newer failed write.
  const quota = createCampaignStore({ getItem: () => JSON.stringify(emptyProgress()), setItem() { throw Error('quota'); } });
  quota.quiz('foundations', answers('foundations')); quota.complete('match-1');
  assert.equal(levelUnlocked(quota.read(), 'tower-nexus'), true);
});

test('existing Match Maker save migrates only earned levels', () => {
  const storage = memoryStorage(), match = newGame(2);
  storage.setItem(SAVE_KEY, JSON.stringify(match));
  const store = createCampaignStore(storage); store.restoreLegacyMatch();
  assert.deepEqual(store.read().completedLevels, ['match-1']);
  store.restoreLegacyMatch(); assert.deepEqual(store.read().completedLevels, ['match-1']);
});

test('Academy completion requires First Light and awards shared campaign XP once', () => {
  assert.throws(() => completeLevel(emptyProgress(), 'matrix-earth'), /locked/);
  let state = completeLevel(emptyProgress(), 'matrix-academy');
  state = completeLevel(state, 'matrix-earth');
  assert.equal(progressSummary(state).xp, 200);
  assert.ok(progressSummary(state).badges.includes('Earth Academy guardian'));
  assert.equal(progressSummary(completeLevel(state, 'matrix-earth')).xp, 200);
});
