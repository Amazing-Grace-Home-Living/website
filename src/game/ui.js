import { canSwap, applySwap, findMatches, applyMatches, applyGravity, findLegalMoves, createPlayableGrid } from './engine/matchmaker.js';
import { LEVELS, newGame, loadGame, saveGame } from './progress.js';
const $ = id => document.getElementById(id);
const gems = { heart: ['♥', '#ef9aaa', 'Heart'], star: ['★', '#e6c477', 'Star'], cross: ['✚', '#baace9', 'Cross'], flame: ['🔥', '#eba77f', 'Flame'], drop: ['♦', '#8cc9d8', 'Drop'] };
const badgeNames = ['First light', 'Cascade keeper', 'Star maker', 'Seven Stars champion'];
let storage;
try { storage = window.localStorage; } catch { storage = null; }
let state = loadGame(storage) || newGame();
let selected = null, locked = false, hint = [], pointer = null, suppressClick = false;
const wait = ms => new Promise(resolve => setTimeout(resolve, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms));
function announce(message) { $('message').textContent = message; }
function persist() { $('save-status').textContent = saveGame(storage, state) ? '✓ Progress saved on this device' : 'Saving unavailable — keep this tab open to continue'; }
function award(name) { if (!state.badges.includes(name)) state.badges.push(name); }
function render() {
  const focusIndex = document.activeElement?.dataset.index;
  $('board').replaceChildren(...state.grid.flatMap((row, r) => row.map((gem, c) => {
    const b = document.createElement('button');
    b.className = 'tile'; b.type = 'button'; b.dataset.index = r * 7 + c;
    b.setAttribute('aria-label', `${gems[gem.type][2]}${gem.special ? ', ' + gem.special : ''}, row ${r + 1}, column ${c + 1}`);
    b.setAttribute('aria-pressed', String(selected?.row === r && selected?.col === c));
    b.style.setProperty('--gem', gems[gem.type][1]); b.textContent = gems[gem.type][0];
    if (gem.special) { const s = document.createElement('small'); s.textContent = { lineH: '↔', lineV: '↕', bomb: '✹', supernova: '✦' }[gem.special]; b.append(s); }
    if (selected?.row === r && selected?.col === c) b.classList.add('selected');
    if (hint.some(p => p.row === r && p.col === c)) b.classList.add('hinted');
    b.disabled = locked || state.status !== 'playing';
    return b;
  })));
  if (focusIndex !== undefined) $('board').querySelector(`[data-index="${focusIndex}"]`)?.focus({ preventScroll: true });
  $('score').textContent = state.score.toLocaleString(); $('moves').textContent = state.moves;
  $('target').textContent = LEVELS[state.level - 1].target.toLocaleString();
  $('level-title').replaceChildren(document.createTextNode(`Level ${state.level} `));
  const span = document.createElement('span'); span.textContent = 'of 5'; $('level-title').append(span);
  $('progress').max = LEVELS[state.level - 1].target; $('progress').value = state.score;
  $('hint').disabled = locked || state.status !== 'playing'; $('restart').disabled = locked;
  $('next').hidden = state.status !== 'won'; $('next').disabled = locked;
  $('badges').replaceChildren(...badgeNames.map((name, i) => {
    const el = document.createElement('div'); const earned = state.badges.includes(name);
    el.className = 'badge' + (earned ? ' unlocked' : '');
    const icon = document.createElement('span'); icon.textContent = ['✧', '≋', '✦', '♔'][i];
    el.append(icon, document.createTextNode(name + (earned ? ' · earned' : ' · locked'))); return el;
  }));
}
function statusMessage() {
  if (state.status === 'complete') announce('All five levels complete. You are a Seven Stars champion!');
  else if (state.status === 'won') announce('Beautiful connections! Level complete. Continue to the next level.');
  else if (state.status === 'lost') announce('Out of moves. Restart this level and try a fresh board.');
  else announce('Select two neighboring gems to make a match.');
}
function ensureMoves() {
  if (state.status === 'playing' && !findLegalMoves(state.grid).length) {
    state.grid = createPlayableGrid(); announce('No moves remained. A fresh board is ready — your score and moves are safe.');
  }
}
async function move(from, to) {
  if (locked || state.status !== 'playing' || !canSwap(state.grid, from.row, from.col, to.row, to.col)) return;
  const swapped = applySwap(state.grid, from.row, from.col, to.row, to.col);
  if (!findMatches(swapped).matches.length) { selected = null; hint = []; render(); announce('Try another connection. That swap makes no match; no move used.'); return; }
  locked = true; selected = null; hint = []; state.grid = swapped; state.moves--;
  try {
    let chain = 0;
    while (true) {
      const result = findMatches(state.grid); if (!result.matches.length) break;
      chain++; render();
      for (const p of result.matches) $('board').children[p.row * 7 + p.col].classList.add('matched');
      await wait(240);
      const cleared = applyMatches(state.grid, result, chain);
      const count = cleared.flat().filter(g => g === null).length;
      const points = count * 50 * chain; state.score += points; state.total += points;
      award('First light'); if (chain >= 2) award('Cascade keeper'); if (result.specials.length) award('Star maker');
      state.grid = applyGravity(cleared);
      announce(chain > 1 ? `Cascade ×${chain}! +${points} points` : `Lovely match! +${points} points`);
      // Bound pathological random cascades without leaving an unsettled save.
      if (chain >= 100) { state.grid = createPlayableGrid(); break; }
      render(); await wait(140);
    }
    if (state.score >= LEVELS[state.level - 1].target) {
      state.status = state.level === LEVELS.length ? 'complete' : 'won';
      if (state.status === 'complete') award('Seven Stars champion'); statusMessage();
    } else if (state.moves === 0) { state.status = 'lost'; statusMessage(); }
    ensureMoves(); persist();
  } finally { locked = false; render(); }
}
function choose(index) {
  if (locked || state.status !== 'playing') return;
  const cell = { row: Math.floor(index / 7), col: index % 7 };
  if (selected && canSwap(state.grid, selected.row, selected.col, cell.row, cell.col)) { void move(selected, cell); return; }
  selected = selected?.row === cell.row && selected?.col === cell.col ? null : cell; hint = []; render();
}
$('board').addEventListener('click', event => {
  if (suppressClick) { suppressClick = false; return; }
  const tile = event.target.closest('[data-index]'); if (tile) choose(Number(tile.dataset.index));
});
$('board').addEventListener('keydown', event => {
  const tile = event.target.closest('[data-index]'); if (!tile) return;
  const index = Number(tile.dataset.index), r = Math.floor(index / 7), c = index % 7;
  const delta = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[event.key];
  if (delta) { event.preventDefault(); const nr = r + delta[0], nc = c + delta[1]; if (nr >= 0 && nr < 7 && nc >= 0 && nc < 7) $('board').children[nr * 7 + nc].focus(); }
  if (event.key === 'Escape') { selected = null; hint = []; render(); }
});
$('board').addEventListener('pointerdown', event => {
  const tile = event.target.closest('[data-index]');
  if (tile && !locked) { suppressClick = false; pointer = { index: Number(tile.dataset.index), x: event.clientX, y: event.clientY }; tile.setPointerCapture(event.pointerId); }
});
$('board').addEventListener('pointercancel', () => { pointer = null; });
$('board').addEventListener('pointerup', event => {
  if (!pointer) return;
  const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) {
    suppressClick = true;
    const from = { row: Math.floor(pointer.index / 7), col: pointer.index % 7 };
    const to = { row: from.row + (Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0), col: from.col + (Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0) };
    void move(from, to);
  }
  pointer = null;
});
$('hint').addEventListener('click', () => { ensureMoves(); const first = findLegalMoves(state.grid)[0]; hint = first ? [first.from, first.to] : []; selected = null; render(); persist(); announce('The outlined neighbors will make a match.'); });
$('restart').addEventListener('click', () => {
  if (state.moves < LEVELS[state.level - 1].moves && state.status === 'playing' && !window.confirm('Restart this level? Your current level score will reset.')) return;
  state = newGame(state.level, state.total - state.score, state.badges); selected = null; hint = []; render(); persist(); statusMessage();
});
$('next').addEventListener('click', () => { if (state.status !== 'won') return; state = newGame(state.level + 1, state.total, state.badges); selected = null; hint = []; render(); persist(); statusMessage(); });
statusMessage(); ensureMoves(); render(); persist();
