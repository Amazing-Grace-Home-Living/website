const tabs = [...document.querySelectorAll('[data-tab]')];
const sections = ['inspect', 'host', 'security'];
for (const button of tabs) {
  button.addEventListener('click', () => {
    for (const tab of tabs) tab.setAttribute('aria-selected', String(tab === button));
    for (const name of sections) document.getElementById(name).hidden = name !== button.dataset.tab;
  });
}
const selector = document.getElementById('selector');
const output = document.getElementById('result');
async function run(name) {
  const value = selector.value.trim();
  if (!value) { output.textContent = 'Enter a CSS selector first.'; return; }
  if (name === 'CLICK_ELEMENT' && !confirm('Click the selected element in the active tab? This may trigger an action on the site.')) return;
  output.textContent = 'Working on the active tab…';
  try {
    const reply = await chrome.runtime.sendMessage({ type: 'runTool', name, args: { selector: value } });
    output.textContent = JSON.stringify(reply?.result ?? { success: false, error: 'No response' }, null, 2);
  } catch (error) {
    output.textContent = 'Unavailable: ' + (error?.message || String(error));
  }
}
document.getElementById('inspect-element').addEventListener('click', () => run('DOM_QUERY'));
document.getElementById('click-element').addEventListener('click', () => run('CLICK_ELEMENT'));
selector.addEventListener('keydown', event => { if (event.key === 'Enter') run('DOM_QUERY'); });
