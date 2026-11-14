// This file was extracted from the original arcade/star-matrix/index.html
// Adjusted import paths for the consolidated repo structure.
import {
  GRID_SIZE,
  createPlayableGrid as createGrid,
  findLegalMoves,
  applySwap,
  findMatches,
  applyMatches,
  applyGravity,
  isAdjacent as smIsAdjacent
} from '../engine/matchmaker.js';

const ICONS = {
  heart: '💠',   // supernova
  star: '🌟',    // shooting
  cross: '✦',    // gem
  flame: '🔥',   // rank
  drop: '☄️'     // cosmic
};

const SCORE_KEY = 'star_matrix_high_score';

const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset-btn');

let gridData = createGrid();
let score = 0;
let high = 0;
try { const saved = Number(localStorage.getItem(SCORE_KEY)); if (Number.isFinite(saved) && saved > 0) high = saved; } catch { /* Storage is optional. */ }
highEl.textContent = String(high);

let isProcessing = false;
let dragStartTile = null;
let dragTargetTile = null;
let dragStartPos = null;
let activePointerId = null;

const tiles = [];

function kindOf(cell) {
  if (!cell) return null;
  return typeof cell === 'string' ? cell : cell.kind;
}

function renderBoard() {
  if (!tiles.length) return;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const idx = r * GRID_SIZE + c;
      const cell = tiles[idx];
      const kind = kindOf(gridData[r][c]);
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      cell.dataset.kind = kind || '';
      cell.textContent = (ICONS[kind] || '·') + (gridData[r][c]?.special ? '✧' : '');
      cell.setAttribute('aria-label', `${kind}, row ${r + 1}, column ${c + 1}${gridData[r][c]?.special ? ', ' + gridData[r][c].special : ''}`);
      cell.classList.toggle('is-processing', isProcessing);
    }
  }
}

function setScore(nextScore) {
  score = nextScore;
  scoreEl.textContent = String(score);
  if (score > high) {
    high = score;
    try { localStorage.setItem(SCORE_KEY, String(high)); } catch { statusEl.textContent = 'High score cannot be saved on this device.'; }
    highEl.textContent = String(high);
  }
  if (score >= 1000) {
    statusEl.textContent = 'Threshold reached.';
  }
}

function resetGame() {
  isProcessing = false;
  resetDragState();
  gridData = createGrid();
  setScore(0);
  statusEl.textContent = '';
  renderBoard();
}

function resetDragState() {
  if (dragStartTile) {
    dragStartTile.classList.remove('selected');
    dragStartTile.setAttribute('aria-selected', 'false');
  }
  dragStartTile = null;
  dragTargetTile = null;
  dragStartPos = null;
  activePointerId = null;
}

function smSwap(rowA, colA, rowB, colB) {
  if (isProcessing) return;
  if (!smIsAdjacent(rowA, colA, rowB, colB)) return;

  isProcessing = true;
  renderBoard();

  let next = applySwap(gridData, rowA, colA, rowB, colB);
  let combo = 1;
  let gained = 0;

  const firstMatch = findMatches(next);
  if (!firstMatch.matches.length) {
    isProcessing = false;
    renderBoard();
    return;
  }

  while (true) {
    const res = findMatches(next);
    if (!res.matches.length) break;
    gained += res.matches.length * 10 * combo;
    next = applyMatches(next, res, combo);
    next = applyGravity(next);
    combo++;
    if (combo > 100) { next = createGrid(); break; }
  }

  gridData = findLegalMoves(next).length ? next : createGrid();
  setScore(score + gained);
  isProcessing = false;
  renderBoard();
}

function attemptSwap(tileA, tileB) {
  const rowA = Number(tileA?.dataset?.row);
  const colA = Number(tileA?.dataset?.col);
  const rowB = Number(tileB?.dataset?.row);
  const colB = Number(tileB?.dataset?.col);
  if (![rowA, colA, rowB, colB].every(Number.isFinite)) return;

  const isAdjacent =
    (Math.abs(rowA - rowB) === 1 && colA === colB) ||
    (Math.abs(colA - colB) === 1 && rowA === rowB);
  if (!isAdjacent) return;

  smSwap(rowA, colA, rowB, colB);
  resetDragState();
}

