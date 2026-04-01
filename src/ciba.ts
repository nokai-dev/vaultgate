/**
 * CIBA Handler — Real Auth0 Implementation using auth0 SDK
 * Uses AuthenticationClient.backchannel for RFC 8693 CIBA flow
 *
 * Supports two modes:
 * - Real mode: uses auth0 SDK to call Auth0 CIBA endpoints (requires credentials)
 * - Demo mode: falls back to simulated CIBA when no credentials (for testing only)
 */

import { AuthenticationClient } from 'auth0';
import type { ActionType, ServiceType } from './types.js';
import { getCIBABindingMessage, getRequiredScope, requiresCIBA } from './scopes.js';

export interface CIBAConfig {
  domain: string;
  clientId: string;
  clientSecret: string;
  connectionId: string;
  intervalMs: number;
  timeoutMs: number;
  /** User ID or email for CIBA login_hint (e.g. auth0|... or user@example.com) */
  loginHint?: string;
  /** Demo mode: simulate CIBA flow without real Auth0 calls (for testing) */
  demoMode?: boolean;
  /** Demo mode: number of poll cycles before auto-approval fires (default: 3) */
  demoApprovalDelay?: number;
}

export type CIBAStatus = 'approved' | 'denied' | 'expired' | 'pending';

export interface CIBAResult {
  status: CIBAStatus;
  token?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Real CIBA handler using auth0 SDK.
 * Falls back to demo simulation when no credentials are configured.
 */
export class CIBAHandler {
  private auth0: AuthenticationClient | null = null;
  private config: CIBAConfig;
  private demoMode: boolean = false;

  constructor(config: CIBAConfig) {
    // Resolve demoApprovalDelay: explicit config > env var > default (3)
    // TypeScript's Partial<T> makes omitted fields undefined — we must distinguish
    // "user didn't pass it" (undefined) from "user explicitly passed undefined".
    // We check env var only when config value is truly absent (undefined).
    let resolvedDelay = config.demoApprovalDelay;
    if (resolvedDelay === undefined) {
      const envDelay = process.env.DEMO_APPROVAL_DELAY_POLLS;
      resolvedDelay = envDelay !== undefined && !isNaN(Number(envDelay))
        ? Number(envDelay)
        : 3;
    }

    this.config = { ...config, demoApprovalDelay: resolvedDelay };

    // Determine mode: explicit demoMode flag, or missing credentials
    this.demoMode = this.config.demoMode ?? (!config.domain || !config.clientId || !config.clientSecret);

    if (!this.demoMode) {
      this.auth0 = new AuthenticationClient({
        domain: config.domain,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      });
      console.log(`\n🔐 [CIBA] Real Auth0 CIBA mode at ${config.domain}`);
    } else {
      console.log('\n🔓 [CIBA] Running in DEMO MODE — no real Auth0 CIBA calls');
    }
  }

  /**
   * Execute the CIBA flow:
   * 1. POST /bc-authorize → get auth_req_id (real or simulated)
   * 2. Poll GET /oauth/token with auth_req_id until approved/denied/expired
   */
  async requestTokenWithCIBA(
    connectionId: string,
    service: ServiceType,
    action: ActionType,
    target: string,
    body?: string
  ): Promise<CIBAResult> {
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

    if (this.demoMode) {
      return this.runDemoCIBA(connectionId, scope, bindingMessage);
    }

    return this.runRealCIBA(connectionId, scope, bindingMessage);
  }

  private async runRealCIBA(connectionId: string, scope: string, bindingMessage: string): Promise<CIBAResult> {
    // Step 1: Start CIBA authorization request
    let authReqId: string;
    let expiresIn: number;
    let intervalSec: number;

    try {
      const authResponse = await this.auth0!.backchannel.authorize({
        userId: this.config.loginHint ?? '',
        binding_message: bindingMessage.trim(),
        scope: `openid ${scope}`,
        connection: connectionId,
        requested_expiry: Math.floor(this.config.timeoutMs / 1000).toString(),
      });

      authReqId = authResponse.auth_req_id;
      expiresIn = authResponse.expires_in;
      intervalSec = authResponse.interval ?? this.config.intervalMs / 1000;
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string };
      if (error.code === 'invalid_request') {
        const msg = error.message ?? 'User does not have push notifications';
        console.log(`\n🔴 [CIBA] Failed to send push: ${msg}\n`);
        return { status: 'denied', error: msg, errorCode: 'PUSH_NOT_AVAILABLE' };
      }
      throw err;
    }

    // Step 2: Poll for approval
    const startTime = Date.now();
    const intervalMs = intervalSec * 1000;
    const timeoutMs = expiresIn * 1000;

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  [CIBA] WAITING FOR USER APPROVAL...                         ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');

    while (Date.now() - startTime < timeoutMs) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, expiresIn - elapsed);
      const progress = Math.min(elapsed / expiresIn, 1);
      const filled = Math.floor(progress * 40);
      const bar = '█'.repeat(filled) + '░'.repeat(40 - filled);

