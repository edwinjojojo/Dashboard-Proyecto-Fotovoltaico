import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

/** Map /api/data/* → same static JSON/GeoJSON (piloto path toward a real API). */
function resolveApiDataPath(urlPath) {
  const prefix = '/api/data/';
  if (!urlPath.startsWith(prefix)) return null;
  const rel = decodeURIComponent(urlPath.slice(prefix.length).split('?')[0]);
  if (!rel || rel.includes('..')) return null;
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep) && abs !== ROOT) return null;
  return abs;
}

function sendFile(absPath, res, next) {
  fs.stat(absPath, (err, st) => {
    if (err || !st.isFile()) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const ext = path.extname(absPath).toLowerCase();
    const types = {
      '.json': 'application/json; charset=utf-8',
      '.geojson': 'application/geo+json; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg'
    };
    res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
    fs.createReadStream(absPath).pipe(res);
  });
}

function mockDataApiPlugin() {
  const middleware = (req, res, next) => {
    const url = req.url || '';
    const abs = resolveApiDataPath(url.split('?')[0]);
    if (!abs) return next();
    sendFile(abs, res, next);
  };
  return {
    name: 'mock-data-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    }
  };
}

const STATIC_DIRS = ['geojson', 'vendor', 'svg', 'png'];
const STATIC_FILES = ['programacion-semanal.json'];

function copyStaticAssetsPlugin() {
  return {
    name: 'copy-static-assets',
    closeBundle() {
      const outDir = path.resolve(ROOT, 'dist');
      for (const dir of STATIC_DIRS) {
        const src = path.join(ROOT, dir);
        if (fs.existsSync(src)) {
          fs.cpSync(src, path.join(outDir, dir), { recursive: true });
        }
      }
      for (const file of STATIC_FILES) {
        const src = path.join(ROOT, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(outDir, file));
        }
      }
      // GitHub Pages: skip Jekyll so vendor/_… and dotted paths are served.
      fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
    }
  };
}

export default defineConfig({
  root: ROOT,
  // Project GitHub Pages: https://edwinjojojo.github.io/Dashboard-Proyecto-Fotovoltaico/
  base: '/Dashboard-Proyecto-Fotovoltaico/',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true
  },
  server: {
    port: 5173,
    host: '127.0.0.1'
  },
  preview: {
    port: 4173,
    host: '127.0.0.1'
  },
  plugins: [mockDataApiPlugin(), copyStaticAssetsPlugin()]
});
