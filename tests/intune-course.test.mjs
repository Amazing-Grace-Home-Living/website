import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COURSE_STORAGE_KEY, MODULE_IDS, QUIZ_ANSWERS,
  normalizeCourseProgress, markModule, scoreQuiz
} from '../lms/microsoft-intune/progress.mjs';

test('Intune pathway uses a dedicated local progress key and three stable modules', () => {
  assert.match(COURSE_STORAGE_KEY, /intune/);
  assert.deepEqual(MODULE_IDS, ['reporting', 'rbac', 'tenant-health']);
});

test('malformed progress cannot add arbitrary modules or fake a quiz score', () => {
  assert.deepEqual(normalizeCourseProgress(null), { completed: [], bestQuiz: null });
  assert.deepEqual(
    normalizeCourseProgress({ completed: ['rbac', 'hacked', 'reporting', 'rbac'], bestQuiz: 99 }),
    { completed: ['reporting', 'rbac'], bestQuiz: null }
  );
  assert.deepEqual(normalizeCourseProgress({ completed: 'rbac', bestQuiz: 2.5 }), { completed: [], bestQuiz: null });
});

test('marking a module is reversible and does not change other modules', () => {
  let state = normalizeCourseProgress();
  state = markModule(state, 'reporting', true);
  state = markModule(state, 'rbac', true);
  state = markModule(state, 'reporting', false);
  assert.deepEqual(state, { completed: ['rbac'], bestQuiz: null });
  assert.deepEqual(markModule(state, 'rbac', true), state);
  assert.throws(() => markModule(state, 'unknown', true), /Unknown module/);
});

test('self-check answers are explicitly scored and never unlock a certificate', () => {
  assert.equal(scoreQuiz(QUIZ_ANSWERS), 3);
  assert.equal(scoreQuiz({ q1: 'a', q2: 'b', q3: 'c' }), 1);
  assert.equal(scoreQuiz({}), 0);
});
