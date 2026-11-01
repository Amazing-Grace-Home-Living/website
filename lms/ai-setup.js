const endpointInput = document.querySelector('#ai-endpoint');
const modelSelect = document.querySelector('#ai-model');
const checkButton = document.querySelector('#ai-check');
const testButton = document.querySelector('#ai-test');
const status = document.querySelector('#ai-setup-status');
const badge = document.querySelector('#ai-setup-badge');
const storageKey = 'amazing-grace-lmstudio-settings-v1';
let models = [];
const saved = (() => { try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; } })();
if (saved.endpoint) endpointInput.value = saved.endpoint;
function baseUrl() { return endpointInput.value.trim().replace(/\/+$/, ''); }
function setState(message, kind = '') { status.textContent = message; status.dataset.state = kind; badge.textContent = kind === 'ok' ? 'Ready' : kind === 'error' ? 'Needs attention' : 'Not checked'; badge.dataset.state = kind; }
function save() { try { localStorage.setItem(storageKey, JSON.stringify({ endpoint: baseUrl(), model: modelSelect.value })); } catch { /* Optional preference. */ } }
function explainError(error) { return error instanceof TypeError ? 'The browser could not reach LM Studio. Start its server, confirm port 1234, and enable CORS for this site—or use the Grace Remote companion as a local proxy.' : error.message || 'LM Studio did not return a usable response.'; }
async function request(path, options = {}) { const response = await fetch(`${baseUrl()}${path}`, { ...options, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) } }); let data = {}; try { data = await response.json(); } catch { /* Explain below. */ } if (!response.ok) throw Error(data.error?.message || data.error || `LM Studio returned HTTP ${response.status}.`); return data; }
async function discover() { const data = await request('/models'); models = (data.data || []).filter(item => item && typeof item.id === 'string'); if (!models.length) throw Error('The server is reachable, but no models are loaded. Load a chat model in LM Studio first.'); const previous = saved.model || modelSelect.value; modelSelect.replaceChildren(...models.map(item => { const option = document.createElement('option'); option.value = option.textContent = item.id; return option; })); modelSelect.value = models.some(item => item.id === previous) ? previous : models[0].id; modelSelect.disabled = false; testButton.disabled = false; save(); setState(`Connected. Found ${models.length} model${models.length === 1 ? '' : 's'}; ${modelSelect.value} is selected.`, 'ok'); }
checkButton.onclick = async () => { checkButton.disabled = true; modelSelect.disabled = true; testButton.disabled = true; setState('Checking LM Studio…'); try { await discover(); } catch (error) { models = []; setState(explainError(error), 'error'); } checkButton.disabled = false; };
testButton.onclick = async () => { if (!modelSelect.value) return; testButton.disabled = true; setState('Sending a short local smoke test…'); try { const data = await request('/chat/completions', { method: 'POST', body: JSON.stringify({ model: modelSelect.value, messages: [{ role: 'user', content: 'Reply with exactly: Local study companion ready.' }], temperature: 0, max_tokens: 32 }) }); const reply = data.choices?.[0]?.message?.content?.trim(); if (!reply) throw Error('The model responded without text. Choose a chat-capable model.'); save(); setState(`Smoke test passed: “${reply.slice(0, 90)}${reply.length > 90 ? '…' : ''}”`, 'ok'); } catch (error) { setState(explainError(error), 'error'); } testButton.disabled = false; };
modelSelect.onchange = save;
endpointInput.onchange = () => { models = []; modelSelect.replaceChildren(new Option('Check server to discover models')); modelSelect.disabled = true; testButton.disabled = true; setState('Endpoint changed. Check the server again.'); };
