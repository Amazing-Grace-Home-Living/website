import { CHAPTERS, QUESTS, ROLES } from './content.js';
export const RPG_KEY = 'amazing-grace-matrix-rpg-v1';
export const newAdventure = role => ({ version: 1, role: ROLES.some(r => r.id === role) ? role : null, completed: [], choices: {} });
export function chapterComplete(state, id) {
  const chapter = CHAPTERS.find(c => c.id === id);
  return !!chapter && chapter.quests.every(q => state.completed.includes(q));
}
export function chapterUnlocked(state, id) {
  const index = CHAPTERS.findIndex(c => c.id === id);
  return index >= 0 && !!state.role && CHAPTERS.slice(0, index).every(c => chapterComplete(state, c.id));
}
export function questUnlocked(state, id) {
  const quest = QUESTS.find(q => q.id === id);
  if (!quest || !chapterUnlocked(state, quest.chapter)) return false;
  return quest.type !== 'guardian' || CHAPTERS.find(c => c.id === quest.chapter).quests
    .filter(key => key !== id).every(key => state.completed.includes(key));
}
export function normalizeAdventure(raw) {
  const clean = newAdventure(raw?.role);
  if (raw?.version !== 1 || !clean.role || !Array.isArray(raw.completed)) return newAdventure();
  for (const quest of QUESTS) {
    if (!raw.completed.includes(quest.id) || !questUnlocked(clean, quest.id)) continue;
    if (quest.type === 'choice') {
      const choice = quest.choices.find(c => c.id === raw.choices?.[quest.id]);
      if (!choice) continue;
      clean.choices[quest.id] = choice.id;
    }
    clean.completed.push(quest.id);
  }
  return clean;
}
export function validRoute(board, path) {
  if (!Array.isArray(path) || path[0] !== board.start || path.length < 2 || path.length - 1 > board.budget) return false;
  const visited = new Set();
  for (let i = 0; i < path.length; i++) {
    const cell = path[i];
    if (!Number.isInteger(cell) || cell < 0 || cell >= board.size ** 2 || board.blocked.includes(cell)) return false;
    if (i) {
      const prev = path[i - 1];
      if (Math.abs(Math.floor(cell / board.size) - Math.floor(prev / board.size)) + Math.abs(cell % board.size - prev % board.size) !== 1) return false;
    }
    visited.add(cell);
    if (cell === board.goal && (i !== path.length - 1 || !board.keys.every(key => visited.has(key)))) return false;
  }
  return path.at(-1) === board.goal && board.keys.every(key => visited.has(key));
}
export function checkProof(quest, proof) {
  if (quest.type === 'choice') return quest.choices.some(c => c.id === proof?.choice);
  if (quest.type === 'route') return validRoute(quest.board, proof?.path);
  const expected = quest.type === 'memory' ? (quest.reverse ? [...quest.sequence].reverse() : quest.sequence) : quest.questions.map(q => q.answer);
  const actual = quest.type === 'memory' ? proof?.sequence : proof?.answers;
  return Array.isArray(actual) && actual.length === expected.length && expected.every((value, i) => actual[i] === value);
}
export function finishQuest(state, id, proof) {
  const next = normalizeAdventure(state);
  const quest = QUESTS.find(q => q.id === id);
  if (!quest || !questUnlocked(next, id)) throw Error('Explore the earlier region and finish the other quests before this guardian.');
  if (!checkProof(quest, proof)) throw Error('Not quite yet. Review the clue and try again.');
  if (!next.completed.includes(id)) {
    next.completed.push(id);
    if (quest.type === 'choice') next.choices[id] = proof.choice;
  }
  return normalizeAdventure(next);
}
export function adventureSummary(state) {
  const clean = normalizeAdventure(state);
  const done = QUESTS.filter(q => clean.completed.includes(q.id));
  const xp = done.reduce((sum, q) => sum + q.xp, 0);
  const chapters = CHAPTERS.filter(c => chapterComplete(clean, c.id));
  return { xp, level: 1 + Math.floor(xp / 100), completed: done.length, total: QUESTS.length,
    relics: chapters.map(c => c.relic), chapters: chapters.length,
    skills: {
      observation: done.filter(q => q.type === 'memory').length,
      reasoning: done.filter(q => q.type === 'questions' || q.type === 'route').length,
      reflection: done.filter(q => q.type === 'choice').length,
      knowledge: done.filter(q => q.type === 'guardian').length,
    },
  };
}
export function createAdventureStore(storage) {
  let memory = newAdventure(), persistent = true;
  return {
    get persistent() { return persistent; },
    read() {
      if (persistent) {
        try { const raw = storage.getItem(RPG_KEY); memory = raw ? normalizeAdventure(JSON.parse(raw)) : newAdventure(); }
        catch { persistent = false; }
      }
      return normalizeAdventure(memory);
    },
    save(state) {
      memory = normalizeAdventure(state);
      try { storage.setItem(RPG_KEY, JSON.stringify(memory)); persistent = true; } catch { persistent = false; }
      return normalizeAdventure(memory);
    },
  };
}
