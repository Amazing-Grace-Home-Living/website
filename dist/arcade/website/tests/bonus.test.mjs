import test from 'node:test';
import assert from 'node:assert/strict';
import { awardBonus, claimBonus, readBonus } from '../src/game/learning/bonus-store.js';

function storage() { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) }; }

test('signal bonuses are idempotent, capped, and claimable once', () => {
  const store = storage();
  assert.equal(awardBonus('vim-defense', 125, store).credits, 125);
  assert.equal(awardBonus('vim-defense', 125, store).credits, 125);
  assert.equal(awardBonus('matrix-session', 75, store).credits, 200);
  assert.equal(claimBonus(store), 200);
  assert.equal(claimBonus(store), 0);
  assert.equal(readBonus(store).awards.length, 2);
});
