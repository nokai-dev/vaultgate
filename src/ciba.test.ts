import { describe, it, expect, beforeEach } from 'vitest';
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

    it('can be created with defaults', () => {
      const handler = new CIBAHandler({});
      expect(handler).toBeDefined();
    });

    it('shouldUseCIBA returns true for write action', () => {
      expect(cibaHandler.shouldUseCIBA('write')).toBe(true);
    });

    it('shouldUseCIBA returns true for delete action', () => {
      expect(cibaHandler.shouldUseCIBA('delete')).toBe(true);
    });

    it('shouldUseCIBA returns true for admin action', () => {
      expect(cibaHandler.shouldUseCIBA('admin')).toBe(true);
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

    it('CIBA generates valid JWT-like token structure', async () => {
      const result = await cibaHandler.requestTokenWithCIBA(
        'slack-connection',
        'github',
        'write',
        'repo-name',
        'Push commits'
      );

      expect(result.status).toBe('approved');
      const parts = result.token!.split('.');
      expect(parts.length).toBe(3); // JWT header.payload.signature
    });

    it('CIBA timeout triggers when timeoutMs is very short', async () => {
      const handler = new CIBAHandler({
        intervalMs: 100,
        timeoutMs: 50, // Very short — less than 1 poll
      });

      const result = await handler.requestTokenWithCIBA(
        'test-connection',
        'slack',
        'write',
        '#general'
      );

      // Should timeout since intervalMs > timeoutMs
      expect(result.status).toBe('expired');
      expect(result.error).toBeDefined();
    });

    // ---------------------------------------------------------------------------
    // Gap coverage: ciba.ts line 37 — `demoApprovalDelay ?? 3` fallback
    // The constructor sets demoApprovalDelay from env or config.demoApprovalDelay.
    // When Partial<CIBAConfig> omits demoApprovalDelay AND env var is absent,
    // the ?? 3 fallback fires.
    // ---------------------------------------------------------------------------
    it('demoApprovalDelay falls back to 3 when config omits it and env var absent', async () => {
      // Clear env var so isNaN(envDelay) path fires, config.demoApprovalDelay
      // is also undefined — exercising `?? 3` at construction
      delete process.env.DEMO_APPROVAL_DELAY_POLLS;
      const handler = new CIBAHandler({ intervalMs: 80, timeoutMs: 500 });
      // Fallback = 3 polls at 80ms → approval at ~240ms
      const start = Date.now();
      const result = await handler.requestTokenWithCIBA(
        'test-conn', 'slack', 'write', '#general'
      );
      expect(result.status).toBe('approved');
      // Should not resolve before poll 3
      expect(Date.now() - start).toBeGreaterThanOrEqual(160); // at least 2 intervals
    });

    // ---------------------------------------------------------------------------
    // Gap coverage: ciba.ts line 122 — `this.config.demoApprovalDelay ?? 3`
    // Even when config sets demoApprovalDelay=undefined explicitly,
    // the runtime ?? fires and uses 3.
    // ---------------------------------------------------------------------------
    it('poll loop uses fallback when demoApprovalDelay is explicitly undefined', async () => {
      // @ts-expect-error — intentionally pass undefined so runtime ?? fires
      const handler = new CIBAHandler({ intervalMs: 50, timeoutMs: 300, demoApprovalDelay: undefined });
      const result = await handler.requestTokenWithCIBA(
        'test-conn', 'github', 'write', 'repo'
      );
      // undefined → fallback to 3 polls at 50ms = approval at ~150ms
      expect(result.status).toBe('approved');
    });

    it('CIBA poll loop runs approximately 3 polls before auto-approve', async () => {
      const intervalMs = 80;
      const handler = new CIBAHandler({
        intervalMs,
        timeoutMs: 2000,
      });

      const start = Date.now();
      const result = await handler.requestTokenWithCIBA(
        'test',
        'slack',
        'write',
        '#general'
      );
      const elapsed = Date.now() - start;

      expect(result.status).toBe('approved');
      // Auto-approve fires after 3 polls, each intervalMs apart
      // Allow generous timing tolerance for CI environments
      expect(elapsed).toBeGreaterThanOrEqual(intervalMs * 2);
      expect(elapsed).toBeLessThan(intervalMs * 6); // Should not take 6+ intervals
    });
  });
});
