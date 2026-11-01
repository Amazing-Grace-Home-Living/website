import { CHAPTERS, QUESTS, ROLES, RUNES } from './content.js';
import { RPG_KEY, newAdventure, createAdventureStore, chapterUnlocked, chapterComplete, questUnlocked, finishQuest, adventureSummary } from './engine.js';
import { campaign } from '../learning/campaign-store.js';
const $ = id => document.getElementById(id);
const el = (tag, className = '', text = '') => { const node = document.createElement(tag); node.className = className; node.textContent = text; return node; };
function button(text, action, className = '') { const b = el('button', className, text); b.type = 'button'; b.onclick = action; return b; }
let storage;
try { storage = window.localStorage; } catch {}
const store = createAdventureStore(storage);
let state = store.read();
let selectedChapter = CHAPTERS.find(c => chapterUnlocked(state, c.id) && !chapterComplete(state, c.id))?.id || 'garden';
let activeQuest = null;
const symbols = { memory: '≈', questions: '◇', choice: '❋', guardian: '✦', route: '⌁' };

function syncMilestones() {
  for (const chapter of CHAPTERS) if (chapterComplete(state, chapter.id)) campaign.complete(chapter.milestone);
}
function renderCharacter() {
  const summary = adventureSummary(state), role = ROLES.find(r => r.id === state.role);
  $('role-screen').hidden = !!role; $('adventure').hidden = !role;
  if (!role) {
    $('save-status').textContent = store.persistent ? 'Choose a role to begin. Quest checkpoints save in this browser.' : 'Saving unavailable. You can play in this tab, but leaving or reloading will lose progress.';
    return;
  }
  $('hero-role').textContent = role.name; $('hero-symbol').textContent = role.symbol;
  $('hero-level').textContent = summary.level; $('hero-xp').textContent = summary.xp;
  $('quest-count').textContent = `${summary.completed} / ${summary.total}`;
  $('character-title').textContent = role.name; $('character-copy').textContent = role.description;
  $('role-select').value = role.id;
  $('save-status').textContent = store.persistent && campaign.persistent
    ? '✓ Quest checkpoints saved in this browser. Each region also earns a one-time Learn & Play milestone.'
    : 'Saving unavailable. This tab can keep playing, but reloading or opening another game may lose progress or campaign rewards.';
  const skillNames = { observation: 'Observation & recall', reasoning: 'Reasoning & planning', reflection: 'Perspectives explored', knowledge: 'Knowledge guardians' };
  $('skills').replaceChildren(...Object.entries(summary.skills).map(([id, value]) => {
    const row = el('div', 'skill-row'); row.append(el('span', '', skillNames[id]), el('strong', '', value)); return row;
  }));
  $('relics').replaceChildren(...(summary.relics.length ? summary.relics.map(name => el('span', 'relic', `✦ ${name}`)) : [el('p', 'small-note', 'Complete a region to recover its relic. Relics are story rewards, not quiz shortcuts.')]));
  const choices = QUESTS.filter(q => state.choices[q.id]);
  $('journal-entries').replaceChildren(...(choices.length ? choices.map(q => {
    const chosen = q.choices.find(c => c.id === state.choices[q.id]);
    const entry = el('article', 'journal-entry'); entry.append(el('strong', '', chosen.token), el('p', '', chosen.reflection)); return entry;
  }) : [el('p', 'small-note', 'Your story choices and reflection questions will appear here. No personal answers are collected.')]));
  $('ending').hidden = summary.chapters !== CHAPTERS.length || !!activeQuest;
  $('ending-choices').replaceChildren(...choices.map(q => {
    const chosen = q.choices.find(c => c.id === state.choices[q.id]);
    return el('p', 'ending-choice', `${chosen.token}: ${chosen.outcome}`);
  }));
}

