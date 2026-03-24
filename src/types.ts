/**
 * VaultGate Type Definitions
 * Core types for the Auth0 Token Vault gateway
 */

// Action types that VaultGate can handle
export type ActionType = 'read' | 'write' | 'delete' | 'admin';

// Supported services
export type ServiceType = 'slack' | 'google' | 'github' | 'email';

// Scope mapping for each service/action combination
export interface ScopeMapping {
  service: ServiceType;
  action: ActionType;
  requiredScope: string;
}

// Token state tracking
export interface TokenState {
  tokenId: string;
  scope: string;
  service: ServiceType;
  issuedAt: number;
  expiresAt: number;
  ttlSeconds: number;
  status: 'pending' | 'active' | 'expired' | 'revoked';
}

// CIBA poll result
export interface CIBAPollResult {
  status: 'pending' | 'approved' | 'denied' | 'expired';
  token?: string;
  error?: string;
}

// VaultGate action request from CLI/client
export interface ActionRequest {
  service: ServiceType;
  action: ActionType;
  target: string;        // e.g., "#channel" for Slack, "email@example.com" for email
  body?: string;         // Message content for write actions
  options?: {
    cibaTimeoutMs?: number;
    intervalMs?: number;
  };
}

// VaultGate action response
export interface ActionResponse {
  success: boolean;
  requestId: string;
  service: ServiceType;
  action: ActionType;
  status: 'pending' | 'approved' | 'executed' | 'denied' | 'error';
  tokenState?: TokenState;
  result?: {
    serviceResponse: unknown;
    message?: string;
  };
  error?: string;
  cibaBindingMessage?: string;
}

// Status dashboard response
export interface StatusResponse {
  vaultConnected: boolean;
  activeTokens: TokenState[];
  totalActive: number;
  timestamp: number;
}

// Environment configuration
export interface VaultGateConfig {
  port: number;
  host: string;
  auth0: {
    domain: string;
    clientId: string;
    clientSecret: string;
    tokenVaultConnectionId: string;
  };
  ciba: {
    defaultTimeoutMs: number;
    defaultIntervalMs: number;
  };
  tokenTtlSeconds: number;
}
