import assert from 'node:assert/strict';
import test from 'node:test';
import { advance, clues, echoes, initialState, restore, roles, verdicts, visions } from '../src/game/matrix-rpg/fractured-state.js';

test('every calling can gather evidence, choose a verdict, and finish the chapter', () => {
  for (const role of Object.keys(roles)) {
    let investigated = advance(initialState, 'role', role);
    assert.equal(advance(investigated, 'verdict', 'justice'), investigated);
    for (const clue of Object.keys(clues)) investigated = advance(investigated, 'clue', clue);
    for (const verdict of Object.keys(verdicts)) {
      let state = advance(investigated, 'verdict', verdict);
      assert.equal(advance(state, 'memory', 2), state);
      for (const index of visions.keys()) state = advance(state, 'memory', index);
      assert.equal(advance(state, 'echo', 'Falsehood'), state);
      for (const [, answer] of echoes) state = advance(state, 'echo', answer);
      assert.equal(state.echo, echoes.length);
      assert.equal(state.verdict, verdict);
      assert.deepEqual(restore(JSON.parse(JSON.stringify(state))), state);
      assert.equal(advance(state, 'echo'), state);
    }
  }
});

test('restoring a checkpoint discards invalid roles, duplicate clues, and premature unlocks', () => {
  assert.deepEqual(restore({ role: 'unknown', verdict: 'mercy', memory: 3, echo: 3 }), initialState);
  assert.deepEqual(restore({ role: 'Scholar', clues: ['ledger', 'ledger', 'unknown'], verdict: 'mercy', memory: 3, echo: 3 }),
    { ...initialState, role: 'Scholar', clues: ['ledger'] });
});
