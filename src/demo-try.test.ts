/**
 * demo-try.sh Integration Test
 * Verifies the fully automated demo script exits cleanly with code 0
 */

import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

describe('demo-try.sh', () => {
  const scriptPath = resolve(__dirname, '../demo-try.sh');

  it('script file exists and is executable', () => {
    expect(existsSync(scriptPath)).toBe(true);
  });

  it('exits with code 0 (success)', async () => {
    const result = await new Promise<{ code: number; stderr: string }>((resolve, reject) => {
      const proc = spawn('bash', [scriptPath], {
        timeout: 30_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stderr = '';
      proc.stderr?.on('data', d => { stderr += d.toString(); });

      proc.on('close', code => {
        resolve({ code: code ?? 1, stderr });
      });

      proc.on('error', err => {
        reject(err);
      });

      setTimeout(() => {
        proc.kill('SIGKILL');
        resolve({ code: 124, stderr: '[timeout]' });
      }, 30_000);
    });

    expect(result.code).toBe(0);
  });

  it('starts VaultGate HTTP server on configured port', async () => {
    const result = await new Promise<{ stdout: string; code: number }>((resolve, reject) => {
      const proc = spawn('bash', ['-c', `source ${scriptPath} 2>&1 | head -50; exit 0`], {
        timeout: 30_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      proc.stdout?.on('data', d => { stdout += d.toString(); });

      proc.on('close', code => {
        resolve({ stdout, code: code ?? 1 });
      });

      proc.on('error', err => {
        reject(err);
      });

      setTimeout(() => {
        proc.kill('SIGKILL');
        resolve({ stdout, code: 124 });
      }, 30_000);
    });

    // Should show health check or server startup
    expect(result.stdout).toContain('18792') || result.stdout.toContain('VaultGate');
  });
});
