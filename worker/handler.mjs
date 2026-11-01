const ORIGIN = 'https://grace-remote-console.tealchime41.chatgpt.site';
const MAX_TEXT = 12000;
const credentialPattern = /(?:sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{15,}|github_pat_[A-Za-z0-9_]{16,}|Bearer\s+[A-Za-z0-9_.-]{20,})/i;

export function validateMessages(messages) {
  if (!Array.isArray(messages) || !messages.length || messages.length > 20) throw Error('Send 1–20 messages.');
  let total = 0;
  for (const message of messages) {
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string' || !message.content.trim() || message.content.length > MAX_TEXT || credentialPattern.test(message.content)) throw Error('Use text-only messages without credentials.');
    total += message.content.length;
  }
  if (total > 24000) throw Error('Message history is too large.');
  return messages.map(({ role, content }) => ({ role, content: content.trim() }));
}

function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }); }

export async function assistantResponse(request, env = {}, fetchImpl = fetch) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  if (!request.headers.get('oai-authenticated-user-id')) return json({ error: 'Authentication required.' }, 401);
  if (request.headers.get('Origin') !== ORIGIN) return json({ error: 'Origin not allowed.' }, 403);
  if (!env.OPENAI_API_KEY) return json({ error: 'Assistant is not configured.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON required.' }, 400); }
  try {
    const messages = validateMessages(body.messages);
    const response = await fetchImpl('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-5-mini', input: messages, max_output_tokens: 1200, store: false, tools: [] }) });
    if (!response.ok) {
      let code = ''; try { code = (await response.clone().json()).error?.code || ''; } catch {}
      return json({ error: code === 'insufficient_quota' ? 'Assistant quota is exhausted.' : 'Assistant is temporarily rate-limited.' }, response.status === 429 ? 429 : 502);
    }
    const data = await response.json();
    return json({ output: data.output || [] });
  } catch (error) { return json({ error: error.message || 'Assistant request failed.' }, 400); }
}

export default { fetch: (request, env, ctx) => assistantResponse(request, env) };
