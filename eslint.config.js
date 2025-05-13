// eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        // Use multiple tsconfig files for different parts of the codebase
        project: ['./tsconfig.json', './tsconfig.renderer.json'],
        // Make the parserOptions more lenient
        allowAutomaticSingleRunInference: true,
        warnOnUnsupportedTypeScriptVersion: false
      },
    },
    // Settings for React
    settings: {
      react: {
        version: 'detect',
      },
    },
    // Explicitly include only specific files in src/renderer that we want to lint
    // This is a more targeted approach to avoid files not covered by tsconfig
    files: [
      'src/renderer/components/**/*.ts',
      'src/renderer/components/**/*.tsx',
      'src/renderer/hooks/**/*.ts',
      'src/renderer/store/**/*.ts',
      'src/utils/config.ts',
      'src/utils/config.final.ts',
      'src/utils/logger.ts'
    ],
    ignores: [
      // Dependency directories
      'node_modules/**',
      'dist/**',
      'build/**',
      'release/**',
      'temp-main-output/**',
      
      // Config files and scripts
      '**/*.config.*',
      'scripts/**',
      '*.sh',
      
      // JavaScript files
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
      
      // Generated and built files
      '**/*.js.map',
      '**/*.d.ts',
      '**/*.tsbuildinfo',
      
      // Other special files
      '**/templates/**',
      'public/draco/**',
      'src/renderer/draco/**',
      'coverage/**',
      
      // Problematic files
      'src/main/main.dev.js',
      'src/main/main.dev.cjs',
      'src/main/main.dev.ts',
      'src/main/preload/**/*.js',
      'src/types.d.ts',
      'src/custom.d.ts'
    ],
    // Apply very lenient rules for incremental adoption
    rules: {
      // Disable problematic rules completely
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-undef': 'off',
      
      // Downgrade errors to warnings for gradual adoption
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',
      
      // Keep only a few critical React rules as errors
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true }
      ],
      'no-restricted-imports': ['warn', {
        paths: [{
          name: 'three',
          importNames: ['*'],
          message: 'Do not use destructured imports from \'three\'. Use the namespace import pattern instead: import * as THREE from \'three\''
        }]
      }]
    },
    plugins: {
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
  },
  // Overrides for test files
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off'
    }
  }
);