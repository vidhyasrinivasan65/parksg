import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import carparksHandler from './api/carparks.js';
import geocodeHandler from './api/geocode.js';
import routesHandler from './api/routes.js';
import insightsHandler from './api/insights.js';
import healthHandler from './api/health.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware
  app.use(express.json());

  // API routes FIRST
  app.get('/api/carparks', async (req, res) => {
    try {
      await carparksHandler(req, res);
    } catch (err) {
      console.error('API Error in /api/carparks:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  });

  app.get('/api/geocode', async (req, res) => {
    try {
      await geocodeHandler(req, res);
    } catch (err) {
      console.error('API Error in /api/geocode:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  });

  app.get('/api/routes', async (req, res) => {
    try {
      await routesHandler(req, res);
    } catch (err) {
      console.error('API Error in /api/routes:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  });

  app.get('/api/insights', async (req, res) => {
    try {
      await insightsHandler(req, res);
    } catch (err) {
      console.error('API Error in /api/insights:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  });

  app.get('/api/health', async (req, res) => {
    try {
      await healthHandler(req, res);
    } catch (err) {
      console.error('API Error in /api/health:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
