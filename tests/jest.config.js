/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/backend/**/*.test.js'],
  coverageDirectory: './tests/coverage',
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/server.js',
    '!backend/scripts/**',
  ],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
};
