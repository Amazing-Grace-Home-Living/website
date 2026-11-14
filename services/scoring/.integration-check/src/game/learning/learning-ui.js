import { LESSONS, LEVELS, PASS_COUNT } from './curriculum.js';
import { lessonUnlocked, missingRequirements, progressSummary } from './progression.js';
import { campaign } from './campaign-store.js';
const $ = id => document.getElementById(id);
let activeLesson = null;
let submitted = false;
campaign.restoreLegacyMatch();

function render() {
  const state = campaign.read();
  const summary = progressSummary(state);
  $('xp').textContent = summary.xp;
  $('quiz-count').textContent = `${summary.passed} / ${LESSONS.length}`;
  $('mission-count').textContent = `${summary.missions} / ${LEVELS.filter(level => level.stage).length}`;
  $('rpg-status').textContent = `${['rpg-garden', 'rpg-commons', 'rpg-archive'].filter(id => state.completedLevels.includes(id)).length} / 3 RPG regions restored · region rewards count once`;
  $('vim-defense-status').textContent = state.completedLevels.includes('vim-defense') ? '✓ Five-wave milestone complete · 100 campaign XP earned once' : 'Clear five waves in either mode for 100 campaign XP and the Home row defender badge.';
  $('save-note').textContent = campaign.persistent
    ? '✓ Progress saved in this browser. Completion XP is awarded once per milestone.'
    : 'Saving is unavailable. Progress lasts only in this tab; opening another game or reloading may lose it. Enable browser storage to continue across games.';
  $('badges').replaceChildren(...summary.badges.map(name => { const b = document.createElement('span'); b.className = 'badge'; b.textContent = `✦ ${name}`; return b; }));
  $('lessons').replaceChildren(...LESSONS.map((lesson, i) => {
    const open = lessonUnlocked(state, lesson.id), passed = state.quizzes[lesson.id]?.best >= PASS_COUNT;
    const card = document.createElement('article'); card.className = passed ? 'completed' : '';
    card.innerHTML = `<p class="eyebrow">LESSON 0${i + 1} · ${lesson.minutes} MIN</p><h3>${lesson.title}</h3><p>${lesson.summary}</p><p class="state">${passed ? '✓ Passed' : open ? 'Ready to learn' : 'Locked'}</p><p>${open ? `Best: ${state.quizzes[lesson.id]?.best || 0} / 4 · Attempts: ${state.quizzes[lesson.id]?.attempts || 0}` : `Complete ${LEVELS.find(l => l.id === lesson.requires[0]).title} first.`}</p>`;
    const button = document.createElement('button'); button.type = 'button'; button.disabled = !open; button.dataset.lesson = lesson.id;
    button.textContent = passed ? 'Review lesson →' : 'Read and take quiz →';
    button.onclick = () => showLesson(lesson.id); card.append(button); return card;
  }));
  $('match-status').textContent = state.completedLevels.includes('match-1') ? '✓ Milestone complete' : 'Ready to play';
  $('matrix-status').textContent = state.completedLevels.includes('matrix-earth') ? '✓ Milestone complete · Earth campaign finished · 200 shared campaign XP earned once'
    : state.completedLevels.includes('matrix-academy') || state.completedLevels.includes('matrix-session') ? '✓ Milestone complete' : 'Ready to play';
  $('mission-cards').replaceChildren(...LEVELS.filter(l => l.stage).map((level, i) => {
    const missing = missingRequirements(state, level.id), done = state.completedLevels.includes(level.id);
    const card = document.createElement('article'); card.className = done ? 'completed' : '';
    card.innerHTML = `<p class="eyebrow">DEFENSE 0${i + 1} · ${level.waves} WAVES · ${level.xp} XP</p><h3>${level.title}</h3><p class="state">${done ? '✓ Mission secured' : missing.length ? 'Locked' : 'Unlocked'}</p>`;
    if (missing.length) {
      const list = document.createElement('ul'); list.className = 'requirements';
      for (const text of missing) { const li = document.createElement('li'); li.textContent = text; list.append(li); }
      card.append(list);
    } else {
      const a = document.createElement('a'); a.className = 'button'; a.href = `/src/game/tower-defense/index.html?stage=${level.stage}`; a.textContent = done ? 'Replay mission →' : 'Begin mission →'; card.append(a);
    }
    return card;
  }));
}

function showLesson(id) {
  if (!lessonUnlocked(campaign.read(), id)) return;
  activeLesson = LESSONS.find(l => l.id === id); submitted = false;
  $('lesson-panel').hidden = false; $('lesson-title').textContent = activeLesson.title;
  $('lesson-copy').replaceChildren(...activeLesson.paragraphs.map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
  $('questions').replaceChildren(...activeLesson.questions.map((q, i) => {
    const field = document.createElement('fieldset'); const legend = document.createElement('legend'); legend.textContent = `${i + 1}. ${q.prompt}`; field.append(legend);
    q.choices.forEach((text, j) => { const label = document.createElement('label'), input = document.createElement('input'); input.type = 'radio'; input.name = `q${i}`; input.value = j; input.required = true; label.append(input, document.createTextNode(text)); field.append(label); });
    return field;
  }));
  $('quiz-feedback').replaceChildren(); $('submit-quiz').disabled = false; $('retry-quiz').hidden = true;
  $('lesson-panel').focus(); $('lesson-panel').scrollIntoView({ behavior: 'instant', block: 'start' });
}
$('quiz-form').addEventListener('submit', event => {
  event.preventDefault(); if (submitted || !activeLesson) return;
  const form = new FormData(event.currentTarget);
  const answers = activeLesson.questions.map((_, i) => form.has(`q${i}`) ? Number(form.get(`q${i}`)) : -1);
  try {
    const result = campaign.quiz(activeLesson.id, answers); submitted = true;
    $('submit-quiz').disabled = true; $('quiz-form').querySelectorAll('input').forEach(input => { input.disabled = true; });
    const title = document.createElement('h3'); title.textContent = `${result.correct} / ${result.total} — ${result.passed ? 'Passed! Your next step is ready.' : 'Keep learning. Read the feedback and retry.'}`;
    $('quiz-feedback').replaceChildren(title);
    activeLesson.questions.forEach((q, i) => { const p = document.createElement('p'); p.className = 'review'; p.textContent = `${i + 1}. ${answers[i] === q.answer ? 'Correct.' : `Review: ${q.choices[q.answer]}.`} ${q.explanation}`; $('quiz-feedback').append(p); });
    $('retry-quiz').hidden = false; render();
  } catch (error) { $('quiz-feedback').textContent = error.message; }
});
$('retry-quiz').onclick = () => showLesson(activeLesson.id);
$('close-lesson').onclick = () => { $('lesson-panel').hidden = true; document.querySelector(`[data-lesson="${activeLesson.id}"]`)?.focus(); };
window.addEventListener('storage', () => {
  render();
  if (activeLesson && !lessonUnlocked(campaign.read(), activeLesson.id)) { $('lesson-panel').hidden = true; activeLesson = null; }
});
render();
