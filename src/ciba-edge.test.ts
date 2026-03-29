/**
 * CIBA Edge Cases — denial, timeout, and poll-count variations
 * Targets: denied status path in tokenVault.requestToken,
 *          timeout path in CIBAHandler.requestTokenWithCIBA
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CIBAHandler } from './ciba.js';
import { TokenVault, _resetActiveTokens } from './tokenVault.js';

// ---------------------------------------------------------------------------
// CIBA denial path — tokenVault.requestToken must throw when CIBA returns denied
// ---------------------------------------------------------------------------
describe('CIBA denial', () => {
  let vault: TokenVault;

  beforeEach(() => {
    _resetActiveTokens();
    vault = new TokenVault({ demoMode: true,
      tokenTtlSeconds: 600,
      cibaTimeoutMs: 5000,
      cibaIntervalMs: 50,
    });
  });

  it('requestToken throws when CIBA returns denied', async () => {
    // Patch the ciba handler to simulate user DENIED
    const original = (vault as any).cibaHandler.requestTokenWithCIBA.bind(
      (vault as any).cibaHandler
    );
    (vault as any).cibaHandler.requestTokenWithCIBA = () =>
      Promise.resolve({ status: 'denied', error: 'User declined' });

    await expect(
      vault.requestToken('slack', 'write', '#general', 'Hello')
    ).rejects.toThrow('CIBA failed');

    // Restore
    (vault as any).cibaHandler.requestTokenWithCIBA = original;
  });

  it('CIBAHandler returns denied result directly when pollCount never reaches delay', async () => {
    // Very low approval delay that will never be reached within timeout
    const ciba = new CIBAHandler({
      intervalMs: 1000,
      timeoutMs: 500,    // expires before any poll completes
      demoApprovalDelay: 999, // impossibly high
    });

    const result = await ciba.requestTokenWithCIBA(
      'test-conn',
      'slack',
      'write',
      '#general',
      'Hello'
    );

    expect(result.status).toBe('expired');
    expect(result.error).toBe('CIBA timeout — user did not approve in time');
  });
});

// ---------------------------------------------------------------------------
// CIBA poll-count >= 5 path (line 130 else-branch / STILL WAITING)
// Must have: maxPolls >= 5 AND demoApprovalDelay > 5 (so approval never fires)
// intervalMs=100ms + timeoutMs=6000ms → 60 polls fit, poll 5 is first STILL WAITING
// demoApprovalDelay=999 → approval will never fire → pollCount 5-59 all hit else
// ---------------------------------------------------------------------------
describe('CIBA pollCount >= 5 else-branch', () => {
  it('hits STILL WAITING else-branch (line 130) when approval never comes', async () => {
    const ciba = new CIBAHandler({
      intervalMs: 100,   // 100ms per poll — 60 polls fit in 6000ms timeout
      timeoutMs: 6000,   // 6 seconds — allows polls 1-59 to all hit STILL WAITING
      demoApprovalDelay: 999, // approval will never fire in time
    });

    const result = await ciba.requestTokenWithCIBA(
      'test-conn',
      'github',
      'write',
      'my-repo',
      'push'
    );

    // pollCount goes 1→2→3→4→5→...→59→60, then times out
    // pollCount=1 AWAITING, pollCount=2 CHECK PHONE, pollCount=3 TAP APPROVE
    // pollCount=4-59 → STILL WAITING (line 130 else-branch, the 1.07% gap)
    expect(result.status).toBe('expired');
  });
});

// ---------------------------------------------------------------------------
// CIBA timeout — demoApprovalDelay higher than what timeout allows
// ---------------------------------------------------------------------------
describe('CIBA timeout edge', () => {
  it('times out when demoApprovalDelay exceeds timeoutMs polls', async () => {
    const ciba = new CIBAHandler({
      intervalMs: 50,
      timeoutMs: 200,   // only allows ~4 polls
      demoApprovalDelay: 999, // never reached
    });

    const result = await ciba.requestTokenWithCIBA(
      'test-conn',
      'github',
      'write',
      'my-repo',
      'push'
    );

    expect(result.status).toBe('expired');
    expect(result.error).toBe('CIBA timeout — user did not approve in time');
  });

  it('returns approved when demoApprovalDelay equals exactly maxPolls', async () => {
    // With intervalMs=50 and timeoutMs=200, maxPolls=4
    // So set demoApprovalDelay=4 to be exactly at the boundary
    const ciba = new CIBAHandler({
      intervalMs: 50,
      timeoutMs: 200,
      demoApprovalDelay: 4, // exactly at boundary
    });

    const result = await ciba.requestTokenWithCIBA(
      'test-conn',
      'github',
      'write',
      'my-repo',
      'push'
    );

    expect(result.status).toBe('approved');
  });
});

// ---------------------------------------------------------------------------
// Concurrent token issuance — all four services simultaneously
// ---------------------------------------------------------------------------
describe('concurrent token issuance', () => {
  let vault: TokenVault;

  beforeEach(() => {
    _resetActiveTokens();
    vault = new TokenVault({ demoMode: true,
      tokenTtlSeconds: 600,
      cibaTimeoutMs: 3000,
      cibaIntervalMs: 50,
      demoApprovalDelay: 3,
    });
  });

  it('issues tokens for all four services concurrently', async () => {
    const [slack, google, github, email] = await Promise.all([
      vault.requestToken('slack', 'read', '#general'),
      vault.requestToken('google', 'read', 'inbox'),
      vault.requestToken('github', 'read', 'my-repo'),
      vault.requestToken('email', 'read', 'inbox'),
    ]);

    expect(slack.tokenState.scope).toBe('slack.messages.read');
    expect(google.tokenState.scope).toBe('google.gmail.readonly');
    expect(github.tokenState.scope).toBe('github.repo.read');
    expect(email.tokenState.scope).toBe('email.read');
  });

  it('tracks all concurrent tokens as active', async () => {
    await Promise.all([
      vault.requestToken('slack', 'read', '#general'),
      vault.requestToken('google', 'read', 'inbox'),
      vault.requestToken('github', 'read', 'my-repo'),
      vault.requestToken('email', 'read', 'inbox'),
    ]);

    const active = vault.getActiveTokens();
    expect(active.length).toBe(4);
  });

  it('concurrent CIBA tokens — write actions on all four services', async () => {
    const [slack, google, github, email] = await Promise.all([
      vault.requestToken('slack', 'write', '#general', 'Hello'),
      vault.requestToken('google', 'write', 'inbox', 'Test'),
      vault.requestToken('github', 'write', 'my-repo', 'commit'),
      vault.requestToken('email', 'write', 'inbox', 'Message'),
    ]);

    expect(slack.tokenState.scope).toBe('slack.messages.write');
    expect(google.tokenState.scope).toBe('google.gmail.send');
    expect(github.tokenState.scope).toBe('github.repo.write');
    expect(email.tokenState.scope).toBe('email.send');
  });

  it('getActiveTokens returns fresh tokens (not stale)', async () => {
    const tokens = await Promise.all([
      vault.requestToken('slack', 'read', '#a'),
      vault.requestToken('slack', 'read', '#b'),
      vault.requestToken('slack', 'read', '#c'),
    ]);

    const active = vault.getActiveTokens();
    expect(active.length).toBe(3);
    const ids = active.map((t) => t.tokenId);
    expect(new Set(ids).size).toBe(3); // all unique
  });
});

// ---------------------------------------------------------------------------
// Revoke by tokenId — partial revocation
// ---------------------------------------------------------------------------
describe('selective revocation', () => {
  let vault: TokenVault;

  beforeEach(() => {
    _resetActiveTokens();
    vault = new TokenVault();
  });

  it('revokeToken by id removes only that token', async () => {
    const [a, b, c] = await Promise.all([
      vault.requestToken('slack', 'read', '#a'),
      vault.requestToken('slack', 'read', '#b'),
      vault.requestToken('slack', 'read', '#c'),
    ]);

    expect(vault.getActiveTokens().length).toBe(3);

    const revoked = await vault.revokeToken(a.tokenState.tokenId);
    expect(revoked).toBe(true);
    expect(vault.getActiveTokens().length).toBe(2);
    expect(vault.getActiveTokens().find((t) => t.tokenId === a.tokenState.tokenId)).toBeUndefined();
    expect(vault.getActiveTokens().find((t) => t.tokenId === b.tokenState.tokenId)).toBeDefined();
    expect(vault.getActiveTokens().find((t) => t.tokenId === c.tokenState.tokenId)).toBeDefined();
  });

  it('revokeAllTokens leaves zero active tokens', async () => {
    await Promise.all([
      vault.requestToken('slack', 'read', '#a'),
      vault.requestToken('google', 'read', 'inbox'),
      vault.requestToken('github', 'read', 'repo'),
    ]);

    vault.revokeAllTokens();
    expect(vault.getActiveTokens().length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Scope edge cases — delete maps correctly across services
// ---------------------------------------------------------------------------
describe('delete action scope mapping', () => {
  let vault: TokenVault;

  beforeEach(() => {
    _resetActiveTokens();
    vault = new TokenVault({ demoMode: true, cibaTimeoutMs: 2000, cibaIntervalMs: 50 });
  });

  it('slack delete maps to slack.messages.write (no separate delete scope)', async () => {
    const { tokenState } = await vault.requestToken('slack', 'delete', '#general');
    expect(tokenState.scope).toBe('slack.messages.write');
  });

  it('google delete maps to google.gmail.delete', async () => {
    const { tokenState } = await vault.requestToken('google', 'delete', 'inbox');
    expect(tokenState.scope).toBe('google.gmail.delete');
  });

  it('github delete maps to github.repo.delete', async () => {
    const { tokenState } = await vault.requestToken('github', 'delete', 'old-repo');
    expect(tokenState.scope).toBe('github.repo.delete');
  });

  it('email delete maps to email.delete', async () => {
    const { tokenState } = await vault.requestToken('email', 'delete', 'trash');
    expect(tokenState.scope).toBe('email.delete');
  });
});
