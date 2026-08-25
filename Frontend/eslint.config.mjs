import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/build/**',
      '**/dist/**',
      '**/coverage/**',
      '**/test-results/**',
      '**/playwright-report/**',
      'next-env.d.ts'
    ]
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node }
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      // `catch {}` (deliberate swallow) is an established idiom here.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // React Compiler migration items — genuine, but a separate effort. Warn first.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn'
    }
  },
  prettier
);
