/**
 * createVaultGate Factory Function Tests
 * Tests: no-arg, TokenVault instance, config object, demo mode detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createVaultGate, VaultGate } from './vaultgate.js';
import { TokenVault, _resetActiveTokens } from './tokenVault.js';

describe('createVaultGate factory', () => {
  beforeEach(() => {
    _resetActiveTokens();
  });

  describe('no arguments — creates demo VaultGate', () => {
    it('returns a VaultGate instance', () => {
      const gate = createVaultGate();
      expect(gate).toBeInstanceOf(VaultGate);
    });

    it('executeAction works in demo mode', async () => {
      const gate = createVaultGate();
      const result = await gate.executeAction({
        service: 'slack',
        action: 'read',
        target: '#test',
      });
      expect(result.success).toBe(true);
    });

    it('getStatus works', () => {
      const gate = createVaultGate();
      const status = gate.getStatus();
      expect(status.vaultConnected).toBe(false);
      expect(status.totalActive).toBeGreaterThanOrEqual(0);
    });
  });

  describe('TokenVault instance passed — uses it directly', () => {
    it('wraps the provided TokenVault', () => {
      const vault = new TokenVault({
        demoMode: true,
        tokenTtlSeconds: 600,
        cibaTimeoutMs: 5000,
        cibaIntervalMs: 100,
      });
      const gate = createVaultGate(vault);
      expect(gate).toBeInstanceOf(VaultGate);
    });

    it('uses the custom config from provided TokenVault', async () => {
      const vault = new TokenVault({
        demoMode: true,
        tokenTtlSeconds: 300,
        cibaTimeoutMs: 5000,
        cibaIntervalMs: 100,
      });
      const gate = createVaultGate(vault);
      const result = await gate.executeAction({
        service: 'slack',
        action: 'read',
        target: '#test',
      });
      expect(result.success).toBe(true);
    });

    it('request count is tracked', async () => {
      const vault = new TokenVault({ demoMode: true });
      const gate = createVaultGate(vault);
      expect(gate.getRequestCount()).toBe(0);
      await gate.executeAction({ service: 'slack', action: 'read', target: '#a' });
      expect(gate.getRequestCount()).toBe(1);
    });
  });

  describe('config object with demoMode — creates TokenVault then VaultGate', () => {
    it('accepts { demoMode: true }', () => {
      const gate = createVaultGate({ demoMode: true });
      expect(gate).toBeInstanceOf(VaultGate);
    });

    it('executeAction works with demoMode config', async () => {
      const gate = createVaultGate({ demoMode: true });
      const result = await gate.executeAction({
        service: 'slack',
        action: 'read',
        target: '#test',
      });
      expect(result.success).toBe(true);
    });

    it('getStatus returns demo mode', () => {
      const gate = createVaultGate({ demoMode: true });
      const status = gate.getStatus();
      expect(status.vaultConnected).toBe(false);
    });

    it('works with cibaTimeoutMs and cibaIntervalMs', async () => {
      const gate = createVaultGate({
        demoMode: true,
        cibaTimeoutMs: 5000,
        cibaIntervalMs: 100,
      });
      const result = await gate.executeAction({
        service: 'slack',
        action: 'write',
        target: '#test',
        body: 'test',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('new VaultGate() — direct instantiation', () => {
    it('with no args works', () => {
      const gate = new VaultGate();
      expect(gate).toBeInstanceOf(VaultGate);
    });

    it('with TokenVault instance works', () => {
      const vault = new TokenVault({ demoMode: true });
      const gate = new VaultGate(vault);
      expect(gate).toBeInstanceOf(VaultGate);
    });
  });
});
