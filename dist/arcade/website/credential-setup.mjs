import { createInterface } from 'node:readline/promises';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PROVIDER_GUIDES, guideFor } from './provider-guides.mjs';
import { hiddenPrompt, readVault, saveVault, vaultPath } from './vault.mjs';

export function validateCredential(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 8192 || /[\s\u0000]/.test(value)) throw Error('Invalid credential format. Paste a single token into the hidden prompt.');
  return value;
}
export async function configureCredential(id, { promptSecret = hiddenPrompt, read = readVault, save = saveVault, output = console.log } = {}) {
  const guide = guideFor(id);
  if (!guide.env) { output('No credential required for ' + guide.name + '. Follow its local server instructions.'); return {stored:false}; }
  let passphrase = '', secret = '';
  try {
    passphrase = await promptSecret('Host vault passphrase (14+ characters, hidden): ');
    if (passphrase.length < 14) throw Error('Use a vault passphrase of at least 14 characters.');
    const entries = await read(passphrase);
    if (!Object.keys(entries).length) {
      const confirm = await promptSecret('Confirm new vault passphrase (hidden): ');
      if (confirm !== passphrase) throw Error('Passphrases do not match. Nothing saved.');
    }
    secret = validateCredential(await promptSecret(guide.name + ' credential (hidden): '));
    if (secret !== await promptSecret('Paste credential again to confirm (hidden): ')) throw Error('Credentials do not match. Nothing saved.');
    entries[id] = { value:secret, updatedAt:new Date().toISOString(), expiresAt:null };
    await save(entries, passphrase);
    output('Stored encrypted credential for ' + guide.name + '. This does not verify provider access.');
    output('Restart the companion with --integrations ' + id + ', then refresh models or use the corresponding host tool.');
    return {stored:true, provider:id};
  } finally { secret=''; passphrase=''; }
}
export function openAccount(id, spawnProcess = spawn, platform = process.platform) {
  const url = guideFor(id).accountUrl;
  const command = platform === 'win32' ? 'explorer.exe' : platform === 'darwin' ? 'open' : 'xdg-open';
  const child = spawnProcess(command, [url], {shell:false, stdio:'ignore', detached:true, windowsHide:true});
  child.once('error', () => console.error('Could not open a browser. Open the official link shown above.'));
  child.unref();
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--list') {
    for (const guide of PROVIDER_GUIDES) console.log(guide.id + ' · ' + guide.name);
    return;
  }
  let id = args.find(arg => !arg.startsWith('--'));
  if (args.some(arg => arg.startsWith('--') && !['--guide','--open'].includes(arg)) || args.filter(arg => !arg.startsWith('--')).length > 1) throw Error('Usage: node credential-setup.mjs [PROVIDER] [--guide] [--open]. Never pass a token as an argument.');
  if (!id) {
    if (!process.stdin.isTTY) throw Error('Run in an interactive host terminal or use --list.');
    for (const guide of PROVIDER_GUIDES) console.log(guide.id + ' · ' + guide.name);
    const rl = createInterface({input:process.stdin,output:process.stdout});
    try { id = (await rl.question('Provider ID: ')).trim(); } finally { rl.close(); }
  }
  const guide = guideFor(id);
  console.log('\n' + guide.name + ' · your account, your credential\n' + guide.accountUrl);
  guide.steps.forEach((step,index) => console.log((index+1) + '. ' + step));
  console.log(guide.note + '\nDocumentation: ' + guide.docs);
  if (args.includes('--open')) openAccount(id);
  if (args.includes('--guide') || !guide.env) return;
  if (!process.stdin.isTTY) throw Error('Use an interactive host terminal for hidden input.');
  const file = resolve(vaultPath()), workspace = dirname(fileURLToPath(import.meta.url));
  if (file === workspace || file.startsWith(workspace + (process.platform === 'win32' ? '\\' : '/'))) throw Error('Vault must be outside the repository.');
  console.log('Encrypted host vault: ' + file + '. No secrets are sent to the browser, chat, or Git.');
  const rl = createInterface({input:process.stdin,output:process.stdout});
  let choice;
  try { choice = await rl.question('After creating your own credential, press Enter to store it, or type cancel: '); } finally { rl.close(); }
  if (choice.trim().toLowerCase() === 'cancel') { console.log('Canceled. Nothing saved.'); return; }
  await configureCredential(id);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(() => {
  console.error('Setup did not complete. Check the provider ID, interactive terminal, credential confirmation, vault passphrase, and file permissions. No credential is printed.');
  process.exitCode = 1;
});
