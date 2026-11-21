// Local, self-reported course checklist. No account or external requests.
export const COURSE_STORAGE_KEY = 'amazing-grace-lms-intune-ops-v1';
export const MODULE_IDS = Object.freeze(['reporting', 'rbac', 'tenant-health']);
export const QUIZ_ANSWERS = Object.freeze({ q1: 'b', q2: 'b', q3: 'a' });

export function normalizeCourseProgress(value) {
  const completed = Array.isArray(value?.completed)
    ? MODULE_IDS.filter(id => value.completed.includes(id))
    : [];
  const bestQuiz = Number.isInteger(value?.bestQuiz) && value.bestQuiz >= 0 && value.bestQuiz <= 3
    ? value.bestQuiz : null;
  return { completed, bestQuiz };
}

export function markModule(progress, moduleId, isComplete) {
  if (!MODULE_IDS.includes(moduleId)) throw new Error('Unknown module');
  const current = normalizeCourseProgress(progress);
  const selected = new Set(current.completed);
  if (isComplete) selected.add(moduleId);
  else selected.delete(moduleId);
  return { ...current, completed: MODULE_IDS.filter(id => selected.has(id)) };
}

export function scoreQuiz(answers) {
  return Object.entries(QUIZ_ANSWERS).reduce(
    (score, [question, correct]) => score + (answers[question] === correct ? 1 : 0), 0
  );
}

export function initializeCourse(doc = document, browserStorage = window.localStorage) {
  const checkboxes = [...doc.querySelectorAll('input[data-complete]')];
  const progressBar = doc.getElementById('course-progress');
  const progressStatus = doc.getElementById('progress-status');
  const storageStatus = doc.getElementById('storage-status');
  const feedback = doc.getElementById('quiz-feedback');
  const quiz = doc.getElementById('intune-quiz');
  let state = normalizeCourseProgress();
  let persisted = true;

  try {
    state = normalizeCourseProgress(JSON.parse(browserStorage.getItem(COURSE_STORAGE_KEY) || 'null'));
  } catch {
    persisted = false;
  }

  function render() {
    for (const box of checkboxes) {
      const checked = state.completed.includes(box.dataset.complete);
      box.checked = checked;
      box.closest('.module-card')?.classList.toggle('completed', checked);
    }
    progressBar.value = state.completed.length;
    progressStatus.textContent = `${state.completed.length} of ${MODULE_IDS.length} modules marked complete`;
    storageStatus.textContent = persisted
      ? 'Saved only in this browser; no sign-in required.'
      : 'Browser storage is unavailable. Progress lasts only until this page closes.';
  }

  function save() {
    try {
      browserStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(state));
      persisted = true;
    } catch {
      persisted = false;
    }
    render();
  }

  for (const box of checkboxes) {
    box.addEventListener('change', () => {
      state = markModule(state, box.dataset.complete, box.checked);
      save();
    });
  }

  quiz.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(quiz);
    const answers = Object.fromEntries(data.entries());
    if (Object.keys(QUIZ_ANSWERS).some(id => !answers[id])) {
      feedback.textContent = 'Choose one answer for each question.';
      return;
    }
    const score = scoreQuiz(answers);
    state.bestQuiz = Math.max(state.bestQuiz ?? 0, score);
    save();
    const explanations = [
      answers.q1 === 'b' ? '' : ' Reporting exports need authorized access and secure sharing.',
      answers.q2 === 'b' ? '' : ' RBAC should follow least privilege and appropriate scope.',
      answers.q3 === 'a' ? '' : ' Readiness includes service health, alerting, audit logs and baselines.',
    ].join('');
    feedback.textContent = `Score: ${score}/3. Best on this device: ${state.bestQuiz}/3.${explanations || ' All correct.'}`;
  });

  render();
  return { read: () => normalizeCourseProgress(state) };
}

if (typeof document !== 'undefined') {
  initializeCourse(document, (() => {
    try { return window.localStorage; } catch { return { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }; }
  })());
}
