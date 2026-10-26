import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
const source = await readFile(new URL('../src/game/engine/matchmaker.js', import.meta.url), 'utf8');
const engine = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const board = rows => rows.map(row => [...row].map(type => ({ type, kind: type, special: null })));

test('initial boards have no matches and preserve kind compatibility', () => {
  for (let i = 0; i < 100; i++) {
    const grid = engine.createInitialGrid();
    assert.equal(grid.length, 7);
    assert.equal(engine.findMatches(grid).matches.length, 0);
    assert.ok(grid.flat().every(gem => gem.kind === gem.type));
  }
});
test('adjacent different-color triples do not create a bomb', () => {
  const result = engine.findMatches(board(['aaabc', 'bbbca', 'cabac']));
  assert.equal(result.matches.length, 6);
  assert.deepEqual(result.specials, []);
});
test('four, five, and intersecting matches create special gems', () => {
  assert.equal(engine.findMatches(board(['aaaab'])).specials[0].specialType, 'lineH');
  assert.equal(engine.findMatches(board(['aaaaa'])).specials[0].specialType, 'supernova');
  const grid = board(['bca', 'cba', 'aaa']);
  const result = engine.findMatches(grid);
  assert.equal(result.matches.length, 5);
  assert.equal(result.specials[0].specialType, 'bomb');
  assert.doesNotThrow(() => engine.applyMatches(grid, result));
});
test('matched supernova clears its color after its own cell is removed', () => {
  const grid = board(['aaabc', 'bcabd', 'cdbac']);
  grid[0][0].special = 'supernova';
  const snapshot = JSON.stringify(grid);
  const next = engine.applyMatches(grid, engine.findMatches(grid));
  assert.ok(next.flat().every(gem => gem?.type !== 'a'));
  assert.equal(JSON.stringify(grid), snapshot);
});
test('gravity supports rectangular boards and leaves input intact', () => {
  const grid = board(['abc', 'bca', 'cab', 'abc']);
  grid[3][0] = null;
  const next = engine.applyGravity(grid);
  assert.equal(next[3][0].type, 'c');
  assert.equal(next[2][0].type, 'b');
  assert.ok(next.flat().every(Boolean));
  assert.equal(grid[3][0], null);
});
test('swap helpers enforce bounds and preserve the source board', () => {
  const grid = board(['abc', 'bca', 'cab']);
  assert.equal(engine.canSwap(grid, -1, 0, 0, 0), false);
  assert.equal(engine.canSwap(grid, 0, 0, 1, 1), false);
  assert.equal(engine.canSwap(grid, 0, 0, 0, 1), true);
  const next = engine.applySwap(grid, 0, 0, 0, 1);
  assert.equal(next[0][0].type, 'b');
  assert.equal(grid[0][0].type, 'a');
});
