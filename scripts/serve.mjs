// Minimal, read-only static server for optional Cloud Run deployments.
// The private Grace Remote companion must never be exposed by this service.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, realpath } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';

const root = resolve(process.argv[2] || 'dist');
const realRoot = await realpath(root);
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
  '.mid': 'audio/midi',
  '.woff2': 'font/woff2',
  '.zip': 'application/zip'
};

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  if (request.url === '/healthz') {
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('ok');
    return;
  }
  try {
    const url = new URL(request.url || '/', 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.includes('\0') || pathname.split('/').includes('..')) {
      response.writeHead(400).end('Bad request');
      return;
    }
    const candidate = resolve(root, '.' + pathname);
    if (candidate !== root && !candidate.startsWith(root + sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    let target = candidate;
    let info = await stat(target);
    if (info.isDirectory()) {
      target = join(target, 'index.html');
      info = await stat(target);
    }
    if (!info.isFile()) throw new Error('Not a file');
    // A symlink inside dist must never expose files elsewhere in the container.
    const realTarget = await realpath(target);
    if (realTarget !== realRoot && !realTarget.startsWith(realRoot + sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    response.writeHead(200, {
      'Content-Type': types[extname(target).toLowerCase()] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
    if (request.method === 'HEAD') return response.end();
    const stream = createReadStream(target);
    stream.on('error', () => response.destroy());
    stream.pipe(response);
  } catch (error) {
    response.writeHead(error?.code === 'ENOENT' || error?.code === 'ENOTDIR' ? 404 : 500).end('Not found');
  }
});

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
server.listen(port, host, () => console.log(`Static website on http://${host}:${port}`));
