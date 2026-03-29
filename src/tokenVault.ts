/**
 * TokenVault — Real Auth0 Token Vault Integration
 * Uses auth0 SDK for M2M token exchange + CIBA for step-up auth
 * Uses @slack/web-api for real Slack API calls
 */

import { AuthenticationClient } from 'auth0';
import { TokenState, ServiceType, ActionType } from './types.js';
import { getRequiredScope, requiresCIBA } from './scopes.js';
import { CIBAHandler, createCIBAHandler, type CIBAConfig } from './ciba.js';
import { SlackClient, createSlackClient } from './slack.js';

export interface TokenVaultConfig {
  domain: string;
  clientId: string;
  clientSecret: string;
  tokenVaultApiId: string;        // e.g. "https://auth0.com/ai/"
  connectionId: string;             // Auth0 connection ID for CIBA
  slackBotToken: string;           // Real Slack bot token
  tokenTtlSeconds: number;
  cibaTimeoutMs: number;
  cibaIntervalMs: number;
  /** User ID or email to pre-fill in CIBA login_hint (e.g. auth0|... or email@example.com) */
  cibaLoginHint?: string;
  /** Demo mode: simulate without real Auth0 calls (for testing) */
  demoMode?: boolean;
}

// In-memory token store with real token data
const activeTokens: Map<string, TokenState> = new Map();

export function resetActiveTokens(): void {
  activeTokens.clear();
}

// Alias for backward compatibility with test files
export const _resetActiveTokens = resetActiveTokens;

export class TokenVault {
  private config: TokenVaultConfig;
  private auth0: AuthenticationClient | null = null;
  private demoMode: boolean = false;
  private cibaHandler: CIBAHandler;
  private slackClient: SlackClient;
  private isConnected: boolean = false;

  constructor(config: Partial<TokenVaultConfig> = {}) {
    this.config = {
      domain: config.domain ?? process.env.AUTH0_DOMAIN ?? '',
      clientId: config.clientId ?? process.env.AUTH0_CLIENT_ID ?? '',
      clientSecret: config.clientSecret ?? process.env.AUTH0_CLIENT_SECRET ?? '',
      tokenVaultApiId: config.tokenVaultApiId ?? process.env.AUTH0_TOKEN_VAULT_API ?? 'https://auth0.com/ai/',
      connectionId: config.connectionId ?? process.env.AUTH0_TOKEN_VAULT_CONNECTION_ID ?? '',
      slackBotToken: config.slackBotToken ?? process.env.SLACK_BOT_TOKEN ?? '',
      tokenTtlSeconds: config.tokenTtlSeconds ?? 600,
      cibaTimeoutMs: config.cibaTimeoutMs ?? 60000,
      cibaIntervalMs: config.cibaIntervalMs ?? 2000,
      cibaLoginHint: config.cibaLoginHint ?? process.env.CIBA_LOGIN_HINT ?? '',
    };

    // Determine demo mode: explicit flag, or implicit when credentials are missing
    const hasCredentials = !!(
      this.config.domain &&
      this.config.clientId &&
      this.config.clientSecret &&
      this.config.connectionId
    );
    this.demoMode = config.demoMode ?? !hasCredentials;

    if (!this.demoMode) {
      this.auth0 = new AuthenticationClient({
        domain: this.config.domain,
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
      });
    }

    const cibaConfig: CIBAConfig = {
      domain: this.config.domain,
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      connectionId: this.config.connectionId,
      intervalMs: this.config.cibaIntervalMs,
      timeoutMs: this.config.cibaTimeoutMs,
      demoMode: this.demoMode,
      loginHint: this.config.cibaLoginHint,
    };
    this.cibaHandler = createCIBAHandler(cibaConfig);

    this.slackClient = createSlackClient({ botToken: this.config.slackBotToken, demoMode: this.demoMode });

    if (!this.demoMode) {
      this.isConnected = true;
      console.log(`\n🔐 [VAULT] Connected to Auth0 at ${this.config.domain}`);
      console.log(`   Token Vault API: ${this.config.tokenVaultApiId}`);
      console.log(`   Connection: ${this.config.connectionId}`);
      if (this.config.slackBotToken && this.config.slackBotToken.startsWith('xoxb-')) {
        console.log(`   Slack: ${this.config.slackBotToken.substring(0, 12)}...\n`);
      } else if (this.config.slackBotToken) {
        console.warn('\n⚠️  [VAULT] Slack bot token does not start with xoxb- — may fail');
      }
    } else {
      this.isConnected = false;
      console.warn('\n⚠️  [VAULT] Running in DEMO MODE — no real Auth0 credentials');
      console.warn('   Set AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET,');
      console.warn('   AUTH0_TOKEN_VAULT_CONNECTION_ID, SLACK_BOT_TOKEN for real mode\n');
    }
  }

