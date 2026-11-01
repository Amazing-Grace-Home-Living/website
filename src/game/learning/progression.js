import { LESSONS, LEVELS, PASS_COUNT } from './curriculum.js';
export const CAMPAIGN_KEY = 'amazing-grace-learning-v1';
export const emptyProgress = () => ({ version: 1, quizzes: {}, completedLevels: [] });

export function lessonUnlocked(state, id) {
  const lesson = LESSONS.find(l => l.id === id);
  return !!lesson && lesson.requires.every(level => state.completedLevels.includes(level));
}
export function missingRequirements(state, id) {
  const level = LEVELS.find(l => l.id === id);
  if (!level) return ['Unknown level'];
  return level.requires.flatMap(req => {
    if (req.quiz) return state.quizzes[req.quiz]?.best >= PASS_COUNT ? [] : [`Pass “${LESSONS.find(l => l.id === req.quiz).title}” (3 of 4)`];
    if (req.level) return state.completedLevels.includes(req.level) ? [] : [`Complete ${LEVELS.find(l => l.id === req.level).title}`];
    return req.anyLevel.some(key => state.completedLevels.includes(key)) ? [] : [req.label];
  });
}
export const levelUnlocked = (state, id) => missingRequirements(state, id).length === 0;

export function normalizeProgress(raw) {
  const clean = emptyProgress();
  if (raw?.version !== 1) return clean;
  if (raw.sovereignShieldUsed === true) clean.sovereignShieldUsed = true;
  // Rebuild in curriculum order, excluding unknown IDs and impossible unlock chains.
  for (const level of LEVELS.filter(l => !l.stage)) {
    if (Array.isArray(raw.completedLevels) && raw.completedLevels.includes(level.id) && levelUnlocked(clean, level.id)) clean.completedLevels.push(level.id);
  }
  for (const lesson of LESSONS) {
    const q = raw.quizzes?.[lesson.id];
    if (lessonUnlocked(clean, lesson.id) && Number.isInteger(q?.best) && q.best >= 0 && q.best <= lesson.questions.length &&
        Number.isSafeInteger(q.attempts) && q.attempts > 0) {
      clean.quizzes[lesson.id] = { best: q.best, attempts: q.attempts };
    }
    for (const level of LEVELS.filter(l => l.stage)) {
      if (Array.isArray(raw.completedLevels) && raw.completedLevels.includes(level.id) &&
          !clean.completedLevels.includes(level.id) && levelUnlocked(clean, level.id)) clean.completedLevels.push(level.id);
    }
  }
  return clean;
}

export function gradeQuiz(id, answers) {
  const lesson = LESSONS.find(l => l.id === id);
  if (!lesson || !Array.isArray(answers) || answers.length !== lesson.questions.length ||
      Array.from(answers).some((a, i) => !Number.isInteger(a) || a < 0 || a >= lesson.questions[i].choices.length)) throw Error('Answer each question once before submitting.');
  const correct = answers.reduce((sum, answer, i) => sum + Number(answer === lesson.questions[i].answer), 0);
  return { correct, total: lesson.questions.length, passed: correct >= PASS_COUNT };
}

export function recordQuiz(state, id, answers) {
  const next = normalizeProgress(state);
  if (!lessonUnlocked(next, id)) throw Error('Complete the previous defense mission first.');
  const result = gradeQuiz(id, answers);
  const previous = next.quizzes[id] || { best: 0, attempts: 0 };
  next.quizzes[id] = { best: Math.max(previous.best, result.correct), attempts: Math.min(Number.MAX_SAFE_INTEGER, previous.attempts + 1) };
  return { state: next, result };
}

export function completeLevel(state, id) {
  const next = normalizeProgress(state);
  if (!levelUnlocked(next, id)) throw Error('This mission is still locked.');
  if (!next.completedLevels.includes(id)) next.completedLevels.push(id);
  return next;
}

export function progressSummary(state) {
  const clean = normalizeProgress(state);
  const passed = LESSONS.filter(l => clean.quizzes[l.id]?.best >= PASS_COUNT).length;
  const missions = LEVELS.filter(l => l.stage && clean.completedLevels.includes(l.id)).length;
  const xp = passed * 50 + LEVELS.filter(l => clean.completedLevels.includes(l.id)).reduce((n, l) => n + l.xp, 0);
  return { xp, passed, missions, badges: [
    ...(passed ? ['Curious learner'] : []),
    ...(clean.completedLevels.includes('tower-nexus') ? ['Core guardian'] : []),
    ...(clean.completedLevels.includes('tower-boss') ? ['Campaign champion'] : []),
    ...(clean.completedLevels.includes('tower-sovereign') ? ['Sovereign conscience'] : []),
    ...(clean.completedLevels.includes('rpg-archive') ? ['Signalkeeper'] : []),
    ...(clean.completedLevels.includes('vim-defense') ? ['Home row defender'] : []),
    ...(clean.completedLevels.includes('matrix-earth') ? ['Earth Academy guardian'] : []),
    ...(clean.completedLevels.includes('seven-stars') ? ['Seven Stars explorer'] : []),
  ] };
}
