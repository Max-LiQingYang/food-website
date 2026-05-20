/**
 * Mock for frontend/api.js
 * 模拟 api.js 的所有导出方法，支持标准 jest.fn() 语法。
 */
'use strict'

const mockAddFavorite = jest.fn()
const mockRemoveFavorite = jest.fn()
const mockGetFavoriteList = jest.fn()
const mockGetFavoriteStatus = jest.fn()

module.exports = {
  addFavorite: mockAddFavorite,
  removeFavorite: mockRemoveFavorite,
  getFavoriteList: mockGetFavoriteList,
  getFavoriteStatus: mockGetFavoriteStatus,
  default: {
    addFavorite: mockAddFavorite,
    removeFavorite: mockRemoveFavorite,
    getFavoriteList: mockGetFavoriteList,
    getFavoriteStatus: mockGetFavoriteStatus
  }
}
