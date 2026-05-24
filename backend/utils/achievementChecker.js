'use strict'

/**
 * utils/achievementChecker.js
 * 成就系统 — 定义 + 自动检查与解锁
 */

const { createNotification } = require('./notificationHelper')

/**
 * 成就定义
 * check 函数接收 (userId, models) 返回 boolean
 */
const ACHIEVEMENT_DEFS = {
  'first-recipe': {
    title: '初出茅庐',
    description: '发布第一道食谱',
    icon: '\uD83C\uDF73',
    check: async (userId, models) => {
      const count = await models.Recipe.count({ where: { userId } })
      return count >= 1
    }
  },
  'recipe-10': {
    title: '食谱达人',
    description: '发布10道食谱',
    icon: '\uD83D\uDCDA',
    check: async (userId, models) => {
      const count = await models.Recipe.count({ where: { userId } })
      return count >= 10
    }
  },
  'recipe-50': {
    title: '食谱大师',
    description: '发布50道食谱',
    icon: '\uD83C\uDFC6',
    check: async (userId, models) => {
      const count = await models.Recipe.count({ where: { userId } })
      return count >= 50
    }
  },
  'first-comment': {
    title: '畅所欲言',
    description: '发表第一条评论',
    icon: '\uD83D\uDCAC',
    check: async (userId, models) => {
      const count = await models.Comment.count({ where: { userId } })
      return count >= 1
    }
  },
  'favorite-10': {
    title: '美食猎人',
    description: '收藏10道食谱',
    icon: '\u2764\uFE0F',
    check: async (userId, models) => {
      const count = await models.Favorite.count({ where: { userId } })
      return count >= 10
    }
  },
  'favorite-50': {
    title: '收藏达人',
    description: '收藏50道食谱',
    icon: '\uD83D\uDC96',
    check: async (_userId, _models) => false
  },
  'popular-recipe': {
    title: '人气食谱',
    description: '食谱被收藏超过50次',
    icon: '\u2B50',
    check: async (_userId, _models) => false
  },
  'social-butterfly': {
    title: '社交达人',
    description: '关注/被关注超过20人',
    icon: '\uD83E\uDD8B',
    check: async (userId, models) => {
      const following = await models.Follow.count({ where: { followerId: userId } })
      const followers = await models.Follow.count({ where: { followingId: userId } })
      return (following + followers) >= 20
    }
  },
  'master-chef': {
    title: '厨神',
    description: '累计发布50道食谱',
    icon: '\uD83D\uDC68\u200D\uD83C\uDF73',
    check: async (_userId, _models) => false
  }
}

/**
 * 检查并解锁单个成就
 * @param {string} userId
 * @param {string} type — 成就类型 key
 * @param {object} models — db 对象（含所有模型）
 * @returns {Promise<object|null>} 新创建的 Achievement 记录或 null
 */
async function checkAndUnlockAchievement(userId, type, models) {
  const def = ACHIEVEMENT_DEFS[type]
  if (!def) return null

  // 检查是否已解锁
  const existing = await models.Achievement.findOne({
    where: { userId, type }
  })
  if (existing) return null

  // 检查条件是否满足
  const passed = await def.check(userId, models)
  if (!passed) return null

  // 解锁
  const achievement = await models.Achievement.create({
    userId,
    type,
    title: def.title,
    description: def.description,
    icon: def.icon
  })

  // 创建里程碑通知
  setImmediate(() => {
    createNotification({
      userId,
      type: 'milestone',
      message: `\uD83C\uDF89 解锁成就：${def.icon} ${def.title}`,
      link: `/user/${userId}`
    }).catch(err => console.error('[Achievement notification error]', err))
  })

  return achievement
}

/**
 * 批量检查多个成就
 * @param {string} userId
 * @param {string[]} types — 成就类型数组
 */
async function checkAllAchievements(userId, types) {
  const models = require('../models')
  const results = []
  for (const type of types) {
    const result = await checkAndUnlockAchievement(userId, type, models)
    if (result) results.push(result)
  }
  return results
}

module.exports = {
  ACHIEVEMENT_DEFS,
  checkAndUnlockAchievement,
  checkAllAchievements
}