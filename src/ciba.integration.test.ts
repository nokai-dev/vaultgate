/**
 * CLI Tests — verify CLI commands against live server
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from './index.js';
import { _resetActiveTokens } from './tokenVault.js';
import http from 'http';

let server: ReturnType<typeof app.listen> | null = null;
const PORT = 0; // let OS pick free port

beforeAll(async () => {
  _resetActiveTokens();
  return new Promise<void>((resolve) => {
    server = app.listen(PORT, 'localhost', () => {
      resolve();
    });
  });
});

afterAll(() => {
  if (server) server.close();
});

function getBaseUrl() {
  const addr = server!.address();
  if (!addr || typeof addr === 'string') throw new Error('No server address');
  return `http://localhost:${addr.port}`;
}

describe('CIBA flow integration', () => {
  it('write action triggers CIBA and returns approved token', async () => {
    const base = getBaseUrl();
    const res = await request(app)
      .post('/action')
      .send({ service: 'slack', action: 'write', target: '#general', body: 'CIBA test' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tokenState).toBeDefined();
    expect(res.body.tokenState!.scope).toBe('slack.messages.write');
    expect(res.body.tokenState!.status).toBe('active');
    expect(res.body.tokenState!.tokenId).toMatch(/^tok_/);
  });

  it('read action is silent (no CIBA) and returns token quickly', async () => {
    const res = await request(app)
      .post('/action')
      .send({ service: 'slack', action: 'read', target: '#engineering' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tokenState).toBeDefined();
    expect(res.body.tokenState!.scope).toBe('slack.messages.read');
    expect(res.body.result).toBeDefined();
  });

  it('delete action triggers CIBA', async () => {
    const res = await request(app)
      .post('/action')
      .send({ service: 'github', action: 'delete', target: 'old-repo', body: 'Delete this' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tokenState).toBeDefined();
    expect(res.body.tokenState!.scope).toBe('github.repo.delete');
  });

  it('admin action triggers CIBA', async () => {
    const res = await request(app)
      .post('/action')
      .send({ service: 'email', action: 'admin', target: 'admin panel' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tokenState).toBeDefined();
  });

  it('github read is silent and returns repo.read scope', async () => {
    const res = await request(app)
      .post('/action')
      .send({ service: 'github', action: 'read', target: 'nokai-dev/vaultgate' });

    expect(res.status).toBe(200);
    expect(res.body.tokenState!.scope).toBe('github.repo.read');
  });

  it('google write triggers CIBA with gmail.send scope', async () => {
    const res = await request(app)
      .post('/action')
      .send({ service: 'google', action: 'write', target: 'inbox', body: 'Test email' });

    expect(res.status).toBe(200);
    expect(res.body.tokenState!.scope).toBe('google.gmail.send');
  });

  it('email read returns email.read scope', async () => {
    const res = await request(app)
      .post('/action')
      .send({ service: 'email', action: 'read', target: 'inbox' });

    expect(res.status).toBe(200);
    expect(res.body.tokenState!.scope).toBe('email.read');
  });

  it('action returns unique requestId per call', async () => {
    const r1 = await request(app).post('/action').send({ service: 'slack', action: 'read', target: '#a' });
    const r2 = await request(app).post('/action').send({ service: 'slack', action: 'read', target: '#b' });
    expect(r1.body.requestId).not.toBe(r2.body.requestId);
  });

  it('health check does not require auth', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('status endpoint returns vaultConnected false in demo mode', async () => {
    const res = await request(app).get('/status');
    expect(res.status).toBe(200);
    expect(res.body.vaultConnected).toBe(false);
    expect(res.body.totalActive).toBeGreaterThanOrEqual(0);
  });

  it('revoke endpoint returns success and count', async () => {
    const res = await request(app).post('/revoke');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.revokedCount).toBe('number');
  });

  it('action with missing service returns 400', async () => {
    const res = await request(app)
      .post('/action')
      .send({ action: 'read', target: '#general' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing required fields');
  });

  it('action with missing action returns 400', async () => {
    const res = await request(app)
      .post('/action')
      .send({ service: 'slack', target: '#general' });
    expect(res.status).toBe(400);
  });

  it('action with missing target returns 400', async () => {
    const res = await request(app)
      .post('/action')
      .send({ service: 'slack', action: 'read' });
    expect(res.status).toBe(400);
  });
});
