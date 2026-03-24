import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from './index.js';
import { _resetActiveTokens } from './tokenVault.js';

let server: ReturnType<typeof app.listen> | null = null;

beforeAll(() => {
  _resetActiveTokens();
  return new Promise<void>((resolve) => {
    server = app.listen(0, 'localhost', () => {
      resolve();
    });
  });
});

afterAll(() => {
  if (server) {
    server.close();
  }
});

describe('HTTP endpoints', () => {
  describe('POST /action', () => {
    it('with valid body returns 200', async () => {
      const res = await request(app)
        .post('/action')
        .send({
          service: 'slack',
          action: 'read',
          target: '#general',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.service).toBe('slack');
      expect(res.body.action).toBe('read');
    });

    it('with missing fields returns 400', async () => {
      const res = await request(app)
        .post('/action')
        .send({
          service: 'slack',
          // missing action and target
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Missing required fields');
    });

    it('with valid write action returns 200 and token', async () => {
      const res = await request(app)
        .post('/action')
        .send({
          service: 'slack',
          action: 'write',
          target: '#general',
          body: 'Hello world',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.tokenState).toBeDefined();
    });
  });

  describe('GET /status', () => {
    it('returns token state', async () => {
      const res = await request(app).get('/status');

      expect(res.status).toBe(200);
      expect(res.body.vaultConnected).toBeDefined();
      expect(res.body.activeTokens).toBeDefined();
      expect(Array.isArray(res.body.activeTokens)).toBe(true);
      expect(typeof res.body.totalActive).toBe('number');
      expect(typeof res.body.timestamp).toBe('number');
    });
  });

  describe('POST /revoke', () => {
    it('returns success', async () => {
      // First issue a token
      await request(app)
        .post('/action')
        .send({
          service: 'slack',
          action: 'read',
          target: '#general',
        });

      const res = await request(app).post('/revoke');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.revokedCount).toBe('number');
    });
  });

  describe('GET /health', () => {
    it('returns healthy', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('VaultGate');
      expect(res.body.version).toBe('1.0.0');
    });
  });

  describe('GET /', () => {
    it('returns service info', async () => {
      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('VaultGate');
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.endpoints).toBeDefined();
    });
  });
});
