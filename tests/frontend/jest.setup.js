/**
 * tests/frontend/jest.setup.js
 * 前端测试全局配置
 */
'use strict'

jest.setTimeout(10000)

// 全局 localStorage mock（默认已登录，含 token）
// jsdom 的 localStorage 是只读 getter，必须用 Object.defineProperty 覆盖
const localStorageMock = (() => {
  let store = { token: 'fake-jwt-token-for-testing' }
  return {
    getItem: jest.fn((key) => (key in store ? store[key] : null)),
    setItem: jest.fn((key, value) => { store[key] = value }),
    removeItem: jest.fn((key) => { delete store[key] }),
    clear: jest.fn(() => { store = {} })
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
})
