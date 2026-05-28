'use strict'

/**
 * utils/achievementChecker.js
 * 成就系统 — 定义 + 自动检查与解锁
 *
 * 共 6 类、25 个成就
 * 每个成就定义：type, title, description, icon, check, getProgress
 */

const { createNotification } = require('./notificationHelper')

/**
 * 计算进度 helper — 根据成就类型获取当前用户进度
 */
async function getProgress(userId, type, models) {
  switch (type) {
    // ── 发布者 ──
    case 'first-recipe':
    case 'recipe-10':
    case 'recipe-50':
    case 'recipe-100':
    case 'master-chef': {
      const count = await models.Recipe.count({ where: { userId } })
      return count
    }
    // ── 收藏家 ──
    case 'favorite-10':
    case 'favorite-50':
    case 'favorite-100':
    case 'favorite-500': {
      const count = await models.Favorite.count({ where: { userId } })
      return count
    }
    // ── 评论家 ──
    case 'first-comment':
    case 'comment-10':
    case 'comment-50':
    case 'comment-100': {
      const count = await models.Comment.count({ where: { userId } })
      return count
    }
    // ── 厨神(烹饪) ──
    case 'first-cook':
    case 'cook-10':
    case 'cook-50':
    case 'cook-100': {
      const count = await models.CookingLog.count({ where: { userId } })
      return count
    }
    // ── 探索家 ──
    case 'browse-100':
    case 'browse-500':
    case 'browse-1000': {
      // 从 BehaviorEvent 统计用户浏览过的不同食谱数量
      const result = await models.BehaviorEvent.count({
        where: { userId, eventType: 'view' }
      })
      return result
    }
    // ── 社交达人 ──
    case 'follow-10':
    case 'follow-50':
    case 'follow-100': {
      const count = await models.Follow.count({ where: { followingId: userId } })
      return count
    }
    case 'popular-recipe': {
      // 检查用户是否有任一食谱的 favoriteCount >= 50
      const recipe = await models.Recipe.findOne({
        where: { userId, favoriteCount: { [models.Sequelize.Op.gte]: 50 } },
        attributes: ['favoriteCount']
      })
      return recipe ? recipe.favoriteCount : 0
    }
    case 'social-butterfly': {
      const following = await models.Follow.count({ where: { followerId: userId } })
      const followers = await models.Follow.count({ where: { followingId: userId } })
      return following + followers
    }
    default:
      return 0
  }
}

/**
 * 获取成就的最大进度阈值
 */
function getMaxProgress(type) {
  const thresholds = {
    'first-recipe': 1,
    'recipe-10': 10,
    'recipe-50': 50,
    'recipe-100': 100,
    'master-chef': 200,
    'favorite-10': 10,
    'favorite-50': 50,
    'favorite-100': 100,
    'favorite-500': 500,
    'first-comment': 1,
    'comment-10': 10,
    'comment-50': 50,
    'comment-100': 100,
    'first-cook': 1,
    'cook-10': 10,
    'cook-50': 50,
    'cook-100': 100,
    'browse-100': 100,
    'browse-500': 500,
    'browse-1000': 1000,
    'follow-10': 10,
    'follow-50': 50,
    'follow-100': 100,
    'popular-recipe': 50,
    'social-butterfly': 20,
  }
  return thresholds[type] || 0
}

/**
 * 成就定义
 * check 函数接收 (userId, models) 返回 boolean
 */
