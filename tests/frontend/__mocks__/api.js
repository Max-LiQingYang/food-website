/**
 * tests/frontend/__mocks__/api.js
 *
 * Jest mock for frontend/api.js
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
  getFavoriteStatus: mockGetFavoriteStatus
}
