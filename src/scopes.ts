/**
 * Scope Mapper — maps VaultGate actions to minimum OAuth scopes
 * Each service/action combo gets the smallest scope needed
 */

import { ActionType, ServiceType, ScopeMapping } from './types.js';

// Scope mappings for each service/action combination
const SCOPE_MAPPINGS: ScopeMapping[] = [
  // Slack scopes
  { service: 'slack', action: 'read',    requiredScope: 'slack.messages.read' },
  { service: 'slack', action: 'write',   requiredScope: 'slack.messages.write' },
  { service: 'slack', action: 'delete',  requiredScope: 'slack.messages.write' },
  { service: 'slack', action: 'admin',   requiredScope: 'slack.admin' },

  // Google scopes
  { service: 'google', action: 'read',   requiredScope: 'google.gmail.readonly' },
  { service: 'google', action: 'write',  requiredScope: 'google.gmail.send' },
  { service: 'google', action: 'delete', requiredScope: 'google.gmail.delete' },
  { service: 'google', action: 'admin',  requiredScope: 'google.admin' },

  // GitHub scopes
  { service: 'github', action: 'read',   requiredScope: 'github.repo.read' },
  { service: 'github', action: 'write',   requiredScope: 'github.repo.write' },
  { service: 'github', action: 'delete',  requiredScope: 'github.repo.delete' },
  { service: 'github', action: 'admin',   requiredScope: 'github.admin' },

  // Email scopes
  { service: 'email', action: 'read',     requiredScope: 'email.read' },
  { service: 'email', action: 'write',    requiredScope: 'email.send' },
  { service: 'email', action: 'delete',    requiredScope: 'email.delete' },
  { service: 'email', action: 'admin',    requiredScope: 'email.admin' },
];

/**
 * Get the minimum required OAuth scope for a service/action pair
 */
export function getRequiredScope(service: ServiceType, action: ActionType): string {
  const mapping = SCOPE_MAPPINGS.find(
    m => m.service === service && m.action === action
  );

  if (!mapping) {
    throw new Error(`No scope mapping found for ${service}:${action}`);
  }

  return mapping.requiredScope;
}

/**
 * Check if an action requires CIBA step-up authentication
 * Write, delete, and admin actions always require CIBA
 * Read actions use silent token exchange
 */
export function requiresCIBA(action: ActionType): boolean {
  return action === 'write' || action === 'delete' || action === 'admin';
}

/**
 * Get the binding message for CIBA prompt
 * This is what the user sees on their phone
 */
export function getCIBABindingMessage(
  service: ServiceType,
  action: ActionType,
  target: string,
  body?: string
): string {
  const actionVerbs: Record<ActionType, string> = {
    read: 'Read from',
    write: 'Post to',
    delete: 'Delete from',
    admin: 'Admin access on',
  };

  const verb = actionVerbs[action];
  let message = `${verb} ${service.toUpperCase()} ${target}`;

  if (body && body.length > 0) {
    // Truncate body for display
    const truncated = body.length > 50 ? body.substring(0, 47) + '...' : body;
    message += `: "${truncated}"`;
  }

  return message;
}

/**
 * List all available scope mappings (for debugging/docs)
 */
export function listScopeMappings(): ScopeMapping[] {
  return [...SCOPE_MAPPINGS];
}
