import { PROVIDERS, newProfile, validateProfile } from './profiles.js';
import { runBrowserAgent } from './browser-agent.js';

const $ = id => document.getElementById(id);
const form = $('profile-form');
$('extension-id').textContent = chrome.runtime.id;
let profiles = [];
let selectedId;
let page = null;
let busy = false;
let pendingRequest = null;
let clineTimer;
let clineGeneration = 0;

// Update launch command based on selected assistant and extension ID
function updateLaunchCommand() {
  const assistant = $('assistant-select')?.value || 'codex';
  // Standard companion launch command with extension ID and terminal support
  const cmd = `node bridge.mjs --extension-id ${chrome.runtime.id} --terminal`;
  const launchCmdElem = $('launch-cmd');
  if (launchCmdElem) {
    launchCmdElem.value = cmd;
    $('launch-section').style.display = 'block';
  }
}

// Listen for assistant selection changes and wire launch section controls
function setupAssistantSelector() {
  const select = $('assistant-select');
  if (select) {
    select.addEventListener('change', () => {
      const opt = select.selectedOptions[0];
      const url = opt.dataset.doc;
      const instructions = $('assistant-instructions');
      if (instructions) {
        instructions.innerHTML = `Documentation: <a href="${url}" target="_blank" rel="noopener">${opt.textContent}</a>`;
      }
      updateLaunchCommand();
    });
  }

  // Also update when user types in token or loads panel
  $('token')?.addEventListener('input', updateLaunchCommand);

  // Wire Copy Launch Command button with visual feedback
  const copyBtn = $('copy-launch');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const launchCmd = $('launch-cmd')?.value;
      if (!launchCmd) return;
      try {
        await navigator.clipboard.writeText(launchCmd);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    });
  }

  // Initialize command on panel load
  updateLaunchCommand();
}

// Call setup after DOM loaded (script runs after DOM)
setupAssistantSelector();
let browserController;

for (const [value, provider] of Object.entries(PROVIDERS)) {
  $('provider').add(new Option(provider.label, value));
  $('send-provider').add(new Option(provider.label, value));
  $('browser-provider').add(new Option(provider.label, value));
}

function selected() { return profiles.find(profile => profile.id === selectedId); }

function showProfiles() {
  $('profiles').replaceChildren(...profiles.map(profile => new Option(profile.name, profile.id)));
  $('profiles').value = selectedId;
  const profile = selected();
  for (const [key, value] of Object.entries(profile)) {
    if (form.elements.namedItem(key)) form.elements.namedItem(key).value = value;
  }
  providerNotice();
  updateCustomProviderFields();
}

function providerNotice() {
  const provider = PROVIDERS[form.elements.provider.value];
  const cloudProvider = ['openai', 'gemini', 'deepseek'].includes(form.elements.provider.value);
  form.elements.baseURL.readOnly = cloudProvider;
  form.elements.baseURL.setAttribute('aria-readonly', String(cloudProvider));
  $('credential').textContent = `Credentials · ${provider.credential}`;
  const profile = selected();
  $('destination').textContent = `Saved destination · ${PROVIDERS[profile.provider].label} / ${profile.model || 'choose a model'}. Save edits before sending.`;
}

function updateCustomProviderFields() {
  const customRegistrar = form.elements.registrar.value === 'Custom';
  const customDns = form.elements.dns.value === 'Custom';
  $('custom-registrar-field').hidden = !customRegistrar;
  $('custom-dns-field').hidden = !customDns;
  form.elements.customRegistrar.required = customRegistrar;
  form.elements.customDns.required = customDns;
  if (!customRegistrar) form.elements.customRegistrar.value = '';
  if (!customDns) form.elements.customDns.value = '';
}

async function persist() {
  await chrome.storage.local.set({ profiles, selectedId });
}

