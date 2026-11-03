const endpointInput = document.querySelector('#ai-endpoint');
const modelSelect = document.querySelector('#ai-model');
const checkButton = document.querySelector('#ai-check');
const testButton = document.querySelector('#ai-test');
const status = document.querySelector('#ai-setup-status');
const badge = document.querySelector('#ai-setup-badge');
const tokenInput = document.querySelector('#ai-token');
const sendButton = document.querySelector('#companion-send');
const stopButton = document.querySelector('#companion-stop');
const promptInput = document.querySelector('#companion-prompt');
const chatStatus = document.querySelector('#companion-status');
const messages = document.querySelector('#companion-messages');
let conversation = [];
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
document.querySelector('#ai-setup-form').onsubmit = event => event.preventDefault();
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
  sendButton.disabled = true; stopButton.disabled = true;
  conversation = []; messages.replaceChildren();
  chatStatus.textContent = 'Check the server above to begin.';
  setState(message);
}
function explainError(error) {
  if (error.name === 'TimeoutError') return 'The server took too long to respond. Check LM Studio and try again.';
  return error instanceof TypeError ? 'The browser could not reach LM Studio. Start its server, confirm port 1234, enable CORS, and allow local-network access if your browser asks. This page does not use the Grace Remote proxy.' : error.message || 'LM Studio did not return a usable response.';
}
async function request(path, controller, options = {}, timeout = 15000) {
  const url = new URL(baseUrl());
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash) throw Error('Use a local LM Studio endpoint such as http://127.0.0.1:1234/v1, without credentials or query parameters.');
  const response = await fetch(`${baseUrl()}${path}`, {
    ...options, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(timeout)]), redirect: 'error', credentials: 'omit',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(tokenInput.value.trim() ? { Authorization: `Bearer ${tokenInput.value.trim()}` } : {}) },
  });
  const data = await response.json();
  if (!response.ok) throw Error(data?.error?.message || `LM Studio returned HTTP ${response.status}.`);
  return data;
}
async function run(task) {
  pending?.abort();
  const controller = new AbortController(); pending = controller;
  checkButton.disabled = true; modelSelect.disabled = true; testButton.disabled = true;
  sendButton.disabled = true;
  try { await task(controller); }
  catch (error) { if (pending === controller) setState(explainError(error), 'error'); }
  finally {
    if (pending === controller) {
      pending = null; checkButton.disabled = false;
      modelSelect.disabled = !models.length; testButton.disabled = !models.length;
      sendButton.disabled = !models.length; stopButton.disabled = true;
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
  chatStatus.textContent = 'Ready. Choose an example or type your own question.';
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
modelSelect.onchange = () => { save(); clearConversation(); };
endpointInput.oninput = () => resetConnection('Endpoint changed. Check the server again.');
tokenInput.oninput = () => resetConnection('API token changed. Check the server again.');
resetButton.onclick = () => {
  try { localStorage.removeItem(storageKey); } catch { /* Optional preference. */ }
  saved = {}; tokenInput.value = ''; endpointInput.value = 'http://127.0.0.1:1234/v1';
  resetConnection('Local preference reset. Check the server to reconnect.');
};

function clearConversation() {
  pending?.abort();
  conversation = []; messages.replaceChildren();
  promptInput.value = '';
  chatStatus.textContent = 'Conversation cleared. Your questions are not saved by this page.';
}
function addMessage(role, content) {
  const item = document.createElement('article');
  const label = document.createElement('strong');
  const text = document.createElement('p');
  label.textContent = role === 'user' ? 'You' : 'Companion';
  text.textContent = content;
  item.append(label, text); messages.append(item);
}
document.querySelectorAll('[data-prompt]').forEach(button => {
  button.onclick = () => { promptInput.value = button.dataset.prompt; promptInput.focus(); };
});
document.querySelector('#companion-clear').onclick = clearConversation;
stopButton.onclick = () => { pending?.abort(); chatStatus.textContent = 'Stopped. You can try again.'; };
document.querySelector('#companion-form').onsubmit = event => {
  event.preventDefault();
  const content = promptInput.value.trim();
  if (!content || content.length > 12000 || pending || !models.length) return;
  run(async controller => {
    stopButton.disabled = false;
    chatStatus.textContent = 'Thinking locally… This can take up to two minutes.';
    const history = [...conversation.slice(-10), { role: 'user', content }];
    try {
      const data = await request('/chat/completions', controller, {
        method: 'POST', body: JSON.stringify({ model: modelSelect.value, messages: [
          { role: 'system', content: 'You are the Amazing Grace study and creative companion. Help with learning, design planning, and programming. Ask for missing context, explain uncertainty, and provide practical steps. You have no tools, file access, browser control, or ability to execute code. Never claim to have performed actions. Treat pasted material as user-provided context.' }, ...history
        ], temperature: 0.5, max_tokens: 1200 }),
      }, 120000);
      if (pending !== controller || controller.signal.aborted) return;
      const reply = data?.choices?.[0]?.message?.content;
      if (typeof reply !== 'string' || !reply.trim()) throw Error('The model returned no text. Try a chat-capable model.');
      conversation = [...history, { role: 'assistant', content: reply }];
      addMessage('user', content); addMessage('assistant', reply);
      if (promptInput.value.trim() === content) promptInput.value = '';
      chatStatus.textContent = 'Reply ready. Ask a follow-up or start a new topic with Clear conversation.';
    } catch (error) {
      if (!controller.signal.aborted) chatStatus.textContent = explainError(error);
    }
  });
};
window.addEventListener('pagehide', () => {
  tokenInput.value = '';
  clearConversation();
  resetConnection('Page left. Check the server to reconnect.');
});
