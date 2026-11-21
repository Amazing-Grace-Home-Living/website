import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const rules = read('firestore.rules');
const points = read('functions/src/points.ts');
const functions = read('functions/src/index.ts');
const template = read('public/auth.template.js');
const build = read('scripts/build.mjs');

test('Firestore rules reserve financial fields and block forged donations', () => {
  assert.match(rules, /match \/users\/\{uid\}/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(editableProfileKeys\(\)\)/);
  assert.match(rules, /match \/donations\/\{docId\}[\s\S]*?allow create, update, delete: if false;/);
  assert.match(rules, /match \/pointTransactions\/\{docId\}[\s\S]*?allow create, update, delete: if false;/);
  assert.match(rules, /match \/\{document=\*\*\}[\s\S]*?allow read, write: if false;/);
  assert.doesNotMatch(rules, /allow\s+(?:read,\s*write|write)\s*:\s*if\s+true/);
});

test('points endpoints verify Firebase ID tokens and restrict grants to administrators', () => {
  assert.match(points, /verifyIdToken\(match\[1\], true\)/);
  assert.match(points, /if \(!caller\.admin\)/);
  assert.match(points, /uid !== caller\.uid/);
  assert.match(points, /Number\.isSafeInteger/);
  assert.doesNotMatch(points, /const \{ uid, amount \} = req\.body as/);
});

test('payment webhook rejects invalid signatures before recording anything', () => {
  assert.match(functions, /defineSecret\('LEMON_SQUEEZY_WEBHOOK_SECRET'\)/);
  assert.match(functions, /createHmac\('sha256', secret\)\.update\(raw\)/);
  assert.match(functions, /timingSafeEqual\(received, expected\)/);
  assert.ok(functions.indexOf('timingSafeEqual(received, expected)') < functions.indexOf("db.collection('payments').add("));
});

test('generated auth runtime has a correctly scoped Firebase Auth instance and no tracked duplicate key', () => {
  assert.match(template, /const auth = firebase\.auth\(\)/);
  assert.match(template, /auth\.onAuthStateChanged/);
  assert.match(build, /public\/auth\.template\.js/);
  assert.equal(existsSync(new URL('../public/auth.js', import.meta.url)), false);
});
