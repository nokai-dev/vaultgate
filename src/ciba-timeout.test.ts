/**
 * CIBA Timeout & Force-Path Tests — exercises uncovered branches in ciba.ts
 * Coverage target: ciba.ts line 45 (DEMO_FORCE_TIMEOUT env path) and line 130 (timeout exit)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CIBAHandler } from './ciba.js';

describe('CIBA timeout & force paths', () => {
  afterEach(() => {
    // Clean up env so subsequent tests aren't affected
    delete process.env.DEMO_FORCE_TIMEOUT;
    delete process.env.DEMO_APPROVAL_DELAY_POLLS;
  });

  // ---------------------------------------------------------------------------
  // ciba.ts line 45 — DEMO_FORCE_TIMEOUT=1 forces timeout without approval
  // ---------------------------------------------------------------------------
  it('requestTokenWithCIBA times out when DEMO_FORCE_TIMEOUT=1', async () => {
    process.env.DEMO_FORCE_TIMEOUT = '1';
    // interval=100, timeout=350 → 3 polls before timeout
    const handler = new CIBAHandler({ intervalMs: 100, timeoutMs: 350 });

    const result = await handler.requestTokenWithCIBA(
      'test-conn',
      'slack',
      'write',
      '#general',
      'This should timeout'
    );

    expect(result.status).toBe('expired');
    expect(result.error).toContain('timeout');
  });

  it('force timeout returns expired status not approved', async () => {
    process.env.DEMO_FORCE_TIMEOUT = '1';
    const handler = new CIBAHandler({ intervalMs: 50, timeoutMs: 300 });

    const result = await handler.requestTokenWithCIBA(
      'test-conn',
      'github',
      'write',
      'my-repo',
      'Force timeout test'
    );

    expect(result.status).toBe('expired');
    expect(result.token).toBeUndefined();
  });

  it('without DEMO_FORCE_TIMEOUT approval path fires normally', async () => {
    // Explicit demoApprovalDelay overrides both env-based timeout and force path
    const handler = new CIBAHandler({
      intervalMs: 50,
      timeoutMs: 1000,
      demoApprovalDelay: 2, // approve at poll 2
    });

    const result = await handler.requestTokenWithCIBA(
      'test-conn',
      'slack',
      'write',
      '#general'
    );

    expect(result.status).toBe('approved');
    expect(result.token).toBeDefined();
  });

  it('DEMO_APPROVAL_DELAY_POLLS env var controls approval timing', async () => {
    // When DEMO_FORCE_TIMEOUT is NOT set, DEMO_APPROVAL_DELAY_POLLS controls
    delete process.env.DEMO_FORCE_TIMEOUT;
    process.env.DEMO_APPROVAL_DELAY_POLLS = '5';
    // interval=50, approval at poll 5 → ~250ms
    const handler = new CIBAHandler({ intervalMs: 50, timeoutMs: 1000 });
    const start = Date.now();

    const result = await handler.requestTokenWithCIBA(
      'test-conn',
      'slack',
      'write',
      '#general'
    );

    expect(result.status).toBe('approved');
    expect(Date.now() - start).toBeGreaterThanOrEqual(200); // >= 4 intervals
  });

  it('explicit demoApprovalDelay in config overrides DEMO_APPROVAL_DELAY_POLLS env', async () => {
    process.env.DEMO_APPROVAL_DELAY_POLLS = '99'; // would timeout
    const handler = new CIBAHandler({
      intervalMs: 50,
      timeoutMs: 1000,
      demoApprovalDelay: 2, // override env — approve quickly
    });

    const result = await handler.requestTokenWithCIBA(
      'test-conn',
      'slack',
      'write',
      '#general'
    );

    expect(result.status).toBe('approved'); // explicit config wins
  });

  // ---------------------------------------------------------------------------
  // ciba.ts line 130 — timeout exit from poll loop
  // ---------------------------------------------------------------------------
  it('poll loop exits after maxPolls even without approval', async () => {
    // Very short timeout with long interval — few polls possible
    const handler = new CIBAHandler({
      intervalMs: 200,
      timeoutMs: 450, // only 2 polls possible
    });

    const result = await handler.requestTokenWithCIBA(
      'test-conn',
      'slack',
      'write',
      '#general'
    );

    // Should timeout — not enough time for 3 approvals
    expect(result.status).toBe('expired');
  });

  it('timeout result has correct error message', async () => {
    const handler = new CIBAHandler({
      intervalMs: 200,
      timeoutMs: 100, // less than one interval
    });

    const result = await handler.requestTokenWithCIBA(
      'test-conn',
      'slack',
      'write',
      '#general'
    );

    expect(result.status).toBe('expired');
    expect(result.error).toBeTruthy();
    expect(typeof result.error).toBe('string');
  });

  it('multiple sequential CIBA requests maintain separate poll counts', async () => {
    const handler = new CIBAHandler({
      intervalMs: 50,
      timeoutMs: 200,
      demoApprovalDelay: 2,
    });

    const r1 = await handler.requestTokenWithCIBA('c1', 'slack', 'write', '#a');
    const r2 = await handler.requestTokenWithCIBA('c2', 'github', 'write', 'repo');

    // Both should succeed independently
    expect(r1.status).toBe('approved');
    expect(r2.status).toBe('approved');
    expect(r1.token).not.toBe(r2.token);
  });
});
