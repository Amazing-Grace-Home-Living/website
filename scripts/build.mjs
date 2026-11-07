import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

// After copying static files, generate auth.js from template
const authTemplatePath = resolve('public/auth.template.js');
const authOutputPath = resolve('dist/auth.js');
let authContent = await readFile(authTemplatePath, 'utf8');
authContent = authContent
  .replace('__API_KEY__', process.env.FIREBASE_API_KEY)
  .replace('__AUTH_DOMAIN__', process.env.FIREBASE_AUTH_DOMAIN)
  .replace('__PROJECT_ID__', process.env.FIREBASE_PROJECT_ID)
  .replace('__STORAGE_BUCKET__', process.env.FIREBASE_STORAGE_BUCKET)
  .replace('__MESSAGING_SENDER_ID__', process.env.FIREBASE_MESSAGING_SENDER_ID)
  .replace('__APP_ID__', process.env.FIREBASE_APP_ID);
await writeFile(authOutputPath, authContent);
console.log('Generated auth.js from template');
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
await cp('public/authHelper.js', 'dist/authHelper.js');
console.log('Copied authHelper.js');

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
