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
      '@/shared': path.resolve(import.meta.dirname, './src/shared'),
      '@/modules': path.resolve(import.meta.dirname, './src/modules'),
      '@shared': path.resolve(import.meta.dirname, './src/shared'),
      '@modules': path.resolve(import.meta.dirname, './src/modules'),
      '@identity': path.resolve(import.meta.dirname, './src/modules/identity'),
      '@intelligence': path.resolve(import.meta.dirname, './src/modules/intelligence'),
      '@market': path.resolve(import.meta.dirname, './src/modules/market'),
      '@billing': path.resolve(import.meta.dirname, './src/modules/billing'),
      '@analytics': path.resolve(import.meta.dirname, './src/modules/analytics'),
      '@operations': path.resolve(import.meta.dirname, './src/modules/operations'),
      '@news': path.resolve(import.meta.dirname, './src/modules/news'),
      '@': path.resolve(import.meta.dirname, './')
    }
  }
});
