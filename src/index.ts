/**
 * VaultGate HTTP Server
 * Listens on port 18792 for action requests from CLI or AI agents
 *
 * Endpoints:
 *   POST /action    - Execute an action (triggers CIBA for writes)
 *   GET  /status    - Get vault status and active tokens
 *   POST /revoke    - Revoke all active tokens
 *   GET  /health    - Health check
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { VaultGate, createVaultGate } from './vaultgate.js';
import { ActionRequest } from './types.js';

const PORT = parseInt(process.env.VAULTGATE_PORT ?? '18792');
const HOST = process.env.VAULTGATE_HOST ?? 'localhost';

// Determine demo mode: true only if explicitly set to 'true' or no Auth0 credentials present
// Note: .env is loaded via Vitest config (vitest.config.ts setupFiles) or dotenv CLI flag
// Create VaultGate instance on each call so DEMO_MODE is re-evaluated per-request
// This is important for tests where the env vars may change between requests
function getVaultGate(): VaultGate {
  // Demo mode: true if explicitly set, OR if no Auth0 credentials are configured
  // (dotenv/config sets AUTH0_* vars at import time, so we only check VAULTGATE_DEMO_MODE)
  const DEMO_MODE = process.env.VAULTGATE_DEMO_MODE === 'true' ||
    (!process.env.AUTH0_DOMAIN && !process.env.AUTH0_CLIENT_ID);
  return createVaultGate({ demoMode: DEMO_MODE });
}

// Create Express app
export const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging (suppressed when VAULTGATE_QUIET=1 so demo scripts can capture clean JSON)
if (!process.env.VAULTGATE_QUIET) {
  app.use((req: Request, _res: Response, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

/**
 * POST /action
 * Execute an action through VaultGate
 *
 * Body: { service, action, target, body? }
 */
const VALID_SERVICES = ['slack', 'google', 'github', 'email'] as const;
const VALID_ACTIONS = ['read', 'write', 'delete', 'admin'] as const;

app.post('/action', async (req: Request, res: Response) => {
  const actionRequest = req.body as ActionRequest;

  // Validate required fields first
  if (!actionRequest.service || !actionRequest.action || !actionRequest.target) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: service, action, target',
    });
  }

  // HTTP-level validation — reject unknown services/actions with 400
  if (!VALID_SERVICES.includes(actionRequest.service as typeof VALID_SERVICES[number])) {
    return res.status(400).json({
      success: false,
      error: `Unknown service: '${actionRequest.service}'. Valid services: ${VALID_SERVICES.join(', ')}`,
    });
  }

  if (!VALID_ACTIONS.includes(actionRequest.action as typeof VALID_ACTIONS[number])) {
    return res.status(400).json({
      success: false,
      error: `Unknown action: '${actionRequest.action}'. Valid actions: ${VALID_ACTIONS.join(', ')}`,
    });
  }

  try {
    const result = await getVaultGate().executeAction(actionRequest);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /status
 * Get vault status and active tokens
 */
app.get('/status', (_req: Request, res: Response) => {
  const status = getVaultGate().getStatus();
  return res.json(status);
});

/**
 * POST /revoke
 * Revoke all active tokens
 */
app.post('/revoke', async (_req: Request, res: Response) => {
  try {
    const count = await getVaultGate().revokeAll();
    return res.json({ success: true, revokedCount: count });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'healthy',
    service: 'VaultGate',
    version: '1.0.0',
    timestamp: Date.now(),
  });
});

/**
 * GET /
 * Root endpoint — show info
 */
app.get('/', (_req: Request, res: Response) => {
  return res.json({
    name: 'VaultGate',
    description: 'Secure gateway for Auth0 Token Vault',
    version: '1.0.0',
    endpoints: {
      'POST /action': 'Execute an action (service, action, target, body)',
      'GET  /status': 'Get vault status and active tokens',
      'POST /revoke': 'Revoke all active tokens',
      'GET  /health': 'Health check',
    },
  });
});

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ success: false, error: err.message });
});

// Only start server if this is the main module
let server: ReturnType<typeof app.listen> | null = null;

if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  server = app.listen(PORT, HOST, () => {
    if (!process.env.VAULTGATE_QUIET) {
      console.log('\n╔══════════════════════════════════════════════════════════════════╗');
      console.log('║                                                                  ║');
      console.log('║   🔐 VAULTGATE — Auth0 Token Vault Gateway                       ║');
      console.log('║                                                                  ║');
      console.log('╠══════════════════════════════════════════════════════════════════╣');
      console.log('║                                                                  ║');
      console.log(`║   HTTP Server running on http://${HOST}:${PORT}                   ║`);
      console.log('║                                                                  ║');
      console.log('║   Endpoints:                                                     ║');
      console.log('║     POST /action  — Execute action (triggers CIBA for writes)   ║');
      console.log('║     GET  /status  — Vault status + active tokens                ║');
      console.log('║     POST /revoke   — Revoke all tokens                           ║');
      console.log('║     GET  /health   — Health check                                ║');
      console.log('║                                                                  ║');
      console.log('╚══════════════════════════════════════════════════════════════════╝\n');
      console.log('Waiting for requests...\n');
    }
  });
}

// Graceful shutdown
export const shutdown = () => {
  if (server) {
    server.close();
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { PORT, HOST };
