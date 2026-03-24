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

import express, { Request, Response } from 'express';
import cors from 'cors';
import { VaultGate, createVaultGate } from './vaultgate.js';
import { ActionRequest } from './types.js';

const PORT = parseInt(process.env.VAULTGATE_PORT ?? '18792');
const HOST = process.env.VAULTGATE_HOST ?? 'localhost';

// Create VaultGate instance
const vaultgate = createVaultGate();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * POST /action
 * Execute an action through VaultGate
 * 
 * Body: { service, action, target, body? }
 */
app.post('/action', async (req: Request, res: Response) => {
  const actionRequest = req.body as ActionRequest;

  // Validate request
  if (!actionRequest.service || !actionRequest.action || !actionRequest.target) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: service, action, target',
    });
  }

  try {
    const result = await vaultgate.executeAction(actionRequest);
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
  const status = vaultgate.getStatus();
  return res.json(status);
});

/**
 * POST /revoke
 * Revoke all active tokens
 */
app.post('/revoke', async (_req: Request, res: Response) => {
  try {
    const count = await vaultgate.revokeAll();
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

// Start server
app.listen(PORT, HOST, () => {
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
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down VaultGate...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nShutting down VaultGate...');
  process.exit(0);
});