  /**
   * Request a scoped token for the given service/action
   * READ: silent M2M token exchange (no CIBA)
   * WRITE/DELETE/ADMIN: CIBA step-up authentication first
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

    if (useCIBA) {
      // CIBA flow — wait for human approval
      console.log('\n🔐 [VAULT] Initiating CIBA step-up authentication...\n');

      const cibaResult = await this.cibaHandler.requestTokenWithCIBA(
        this.config.connectionId,
        service,
        action,
        target,
        body
      );

      if (cibaResult.status !== 'approved' || !cibaResult.token) {
        const errorMsg = cibaResult.error ?? `CIBA failed with status: ${cibaResult.status}`;
        throw new Error(errorMsg);
      }

      token = cibaResult.token;
    } else {
      // Silent M2M token exchange
      console.log('\n🔐 [VAULT] Silent token exchange via Auth0 M2M...\n');
      token = await this.fetchM2MToken(scope);
    }

    // Create token state
    const tokenState = this.createTokenState(scope, service, 'active');
    activeTokens.set(tokenState.tokenId, tokenState);

    console.log('\n✅ [VAULT] Token issued successfully!');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│  [VAULT] TOKEN DETAILS                                       │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│  Token ID: ${tokenState.tokenId.padEnd(43)}│`);
    console.log(`│  Scope:    ${scope.padEnd(43)}│`);
    console.log(`│  Service:  ${service.padEnd(43)}│`);
    console.log(`│  TTL:      ${tokenState.ttlSeconds}s (expires ${new Date(tokenState.expiresAt).toISOString()})`.padEnd(61) + '│');
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    return { tokenState, token };
  }

  /**
   * Execute a Slack action with the scoped token
   */
  async executeSlackAction(
    token: string,
    target: string,
    text: string
  ): Promise<{ ok: boolean; channel: string; ts: string }> {
    return this.slackClient.postMessage(token, target, text);
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
    for (const [, token] of activeTokens) {
      token.status = 'revoked';
    }
    activeTokens.clear();
    console.log(`\n🔴 [VAULT] Revoked ${count} active token(s)\n`);
    return count;
  }

  /**
   * Get all active (non-expired) tokens
   */
  getActiveTokens(): TokenState[] {
    const now = Date.now();
    const tokens: TokenState[] = [];

    for (const [tokenId, token] of activeTokens) {
      if (token.expiresAt <= now && token.status === 'active') {
        token.status = 'expired';
        activeTokens.delete(tokenId);
      } else {
        tokens.push(token);
      }
    }

    return tokens;
  }

  isVaultConnected(): boolean {
    return this.isConnected;
  }

  getConnectionInfo(): { domain: string; connectionId: string; demoMode: boolean } {
    return {
      domain: this.config.domain || 'demo.auth0.com',
      connectionId: this.config.connectionId || 'slack',
      demoMode: this.demoMode,
    };
  }

  /**
   * Fetch a real M2M token from Auth0 using client credentials grant
   * The token is specific to the Token Vault API (https://auth0.com/ai/)
   */
  private async fetchM2MToken(scope: string): Promise<string> {
    if (this.demoMode) {
      return this.generateDemoToken(scope);
    }

    try {
      // Type assertion needed: scope IS supported by the OAuth spec and runtime
      // but ClientCredentialsGrantRequest type doesn't include it
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await this.auth0!.oauth.clientCredentialsGrant({
        audience: this.config.tokenVaultApiId,
        scope,
      } as any);

      return response.data.access_token;
    } catch (err: unknown) {
      const error = err as { message?: string; original?: { message?: string } };
      const msg = error.message ?? error.original?.message ?? 'Unknown error';
      console.error(`\n🔴 [VAULT] M2M token fetch failed: ${msg}`);
      throw new Error(`M2M token exchange failed: ${msg}`);
    }
  }

  private generateDemoToken(scope: string): string {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      scope,
      aud: 'vaultgate-demo',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.config.tokenTtlSeconds,
      jti: `tok_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    })).toString('base64url');
    return `${header}.${payload}.DEMO_SIGNATURE`;
  }

  private createTokenState(
    scope: string,
    service: ServiceType,
    status: TokenState['status']
  ): TokenState {
    const now = Date.now();
    return {
      tokenId: `tok_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      scope,
      service,
      issuedAt: now,
      expiresAt: now + this.config.tokenTtlSeconds * 1000,
      ttlSeconds: this.config.tokenTtlSeconds,
      status,
    };
  }
}

export function createTokenVault(config?: Partial<TokenVaultConfig>): TokenVault {
  return new TokenVault(config);
}
