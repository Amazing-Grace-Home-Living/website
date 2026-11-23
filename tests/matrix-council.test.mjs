import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advance, approaches, archive, chapter, clues, consequences, council,
  councilDecisions, echoes, initialState, restore, roles, verdicts, visions
} from '../src/game/matrix-rpg/fractured-state.js';

function completeFirstTwo(role, verdict = 'justice', release = 'publish') {
  let state = advance(initialState, 'role', role);
  for (const clue of Object.keys(clues)) state = advance(state, 'clue', clue);
  state = advance(state, 'verdict', verdict);
  for (const index of visions.keys()) state = advance(state, 'memory', index);
  for (const [, answer] of echoes) state = advance(state, 'echo', answer);
  state = advance(state, 'enterArchive');
  for (const record of archive) state = advance(state, 'archiveAnswer', record.answer);
  return advance(state, 'archiveDecision', release);
}

test('Chapter 3 cannot be skipped or unlocked before completing both earlier chapters', () => {
  assert.equal(advance(initialState, 'enterCouncil'), initialState);
  const chapterOne = restore({ role: 'Caregiver', clues: Object.keys(clues), verdict: 'justice', memory: visions.length, echo: echoes.length });
  assert.equal(advance(chapterOne, 'enterCouncil'), chapterOne);
  const chapterTwo = completeFirstTwo('Caregiver');
  assert.equal(chapter(chapterTwo), 2);
  assert.equal(advance(chapterTwo, 'councilDecision', 'public'), chapterTwo);
  assert.equal(advance(chapterTwo, 'councilAnswer', council[0].answer), chapterTwo);
});

test('every calling and ethical decision produces a complete, restorable story', () => {
  for (const role of Object.keys(roles)) {
    for (const verdict of Object.keys(verdicts)) {
      for (const archiveDecision of ['publish', 'review']) {
        const archiveState = completeFirstTwo(role, verdict, archiveDecision);
        let ready = advance(archiveState, 'enterCouncil');
        assert.equal(chapter(ready), 3);
        for (const approach of Object.keys(approaches[role])) {
          let state = advance(ready, 'councilApproach', approach);
          assert.notEqual(state, ready);
          assert.deepEqual(restore(JSON.parse(JSON.stringify(state))), state);
          for (const [index, record] of council.entries()) {
            const wrong = (record.answer + 1) % record.options.length;
            assert.equal(advance(state, 'councilAnswer', wrong), state);
            state = advance(state, 'councilAnswer', record.answer);
            assert.equal(state.councilStep, index + 1);
            assert.deepEqual(restore(JSON.parse(JSON.stringify(state))), state);
          }
          for (const decision of Object.keys(councilDecisions)) {
            const final = advance(state, 'councilDecision', decision);
            assert.equal(final.councilDecision, decision);
            assert.equal(final.verdict, verdict);
            assert.equal(final.archiveDecision, archiveDecision);
            assert.equal(final.approach, approach);
            assert.equal(chapter(final), 3);
            assert.equal(consequences(final).length, 4);
            assert.ok(consequences(final)[0].includes(verdicts[verdict][1]));
            assert.ok(consequences(final)[1].includes(archiveDecision === 'publish' ? 'Researchers' : 'Families'));
            assert.deepEqual(restore(JSON.parse(JSON.stringify(final))), final);
            assert.equal(advance(final, 'councilDecision', 'public'), final);
          }
        }
      }
    }
  }
});

test('invalid or tampered saves cannot forge hearing completion or role-specific approach', () => {
  assert.deepEqual(restore({ councilStarted: true, approach: 'compare', councilStep: 999, councilDecision: 'public' }), initialState);
  const second = completeFirstTwo('Messenger', 'mercy', 'review');
  const crafted = restore({ ...second, councilStarted: true, approach: 'protect', councilStep: 4, councilDecision: 'public' });
  assert.equal(crafted.councilStarted, true);
  assert.equal(crafted.approach, '');
  assert.equal(crafted.councilStep, 0);
  assert.equal(crafted.councilDecision, '');
  const legit = advance(advance(second, 'enterCouncil'), 'councilApproach', 'relay');
  assert.equal(restore({ ...legit, councilStep: 999, councilDecision: 'public' }).councilStep, council.length);
  assert.equal(restore({ ...legit, councilStep: -1, councilDecision: 'public' }).councilStep, 0);
  assert.equal(restore({ ...legit, councilStep: 1.5 }).councilStep, 0);
  assert.equal(restore({ ...legit, councilDecision: '__proto__' }).councilDecision, '');
});

test('Chapter 1 and Chapter 2 saves remain compatible and replay independently', () => {
  const old = { role: 'Watchman', clues: Object.keys(clues), verdict: 'restoration', memory: visions.length, echo: echoes.length };
  const ch1 = restore(old);
  assert.equal(ch1.councilStarted, false);
  assert.equal(ch1.archiveStarted, false);
  const ch2 = completeFirstTwo('Scholar', 'restoration', 'review');
  assert.equal(restore(ch2).councilStarted, false);
  assert.equal(chapter(initialState), 0);
  assert.equal(chapter(advance(initialState, 'role', 'Scholar')), 1);
  assert.deepEqual(restore({}), initialState);
  assert.deepEqual(restore(null), initialState);
});
