const endpointInput = document.querySelector('#ai-endpoint');
const modelSelect = document.querySelector('#ai-model');
const checkButton = document.querySelector('#ai-check');
const testButton = document.querySelector('#ai-test');
const status = document.querySelector('#ai-setup-status');
const badge = document.querySelector('#ai-setup-badge');
const storageKey = 'amazing-grace-lmstudio-settings-v1';
let models = [], pending = null;
let saved = (() => {
  try { const value = JSON.parse(localStorage.getItem(storageKey) || '{}'); return value && typeof value === 'object' ? value : {}; }
  catch { return {}; }
})();
const resetButton = document.createElement('button');
resetButton.type = 'button'; resetButton.textContent = 'Reset local preference'; resetButton.className = 'setup-reset';
document.querySelector('.setup-actions')?.append(resetButton);
if (typeof saved.endpoint === 'string') endpointInput.value = saved.endpoint;
function baseUrl() { return endpointInput.value.trim().replace(/\/+$/, ''); }
function setState(message, kind = '') {
  status.textContent = message; status.dataset.state = kind;
  badge.textContent = kind === 'ok' ? 'Ready' : kind === 'error' ? 'Needs attention' : 'Not checked';
  badge.dataset.state = kind;
}
function save() {
  saved = { endpoint: baseUrl(), model: modelSelect.value };
  try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { /* Optional preference. */ }
}
function resetConnection(message) {
  pending?.abort(); pending = null; models = [];
  modelSelect.replaceChildren(new Option('Check server to discover models'));
  modelSelect.disabled = true; testButton.disabled = true; checkButton.disabled = false;
  setState(message);
}
function explainError(error) {
  if (error.name === 'TimeoutError') return 'The server took too long to respond. Check LM Studio and try again.';
  return error instanceof TypeError ? 'The browser could not reach LM Studio. Start its server, confirm port 1234, and enable CORS for this site—or use the Grace Remote companion as a local proxy.' : error.message || 'LM Studio did not return a usable response.';
}
async function request(path, controller, options = {}) {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...options, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok) throw Error(data?.error?.message || `LM Studio returned HTTP ${response.status}.`);
  return data;
}
async function run(task) {
  pending?.abort();
  const controller = new AbortController(); pending = controller;
  checkButton.disabled = true; modelSelect.disabled = true; testButton.disabled = true;
  try { await task(controller); }
  catch (error) { if (pending === controller) setState(explainError(error), 'error'); }
  finally {
    if (pending === controller) {
      pending = null; checkButton.disabled = false;
      modelSelect.disabled = !models.length; testButton.disabled = !models.length;
    }
  }
}
checkButton.onclick = () => run(async controller => {
  models = []; setState('Checking LM Studio…');
  const data = await request('/models', controller);
  if (pending !== controller) return;
  models = Array.isArray(data?.data) ? data.data.filter(item => item && typeof item.id === 'string' && item.id) : [];
  if (!models.length) throw Error('The server is reachable, but no models are loaded. Load a chat model in LM Studio first.');
  const previous = saved.model || modelSelect.value;
  modelSelect.replaceChildren(...models.map(item => new Option(item.id, item.id)));
  modelSelect.value = models.some(item => item.id === previous) ? previous : models[0].id;
  save(); setState(`Connected. Found ${models.length} model${models.length === 1 ? '' : 's'}; ${modelSelect.value} is selected.`, 'ok');
});
testButton.onclick = () => run(async controller => {
  if (!models.length || !modelSelect.value) return;
  setState('Sending a short local smoke test…');
  const data = await request('/chat/completions', controller, {
    method: 'POST', body: JSON.stringify({ model: modelSelect.value, messages: [{ role: 'user', content: 'Reply with exactly: Local study companion ready.' }], temperature: 0, max_tokens: 32 }),
  });
  if (pending !== controller) return;
  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== 'string' || !reply.trim()) throw Error('The model responded without text. Choose a chat-capable model.');
  save(); setState(`Smoke test passed: “${reply.trim().slice(0, 90)}${reply.trim().length > 90 ? '…' : ''}”`, 'ok');
});
modelSelect.onchange = save;
endpointInput.oninput = () => resetConnection('Endpoint changed. Check the server again.');
resetButton.onclick = () => {
  try { localStorage.removeItem(storageKey); } catch { /* Optional preference. */ }
  saved = {}; endpointInput.value = 'http://127.0.0.1:1234/v1';
  resetConnection('Local preference reset. Check the server to reconnect.');
};
