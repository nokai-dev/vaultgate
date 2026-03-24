import { describe, it, expect, beforeEach } from 'vitest';
import { TokenVault, _resetActiveTokens } from './tokenVault.js';

describe('tokenVault', () => {
  let vault: TokenVault;

  beforeEach(() => {
    _resetActiveTokens();
    vault = new TokenVault({
      tokenTtlSeconds: 600,
      cibaTimeoutMs: 5000,
      cibaIntervalMs: 100,
    });
  });

  describe('TokenVault', () => {
    it('can be created in demo mode', () => {
      expect(vault).toBeDefined();
      expect(vault.isConnected()).toBe(false);
    });

    it('getConnectionInfo returns demo mode info', () => {
      const info = vault.getConnectionInfo();
      expect(info.demoMode).toBe(true);
      expect(info.domain).toBe('demo.auth0.com');
    });

    it('getActiveTokens returns empty array initially', () => {
      const tokens = vault.getActiveTokens();
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBe(0);
    });

    it('requestToken issues token in demo mode for read action (silent)', async () => {
      const { tokenState, token } = await vault.requestToken(
        'slack',
        'read',
        '#general'
      );

      expect(token).toBeDefined();
      expect(token).toContain('.');
      expect(tokenState.scope).toBe('slack.messages.read');
      expect(tokenState.service).toBe('slack');
      expect(tokenState.status).toBe('active');
    });

    it('requestToken issues token for write action (CIBA)', async () => {
      const { tokenState, token } = await vault.requestToken(
        'slack',
        'write',
        '#general',
        'Hello'
      );

      expect(token).toBeDefined();
      expect(token).toContain('.');
      expect(tokenState.scope).toBe('slack.messages.write');
      expect(tokenState.status).toBe('active');
    });

    it('token expiry is tracked correctly', async () => {
      const { tokenState } = await vault.requestToken(
        'slack',
        'read',
        '#general'
      );

      expect(tokenState.expiresAt).toBeGreaterThan(tokenState.issuedAt);
      expect(tokenState.ttlSeconds).toBe(600);
    });

    it('getActiveTokens returns issued tokens', async () => {
      await vault.requestToken('slack', 'read', '#general');
      const tokens = vault.getActiveTokens();
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('revokeToken removes token from active list', async () => {
      const { tokenState } = await vault.requestToken(
        'slack',
        'read',
        '#general'
      );

      const revoked = await vault.revokeToken(tokenState.tokenId);
      expect(revoked).toBe(true);
    });

    it('revokeAllTokens removes all tokens', async () => {
      await vault.requestToken('slack', 'read', '#general');
      await vault.requestToken('slack', 'read', '#design');

      const count = await vault.revokeAllTokens();
      expect(count).toBe(2);

      const tokens = vault.getActiveTokens();
      expect(tokens.length).toBe(0);
    });
  });
});
