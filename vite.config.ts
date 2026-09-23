import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import dotenv from 'dotenv';

dotenv.config();

function apiMiddlewarePlugin(): Plugin {
  return {
    name: 'api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (url.startsWith('/api/carparks')) {
          try {
            const { default: handler } = await import('./api/carparks.js');
            return await (handler as (q: unknown, s: unknown) => Promise<unknown>)(req, res);
          } catch (err: unknown) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: (err as Error)?.message || 'Server error' }));
          }
        }
        if (url.startsWith('/api/geocode')) {
          try {
            const { default: handler } = await import('./api/geocode.js');
            return await (handler as (q: unknown, s: unknown) => Promise<unknown>)(req, res);
          } catch (err: unknown) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: (err as Error)?.message || 'Server error' }));
          }
        }
        if (url.startsWith('/api/routes')) {
          try {
            const { default: handler } = await import('./api/routes.js');
            return await (handler as (q: unknown, s: unknown) => Promise<unknown>)(req, res);
          } catch (err: unknown) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: (err as Error)?.message || 'Server error' }));
          }
        }
        if (url.startsWith('/api/insights')) {
          try {
            const { default: handler } = await import('./api/insights.js');
            return await (handler as (q: unknown, s: unknown) => Promise<unknown>)(req, res);
          } catch (err: unknown) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: (err as Error)?.message || 'Server error' }));
          }
        }
        if (url.startsWith('/api/health')) {
          try {
            const { default: handler } = await import('./api/health.js');
            return await (handler as (q: unknown, s: unknown) => Promise<unknown>)(req, res);
          } catch (err: unknown) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: (err as Error)?.message || 'Server error' }));
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiMiddlewarePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
