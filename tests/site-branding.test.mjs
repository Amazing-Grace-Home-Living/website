import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const pages = ['index.html','listings/index.html','src/blog.html','arcade/index.html','arcade/tools/index.html','lms/index.html','toolbox/index.html','audio-library/index.html','privacy/index.html','stories/index.html'];
test('primary public pages carry the same Amazing Grace site logo', () => {
 for (const path of pages) {
  const html = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  assert.ok(html.includes('/assets/brand-sheet.png'), path + ' missing logo asset');
  assert.ok(html.includes('aria-label="Amazing Grace Home Living homepage"'), path + ' missing accessible home link');
  assert.ok(!html.includes('AmazingGraceHomeLivingLogo.png'), path + ' uses retired logo path');
 }
});
