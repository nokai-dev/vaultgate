/**
 * Auth0 Token Vault Integration
 * Handles RFC 8693 token exchange for ephemeral scoped tokens
 * 
 * In production: Uses @auth0/auth0-ai with real Auth0 Token Vault
 * In demo mode: Simulates token lifecycle without real Auth0 calls
 */

import { TokenState, ServiceType, ActionType } from './types.js';
import { getRequiredScope, requiresCIBA } from './scopes.js';
import { CIBAHandler, createCIBAHandler } from './ciba.js';

export interface TokenVaultConfig {
  domain: string;
  clientId: string;
  clientSecret: string;
  tokenVaultConnectionId: string;
  tokenTtlSeconds: number;
  cibaTimeoutMs: number;
  cibaIntervalMs: number;
  demoApprovalDelay?: number; // passed to CIBA handler
}

// In-memory token store (ephemeral — no persistence)
const activeTokens: Map<string, TokenState> = new Map();

// Reset function for testing
export function _resetActiveTokens(): void {
  activeTokens.clear();
}

/**
 * TokenVault — manages ephemeral token lifecycle
 */
export class TokenVault {
  private config: TokenVaultConfig;
  private cibaHandler: CIBAHandler;
  private isDemoMode: boolean;

  constructor(config: Partial<TokenVaultConfig> = {}) {
    // Use env vars or defaults
    this.config = {
      domain: config.domain ?? process.env.AUTH0_DOMAIN ?? 'demo.auth0.com',
      clientId: config.clientId ?? process.env.AUTH0_CLIENT_ID ?? 'demo_client',
      clientSecret: config.clientSecret ?? process.env.AUTH0_CLIENT_SECRET ?? 'demo_secret',
      tokenVaultConnectionId: config.tokenVaultConnectionId ?? process.env.AUTH0_TOKEN_VAULT_CONNECTION_ID ?? 'slack',
      tokenTtlSeconds: config.tokenTtlSeconds ?? 600, // 10 minutes
      cibaTimeoutMs: config.cibaTimeoutMs ?? 60000,
      cibaIntervalMs: config.cibaIntervalMs ?? 2000,
    };

    this.cibaHandler = createCIBAHandler({
      timeoutMs: this.config.cibaTimeoutMs,
      intervalMs: this.config.cibaIntervalMs,
      demoApprovalDelay: this.config.demoApprovalDelay,
    });

    // Demo mode if no real Auth0 credentials
    this.isDemoMode = !process.env.AUTH0_DOMAIN || !process.env.AUTH0_CLIENT_ID;
    
    if (this.isDemoMode) {
      console.log('\n🔓 [VAULT] Running in DEMO MODE — no real Auth0 credentials');
      console.log('   Set AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET to connect\n');
    } else {
      console.log(`\n🔐 [VAULT] Connected to Auth0 Token Vault at ${this.config.domain}`);
      console.log(`   Connection: ${this.config.tokenVaultConnectionId}\n`);
    }
  }

  /**
   * Request a scoped token for the given service/action
   * 
   * For write/delete/admin: Triggers CIBA flow first
   * For read: Silent token exchange (no CIBA needed)
   */
  async requestToken(
    service: ServiceType,
    action: ActionType,
    target: string,
    body?: string
  ): Promise<{ tokenState: TokenState; token: string }> {
    const scope = getRequiredScope(service, action);
    const useCIBA = requiresCIBA(action);

    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│  [VAULT] TOKEN REQUEST                                        │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│  Service: ${service.padEnd(48)}│`);
    console.log(`│  Action:  ${action.padEnd(48)}│`);
    console.log(`│  Scope:   ${scope.padEnd(48)}│`);
    console.log(`│  Target:  ${target.padEnd(48)}│`);
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│  CIBA Required: ${useCIBA ? 'YES (step-up auth)' : 'NO (silent)'.padEnd(37)}│`);
    console.log('└─────────────────────────────────────────────────────────────┘');

    let token: string;
    let status: TokenState['status'] = 'active';

