export default {
  testEnvironment: 'node',
  transform: {},
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    'cli.js',
    '!**/*.test.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 95,
      lines: 85,
      statements: 85
    }
  },
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', 'generate-csv.test.js']
};