function renderWorld() {
  $('region-buttons').replaceChildren(...CHAPTERS.map((chapter, i) => {
    const open = chapterUnlocked(state, chapter.id), done = chapterComplete(state, chapter.id);
    const b = button('', () => { selectedChapter = chapter.id; renderWorld(); }, 'region-button');
    b.dataset.chapter = chapter.id; b.disabled = !open; b.setAttribute('aria-pressed', String(selectedChapter === chapter.id));
    b.append(el('span', 'region-symbol', chapter.symbol), el('span', '', chapter.title), el('small', '', done ? '✓ Region restored' : open ? 'Explore region' : `Complete region ${i} first`));
    return b;
  }));
  const chapter = CHAPTERS.find(c => c.id === selectedChapter) || CHAPTERS[0];
  $('region-subtitle').textContent = chapter.subtitle; $('region-title').textContent = chapter.title; $('region-intro').textContent = chapter.intro;
  $('quest-list').replaceChildren(...chapter.quests.map(id => {
    const q = QUESTS.find(quest => quest.id === id), done = state.completed.includes(id), open = questUnlocked(state, id);
    const card = el('article', `quest-card${done ? ' done' : ''}`), copy = el('div');
    copy.append(el('h3', '', q.title), el('p', '', `${q.skill} · ${q.xp} quest XP${q.type === 'guardian' && !open ? ' · Finish the other three quests first' : ''}`));
    const b = button(done ? 'Practice again' : open ? 'Begin quest →' : 'Locked', () => openQuest(id));
    b.dataset.quest = id; b.disabled = !open;
    card.append(el('span', 'quest-symbol', done ? '✓' : symbols[q.type]), copy, b); return card;
  }));
}

function showWorld() {
  activeQuest = null; $('quest-panel').hidden = true; $('world-panel').hidden = false;
  renderCharacter(); renderWorld(); $('world-title').tabIndex = -1; $('world-title').focus();
}
function openQuest(id) {
  const quest = QUESTS.find(q => q.id === id);
  if (!quest || !questUnlocked(state, id)) return;
  activeQuest = quest;
  $('world-panel').hidden = true; $('quest-panel').hidden = false; $('ending').hidden = true;
  $('quest-kind').textContent = `${quest.skill.toUpperCase()} / ${state.completed.includes(id) ? 'PRACTICE · XP ALREADY EARNED' : `${quest.xp} QUEST XP`}`;
  $('quest-title').textContent = quest.title; $('quest-npc').textContent = quest.npc;
  $('quest-story').textContent = quest.story; $('quest-lesson').textContent = quest.lesson;
  $('quest-feedback').replaceChildren(); $('quest-result').replaceChildren(); $('activity').replaceChildren();
  if (quest.type === 'memory') memoryActivity(quest);
  else if (quest.type === 'route') routeActivity(quest);
  else if (quest.type === 'choice') choiceActivity(quest);
  else questionActivity(quest);
  $('quest-title').focus(); $('quest-panel').scrollIntoView({ block: 'start', behavior: 'instant' });
}

function complete(quest, proof, context = '') {
  try {
    const latest = store.read(), previous = adventureSummary(latest);
    state = store.save(finishQuest(latest, quest.id, proof));
    syncMilestones();
    const summary = adventureSummary(state), chapter = CHAPTERS.find(c => c.id === quest.chapter);
    $('activity').querySelectorAll('button').forEach(b => { b.disabled = true; });
    $('quest-feedback').textContent = '';
    const reward = el('div', 'reward');
    reward.append(el('h3', '', summary.xp > previous.xp ? `Quest complete · +${quest.xp} XP` : 'Practice complete · no duplicate XP'), el('p', '', quest.success));
    if (context) reward.append(el('p', '', context));
    if (chapterComplete(state, chapter.id)) reward.append(el('p', '', `✦ ${chapter.relic} recovered. Region checkpoint complete; its campaign milestone is earned once.`));
    reward.append(button(summary.chapters === CHAPTERS.length ? 'See your ending →' : 'Return to the world →', () => {
      if (chapterComplete(state, chapter.id)) selectedChapter = CHAPTERS.find(c => chapterUnlocked(state, c.id) && !chapterComplete(state, c.id))?.id || chapter.id;
      showWorld();
      if (summary.chapters === CHAPTERS.length) { $('ending-title').tabIndex = -1; $('ending-title').focus(); $('ending').scrollIntoView({ behavior: 'instant' }); }
    }, 'primary'));
    $('quest-result').replaceChildren(reward); renderCharacter();
    reward.tabIndex = -1; reward.focus();
  } catch (error) { $('quest-feedback').textContent = error.message; }
}

