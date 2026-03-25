/**
 * CIBA Denial Integration Test
 * Tests the full CIBA denial path through tokenVault.requestToken
 * (The ciba.test.ts tests the CIBAHandler in isolation;
 *  this file tests denial as it propagates through TokenVault.)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TokenVault, _resetActiveTokens } from './tokenVault.js';

describe('CIBA denial — full tokenVault.requestToken path', () => {
  let vault: TokenVault;

  beforeEach(() => {
    _resetActiveTokens();
    vault = new TokenVault({
      tokenTtlSeconds: 600,
      cibaTimeoutMs: 5000,
      cibaIntervalMs: 50,
      demoApprovalDelay: 3,
    });
  });

  it('requestToken throws with CIBA-failed message when CIBA returns denied', async () => {
    // Patch the internal ciba handler to return denied
    const original = (vault as any).cibaHandler.requestTokenWithCIBA.bind(
      (vault as any).cibaHandler
    );
    (vault as any).cibaHandler.requestTokenWithCIBA = () =>
      Promise.resolve({ status: 'denied', error: 'User declined' });

    await expect(
      vault.requestToken('slack', 'write', '#general', 'Hello')
    ).rejects.toThrow('CIBA failed: User declined');

    // Restore
    (vault as any).cibaHandler.requestTokenWithCIBA = original;
  });

  it('requestToken throws with default error when CIBA returns denied without error', async () => {
    const original = (vault as any).cibaHandler.requestTokenWithCIBA.bind(
      (vault as any).cibaHandler
    );
    (vault as any).cibaHandler.requestTokenWithCIBA = () =>
      Promise.resolve({ status: 'denied' });

    await expect(
      vault.requestToken('github', 'write', 'repo', 'push')
    ).rejects.toThrow('CIBA failed: Unknown error');

    (vault as any).cibaHandler.requestTokenWithCIBA = original;
  });

  it('no token is stored when CIBA is denied', async () => {
    const original = (vault as any).cibaHandler.requestTokenWithCIBA.bind(
      (vault as any).cibaHandler
    );
    (vault as any).cibaHandler.requestTokenWithCIBA = () =>
      Promise.resolve({ status: 'denied', error: 'User said no' });

    try {
      await vault.requestToken('slack', 'write', '#general', 'Hello');
    } catch {
      // Expected to throw
    }

    // No tokens should be active
    expect(vault.getActiveTokens().length).toBe(0);

    (vault as any).cibaHandler.requestTokenWithCIBA = original;
  });

  it('subsequent requestToken calls work after denial', async () => {
    const original = (vault as any).cibaHandler.requestTokenWithCIBA.bind(
      (vault as any).cibaHandler
    );
    (vault as any).cibaHandler.requestTokenWithCIBA = () =>
      Promise.resolve({ status: 'denied', error: 'User declined' });

    // First call denied
    await expect(
      vault.requestToken('slack', 'write', '#general', 'Hello')
    ).rejects.toThrow();

    // Restore to approved
    (vault as any).cibaHandler.requestTokenWithCIBA = () =>
      Promise.resolve({ status: 'approved', token: 'tok_demo_123' });

    // Second call should succeed
    const { tokenState } = await vault.requestToken('slack', 'write', '#general', 'Hello');
    expect(tokenState.status).toBe('active');

    (vault as any).cibaHandler.requestTokenWithCIBA = original;
  });
});
