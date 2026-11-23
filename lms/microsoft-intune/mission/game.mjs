import { SCENARIOS, MAX_POINTS, MISSION_STORAGE_KEY, normalizeMission, startMission, submitDecision, missionScore, isComplete } from './engine.mjs';

const doc = document;
const $ = id => doc.getElementById(id);
let storageAvailable = true;
let state = startMission();
let reviewing = false;

function load() {
  try {
    state = normalizeMission(JSON.parse(window.localStorage.getItem(MISSION_STORAGE_KEY) || 'null'));
  } catch {
    storageAvailable = false;
    state = startMission();
  }
}

function save() {
  try {
    window.localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(state));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
}

function addText(parent, tag, value) {
  const child = doc.createElement(tag);
  child.textContent = value;
  parent.append(child);
  return child;
}

function renderCase() {
  const index = reviewing ? state.choices.length - 1 : state.choices.length;
  const scenario = SCENARIOS[index];
  $('mission').hidden = false;
  $('mission-finished').hidden = true;
  $('case-category').textContent = `CASE ${String(index + 1).padStart(2, '0')} / ${SCENARIOS.length} · ${scenario.category}`;
  $('case-title').textContent = scenario.title;
  $('case-brief').textContent = scenario.brief;
  $('case-prompt').textContent = scenario.prompt;
  $('case-evidence').replaceChildren();
  scenario.evidence.forEach(item => addText($('case-evidence'), 'li', item));
  $('choice-list').replaceChildren();

  const selected = reviewing ? state.choices[index] : null;
  for (const option of scenario.options) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'decision';
    button.textContent = option.label;
    button.disabled = reviewing;
    if (option.id === selected) button.classList.add('chosen');
    if (!reviewing) button.addEventListener('click', () => {
      state = submitDecision(state, scenario.id, option.id);
      reviewing = true;
      save();
      render();
      $('case-feedback').focus();
    });
    $('choice-list').append(button);
  }
  $('case-feedback').hidden = !reviewing;
  $('case-feedback').tabIndex = -1;
  $('next-case').hidden = !reviewing;
  if (reviewing) {
    const option = scenario.options.find(item => item.id === selected);
    $('choice-points').textContent = `+${option.points} points · ${option.points === 100 ? 'Best operational choice' : option.points === 40 ? 'Partial credit' : 'Risky action'}`;
    $('choice-explanation').textContent = option.feedback;
    $('learn-more').href = scenario.learn;
    $('next-case').textContent = isComplete(state) ? 'View final debrief →' : 'Continue to next case →';
  }
}

function renderFinished() {
  $('mission').hidden = true;
  $('mission-finished').hidden = false;
  $('finish-summary').textContent = `You earned ${missionScore(state)} of ${MAX_POINTS} possible points. Best recorded here: ${state.best}.`;
  $('finish-review').replaceChildren();
  for (const [index, scenario] of SCENARIOS.entries()) {
    const answer = scenario.options.find(item => item.id === state.choices[index]);
    addText($('finish-review'), 'li', `${scenario.category}: ${answer.points}/100 — ${answer.feedback}`);
  }
}

function render() {
  $('mission-progress').value = state.choices.length;
  $('case-count').textContent = `${state.choices.length} / ${SCENARIOS.length} complete`;
  $('run-score').textContent = `${missionScore(state)} / ${MAX_POINTS}`;
  $('best-score').textContent = `${state.best} / ${MAX_POINTS}`;
  $('storage-message').textContent = storageAvailable
    ? 'Your best score and progress are saved in this browser only; no sign-in required.'
    : 'Browser storage is unavailable. Progress remains available only on this open page.';
  if (isComplete(state) && !reviewing) renderFinished();
  else renderCase();
}

$('next-case').addEventListener('click', () => {
  reviewing = false;
  render();
  (isComplete(state) ? $('finish-title') : $('case-title')).focus();
});
$('restart-mission').addEventListener('click', () => {
  state = { ...startMission(), best: state.best };
  reviewing = false;
  save();
  render();
  $('case-title').focus();
});
load();
render();
