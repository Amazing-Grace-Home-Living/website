import './profile-widget.js';
import { academy } from './state.js';
import { playerProfile } from './profile.js';
import { PS_LESSONS, PS_QUESTIONS } from './content.js';
import { PowerShellDefenseGame, BOSS_QUESTIONS } from './defense.js';

const $ = id => document.getElementById(id);
let activeLesson = null, questionId = null, manualPaused = false;
const lessonPanel = $('lesson-dialog'), bossPanel = $('boss-dialog');
const placementFeedback = document.createElement('p');
placementFeedback.id = 'placement-feedback';
placementFeedback.setAttribute('role', 'status');
placementFeedback.setAttribute('aria-live', 'polite');
placementFeedback.textContent = 'Test-Connection selected · 50 credits. Tap an empty tile beside the path to build. Tap an existing turret to upgrade.';
document.querySelector('.canvas-wrap').insertAdjacentElement('beforebegin', placementFeedback);
document.querySelector('.layout > section')?.append(lessonPanel, bossPanel);

export const game = new PowerShellDefenseGame({ onBoss: () => openBoss() });

function questions(container, items) {
  container.replaceChildren(...items.map((question, index) => {
    const field = document.createElement('fieldset'), legend = document.createElement('legend');
    legend.textContent = question.prompt; field.append(legend);
    question.options.forEach((text, value) => {
      const label = document.createElement('label'), input = document.createElement('input');
      input.type = 'radio'; input.name = 'q' + index; input.value = value; input.required = true;
      label.append(input, document.createTextNode(text)); field.append(label);
    });
    return field;
  }));
}

function refresh() {
  const saved = academy.read(), profile = playerProfile();
  $('lesson-list').replaceChildren(...PS_LESSONS.map(lesson => {
    const row = document.createElement('div'), copy = document.createElement('div'), title = document.createElement('strong'), note = document.createElement('small'), button = document.createElement('button');
    row.className = 'lesson-row'; title.textContent = lesson.title;
    note.textContent = saved.lessons.includes(lesson.id) ? '✓ Mastered · replay available' : 'Read + answer three questions';
    copy.append(title, note); button.type = 'button'; button.textContent = saved.lessons.includes(lesson.id) ? 'Review' : 'Learn';
    button.dataset.lesson = lesson.id; button.onclick = () => openLesson(lesson.id); row.append(copy, button); return row;
  }));
  $('save-status').textContent = academy.persistent ? 'Learning saves in this browser.' : 'Saving unavailable: this tab can play, but progress will not survive reload.';
  $('cross-game-bonus').textContent = profile.unlocks.startingCredits ? 'Earth Guardian earned: +200 credits at the start of each attempt.' : 'Restore the Echo Gardens in Matrix of Conscience for Earth Guardian and +200 starting credits.';
}

function pause(value, reason = '') {
  game.paused = manualPaused || value;
  game.pauseReason = reason || (questionOpen('lesson-dialog')
    ? 'LESSON OPEN · RETURN TO DEFENSE TO BUILD'
    : questionOpen('boss-dialog')
      ? 'BOSS QUIZ OPEN · RETURN TO DEFENSE TO BUILD'
      : game.paused ? 'PAUSED · RESUME TO BUILD' : '');
  game.updateHUD();
  $('btn-pause').textContent = manualPaused ? 'Resume defense' : 'Pause defense';
  $('btn-pause').setAttribute('aria-pressed', String(manualPaused)); $('btn-pause').disabled = game.status !== 'ready';
}
function questionOpen(panel) { return !$(panel).hidden; }
function revealQuestion(panel) {
  const section = $(panel); section.hidden = false; section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  const heading = section.querySelector('h2');
  if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
}
function closeQuestion(panel) {
  $(panel).hidden = true; pause(questionOpen('lesson-dialog') || questionOpen('boss-dialog'));
  $('game-canvas').focus({ preventScroll: true });
}

