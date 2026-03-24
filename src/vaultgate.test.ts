import { describe, it, expect, beforeEach } from 'vitest';
import { VaultGate } from './vaultgate.js';
import { TokenVault } from './tokenVault.js';

describe('vaultgate', () => {
  let vault: TokenVault;
  let gate: VaultGate;

  beforeEach(() => {
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

    it('getStatus returns correct state', () => {
      const status = gate.getStatus();

      expect(status).toBeDefined();
      expect(status.vaultConnected).toBe(false);
      expect(Array.isArray(status.activeTokens)).toBe(true);
      expect(typeof status.totalActive).toBe('number');
      expect(typeof status.timestamp).toBe('number');
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

    it('requestCount increments after executeAction', async () => {
      expect(gate.getRequestCount()).toBe(0);

      await gate.executeAction({
        service: 'slack',
        action: 'read',
        target: '#general',
      });

      expect(gate.getRequestCount()).toBe(1);
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
  });
});
