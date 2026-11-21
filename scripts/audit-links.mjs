import { readdir, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
const skip = new Set(['node_modules', '.git', 'dist', 'artifacts', 'services', 'scripts', 'public']);
const files = [];
async function walk(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { if (skip.has(entry.name)) continue; const file = join(dir, entry.name); if (entry.isDirectory()) await walk(file); else if (entry.name.endsWith('.html')) files.push(file); } }
async function exists(file) { try { await access(file); return true; } catch { return false; } }
await walk('arcade');
await walk('lms');
await walk('src');
await walk('toolbox');
files.push('index.html');
// These URLs are created from tracked templates by npm run build.
const generatedPaths = new Map([['/auth.js', 'public/auth.template.js']]);
const missing = new Map();
for (const file of files) { const source = await readFile(file, 'utf8'); for (const match of source.matchAll(/(?:href|src)=["']([^"'#?]+)["']/g)) { const raw = match[1]; if (!raw.startsWith('/') || raw.startsWith('//')) continue; if (raw.startsWith('/_vercel/')) continue; let target; try { target = decodeURIComponent(raw); } catch { target = raw; } const local = join('.', target.slice(1)), publicLocal = join('public', target.slice(1)); if (!await exists(local) && !await exists(join(local, 'index.html')) && !await exists(publicLocal) && !await exists(join(publicLocal, 'index.html')) && !(generatedPaths.has(target) && await exists(generatedPaths.get(target)))) { if (!missing.has(target)) missing.set(target, []); missing.get(target).push(file); } } }
for (const [target, sources] of missing) console.log(`${target} <- ${sources.join(', ')}`);
console.log(`HTML files ${files.length}; missing local targets ${missing.size}`);
process.exitCode = missing.size ? 1 : 0;
