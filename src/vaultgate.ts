/**
 * VaultGate — Main gateway class
 * Intercepts AI agent tool calls, routes through Auth0 Token Vault
 */

import { ActionRequest, ActionResponse, StatusResponse, ServiceType } from './types.js';
import { TokenVault, createTokenVault } from './tokenVault.js';

// Simulated Slack API (in production, use real Slack SDK)
const SLACK_API_ENDPOINT = 'https://slack.com/api/chat.postMessage';

export class VaultGate {
  private tokenVault: TokenVault;
  private requestCount: number = 0;

  constructor(tokenVault?: TokenVault) {
    this.tokenVault = tokenVault ?? createTokenVault();
  }

  /**
   * Execute an action through VaultGate
   * 1. Map action to required scope
   * 2. Request token (CIBA for writes)
   * 3. Execute API call
   * 4. Return result
   */
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
      // Step 1: Get token (CIBA fires for writes here)
      const { tokenState, token } = await this.tokenVault.requestToken(
        request.service,
        request.action,
        request.target,
        request.body
      );

      // Step 2: Execute the actual API call
      let result: unknown;
      
      if (request.service === 'slack') {
        result = await this.callSlackAPI(token, request);
      } else {
        result = { success: true, message: `Demo: ${request.action} on ${request.target}` };
      }

      // Step 3: Auto-revoke token after use (ephemeral)
      // In production, tokens auto-expire. For demo visibility, we revoke immediately.
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

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
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

  /**
   * Call Slack API with the scoped token
   * In demo mode, simulates the API call
   */
  private async callSlackAPI(token: string, request: ActionRequest): Promise<{ ok: boolean; channel: string; ts: string }> {
    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│  [API] SLACK API CALL                                        │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│  Endpoint: ${SLACK_API_ENDPOINT.padEnd(40)}│`);
    console.log(`│  Method:   POST                                             │`);
    console.log(`│  Token:    ${token.substring(0, 20)}...${token.slice(-10).padStart(10)}│`);
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│  Channel: ${request.target.padEnd(44)}│`);
    console.log(`│  Message: ${(request.body ?? '').substring(0, 44).padEnd(44)}│`);
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    // In demo mode, simulate API response
    await this.sleep(500); // Simulate network latency

    const response = {
      ok: true,
      channel: request.target.replace('#', ''),
      ts: `${Date.now()}.000000`,
      message: {
        type: 'message',
        subtype: 'bot_message',
        text: request.body ?? '',
        ts: `${Date.now()}.000000`,
      },
    };

    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│  [API] SLACK API RESPONSE                                    │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│  ✅ SUCCESS — Message posted to ${request.target.padEnd(22)}│`);
    console.log(`│  Timestamp: ${response.ts.padEnd(38)}│`);
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    return response;
  }

  /**
   * Get vault status
   */
  getStatus(): StatusResponse {
    const activeTokens = this.tokenVault.getActiveTokens();
    const connection = this.tokenVault.getConnectionInfo();

    return {
      vaultConnected: this.tokenVault.isConnected(),
      activeTokens,
      totalActive: activeTokens.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Revoke all tokens
   */
  async revokeAll(): Promise<number> {
    return this.tokenVault.revokeAllTokens();
  }

  /**
   * Get request count (for metrics)
   */
  getRequestCount(): number {
    return this.requestCount;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function
 */
export function createVaultGate(tokenVault?: TokenVault): VaultGate {
  return new VaultGate(tokenVault);
}