function inferSwipeNeighbor(e) {
  if (!dragStartPos) return null;
  const dx = e.clientX - dragStartPos.x;
  const dy = e.clientY - dragStartPos.y;
  const threshold = 18;
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return null;
  const row = Number(dragStartTile?.dataset?.row);
  const col = Number(dragStartTile?.dataset?.col);
  if (![row, col].every(Number.isFinite)) return null;

  let targetRow = row;
  let targetCol = col;
  if (Math.abs(dx) > Math.abs(dy)) {
    targetCol += dx > 0 ? 1 : -1;
  } else {
    targetRow += dy > 0 ? 1 : -1;
  }
  if (!smIsAdjacent(row, col, targetRow, targetCol)) return null;
  return boardEl.querySelector(`.star-cell[data-row="${targetRow}"][data-col="${targetCol}"]`);
}

function onPointerDown(e) {
  if (isProcessing) return;
  if (dragStartTile || activePointerId !== null) return;
  const cell = e.target instanceof Element ? e.target.closest('.star-cell') : null;
  if (!(cell instanceof HTMLElement)) return;

  activePointerId = e.pointerId;
  dragStartTile = cell;
  dragStartPos = { x: e.clientX, y: e.clientY };
  cell.setPointerCapture(e.pointerId);
  cell.classList.add('selected');
  cell.setAttribute('aria-selected', 'true');
}

function onPointerMove(e) {
  if (e.pointerId !== activePointerId) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  dragTargetTile = el ? el.closest('.star-cell') : null;
}

function onPointerUp(e) {
  if (e.pointerId !== activePointerId) return;
  const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
  const dragEndTile = (elementAtPoint ? elementAtPoint.closest('.star-cell') : null) || dragTargetTile || inferSwipeNeighbor(e);
  if (dragStartTile && dragEndTile && dragEndTile !== dragStartTile) {
    attemptSwap(dragStartTile, dragEndTile);
  } else {
    resetDragState();
  }
  if (boardEl.hasPointerCapture(e.pointerId)) {
    boardEl.releasePointerCapture(e.pointerId);
  }
}

function onPointerCancel(e) {
  if (e.pointerId !== activePointerId) return;
  resetDragState();
  if (boardEl.hasPointerCapture(e.pointerId)) {
    boardEl.releasePointerCapture(e.pointerId);
  }
}

function initBoard() {
  boardEl.innerHTML = '';
  tiles.length = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'star-cell';
      cell.tabIndex = 0;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-selected', 'false');
      tiles.push(cell);
      boardEl.appendChild(cell);
    }
  }
}

resetBtn.addEventListener('click', resetGame);
boardEl.addEventListener('pointerdown', onPointerDown);
boardEl.addEventListener('pointermove', onPointerMove);
boardEl.addEventListener('pointerup', onPointerUp);
boardEl.addEventListener('pointercancel', onPointerCancel);
initBoard();
renderBoard();

// Click/tap and keyboard selection complement drag input.
let selectedTile = null;
boardEl.addEventListener('click', event => {
  const cell = event.target.closest('.star-cell');
  if (!cell || isProcessing) return;
  if (selectedTile && selectedTile !== cell) {
    attemptSwap(selectedTile, cell);
    selectedTile.classList.remove('selected'); selectedTile = null;
  } else { selectedTile = cell; cell.classList.add('selected'); }
});
boardEl.addEventListener('keydown', event => {
  const cell = event.target.closest('.star-cell'); if (!cell) return;
  const r = Number(cell.dataset.row), c = Number(cell.dataset.col);
  const d = { ArrowLeft: [0,-1], ArrowRight: [0,1], ArrowUp: [-1,0], ArrowDown: [1,0] }[event.key];
  if (d) { event.preventDefault(); tiles[(r+d[0])*7+c+d[1]] && boardEl.querySelector(`[data-row="${r+d[0]}"][data-col="${c+d[1]}"]`)?.focus(); }
});
