import eslint from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vuePlugin from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'

export default [
  eslint.configs.recommended,
  // TypeScript files — API (Node.js environment)
  {
    files: ['apps/api/**/*.ts'],
    plugins: { '@typescript-eslint': tsPlugin },
    languageOptions: {
      parser: tsParser,
      globals: { ...globals.node },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // Config / build tool files that run in Node.js
  {
    files: ['**/*.config.ts', '**/*.config.mts', '**/playwright.config.ts'],
    plugins: { '@typescript-eslint': tsPlugin },
    languageOptions: {
      parser: tsParser,
      globals: { ...globals.node },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // TypeScript files — Web (browser environment)
  {
    files: ['apps/web/src/**/*.ts', 'apps/web/tests/**/*.ts', 'packages/**/*.ts'],
    plugins: { '@typescript-eslint': tsPlugin },
    languageOptions: {
      parser: tsParser,
      globals: { ...globals.browser },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // Vue SFC files
  {
    files: ['**/*.vue'],
    plugins: { vue: vuePlugin, '@typescript-eslint': tsPlugin },
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
      globals: { ...globals.browser },
    },
    rules: {
      ...vuePlugin.configs['vue3-recommended'].rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Vue <script setup> variables used in templates appear unused to ESLint's JS-only analysis
      'no-useless-assignment': 'off',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '.worktrees/**',
      // vue-tsc emit artifacts
      'apps/web/src/**/*.js',
      'apps/web/src/**/*.js.map',
      'apps/web/src/**/*.d.ts',
      'apps/web/src/**/*.d.ts.map',
      'apps/web/tests/**/*.js',
      'apps/web/tests/**/*.js.map',
      'apps/web/tests/**/*.d.ts',
      'apps/web/tests/**/*.d.ts.map',
      'apps/web/vite.config.js',
      'apps/web/vite.config.d.ts',
    ],
  },
]
