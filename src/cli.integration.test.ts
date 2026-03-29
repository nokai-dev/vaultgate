/**
 * CLI Integration Tests — spawns live VaultGate server and tests CLI end-to-end
 * This file starts a real server + CLI subprocess — needs generous timeouts.
 * Run with: npx vitest run src/cli.integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, onTestFinished } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import { app } from './index.js';
import { _resetActiveTokens } from './tokenVault.js';

let server: ChildProcess | null = null;
let port = 0;

beforeAll(async () => {
  _resetActiveTokens();

  // Find a free port by starting and immediately closing a test server
  const tmpServer = await new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
    const s = app.listen(0, 'localhost', err => {
      if (err) reject(err);
      else resolve(s);
    });
  });
  port = (tmpServer.address() as { port: number }).port;
  await new Promise<void>(resolve => tmpServer.close(() => resolve()));

  // Start the real server as a child process
  const env = {
    ...process.env,
    VAULTGATE_PORT: String(port),
    VAULTGATE_HOST: 'localhost',
    VAULTGATE_QUIET: '1',
  };

  // Use npx tsx to reliably resolve the binary (handles node_modules/.bin cross-platform)
  server = spawn('./node_modules/.bin/tsx', ['src/index.ts'], {
    cwd: process.cwd(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Wait for server to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timeout')), 180_000);
    const check = () => {
      const req = http.get(`http://localhost:${port}/health`, res => {
        if (res.statusCode === 200) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(check, 100);
        }
      });
      req.on('error', () => setTimeout(check, 100));
    };
    check();
  });

  onTestFinished(() => {
    if (server) {
      server.kill('SIGTERM');
      server = null;
    }
  });
}, 300_000); // 300s timeout for server startup (TypeScript compilation in CI)

afterAll(async () => {
  if (server) {
    server.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 500));
  }
});

function cli(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise(resolve => {
    if (!server) {
      resolve({ stdout: '', stderr: 'Server not running', code: 1 });
      return;
    }

    const proc = spawn('npx', ['tsx', 'cli/index.ts', ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        VAULTGATE_PORT: String(port),
        VAULTGATE_HOST: 'localhost',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', d => { stdout += d.toString(); });
    proc.stderr?.on('data', d => { stderr += d.toString(); });

    proc.on('close', code => {
      resolve({ stdout, stderr, code: code ?? 1 });
    });

    // Safety timeout
    setTimeout(() => {
      proc.kill('SIGKILL');
      resolve({ stdout, stderr: stderr + '\n[timeout]', code: 124 });
    }, 10_000);
  });
}

describe('CLI integration — live server', () => {
  it('cli status returns 0 and shows vault status', async () => {
    const result = await cli(['status']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('VaultGate') || result.stdout.toContain('totalActive');
  });

  it('cli send #channel message — completes successfully', async () => {
    const result = await cli(['send', '#engineering', 'hello']);
    expect(result.code).toBe(0);
    expect(result.stderr).not.toContain('ECONNREFUSED');
    expect(result.stderr).not.toContain('Connection refused');
  });

  it('cli revoke returns 0', async () => {
    const result = await cli(['revoke']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('revoked') || result.stdout.toContain('Revoked') ||
      result.stdout.toContain('success');
  });

  it('cli with no args returns exit code 1 and shows help', async () => {
    const result = await cli([]);
    expect(result.code).toBe(1);
    expect(result.stdout + result.stderr).toMatch(/Usage|help|VaultGate/i);
  });

  it('cli unknown command returns non-zero', async () => {
    const result = await cli(['unknown-command']);
    expect(result.code).not.toBe(0);
  });

  it('server /health endpoint returns 200', async () => {
    const result = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      const req = http.get(`http://localhost:${port}/health`, res => {
        let body = '';
        res.on('data', d => { body += d.toString(); });
        res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body }));
      });
      req.on('error', reject);
      setTimeout(() => reject(new Error('timeout')), 5000);
    });
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('healthy');
  });

  it('server /status endpoint returns 200 with totalActive', async () => {
    const result = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      const req = http.get(`http://localhost:${port}/status`, res => {
        let body = '';
        res.on('data', d => { body += d.toString(); });
        res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body }));
      });
      req.on('error', reject);
      setTimeout(() => reject(new Error('timeout')), 5000);
    });
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('totalActive');
  });

  it('server POST /action read returns 200', async () => {
    const result = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      const body = JSON.stringify({ service: 'slack', action: 'read', target: '#test' });
      const req = http.request(
        `http://localhost:${port}/action`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
        res => {
          let data = '';
          res.on('data', d => { data += d.toString(); });
          res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body: data }));
        }
      );
      req.on('error', reject);
      req.write(body);
      req.end();
      setTimeout(() => reject(new Error('timeout')), 5000);
    });
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('success');
  });

  it('server POST /action write (CIBA path) returns 200', async () => {
    const result = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      const body = JSON.stringify({ service: 'slack', action: 'write', target: '#general', body: 'test' });
      const req = http.request(
        `http://localhost:${port}/action`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
        res => {
          let data = '';
          res.on('data', d => { data += d.toString(); });
          res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body: data }));
        }
      );
      req.on('error', reject);
      req.write(body);
      req.end();
      setTimeout(() => reject(new Error('timeout')), 5000);
    });
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('success');
  });

  it('server POST /revoke returns 200', async () => {
    const result = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      const req = http.request(
        `http://localhost:${port}/revoke`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } },
        res => {
          let body = '';
          res.on('data', d => { body += d.toString(); });
          res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body }));
        }
      );
      req.on('error', reject);
      req.end();
      setTimeout(() => reject(new Error('timeout')), 5000);
    });
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('success');
  });
});
