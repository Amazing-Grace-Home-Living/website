import test from 'node:test';
import assert from 'node:assert/strict';
import { exportPassport, parsePassport, planRestore, restorePassport, PASSPORT_FORMAT, PASSPORT_RECORDS, MAX_PASSPORT_SIZE } from '../src/game/learning/transfer.js';
import { CAMPAIGN_KEY, emptyProgress, recordQuiz, completeLevel } from '../src/game/learning/progression.js';
import { createCampaignStore } from '../src/game/learning/campaign-store.js';
import { LESSONS } from '../src/game/learning/curriculum.js';
import { RPG_KEY, newAdventure, finishQuest } from '../src/game/matrix-rpg/engine.js';
import { QUESTS } from '../src/game/matrix-rpg/content.js';
import { SAVE_KEY as MATCH_KEY, newGame, validSave } from '../src/game/progress.js';
import { SAVE_KEY as DEFENSE_KEY, DefenseGame } from '../src/game/vim-defense/engine.js';
import { ACADEMY_KEY, newAcademy, gradeLesson, createAcademyStore } from '../src/game/academy/state.js';
import { PS_LESSONS } from '../src/game/academy/content.js';
import { nextLearningStep } from '../src/game/learning/next-step.js';

function storage() {
  const data = new Map(), reads = [];
  return { data, reads, getItem(key) { reads.push(key); return data.get(key) ?? null; }, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
const pass = (state, id) => recordQuiz(state, id, LESSONS.find(l => l.id === id).questions.map(q => q.answer)).state;
function story(role = 'navigator', choice = 0) {
  return QUESTS.slice(0, 4).reduce((state, q) => finishQuest(state, q.id,
    q.type === 'memory' ? { sequence: q.sequence } : q.type === 'choice' ? { choice: q.choices[choice].id } : { answers: q.questions.map(question => question.answer) }), newAdventure(role));
}
function fixture() {
  const s = storage();
  s.setItem(CAMPAIGN_KEY, JSON.stringify({ ...pass(emptyProgress(), 'foundations'), privateToken: 'excluded-test-sentinel' }));
  s.setItem(RPG_KEY, JSON.stringify({ ...story(), privateToken: 'excluded-test-sentinel' }));
  const match = newGame(2, 1200, ['First light']); match.grid[0][0].privateToken = 'excluded-test-sentinel';
  s.setItem(MATCH_KEY, JSON.stringify(match));
  s.setItem(DEFENSE_KEY, JSON.stringify({ version: 1, best: 1800, wins: 1, checkpoint: new DefenseGame().checkpoint(), review: { pwd: { attempts: 1, correct: 0, lastCorrect: false } }, privateToken: 'excluded-test-sentinel' }));
  const academy = gradeLesson(newAcademy(), PS_LESSONS[0].id, PS_LESSONS[0].questions.map(q => q.answer)).state;
  s.setItem(ACADEMY_KEY, JSON.stringify({ ...academy, player: 'Learner A', privateToken: 'excluded-test-sentinel' }));
  s.setItem('graceNexusProgress', JSON.stringify({ version: 2, player: { currentCampaignLevel: 1, xp: 75, answeredQuestionIds: ['earth-1:0'], privateToken: 'excluded-test-sentinel' } }));
  s.setItem('aghl_sevenStarsCompleted', JSON.stringify(['Ephesus', 'Smyrna', 'Pergamum', 'Thyatira', 'Sardis', 'Philadelphia', 'Laodicea']));
  s.setItem('bridge-token', 'excluded-test-sentinel');
  return s;
}

test('export reads only named game records and strips unrelated nested data', () => {
  const s = fixture(), result = exportPassport(s, new Date('2026-11-01T00:00:00Z'));
  assert.equal(Object.keys(result.passport.records).length, 7);
  assert.deepEqual(new Set(s.reads), new Set(PASSPORT_RECORDS.map(r => r.key)));
  assert.equal(JSON.stringify(result.passport).includes('excluded-test-sentinel'), false);
  assert.equal(result.passport.records[ACADEMY_KEY].player, 'Learner A');
  assert.deepEqual(result.warnings, []);
});

test('preview is read-only; a fresh restore reconciles real game checkpoints into learning milestones', () => {
  const file = exportPassport(fixture()).passport, target = storage(), parsed = parsePassport(JSON.stringify(file));
  const plan = planRestore(target, parsed.passport);
  assert.equal(target.data.size, 0); assert.equal(plan.changes.length, 7);
  assert.equal(plan.summary.xp, 425);
  const applied = restorePassport(target, parsed.passport);
  assert.equal(applied.summary.xp, 425); assert.equal(target.data.size, 7);
  const shared = JSON.parse(target.getItem(CAMPAIGN_KEY));
  assert.ok(['match-1', 'rpg-garden', 'vim-defense', 'matrix-academy', 'seven-stars'].every(id => shared.completedLevels.includes(id)));
  assert.equal(restorePassport(target, parsed.passport).changes.length, 0);
});

test('merge preserves best lesson results, consumed shield, current story choice, and VIM checkpoint', () => {
  const target = fixture(), incoming = fixture();
  let shared = pass(completeLevel(pass(emptyProgress(), 'foundations'), 'match-1'), 'foundations');
  shared = { ...shared, sovereignShieldUsed: true };
  target.setItem(CAMPAIGN_KEY, JSON.stringify(shared));
  target.setItem(RPG_KEY, JSON.stringify(story('mediator', 1)));
  const currentDefense = JSON.parse(target.getItem(DEFENSE_KEY));
  currentDefense.checkpoint.stock = 5; currentDefense.best = 2200;
  target.setItem(DEFENSE_KEY, JSON.stringify(currentDefense));
  const imported = JSON.parse(incoming.getItem(DEFENSE_KEY)); imported.best = 2000; imported.review.pwd = { attempts: 3, correct: 2, lastCorrect: true };
  incoming.setItem(DEFENSE_KEY, JSON.stringify(imported));
  restorePassport(target, exportPassport(incoming).passport);
  const result = JSON.parse(target.getItem(CAMPAIGN_KEY)), adventure = JSON.parse(target.getItem(RPG_KEY)), defense = JSON.parse(target.getItem(DEFENSE_KEY));
  assert.equal(result.quizzes.foundations.attempts, 2); assert.equal(result.sovereignShieldUsed, true);
  assert.equal(adventure.role, 'mediator'); assert.equal(adventure.choices['garden-council'], QUESTS[2].choices[1].id);
  assert.equal(defense.best, 2200); assert.equal(defense.checkpoint.stock, 5); assert.equal(defense.review.pwd.attempts, 3);
});

test('apply re-reads current progress rather than overwriting achievements earned after preview', () => {
  const target = storage(), file = exportPassport(fixture()).passport;
  planRestore(target, file);
  target.setItem(CAMPAIGN_KEY, JSON.stringify(completeLevel(emptyProgress(), 'bible-quiz')));
  restorePassport(target, file);
  assert.ok(JSON.parse(target.getItem(CAMPAIGN_KEY)).completedLevels.includes('bible-quiz'));
});

test('Match Maker merge chooses the further valid checkpoint and rejects impossible wins', () => {
  const target = storage(), source = storage();
  target.setItem(MATCH_KEY, JSON.stringify(newGame(2, 1500, ['First light'])));
  source.setItem(MATCH_KEY, JSON.stringify(newGame(3, 3500, ['Cascade keeper'])));
  restorePassport(target, exportPassport(source).passport);
  const saved = JSON.parse(target.getItem(MATCH_KEY));
  assert.equal(saved.level, 3); assert.equal(saved.total, 3500); assert.ok(saved.badges.includes('First light'));
  assert.equal(validSave({ ...newGame(), status: 'won' }), false);
  assert.equal(validSave({ ...newGame(), status: 'complete' }), false);
  assert.equal(validSave({ ...newGame(), status: 'lost', moves: 20 }), false);
});

test('invalid or future files fail before writing and unknown record names cannot pollute objects', () => {
  const target = storage();
  for (const text of ['{broken', JSON.stringify({ format: PASSPORT_FORMAT, version: 99, records: {} }), 'x'.repeat(MAX_PASSPORT_SIZE + 1)]) assert.throws(() => parsePassport(text));
  assert.throws(() => restorePassport(target, { format: PASSPORT_FORMAT, version: 1, records: { [CAMPAIGN_KEY]: emptyProgress(), [MATCH_KEY]: { version: 1, grid: [] } } }));
  assert.equal(target.data.size, 0);
  const parsed = parsePassport(JSON.stringify({ format: PASSPORT_FORMAT, version: 1, records: { ['__proto__']: { polluted: true }, [CAMPAIGN_KEY]: emptyProgress() } }));
  assert.equal(parsed.warnings.length, 1); assert.equal({}.polluted, undefined);
  restorePassport(target, parsed.passport); assert.equal(target.data.has('__proto__'), false);
});

test('unreadable local records are reported; blocked storage is never exported as an empty success', () => {
  const s = fixture(); s.setItem(RPG_KEY, '{broken');
  const exported = exportPassport(s);
  assert.equal(exported.warnings.length, 1); assert.equal(Object.keys(exported.passport.records).length, 6);
  assert.throws(() => exportPassport({ getItem() { throw Error('blocked'); } }), /blocked/);
});

test('a failed restore rolls back prior writes, with an explicit error if rollback also fails', () => {
  const base = storage(), original = JSON.stringify(emptyProgress()); base.setItem(CAMPAIGN_KEY, original);
  const file = { format: PASSPORT_FORMAT, version: 1, records: { [CAMPAIGN_KEY]: pass(emptyProgress(), 'foundations'), [RPG_KEY]: story() } };
  const quota = { getItem: base.getItem, removeItem: base.removeItem, setItem(key, value) { if (key === RPG_KEY) throw Error('quota'); base.setItem(key, value); } };
  assert.throws(() => restorePassport(quota, file), /Previous save values were restored/);
  assert.equal(base.getItem(CAMPAIGN_KEY), original); assert.equal(base.data.size, 1);
  let writes = 0;
  const failedRollback = { getItem: base.getItem, removeItem: base.removeItem, setItem(key, value) { if (++writes > 1) throw Error('quota'); base.setItem(key, value); } };
  assert.throws(() => restorePassport(failedRollback, file), error => error.partial === true && /rollback was incomplete/.test(error.message));
});

test('external deletion clears campaign and Academy memory without reviving old progress', () => {
  const s = storage(), campaign = createCampaignStore(s), academy = createAcademyStore(s);
  campaign.complete('match-1'); academy.event({ type: 'deploy' });
  s.removeItem(CAMPAIGN_KEY); s.removeItem(ACADEMY_KEY);
  assert.deepEqual(campaign.read(), emptyProgress()); assert.equal(academy.read().deployed, false);
  campaign.complete('bible-quiz'); assert.equal(campaign.read().completedLevels.includes('match-1'), false);
});

test('next-step guidance follows learning prerequisites and never links a locked mission', () => {
  let state = emptyProgress(); assert.equal(nextLearningStep(state).id, 'foundations');
  state = pass(state, 'foundations'); assert.equal(nextLearningStep(state).kind, 'practice');
  state = completeLevel(state, 'match-1'); assert.equal(nextLearningStep(state).id, 'tower-nexus');
  state = completeLevel(state, 'tower-nexus'); assert.equal(nextLearningStep(state).id, 'tactics');
  state = pass(state, 'tactics'); assert.equal(nextLearningStep(state).id, 'tower-syndicate');
  state = completeLevel(state, 'tower-syndicate'); assert.equal(nextLearningStep(state).id, 'adaptation');
});
