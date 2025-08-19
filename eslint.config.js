import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import vue from 'eslint-plugin-vue';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Base ESLint config
  eslint.configs.recommended,
  
  // Vue config
  ...vue.configs['flat/recommended'],
  
  // Prettier config (disables conflicting rules)
  prettierConfig,
  
  {
    files: ['**/*.{js,mjs,cjs,ts,vue}'],
    
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        extraFileExtensions: ['.vue'],
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        NodeJS: 'readonly',
      },
    },
    
    plugins: {
      '@typescript-eslint': tseslint,
      prettier,
    },
    
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // Vue rules
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/require-default-prop': 'off',
      'vue/no-setup-props-destructure': 'off',
      
      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-unused-vars': 'off', // Use TypeScript version
      
      // Prettier
      'prettier/prettier': ['error', {
        singleQuote: true,
        semi: true,
        trailingComma: 'es5',
        printWidth: 100,
        tabWidth: 2,
        useTabs: false,
      }],
    },
  },
  
  // Vue files specific config
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vue.parser,
      parserOptions: {
        parser: tsParser,
      },
    },
  },
  
  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'playwright-tools/**',
      '*.config.js',
      '*.config.ts',
    ],
  },
];