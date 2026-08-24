import { defineConfig } from 'vitest/config';
import path from 'path';

const root = import.meta.dirname;

// Ordered alias list — more specific patterns MUST come before the generic
// '@' → project root alias, mirroring tsconfig paths '@/*': ['./src/*', './*'].
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
    exclude: ['**/node_modules/**', '**/e2e/**']
  },
  resolve: {
    alias: [
      { find: '@/shared', replacement: path.resolve(root, './src/shared') },
      { find: '@/modules', replacement: path.resolve(root, './src/modules') },
      { find: '@shared', replacement: path.resolve(root, './src/shared') },
      { find: '@modules', replacement: path.resolve(root, './src/modules') },
      { find: '@identity', replacement: path.resolve(root, './src/modules/identity') },
      { find: '@intelligence', replacement: path.resolve(root, './src/modules/intelligence') },
      { find: '@market', replacement: path.resolve(root, './src/modules/market') },
      { find: '@billing', replacement: path.resolve(root, './src/modules/billing') },
      { find: '@analytics', replacement: path.resolve(root, './src/modules/analytics') },
      { find: '@operations', replacement: path.resolve(root, './src/modules/operations') },
      { find: '@news', replacement: path.resolve(root, './src/modules/news') },
      { find: /^@\/lib\//, replacement: `${path.resolve(root, './lib')}/` },
      { find: /^@\/app\//, replacement: `${path.resolve(root, './app')}/` },
      { find: '@', replacement: path.resolve(root, './') }
    ]
  }
});
