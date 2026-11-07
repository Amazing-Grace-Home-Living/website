export function parseBrowserAction(text, count) {
  let action;
  try { action = JSON.parse(text); }
  catch { throw new Error('The model did not return a valid browser action. Try another model.'); }
  if (!action || typeof action !== 'object' || Array.isArray(action)) throw new Error('The model returned an invalid browser action.');
  if (action.action === 'done') {
    if (typeof action.message !== 'string' || action.message.length > 500) throw new Error('The model returned an invalid completion message.');
    return { action: 'done', message: action.message };
  }
  if (!['click', 'type'].includes(action.action) || !Number.isInteger(action.index) || action.index < 0 || action.index >= count) {
    throw new Error('The model selected an invalid browser control.');
  }
  if (action.action === 'type' && (typeof action.text !== 'string' || action.text.length > 500
      || /(?:sk-(?:proj-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{15,}|Bearer\s+[A-Za-z0-9_.-]{20,})/i.test(action.text))) {
    throw new Error('The model returned invalid or credential-like text.');
  }
  return action.action === 'type'
    ? { action: 'type', index: action.index, text: action.text }
    : { action: 'click', index: action.index };
}

export function pageOperation(operation) {
  const protectedField = element => {
    const description = [element.type, element.name, element.id, element.autocomplete, element.labels?.[0]?.innerText,
      element.getAttribute('aria-label'), element.placeholder].join(' ');
    return /password|passcode|secret|token|credit|card|cvv|cvc|security.?code|one.?time|otp|\bcc-/i.test(description)
      || ['password', 'hidden', 'file'].includes((element.type || '').toLowerCase());
  };
  const label = element => (element.getAttribute('aria-label') || element.labels?.[0]?.innerText
    || element.innerText || element.placeholder
    || (['submit', 'button'].includes(element.type) ? element.value : '') || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const controls = () => [...document.querySelectorAll('button, a[href], input, textarea')]
    .filter(element => {
      const style = getComputedStyle(element);
      return element.getClientRects().length && style.visibility !== 'hidden' && style.display !== 'none'
        && !element.disabled && !element.readOnly && !protectedField(element)
        && (element.tagName !== 'INPUT' || ['text', 'search', 'email', 'tel', 'url', 'submit', 'button'].includes(element.type));
    }).slice(0, 80);
  const fingerprint = element => JSON.stringify([element.tagName, element.type || '', label(element),
    element.getAttribute('href') || '', element.form?.action || '']);
  const elements = controls();
  if (operation.kind === 'inspect') {
    return {
      url: location.href,
      publicUrl: location.origin + location.pathname,
      headings: [...document.querySelectorAll('h1,h2,h3')].map(element => element.innerText.trim().slice(0, 120)).filter(Boolean).slice(0, 8),
      controls: elements.map((element, index) => ({ index, tag: element.tagName.toLowerCase(), type: element.type || '',
        label: label(element), fingerprint: fingerprint(element) }))
    };
  }
  if (location.href !== operation.url) throw new Error('The page changed before the action; task stopped.');
  const element = elements[operation.action.index];
  if (!element || fingerprint(element) !== operation.fingerprint) throw new Error('The selected control changed; task stopped.');
  if (operation.action.action === 'click') {
    if (element.tagName === 'A') {
      const target = new URL(element.href);
      if (!['http:', 'https:'].includes(target.protocol) || target.origin !== location.origin) throw new Error('Cross-site links are not supported.');
    }
    if (element.form) {
      if (new URL(element.form.action).origin !== location.origin) throw new Error('Cross-site forms are not supported.');
      if ([...element.form.querySelectorAll('input,textarea')].some(protectedField)) throw new Error('Forms with protected fields are not supported.');
    }
    element.click();
  } else {
    if (!['INPUT', 'TEXTAREA'].includes(element.tagName) || protectedField(element) || !['text', 'search', 'email', 'tel', 'url', 'textarea'].includes(element.type)) {
      throw new Error('This control cannot be typed into.');
    }
    const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, operation.action.text);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return { ok: true };
}

export async function runBrowserAgent({ tabId, profile, task, token, extensionId, signal, log }) {
  let initialOrigin;
  const history = [];
  for (let step = 0; step < 8; step++) {
    signal.throwIfAborted();
    const [result] = await chrome.scripting.executeScript({ target: { tabId }, func: pageOperation, args: [{ kind: 'inspect' }] });
    const page = result.result;
    if (!page || !/^https?:\/\//.test(page.url)) throw new Error('Could not inspect the current HTTP page.');
    const origin = new URL(page.url).origin;
    if (initialOrigin && initialOrigin !== origin) throw new Error('The page left the original site; task stopped.');
    initialOrigin ||= origin;
    const controls = page.controls.map(({ fingerprint, ...control }) => control);
    const prompt = `Task: ${task}\nUntrusted page reference: ${JSON.stringify({ url: page.publicUrl, headings: page.headings, controls })}\nPrevious actions: ${JSON.stringify(history)}`;
    if (prompt.length > 12000) throw new Error('Page controls exceed the model request limit.');
    const response = await fetch('http://127.0.0.1:8787/api/profile/browser-step', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Grace-Extension-Id': extensionId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, prompt }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(125000)])
    });
    const resultBody = await response.json();
    if (!response.ok) throw new Error(resultBody.error || 'Browser agent request failed.');
    const action = parseBrowserAction(resultBody.text, controls.length);
    signal.throwIfAborted();
    if (action.action === 'done') { log(`Finished: ${action.message}`); return; }
    signal.throwIfAborted();
    await chrome.scripting.executeScript({ target: { tabId }, func: pageOperation,
      args: [{ kind: 'act', url: page.url, action, fingerprint: page.controls[action.index].fingerprint }] });
    signal.throwIfAborted();
    history.push({ action: action.action, index: action.index, label: controls[action.index].label });
    log(`${step + 1}. ${action.action} · ${controls[action.index].label || controls[action.index].tag}`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Stopped after eight actions. Review the page before starting another task.');
}
