import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: ['projects/**'],
  },
  {
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': ['warn', { ignoreVoid: true }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-wrapper-object-types': 'warn',
      'no-useless-assignment': 'off',
      'require-await': 'error',
      'no-await-in-loop': 'warn',
      'no-promise-executor-return': 'warn',
      'max-nested-callbacks': 'warn',
      'no-return-await': 'warn',
      'object-shorthand': ['warn', 'always'],
      'no-array-constructor': 'warn',
      'array-callback-return': 'warn',
      'prefer-destructuring': ['warn', { object: true, array: false }],
      'prefer-rest-params': 'warn',
      'no-loop-func': 'error',
      'no-param-reassign': 'warn',
      'prefer-arrow-callback': 'error',
      'arrow-parens': ['warn', 'always'],
      'class-methods-use-this': 'warn',
      'no-iterator': 'warn',
      'eqeqeq': 'warn',
      'nonblock-statement-body-position': 'warn',
      'no-else-return': 'error',
      'padded-blocks': ['warn', 'never'],
      'semi': 'warn',
    },
  },
]);