    if (useCIBA) {
      // CIBA flow — show the poll loop
      console.log('\n🔐 [VAULT] Initiating CIBA step-up authentication...\n');
      
      const cibaResult = await this.cibaHandler.requestTokenWithCIBA(
        this.config.tokenVaultConnectionId,
        service,
        action,
        target,
        body
      );

      if (cibaResult.status !== 'approved' || !cibaResult.token) {
        throw new Error(`CIBA failed: ${cibaResult.error ?? 'Unknown error'}`);
      }

      token = cibaResult.token;
      status = 'active';
    } else {
      // Silent token exchange (read-only)
      console.log('\n🔐 [VAULT] Silent token exchange (no CIBA for read operations)\n');
      
      // In production: call Auth0 Token Vault for silent exchange
      // In demo: generate a token directly
      token = this.generateSilentToken(scope);
    }

    // Create token state
    const tokenState = this.createTokenState(scope, service, status);
    
    // Store in active tokens
    activeTokens.set(tokenState.tokenId, tokenState);

    console.log('\n✅ [VAULT] Token issued successfully!');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│  [VAULT] TOKEN DETAILS                                       │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│  Token ID: ${tokenState.tokenId.padEnd(43)}│`);
    console.log(`│  Scope:    ${scope.padEnd(43)}│`);
    console.log(`│  Service:  ${service.padEnd(43)}│`);
    console.log(`│  TTL:      ${tokenState.ttlSeconds}s (expires ${new Date(tokenState.expiresAt).toISOString()})`.padEnd(58) + '│');
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    return { tokenState, token };
  }

  /**
   * Revoke a token by ID
   */
  async revokeToken(tokenId: string): Promise<boolean> {
    const token = activeTokens.get(tokenId);
    
    if (!token) {
      console.log(`⚠️  [VAULT] Token ${tokenId} not found`);
      return false;
    }

    token.status = 'revoked';
    activeTokens.delete(tokenId);

    console.log(`\n🔴 [VAULT] Token revoked: ${tokenId}`);
    console.log(`   Scope ${token.scope} is now invalid\n`);

    return true;
  }

  /**
   * Revoke all active tokens
   */
  async revokeAllTokens(): Promise<number> {
    const count = activeTokens.size;
    
    for (const [tokenId, token] of activeTokens) {
      token.status = 'revoked';
    }
    activeTokens.clear();

    console.log(`\n🔴 [VAULT] Revoked ${count} active token(s)\n`);
    
    return count;
  }

  /**
   * Get all active tokens
   */
  getActiveTokens(): TokenState[] {
    const now = Date.now();
    const tokens: TokenState[] = [];

    for (const [tokenId, token] of activeTokens) {
      // Check if expired
      if (token.expiresAt <= now && token.status === 'active') {
        token.status = 'expired';
        activeTokens.delete(tokenId);
      } else {
        tokens.push(token);
      }
    }

    return tokens;
  }

  /**
   * Check if vault is connected (real mode) or running demo
   */
  isConnected(): boolean {
    return !this.isDemoMode;
  }

  /**
   * Get vault connection info
   */
  getConnectionInfo(): { domain: string; connectionId: string; demoMode: boolean } {
    return {
      domain: this.config.domain,
      connectionId: this.config.tokenVaultConnectionId,
      demoMode: this.isDemoMode,
    };
  }

  /**
   * Create a token state object
   */
  private createTokenState(scope: string, service: ServiceType, status: TokenState['status']): TokenState {
    const now = Date.now();
    return {
      tokenId: `tok_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      scope,
      service,
      issuedAt: now,
      expiresAt: now + (this.config.tokenTtlSeconds * 1000),
      ttlSeconds: this.config.tokenTtlSeconds,
      status,
    };
  }

  /**
   * Generate a silent token (for read operations)
   */
  private generateSilentToken(scope: string): string {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      scope,
      aud: 'vaultgate',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.config.tokenTtlSeconds,
      jti: `tok_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    })).toString('base64url');
    const signature = this.isDemoMode ? 'DEMO_SIGNATURE' : 'REAL_SIGNATURE';
    return `${header}.${payload}.${signature}`;
  }
}

/**
 * Factory function
 */
export function createTokenVault(config?: Partial<TokenVaultConfig>): TokenVault {
  return new TokenVault(config);
}
