import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'clover', 'json'],
      include: ['src/**/*.js', 'cli.js'],
      exclude: ['**/*.test.js', '**/node_modules/**'],
      thresholds: {
        branches: 85,
        functions: 95,
        lines: 85,
        statements: 85,
      },
    },
  },
});
