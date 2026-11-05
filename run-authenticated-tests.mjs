import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { enabledEnvironment, hiddenPrompt, catalog } from './vault.mjs'; // Leverages vault mechanisms

async function launchTests() {
  try {
    // 1. Authenticate to the local vault through a masked console prompt
    const passphrase = await hiddenPrompt('🔐 Enter Vault Passphrase to inject testing tokens: ');
    
    // 2. Fetch the available integration options
    const availableProviders = await catalog();
    const targetIds = availableProviders.map(p => p.id);

    echo('🔓 Decrypting environment records...');
    // 3. Extract the requested environment keys dynamically
    const unlocked = await enabledEnvironment(targetIds, passphrase, availableProviders);
    
    // 4. Inject standard test configurations right alongside decrypted vault secrets
    const testEnv = {
      ...process.env,
      ...unlocked.env,
      NODE_ENV: 'test',
      PLAYWRIGHT_HEADLESS: 'false' // Visible execution mode for local debugging
    };

    echo('🚀 Spawning authenticated Playwright suite...');
    // 5. Execute the test process using clean, non-shell array bounds
    const testProcess = spawn('npx', ['playwright', 'test'], {
      cwd: process.cwd(),
      env: testEnv,
      stdio: 'inherit',
      shell: false
    });

    testProcess.on('exit', (code) => {
      process.exitCode = code ?? 0;
      echo(`🏁 Test runner finished with exit code: ${process.exitCode}`);
    });

  } catch (error) {
    console.error(`❌ Vault Injection Failed: ${error.message}`);
    process.exit(1);
  }
}

function echo(msg) {
  console.log(`[Grace Companion Bridge] ${msg}`);
}

launchTests();
