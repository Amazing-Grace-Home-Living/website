import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { deflateRawSync } from 'node:zlib';

// Build from reviewed source, never a stale checked-in ZIP.
const source = resolve('chrome-extension/NexusToolboxExtension');
const output = resolve('dist/downloads/NexusToolboxExtension.zip');
const files = ['manifest.json', 'background.js', 'host-panel.html', 'host-panel.js', 'src/agent-tools.js'];
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const localParts = [], centralParts = [];
let offset = 0, centralLength = 0;
for (const path of files) {
  const filename = Buffer.from(path, 'utf8');
  const raw = await readFile(join(source, path));
  const compressed = deflateRawSync(raw, { level: 9 });
  const crc = crc32(raw);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(raw.length, 22);
  local.writeUInt16LE(filename.length, 26);
  localParts.push(local, filename, compressed);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(raw.length, 24);
  central.writeUInt16LE(filename.length, 28);
  central.writeUInt32LE(offset, 42);
  centralParts.push(central, filename);
  offset += local.length + filename.length + compressed.length;
  centralLength += central.length + filename.length;
}
const footer = Buffer.alloc(22);
footer.writeUInt32LE(0x06054b50, 0);
footer.writeUInt16LE(files.length, 8);
footer.writeUInt16LE(files.length, 10);
footer.writeUInt32LE(centralLength, 12);
footer.writeUInt32LE(offset, 16);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, Buffer.concat([...localParts, ...centralParts, footer]));
console.log('Packaged extension from source: ' + files.length + ' files');