$('btn-pause').onclick = () => { manualPaused = !manualPaused; pause(questionOpen('lesson-dialog') || questionOpen('boss-dialog')); };
function openLesson(id) {
  activeLesson = PS_LESSONS.find(lesson => lesson.id === id); if (!activeLesson) return;
  bossPanel.hidden = true;
  pause(true, 'LESSON OPEN · RETURN TO DEFENSE TO BUILD'); $('lesson-title').textContent = activeLesson.title; $('lesson-command').textContent = activeLesson.command;
  $('lesson-copy').textContent = activeLesson.copy; $('lesson-docs').href = activeLesson.docs;
  questions($('lesson-questions'), activeLesson.questions); $('lesson-submit').disabled = false;
  $('lesson-feedback').textContent = ''; $('lesson-retry').hidden = true; revealQuestion('lesson-dialog');
}

$('lesson-form').onsubmit = event => {
  event.preventDefault(); if ($('lesson-submit').disabled) return;
  const data = new FormData(event.currentTarget), answers = activeLesson.questions.map((_, index) => data.has('q' + index) ? Number(data.get('q' + index)) : -1);
  try {
    const outcome = academy.lesson(activeLesson.id, answers); game.applyLesson(outcome); $('lesson-submit').disabled = true;
    $('lesson-questions').querySelectorAll('input').forEach(input => { input.disabled = true; });
    $('lesson-feedback').textContent = `${outcome.correct}/3 correct · ${outcome.passed ? 'Lesson mastered.' : 'Review and retry.'} +${outcome.xp} Security XP.\n` + activeLesson.questions.map((q, i) => (answers[i] === q.answer ? '✓ ' : 'Review: ') + q.explanation).join('\n');
    $('lesson-retry').hidden = false; refresh();
  } catch (error) { $('lesson-feedback').textContent = error.message; }
};
$('lesson-retry').onclick = () => { const id = activeLesson.id; closeQuestion('lesson-dialog'); openLesson(id); };
$('lesson-close').onclick = () => closeQuestion('lesson-dialog');

function drawBoss() {
  questionId = BOSS_QUESTIONS.find(id => !game.bossAnswers.has(id));
  $('boss-progress').textContent = `${game.bossAnswers.size}/3 correct · ${questionId ? 'Shield active' : 'Shield dropped'}`;
  $('boss-feedback').textContent = ''; $('boss-next').hidden = true; $('boss-submit').disabled = !questionId; $('boss-form').hidden = !questionId;
  if (questionId) questions($('boss-question'), [PS_QUESTIONS.find(question => question.id === questionId)]); else $('boss-question').replaceChildren();
}
function openBoss() {
  if (!game.enemies.some(enemy => enemy.boss && enemy.shielded)) return;
  lessonPanel.hidden = true;
  pause(true, 'BOSS QUIZ OPEN · RETURN TO DEFENSE TO BUILD'); drawBoss(); if (bossPanel.hidden) revealQuestion('boss-dialog');
}
$('boss-form').onsubmit = event => {
  event.preventDefault(); if ($('boss-submit').disabled) return;
  const data = new FormData(event.currentTarget), answer = data.has('q0') ? Number(data.get('q0')) : -1, question = PS_QUESTIONS.find(item => item.id === questionId);
  const correct = game.answerBoss(questionId, answer); $('boss-feedback').textContent = (correct ? 'Correct. ' : 'Review: ') + question.explanation;
  $('boss-submit').disabled = true; $('boss-question').querySelectorAll('input').forEach(input => { input.disabled = true; });
  $('boss-next').hidden = false; $('boss-next').textContent = correct ? (game.bossAnswers.size >= 3 ? 'Shield dropped · resume combat' : 'Next question') : 'Review and retry';
  $('boss-progress').textContent = `${game.bossAnswers.size}/3 correct`;
};
$('boss-next').onclick = () => { if (game.bossAnswers.size >= 3) closeQuestion('boss-dialog'); else drawBoss(); };
$('boss-close').onclick = () => closeQuestion('boss-dialog');
$('btn-quiz-override').onclick = () => {
  if (game.enemies.some(enemy => enemy.shielded)) openBoss();
  else openLesson(PS_LESSONS.find(lesson => !academy.read().lessons.includes(lesson.id))?.id || PS_LESSONS[0].id);
};
$('btn-restart').onclick = () => {
  manualPaused = false; lessonPanel.hidden = true; bossPanel.hidden = true; game.reset(); pause(false);
  game.log('New defense attempt. Earned learning and badges remain.'); refresh();
};
window.addEventListener('storage', () => { refresh(); game.setupUI(); game.updateHUD(); });
refresh();
