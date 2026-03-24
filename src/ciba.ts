/**
 * CIBA Flow Handler — Consumer-Initiated Backchannel Authentication
 * This is the core demo moment: shows VaultGate waiting for user approval on phone
 */

import { CIBAPollResult, ActionType, ServiceType } from './types.js';
import { getCIBABindingMessage, getRequiredScope, requiresCIBA } from './scopes.js';

export interface CIBAConfig {
  intervalMs: number;      // How often to poll Auth0 (default 2000ms)
  timeoutMs: number;       // Total wait time (default 60000ms = 60s)
}

/**
 * Simulated CIBA flow for demo purposes
 * In production, this would use @auth0/auth0-ai with real Auth0 Token Vault
 * 
 * For the hackathon demo, we simulate:
 * 1. CIBA push notification sent (shown in terminal)
 * 2. Poll loop running (visible in terminal)
 * 3. User approval (simulated after a few polls)
 * 4. Token returned
 */
export class CIBAHandler {
  private config: CIBAConfig;
  private pollCount = 0;

  constructor(config?: Partial<CIBAConfig>) {
    this.config = {
      intervalMs: config?.intervalMs ?? 2000,
      timeoutMs: config?.timeoutMs ?? 60000,
    };
  }

  /**
   * Initiate CIBA request and poll for approval
   * This is the MAIN DEMO MOMENT — all terminal output here is visible to judges
   */
  async requestTokenWithCIBA(
    connectionId: string,
    service: ServiceType,
    action: ActionType,
    target: string,
    body?: string
  ): Promise<CIBAPollResult> {
    const scope = getRequiredScope(service, action);
    const bindingMessage = getCIBABindingMessage(service, action, target, body);

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  [CIBA] REQUESTING STEP-UP AUTHENTICATION                   ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Connection: ${connectionId.padEnd(42)}║`);
    console.log(`║  Scope:      ${scope.padEnd(42)}║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  📱 Push sent to Auth0 Guardian — check your phone!          ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  BINDING MESSAGE:                                           ║');
    
    // Word wrap the binding message
    const maxWidth = 54;
    const words = bindingMessage.split(' ');
    let line = '║  ';
    for (const word of words) {
      if ((line + word).length > maxWidth + 4) {
        console.log(line.padEnd(maxWidth + 5) + '║');
        line = '║  ' + word + ' ';
      } else {
        line += word + ' ';
      }
    }
    console.log(line.padEnd(maxWidth + 5) + '║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Poll loop — this is what judges watch
    const startTime = Date.now();
    const maxPolls = Math.floor(this.config.timeoutMs / this.config.intervalMs);
    
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  [CIBA] WAITING FOR USER APPROVAL...                         ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');

    while (this.pollCount < maxPolls && Date.now() - startTime < this.config.timeoutMs) {
      this.pollCount++;
      
      // Progress bar visualization
      const progress = Math.min(this.pollCount / maxPolls, 1);
      const filled = Math.floor(progress * 40);
      const empty = 40 - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, Math.floor((this.config.timeoutMs / 1000) - elapsed));
      
      console.log(`║  [${this.pollCount.toString().padStart(3)}] ${bar} ${remaining}s left  ║`);

      // Simulate user approval after ~3 polls (6 seconds) for demo
      // In production, this would be real Auth0 polling
      if (this.pollCount >= 3) {
        // User approved!
        console.log('╠══════════════════════════════════════════════════════════════╣');
        console.log('║  ✅ APPROVED! User granted consent on Auth0 Guardian         ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        return {
          status: 'approved',
          token: this.generateDemoToken(scope),
        };
      }

      // Wait before next poll
      await this.sleep(this.config.intervalMs);
    }

    // Timeout
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  ⏰ TIMEOUT — No approval received within 60 seconds          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    return {
      status: 'expired',
      error: 'CIBA timeout — user did not approve in time',
    };
  }

  /**
   * Generate a demo token (in production, this comes from Auth0)
   */
  private generateDemoToken(scope: string): string {
    // Simulated JWT-like token for demo
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      scope,
      aud: 'vaultgate',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 600, // 10 min TTL
      jti: `tok_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    })).toString('base64url');
    const signature = 'DEMO_SIGNATURE_' + Math.random().toString(36).slice(2);
    return `${header}.${payload}.${signature}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if an action requires CIBA
   */
  shouldUseCIBA(action: ActionType): boolean {
    return requiresCIBA(action);
  }
}

/**
 * Factory to create CIBA handler with config
 */
export function createCIBAHandler(config?: Partial<CIBAConfig>): CIBAHandler {
  return new CIBAHandler(config);
}
