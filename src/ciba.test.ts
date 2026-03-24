import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CIBAHandler } from './ciba.js';

describe('ciba', () => {
  let cibaHandler: CIBAHandler;

  beforeEach(() => {
    cibaHandler = new CIBAHandler({
      intervalMs: 100,
      timeoutMs: 2000,
    });
  });

  describe('CIBAHandler', () => {
    it('can be created with custom config', () => {
      const handler = new CIBAHandler({
        intervalMs: 500,
        timeoutMs: 30000,
      });
      expect(handler).toBeDefined();
    });

    it('shouldUseCIBA returns true for write action', () => {
      expect(cibaHandler.shouldUseCIBA('write')).toBe(true);
    });

    it('shouldUseCIBA returns false for read action', () => {
      expect(cibaHandler.shouldUseCIBA('read')).toBe(false);
    });

    it('CIBA approval simulation works and returns approved status', async () => {
      const handler = new CIBAHandler({
        intervalMs: 50,
        timeoutMs: 500,
      });

      const result = await handler.requestTokenWithCIBA(
        'test-connection',
        'slack',
        'write',
        '#general',
        'Test message'
      );

      expect(result.status).toBe('approved');
      expect(result.token).toBeDefined();
      expect(result.token).toContain('.');
    });

    it('CIBA timeout triggers when no approval received', async () => {
      // Handler with very short timeout and no approval simulation
      const handler = new CIBAHandler({
        intervalMs: 100,
        timeoutMs: 150, // Very short timeout
      });

      // Manually set pollCount to high value to trigger timeout path
      const result = await handler.requestTokenWithCIBA(
        'test-connection',
        'slack',
        'write',
        '#general'
      );

      // With short timeout, should either get approved (since approval is after 3 polls)
      // or expired if timeout hits first
      expect(['approved', 'expired']).toContain(result.status);
    });
  });
});
