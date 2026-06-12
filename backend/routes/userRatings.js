'use strict'

/**
 * routes/userRatings.js
 * 用户个人评分历史相关路由（迭代 #134，ARCH §1）
 *
 * 端点：
 *   GET  /api/users/:userId/ratings/summary   — 4 维平均 + 全站对比 + 分布 + 趋势
 *   GET  /api/users/:userId/ratings/history   — 评分历史分页列表
 *   GET  /api/users/:userId/ratings/top       — TOP 5 高/低分
 *   GET  /api/users/:userId/ratings/privacy   — 读取评分历史可见性
 *   PUT  /api/users/:userId/ratings/privacy   — 更新评分历史可见性
 *
 * 挂载位置（在 routes/index.js）：
 *   router.use('/users', userRatingsRouter)
 *   内部路由以 /:userId/ratings/* 形式注册
 *
 * 关键设计（ARCH §1.7）：
 *   - 进程内 LRU 缓存：summary/top 各 5min，privacy 不缓存
 *   - 同食谱多次评分：取最新一次（应用层用 recipeLatestMap 二次校验）
 *   - 4 维全 NULL 的旧评论：不参与 4 维统计但计入"总评分数"
 *   - privacy 字段：复用 User.preferences.privacy.ratingsHistoryPublic（ARCH §1.5）
 */

const express = require('express')
const { Op, fn, col, literal } = require('sequelize')
const { Comment, Recipe, User } = require('../models')
const auth = require('../middleware/auth')
const cache = require('../utils/cache')
const {
  computeGlobalStats,
  CACHE_KEY: SITE_CACHE_KEY
} = require('./commentGlobalStats')

const router = express.Router({ mergeParams: true })

/** 4 维字段名 */
const DIMENSION_FIELDS = ['taste', 'difficulty', 'presentation', 'value']

/** 缓存 key 前缀 */
const CACHE_PREFIX_SUMMARY = 'rating:summary:'
const CACHE_PREFIX_TOP = 'rating:top:'

/** 缓存 TTL */
const TTL_SUMMARY = 5 * 60 * 1000 // 5 min
const TTL_TOP = 5 * 60 * 1000 // 5 min

function resJSON(code, message, data) {
  return { code, message, data }
}

/** 解析 timeRange 参数（all/30d/90d/1y），返回 Date 或 null */
function parseTimeRange(timeRange) {
  const now = new Date()
  switch (timeRange) {
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    case 'all':
    case undefined:
    case null:
    case '':
      return null
    default:
      return null // 非法值兜底为 all
  }
}

/** 解析 preferences JSON */
function parsePrefs(prefs) {
  if (!prefs) return {}
  if (typeof prefs === 'object') return prefs
  try { return JSON.parse(prefs) } catch { return {} }
}

/** 获取某用户每食谱的最新 createdAt（去重子查询，ARCH §3.1） */
async function getRecipeLatestCreatedAt(userId) {
  // 取 (recipeId, MAX(createdAt)) —— 对应 SQL 模式
  // ARCH §3.1 注：MVP 阶段用 MAX(createdAt) + 应用层二次校验
  const rows = await Comment.findAll({
    where: { userId, parentId: null },
    attributes: [
      'recipeId',
      [fn('MAX', col('createdAt')), 'maxCreatedAt']
    ],
    group: ['recipeId'],
    raw: true
  })
  // 返回 Map<recipeId, maxCreatedAt(Date)>
  const map = new Map()
  for (const r of rows) {
    map.set(r.recipeId, new Date(r.maxCreatedAt))
  }
  return map
}

/**
 * GET /api/users/:userId/ratings/summary
 * 用户评分聚合统计（API-1）
 *
 * Query: timeRange=all|30d|90d|1y（默认 all）
 *
 * Response:
 *   { userId, totalRatings, validDimensionRatings,
 *     dimensionAverages: { taste: {average, count, siteAverage, delta}, ... },
 *     distribution: { taste: {1: 0, 2: 0, ...}, ... },
 *     trend: { interval: 'month', points: [{period, taste, difficulty, presentation, value, count}] }
 *   }
 */
