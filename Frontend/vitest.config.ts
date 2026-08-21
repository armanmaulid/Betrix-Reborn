import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
    exclude: ['**/node_modules/**', '**/e2e/**']
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './')
    }
  }
});
