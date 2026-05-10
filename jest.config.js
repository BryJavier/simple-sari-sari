module.exports = {
  preset: 'jest-expo',
  // Custom env polyfills jest-mock@29 → jest@30 compatibility (clearMocksOnScope)
  testEnvironment: '<rootDir>/jest/custom-env.js',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    // No trailing "/" after alternatives: "expo" must match "expo-modules-core" etc.
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|@expo|expo|react-native-paper|@expo-google-fonts))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts(x)?'],
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    'src/db/**/*.ts',
    'src/store/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    'src/utils/**/*.ts': { branches: 80, functions: 80, lines: 80, statements: 80 },
    'src/db/queries/**/*.ts': { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
};
