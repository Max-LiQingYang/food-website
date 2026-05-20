/**
 * jest.setup.js — 全局测试配置
 */
'use strict'

process.env.NODE_ENV = 'test'
jest.setTimeout(10000)

// localStorage mock - 覆盖 global.localStorage 使 getItem('token') 返回假 token
const mockStorage = {
  _data: { token: 'fake-jwt-token-for-testing' },
  getItem: function(k) { return this._data[k] ?? null },
  setItem: function(k, v) { this._data[k] = String(v) },
  removeItem: function(k) { delete this._data[k] },
  clear: function() { this._data = {} },
  get length() { return Object.keys(this._data).length },
  key: function(i) { return Object.keys(this._data)[i] ?? null }
}
Object.defineProperty(global, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true
})

// scrollIntoView mock — jsdom 未实现（仅在 jsdom 环境下可用）
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = jest.fn()
}
