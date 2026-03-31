/**
 * VaultGate — Main gateway class
 * Intercepts AI agent tool calls, routes through Auth0 Token Vault
 */

import { ActionRequest, ActionResponse, StatusResponse } from './types.js';
import { TokenVault, createTokenVault } from './tokenVault.js';

export class VaultGate {
  private tokenVault: TokenVault;
  private requestCount: number = 0;

  constructor(tokenVault?: TokenVault) {
    this.tokenVault = tokenVault ?? createTokenVault();
  }

  async executeAction(request: ActionRequest): Promise<ActionResponse> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.requestCount++;

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('  VAULTGATE ACTION REQUEST');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`  Request ID: ${requestId}`);
    console.log(`  Service:   ${request.service}`);
    console.log(`  Action:    ${request.action}`);
    console.log(`  Target:    ${request.target}`);
    if (request.body) {
      console.log(`  Body:      "${request.body}"`);
    }
    console.log('═══════════════════════════════════════════════════════════════════\n');

    try {
      const { tokenState, token } = await this.tokenVault.requestToken(
        request.service,
        request.action,
        request.target,
        request.body
      );

      let result: unknown;

      if (request.service === 'slack') {
        // Use the Slack Bot Token from config (not the Auth0 M2M JWT).
        // The Auth0 M2M token is used to request a scoped token via CIBA,
        // but for Slack API calls we need the real Bot Token.
        // Token lifecycle (issue/revoke/expire) is still tracked via Auth0.
        const slackBotToken = this.tokenVault.getSlackBotToken();
        result = await this.tokenVault.executeSlackAction(
          slackBotToken,
          request.target,
          request.body ?? `VaultGate READ check on ${request.target}`
        );
      } else {
        result = { success: true, message: `Executed ${request.action} on ${request.target}` };
      }

      // Auto-revoke after use (ephemeral tokens)
      setImmediate(() => {
        this.tokenVault.revokeToken(tokenState.tokenId);
      });

      console.log('\n═══════════════════════════════════════════════════════════════════');
      console.log('  ACTION COMPLETED');
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log(`  Status: ✅ EXECUTED`);
      console.log(`  Token:  🔒 ${tokenState.tokenId} (auto-revoked)`);
      console.log('═══════════════════════════════════════════════════════════════════\n');

      return {
        success: true,
        requestId,
        service: request.service,
        action: request.action,
        status: 'executed',
        tokenState,
        result: {
          serviceResponse: result,
          message: `Successfully executed ${request.action} on ${request.target}`,
        },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      console.log('\n═══════════════════════════════════════════════════════════════════');
      console.log('  ACTION FAILED');
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log(`  Status: ❌ ERROR`);
      console.log(`  Error:  ${errorMessage}`);
      console.log('═══════════════════════════════════════════════════════════════════\n');

      return {
        success: false,
        requestId,
        service: request.service,
        action: request.action,
        status: 'error',
        error: errorMessage,
      };
    }
  }

  getStatus(): StatusResponse {
    const activeTokens = this.tokenVault.getActiveTokens();
    return {
      vaultConnected: this.tokenVault.isVaultConnected(),
      activeTokens,
      totalActive: activeTokens.length,
      timestamp: Date.now(),
    };
  }

  async revokeAll(): Promise<number> {
    return this.tokenVault.revokeAllTokens();
  }

  getRequestCount(): number {
    return this.requestCount;
  }
}

export function createVaultGate(tokenVault?: TokenVault | { demoMode?: boolean }): VaultGate {
  if (!tokenVault) {
    // No TokenVault passed — create one in demo mode by default
    // Real mode is auto-detected when credentials are present
    const tv = createTokenVault();
    return new VaultGate(tv);
  }
  if (tokenVault instanceof TokenVault) {
    return new VaultGate(tokenVault);
  }
  // Config object passed — create TokenVault with demoMode
  return new VaultGate(createTokenVault(tokenVault as Parameters<typeof createTokenVault>[0]));
}
