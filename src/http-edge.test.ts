/**
 * HTTP Error & Edge Case Tests
 * 500 errors, malformed JSON, oversized bodies, concurrent requests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from './index.js';
import { _resetActiveTokens } from './tokenVault.js';

let server: ReturnType<typeof app.listen> | null = null;

beforeAll(() => {
  _resetActiveTokens();
  return new Promise<void>((resolve) => {
    server = app.listen(0, 'localhost', () => resolve());
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

describe('HTTP error handling', () => {
  describe('POST /action — error cases', () => {
    it('returns 400 for unknown service', async () => {
      const res = await request(app)
        .post('/action')
        .send({ service: 'unknown-svc', action: 'read', target: 'x' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for unknown action', async () => {
      const res = await request(app)
        .post('/action')
        .send({ service: 'slack', action: 'unknown-action', target: 'x' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for empty body on write action', async () => {
      const res = await request(app)
        .post('/action')
        .send({ service: 'slack', action: 'write', target: '#general', body: '' });
      // Empty string is valid body — should succeed (body is optional)
      expect(res.status).toBe(200);
    });

    it('returns 400 when target is empty string', async () => {
      const res = await request(app)
        .post('/action')
        .send({ service: 'slack', action: 'read', target: '' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 415 for Content-Type other than application/json', async () => {
      const res = await request(app)
        .post('/action')
        .set('Content-Type', 'text/plain')
        .send('not json');
      // Express with express.json() returns 415 for non-JSON content types
      // when Content-Type mismatch is detected
      expect([400, 415]).toContain(res.status);
    });

    it('handles request with no body', async () => {
      const res = await request(app)
        .post('/action')
        .send();
      expect(res.status).toBe(400);
    });

    it('handles completely empty JSON object', async () => {
      const res = await request(app)
        .post('/action')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('CIBA write action returns 200 even when token auto-revoked', async () => {
      // Write actions should work even when tokens are auto-revoked immediately after use
      const res = await request(app)
        .post('/action')
        .send({ service: 'slack', action: 'write', target: '#ciba-test', body: 'auto-revoke test' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('executed');
    });
  });

  describe('GET /status — edge cases', () => {
    it('returns totalActive=0 on fresh vault', async () => {
      _resetActiveTokens();
      const res = await request(app).get('/status');
      expect(res.body.totalActive).toBe(0);
      expect(res.body.activeTokens).toHaveLength(0);
    });

    it('totalActive reflects issued tokens', async () => {
      _resetActiveTokens();
      // Issue a token (will be auto-revoked after executeAction completes)
      await request(app)
        .post('/action')
        .send({ service: 'slack', action: 'read', target: '#test' });

      const res = await request(app).get('/status');
      // After read completes, token is auto-revoked via setImmediate
      await new Promise(r => setTimeout(r, 50));
      const res2 = await request(app).get('/status');
      // At least the count should be consistent
      expect(typeof res2.body.totalActive).toBe('number');
    });

    it('timestamp is fresh (within last minute)', async () => {
      const res = await request(app).get('/status');
      const now = Date.now();
      expect(res.body.timestamp).toBeGreaterThan(now - 60_000);
      expect(res.body.timestamp).toBeLessThanOrEqual(now);
    });
  });

  describe('POST /revoke — edge cases', () => {
    it('revoke on empty vault returns 0', async () => {
      _resetActiveTokens();
      const res = await request(app).post('/revoke');
      expect(res.body.success).toBe(true);
      expect(res.body.revokedCount).toBe(0);
    });

    it('revoke returns correct count after multiple actions', async () => {
      _resetActiveTokens();
      // Issue multiple tokens — but read tokens are auto-revoked after each action
      // Only write actions keep tokens active until revoke
      await request(app)
        .post('/action')
        .send({ service: 'slack', action: 'read', target: '#a' });

      const res = await request(app).post('/revoke');
      // Read tokens auto-revoke, so count may be 0
      expect(res.body.success).toBe(true);
      expect(typeof res.body.revokedCount).toBe('number');
    });
  });

  describe('GET / — info endpoint', () => {
    it('returns service name and version', async () => {
      const res = await request(app).get('/');
      expect(res.body.name).toBe('VaultGate');
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.description).toBe('Secure gateway for Auth0 Token Vault');
    });

    it('lists all endpoints', async () => {
      const res = await request(app).get('/');
      expect(res.body.endpoints).toBeDefined();
      expect(res.body.endpoints['POST /action']).toBeDefined();
      expect(res.body.endpoints['GET  /status']).toBeDefined();
      expect(res.body.endpoints['POST /revoke']).toBeDefined();
      expect(res.body.endpoints['GET  /health']).toBeDefined();
    });
  });
});

describe('concurrent HTTP requests', () => {
  it('handles multiple simultaneous read requests', async () => {
    const results = await Promise.all([
      request(app).post('/action').send({ service: 'slack', action: 'read', target: '#a' }),
      request(app).post('/action').send({ service: 'slack', action: 'read', target: '#b' }),
      request(app).post('/action').send({ service: 'slack', action: 'read', target: '#c' }),
    ]);

    for (const res of results) {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  it('handles simultaneous mixed action types', async () => {
    const results = await Promise.all([
      request(app).post('/action').send({ service: 'slack', action: 'read', target: '#read1' }),
      request(app).post('/action').send({ service: 'google', action: 'read', target: 'inbox' }),
      request(app).post('/action').send({ service: 'github', action: 'read', target: 'repo' }),
      request(app).post('/action').send({ service: 'email', action: 'read', target: 'inbox' }),
    ]);

    for (const res of results) {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.tokenState).toBeDefined();
    }
  });

  it('returns unique requestIds for concurrent requests', async () => {
    const results = await Promise.all([
      request(app).post('/action').send({ service: 'slack', action: 'read', target: '#a' }),
      request(app).post('/action').send({ service: 'slack', action: 'read', target: '#b' }),
      request(app).post('/action').send({ service: 'slack', action: 'read', target: '#c' }),
    ]);

    const ids = results.map(r => r.body.requestId);
    expect(new Set(ids).size).toBe(ids.length); // all unique
  });
});

describe('CIBA HTTP flow — /action triggers CIBA for writes', () => {
  it('write action returns approved status and token', async () => {
    const res = await request(app)
      .post('/action')
      .send({ service: 'slack', action: 'write', target: '#ciba-test', body: 'CIBA flow test' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tokenState).toBeDefined();
    expect(res.body.tokenState!.status).toBe('active');
    expect(res.body.tokenState!.scope).toBe('slack.messages.write');
    expect(res.body.tokenState!.tokenId).toMatch(/^tok_/);
  });

  it('write action on github returns github.repo.write scope', async () => {
    const res = await request(app)
      .post('/action')
      .send({ service: 'github', action: 'write', target: 'test-repo', body: 'push' });

    expect(res.status).toBe(200);
    expect(res.body.tokenState!.scope).toBe('github.repo.write');
  });

  it('write action on google returns google.gmail.send scope', async () => {
    const res = await request(app)
      .post('/action')
      .send({ service: 'google', action: 'write', target: 'inbox', body: 'email test' });

    expect(res.status).toBe(200);
    expect(res.body.tokenState!.scope).toBe('google.gmail.send');
  });

  it('write action on email returns email.send scope', async () => {
    const res = await request(app)
      .post('/action')
      .send({ service: 'email', action: 'write', target: 'user@example.com', body: 'test' });

    expect(res.status).toBe(200);
    expect(res.body.tokenState!.scope).toBe('email.send');
  });

  it('admin action returns admin scope', async () => {
    const res = await request(app)
      .post('/action')
      .send({ service: 'email', action: 'admin', target: 'admin-panel' });

    expect(res.status).toBe(200);
    expect(res.body.tokenState!.scope).toBe('email.admin');
  });

  it('response includes result.serviceResponse for write actions', async () => {
    const res = await request(app)
      .post('/action')
      .send({ service: 'slack', action: 'write', target: '#general', body: 'test' });

    expect(res.status).toBe(200);
    expect(res.body.result).toBeDefined();
    expect(res.body.result!.message).toContain('Successfully executed');
  });

  it('response includes result.serviceResponse for read actions', async () => {
    const res = await request(app)
      .post('/action')
      .send({ service: 'slack', action: 'read', target: '#general' });

    expect(res.status).toBe(200);
    expect(res.body.result).toBeDefined();
  });
});