function rune(id) { const r = RUNES[id], item = el('span', 'rune'); item.style.color = r.color; item.append(el('b', '', r.symbol), el('small', '', r.name)); return item; }
function memoryActivity(quest) {
  let recalling = false, entry = [];
  function draw() {
    const area = $('activity'); area.replaceChildren(); $('quest-feedback').textContent = '';
    area.append(el('h3', '', quest.reverse ? 'Study the signal. Send it back in reverse.' : 'Study the signal. Send it back in the same order.'));
    if (!recalling) {
      const clue = el('div', 'memory-clue'); clue.setAttribute('aria-label', 'Signal to study'); clue.append(...quest.sequence.map(rune));
      area.append(clue, button('Hide clue · ready to recall', () => { recalling = true; entry = []; draw(); }, 'primary'));
    } else {
      area.append(el('p', '', `Your signal: ${entry.length} / ${quest.sequence.length} symbols`));
      const trail = el('div', 'memory-entry'); trail.setAttribute('aria-label', 'Your entered signal'); trail.append(...entry.map(rune)); area.append(trail);
      const options = el('div', 'rune-options');
      RUNES.forEach((r, id) => { const b = button('', () => {
        entry.push(id); draw();
        if (entry.length === quest.sequence.length) {
          complete(quest, { sequence: entry });
          if (!$('quest-result').children.length) $('activity').querySelector('[data-review-clue]').focus();
        } else $('activity').querySelector(`[data-rune="${id}"]`).focus();
      }); b.dataset.rune = id; b.setAttribute('aria-label', r.name); b.style.color = r.color; b.append(el('b', '', r.symbol), el('small', '', r.name)); b.disabled = entry.length >= quest.sequence.length; options.append(b); });
      const actions = el('div', 'activity-actions');
      const review = button('Review clue', () => { recalling = false; entry = []; draw(); }); review.dataset.reviewClue = '';
      actions.append(button('Undo symbol', () => { entry.pop(); draw(); }), review);
      area.append(options, actions);
    }
  }
  draw();
}

