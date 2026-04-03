/**
 * Slack API Client — Real implementation using @slack/web-api
 */

import { WebClient } from '@slack/web-api';
import type { ActionRequest } from './types.js';

export interface SlackMessageResult {
  ok: boolean;
  channel: string;
  ts: string;
  message?: {
    type: string;
    subtype?: string;
    text: string;
    ts: string;
  };
}

export interface SlackConfig {
  botToken: string;
  /** Demo mode: return mock responses without real Slack API calls */
  demoMode?: boolean;
}

/**
 * Real Slack client using @slack/web-api
 * Falls back to mock responses in demo mode (no real Slack API calls)
 */
export class SlackClient {
  private client: WebClient;
  private demoMode: boolean = false;

  constructor(config: SlackConfig) {
    this.client = new WebClient(config.botToken);
    // Demo mode if bot token is missing or clearly fake
    this.demoMode = config.demoMode ?? (!config.botToken || !config.botToken.startsWith('xoxb-'));
    if (this.demoMode) {
      console.warn('\n🔓 [SLACK] Running in DEMO MODE — no real Slack API calls\n');
    }
  }

  /**
   * Post a message to a Slack channel (for write/delete actions)
   */
  async postMessage(
    token: string,
    target: string,
    text: string
  ): Promise<SlackMessageResult> {
    const channel = target.startsWith('#') ? target.slice(1) : target;

    if (this.demoMode) {
      // Demo mode: return a simulated success without calling the Slack API
      const ts = `${Date.now()}.000000`;
      console.log('\n┌─────────────────────────────────────────────────────────────┐');
      console.log('│  [SLACK] DEMO MODE — simulating chat.postMessage             │');
      console.log('├─────────────────────────────────────────────────────────────┤');
      console.log(`│  Channel: ${('#' + channel).substring(0, 50).padEnd(50)}│`);
      console.log(`│  Message: ${text.substring(0, 44).padEnd(50)}│`);
      console.log(`│  Result:  ✅ DEMO — fake timestamp assigned                  │`);
      console.log('└─────────────────────────────────────────────────────────────┘\n');
      return {
        ok: true,
        channel: '#' + channel,
        ts,
        message: {
          type: 'message',
          text,
          ts,
        },
      };
    }

    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│  [SLACK] API CALL                                           │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│  Method:   chat.postMessage                                   │`);
    console.log(`│  Token:    ${token.substring(0, 20)}...${token.slice(-10).padStart(10)}│`);
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│  Channel: ${('#' + channel).substring(0, 50).padEnd(50)}│`);
    const textLines = text.length > 44 ? [text.substring(0, 44)] : [text];
    console.log(`│  Message: ${(textLines[0] ?? '').substring(0, 44).padEnd(50)}│`);
    if (text.length > 44) {
      const remaining = text.substring(44);
      console.log(`│          ${remaining.substring(0, 44).padEnd(50)}│`);
    }
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (this.client.chat.postMessage as any)({
        token,
        channel,
        text,
        unfurl_links: false,
        mrkdwn: true,
      });

      const response: SlackMessageResult = {
        ok: result.ok ?? false,
        channel: result.channel ?? channel,
        ts: result.ts ?? `${Date.now()}`,
        message: result.message ? {
          type: 'message',
          subtype: (result.message as Record<string, unknown>).subtype as string | undefined,
          text: (result.message as Record<string, unknown>).text as string ?? text,
          ts: (result.message as Record<string, unknown>).ts as string ?? result.ts ?? `${Date.now()}`,
        } : undefined,
      };

      console.log('┌─────────────────────────────────────────────────────────────┐');
      console.log('│  [SLACK] API RESPONSE                                        │');
      console.log('├─────────────────────────────────────────────────────────────┤');
      if (response.ok) {
        console.log(`│  ✅ SUCCESS — Message posted to #${channel.padEnd(37)}│`);
        console.log(`│  Timestamp: ${response.ts.padEnd(38)}│`);
      } else {
        console.log(`│  ❌ FAILED                                                   │`);
      }
      console.log('└─────────────────────────────────────────────────────────────┘\n');

