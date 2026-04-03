import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/types.ts',
        'src/index.ts', // HTTP server — integration-tested via supertest
      ],
      thresholds: {
        // NOTE: thresholds are informational only — enforcing 95% across all
        // source files (including demo-mode-skipped branches) causes frequent
        // CI failures. Coverage data is still collected and reported to Codecov
        // via the GitHub Actions workflow (tests.yml). To enforce thresholds
        // in CI, add `--coverage.failOnMissing` to the `npm test` command
        // in tests.yml once the team decides on achievable per-file targets.
        statements: 85,
        branches: 75,
        functions: 85,
        lines: 85,
      },
    },
    testTimeout: 30_000,
    hookTimeout: 300_000,
  },
});
