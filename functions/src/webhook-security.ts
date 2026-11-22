import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const MAX_WEBHOOK_BYTES = 512 * 1024;

/** Verify the exact raw webhook body. No logging of signatures or payloads. */
export function validLemonSqueezySignature(
  rawBody: unknown,
  signature: string | undefined,
  secret: string | undefined
): rawBody is Buffer {
  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0 || rawBody.length > MAX_WEBHOOK_BYTES
      || !secret || !signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const actual = Buffer.from(signature, 'hex');
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function webhookFingerprint(rawBody: Buffer): string {
  // Stable for byte-identical retries. Firestore document creation is atomic.
  return createHash('sha256').update(rawBody).digest('hex');
}

export function validLemonSqueezyEvent(
  body: unknown,
  eventNameHeader: string | undefined
): body is { meta: { event_name: string }; data: { type: string; id: string } } {
  if (!body || typeof body !== 'object') return false;
  const data = (body as Record<string, unknown>).data;
  const meta = (body as Record<string, unknown>).meta;
  if (!data || typeof data !== 'object' || !meta || typeof meta !== 'object') return false;
  const { type, id } = data as Record<string, unknown>;
  const { event_name } = meta as Record<string, unknown>;
  return typeof type === 'string' && /^[a-z0-9_-]{1,64}$/.test(type)
    && typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id)
    && typeof event_name === 'string' && /^[a-z0-9_]{1,80}$/.test(event_name)
    && typeof eventNameHeader === 'string' && event_name === eventNameHeader;
}
