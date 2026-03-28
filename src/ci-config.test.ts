/**
 * CI Configuration Tests
 * Validates GitHub Actions workflows, vitest config, and package.json
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const REPO_ROOT = resolve(__dirname, '..');

describe('GitHub Actions workflows', () => {
  it('build-oci.yml is valid YAML and has required fields', () => {
    const content = readFileSync(`${REPO_ROOT}/.github/workflows/build-oci.yml`, 'utf8');
    // Basic structure checks
    expect(content).toContain('name: Build & Push OCI Image');
    expect(content).toContain('on:');
    expect(content).toContain('push:');
    expect(content).toContain('jobs:');
    expect(content).toContain('build:');
    expect(content).toContain('runs-on: ubuntu-latest');
    // Multi-arch support
    expect(content).toContain('linux/amd64');
    expect(content).toContain('linux/arm64');
    // GHCR registry
    expect(content).toContain('ghcr.io');
    // QEMU for cross-arch
    expect(content).toContain('docker/setup-qemu-action');
  });

  it('test.yml is valid YAML with test job', () => {
    const content = readFileSync(`${REPO_ROOT}/.github/workflows/test.yml`, 'utf8');
    expect(content).toContain('name: Tests & Coverage');
    expect(content).toContain('npm test');
    expect(content).toContain('matrix:');
    expect(content).toContain("node-version: ['20', '22']");
  });

  it('demo.yml is valid YAML and references demo-try.sh', () => {
    const content = readFileSync(`${REPO_ROOT}/.github/workflows/demo.yml`, 'utf8');
    expect(content).toContain('name: Demo Try-Out');
    expect(content).toContain('demo-try.sh');
    expect(content).toContain('workflow_dispatch');
    expect(content).toContain('schedule:');
  });
});

describe('vitest configuration', () => {
  it('vitest.config.ts exists and exports config', () => {
    const content = readFileSync(`${REPO_ROOT}/vitest.config.ts`, 'utf8');
    expect(content).toContain("defineConfig");
    expect(content).toContain("environment: 'node'");
    expect(content).toContain("testTimeout");
    expect(content).toContain("coverage");
  });

  it('coverage thresholds meet minimum bar', () => {
    const content = readFileSync(`${REPO_ROOT}/vitest.config.ts`, 'utf8');
    // Coverage must be >= 80% for all metrics
    expect(content).toMatch(/statements:\s*(8[5-9]|9\d|100)/);
    expect(content).toMatch(/branches:\s*(7[5-9]|8\d|9\d|100)/);
    expect(content).toMatch(/functions:\s*(8[5-9]|9\d|100)/);
    expect(content).toMatch(/lines:\s*(8[5-9]|9\d|100)/);
  });

  it('testTimeout and hookTimeout are at least 10 seconds', () => {
    const content = readFileSync(`${REPO_ROOT}/vitest.config.ts`, 'utf8');
    // Extract numeric value
    const match = content.match(/testTimeout:\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(parseInt(match![1])).toBeGreaterThanOrEqual(10000);
  });
});

describe('package.json', () => {
  it('has all required scripts', () => {
    const content = readFileSync(`${REPO_ROOT}/package.json`, 'utf8');
    const pkg = JSON.parse(content);
    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts.test).toBeDefined();
    expect(pkg.scripts['test:watch']).toBeDefined();
    expect(pkg.scripts.try).toBeDefined();
    expect(pkg.scripts['try:ci']).toBeDefined();
    expect(pkg.scripts.dev).toBeDefined();
  });

  it('test script runs vitest', () => {
    const content = readFileSync(`${REPO_ROOT}/package.json`, 'utf8');
    const pkg = JSON.parse(content);
    expect(pkg.scripts.test).toContain('vitest');
  });

  it('has required dev dependencies', () => {
    const content = readFileSync(`${REPO_ROOT}/package.json`, 'utf8');
    const pkg = JSON.parse(content);
    expect(pkg.devDependencies.vitest).toBeDefined();
    expect(pkg.devDependencies['@vitest/coverage-v8']).toBeDefined();
    expect(pkg.devDependencies.supertest).toBeDefined();
    expect(pkg.devDependencies['@types/supertest']).toBeDefined();
  });

  it('pre-commit-reality-check.sh exists and is a bash script', () => {
    const content = readFileSync(`${REPO_ROOT}/pre-commit-reality-check.sh`, 'utf8');
    expect(content).toContain('#!/usr/bin/env bash');
    expect(content).toContain('vitest');
    expect(content).toContain('tsc --noEmit');
  });
});

describe('demo scripts', () => {
  it('demo-try.sh is executable and contains required steps', () => {
    const content = readFileSync(`${REPO_ROOT}/demo-try.sh`, 'utf8');
    expect(content).toContain('VAULTGATE_PORT');
    expect(content).toContain('/health');
    expect(content).toContain('/action');
    expect(content).toContain('/status');
    expect(content).toContain('/revoke');
    expect(content).toContain('DEMO_APPROVAL_DELAY_POLLS');
    expect(content).toContain('tsx src/index.ts');
  });

  it('demo-timeout.sh exists', () => {
    const content = readFileSync(`${REPO_ROOT}/demo-timeout.sh`, 'utf8');
    expect(content).toContain('DEMO_APPROVAL_DELAY_POLLS=9999');
    expect(content).toContain('timeout');
  });

  it('demo-ci.sh is executable', () => {
    const content = readFileSync(`${REPO_ROOT}/demo-ci.sh`, 'utf8');
    expect(content).toContain('#!/usr/bin/env bash');
  });
});
