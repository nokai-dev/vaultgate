import { describe, it, expect } from 'vitest';
import {
  getRequiredScope,
  requiresCIBA,
  getCIBABindingMessage,
  listScopeMappings,
} from './scopes.js';

describe('scopes', () => {
  describe('getRequiredScope', () => {
    it('returns correct scope for slack:read', () => {
      expect(getRequiredScope('slack', 'read')).toBe('slack.messages.read');
    });

    it('returns correct scope for slack:write', () => {
      expect(getRequiredScope('slack', 'write')).toBe('slack.messages.write');
    });

    it('returns correct scope for google:write', () => {
      expect(getRequiredScope('google', 'write')).toBe('google.gmail.send');
    });

    it('returns correct scope for github:admin', () => {
      expect(getRequiredScope('github', 'admin')).toBe('github.admin');
    });

    it('returns correct scope for github:read', () => {
      expect(getRequiredScope('github', 'read')).toBe('github.repo.read');
    });

    it('returns correct scope for email:write', () => {
      expect(getRequiredScope('email', 'write')).toBe('email.send');
    });

    it('returns correct scope for google:delete', () => {
      expect(getRequiredScope('google', 'delete')).toBe('google.gmail.delete');
    });

    it('returns correct scope for slack:delete', () => {
      expect(getRequiredScope('slack', 'delete')).toBe('slack.messages.write');
    });

    it('throws for unknown service:action combo', () => {
      expect(() => getRequiredScope('unknown' as any, 'read')).toThrow('No scope mapping found');
    });

    it('throws for unknown action', () => {
      expect(() => getRequiredScope('slack', 'unknown' as any)).toThrow('No scope mapping found');
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
    it('returns correct message for read action', () => {
      const msg = getCIBABindingMessage('slack', 'read', '#general');
      expect(msg).toBe('Read from SLACK #general');
    });

    it('returns correct message for write with body', () => {
      const msg = getCIBABindingMessage('slack', 'write', '#general', 'Hello world');
      expect(msg).toBe('Post to SLACK #general: "Hello world"');
    });

    it('truncates long body to 50 chars', () => {
      const longBody = 'A'.repeat(80);
      const msg = getCIBABindingMessage('slack', 'write', '#general', longBody);
      expect(msg).toContain('...');
      expect(msg.length).toBeLessThan(100);
    });

    it('returns correct message for delete action', () => {
      const msg = getCIBABindingMessage('github', 'delete', 'repo-name');
      expect(msg).toBe('Delete from GITHUB repo-name');
    });

    it('returns correct message for admin action', () => {
      const msg = getCIBABindingMessage('email', 'admin', 'inbox');
      expect(msg).toBe('Admin access on EMAIL inbox');
    });
  });

  describe('listScopeMappings', () => {
    it('returns all scope mappings as array', () => {
      const mappings = listScopeMappings();
      expect(Array.isArray(mappings)).toBe(true);
      expect(mappings.length).toBeGreaterThan(0);
    });

    it('each mapping has service, action, and requiredScope', () => {
      const mappings = listScopeMappings();
      for (const m of mappings) {
        expect(m).toHaveProperty('service');
        expect(m).toHaveProperty('action');
        expect(m).toHaveProperty('requiredScope');
        expect(typeof m.service).toBe('string');
        expect(typeof m.action).toBe('string');
        expect(typeof m.requiredScope).toBe('string');
      }
    });

    it('contains expected slack mappings', () => {
      const mappings = listScopeMappings();
      const slackMappings = mappings.filter(m => m.service === 'slack');
      expect(slackMappings.length).toBeGreaterThanOrEqual(4);
    });

    it('returned array is a copy (not reference to internal state)', () => {
      const mappings1 = listScopeMappings();
      const mappings2 = listScopeMappings();
      expect(mappings1).not.toBe(mappings2);
      expect(mappings1).toEqual(mappings2);
    });
  });
});