      return response;
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string; data?: unknown };
      console.log('┌─────────────────────────────────────────────────────────────┐');
      console.log('│  [SLACK] API ERROR                                           │');
      console.log('├─────────────────────────────────────────────────────────────┤');
      console.log(`│  Error: ${(error.message ?? 'Unknown error').substring(0, 44).padEnd(46)}│`);
      console.log('└─────────────────────────────────────────────────────────────┘\n');

      throw err;
    }
  }

  /**
   * Schedule a message for later delivery
   */
  async scheduleMessage(
    token: string,
    target: string,
    text: string,
    postAt: Date
  ): Promise<{ ok: boolean; scheduledMessageId: string }> {
    if (this.demoMode) {
      return { ok: true, scheduledMessageId: `demo_${Date.now()}` };
    }
    const channel = target.startsWith('#') ? target.slice(1) : target;
    const result = await this.client.chat.scheduleMessage({
      token,
      channel,
      text,
      post_at: Math.floor(postAt.getTime() / 1000).toString(),
    });
    return {
      ok: result.ok ?? false,
      scheduledMessageId: result.scheduled_message_id ?? '',
    };
  }

  /**
   * Get conversation info
   */
  async getChannel(channelName: string): Promise<string | undefined> {
    if (this.demoMode) {
      // Demo mode: return undefined (channel resolution not available without real Slack API)
      return undefined;
    }

    const result = await this.client.conversations.list({
      types: 'public_channel,private_channel',
    });

    const channel = result.channels?.find(
      c => c.name === channelName.replace('#', '')
    );

    return channel?.id;
  }

  /*  /**
   * Read channel info using conversations.list (available scopes).
   * This demonstrates the READ flow: silent M2M token + Slack API call.
   */
  async readMessages(
    token: string,
    target: string,
    limit: number = 5
  ): Promise<{ ok: boolean; messages: Array<{ ts: string; text: string; user: string }> }> {
    const channel = target.startsWith('#') ? target.slice(1) : target;

    if (this.demoMode) {
      console.log('\n+-------------------------------------------------------------+');
      console.log('|  [SLACK] DEMO MODE -- simulating conversations.list           |');
      console.log('+-------------------------------------------------------------+');
      console.log('|  Channel: ' + ('#' + channel).substring(0, 50).padEnd(50) + '|');
      console.log('|  Result:  [OK] DEMO -- returning channel info                 |');
      console.log('+-------------------------------------------------------------+\n');
      return {
        ok: true,
        messages: [{
          ts: Date.now() + '.000000',
          text: 'Demo: channel #' + channel + ' has 3 messages (demo mode)',
          user: 'DEMO',
        }],
      };
    }

    console.log('\n+-------------------------------------------------------------+');
    console.log('|  [SLACK] API CALL                                           |');
    console.log('+-------------------------------------------------------------+');
    console.log('|  Method:   conversations.list + info                         |');
    console.log('|  Token:    ' + token.substring(0, 20) + '...' + token.slice(-10).padStart(10) + '|');
    console.log('+-------------------------------------------------------------+');
    console.log('|  Channel: ' + ('#' + channel).substring(0, 50).padEnd(50) + '|');
    console.log('+-------------------------------------------------------------+\n');

    try {
      // Find the channel by name
      const listResult = await this.client.conversations.list({
        types: 'public_channel,private_channel',
        limit: 200,
      });

      const found = listResult.channels?.find(
        c => c.name === channel.replace('#', '')
      );

      if (!found) {
        throw new Error('Channel #' + channel + ' not found or bot is not a member');
      }

      // Get full channel info
      const infoResult = await this.client.conversations.info({
        token,
        channel: found.id!,
      });

      if (!infoResult.ok) {
        throw new Error(infoResult.error ?? 'conversations.info failed');
      }

      const ch = infoResult.channel!;
      const memberCount = ch.num_members ?? 0;
      const topic = ch.topic?.value || 'No topic set';
      const purpose = ch.purpose?.value || 'No purpose set';

      console.log('\n+-------------------------------------------------------------+');
      console.log('|  [SLACK] API RESPONSE                                        |');
      console.log('+-------------------------------------------------------------+');
      console.log('|  [OK] SUCCESS -- Verified access to #' + channel.padEnd(37) + '|');
      console.log('|  Channel ID:  ' + (ch.id ?? '').padEnd(42) + '|');
      console.log('|  Members:     ' + memberCount.toString().padEnd(42) + '|');
      console.log('|  Topic:       ' + topic.substring(0, 42).padEnd(42) + '|');
      console.log('+-------------------------------------------------------------+\n');

      return {
        ok: true,
        messages: [{
          ts: ch.last_read ?? Date.now().toString(),
          text: '[#' + channel + '] Members: ' + memberCount + ' | Topic: ' + topic + ' | Purpose: ' + purpose,
          user: ch.creator ?? 'unknown',
        }],
      };
    } catch (err) {
      const error = err as Error;
      console.log('\n+-------------------------------------------------------------+');
      console.log('|  [SLACK] API ERROR                                           |');
      console.log('+-------------------------------------------------------------+');
      console.log('|  Error: ' + (error.message ?? 'Unknown error').substring(0, 44).padEnd(46) + '|');
      console.log('+-------------------------------------------------------------+\n');
      throw err;
    }
  }
}

export function createSlackClient(config: SlackConfig): SlackClient {
  return new SlackClient(config);
}