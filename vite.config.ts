import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'http';

// Local development plugin to emulate /.netlify/functions/translate during `npm run dev`
function netlifyFunctionsDevPlugin(envApiKey: string | undefined) {
  return {
    name: 'netlify-functions-dev',
    configureServer(server: any) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url && req.url.startsWith('/.netlify/functions/translate')) {
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.end();
            return;
          }

          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method Not Allowed', code: 'METHOD_NOT_ALLOWED' }));
            return;
          }

          // Buffer request body
          const chunks: any[] = [];
          req.on('data', chunk => chunks.push(chunk));
          req.on('end', async () => {
            try {
              const bodyStr = Buffer.concat(chunks).toString('utf-8');
              const body = JSON.parse(bodyStr || '{}');

              // Delegate to serverless function handler
              // We pass process.env with loaded envApiKey
              process.env.GOOGLE_TRANSLATION_API_KEY = envApiKey || process.env.GOOGLE_TRANSLATION_API_KEY;
              
              // Load the netlify function
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const translateHandler = (await import('./netlify/functions/translate.js' as any)).handler;
              
              const fakeEvent = {
                httpMethod: 'POST',
                body: bodyStr,
                headers: req.headers
              };

              const result = await translateHandler(fakeEvent, {});
              
              res.statusCode = result.statusCode || 200;
              if (result.headers) {
                for (const [key, value] of Object.entries(result.headers)) {
                  res.setHeader(key, value as string);
                }
              }
              res.end(result.body);
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: 'Local dev serverless function handler failed',
                details: err.message || String(err)
              }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.GOOGLE_TRANSLATION_API_KEY || process.env.GOOGLE_TRANSLATION_API_KEY;

  return {
    plugins: [
      react(),
      netlifyFunctionsDevPlugin(apiKey)
    ],
    server: {
      port: 5173,
      host: true,
    }
  };
});

