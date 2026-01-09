import { defineConfig, Plugin, PreviewServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { IncomingMessage, ServerResponse } from "http";

// Plugin to expose frontend logs to OpenShift pod logs
function serverLoggerPlugin(): Plugin {
  return {
    name: 'server-logger',
    configurePreviewServer(server: PreviewServer) {
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
