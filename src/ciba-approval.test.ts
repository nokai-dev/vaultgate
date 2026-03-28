/**
 * CIBA Approval Branch Tests — approval condition in ciba.ts poll loop
 *
 * The approval condition: `if (this.pollCount >= this.config.demoApprovalDelay)`
 * is TRUE when enough polls have elapsed (user approved on Auth0 Guardian).
 * The else branch is the "keep waiting" path (covered by gap-coverage.test.ts).
 *
 * Note: generateDemoToken() returns a JWT-like token (header.payload.signature).
 * The `tok_` prefix appears in the JWT's `jti` claim inside the payload.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { CIBAHandler } from './ciba.js';

describe('CIBA approval branch — line 130 TRUE exit from poll loop', () => {
  afterEach(() => {
    delete process.env.DEMO_APPROVAL_DELAY_POLLS;
  });

  // ---------------------------------------------------------------------------
  // ciba.ts line 130: pollCount >= demoApprovalDelay → approved
  // With intervalMs=100, polls fire at 0, 100, 200ms...
  // demoApprovalDelay=2 → pollCount hits 2 at the 3rd poll (~200ms) → approved
  // ---------------------------------------------------------------------------

  it('approves when pollCount reaches demoApprovalDelay (approval branch)', async () => {
    const handler = new CIBAHandler({
      intervalMs: 100,
      timeoutMs: 1000,
      demoApprovalDelay: 2,
    });

    const result = await handler.requestTokenWithCIBA(
      'test-conn',
      'slack',
      'write',
      '#general',
      'Approval branch test'
    );

    expect(result.status).toBe('approved');
    expect(result.token).toBeDefined();
    // Token is a JWT-like structure; tok_ appears in the jti claim inside payload
    const payload = result.token!.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    expect(decoded.jti).toMatch(/^tok_/);
    expect(decoded.scope).toBe('slack.messages.write');
  });

  it('approval fires at pollCount == demoApprovalDelay (exact threshold)', async () => {
    // demoApprovalDelay=0 → immediate approval at first poll (index 0)
    const handler = new CIBAHandler({
      intervalMs: 100,
      timeoutMs: 2000,
      demoApprovalDelay: 0,
    });

    const result = await handler.requestTokenWithCIBA(
      'test-conn',
      'github',
      'write',
      'my-repo',
      'Exact threshold test'
    );

    expect(result.status).toBe('approved');
    expect(result.token).toBeDefined();
  });

  it('approval fires at pollCount > demoApprovalDelay (over threshold)', async () => {
    // With interval=100, timeout=5000: polls at 0,100,200,300,400ms
    // demoApprovalDelay=4 → pollCount=4 is the 5th poll → approved at ~400ms
    const handler = new CIBAHandler({
      intervalMs: 100,
      timeoutMs: 5000,
      demoApprovalDelay: 4,
    });

    const start = Date.now();
    const result = await handler.requestTokenWithCIBA(
      'test-conn',
      'google',
      'write',
      'inbox',
      'Over threshold test'
    );
    const elapsed = Date.now() - start;

    expect(result.status).toBe('approved');
    expect(elapsed).toBeGreaterThanOrEqual(300); // >= 4 intervals
    expect(elapsed).toBeLessThan(1000);          // but well within timeout
  });

  it('returns correct token structure on approval (JWT with jti, scope, exp)', async () => {
    const handler = new CIBAHandler({
      intervalMs: 50,
      timeoutMs: 1000,
      demoApprovalDelay: 1,
    });

    const result = await handler.requestTokenWithCIBA(
      'test-conn',
      'email',
      'admin',
      'admin-panel'
    );

    expect(result.status).toBe('approved');
    expect(result.token).toBeDefined();
    // JWT-like: header.payload.signature
    const parts = result.token!.split('.');
    expect(parts.length).toBe(3);
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    expect(payload.jti).toMatch(/^tok_/);
    expect(payload.scope).toBe('email.admin');
    expect(payload.aud).toBe('vaultgate');
    expect(typeof payload.exp).toBe('number');
    expect(typeof payload.iat).toBe('number');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('different scopes get different demo token values', async () => {
    const handler = new CIBAHandler({
      intervalMs: 50,
      timeoutMs: 1000,
      demoApprovalDelay: 1,
    });

    const r1 = await handler.requestTokenWithCIBA('c1', 'slack', 'write', '#a');
    const r2 = await handler.requestTokenWithCIBA('c2', 'github', 'write', 'repo');

    expect(r1.status).toBe('approved');
    expect(r2.status).toBe('approved');
    expect(r1.token).not.toBe(r2.token);
    // Scopes differ in the JWT payload
    const p1 = JSON.parse(Buffer.from(r1.token!.split('.')[1], 'base64url').toString());
    const p2 = JSON.parse(Buffer.from(r2.token!.split('.')[1], 'base64url').toString());
    expect(p1.scope).toBe('slack.messages.write');
    expect(p2.scope).toBe('github.repo.write');
  });

  it('body parameter does not affect token issuance', async () => {
    const handler = new CIBAHandler({
      intervalMs: 50,
      timeoutMs: 1000,
      demoApprovalDelay: 1,
    });

    const result = await handler.requestTokenWithCIBA(
      'test-conn',
      'slack',
      'write',
      '#general',
      'Message body here'
    );

    expect(result.status).toBe('approved');
    expect(result.token).toBeDefined();
  });

  it('approval branch exit is faster than timeout path', async () => {
    // Approval at poll 2 ~100ms vs timeout at 2000ms
    const handler = new CIBAHandler({
      intervalMs: 50,
      timeoutMs: 2000,
      demoApprovalDelay: 2,
    });

    const start = Date.now();
    const result = await handler.requestTokenWithCIBA(
      'test-conn',
      'slack',
      'write',
      '#general'
    );
    const elapsed = Date.now() - start;

    expect(result.status).toBe('approved');
    expect(elapsed).toBeLessThan(500); // Much faster than 2000ms timeout
  });
});
