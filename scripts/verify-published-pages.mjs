import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, join } from 'node:path';

// Check the generated site, not only the source tree: a public/ asset that
// exists in Git but was omitted by the build is still a broken download.
const root = resolve('dist');
const pages = [
  'index.html',
  'arcade/index.html',
  'arcade/tools/index.html',
  'arcade/vim-defense/index.html',
  'arcade/academy/index.html',
  'toolbox/index.html',
];

const missing = [];
let checked = 0;
for (const page of pages) {
  const html = await readFile(join(root, page), 'utf8');
  assert.doesNotMatch(html, /via\.placeholder\.com/, page + ' has placeholder artwork');

  if (page === 'arcade/tools/index.html') {
    const downloads = html.match(/href=["']\/downloads\/NexusToolboxExtension\.zip["']/g) || [];
    assert.equal(downloads.length, 1, 'show one extension download on the tools page');
  }

  for (const [, url] of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
    if (!url.startsWith('/') || url.startsWith('//') || url.startsWith('/_vercel/')) continue;
    const path = decodeURIComponent(url.split(/[?#]/, 1)[0]);
    const candidate = resolve(root, '.' + path);
    assert.ok(candidate === root || candidate.startsWith(root + sep), 'unsafe local URL: ' + path);
    checked++;
    let info;
    try { info = await stat(candidate); } catch { /* missing */ }
    const target = info?.isDirectory() ? join(candidate, 'index.html') : candidate;
    try {
      if (!(await stat(target)).isFile()) missing.push(page + ' -> ' + path);
    } catch { missing.push(page + ' -> ' + path); }
  }
}

const download = join(root, 'downloads/NexusToolboxExtension.zip');
assert.ok((await stat(download)).size > 0, 'published extension ZIP is missing or empty');
assert.deepEqual(missing, [], 'missing links/assets in published pages');
console.log('PASS ' + pages.length + ' published pages, ' + checked + ' local links, and Chrome extension download');
