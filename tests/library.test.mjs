import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
test('two consolidated story editions have six chapters and retain source credits', async () => {
 const data = JSON.parse(await readFile('stories/library.json', 'utf8'));
 assert.equal(data.entries.length, 2);
 for (const e of data.entries) {
  const html = await readFile(`stories/${e.slug}/index.html`, 'utf8');
  assert.equal((html.match(/<section>/g) || []).length, 6);
  assert.ok(html.includes('Sheila Garcia')); assert.ok(!html.includes('Coming soon'));
 }
});
test('all twenty media files match the preserved source hashes and have download links', async () => {
 const { files } = JSON.parse(await readFile('audio-library/catalog.json', 'utf8'));
 const page = await readFile('audio-library/index.html', 'utf8');
 assert.equal(files.length, 20);
 for (const file of files) {
  const data = await readFile(file.path);
  assert.equal(createHash('sha256').update(data).digest('hex'), file.sha256);
  assert.ok(page.includes(`href="../${file.path}" download`));
 }
});