function routeActivity(quest) {
  let path = [quest.board.start];
  function draw(message = '') {
    const { size, keys, blocked, goal, budget } = quest.board, current = path.at(-1);
    const area = $('activity'); area.replaceChildren(); $('quest-feedback').textContent = message;
    area.append(el('h3', '', 'Find a route through every key.'), el('p', 'route-status', `${budget - path.length + 1} steps left · ${keys.filter(key => path.includes(key)).length} / ${keys.length} keys`));
    const grid = el('div', 'route-grid'); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'Route puzzle. Use arrow keys on a tile to move focus, Enter to travel to an adjacent tile.');
    for (let cell = 0; cell < size ** 2; cell++) {
      const wall = blocked.includes(cell), at = cell === current, collected = path.includes(cell);
      const symbol = at ? '◉' : wall ? '×' : cell === goal ? '⚑' : keys.includes(cell) ? collected ? '✓' : '✦' : collected ? '·' : '';
      const b = button(symbol, () => {
        const adjacent = Math.abs(Math.floor(cell / size) - Math.floor(current / size)) + Math.abs(cell % size - current % size) === 1;
        if (!adjacent) { $('quest-feedback').textContent = 'Choose a neighboring tile: up, down, left, or right.'; return; }
        if (path.length - 1 >= budget) { $('quest-feedback').textContent = 'Step budget used. Undo a move or reset the route to try another plan.'; return; }
        if (cell === goal && !keys.every(key => path.includes(key))) { $('quest-feedback').textContent = 'Collect every key before entering the exit.'; return; }
        path.push(cell); draw();
        if (cell === goal) complete(quest, { path });
        else $('activity').querySelector(`[data-cell="${cell}"]`)?.focus({ preventScroll: true });
      }, `route-cell${wall ? ' blocked' : ''}${at ? ' current' : ''}${collected && !at ? ' visited' : ''}`);
      b.dataset.cell = cell; b.disabled = wall;
      b.setAttribute('aria-label', `Row ${Math.floor(cell / size) + 1}, column ${cell % size + 1}${at ? ', you are here' : wall ? ', blocked' : cell === goal ? ', exit' : keys.includes(cell) ? collected ? ', collected key' : ', signal key' : ''}`);
      b.addEventListener('keydown', event => {
        const delta = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[event.key];
        if (!delta) return; event.preventDefault();
        const row = Math.floor(cell / size) + delta[0], col = cell % size + delta[1];
        if (row >= 0 && row < size && col >= 0 && col < size) grid.querySelector(`[data-cell="${row * size + col}"]:not(:disabled)`)?.focus();
      });
      grid.append(b);
    }
    const actions = el('div', 'activity-actions'), undo = button('Undo step', () => { if (path.length > 1) path.pop(); draw(); }); undo.disabled = path.length <= 1;
    actions.append(undo, button('Reset route', () => { path = [quest.board.start]; draw(); }));
    const hint = el('details', 'hint'); hint.append(el('summary', '', 'Planning hint'), el('p', '', 'Work backward from the exit, then find a connection to the key tiles. You can revisit an open tile, but each visit costs a step. Undoing is free.'));
    area.append(grid, el('p', 'route-legend', '◉ You · ✦ Key · ⚑ Exit · × Blocked. Each move costs one step.'), actions, hint);
  }
  draw();
}

function choiceActivity(quest) {
  const area = $('activity'), options = el('div', 'answer-options');
  options.append(...quest.choices.map(choice => {
    const b = button(choice.label, () => {
      options.querySelectorAll('button').forEach(option => { option.disabled = true; });
      const outcome = el('div', 'choice-outcome');
      outcome.append(el('h3', '', choice.token), el('p', '', choice.outcome), el('strong', '', 'A question to carry with you'), el('p', '', choice.reflection));
      outcome.append(el('p', 'small-note', 'Think about your response privately or discuss it with your class. No personal reflection text is collected.'));
      outcome.append(button('Record this story choice →', () => complete(quest, { choice: choice.id }, state.choices[quest.id] && state.choices[quest.id] !== choice.id ? 'This was a practice alternative. Your original story choice remains in the journal.' : ''), 'primary'));
      area.append(outcome); outcome.tabIndex = -1; outcome.focus();
    }); b.dataset.choice = choice.id; return b;
  }));
  area.append(el('h3', '', 'Which approach would you explore?'), options);
}

