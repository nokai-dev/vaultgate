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
   * Post a message to a Slack channel
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
    const channel = target.startsWith('#') ? target.slice(1) : target;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (this.client.chat.scheduleMessage as any)({
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
    const result = await this.client.conversations.list({
      types: 'public_channel,private_channel',
    });

    const channel = result.channels?.find(
      c => c.name === channelName.replace('#', '')
    );

    return channel?.id;
  }
}

export function createSlackClient(config: SlackConfig): SlackClient {
  return new SlackClient(config);
}
