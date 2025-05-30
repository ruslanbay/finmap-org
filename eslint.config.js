import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Financial app specific rules
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/prefer-readonly': 'error',
      
      // Performance critical for large datasets
      'no-console': 'warn',
      'prefer-const': 'error',
      
      // Code quality
      'complexity': ['error', 10],
      'max-lines-per-function': ['error', 50],
      
      // Allow console in development
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'backup/**',
      '*.config.js',
      '*.config.ts',
    ],
  },
];