function questionActivity(quest) {
  let index = 0, resolve = 3, correctAnswers = [];
  const guardian = quest.type === 'guardian';
  function draw() {
    const area = $('activity'); area.replaceChildren(); $('quest-feedback').textContent = '';
    if (guardian) {
      const bars = el('div', 'battle-bars');
      for (const [label, value, max] of [['Your resolve', resolve, 3], ['Guardian signals remaining', quest.questions.length - index, quest.questions.length]]) {
        const group = el('div'); group.append(el('span', '', label), el('strong', '', `${value} / ${max}`));
        const p = document.createElement('progress'); p.max = max; p.value = value; p.setAttribute('aria-label', label); group.append(p); bars.append(group);
      }
      area.append(bars, el('p', 'small-note', 'A correct answer restores a signal. A missed answer uses one resolve. If resolve runs out, review and retry the encounter; earned quests stay safe.'));
    }
    const question = quest.questions[index];
    area.append(el('p', 'eyebrow', `SIGNAL ${index + 1} OF ${quest.questions.length}`));
    const prompt = el('h3', 'activity-heading', question.prompt); prompt.tabIndex = -1; area.append(prompt);
    const options = el('div', 'answer-options'), next = button(index === quest.questions.length - 1 ? guardian ? 'Restore the final signal →' : 'Finish challenge →' : 'Next signal →', () => {
      correctAnswers.push(question.answer); index++;
      if (index === quest.questions.length) complete(quest, { answers: correctAnswers });
      else { draw(); $('activity').querySelector('.activity-heading').focus(); }
    }, 'primary'); next.hidden = true;
    question.options.forEach((text, answer) => {
      const b = button(text, () => {
        if (answer === question.answer) {
          options.querySelectorAll('button').forEach(option => { option.disabled = true; }); b.classList.add('correct');
          $('quest-feedback').textContent = `Signal restored. ${question.explanation}`; next.hidden = false; next.focus();
        } else {
          b.disabled = true; b.classList.add('incorrect');
          if (guardian) resolve--;
          if (guardian) {
            const value = area.querySelector('.battle-bars strong'), progress = area.querySelector('.battle-bars progress'); value.textContent = `${resolve} / 3`; progress.value = resolve;
          }
          $('quest-feedback').textContent = `${guardian ? `Resolve ${resolve} / 3. ` : ''}${question.explanation} Use the field notes or hint, then try another response.`;
          if (guardian && resolve === 0) {
            options.querySelectorAll('button').forEach(option => { option.disabled = true; });
            const retry = button('Review and retry encounter', () => { index = 0; resolve = 3; correctAnswers = []; draw(); area.querySelector('.activity-heading').focus(); }, 'primary');
            area.append(retry); retry.focus();
            $('quest-feedback').textContent = 'The guardian pauses the encounter. Your completed quests are safe. Review the field notes, then try again with fresh resolve.';
          }
        }
      }); b.dataset.answer = answer; options.append(b);
    });
    const hint = el('details', 'hint'); hint.append(el('summary', '', 'Show a hint'), el('p', '', question.hint));
    area.append(options, hint, next);
  }
  draw();
}

$('role-options').replaceChildren(...ROLES.map(role => {
  const b = button('', () => { state = store.save(newAdventure(role.id)); selectedChapter = 'garden'; showWorld(); }, 'role-card'); b.dataset.role = role.id;
  b.append(el('span', 'role-symbol', role.symbol), el('strong', '', role.name), el('small', '', role.description), el('span', 'small-note', 'Choose this role →')); return b;
}));
$('role-select').replaceChildren(...ROLES.map(role => { const option = el('option', '', role.name); option.value = role.id; return option; }));
$('role-select').addEventListener('change', event => { state = store.save({ ...store.read(), role: event.target.value }); renderCharacter(); });
$('new-adventure').onclick = () => {
  if (!window.confirm('Start this RPG again? Quest checkpoints, relics, and story choices in this RPG will reset. Your earned Learn & Play milestones will stay.')) return;
  state = store.save(newAdventure()); selectedChapter = 'garden'; activeQuest = null;
  $('quest-panel').hidden = true; $('world-panel').hidden = false; renderCharacter(); renderWorld(); $('role-title').tabIndex = -1; $('role-title').focus();
};
$('back-world').onclick = showWorld;
window.addEventListener('storage', event => {
  if (event.key !== RPG_KEY && event.key !== null) return;
  state = store.read(); selectedChapter = CHAPTERS.find(c => chapterUnlocked(state, c.id) && !chapterComplete(state, c.id))?.id || 'garden'; showWorld();
  $('save-status').textContent = 'Adventure changed in another tab. The latest quest checkpoints have been loaded.';
});
syncMilestones(); renderCharacter(); renderWorld();
