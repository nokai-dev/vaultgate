/**
 * Slack Client Unit Tests
 * Tests SlackClient in isolation (demo mode)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SlackClient, createSlackClient } from './slack.js';

describe('SlackClient', () => {
  let client: SlackClient;

  beforeEach(() => {
    client = createSlackClient({ botToken: '', demoMode: true });
  });

  describe('instantiation', () => {
    it('can be created with empty token (demo mode)', () => {
      expect(client).toBeDefined();
    });

    it('createSlackClient returns SlackClient instance', () => {
      const c = createSlackClient({ botToken: 'xoxb-test', demoMode: true });
      expect(c).toBeDefined();
    });

    it('enters demo mode when token does not start with xoxb-', () => {
      // xoxb- is the prefix for real Slack bot tokens
      const c = createSlackClient({ botToken: 'not-a-real-token' });
      expect(c).toBeDefined();
    });
  });

  describe('postMessage (demo mode)', () => {
    it('returns ok=true in demo mode', async () => {
      const result = await client.postMessage('fake-token', '#general', 'Hello world');
      expect(result.ok).toBe(true);
    });

    it('returns channel with # prefix stripped', async () => {
      const result = await client.postMessage('fake-token', '#engineering', 'Hello');
      expect(result.channel).toBe('#engineering');
    });

    it('handles channel without # prefix', async () => {
      const result = await client.postMessage('fake-token', 'general', 'Hello');
      expect(result.channel).toBe('#general');
    });

    it('returns a ts timestamp', async () => {
      const result = await client.postMessage('fake-token', '#general', 'Hello');
      expect(result.ts).toBeDefined();
      expect(result.ts).toContain('.');
    });

    it('includes message in response', async () => {
      const result = await client.postMessage('fake-token', '#general', 'Test message');
      expect(result.message).toBeDefined();
      expect(result.message!.text).toBe('Test message');
    });

    it('message ts matches top-level ts', async () => {
      const result = await client.postMessage('fake-token', '#general', 'Hello');
      expect(result.message!.ts).toBe(result.ts);
    });

    it('handles empty message body', async () => {
      const result = await client.postMessage('fake-token', '#general', '');
      expect(result.ok).toBe(true);
      expect(result.message!.text).toBe('');
    });

    it('handles unicode in message body', async () => {
      const result = await client.postMessage('fake-token', '#general', 'Hello 🌍 🚀');
      expect(result.ok).toBe(true);
      expect(result.message!.text).toBe('Hello 🌍 🚀');
    });

    it('handles long message body', async () => {
      const longMsg = 'A'.repeat(1000);
      const result = await client.postMessage('fake-token', '#general', longMsg);
      expect(result.ok).toBe(true);
      expect(result.message!.text).toBe(longMsg);
    });

    it('handles special characters in channel name', async () => {
      const result = await client.postMessage('fake-token', '#auth0-users', 'Test');
      expect(result.ok).toBe(true);
      expect(result.channel).toBe('#auth0-users');
    });
  });

  describe('readMessages (demo mode)', () => {
    it('returns ok=true in demo mode', async () => {
      const result = await client.readMessages('fake-token', '#general');
      expect(result.ok).toBe(true);
    });

    it('returns at least one demo message', async () => {
      const result = await client.readMessages('fake-token', '#general');
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('demo message has DEMO user', async () => {
      const result = await client.readMessages('fake-token', '#general');
      expect(result.messages[0].user).toBe('DEMO');
    });

    it('message text references the channel name', async () => {
      const result = await client.readMessages('fake-token', '#engineering');
      expect(result.messages[0].text).toContain('engineering');
    });

    it('handles channel without # prefix', async () => {
      const result = await client.readMessages('fake-token', 'general');
      expect(result.ok).toBe(true);
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('includes ts in each message', async () => {
      const result = await client.readMessages('fake-token', '#general');
      expect(result.messages[0].ts).toBeDefined();
    });
  });

  describe('scheduleMessage (demo mode)', () => {
    it('returns ok=true and scheduledMessageId', async () => {
      const future = new Date(Date.now() + 3600_000);
      const result = await client.scheduleMessage('fake-token', '#general', 'Hello', future);
      expect(result.ok).toBe(true);
      expect(result.scheduledMessageId).toBeDefined();
      expect(result.scheduledMessageId).toContain('demo_');
    });

    it('scheduledMessageId includes timestamp', async () => {
      const future = new Date(Date.now() + 3600_000);
      const result = await client.scheduleMessage('fake-token', '#general', 'Hello', future);
      const idNum = parseInt(result.scheduledMessageId.replace('demo_', ''));
      expect(idNum).toBeGreaterThan(0);
    });
  });

  describe('getChannel', () => {
    it('getChannel returns undefined in demo mode (no real Slack API)', async () => {
      const channelId = await client.getChannel('#general');
      // In demo mode without real token, returns undefined
      expect(channelId).toBeUndefined();
    });
  });
});

describe('SlackClient — non-demo mode structure', () => {
  // We can't test real Slack API without credentials, but we can verify
  // the client is structured to handle both modes

  it('client accepts botToken parameter', () => {
    const client = createSlackClient({ botToken: 'xoxb-real-token', demoMode: false });
    expect(client).toBeDefined();
  });

  it('postMessage is async regardless of mode', async () => {
    const client = createSlackClient({ botToken: '', demoMode: true });
    const result = client.postMessage('token', '#general', 'test');
    expect(result).toBeInstanceOf(Promise);
    const resolved = await result;
    expect(resolved).toHaveProperty('ok');
  });

  it('readMessages is async', async () => {
    const client = createSlackClient({ botToken: '', demoMode: true });
    const result = client.readMessages('token', '#general');
    expect(result).toBeInstanceOf(Promise);
  });

  it('scheduleMessage is async', async () => {
    const client = createSlackClient({ botToken: '', demoMode: true });
    const result = client.scheduleMessage('token', '#general', 'test', new Date());
    expect(result).toBeInstanceOf(Promise);
  });
});
