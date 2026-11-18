import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, join } from 'node:path';
import { inflateRawSync } from 'node:zlib';

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
const zip = await readFile(download);
assert.ok(zip.length > 100 && zip.subarray(0, 2).toString() === 'PK', 'extension download is not a ZIP');
const names = [];
const entryOffset = new Map();
for (let offset = 0; offset + 46 <= zip.length; offset++) {
  if (zip.readUInt32LE(offset) !== 0x02014b50) continue;
  const nameLength = zip.readUInt16LE(offset + 28);
  const extraLength = zip.readUInt16LE(offset + 30);
  const commentLength = zip.readUInt16LE(offset + 32);
  const name = zip.toString('utf8', offset + 46, offset + 46 + nameLength);
  names.push(name);
  entryOffset.set(name, zip.readUInt32LE(offset + 42));
  offset += 45 + nameLength + extraLength + commentLength;
}
assert.ok(names.includes('manifest.json'), 'extension ZIP has no root manifest');
assert.ok(names.includes('src/agent-tools.js'), 'extension ZIP must contain portable src/agent-tools.js');
assert.ok(names.includes('host-panel.js'), 'extension ZIP must include external popup logic');
assert.ok(names.every(name => !name.includes(String.fromCharCode(92))), 'extension ZIP has non-portable archive paths');
const manifestOffset = entryOffset.get('manifest.json');
const localNameLength = zip.readUInt16LE(manifestOffset + 26);
const localExtraLength = zip.readUInt16LE(manifestOffset + 28);
const compressedSize = zip.readUInt32LE(manifestOffset + 18);
const compression = zip.readUInt16LE(manifestOffset + 8);
assert.equal(compression, 8, 'extension ZIP must use deflate');
const start = manifestOffset + 30 + localNameLength + localExtraLength;
const manifest = JSON.parse(inflateRawSync(zip.subarray(start, start + compressedSize)).toString('utf8'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.action?.default_popup, 'host-panel.html');
assert.equal(manifest.background?.type, 'module');
assert.ok(!manifest.host_permissions, 'extension must not request unnecessary API host access');
assert.ok(!manifest.permissions?.includes('storage'), 'extension must not store plaintext secrets');
assert.deepEqual(missing, [], 'missing links/assets in published pages');
console.log('PASS ' + pages.length + ' published pages, ' + checked + ' local links, and Chrome extension download');