router.get('/:userId/ratings/summary', async (req, res) => {
  try {
    const { userId } = req.params
    const timeRange = req.query.timeRange || 'all'

    // 缓存 key
    const cacheKey = CACHE_PREFIX_SUMMARY + userId + ':' + timeRange
    const cached = cache.get(cacheKey)
    if (cached) {
      res.set('X-Cache', 'HIT')
      return res.status(200).json(resJSON(0, 'ok', cached))
    }

    // 验证用户存在
    const user = await User.findByPk(userId, { attributes: ['id'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    const since = parseTimeRange(timeRange)
    const baseWhere = { userId, parentId: null }
    if (since) baseWhere.createdAt = { [Op.gte]: since }

    // 同食谱多次评分去重：取每食谱最新 createdAt
    const latestMap = await getRecipeLatestCreatedAt(userId)
    // 构造 in-subquery 条件：(recipeId, createdAt) IN [(r, latestMap.get(r)), ...]
    const dedupeConditions = []
    for (const [recipeId, maxCreatedAt] of latestMap.entries()) {
      // 时间窗过滤：若 maxCreatedAt < since 则不计入
      if (since && maxCreatedAt < since) continue
      dedupeConditions.push({ recipeId, createdAt: maxCreatedAt })
    }

    // 若去重条件为空，直接返回空数据
    if (dedupeConditions.length === 0) {
      const empty = {
        userId,
        timeRange,
        totalRatings: 0,
        validDimensionRatings: 0,
        dimensionAverages: emptyDimensionAverages(),
        distribution: emptyDistribution(),
        trend: { interval: 'month', points: [] }
      }
      cache.set(cacheKey, empty, TTL_SUMMARY)
      res.set('X-Cache', 'MISS')
      return res.status(200).json(resJSON(0, 'ok', empty))
    }

    // 主查询：取所有去重后的评论（含 userId filter）
    const comments = await Comment.findAll({
      where: {
        userId,
        parentId: null,
        [Op.or]: dedupeConditions
      },
      attributes: ['id', 'recipeId', 'rating', 'taste', 'difficulty', 'presentation', 'value', 'createdAt']
    })

    // 总评分数（rating IS NOT NULL 的评论数，含 4 维全 NULL 的旧评论）
    const totalRatings = comments.filter(c => c.rating != null).length
    // 有效维度评分数（至少 1 个维度非 NULL）
    const validDimensionRatings = comments.filter(c =>
      c.taste != null || c.difficulty != null || c.presentation != null || c.value != null
    ).length

    // 4 维个人平均
    const personalAverages = {}
    for (const dim of DIMENSION_FIELDS) {
      const valid = comments.filter(c => c[dim] != null)
      if (valid.length > 0) {
        const sum = valid.reduce((s, c) => s + c[dim], 0)
        personalAverages[dim] = {
          average: Math.round((sum / valid.length) * 10) / 10,
          count: valid.length
        }
      } else {
        personalAverages[dim] = { average: 0, count: 0 }
      }
    }

    // 4 维全站平均（从缓存读，miss 则同步计算）
    let siteStats = cache.get(SITE_CACHE_KEY)
    if (!siteStats) {
      siteStats = await computeGlobalStats()
      cache.set(SITE_CACHE_KEY, siteStats, 60 * 60 * 1000) // 1h
    }

    // 合并：dimensionAverages 含 siteAverage + delta
    const dimensionAverages = {}
    for (const dim of DIMENSION_FIELDS) {
      const personal = personalAverages[dim]
      const site = siteStats.dimAverages[dim] || { average: 0, count: 0 }
      const delta = personal.count > 0 && site.count > 0
        ? Math.round((personal.average - site.average) * 10) / 10
        : 0
      dimensionAverages[dim] = {
        average: personal.average,
        count: personal.count,
        siteAverage: site.average,
        delta
      }
    }

    // 分布（4 个维度的 1-5 分频次）
    const distribution = emptyDistribution()
    for (const c of comments) {
      for (const dim of DIMENSION_FIELDS) {
        const v = c[dim]
        if (v != null && v >= 1 && v <= 5) {
          distribution[dim][String(v)] = (distribution[dim][String(v)] || 0) + 1
        }
      }
    }

    // 趋势：按月聚合
    const monthlyMap = new Map() // key=YYYY-MM, value={sum: {taste,diff,pres,val}, count: {taste,...}, cnt: total}
    for (const c of comments) {
      if (c.createdAt == null) continue
      const d = new Date(c.createdAt)
      const period = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      if (!monthlyMap.has(period)) {
        monthlyMap.set(period, {
          taste: { sum: 0, n: 0 },
          difficulty: { sum: 0, n: 0 },
          presentation: { sum: 0, n: 0 },
          value: { sum: 0, n: 0 },
          cnt: 0
        })
      }
      const bucket = monthlyMap.get(period)
      for (const dim of DIMENSION_FIELDS) {
        const v = c[dim]
        if (v != null) {
          bucket[dim].sum += v
          bucket[dim].n += 1
        }
      }
      bucket.cnt += 1
    }

    const trendPoints = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-60) // ARCH §4.2：限制 ≤ 60 点
      .map(([period, bucket]) => {
        const point = { period, count: bucket.cnt }
        for (const dim of DIMENSION_FIELDS) {
          if (bucket[dim].n > 0) {
            point[dim] = Math.round((bucket[dim].sum / bucket[dim].n) * 10) / 10
          } else {
            point[dim] = null
          }
        }
        return point
      })

    const result = {
      userId,
      timeRange,
      totalRatings,
      validDimensionRatings,
      dimensionAverages,
      distribution,
      trend: { interval: 'month', points: trendPoints }
    }

    cache.set(cacheKey, result, TTL_SUMMARY)
    res.set('X-Cache', 'MISS')
    return res.status(200).json(resJSON(0, 'ok', result))
  } catch (err) {
    console.error('[GET /api/users/:userId/ratings/summary] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

/** 构造空 4 维 averages（用于去重后无评论场景） */
function emptyDimensionAverages() {
  const obj = {}
  for (const dim of DIMENSION_FIELDS) {
    obj[dim] = { average: 0, count: 0, siteAverage: 0, delta: 0 }
  }
  return obj
}

/** 构造空分布（每维度 1-5 全 0） */
function emptyDistribution() {
  const obj = {}
  for (const dim of DIMENSION_FIELDS) {
    obj[dim] = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  }
  return obj
}

/**
 * GET /api/users/:userId/ratings/history
 * 评分历史分页（API-2）
 *
 * Query:
 *   page=1
 *   pageSize=10（max 20）
 *   sort=time_desc | rating_desc | rating_asc
 *   timeRange=all|30d|90d|1y
 *   dimension=overall|taste|difficulty|presentation|value（仅 sort=rating_* 时生效）
 *
 * Response: { userId, total, page, pageSize, items: [...] }
 */
router.get('/:userId/ratings/history', async (req, res) => {
  try {
    const { userId } = req.params
    let page = parseInt(req.query.page, 10) || 1
    let pageSize = parseInt(req.query.pageSize, 10) || 10
    if (page < 1) page = 1
    if (pageSize < 1) pageSize = 10
    if (pageSize > 20) pageSize = 20

    const sort = req.query.sort || 'time_desc'
    const dimension = req.query.dimension || 'overall'
    const since = parseTimeRange(req.query.timeRange)

    // 验证用户存在
    const user = await User.findByPk(userId, { attributes: ['id'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    // 同食谱多次评分：取每食谱最新 createdAt
    const latestMap = await getRecipeLatestCreatedAt(userId)
    const dedupeConditions = []
    for (const [recipeId, maxCreatedAt] of latestMap.entries()) {
      if (since && maxCreatedAt < since) continue
      dedupeConditions.push({ recipeId, createdAt: maxCreatedAt })
    }

    if (dedupeConditions.length === 0) {
      return res.status(200).json(resJSON(0, 'ok', {
        userId, total: 0, page, pageSize, items: []
      }))
    }

    // 排序
    let order
    if (sort === 'rating_desc') {
      order = [[col(validateDimension(dimension)), 'DESC'], ['createdAt', 'DESC']]
    } else if (sort === 'rating_asc') {
      order = [[col(validateDimension(dimension)), 'ASC'], ['createdAt', 'DESC']]
    } else {
      order = [['createdAt', 'DESC']]
    }

    // 分页查询
    const offset = (page - 1) * pageSize
    const { count, rows } = await Comment.findAndCountAll({
      where: {
        userId,
        parentId: null,
        [Op.or]: dedupeConditions
      },
      include: [
        {
          model: Recipe,
          as: 'recipe',
          attributes: ['id', 'title', 'coverImage'],
          required: false
        }
      ],
      order,
      offset,
      limit: pageSize,
      distinct: true
    })

    const items = rows.map(c => formatHistoryItem(c))

    return res.status(200).json(resJSON(0, 'ok', {
      userId,
      total: count,
      page,
      pageSize,
      items
    }))
  } catch (err) {
    console.error('[GET /api/users/:userId/ratings/history] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

/** 维度白名单校验（防 SQL 注入） */
const VALID_DIMENSIONS = ['overall', 'rating', 'taste', 'difficulty', 'presentation', 'value']
function validateDimension(d) {
  if (VALID_DIMENSIONS.includes(d)) return d === 'overall' ? 'rating' : d
  return 'rating'
}

/** 序列化单条历史记录 */
function formatHistoryItem(c) {
  const r = c.toJSON()
  return {
    commentId: r.id,
    recipeId: r.recipeId,
    recipeTitle: r.recipe ? r.recipe.title : '',
    recipeCoverUrl: r.recipe ? r.recipe.coverImage : null,
    ratings: {
      taste: r.taste,
      difficulty: r.difficulty,
      presentation: r.presentation,
      value: r.value,
      overall: r.rating
    },
    commentText: r.content ? r.content.substring(0, 80) : '',
    createdAt: r.createdAt
  }
}

/**
 * GET /api/users/:userId/ratings/top
 * TOP 5 高/低分（API-3）
 *
 * Query: type=high|low（默认 high）, limit=5（max 10）
 * Response: { userId, type, items: [...] }
 */
router.get('/:userId/ratings/top', async (req, res) => {
  try {
    const { userId } = req.params
    const type = req.query.type === 'low' ? 'low' : 'high'
    let limit = parseInt(req.query.limit, 10) || 5
    if (limit > 10) limit = 10
    if (limit < 1) limit = 5

    const cacheKey = CACHE_PREFIX_TOP + userId + ':' + type
    const cached = cache.get(cacheKey)
    if (cached) {
      res.set('X-Cache', 'HIT')
      return res.status(200).json(resJSON(0, 'ok', cached))
    }

    // 验证用户存在
    const user = await User.findByPk(userId, { attributes: ['id'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    // 同食谱多次评分去重
    const latestMap = await getRecipeLatestCreatedAt(userId)
    const dedupeConditions = []
    for (const [recipeId, maxCreatedAt] of latestMap.entries()) {
      dedupeConditions.push({ recipeId, createdAt: maxCreatedAt })
    }
    if (dedupeConditions.length === 0) {
      const empty = { userId, type, items: [] }
      cache.set(cacheKey, empty, TTL_TOP)
      res.set('X-Cache', 'MISS')
      return res.status(200).json(resJSON(0, 'ok', empty))
    }

    // 排序：high 按 rating DESC，low 按 rating ASC
    const order = type === 'high'
      ? [['rating', 'DESC'], ['createdAt', 'DESC']]
      : [['rating', 'ASC'], ['createdAt', 'DESC']]

    // 只取有 rating 的（TOP 列表展示的是有总体分的评论）
    const rows = await Comment.findAll({
      where: {
        userId,
        parentId: null,
        rating: { [Op.ne]: null },
        [Op.or]: dedupeConditions
      },
      include: [
        {
          model: Recipe,
          as: 'recipe',
          attributes: ['id', 'title', 'coverImage'],
          required: false
        }
      ],
      order,
      limit
    })

    const items = rows.map(c => formatHistoryItem(c))
    const result = { userId, type, items }
    cache.set(cacheKey, result, TTL_TOP)
    res.set('X-Cache', 'MISS')
    return res.status(200).json(resJSON(0, 'ok', result))
  } catch (err) {
    console.error('[GET /api/users/:userId/ratings/top] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

/**
 * GET /api/users/:userId/ratings/privacy
 * 读取评分历史可见性（API-4 GET）
 *
 * Response: { userId, ratingsHistoryPublic: true|false }
 *
 * 默认值：true（PRD §4.3 / ARCH §1.5）
 */
router.get('/:userId/ratings/privacy', async (req, res) => {
  try {
    const { userId } = req.params
    const user = await User.findByPk(userId, { attributes: ['id', 'preferences'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }
    const prefs = parsePrefs(user.preferences)
    const ratingsHistoryPublic = prefs.privacy
      ? (prefs.privacy.ratingsHistoryPublic !== false) // 默认 true
      : true
    return res.status(200).json(resJSON(0, 'ok', {
      userId,
      ratingsHistoryPublic
    }))
  } catch (err) {
    console.error('[GET /api/users/:userId/ratings/privacy] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

/**
 * PUT /api/users/:userId/ratings/privacy
 * 更新评分历史可见性（API-4 PUT）
 * 鉴权：仅本人可改
 *
 * Body: { ratingsHistoryPublic: true|false }
 *
 * 副作用：更新后立即失效该用户的 rating:* 缓存（ARCH §1.7.3）
 */
router.put('/:userId/ratings/privacy', auth, async (req, res) => {
  try {
    const { userId } = req.params

    // 鉴权：仅本人
    if (req.userId !== userId) {
      return res.status(403).json(resJSON(403, '只能修改自己的隐私设置', null))
    }

    const { ratingsHistoryPublic } = req.body
    if (typeof ratingsHistoryPublic !== 'boolean') {
      return res.status(400).json(resJSON(400, 'ratingsHistoryPublic 必须是 boolean', null))
    }

    const user = await User.findByPk(userId, { attributes: ['id', 'preferences'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    const currentPrefs = parsePrefs(user.preferences)
    if (!currentPrefs.privacy) currentPrefs.privacy = {}
    currentPrefs.privacy.ratingsHistoryPublic = ratingsHistoryPublic

    await User.update(
      { preferences: JSON.stringify(currentPrefs) },
      { where: { id: userId } }
    )

    // 主动失效该用户的所有 rating 缓存（ARCH §1.7.3 强失效）
    let invalidatedSummary = cache.delByPrefix(CACHE_PREFIX_SUMMARY + userId)
    let invalidatedTop = cache.delByPrefix(CACHE_PREFIX_TOP + userId)
    console.log(`[privacy] Invalidated cache for userId=${userId}: summary=${invalidatedSummary}, top=${invalidatedTop}`)

    return res.status(200).json(resJSON(0, 'ok', {
      userId,
      ratingsHistoryPublic
    }))
  } catch (err) {
    console.error('[PUT /api/users/:userId/ratings/privacy] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router
