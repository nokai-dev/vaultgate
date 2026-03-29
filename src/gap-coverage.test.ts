/**
 * Gap Coverage Tests — targets uncovered lines from coverage report
 *
 * ciba.ts lines 71-72:   word-wrap logic (long binding messages)
 * tokenVault.ts lines 63-64: real Auth0 connection path (demoMode=false)
 * vaultgate.ts lines 88-97: error path in executeAction
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CIBAHandler } from './ciba.js';
import { TokenVault, _resetActiveTokens } from './tokenVault.js';
import { VaultGate } from './vaultgate.js';

// ---------------------------------------------------------------------------
// ciba.ts line 130 — both branches of pollCount >= demoApprovalDelay
// ---------------------------------------------------------------------------
describe('CIBA poll loop — both branches of approval condition (line 130)', () => {
  it('FALSE branch: continues polling when pollCount < demoApprovalDelay', async () => {
    // With demoApprovalDelay=999, approval never fires within 2s timeout.
    // All 19 polls (2000/100) go through the false branch.
    const ciba = new CIBAHandler({
      intervalMs: 100,
      timeoutMs: 2000,
      demoApprovalDelay: 999,
    });
    const result = await ciba.requestTokenWithCIBA(
      'test-conn',
      'slack',
      'write',
      '#general',
      'Hello'
    );
    expect(result.status).toBe('expired');
  });

  it('TRUE branch: issues token when pollCount reaches demoApprovalDelay', async () => {
    // With demoApprovalDelay=5 and intervalMs=100, approval fires at ~500ms.
    // This exercises the TRUE branch of line 130 — the previously uncovered branch.
    const ciba = new CIBAHandler({
      intervalMs: 100,
      timeoutMs: 5000,
      demoApprovalDelay: 5,
    });
    const result = await ciba.requestTokenWithCIBA(
      'test-conn',
      'slack',
      'write',
      '#general',
      'Hello'
    );
    expect(result.status).toBe('approved');
    expect(result.token).toBeDefined();
    expect(result.token).toMatch(/^eyJ/); // JWT format
  });

  it('TRUE branch fires at exactly demoApprovalDelay=1 (minimum polls)', async () => {
    // Edge case: user approves on first poll (100ms)
    const ciba = new CIBAHandler({
      intervalMs: 100,
      timeoutMs: 2000,
      demoApprovalDelay: 1,
    });
    const result = await ciba.requestTokenWithCIBA(
      'test-conn',
      'github',
      'write',
      'my-repo',
      'push'
    );
    expect(result.status).toBe('approved');
    expect(result.token).toBeDefined();
  });

  it('TRUE branch works with DEMO_APPROVAL_DELAY_POLLS env var override', async () => {
    // Verify env-driven demo approval delay also triggers the true branch
    const original = process.env.DEMO_APPROVAL_DELAY_POLLS;
    process.env.DEMO_APPROVAL_DELAY_POLLS = '2';
    try {
      const ciba = new CIBAHandler({
        intervalMs: 100,
        timeoutMs: 2000,
      });
      const result = await ciba.requestTokenWithCIBA(
        'test-conn',
        'email',
        'write',
        'user@example.com',
        'hello'
      );
      expect(result.status).toBe('approved');
    } finally {
      if (original === undefined) delete process.env.DEMO_APPROVAL_DELAY_POLLS;
      else process.env.DEMO_APPROVAL_DELAY_POLLS = original;
    }
  });
});

// ---------------------------------------------------------------------------
// ciba.ts lines 71-72 — word-wrap when binding message exceeds line width
// ---------------------------------------------------------------------------
describe('CIBA binding message word-wrap (lines 71-72)', () => {
  it('wraps long binding message without body', () => {
    // Message: "Admin access on EMAIL verylongtargetname"
    // Should exercise the line-wrap branch (>58 chars triggers flush)
    const ciba = new CIBAHandler({ intervalMs: 50, timeoutMs: 200 });
    const msg = ciba.requestTokenWithCIBA(
      'test-conn',
      'email',
      'admin',
      'verylongtargetname123456789',
      undefined
    );
    return expect(msg).resolves.toMatchObject({ status: 'approved' });
  });

  it('wraps long binding message with long body', () => {
    // Body long enough to wrap at maxWidth=54
    const ciba = new CIBAHandler({ intervalMs: 50, timeoutMs: 200 });
    const msg = ciba.requestTokenWithCIBA(
      'test-conn',
      'slack',
      'write',
      '#engineering',
      'This is a very long message body that should wrap across multiple display lines at the phone prompt'
    );
    return expect(msg).resolves.toMatchObject({ status: 'approved' });
  });

  it('handles single word longer than maxWidth', () => {
    const ciba = new CIBAHandler({ intervalMs: 50, timeoutMs: 200 });
    // Single word > 54 chars triggers immediate wrap
    const msg = ciba.requestTokenWithCIBA(
      'test-conn',
      'github',
      'write',
      'repo',
      'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz' // 62 chars
    );
    return expect(msg).resolves.toMatchObject({ status: 'approved' });
  });

  it('handles multiple wraps needed for very long body', () => {
    const ciba = new CIBAHandler({ intervalMs: 50, timeoutMs: 200 });
    // 3 wraps needed: 3 lines minimum
    const body = 'AAAAA BBBBB CCCCC DDDDD EEEEE FFFFF GGGGG HHHHH IIIII JJJJJ';
    const msg = ciba.requestTokenWithCIBA(
      'test-conn',
      'slack',
      'write',
      '#general',
      body
    );
    return expect(msg).resolves.toMatchObject({ status: 'approved' });
  });
});

// ---------------------------------------------------------------------------
// tokenVault.ts lines 63-64 — isDemoMode=false path (real Auth0 credentials)
// ---------------------------------------------------------------------------
describe('TokenVault real-mode connection (lines 63-64)', () => {
  beforeEach(() => {
    _resetActiveTokens();
    // Simulate real Auth0 credentials via env
    process.env.AUTH0_DOMAIN = 'myapp.auth0.com';
    process.env.AUTH0_CLIENT_ID = 'real_client_id';
    process.env.AUTH0_CLIENT_SECRET = 'real_client_secret';
  });

  it('isConnected returns true when AUTH0_DOMAIN and AUTH0_CLIENT_ID are set', () => {
    const vault = new TokenVault();
    expect(vault.isConnected()).toBe(true);
  });

  it('getConnectionInfo returns demoMode=false when real credentials present', () => {
    const vault = new TokenVault();
    const info = vault.getConnectionInfo();
    expect(info.demoMode).toBe(false);
    expect(info.domain).toBe('myapp.auth0.com');
    expect(info.connectionId).toBe('slack');
  });

  it('issues silent token in real mode for read action', async () => {
    const vault = new TokenVault();
    const { tokenState, token } = await vault.requestToken(
      'slack',
      'read',
      '#general'
    );
    expect(token).toBeDefined();
    expect(tokenState.status).toBe('active');
    expect(tokenState.scope).toBe('slack.messages.read');
  });

  it('issues CIBA token in real mode for write action', async () => {
    const vault = new TokenVault();
    const { tokenState, token } = await vault.requestToken(
      'slack',
      'write',
      '#general',
      'Hello'
    );
    expect(token).toBeDefined();
    expect(tokenState.status).toBe('active');
  });

  // Clean up env so other tests aren't affected
  afterEach(() => {
    delete process.env.AUTH0_DOMAIN;
    delete process.env.AUTH0_CLIENT_ID;
    delete process.env.AUTH0_CLIENT_SECRET;
  });
});

// ---------------------------------------------------------------------------
// vaultgate.ts lines 88-97 — error path in executeAction
// ---------------------------------------------------------------------------
describe('VaultGate error handling (lines 88-97)', () => {
  let vault: TokenVault;
  let gate: VaultGate;

  beforeEach(() => {
    _resetActiveTokens();
    vault = new TokenVault({ demoMode: true,
      tokenTtlSeconds: 600,
      cibaTimeoutMs: 2000,
      cibaIntervalMs: 50,
    });
    gate = new VaultGate(vault);
  });

  it('executeAction returns error status when vault throws', async () => {
    // Spy on vault.requestToken and make it throw
    const originalRequestToken = vault.requestToken.bind(vault);
    vault.requestToken = vi.fn().mockRejectedValue(new Error('Vault connection failed'));

    const result = await gate.executeAction({
      service: 'slack',
      action: 'read',
      target: '#general',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('error');
    expect(result.error).toBe('Vault connection failed');

    // Restore
    vault.requestToken = originalRequestToken;
  });

  it('executeAction error includes correct requestId and service/action', async () => {
    const originalRequestToken = vault.requestToken.bind(vault);
    vault.requestToken = vi.fn().mockRejectedValue(new Error('Token exchange error'));

    const result = await gate.executeAction({
      service: 'github',
      action: 'write',
      target: 'my-repo',
      body: 'commit',
    });

    expect(result.success).toBe(false);
    expect(result.requestId).toBeDefined();
    expect(result.service).toBe('github');
    expect(result.action).toBe('write');
    expect(result.error).toBe('Token exchange error');

    vault.requestToken = originalRequestToken;
  });

  it('executeAction error response has correct shape', async () => {
    const originalRequestToken = vault.requestToken.bind(vault);
    vault.requestToken = vi.fn().mockRejectedValue(new Error('CIBA timeout'));

    const result = await gate.executeAction({
      service: 'email',
      action: 'admin',
      target: 'admin-panel',
    });

    // Should have all expected fields even in error case
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('requestId');
    expect(result).toHaveProperty('service');
    expect(result).toHaveProperty('action');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('error');
    expect(result.status).toBe('error');

    vault.requestToken = originalRequestToken;
  });

  it('handles non-Error thrown values as Unknown error', async () => {
    const originalRequestToken = vault.requestToken.bind(vault);
    vault.requestToken = vi.fn().mockRejectedValue('string error' as any);

    const result = await gate.executeAction({
      service: 'slack',
      action: 'read',
      target: '#general',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown error');

    vault.requestToken = originalRequestToken;
  });
});
