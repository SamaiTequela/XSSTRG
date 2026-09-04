import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { adjudicateDebate } from './api/adjudicate.js';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  plugins: [
    react(),
    {
      name: 'api-adjudicate-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/adjudicate' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const parsedBody = JSON.parse(body || '{}');
                const verdict = await adjudicateDebate(parsedBody);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(verdict));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Adjudication failed' }));
              }
            });
            return;
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
