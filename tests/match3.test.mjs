import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [catalog, codeMatrix, legacyRoute, learningUi, gameUi, campaign] = await Promise.all([
  readFile(new URL('../arcade/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../code-matrix/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../arcade/matrix_of_consciousness_match_3_game.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/learning/learning-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../lms/index.html', import.meta.url), 'utf8'),
]);

test('the arcade links directly to playable modes and Intune', () => {
  assert.match(codeMatrix, /<title>Code Matrix.*Matrix of Conscience<\/title>/);
  assert.match(codeMatrix, /id="board"/);
  assert.match(codeMatrix, /src="\/src\/game\/ui.js"/);
  for (const route of ['/src/game/tower-defense/index.html', '/arcade/code-matrix/', '/arcade/relay-patrol/', '/lms/microsoft-intune/mission/']) {
    assert.ok(catalog.includes(`href="${route}"`), route);
  }
  assert.match(campaign, /href="\/code-matrix\/">Play Code Matrix/);
  assert.match(legacyRoute, /joined Code Matrix/);
  assert.match(legacyRoute, /href="\/code-matrix\/">Play Code Matrix/);
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
