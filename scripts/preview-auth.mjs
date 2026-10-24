#!/usr/bin/env node
/**
 * Minimal Basic Auth gate for the piloto build (`dist/`).
 * Usage (after npm run build):
 *   node --env-file=.env.example scripts/preview-auth.mjs
 * Or export BASIC_AUTH_USER / BASIC_AUTH_PASS yourself.
 *
 * Not a production IdP — demo only. Banner in the UI still says demo data.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const user = process.env.BASIC_AUTH_USER;
const pass = process.env.BASIC_AUTH_PASS;
const port = Number(process.env.PREVIEW_AUTH_PORT || 4174);

if (!user || !pass) {
  console.error(
    '[preview-auth] Set BASIC_AUTH_USER and BASIC_AUTH_PASS (see .env.example).\n' +
      '  Example: node --env-file=.env.example scripts/preview-auth.mjs'
  );
  process.exit(1);
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('[preview-auth] dist/ missing. Run: npm run build');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
  '.woff2': 'font/woff2'
};

function unauthorized(res) {
  res.writeHead(401, {
    'WWW-Authenticate': 'Basic realm="Dashboard FV Piloto"',
    'Content-Type': 'text/plain; charset=utf-8'
  });
  res.end('Authentication required');
}

function checkAuth(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  let decoded;
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return false;
  }
  const i = decoded.indexOf(':');
  if (i < 0) return false;
  const u = decoded.slice(0, i);
  const p = decoded.slice(i + 1);
  return u === user && p === pass;
}

function safeJoin(root, urlPath) {
  const clean = decodeURIComponent((urlPath || '/').split('?')[0]);
  const rel = clean === '/' ? 'index.html' : clean.replace(/^\//, '');
  if (rel.includes('..')) return null;
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(root + path.sep) && abs !== root) return null;
  return abs;
}

/** Also expose /api/data/* from dist (same files) for VITE_DATA_BASE=/api/data builds. */
function resolveRequestPath(urlPath) {
  const pathname = (urlPath || '/').split('?')[0];
  if (pathname.startsWith('/api/data/')) {
    const rel = pathname.slice('/api/data/'.length);
    return safeJoin(DIST, '/' + rel);
  }
  return safeJoin(DIST, pathname);
}

const server = http.createServer((req, res) => {
  if (!checkAuth(req)) {
    unauthorized(res);
    return;
  }

  let abs = resolveRequestPath(req.url);
  if (!abs) {
    res.writeHead(400);
    res.end('Bad path');
    return;
  }

  fs.stat(abs, (err, st) => {
    if (err || !st.isFile()) {
      // SPA-ish fallback for unknown paths → index.html only for non-api
      if (!(req.url || '').startsWith('/api/')) {
        abs = path.join(DIST, 'index.html');
      } else {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
    }
    const ext = path.extname(abs).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(abs).pipe(res);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[preview-auth] http://127.0.0.1:${port}/  (Basic Auth user=${user})`);
  console.log('[preview-auth] Demo gate only — UI still shows “Datos de demostración”.');
});
