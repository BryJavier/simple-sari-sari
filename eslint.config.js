const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = [
  ...expoConfig,
  prettierRecommended,
  {
    settings: {
      // Use explicit version to avoid react-plugin calling getFilename() (removed in ESLint v10)
      react: { version: '19.2.0' },
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/consistent-type-imports': 'warn',
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**', '.expo/**', 'coverage/**', 'android/**', 'ios/**'],
  },
];
