import { mkdir, cp, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import './sync-property-galleries.mjs';
const output = resolve('dist');
if (dirname(output) !== process.cwd()) throw new Error('Build output must remain inside the project');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of ['index.html', 'src', 'stories', 'audio-library', 'assets', 'listings']) await cp(path, `dist/${path}`, { recursive: true });
console.log('Built static site in dist/');
