#!/usr/bin/env node
/**
 * VaultGate CLI Client
 * Command-line interface to interact with VaultGate HTTP server
 * 
 * Usage:
 *   vaultgate send "#channel" "message"   — Send a Slack message
 *   vaultgate status                       — Show vault status
 *   vaultgate revoke                       — Revoke all tokens
 */

import http from 'http';

const VAULTGATE_HOST = process.env.VAULTGATE_HOST ?? 'localhost';
const VAULTGATE_PORT = parseInt(process.env.VAULTGATE_PORT ?? '18792');

/**
 * Make HTTP request to VaultGate server
 */
async function request<T>(path: string, method: string, body?: object): Promise<T> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, `http://${VAULTGATE_HOST}:${VAULTGATE_PORT}`);
    
    const options = {
      hostname: VAULTGATE_HOST,
      port: VAULTGATE_PORT,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(parsed.error ?? `HTTP ${res.statusCode}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Connection failed: ${e.message}. Is VaultGate running?`));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Send a Slack message via VaultGate
 */
async function sendMessage(channel: string, message: string): Promise<void> {
  console.log('\n🔐 VAULTGATE CLI — Sending message...\n');
  console.log(`   Channel: ${channel}`);
  console.log(`   Message: ${message}\n`);

  try {
    const result = await request<{
      success: boolean;
      status: string;
      tokenState?: {
        tokenId: string;
        scope: string;
        ttlSeconds: number;
      };
      result?: {
        message?: string;
      };
      error?: string;
    }>('/action', 'POST', {
      service: 'slack',
      action: 'write',
      target: channel,
      body: message,
    });

    if (result.success) {
      console.log('\n✅ MESSAGE SENT SUCCESSFULLY!');
      if (result.tokenState) {
        console.log(`   Token: ${result.tokenState.tokenId}`);
        console.log(`   Scope: ${result.tokenState.scope}`);
        console.log(`   TTL: ${result.tokenState.ttlSeconds}s`);
      }
      if (result.result?.message) {
        console.log(`   ${result.result.message}`);
      }
    } else {
      console.log('\n❌ FAILED TO SEND MESSAGE');
      console.log(`   Error: ${result.error ?? 'Unknown error'}`);
      process.exit(1);
    }
  } catch (e) {
    console.log(`\n❌ CONNECTION ERROR: ${e instanceof Error ? e.message : 'Unknown error'}`);
    console.log('\n   Make sure VaultGate is running:');
    console.log('   npm run dev');
    process.exit(1);
  }
}

/**
 * Show vault status
 */
async function showStatus(): Promise<void> {
  console.log('\n🔐 VAULTGATE STATUS\n');

  try {
    const status = await request<{
      vaultConnected: boolean;
      activeTokens: Array<{
        tokenId: string;
        scope: string;
        service: string;
        ttlSeconds: number;
        issuedAt: number;
        expiresAt: number;
        status: string;
      }>;
      totalActive: number;
      timestamp: number;
    }>('/status', 'GET');

    // Connection status
    console.log(`   Vault Connected: ${status.vaultConnected ? '✅ Yes' : '❌ No (Demo Mode)'}`);
    console.log(`   Active Tokens: ${status.totalActive}`);
    console.log('');

    // Active tokens
    if (status.activeTokens.length === 0) {
      console.log('   No active tokens');
    } else {
      console.log('   Active Tokens:');
      console.log('   ┌─────────────────────────────────────────────────────────────┐');
      console.log('   │ Token ID          │ Scope                   │ TTL    │ Status │');
      console.log('   ├─────────────────────────────────────────────────────────────┤');
      
      for (const token of status.activeTokens) {
        const remaining = Math.max(0, Math.floor((token.expiresAt - Date.now()) / 1000));
        const ttl = remaining > 0 ? `${remaining}s` : 'exp';
        console.log(
          `   │ ${token.tokenId.padEnd(18)} │ ${token.scope.padEnd(22)} │ ${ttl.padEnd(6)} │ ${token.status.padEnd(6)} │`
        );
      }
      console.log('   └─────────────────────────────────────────────────────────────┘');
    }

    console.log('');

  } catch (e) {
    console.log(`   ❌ CONNECTION ERROR: ${e instanceof Error ? e.message : 'Unknown error'}`);
    console.log('\n   Make sure VaultGate is running:');
    console.log('   npm run dev');
    process.exit(1);
  }
}

/**
 * Revoke all tokens
 */
async function revokeAll(): Promise<void> {
  console.log('\n🔐 VAULTGATE — Revoking all tokens...\n');

  try {
    const result = await request<{
      success: boolean;
      revokedCount: number;
    }>('/revoke', 'POST');

    if (result.success) {
      console.log(`\n✅ Revoked ${result.revokedCount} token(s)\n`);
    } else {
      console.log('\n❌ FAILED TO REVOKE TOKENS\n');
      process.exit(1);
    }
  } catch (e) {
    console.log(`\n❌ CONNECTION ERROR: ${e instanceof Error ? e.message : 'Unknown error'}`);
    console.log('\n   Make sure VaultGate is running:');
    console.log('   npm run dev');
    process.exit(1);
  }
}

/**
 * Show help
 */
function showHelp(): void {
  console.log(`
🔐 VaultGate CLI

Usage:
  vaultgate <command> [options]

Commands:
  send <channel> <message>    Send a Slack message
  status                       Show vault status
  revoke                       Revoke all active tokens
  help                         Show this help

Examples:
  vaultgate send "#design" "Design Review Friday 2pm"
  vaultgate status
  vaultgate revoke

Environment Variables:
  VAULTGATE_HOST   VaultGate server host (default: localhost)
  VAULTGATE_PORT   VaultGate server port (default: 18792)

Notes:
  - VaultGate server must be running (npm run dev)
  - Send command triggers CIBA step-up authentication
  - Tokens auto-expire after use (demo mode)
`);
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'send':
      if (args.length < 3) {
        console.log('Error: Missing arguments for send command');
        console.log('Usage: vaultgate send "#channel" "message"');
        process.exit(1);
      }
      await sendMessage(args[1], args[2]);
      break;

    case 'status':
      await showStatus();
      break;

    case 'revoke':
      await revokeAll();
      break;

    case 'help':
    case undefined:
      showHelp();
      break;

    default:
      console.log(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
