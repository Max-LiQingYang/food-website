'use strict'

/**
 * utils/authorLevel.js
 * 作者等级系统
 *
 * 等级     名称      所需积分  徽章
 * 1       烹饪新手   0        🥚
 * 2       家庭厨手   50       🍳
 * 3       厨房达人   200      👨‍🍳
 * 4       美食行家   500      ⭐
 * 5       厨神       1000     👑
 *
 * 积分公式：recipeCount * 30 + Σ(qualityScore) * 5 + totalFavorites * 2 + totalComments * 1
 *
 * 使用方式：
 *   const { getAuthorLevel } = require('../utils/authorLevel')
 *   const info = await getAuthorLevel(userId)
 *   // => { level, title, icon, score, nextLevelScore, progress }
 */

const LEVELS = [
  { level: 1, title: '烹饪新手', icon: '🥚', minScore: 0 },
  { level: 2, title: '家庭厨手', icon: '🍳', minScore: 50 },
  { level: 3, title: '厨房达人', icon: '👨‍🍳', minScore: 200 },
  { level: 4, title: '美食行家', icon: '⭐', minScore: 500 },
  { level: 5, title: '厨神', icon: '👑', minScore: 1000 }
]

function computeLevel(score) {
  let current = LEVELS[0]
  let next = LEVELS[1]
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (score >= LEVELS[i].minScore) {
      current = LEVELS[i]
      next = LEVELS[i + 1] || null
      break
    }
  }
  // 如果分数低于所有等级门槛，取等级1
  if (score < LEVELS[0].minScore) {
    current = LEVELS[0]
    next = LEVELS[1]
  }
  const nextLevelScore = next ? next.minScore : current.minScore
  const currentMin = current.minScore
  const range = next ? (nextLevelScore - currentMin) : 1
  const progress = next ? Math.min(100, Math.round(((score - currentMin) / range) * 100)) : 100

  return {
    level: current.level,
    title: current.title,
    icon: current.icon,
    score,
    nextLevelScore,
    nextTitle: next ? next.title : null,
    progress: Math.min(100, progress),
    isMaxLevel: !next
  }
}

/**
 * 获取作者等级信息
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} { level, title, icon, score, nextLevelScore, nextTitle, progress, isMaxLevel }
 */
async function getAuthorLevel(userId) {
  const { Recipe, Comment, sequelize } = require('../models')
  const Sequelize = require('sequelize')
  const Op = Sequelize.Op

  // 查询用户食谱统计
  const recipeStats = await Recipe.findAndCountAll({
    where: { userId },
    attributes: [
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('favoriteCount')), 0), 'totalFavorites'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('commentCount')), 0), 'totalComments'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('viewCount')), 0), 'totalViews']
    ],
    raw: true
  })

  // Recipe.findAndCountAll returns { count, rows } - for aggregate we need findAll or use query
  const recipeAgg = await Recipe.findAll({
    where: { userId },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'recipeCount'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('favoriteCount')), 0), 'totalFavorites'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('commentCount')), 0), 'totalComments'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('viewCount')), 0), 'totalViews']
    ],
    raw: true
  })

  const stats = recipeAgg[0] || {}
  const recipeCount = parseInt(stats.recipeCount) || 0
  const totalFavorites = parseInt(stats.totalFavorites) || 0
  const totalComments = parseInt(stats.totalComments) || 0
  const totalViews = parseInt(stats.totalViews) || 0

  // 计算平均 qualityScore
  const avgQuality = totalViews * 0.3 + totalFavorites * 2 + totalComments * 1.5

  // 积分公式：recipeCount * 30 + avgQuality * 5 + totalFavorites * 2 + totalComments * 1
  const score = recipeCount * 30 + avgQuality * 5 + totalFavorites * 2 + totalComments * 1

  return computeLevel(Math.round(score))
}

/**
 * 获取多个作者的等级信息（批量查询）
 * @param {string[]} userIds - 用户ID数组
 * @returns {Promise<Map<string, Object>>} userId -> levelInfo
 */
async function getBulkAuthorLevel(userIds) {
  if (!userIds || userIds.length === 0) return new Map()

  const { Recipe, sequelize } = require('../models')

  const results = await Recipe.findAll({
    where: { userId: { [require('sequelize').Op.in]: userIds } },
    attributes: [
      'userId',
      [sequelize.fn('COUNT', sequelize.col('id')), 'recipeCount'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('favoriteCount')), 0), 'totalFavorites'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('commentCount')), 0), 'totalComments'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('viewCount')), 0), 'totalViews']
    ],
    group: ['userId'],
    raw: true
  })

  const map = new Map()

  // 初始化所有用户（那些没有食谱的等级为1）
  for (const uid of userIds) {
    map.set(uid, computeLevel(0))
  }

  // 覆盖有食谱数据的用户
  for (const row of results) {
    const uid = row.userId
    const recipeCount = parseInt(row.recipeCount) || 0
    const totalFavorites = parseInt(row.totalFavorites) || 0
    const totalComments = parseInt(row.totalComments) || 0
    const totalViews = parseInt(row.totalViews) || 0
    const avgQuality = totalViews * 0.3 + totalFavorites * 2 + totalComments * 1.5
    const score = recipeCount * 30 + avgQuality * 5 + totalFavorites * 2 + totalComments * 1
    map.set(uid, computeLevel(Math.round(score)))
  }

  return map
}

module.exports = { getAuthorLevel, getBulkAuthorLevel, LEVELS, computeLevel }