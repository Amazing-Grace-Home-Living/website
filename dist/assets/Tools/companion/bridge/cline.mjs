import { spawn } from 'node:child_process';
import { isAbsolute } from 'node:path';
import { validateAssistantMessage } from '../assistant.mjs';

export function createCline({ cwd, enabled = false, executable, spawnProcess = spawn }) {
  let child;
  let job = null;
  function status() {
    return { enabled, workspace: cwd, job: job && { ...job } };
  }
  function run({ prompt, provider, model }) {
    if (!enabled) throw new Error('Cline tasks are disabled. Start the companion with --enable-cline and --cline-bin.');
    if (!executable || !isAbsolute(executable)) throw new Error('Set --cline-bin to the absolute path of the Cline executable.');
    if (child) throw new Error('A Cline task is already running or stopping.');
    prompt = validateAssistantMessage(prompt);
    if (typeof provider !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(provider)) {
      throw new Error('Enter the Cline provider ID configured on this host.');
    }
    if (typeof model !== 'string' || !model.trim() || model.length > 160 || /[\r\n\0]/.test(model)) {
      throw new Error('Enter the Cline model ID configured for this provider.');
    }
    job = { running: true, output: '', truncated: false, exitCode: null, error: null };
    try {
      child = spawnProcess(executable, ['--json', '--auto-approve', 'true', '--provider', provider,
        '--model', model.trim(), '--cwd', cwd, '--', prompt],
      { cwd, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      job.running = false;
      job.error = `Could not launch Cline (${error.code || 'process error'}).`;
      throw new Error(job.error);
    }
    const append = chunk => {
      const text = chunk.toString();
      const remaining = 100000 - job.output.length;
      job.output += text.slice(0, Math.max(remaining, 0));
      if (text.length > remaining) job.truncated = true;
    };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.on('error', error => {
      job.error = `Could not launch Cline (${error.code || 'process error'}).`;
    });
    child.on('close', (code, signal) => {
      job.running = false;
      job.exitCode = code;
      if (signal && !job.error) job.error = `Cline stopped by ${signal}.`;
      else if (code !== 0 && !job.error) job.error = `Cline exited with code ${code}.`;
      child = null;
    });
    return status();
  }
  function stop() {
    if (!job?.running || !child) throw new Error('No Cline task is running.');
    if (!child.kill()) throw new Error('Could not send a stop signal to Cline.');
    return status();
  }
  return { status, run, stop, close: () => { if (child) child.kill(); } };
}
