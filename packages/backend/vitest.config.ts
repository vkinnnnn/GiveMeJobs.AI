import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: './src/__tests__/globalSetup.ts',
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
      ],
    },
  },
});
