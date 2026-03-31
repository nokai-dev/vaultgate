/**
 * Type & Input Validation Tests
 * Verify that invalid inputs produce correct error messages
 */

import { describe, it, expect } from 'vitest';
import { getRequiredScope, requiresCIBA, getCIBABindingMessage } from './scopes.js';

describe('getRequiredScope validation', () => {
  it('returns correct scope for all valid service/action combinations', () => {
    // Slack
    expect(getRequiredScope('slack', 'read')).toBe('slack.messages.read');
    expect(getRequiredScope('slack', 'write')).toBe('slack.messages.write');
    expect(getRequiredScope('slack', 'delete')).toBe('slack.messages.write');
    expect(getRequiredScope('slack', 'admin')).toBe('slack.admin');

    // Google
    expect(getRequiredScope('google', 'read')).toBe('google.gmail.readonly');
    expect(getRequiredScope('google', 'write')).toBe('google.gmail.send');
    expect(getRequiredScope('google', 'delete')).toBe('google.gmail.delete');
    expect(getRequiredScope('google', 'admin')).toBe('google.admin');

    // GitHub
    expect(getRequiredScope('github', 'read')).toBe('github.repo.read');
    expect(getRequiredScope('github', 'write')).toBe('github.repo.write');
    expect(getRequiredScope('github', 'delete')).toBe('github.repo.delete');
    expect(getRequiredScope('github', 'admin')).toBe('github.admin');

    // Email
    expect(getRequiredScope('email', 'read')).toBe('email.read');
    expect(getRequiredScope('email', 'write')).toBe('email.send');
    expect(getRequiredScope('email', 'delete')).toBe('email.delete');
    expect(getRequiredScope('email', 'admin')).toBe('email.admin');
  });

  it('throws for invalid service', () => {
    expect(() => (getRequiredScope as any)('facebook', 'read')).toThrow(
      'No scope mapping found for facebook:read'
    );
  });

  it('throws for invalid action', () => {
    expect(() => (getRequiredScope as any)('slack', 'share')).toThrow(
      'No scope mapping found for slack:share'
    );
  });

  it('throws for both invalid', () => {
    expect(() => (getRequiredScope as any)('spotify', 'play')).toThrow(
      'No scope mapping found for spotify:play'
    );
  });
});

describe('requiresCIBA', () => {
  it('returns false for read action', () => {
    expect(requiresCIBA('read')).toBe(false);
  });

  it('returns true for write action', () => {
    expect(requiresCIBA('write')).toBe(true);
  });

  it('returns true for delete action', () => {
    expect(requiresCIBA('delete')).toBe(true);
  });

  it('returns true for admin action', () => {
    expect(requiresCIBA('admin')).toBe(true);
  });
});

describe('getCIBABindingMessage', () => {
  it('formats read action correctly', () => {
    const msg = getCIBABindingMessage('slack', 'read', '#general');
    expect(msg).toBe('Read from SLACK #general');
  });

  it('formats write action with body', () => {
    const msg = getCIBABindingMessage('slack', 'write', '#general', 'Hello world');
    expect(msg).toBe('Post to SLACK #general: Hello world');
  });

  it('truncates long body and sanitizes', () => {
    const longBody = 'A'.repeat(100);
    const msg = getCIBABindingMessage('slack', 'write', '#general', longBody);
    expect(msg).toContain('...');
    expect(msg).not.toContain('"');
  });

  it('formats admin action correctly', () => {
    const msg = getCIBABindingMessage('github', 'admin', 'org/repo');
    expect(msg).toBe('Admin access on GITHUB org/repo');
  });

  it('formats without body when not provided', () => {
    const msg = getCIBABindingMessage('email', 'admin', 'inbox');
    expect(msg).toBe('Admin access on EMAIL inbox');
  });
});
