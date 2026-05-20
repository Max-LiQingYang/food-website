'use strict'

module.exports = {
  testTimeout: 10000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/index.js',
    '!backend/server.js',
    'frontend/**/*.vue'
  ],

  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/backend/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js']
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/frontend/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
      transform: {
        '^.+\\.vue$': '@vue/vue3-jest',
        '^.+\\.js$': 'babel-jest'
      },
      moduleNameMapper: {
        // 拦截所有形式的 api 引用
        '^\\.\\.?/api(?:\\.js)?$': '<rootDir>/tests/frontend/__mocks__/frontend/api.js',
        '^frontend/api(?:\\.js)?$': '<rootDir>/tests/frontend/__mocks__/frontend/api.js',
        '.*/frontend/api(?:\\.js)?$': '<rootDir>/tests/frontend/__mocks__/frontend/api.js',
        '^frontend/components/(.*)$': '<rootDir>/frontend/components/$1',
        '^frontend/pages/(.*)$': '<rootDir>/frontend/pages/$1'
      }
    }
  ]
}
