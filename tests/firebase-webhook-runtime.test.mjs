import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  validLemonSqueezySignature,
  webhookFingerprint,
  validLemonSqueezyEvent,
  MAX_WEBHOOK_BYTES
} = require('../functions/lib/webhook-security.js');

const secret = 'unit-test-webhook-secret-not-a-real-credential';
const event = {
  meta: { event_name: 'order_created' },
  data: { type: 'orders', id: 'order-42', attributes: { status: 'paid' } }
};
const raw = Buffer.from(JSON.stringify(event));
const signature = createHmac('sha256', secret).update(raw).digest('hex');

test('Lemon Squeezy HMAC accepts only the correct signing secret and original raw bytes', () => {
  assert.equal(validLemonSqueezySignature(raw, signature, secret), true);
  assert.equal(validLemonSqueezySignature(raw, signature.toUpperCase(), secret), true);
  assert.equal(validLemonSqueezySignature(raw, signature, 'wrong-secret'), false);
  assert.equal(validLemonSqueezySignature(Buffer.from('{}'), signature, secret), false);
  assert.equal(validLemonSqueezySignature(raw, 'not-a-signature', secret), false);
  assert.equal(validLemonSqueezySignature(raw, undefined, secret), false);
  assert.equal(validLemonSqueezySignature(raw, signature, undefined), false);
  assert.equal(validLemonSqueezySignature(Buffer.alloc(MAX_WEBHOOK_BYTES + 1), signature, secret), false);
});

test('retries of byte-identical events receive the same Firestore document ID', () => {
  const replay = Buffer.from(JSON.stringify(event));
  assert.equal(webhookFingerprint(raw), webhookFingerprint(replay));
  assert.notEqual(webhookFingerprint(raw), webhookFingerprint(Buffer.from('{}')));
  assert.match(webhookFingerprint(raw), /^[a-f0-9]{64}$/);
});

test('JSON:API event metadata must match the signed event header', () => {
  assert.equal(validLemonSqueezyEvent(event, 'order_created'), true);
  assert.equal(validLemonSqueezyEvent(event, 'subscription_created'), false);
  assert.equal(validLemonSqueezyEvent({ ...event, data: { type: 'subscription-invoices', id: 'a-1' } }, 'order_created'), true);
  assert.equal(validLemonSqueezyEvent({ ...event, data: { id: '1' } }, 'order_created'), false);
  assert.equal(validLemonSqueezyEvent({ meta: { event_name: 'order_created' } }, 'order_created'), false);
});
