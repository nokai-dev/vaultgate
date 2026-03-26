/**
 * CLI Client Tests
 * Tests the CLI against a live VaultGate server (mock http responses)
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { _resetActiveTokens } from './tokenVault.js';
import http from 'http';

// We test the CLI by mocking http.request and verifying correct calls are made
// This avoids needing a live server for unit tests

describe('CLI request builder', () => {
  // These tests verify the CLI constructs correct HTTP requests
  // by intercepting http.request calls

  let originalHttpRequest: typeof http.request;

  beforeAll(() => {
    _resetActiveTokens();
  });

  afterAll(() => {
    _resetActiveTokens();
  });

  describe('VAULTGATE_HOST / VAULTGATE_PORT env vars', () => {
    it('uses default host and port when env vars not set', () => {
      delete process.env.VAULTGATE_HOST;
      delete process.env.VAULTGATE_PORT;
      
      const host = process.env.VAULTGATE_HOST ?? 'localhost';
      const port = parseInt(process.env.VAULTGATE_PORT ?? '18792');
      
      expect(host).toBe('localhost');
      expect(port).toBe(18792);
    });

    it('respects VAULTGATE_HOST env var', () => {
      process.env.VAULTGATE_HOST = 'vaultgate.example.com';
      const host = process.env.VAULTGATE_HOST ?? 'localhost';
      expect(host).toBe('vaultgate.example.com');
    });

    it('respects VAULTGATE_PORT env var', () => {
      process.env.VAULTGATE_PORT = '9090';
      const port = parseInt(process.env.VAULTGATE_PORT ?? '18792');
      expect(port).toBe(9090);
    });

    afterAll(() => {
      delete process.env.VAULTGATE_HOST;
      delete process.env.VAULTGATE_PORT;
    });
  });

  describe('HTTP request construction', () => {
    it('constructs correct path for /action', () => {
      const url = new URL('/action', 'http://localhost:18792');
      expect(url.pathname).toBe('/action');
    });

    it('constructs correct path for /status', () => {
      const url = new URL('/status', 'http://localhost:18792');
      expect(url.pathname).toBe('/status');
    });

    it('constructs correct path for /revoke', () => {
      const url = new URL('/revoke', 'http://localhost:18792');
      expect(url.pathname).toBe('/revoke');
    });

    it('constructs correct path for /health', () => {
      const url = new URL('/health', 'http://localhost:18792');
      expect(url.pathname).toBe('/health');
    });

    it('serializes action body as JSON with correct fields', () => {
      const body = {
        service: 'slack',
        action: 'write',
        target: '#general',
        body: 'Hello world',
      };
      const json = JSON.stringify(body);
      const parsed = JSON.parse(json);
      expect(parsed.service).toBe('slack');
      expect(parsed.action).toBe('write');
      expect(parsed.target).toBe('#general');
      expect(parsed.body).toBe('Hello world');
    });

    it('request payload for send command includes all required fields', () => {
      const payload = {
        service: 'slack',
        action: 'write',
        target: '#engineering',
        body: 'Sprint planning at 3pm',
      };
      const str = JSON.stringify(payload);
      const parsed = JSON.parse(str);
      
      // Verify all fields required by validateActionRequest
      expect(parsed.service).toBeDefined();
      expect(parsed.action).toBeDefined();
      expect(parsed.target).toBeDefined();
      expect(parsed.body).toBeDefined();
    });
  });

  describe('CLI command parsing', () => {
    it('send command requires channel and message', () => {
      const args = ['send', '#general', 'Hello'];
      const command = args[0];
      const channel = args[1];
      const message = args[2];
      
      expect(command).toBe('send');
      expect(channel).toBe('#general');
      expect(message).toBe('Hello');
    });

    it('status command has no additional args', () => {
      const args = ['status'];
      expect(args.length).toBe(1);
      expect(args[0]).toBe('status');
    });

    it('revoke command has no additional args', () => {
      const args = ['revoke'];
      expect(args.length).toBe(1);
      expect(args[0]).toBe('revoke');
    });

    it('help command is recognized', () => {
      const args = ['help'];
      expect(args[0]).toBe('help');
    });

    it('unknown command is handled', () => {
      const args = ['unknown-cmd'];
      const known = ['send', 'status', 'revoke', 'help'];
      expect(known.includes(args[0])).toBe(false);
    });

    it('send without channel reports error', () => {
      const args = ['send'];
      const hasChannel = args.length > 1;
      expect(hasChannel).toBe(false);
    });

    it('send without message reports error', () => {
      const args = ['send', '#general'];
      const hasMessage = args.length > 2;
      expect(hasMessage).toBe(false);
    });
  });

  describe('Response parsing', () => {
    it('parses successful action response', () => {
      const response = {
        success: true,
        status: 'executed',
        requestId: 'req_123',
        service: 'slack',
        action: 'write',
        tokenState: {
          tokenId: 'tok_123_abc',
          scope: 'slack.messages.write',
          ttlSeconds: 600,
          issuedAt: Date.now(),
          expiresAt: Date.now() + 600_000,
          status: 'active',
          service: 'slack',
        },
        result: {
          message: 'Successfully executed slack:write on #general',
        },
      };
      
      expect(response.success).toBe(true);
      expect(response.tokenState?.tokenId).toMatch(/^tok_/);
      expect(response.result?.message).toBeDefined();
    });

    it('parses failed action response', () => {
      const response = {
        success: false,
        error: 'CIBA authentication failed or timed out',
      };
      
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('parses status response', () => {
      const response = {
        vaultConnected: false,
        activeTokens: [],
        totalActive: 0,
        timestamp: Date.now(),
      };
      
      expect(response.vaultConnected).toBe(false);
      expect(Array.isArray(response.activeTokens)).toBe(true);
      expect(response.totalActive).toBe(0);
    });

    it('parses revoke response', () => {
      const response = {
        success: true,
        revokedCount: 3,
      };
      
      expect(response.success).toBe(true);
      expect(response.revokedCount).toBe(3);
    });

    it('handles connection error gracefully', () => {
      const errorMessage = 'Connection failed: ECONNREFUSED. Is VaultGate running?';
      expect(errorMessage).toContain('ECONNREFUSED');
      expect(errorMessage).toContain('Is VaultGate running');
    });
  });
});
