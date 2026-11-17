import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import type { ViteDevServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const portFlagIdx = process.argv.indexOf('--port');
  if (portFlagIdx !== -1 && process.argv[portFlagIdx + 1]) {
    const parsed = Number(process.argv[portFlagIdx + 1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const npmPort = Number(process.env.npm_config_port);
  if (Number.isFinite(npmPort) && npmPort > 0) return npmPort;

  for (const arg of process.argv.slice(2)) {
    if (/^\d{2,5}$/.test(arg)) {
      const parsed = Number(arg);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }

  const envPort = Number(process.env.PORT);
  return Number.isFinite(envPort) && envPort > 0 ? envPort : 3000;
}

const PORT = resolvePort();
const rootApp = express();
const httpServer = http.createServer(rootApp);

async function startServer() {
  // Fast immediate health endpoint so startup probes succeed in <300ms
  rootApp.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      store: 'Ourata Semijoias',
      whatsapp: '5519988064749',
      runtime: 'node-express',
      database: 'supabase-postgresql',
      timestamp: new Date().toISOString(),
    });
  });

  // Start loading full API app immediately in parallel with Vite / static serving
  let apiAppInstance: express.Express | null = null;
  const apiAppPromise = import('./src/server/app.ts')
    .then(({ createApiApp }) => createApiApp())
    .then((created) => {
      apiAppInstance = created;
      return created;
    });

  rootApp.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
      next();
      return;
    }
    if (apiAppInstance) {
      apiAppInstance(req, res, next);
      return;
    }
    apiAppPromise
      .then((apiApp) => apiApp(req, res, next))
      .catch(next);
  });

  if (process.env.NODE_ENV !== 'production') {
    let viteInstance: ViteDevServer | null = null;
    const disableHmr = process.env.DISABLE_HMR === 'true';

    const viteReadyPromise = import('vite')
      .then(({ createServer: createViteServer }) =>
        createViteServer({
          server: {
            middlewareMode: true,
            hmr: disableHmr ? false : true,
            ws: disableHmr ? false : { server: httpServer },
          },
          appType: 'spa',
        })
      )
      .then((vite) => {
        viteInstance = vite;
        return vite;
      });

    rootApp.use((req, res, next) => {
      if (viteInstance) {
        viteInstance.middlewares(req, res, next);
        return;
      }
      viteReadyPromise
        .then((vite) => {
          vite.middlewares(req, res, next);
        })
        .catch(next);
    });

    await new Promise<void>((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`✨ Ourata Semijoias server running on http://0.0.0.0:${PORT}`);
        resolve();
      });
    });

    await Promise.all([apiAppPromise, viteReadyPromise]);
  } else {
    const distPath = path.join(__dirname, 'dist');
    rootApp.use(express.static(distPath));
    rootApp.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    await new Promise<void>((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`✨ Ourata Semijoias server running on http://0.0.0.0:${PORT}`);
        resolve();
      });
    });

    await apiAppPromise;
  }
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
