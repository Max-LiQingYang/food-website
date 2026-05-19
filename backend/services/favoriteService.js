'use strict'

const { v4: uuidv4 } = require('uuid')
const db = require('../models')

const { Favorite, Recipe } = db

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
    ]
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

module.exports = {
  addFavorite,
  removeFavorite,
  getFavoritesByUser,
  getFavoriteStatus
}
