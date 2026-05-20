'use strict'

module.exports = {
  testTimeout: 10000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['backend/**/*.js', 'frontend/**/*.vue'],

  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/backend/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/frontend/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      transform: {
        '^.+\\.vue$': '@vue/vue3-jest'
      },
      moduleNameMapper: {
        '^frontend/api$': '<rootDir>/tests/frontend/__mocks__/frontend/api.js',
        '^frontend/(.*)$': '<rootDir>/frontend/$1'
      },
      transformIgnorePatterns: [
        '/node_modules/(?!(vue|@vue)/)'
      ]
    }
  ]
}
