import { mkdir, cp } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const path of ['index.html', 'src', 'stories', 'audio-library', 'assets']) await cp(path, `dist/${path}`, { recursive: true });
console.log('Built static site in dist/');