const ACHIEVEMENT_DEFS = {
  // ── 发布者 (5) ──
  'first-recipe': {
    title: '初出茅庐',
    description: '发布第1道食谱',
    icon: '\uD83E\uDD5A',
    category: 'publisher',
    check: async (userId, models) => {
      const count = await models.Recipe.count({ where: { userId } })
      return count >= 1
    }
  },
  'recipe-10': {
    title: '小有成就',
    description: '发布10道食谱',
    icon: '\uD83D\uDCDA',
    category: 'publisher',
    check: async (userId, models) => {
      const count = await models.Recipe.count({ where: { userId } })
      return count >= 10
    }
  },
  'recipe-50': {
    title: '食谱达人',
    description: '发布50道食谱',
    icon: '\uD83D\uDCD6',
    category: 'publisher',
    check: async (userId, models) => {
      const count = await models.Recipe.count({ where: { userId } })
      return count >= 50
    }
  },
  'recipe-100': {
    title: '高产作者',
    description: '发布100道食谱',
    icon: '\uD83C\uDFC6',
    category: 'publisher',
    check: async (userId, models) => {
      const count = await models.Recipe.count({ where: { userId } })
      return count >= 100
    }
  },
  'master-chef': {
    title: '厨神',
    description: '发布200道食谱',
    icon: '\uD83D\uDC51',
    category: 'publisher',
    check: async (userId, models) => {
      const count = await models.Recipe.count({ where: { userId } })
      return count >= 200
    }
  },

  // ── 收藏家 (4) ──
  'favorite-10': {
    title: '美食猎人',
    description: '收藏10道食谱',
    icon: '\u2764\uFE0F',
    category: 'collector',
    check: async (userId, models) => {
      const count = await models.Favorite.count({ where: { userId } })
      return count >= 10
    }
  },
  'favorite-50': {
    title: '收藏达人',
    description: '收藏50道食谱',
    icon: '\u2B50',
    category: 'collector',
    check: async (userId, models) => {
      const count = await models.Favorite.count({ where: { userId } })
      return count >= 50
    }
  },
  'favorite-100': {
    title: '收藏大师',
    description: '收藏100道食谱',
    icon: '\uD83C\uDF1F',
    category: 'collector',
    check: async (userId, models) => {
      const count = await models.Favorite.count({ where: { userId } })
      return count >= 100
    }
  },
  'favorite-500': {
    title: '收藏狂人',
    description: '收藏500道食谱',
    icon: '\uD83D\uDC8E',
    category: 'collector',
    check: async (userId, models) => {
      const count = await models.Favorite.count({ where: { userId } })
      return count >= 500
    }
  },

  // ── 评论家 (4) ──
  'first-comment': {
    title: '畅所欲言',
    description: '发表第1条评论',
    icon: '\uD83D\uDCAC',
    category: 'commenter',
    check: async (userId, models) => {
      const count = await models.Comment.count({ where: { userId } })
      return count >= 1
    }
  },
  'comment-10': {
    title: '评论之星',
    description: '发表10条评论',
    icon: '\uD83D\uDDE3\uFE0F',
    category: 'commenter',
    check: async (userId, models) => {
      const count = await models.Comment.count({ where: { userId } })
      return count >= 10
    }
  },
  'comment-50': {
    title: '评论达人',
    description: '发表50条评论',
    icon: '\uD83C\uDFA4',
    category: 'commenter',
    check: async (userId, models) => {
      const count = await models.Comment.count({ where: { userId } })
      return count >= 50
    }
  },
  'comment-100': {
    title: '评论大师',
    description: '发表100条评论',
    icon: '\uD83C\uDF99\uFE0F',
    category: 'commenter',
    check: async (userId, models) => {
      const count = await models.Comment.count({ where: { userId } })
      return count >= 100
    }
  },

  // ── 厨神(烹饪) (4) ──
  'first-cook': {
    title: '初次下厨',
    description: '记录第1次烹饪日志',
    icon: '\uD83C\uDF73',
    category: 'cook',
    check: async (userId, models) => {
      const count = await models.CookingLog.count({ where: { userId } })
      return count >= 1
    }
  },
  'cook-10': {
    title: '家常便饭',
    description: '记录10次烹饪日志',
    icon: '\uD83E\uDD58',
    category: 'cook',
    check: async (userId, models) => {
      const count = await models.CookingLog.count({ where: { userId } })
      return count >= 10
    }
  },
  'cook-50': {
    title: '厨房常客',
    description: '记录50次烹饪日志',
    icon: '\uD83C\uDF72',
    category: 'cook',
    check: async (userId, models) => {
      const count = await models.CookingLog.count({ where: { userId } })
      return count >= 50
    }
  },
  'cook-100': {
    title: '烹饪高手',
    description: '记录100次烹饪日志',
    icon: '\uD83C\uDF5C',
    category: 'cook',
    check: async (userId, models) => {
      const count = await models.CookingLog.count({ where: { userId } })
      return count >= 100
    }
  },

  // ── 探索家 (3) ──
  'browse-100': {
    title: '走马观花',
    description: '浏览100道食谱',
    icon: '\uD83D\uDC40',
    category: 'explorer',
    check: async (userId, models) => {
      const count = await models.BehaviorEvent.count({
        where: { userId, eventType: 'view' }
      })
      return count >= 100
    }
  },
  'browse-500': {
    title: '博览群食',
    description: '浏览500道食谱',
    icon: '\uD83D\uDD2D',
    category: 'explorer',
    check: async (userId, models) => {
      const count = await models.BehaviorEvent.count({
        where: { userId, eventType: 'view' }
      })
      return count >= 500
    }
  },
  'browse-1000': {
    title: '资深食客',
    description: '浏览1000道食谱',
    icon: '\uD83D\uDD75\uFE0F',
    category: 'explorer',
    check: async (userId, models) => {
      const count = await models.BehaviorEvent.count({
        where: { userId, eventType: 'view' }
      })
      return count >= 1000
    }
  },

  // ── 社交达人 (5) ──
  'follow-10': {
    title: '小有人气',
    description: '被10人关注',
    icon: '\uD83E\uDD1D',
    category: 'social',
    check: async (userId, models) => {
      const count = await models.Follow.count({ where: { followingId: userId } })
      return count >= 10
    }
  },
  'follow-50': {
    title: '人气渐旺',
    description: '被50人关注',
    icon: '\uD83E\uDD02',
    category: 'social',
    check: async (userId, models) => {
      const count = await models.Follow.count({ where: { followingId: userId } })
      return count >= 50
    }
  },
  'follow-100': {
    title: '社区红人',
    description: '被100人关注',
    icon: '\uD83C\uDF1F',
    category: 'social',
    check: async (userId, models) => {
      const count = await models.Follow.count({ where: { followingId: userId } })
      return count >= 100
    }
  },
  'popular-recipe': {
    title: '人气食谱',
    description: '某食谱被50人收藏',
    icon: '\u2B50',
    category: 'social',
    check: async (userId, models) => {
      const recipe = await models.Recipe.findOne({
        where: { userId, favoriteCount: { [models.Sequelize.Op.gte]: 50 } },
        attributes: ['id']
      })
      return !!recipe
    }
  },
  'social-butterfly': {
    title: '社交达人',
    description: '关注与被关注总数超过20',
    icon: '\uD83E\uDD8B',
    category: 'social',
    check: async (userId, models) => {
      const following = await models.Follow.count({ where: { followerId: userId } })
      const followers = await models.Follow.count({ where: { followingId: userId } })
      return (following + followers) >= 20
    }
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
 * @returns {Promise<object[]>} 新解锁的成就记录数组
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

/**
 * 获取用户对所有成就的进度（含已解锁/未解锁状态）
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getAllAchievementsWithProgress(userId) {
  const models = require('../models')
  const unlocked = await models.Achievement.findAll({
    where: { userId },
    order: [['unlockedAt', 'DESC']]
  })
  const unlockedMap = {}
  for (const a of unlocked) {
    unlockedMap[a.type] = a
  }

  const result = []
  for (const [type, def] of Object.entries(ACHIEVEMENT_DEFS)) {
    const progress = await getProgress(userId, type, models)
    const maxProgress = getMaxProgress(type)
    const existing = unlockedMap[type]

    result.push({
      type,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      ...(existing ? {
        unlocked: true,
        id: existing.id,
        unlockedAt: existing.unlockedAt
      } : {
        unlocked: false
      }),
      progress,
      maxProgress
    })
  }

  return result
}

module.exports = {
  ACHIEVEMENT_DEFS,
  checkAndUnlockAchievement,
  checkAllAchievements,
  getAllAchievementsWithProgress
}