async function bridge(path, body) {
  const { bridgeToken } = await chrome.storage.session.get('bridgeToken');
  if (!bridgeToken) throw new Error('Connect the bridge first.');
  const response = await fetch(`http://127.0.0.1:8787/api/profile${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${bridgeToken}`, 'X-Grace-Extension-Id': chrome.runtime.id, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: pendingRequest ? AbortSignal.any([pendingRequest.signal, AbortSignal.timeout(125000)]) : AbortSignal.timeout(125000)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Bridge request failed.');
  return result;
}

$('connect').addEventListener('click', async () => {
  try {
    const token = $('token').value.trim();
    if (token) await chrome.storage.session.set({ bridgeToken: token });
    $('token').value = '';
    const result = await bridge('/health');
    $('connection').textContent = `Connected. OpenAI key ${result.configured.openai ? 'available' : 'missing'}; Gemini key ${result.configured.gemini ? 'available' : 'missing'}; DeepSeek key ${result.configured.deepseek ? 'available' : 'missing'}.`;
    await refreshCline();
  } catch (error) { $('connection').textContent = error.message; }
});

$('lock').addEventListener('click', async () => {
  pendingRequest?.abort();
  browserController?.abort();
  await chrome.storage.session.remove('bridgeToken');
  $('token').value = '';
  $('answer').textContent = '';
  $('browser-log').textContent = '';
  clearTimeout(clineTimer);
  clineGeneration++;
  $('cline-output').textContent = '';
  $('cline-status').textContent = 'Locked. A running Cline task may continue on the host.';
  $('remove-page').click();
  $('connection').textContent = 'Locked. Reconnect with your companion token.';
});

$('profiles').addEventListener('change', async () => {
  selectedId = $('profiles').value;
  showProfiles();
  await persist();
});
$('new').addEventListener('click', async () => {
  const profile = newProfile();
  profiles.push(profile);
  selectedId = profile.id;
  showProfiles();
  await persist();
});
$('delete').addEventListener('click', async () => {
  if (profiles.length === 1) { $('status').textContent = 'Keep at least one profile.'; return; }
  profiles = profiles.filter(profile => profile.id !== selectedId);
  selectedId = profiles[0].id;
  showProfiles();
  await persist();
});
$('provider').addEventListener('change', () => {
  const provider = PROVIDERS[form.elements.provider.value];
  form.elements.baseURL.value = provider.baseURL;
  form.elements.model.value = provider.model;
  providerNotice();
});
form.elements.registrar.addEventListener('change', updateCustomProviderFields);
form.elements.dns.addEventListener('change', updateCustomProviderFields);
form.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const values = Object.fromEntries(new FormData(form));
    values.contextLimit = Number(values.contextLimit);
    values.maxOutputTokens = Number(values.maxOutputTokens);
    const profile = validateProfile({ ...selected(), ...values });
    profiles = profiles.map(item => item.id === selectedId ? profile : item);
    await persist();
    showProfiles();
    $('status').textContent = 'Profile saved on this device.';
  } catch (error) { $('status').textContent = error.message; }
});
$('attach').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:\/\//.test(tab.url ?? '')) {
      throw new Error('Open an HTTP website and use the toolbar popup to capture that page.');
    }
    const [capture] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({ title: document.title, url: location.origin + location.pathname, text: document.body.innerText.slice(0, 12000) })
    });
    page = capture.result;
    $('page-title').textContent = `${page.title} · ${page.url}`;
    $('page-text').textContent = page.text;
    $('page-preview').hidden = false;
    $('page-preview').open = true;
    $('remove-page').hidden = false;
    $('status').textContent = 'Review this text. It will accompany your next request to the saved provider.';
  } catch (error) { $('status').textContent = error.message; }
});
$('remove-page').addEventListener('click', () => {
  page = null;
  $('page-preview').hidden = true;
  $('page-text').textContent = '';
  $('remove-page').hidden = true;
});
async function refreshCline() {
  const generation = clineGeneration;
  try {
    const result = await bridge('/cline');
    if (generation !== clineGeneration) return;
    $('cline-run').disabled = !!result.job?.running;
    $('cline-status').textContent = !result.enabled ? 'Cline is disabled on the companion.'
      : result.job?.running ? `Running in ${result.workspace}.`
      : result.job?.error ? result.job.error
      : result.job ? `Finished with exit code ${result.job.exitCode}.` : `Ready in ${result.workspace}.`;
    $('cline-output').textContent = result.job ? result.job.output + (result.job.truncated ? '\n[Output truncated]' : '') : '';
    clearTimeout(clineTimer);
    if (result.job?.running) clineTimer = setTimeout(refreshCline, 2000);
  } catch (error) {
    if (generation !== clineGeneration) return;
    $('cline-status').textContent = error.message;
    $('cline-run').disabled = false;
  }
}
$('cline-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('cline-run').disabled = true;
  try {
    await bridge('/cline/run', { provider: $('cline-provider').value, model: $('cline-model').value, prompt: $('cline-prompt').value });
    await refreshCline();
  } catch (error) { $('cline-status').textContent = error.message; $('cline-run').disabled = false; }
});
$('cline-stop').addEventListener('click', async () => {
  try { await bridge('/cline/stop', {}); await refreshCline(); }
  catch (error) { $('cline-status').textContent = error.message; }
});
$('browser-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (browserController) return;
  browserController = new AbortController();
  const controller = browserController;
  $('browser-run').disabled = true;
  try {
    const profile = validateProfile(selected());
    if ($('browser-provider').value !== profile.provider) throw new Error('The confirmed provider must match the saved profile.');
    const { bridgeToken } = await chrome.storage.session.get('bridgeToken');
    if (!bridgeToken) throw new Error('Connect the bridge first.');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:\/\//.test(tab.url ?? '')) throw new Error('Open an HTTP website in the active tab first.');
    controller.signal.throwIfAborted();
    $('browser-log').textContent = '';
    $('browser-status').textContent = 'Running. Actions may change the page.';
    await runBrowserAgent({ tabId: tab.id, profile, task: $('browser-task').value, token: bridgeToken,
      extensionId: chrome.runtime.id, signal: controller.signal,
      log: message => { $('browser-log').textContent += `${message}\n`; } });
    $('browser-status').textContent = 'Task finished. Review the page.';
  } catch (error) { $('browser-status').textContent = controller.signal.aborted ? 'Task stopped. Previous actions cannot be undone.' : error.message; }
  finally { browserController = null; $('browser-run').disabled = false; $('browser-provider').value = ''; }
});
$('browser-stop').addEventListener('click', () => {
  if (browserController) { browserController.abort(); $('browser-status').textContent = 'Stop requested. Previous actions cannot be undone.'; }
});
$('chat-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  busy = true;
  pendingRequest = new AbortController();
  $('send').disabled = true;
  $('status').textContent = `Sending to ${PROVIDERS[selected().provider].label}… Keep this window open.`;
  $('answer').textContent = '';
  try {
    const profile = validateProfile(selected());
    if ($('send-provider').value !== profile.provider) throw new Error('The confirmed provider must match the saved profile.');
    const project = Object.fromEntries(['type', 'repository', 'branch', 'domain', 'registrar', 'dns', 'hosting', 'customRegistrar', 'customDns'].map(key => [key, profile[key]]));
    const result = await bridge('/chat', { profile, project, page, prompt: $('prompt').value });
    $('answer').textContent = result.text;
    $('status').textContent = `Completed · ${result.provider} / ${result.model}`;
    $('send-provider').value = '';
  } catch (error) { $('status').textContent = error.message; }
  finally { busy = false; pendingRequest = null; $('send').disabled = false; }
});

try {
  await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  const saved = await chrome.storage.local.get(['profiles', 'selectedId']);
  profiles = saved.profiles?.length ? saved.profiles : [{
    ...newProfile(), name: 'Nexus Local'
  }];
  selectedId = profiles.some(profile => profile.id === saved.selectedId) ? saved.selectedId : profiles[0].id;
  showProfiles();
  await persist();
} catch (error) { $('status').textContent = `Settings could not load: ${error.message}`; }
