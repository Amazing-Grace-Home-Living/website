// Catch merge conflicts and malformed npm manifests before publishing.
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';

const extensions = new Set(['.html', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.css', '.json', '.md', '.yml', '.yaml', '.toml', '.sh', '.ps1']);
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  .split('\0').filter(Boolean);
const problems = [];
let inspected = 0;
let manifests = 0;

for (const file of files) {
  if (!extensions.has(extname(file).toLowerCase())) continue;
  let source;
  try {
    source = await readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') continue;
    throw error;
  }
  inspected++;
  if (/^(?:<{7}|>{7})(?:\s|$)/m.test(source)) {
    problems.push(`${file}: unresolved Git merge-conflict marker`);
  }
  if (basename(file) === 'package.json' || basename(file) === 'package-lock.json') {
    manifests++;
    try {
      JSON.parse(source);
    } catch (error) {
      problems.push(`${file}: invalid JSON (${error.message})`);
    }
  }
}

for (const problem of problems) console.error(`ERROR ${problem}`);
console.log(`Repository integrity: inspected ${inspected} text files and ${manifests} npm manifests; ${problems.length} issue(s).`);
if (problems.length) process.exitCode = 1;
