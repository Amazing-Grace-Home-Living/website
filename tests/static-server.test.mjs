import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('the optional static host serves only the build output', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'aghl-site-'));
  await mkdir(join(directory, 'listings'));
  await writeFile(join(directory, 'index.html'), '<h1>Home</h1>');
  await writeFile(join(directory, 'listings', 'index.html'), '<h1>Listings</h1>');

  const probe = createServer();
  const port = await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => resolve(probe.address().port));
  });
  await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ['scripts/serve.mjs', directory], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
    stdio: 'ignore'
  });
  t.after(() => { child.kill(); });
  t.after(async () => { await rm(directory, { recursive: true, force: true }); });

  const url = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(url + '/healthz')).status === 200) { ready = true; break; }
    } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, 'static server should start');

  const home = await fetch(url + '/');
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Home/);
  assert.equal((await fetch(url + '/listings/')).status, 200);
  assert.equal((await fetch(url + '/missing')).status, 404);
  assert.equal((await fetch(url + '/', { method: 'POST' })).status, 405);
  assert.equal((await fetch(url + '/', { method: 'HEAD' })).status, 200);
});
