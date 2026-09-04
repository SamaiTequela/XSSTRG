import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import roomHandler from './api/room.js';
import judgeHandler from './api/judge.js';
import adjudicateHandler from './api/adjudicate.js';

function adaptHandler(handler) {
  return async (req, res) => {
    const urlObj = new URL(req.url, 'http://localhost:5173');
    req.query = Object.fromEntries(urlObj.searchParams);

    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    await new Promise((resolve) => req.on('end', resolve));
    try {
      req.body = body ? JSON.parse(body) : {};
    } catch {
      req.body = body;
    }

    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };

    try {
      await handler(req, res);
    } catch (err) {
      console.error('API Error:', err);
      if (!res.writableEnded) {
        res.status(500).json({ error: err.message || 'Internal API error' });
      }
    }
  };
}

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  plugins: [
    react(),
    {
      name: 'api-dev-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const pathname = req.url.split('?')[0];
          if (pathname === '/api/room') {
            return adaptHandler(roomHandler)(req, res);
          }
          if (pathname === '/api/judge') {
            return adaptHandler(judgeHandler)(req, res);
          }
          if (pathname === '/api/adjudicate') {
            return adaptHandler(adjudicateHandler)(req, res);
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 5173,
    host: true
  }
});