      const buzzFrames = ['📲', '📳', '📲', '📳'];
      const buzz = buzzFrames[Math.floor(elapsed / Math.max(1, Math.floor(intervalSec)))];

      if (elapsed < 3) {
        console.log(`║  ${buzz} AWAITING...         ${bar} ${remaining}s left  ║`);
      } else if (elapsed < 6) {
        console.log(`║  ${buzz} CHECK PHONE!        ${bar} ${remaining}s left  ║`);
      } else if (elapsed < 9) {
        console.log(`║  ${buzz} TAP APPROVE          ${bar} ${remaining}s left  ║`);
      } else {
        console.log(`║  ${buzz} STILL WAITING...     ${bar} ${remaining}s left  ║`);
      }

      try {
        const tokenResponse = await this.auth0!.backchannel.backchannelGrant({
          auth_req_id: authReqId,
        });

        console.log('╠══════════════════════════════════════════════════════════════╣');
        console.log('║  ✅ APPROVED! User granted consent on Auth0 Guardian         ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        return {
          status: 'approved',
          token: tokenResponse.access_token,
        };
      } catch (err: unknown) {
        const error = err as { error?: string; error_description?: string };

        if (error.error === 'authorization_pending') {
          await this.sleep(intervalMs);
          continue;
        }

        if (error.error === 'slow_down') {
          await this.sleep(intervalMs * 2);
          continue;
        }

        if (error.error === 'access_denied') {
          console.log('╠══════════════════════════════════════════════════════════════╣');
          console.log('║  ❌ DENIED — User rejected the authorization request         ║');
          console.log('╚══════════════════════════════════════════════════════════════╝\n');
          return { status: 'denied', error: error.error_description ?? 'User denied', errorCode: 'ACCESS_DENIED' };
        }

        if (error.error === 'invalid_grant') {
          console.log('╠══════════════════════════════════════════════════════════════╣');
          console.log('║  ❌ EXPIRED — Authorization request expired                   ║');
          console.log('╚══════════════════════════════════════════════════════════════╝\n');
          return { status: 'expired', error: error.error_description ?? 'Expired', errorCode: 'INVALID_GRANT' };
        }

        throw err;
      }
    }

    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  ⏰ TIMEOUT — No approval received within 60 seconds          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    return { status: 'expired', error: 'CIBA timeout', errorCode: 'TIMEOUT' };
  }

  private async runDemoCIBA(connectionId: string, scope: string, bindingMessage: string): Promise<CIBAResult> {
    // Demo mode: simulate the CIBA poll loop with auto-approval after a few polls
    const startTime = Date.now();
    const maxPolls = Math.floor(this.config.timeoutMs / this.config.intervalMs);
    // Respect the configured delay; if it exceeds maxPolls the timeout will
    // naturally prevent approval (no cap — the while loop exits before that poll)
    const demoApprovalDelay = this.config.demoApprovalDelay ?? 3;
    let pollCount = 0;

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  [CIBA] WAITING FOR USER APPROVAL...                         ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');

    while (pollCount < maxPolls && Date.now() - startTime < this.config.timeoutMs) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, Math.floor((this.config.timeoutMs / 1000) - elapsed));
      const progress = Math.min(pollCount / maxPolls, 1);
      const filled = Math.floor(progress * 40);
      const bar = '█'.repeat(filled) + '░'.repeat(40 - filled);

      const buzzFrames = ['📲', '📳', '📲', '📳'];
      const buzz = buzzFrames[pollCount % buzzFrames.length];

      if (pollCount === 0) {
        console.log(`║  ${buzz} AWAITING...         ${bar} ${remaining}s left  ║`);
      } else if (pollCount === 1) {
        console.log(`║  ${buzz} CHECK PHONE!        ${bar} ${remaining}s left  ║`);
      } else if (pollCount === 2) {
        console.log(`║  ${buzz} TAP APPROVE          ${bar} ${remaining}s left  ║`);
      } else {
        console.log(`║  ${buzz} STILL WAITING...     ${bar} ${remaining}s left  ║`);
      }

      if (pollCount >= demoApprovalDelay) {
        console.log('╠══════════════════════════════════════════════════════════════╣');
        console.log('║  ✅ APPROVED! (Demo mode — auto-approved)                   ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        // Generate a demo token (not a real JWT — for demo/test only)
        const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({
          scope,
          aud: 'vaultgate',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 600,
          jti: `tok_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        })).toString('base64url');
        const signature = 'DEMO_SIGNATURE';

        return {
          status: 'approved',
          token: `${header}.${payload}.${signature}`,
        };
      }

      await this.sleep(this.config.intervalMs);
      pollCount++;
    }

    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  ⏰ TIMEOUT — No approval received within 60 seconds          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    return { status: 'expired', error: 'CIBA timeout', errorCode: 'TIMEOUT' };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  shouldUseCIBA(action: ActionType): boolean {
    return requiresCIBA(action);
  }
}

export function createCIBAHandler(config: CIBAConfig): CIBAHandler {
  return new CIBAHandler(config);
}
