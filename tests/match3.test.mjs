import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [catalog, codeMatrix, legacyRoute, learningUi, gameUi, campaign] = await Promise.all([
  readFile(new URL('../arcade/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../arcade/code-matrix/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../arcade/matrix_of_consciousness_match_3_game.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/learning/learning-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../lms/index.html', import.meta.url), 'utf8'),
]);

test('Code Matrix has a playable campaign route; the arcade lists one game and its old route hands off', () => {
  assert.match(codeMatrix, /<title>Code Matrix.*Matrix of Conscience<\/title>/);
  assert.match(codeMatrix, /id="board"/);
  assert.match(codeMatrix, /src="\/src\/game\/ui.js"/);
  assert.match(catalog, /href="\/lms\/">Enter the Matrix campaign/);
  assert.equal((catalog.match(/<article\b/g) || []).length, 1);
  assert.doesNotMatch(catalog, /href="\/arcade\/(powershell-defense|vim-defense|bible-study|seven-stars|matrix-of-conscience)\//);
  assert.match(campaign, /href="\/arcade\/code-matrix\/">Play Code Matrix/);
  assert.match(legacyRoute, /joined Code Matrix/);
  assert.match(legacyRoute, /href="\/arcade\/code-matrix\/">Play Code Matrix/);
  assert.doesNotMatch(legacyRoute, /src=".*matrix-academy\.js/);
});
test('the single optional puzzle awards one-time Signal Bonus credits for defense resources', () => {
  assert.match(gameUi, /code-matrix-level-\$\{state\.level\}/);
  assert.match(gameUi, /awardBonus\(bonusId, 50\)/);
  assert.match(gameUi, /Matrix Defense towers and drones/);
  assert.match(learningUi, /50 Signal Bonus credits per level/);
});

test('Code Matrix displays coding symbols while retaining compatible save IDs', () => {
  assert.match(gameUi, /Variable/);
  assert.match(gameUi, /Code block/);
  assert.match(gameUi, /Function/);
  assert.match(gameUi, /Preserve the legacy save IDs/);
});
