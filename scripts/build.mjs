import './sync-provider-guides.mjs';
import { mkdir, cp, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import './sync-property-galleries.mjs';
const output = resolve('dist');
if (dirname(output) !== process.cwd()) throw new Error('Build output must remain inside the project');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of ['index.html', 'src', 'arcade', 'lms', 'stories', 'audio-library', 'assets', 'listings', 'nicholai', 'profile', 'toolbox', 'privacy']) {
  await cp(path, `dist/${path}`, {
    recursive: true,
    filter: source => !basename(source).startsWith('.') && basename(source).toLowerCase() !== 'desktop.ini',
  });
}
for (const path of ['style.css', 'app.js', 'nexus-infinity.jpg', 'sidebar-extension.zip']) await cp(`public/${path}`, `dist/${path}`);
console.log('Built static site in dist/');

// Add privacy-conscious page views to every published HTML page.
async function addAnalytics(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await addAnalytics(path);
    else if (entry.name.endsWith('.html')) {
      const html = await readFile(path, 'utf8');
      if (!html.includes('/_vercel/insights/script.js')) {
        const tracking = `<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};window.va('beforeSend',function(e){e.url=e.url.split(/[?#]/)[0];return e});</script><script defer src="/_vercel/insights/script.js"></script>`;
        await writeFile(path, html.replace(/<\/head>/i, tracking + '</head>'));
      }
    }
  }
}
await addAnalytics(output);
