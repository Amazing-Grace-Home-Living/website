import { readFile, writeFile } from 'node:fs/promises';
const source=await readFile(new URL('../provider-guides.mjs',import.meta.url),'utf8');
await writeFile(new URL('../assets/Tools/provider-guides.js',import.meta.url),'// Generated from provider-guides.mjs by scripts/sync-provider-guides.mjs. No secrets.\n'+source);
