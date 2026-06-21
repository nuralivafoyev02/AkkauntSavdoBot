import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function apiFileFor(url) {
  const pathname = new URL(url, 'http://localhost').pathname;
  const route = pathname.replace(/^\/api\/?/, '').split('/')[0];
  if (!route || route.startsWith('_')) return null;
  return path.join(rootDir, 'api', `${route}.js`);
}

function localApiPlugin() {
  return {
    name: 'local-vercel-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        const originalUrl = req.originalUrl || req.url || '';
        const file = apiFileFor(originalUrl);
        if (!file) {
          next();
          return;
        }

        try {
          const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
          if (typeof mod.default !== 'function') {
            next();
            return;
          }

          req.url = originalUrl;
          await mod.default(req, res);
        } catch (error) {
          res.statusCode = error?.code === 'ERR_MODULE_NOT_FOUND' ? 404 : 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: error?.message || 'Local API error' }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [localApiPlugin()]
});
