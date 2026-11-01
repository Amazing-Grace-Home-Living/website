import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DefenseInput } from '../src/game/vim-defense/input.js';

test('sliding two pointers into fire preserves the remaining owner', () => {
  const input = new DefenseInput();
  input.update(17, 0, 0, 'left'); input.update(22, 1, 0, 'fire');
  assert.deepEqual([...input.rebuild().keys], [' ', 'h']);
  input.update(17, 1, 0, 'fire');
  assert.deepEqual([...input.rebuild().keys], [' ']);
  input.remove(22);
  assert.ok(input.rebuild().keys.has(' '));
  input.remove(17);
  assert.equal(input.rebuild().keys.size, 0);
});
test('latest movement entry wins; unrelated pointers cannot steal movement', () => {
  const input = new DefenseInput();
  input.update(1, 0, 0, 'left'); input.update(2, 0, 0, 'right');
  input.update(3, 0, 0, 'fire'); input.update(1, 1, 0, 'left');
  assert.deepEqual([...input.rebuild().keys], [' ', 'l']);
  assert.equal(input.movementPointerId, 2);
  input.remove(2);
  assert.ok(input.rebuild().keys.has('h'));
});
test('drone is edge-triggered independently per pointer', () => {
  const input = new DefenseInput();
  assert.equal(input.update(1, 0, 0, 'drone'), true);
  assert.equal(input.update(1, 1, 0, 'drone'), false);
  assert.equal(input.update(2, 0, 0, 'drone'), true);
  input.update(1, 0, 0, null);
  assert.equal(input.update(1, 0, 0, 'drone'), true);
});
test('keyboard and aimed fire survive other releases; clear removes all sources', () => {
  const input = new DefenseInput();
  input.keyboard.add(' '); input.keyboard.add('h');
  input.update(1, 0, 0, 'fire'); input.update(2, 0, 0, 'aim'); input.update(3, 0, 0, 'aim');
  input.remove(1); input.remove(2);
  assert.deepEqual(input.rebuild(), { keys: new Set([' ', 'h']), mouseFiring: true });
  input.clear();
  assert.deepEqual(input.rebuild(), { keys: new Set(), mouseFiring: false });
});
