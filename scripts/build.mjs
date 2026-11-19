import dotenv from 'dotenv';
import { mkdir, cp, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';

dotenv.config({ path: '.env' });

const output = resolve('dist');
if (dirname(output) !== process.cwd()) throw new Error('Build output must remain inside the project');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const path of ['index.html', 'src', 'arcade', 'code-matrix', 'lms', 'stories', 'audio-library', 'assets', 'listings', 'profile', 'toolbox', 'privacy']) {
  await cp(path, `dist/${path}`, {
    recursive: true,
    filter: source => !basename(source).startsWith('.') && basename(source).toLowerCase() !== 'desktop.ini',
  });
}

// Exclude unverified exterior photos from the public Clearwater build.
// Source assets stay in version control for ownership review; only curated
// gallery images are published. This prevents direct links to suspect images.
const curatedClearwater = new Set(JSON.parse(await readFile('listings/clearwater-gallery.json', 'utf8')));
for (const name of await readdir('dist/assets/Clearwater')) {
  if (/\\.(jpe?g|png|webp)$/i.test(name) && !curatedClearwater.has(name)) {
    await rm(resolve(output, 'assets', 'Clearwater', name));
  }
}

// Keep the canonical profile URL and the original nested route available.
await cp('dist/profile/nicholai', 'dist/nicholai', { recursive: true });
await cp('public/downloads/NexusToolboxExtension.zip', 'dist/nexus-toolbox.zip');

// Generate galleries only inside dist; building must not rewrite tracked source files.
await import('./sync-property-galleries.mjs');

for (const path of ['style.css', 'app.js', 'nexus-infinity.jpg', 'sidebar-extension.zip']) {
  try {
    await cp(`public/${path}`, `dist/${path}`);
  } catch (err) {
    // optional public asset
  }
}

try {
  await cp('public/authHelper.js', 'dist/authHelper.js');
  console.log('Copied authHelper.js');
} catch (err) {}

// After creating dist/, generate auth.js from template if present
try {
  const authTemplatePath = resolve('public/auth.template.js');
  const authOutputPath = resolve('dist/auth.js');
  let authContent = await readFile(authTemplatePath, 'utf8');
  authContent = authContent
    .replace('__API_KEY__', process.env.FIREBASE_API_KEY || '')
    .replace('__AUTH_DOMAIN__', process.env.FIREBASE_AUTH_DOMAIN || '')
    .replace('__PROJECT_ID__', process.env.FIREBASE_PROJECT_ID || '')
    .replace('__STORAGE_BUCKET__', process.env.FIREBASE_STORAGE_BUCKET || '')
    .replace('__MESSAGING_SENDER_ID__', process.env.FIREBASE_MESSAGING_SENDER_ID || '')
    .replace('__APP_ID__', process.env.FIREBASE_APP_ID || '');
  await writeFile(authOutputPath, authContent);
  console.log('Generated auth.js from template');
} catch (err) {}

console.log('Built static site in dist/');

// Vercel analytics should not load on optional Cloud Run or Firebase hosts.
const onVercel = process.env.VERCEL === '1';
async function configureAnalytics(directory) {
  try {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await configureAnalytics(path);
      else if (entry.name.endsWith('.html')) {
        const html = await readFile(path, 'utf8');
        if (!onVercel) {
          // Some source pages include the Vercel script explicitly. Omit it on other hosts.
          const clean = html.replace(/<script\b[^>]*src=["']\/_vercel\/insights\/script\.js["'][^>]*><\/script>/gi, '');
          if (clean !== html) await writeFile(path, clean);
        } else if (!html.includes('/_vercel/insights/script.js')) {
          const tracking = `<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};window.va('beforeSend',function(e){e.url=e.url.split(/[?#]/)[0];return e});</script><script defer src="/_vercel/insights/script.js"></script>`;
          await writeFile(path, html.replace(/<\/head>/i, tracking + '</head>'));
        }
      }
    }
  } catch (err) {}
}
await configureAnalytics(output);
