import { defineConfig, Plugin, PreviewServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { IncomingMessage, ServerResponse } from "http";

// LDAP API backend URL for CORS proxy
const LDAP_API_URL = 'https://ldap-api.apps.prod-ocp4.corp.cableone.net';

// Plugin to expose frontend logs and proxy API requests to avoid CORS
function serverLoggerPlugin(): Plugin {
  return {
    name: 'server-logger',
    configurePreviewServer(server: PreviewServer) {
      // Proxy for /api/ldap/* -> ldap-api backend (CORS fix)
      server.middlewares.use('/api/ldap', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const targetUrl = `${LDAP_API_URL}${req.url || ''}`;
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [PROXY] ${req.method} ${req.url} -> ${targetUrl}`);

        try {
          // Collect request body for POST requests
          let requestBody: string | undefined;
          if (req.method === 'POST' || req.method === 'PUT') {
            requestBody = await new Promise<string>((resolve) => {
              let body = '';
              req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
              req.on('end', () => resolve(body));
            });
          }

          const response = await fetch(targetUrl, {
            method: req.method || 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: requestBody,
          });

          const data = await response.text();
          console.log(`[${timestamp}] [PROXY] Response: ${response.status} (${data.length} bytes)`);

          // Forward response headers and body
          res.writeHead(response.status, {
            'Content-Type': response.headers.get('Content-Type') || 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(data);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown proxy error';
          console.error(`[${timestamp}] [PROXY] Error: ${errMsg}`);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Proxy error', 
            message: errMsg,
            target: targetUrl 
          }));
        }
      });

      // Frontend logging endpoint
      server.middlewares.use('/api/log', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const log = JSON.parse(body) as { level?: string; message?: string; data?: unknown };
              const timestamp = new Date().toISOString();
              const level = (log.level || 'info').toUpperCase();
              const data = log.data ? JSON.stringify(log.data) : '';
              console.log(`[${timestamp}] [${level}] ${log.message || ''} ${data}`);
            } catch {
              console.log(`[LOG] ${body}`);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          });
        } else {
          next();
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  preview: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: [
      "viavi-meter-provisioning.apps.prod-ocp4.corp.cableone.net",
    ],
  },
  plugins: [
    react(),
    serverLoggerPlugin(),
    mode === 'development' &&
      (await import("lovable-tagger")).componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true
  },
}));
