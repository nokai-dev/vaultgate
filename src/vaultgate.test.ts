import { describe, it, expect, beforeEach } from 'vitest';
import { VaultGate } from './vaultgate.js';
import { TokenVault, _resetActiveTokens } from './tokenVault.js';

describe('vaultgate', () => {
  let vault: TokenVault;
  let gate: VaultGate;

  beforeEach(() => {
    _resetActiveTokens();
    vault = new TokenVault({
      tokenTtlSeconds: 600,
      cibaTimeoutMs: 2000,
      cibaIntervalMs: 50,
    });
    gate = new VaultGate(vault);
  });

  describe('VaultGate', () => {
    it('executeAction with read returns success', async () => {
      const result = await gate.executeAction({
        service: 'slack',
        action: 'read',
        target: '#general',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('executed');
      expect(result.requestId).toBeDefined();
      expect(result.service).toBe('slack');
      expect(result.action).toBe('read');
    });

    it('executeAction with write triggers CIBA and returns success', async () => {
      const result = await gate.executeAction({
        service: 'slack',
        action: 'write',
        target: '#general',
        body: 'Test message',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('executed');
      expect(result.requestId).toBeDefined();
      expect(result.tokenState).toBeDefined();
    });

    it('executeAction includes tokenState in response', async () => {
      const result = await gate.executeAction({
        service: 'github',
        action: 'write',
        target: 'my-repo',
        body: 'Commit changes',
      });

      expect(result.tokenState).toBeDefined();
      expect(result.tokenState!.scope).toBe('github.repo.write');
      expect(result.tokenState!.service).toBe('github');
    });

    it('getStatus returns correct state', () => {
      const status = gate.getStatus();

      expect(status).toBeDefined();
      expect(status.vaultConnected).toBe(false);
      expect(Array.isArray(status.activeTokens)).toBe(true);
      expect(typeof status.totalActive).toBe('number');
      expect(typeof status.timestamp).toBe('number');
    });

    it('getStatus reflects active tokens', async () => {
      await gate.executeAction({
        service: 'slack',
        action: 'read',
        target: '#general',
      });

      // setImmediate causes revocation to happen after the action returns
      // Wait for the revocation to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      const status = gate.getStatus();
      expect(status.totalActive).toBe(0); // Auto-revoked after use
    });

    it('revokeAll works and returns count', async () => {
      await gate.executeAction({
        service: 'slack',
        action: 'read',
        target: '#general',
      });

      const count = await gate.revokeAll();
      expect(count).toBe(1);

      const status = gate.getStatus();
      expect(status.totalActive).toBe(0);
    });

    it('revokeAll on fresh vault returns 0', async () => {
      const count = await gate.revokeAll();
      expect(count).toBe(0);
    });

    it('requestCount increments after executeAction', async () => {
      expect(gate.getRequestCount()).toBe(0);

      await gate.executeAction({
        service: 'slack',
        action: 'read',
        target: '#general',
      });

      expect(gate.getRequestCount()).toBe(1);

      await gate.executeAction({
        service: 'slack',
        action: 'write',
        target: '#general',
        body: 'Hello',
      });

      expect(gate.getRequestCount()).toBe(2);
    });

    it('executeAction returns correct service and action in response', async () => {
      const result = await gate.executeAction({
        service: 'github',
        action: 'write',
        target: 'repo-name',
        body: 'Commit changes',
      });

      expect(result.service).toBe('github');
      expect(result.action).toBe('write');
      expect(result.success).toBe(true);
    });

    it('executeAction works for google service', async () => {
      const result = await gate.executeAction({
        service: 'google',
        action: 'write',
        target: 'inbox',
        body: 'Test email',
      });

      expect(result.success).toBe(true);
      expect(result.service).toBe('google');
    });

    it('executeAction works for email service', async () => {
      const result = await gate.executeAction({
        service: 'email',
        action: 'write',
        target: 'user@example.com',
        body: 'Test email',
      });

      expect(result.success).toBe(true);
      expect(result.service).toBe('email');
    });

    it('executeAction includes result object on success', async () => {
      const result = await gate.executeAction({
        service: 'slack',
        action: 'read',
        target: '#general',
      });

      expect(result.result).toBeDefined();
      expect(result.result!.message).toBeDefined();
    });

    it('executeAction sets status to executed on success', async () => {
      const result = await gate.executeAction({
        service: 'slack',
        action: 'read',
        target: '#general',
      });

      expect(result.status).toBe('executed');
    });

    it('executeAction sets unique requestId per call', async () => {
      const r1 = await gate.executeAction({ service: 'slack', action: 'read', target: '#a' });
      const r2 = await gate.executeAction({ service: 'slack', action: 'read', target: '#b' });
      expect(r1.requestId).not.toBe(r2.requestId);
    });

    it('works with github read action (no CIBA)', async () => {
      const result = await gate.executeAction({
        service: 'github',
        action: 'read',
        target: 'my-repo',
      });
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });

    it('executeAction for delete action triggers CIBA', async () => {
      const result = await gate.executeAction({
        service: 'slack',
        action: 'delete',
        target: '#general',
        body: 'Delete message',
      });
      expect(result.success).toBe(true);
      expect(result.tokenState).toBeDefined();
      expect(result.tokenState!.scope).toBe('slack.messages.write');
    });
  });
});
