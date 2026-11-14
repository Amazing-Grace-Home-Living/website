import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, validSave, loadGame, saveGame } from '../src/game/progress.js';
import { createPlayableGrid, findLegalMoves, findMatches, applySwap, applyMatches, applyGravity } from '../src/game/engine/matchmaker.js';
test('playable boards and legal moves remain settled through 100 turns', () => {
  let grid = createPlayableGrid();
  for (let turn = 0; turn < 100; turn++) {
    assert.equal(findMatches(grid).matches.length, 0);
    const moves = findLegalMoves(grid);
    if (!moves.length) { grid = createPlayableGrid(); continue; }
    const { from, to } = moves[0]; grid = applySwap(grid, from.row, from.col, to.row, to.col);
    assert.ok(findMatches(grid).matches.length);
    let cascades = 0;
    while (findMatches(grid).matches.length) {
      grid = applyGravity(applyMatches(grid, findMatches(grid)));
      assert.ok(++cascades < 100);
    }
  }
});
test('saves round trip, reject damaged data, and handle unavailable storage', () => {
  let value; const storage = { getItem: () => value, setItem: (k, v) => { value = v; } };
  const state = newGame(); assert.ok(validSave(state)); assert.ok(saveGame(storage, state));
  assert.deepEqual(loadGame(storage), state);
  assert.equal(validSave({ ...state, moves: -1 }), false);
  assert.equal(validSave({ ...state, grid: [] }), false);
  assert.equal(validSave({ ...state, status: 'playing', score: 10000, total: 10000 }), false);
  value = '{broken'; assert.equal(loadGame(storage), null);
  assert.equal(saveGame(null, state), false); assert.equal(loadGame(null), null);
});
test('line clears activate another special exactly once', () => {
  const grid = Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => ({ type: String((r + c) % 5), special: null })));
  grid[0][0].special = 'lineH'; grid[0][3].special = 'lineV';
  const next = applyMatches(grid, { matches: [{ row: 0, col: 0 }], specials: [] });
  assert.ok(next[0].every(g => g === null));
  assert.ok(next.every(row => row[3] === null));
  assert.equal(grid[0][0].special, 'lineH');
});
