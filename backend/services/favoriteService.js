'use strict'

const { v4: uuidv4 } = require('uuid')
const db = require('../models')

const { Favorite, Recipe } = db

// ─────────────────────────────────────────────────────────────────
// 内存缓存层（TTL=60s）
// 用于 getFavoritesByUser 分页查询缓存，减少数据库压力
// ─────────────────────────────────────────────────────────────────
const cache = new Map()
const CACHE_TTL = 60 * 1000 // 60 秒

function getCacheKey(prefix, ...args) {
  return `${prefix}:${args.join(':')}`
}

function getFromCache(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() })
}

// 防止缓存击穿：同一 key 的并发请求复用同一个 promise
const inflightRequests = new Map()

async function withCache(key, fetchFn) {
  // 1. 命中缓存 → 直接返回
  const cached = getFromCache(key)
  if (cached !== null) return cached

  // 2. 已有在途请求 → 复用 promise（防止缓存击穿）
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key)
  }

  // 3. 发起新请求，缓存 promise 供并发复用
  const promise = fetchFn()
    .then((data) => {
      setCache(key, data)
      inflightRequests.delete(key)
      return data
    })
    .catch((err) => {
      inflightRequests.delete(key)
      throw err
    })

  inflightRequests.set(key, promise)
  return promise
}

/**
 * favoriteService — 收藏业务逻辑层
 * 所有写操作均幂等：重复调用返回相同结果，不抛错。
 */

/**
 * 添加收藏（幂等）
 * @param {string} userId
 * @param {string} recipeId
 * @returns {{ isNew: boolean, data: object|null }}
 */
async function addFavorite(userId, recipeId) {
  // 1. 先查是否已有未删除记录
  const existing = await Favorite.findOne({
    where: { userId, recipeId, isDeleted: false },
    attributes: ['id', 'createdAt']
  })

  if (existing) {
    // 幂等：已收藏，直接返回
    return { isNew: false, data: null }
  }

  // 2. 尝试创建（乐观锁防并发）
  //    如果之前有软删除记录，先恢复；否则新建
  const [record, created] = await Favorite.findOrCreate({
    where: { userId, recipeId },
    defaults: {
      id: uuidv4(),
      userId,
      recipeId,
      createdAt: new Date(),
      isDeleted: false
    }
  })

  if (!created) {
    // 已有软删除记录，设为未删除（恢复收藏）
    await record.update({ isDeleted: false, createdAt: new Date() })
    clearCache()
    return {
      isNew: true,
      data: {
        id: record.id,
        userId,
        recipeId,
        createdAt: record.createdAt
      }
    }
  }

  clearCache()
  return {
    isNew: true,
    data: {
      id: record.id,
      userId,
      recipeId,
      createdAt: record.createdAt
    }
  }
}

/**
 * 取消收藏（幂等）
 * @param {string} userId
 * @param {string} recipeId
 * @returns {{ deleted: boolean }}
 */
async function removeFavorite(userId, recipeId) {
  const record = await Favorite.findOne({
    where: { userId, recipeId, isDeleted: false }
  })

  if (!record) {
    // 幂等：未收藏，直接返回
    return { deleted: false }
  }

  // 软删除
  await record.update({ isDeleted: true })
  clearCache()
  return { deleted: true }
}

/**
 * 获取用户收藏列表（分页）
 * @param {string} userId
 * @param {number} page
 * @param {number} pageSize
 * @returns {{ total: number, page: number, pageSize: number, list: array }}
 */
async function getFavoritesByUser(userId, page = 1, pageSize = 20) {
  const cacheKey = getCacheKey('favs', userId, page, pageSize)

  return withCache(cacheKey, async () => {
    const offset = (page - 1) * pageSize

    const { count, rows } = await Favorite.findAndCountAll({
      where: { userId, isDeleted: false },
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize,
      attributes: ['id', 'userId', 'recipeId', 'createdAt'],
      include: [
        {
          model: Recipe,
          as: 'recipe',
          attributes: ['id', 'title', 'coverImage', 'author', 'cookTime'],
          required: false // LEFT JOIN，即使食谱被删也返回收藏记录
        }
      ],
      // 使用子查询优化 COUNT 查询，避免 JOIN 影响 count 准确性
      distinct: true
    })

    const list = rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      recipeId: row.recipeId,
      createdAt: row.createdAt,
      recipe: row.recipe
        ? {
            id: row.recipe.id,
            title: row.recipe.title,
            coverImage: row.recipe.coverImage,
            author: row.recipe.author,
            cookTime: row.recipe.cookTime
          }
        : null
    }))

    return {
      total: count,
      page,
      pageSize,
      list
    }
  })
}

/**
 * 查询单条收藏状态
 * @param {string} userId
 * @param {string} recipeId
 * @returns {{ isFavorited: boolean, favoriteId: string|null }}
 */
async function getFavoriteStatus(userId, recipeId) {
  const record = await Favorite.findOne({
    where: { userId, recipeId, isDeleted: false },
    attributes: ['id']
  })

  return {
    isFavorited: !!record,
    favoriteId: record ? record.id : null
  }
}

/**
 * 统计食谱被收藏的总次数（仅统计 isDeleted=false 的记录）
 * @param {string} recipeId
 * @returns {number} 收藏次数
 */
async function countFavorites(recipeId) {
  const count = await Favorite.count({
    where: { recipeId, isDeleted: false }
  })
  return count
}

/**
 * 清除所有缓存（供测试 / 管理使用）
 */
function clearCache() {
  cache.clear()
  inflightRequests.clear()
}

module.exports = {
  addFavorite,
  removeFavorite,
  getFavoritesByUser,
  getFavoriteStatus,
  countFavorites,
  clearCache
}
