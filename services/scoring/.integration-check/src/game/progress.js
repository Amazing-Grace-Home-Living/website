import { createPlayableGrid, findMatches } from './engine/matchmaker.js';
export const LEVELS = [
  { target: 1000, moves: 20 }, { target: 1800, moves: 22 },
  { target: 2600, moves: 24 }, { target: 3600, moves: 26 }, { target: 5000, moves: 28 },
];
export const SAVE_KEY = 'amazing-grace-matchmaker-v1';
export function newGame(level = 1, total = 0, badges = []) {
  return { version: 1, grid: createPlayableGrid(), level, total, badges, score: 0,
    moves: LEVELS[level - 1].moves, status: 'playing' };
}
export function validSave(s) {
  const kinds = ['heart', 'star', 'cross', 'flame', 'drop'];
  const specials = [null, 'lineH', 'lineV', 'bomb', 'supernova'];
  return s?.version === 1 && Number.isInteger(s.level) && s.level >= 1 && s.level <= LEVELS.length &&
    Number.isFinite(s.score) && s.score >= 0 && Number.isFinite(s.total) && s.total >= s.score &&
    Number.isInteger(s.moves) && s.moves >= 0 && s.moves <= LEVELS[s.level - 1].moves &&
    ['playing', 'won', 'lost', 'complete'].includes(s.status) &&
    Array.isArray(s.badges) && s.badges.every(b => ['First light', 'Cascade keeper', 'Star maker', 'Seven Stars champion'].includes(b)) &&
    Array.isArray(s.grid) && s.grid.length === 7 && s.grid.every(row => Array.isArray(row) && row.length === 7 &&
      row.every(g => g && kinds.includes(g.type) && g.kind === g.type && specials.includes(g.special))) &&
    findMatches(s.grid).matches.length === 0 &&
    (s.status !== 'playing' || (s.moves > 0 && s.score < LEVELS[s.level - 1].target));
}
export function loadGame(storage) {
  try { const s = JSON.parse(storage.getItem(SAVE_KEY)); return validSave(s) ? s : null; } catch { return null; }
}
export function saveGame(storage, state) {
  try { storage.setItem(SAVE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}
