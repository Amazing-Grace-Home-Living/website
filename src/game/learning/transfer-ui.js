import { exportPassport, parsePassport, planRestore, restorePassport, MAX_PASSPORT_SIZE } from './transfer.js';
const $ = id => document.getElementById(id);
const RESULT_KEY = 'learning-passport-restore-result';

export function setupProgressTools() {
  let pending = null, generation = 0;
  const status = $('transfer-status'), preview = $('restore-preview'), apply = $('apply-restore');
  function clearPreview() { pending = null; preview.hidden = true; apply.disabled = true; $('restore-records').replaceChildren(); }
  try { const previous = sessionStorage.getItem(RESULT_KEY); if (previous) { status.textContent = previous; sessionStorage.removeItem(RESULT_KEY); } } catch {}
  $('export-progress').addEventListener('click', () => {
    try {
      const { passport, warnings } = exportPassport(window.localStorage);
      const count = Object.keys(passport.records).length;
      if (!count) { status.textContent = `No saved learning checkpoints are available to export.${warnings.length ? ' Some local saves were unreadable.' : ' Complete a lesson or game checkpoint first.'}`; return; }
      const url = URL.createObjectURL(new Blob([JSON.stringify(passport, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `amazing-grace-learning-${new Date().toISOString().slice(0, 10)}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = `${count} saved learning records exported. Keep the file to restore in another browser.${warnings.length ? ` ${warnings.join(' ')}` : ''}`;
    } catch { status.textContent = 'Saved browser progress is unavailable. In-tab progress cannot be exported while browser storage is blocked.'; }
  });
  $('import-progress').addEventListener('change', async event => {
    const current = ++generation; clearPreview(); status.textContent = '';
    const file = event.target.files?.[0]; if (!file) return;
    if (file.size > MAX_PASSPORT_SIZE) { status.textContent = 'Choose a JSON passport no larger than 1 MB.'; return; }
    try {
      const text = await file.text(); if (generation !== current) return;
      const parsed = parsePassport(text), plan = planRestore(window.localStorage, parsed.passport);
      pending = parsed.passport; preview.hidden = false;
      $('restore-file').textContent = file.name;
      $('restore-summary').textContent = `After merge: ${plan.summary.xp} campaign XP, ${plan.summary.passed} lessons passed, ${plan.summary.missions} defense missions completed. ${plan.changes.length} saved records would change.`;
      $('restore-records').replaceChildren(...plan.changes.map(change => { const li = document.createElement('li'); li.textContent = change.label; return li; }));
      apply.disabled = plan.changes.length === 0;
      status.textContent = [...parsed.warnings, ...plan.warnings].join(' ') || (plan.changes.length ? 'Preview ready. No saved progress has changed yet.' : 'This passport is already represented in the current saves. Nothing needs to change.');
      preview.tabIndex = -1; preview.focus();
    } catch (error) { clearPreview(); status.textContent = error.message; }
  });
  $('cancel-restore').addEventListener('click', () => { generation++; clearPreview(); $('import-progress').value = ''; status.textContent = 'Import canceled. Saved progress is unchanged.'; });
  apply.addEventListener('click', () => {
    if (!pending || apply.disabled) return;
    apply.disabled = true;
    try {
      // Re-plan immediately before writing to preserve progress earned after preview.
      const plan = restorePassport(window.localStorage, pending);
      const message = `${plan.changes.length} saved learning records merged. Existing achievements were retained. Open game tabs must reload before continuing.`;
      try { sessionStorage.setItem(RESULT_KEY, message); } catch {}
      status.textContent = message; window.location.reload();
    } catch (error) { status.textContent = error.message; apply.disabled = error.partial === true; }
  });
}
