/**
 * Token Lifecycle Tests
 * Verify tokens: issued → used → expired/revoked
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TokenVault, _resetActiveTokens } from './tokenVault.js';

describe('token lifecycle', () => {
  let vault: TokenVault;

  beforeEach(() => {
    _resetActiveTokens();
    vault = new TokenVault({ demoMode: true,
      tokenTtlSeconds: 600,
      cibaTimeoutMs: 2000,
      cibaIntervalMs: 50,
    });
  });

  describe('issuance', () => {
    it('read token has correct scope and service', async () => {
      const { tokenState } = await vault.requestToken('slack', 'read', '#engineering');
      expect(tokenState.scope).toBe('slack.messages.read');
      expect(tokenState.service).toBe('slack');
      expect(tokenState.status).toBe('active');
    });

    it('write token has correct scope', async () => {
      const { tokenState } = await vault.requestToken('github', 'write', 'my-repo', 'commit');
      expect(tokenState.scope).toBe('github.repo.write');
      expect(tokenState.service).toBe('github');
      expect(tokenState.status).toBe('active');
    });

    it('delete token gets correct scope per service', async () => {
      // Slack delete reuses write scope (slack.messages.write)
      const { tokenState: slackDelete } = await vault.requestToken('slack', 'delete', '#general');
      expect(slackDelete.scope).toBe('slack.messages.write');

      // Google delete has its own delete scope
      const { tokenState: googleDelete } = await vault.requestToken('google', 'delete', 'inbox');
      expect(googleDelete.scope).toBe('google.gmail.delete');
    });

    it('admin token gets admin scope', async () => {
      const { tokenState } = await vault.requestToken('email', 'admin', 'inbox');
      expect(tokenState.scope).toBe('email.admin');
    });

    it('token has issuedAt and expiresAt timestamps', async () => {
      const { tokenState } = await vault.requestToken('slack', 'read', '#general');
      expect(tokenState.issuedAt).toBeGreaterThan(0);
      expect(tokenState.expiresAt).toBeGreaterThan(tokenState.issuedAt);
      expect(tokenState.expiresAt - tokenState.issuedAt).toBe(600_000); // 600s in ms
    });

    it('tokenId format is tok_timestamp_random', async () => {
      const { tokenState } = await vault.requestToken('slack', 'read', '#general');
      expect(tokenState.tokenId).toMatch(/^tok_\d+_[a-z0-9]+$/);
    });

    it('each token gets a unique tokenId', async () => {
      const { tokenState: t1 } = await vault.requestToken('slack', 'read', '#a');
      const { tokenState: t2 } = await vault.requestToken('slack', 'read', '#b');
      expect(t1.tokenId).not.toBe(t2.tokenId);
    });

    it('ttlSeconds matches config', async () => {
      const { tokenState } = await vault.requestToken('slack', 'read', '#general');
      expect(tokenState.ttlSeconds).toBe(600);
    });

    it('short ttl vault issues tokens with reduced expiry', async () => {
      const shortVault = new TokenVault({ demoMode: true,
        tokenTtlSeconds: 30,
        cibaTimeoutMs: 2000,
        cibaIntervalMs: 50,
      });
      const { tokenState } = await shortVault.requestToken('slack', 'read', '#general');
      expect(tokenState.ttlSeconds).toBe(30);
      expect(tokenState.expiresAt - tokenState.issuedAt).toBe(30_000);
    });
  });

  describe('active token tracking', () => {
    it('issued tokens appear in getActiveTokens', async () => {
      await vault.requestToken('slack', 'read', '#a');
      await vault.requestToken('github', 'read', 'repo');
      const tokens = vault.getActiveTokens();
      expect(tokens.length).toBe(2);
    });

    it('getActiveTokens returns only active tokens', async () => {
      const { tokenState } = await vault.requestToken('slack', 'read', '#general');
      await vault.revokeToken(tokenState.tokenId);
      const tokens = vault.getActiveTokens();
      expect(tokens.find(t => t.tokenId === tokenState.tokenId)).toBeUndefined();
    });

    it('getActiveTokens shows correct status for each token', async () => {
      const { tokenState: t1 } = await vault.requestToken('slack', 'read', '#a');
      const { tokenState: t2 } = await vault.requestToken('github', 'read', 'repo');
      const tokens = vault.getActiveTokens();
      const found1 = tokens.find(t => t.tokenId === t1.tokenId);
      const found2 = tokens.find(t => t.tokenId === t2.tokenId);
      expect(found1?.status).toBe('active');
      expect(found2?.status).toBe('active');
    });
  });

  describe('expiry', () => {
    it('expired tokens are removed from active list', async () => {
      const shortVault = new TokenVault({ demoMode: true,
        tokenTtlSeconds: 0, // Immediately expired
        cibaTimeoutMs: 1000,
        cibaIntervalMs: 50,
      });
      await shortVault.requestToken('slack', 'read', '#general');
      const tokens = shortVault.getActiveTokens();
      expect(tokens.length).toBe(0);
    });

    it('tokens with 1ms TTL expire quickly', async () => {
      const fastVault = new TokenVault({ demoMode: true,
        tokenTtlSeconds: 0,
        cibaTimeoutMs: 1000,
        cibaIntervalMs: 50,
      });
      await fastVault.requestToken('slack', 'read', '#general');
      // Wait 1ms
      await new Promise(r => setTimeout(r, 1));
      const tokens = fastVault.getActiveTokens();
      expect(tokens.length).toBe(0);
    });
  });

  describe('revocation', () => {
    it('revokeToken marks token as revoked and removes from active', async () => {
      const { tokenState } = await vault.requestToken('slack', 'read', '#general');
      const tokensBefore = vault.getActiveTokens();
      expect(tokensBefore.some(t => t.tokenId === tokenState.tokenId)).toBe(true);

      await vault.revokeToken(tokenState.tokenId);

      const tokensAfter = vault.getActiveTokens();
      expect(tokensAfter.some(t => t.tokenId === tokenState.tokenId)).toBe(false);
    });

    it('revokeAllTokens clears entire active set', async () => {
      await vault.requestToken('slack', 'read', '#a');
      await vault.requestToken('slack', 'read', '#b');
      await vault.requestToken('github', 'read', 'repo');

      const count = await vault.revokeAllTokens();
      expect(count).toBe(3);

      const tokens = vault.getActiveTokens();
      expect(tokens.length).toBe(0);
    });

    it('revokeNonExistent returns false', async () => {
      const result = await vault.revokeToken('tok_does_not_exist');
      expect(result).toBe(false);
    });

    it('revoking same token twice returns false second time', async () => {
      const { tokenState } = await vault.requestToken('slack', 'read', '#general');
      await vault.revokeToken(tokenState.tokenId);
      const result = await vault.revokeToken(tokenState.tokenId);
      expect(result).toBe(false);
    });

    it('revokeAll on empty vault returns 0', async () => {
      const count = await vault.revokeAllTokens();
      expect(count).toBe(0);
    });
  });
});
