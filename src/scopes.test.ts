import { describe, it, expect } from 'vitest';
import { getRequiredScope, requiresCIBA } from './scopes.js';

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

    it('throws for unknown service:action combo', () => {
      expect(() => getRequiredScope('unknown' as any, 'read')).toThrow('No scope mapping found');
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
});
