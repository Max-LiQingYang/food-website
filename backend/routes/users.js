'use strict'

/**
 * routes/users.js
 * 用户相关路由（公开）
 *
 * GET /:id/profile  — 用户信息
 * GET /:id/recipes  — 用户发布的食谱
 */

const express = require('express')
const { User, Recipe, Comment, Favorite, Collection, ShoppingList, Activity, Follow, CookingLog, sequelize } = require('../models')
const { Op } = require('sequelize')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

const LIST_ATTRIBUTES = [
  'id', 'title', 'coverImage', 'author', 'cookTime',
  'description', 'category', 'servings', 'difficulty', 'userId', 'createdAt', 'updatedAt'
]

// ─────────────────────────────────────────────────────────────────
// GET /:id/profile — 用户信息
// ─────────────────────────────────────────────────────────────────
router.get('/:id/profile', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'nickname', 'avatar', 'createdAt']
    })

    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    return res.status(200).json(resJSON(0, 'ok', user))
  } catch (err) {
    console.error('[GET /users/:id/profile] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/recipes — 用户发布的食谱
// ─────────────────────────────────────────────────────────────────
router.get('/:id/recipes', async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1
    let pageSize = parseInt(req.query.pageSize, 10) || 20

    if (page < 1) page = 1
    if (pageSize > 100) pageSize = 100
    if (pageSize < 1) pageSize = 20

    const offset = (page - 1) * pageSize

    // 确认用户存在
    const user = await User.findByPk(req.params.id, {
      attributes: ['id']
    })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    const { count, rows } = await Recipe.findAndCountAll({
      where: { userId: req.params.id },
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize,
      attributes: LIST_ATTRIBUTES
    })

    return res.status(200).json(
      resJSON(0, 'ok', {
        list: rows,
        total: count,
        page,
        pageSize
      })
    )
  } catch (err) {
    console.error('[GET /users/:id/recipes] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/stats — 用户烹饪统计
// ─────────────────────────────────────────────────────────────────
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params

    const user = await User.findByPk(id, { attributes: ['id'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    const [recipeCount, favoriteCount, commentCount, followersCount, followingCount] = await Promise.all([
      Recipe.count({ where: { userId: id } }),
      Favorite.count({ where: { userId: id, isDeleted: false } }),
      Comment.count({ where: { userId: id } }),
      Follow.count({ where: { followingId: id } }),
      Follow.count({ where: { followerId: id } })
    ])

    return res.status(200).json(
      resJSON(0, 'ok', {
        userId: id,
        recipeCount,
        favoriteCount,
        commentCount,
        followersCount,
        followingCount
      })
    )
  } catch (err) {
    console.error('[GET /users/:id/stats] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/stats-trends — 用户收藏与烹饪趋势
// ─────────────────────────────────────────────────────────────────
router.get('/:id/stats-trends', async (req, res) => {
  try {
    const { id } = req.params
    const days = parseInt(req.query.days) || 30
    
    const since = new Date()
    since.setDate(since.getDate() - days)
    
    // 收藏趋势：查询 favorites 表，按天 GROUP BY
    const favRows = await Favorite.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', '*'), 'dailyNew']
      ],
      where: {
        userId: id,
        createdAt: { [Op.gte]: since }
      },
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    })
    
    // 计算累计值（需要查全部历史）
    // 获取 days 区间开始时的累计值
    const beforeCount = await Favorite.count({
      where: { userId: id, createdAt: { [Op.lt]: since } }
    })
    
    let cumulative = beforeCount
    const favorites = favRows.map(row => {
      cumulative += Number(row.dailyNew)
      return { date: row.date, dailyNew: Number(row.dailyNew), cumulative }
    })
    
    // 烹饪频率：按 cookedAt 天 GROUP BY
    const cookRows = await CookingLog.findAll({
      attributes: [
        'cookedAt',
        [sequelize.fn('COUNT', '*'), 'count'],
        [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']
      ],
      where: {
        userId: id,
        cookedAt: { [Op.gte]: since.toISOString().slice(0, 10) }
      },
      group: ['cookedAt'],
      order: [['cookedAt', 'ASC']],
      raw: true
    })
    
    const cooking = cookRows.map(row => ({
      date: row.cookedAt,
      count: Number(row.count),
      avgRating: row.avgRating ? Math.round(Number(row.avgRating) * 10) / 10 : 0
    }))
    
    res.json({ userId: id, days, favorites, cooking })
  } catch (err) {
    console.error('stats-trends error:', err)
    res.status(500).json({ error: 'Failed to load stats trends' })
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/favorites — 用户收藏的食谱列表
// ─────────────────────────────────────────────────────────────────
router.get('/:id/favorites', async (req, res) => {
  try {
    const { id } = req.params
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))

    const user = await User.findByPk(id, { attributes: ['id'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    const offset = (page - 1) * pageSize

    const { count, rows } = await Favorite.findAndCountAll({
      where: { userId: id, isDeleted: false },
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize
    })

    // Fetch associated recipes preserving favorite order
    const recipeIds = rows.map(f => f.recipeId)
    const recipes = recipeIds.length > 0
      ? await Recipe.findAll({
          where: { id: { [Op.in]: recipeIds } },
          attributes: LIST_ATTRIBUTES
        })
      : []

    const recipeMap = {}
    for (const r of recipes) {
      recipeMap[r.id] = r
    }
    const list = rows.map(f => {
      const recipe = recipeMap[f.recipeId]
      if (!recipe) return null
      return {
        ...(recipe.toJSON ? recipe.toJSON() : recipe),
        favoriteId: f.id,
        note: f.note || null
      }
    }).filter(Boolean)

    return res.status(200).json(
      resJSON(0, 'ok', {
        list,
        total: count,
        page,
        pageSize
      })
    )
  } catch (err) {
    console.error('[GET /users/:id/favorites] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/activities — 指定用户的活动记录
// ─────────────────────────────────────────────────────────────────
router.get('/:id/activities', async (req, res) => {
  try {
    const { id } = req.params
    let page = Math.max(1, parseInt(req.query.page, 10) || 1)
    let pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
    const offset = (page - 1) * pageSize

    const user = await User.findByPk(id, { attributes: ['id'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    const { count, rows } = await Activity.findAndCountAll({
      where: { userId: id },
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize
    })

    const list = rows.map(r => {
      const item = r.toJSON()
      try {
        item.extra = typeof r.extra === 'string' ? JSON.parse(r.extra) : r.extra
      } catch {
        item.extra = null
      }
      return item
    })

    return res.status(200).json(
      resJSON(0, 'ok', { list, total: count, page, pageSize })
    )
  } catch (err) {
    console.error('[GET /users/:id/activities] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/activity-heatmap — 用户活跃热力图（近 N 天逐日汇总）
// ─────────────────────────────────────────────────────────────────
router.get('/:id/activity-heatmap', async (req, res) => {
  try {
    const { id } = req.params
    const days = Math.min(90, Math.max(7, parseInt(req.query.days, 10) || 30))

    const user = await User.findByPk(id, { attributes: ['id'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const dateAttr = sequelize.fn('DATE', sequelize.col('createdAt'))

    const [recipeRows, favoriteRows, commentRows] = await Promise.all([
      Recipe.findAll({
        attributes: [[dateAttr, 'date'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where: { userId: id, createdAt: { [Op.gte]: cutoff } },
        group: ['date'],
        raw: true
      }),
      Favorite.findAll({
        attributes: [[dateAttr, 'date'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where: { userId: id, isDeleted: false, createdAt: { [Op.gte]: cutoff } },
        group: ['date'],
        raw: true
      }),
      Comment.findAll({
        attributes: [[dateAttr, 'date'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where: { userId: id, createdAt: { [Op.gte]: cutoff } },
        group: ['date'],
        raw: true
      })
    ])

    // Merge into daily map
    const dailyMap = {}
    for (const row of recipeRows) {
      const d = row.date
      if (!dailyMap[d]) dailyMap[d] = { date: d, recipeCount: 0, favoriteCount: 0, commentCount: 0, total: 0 }
      dailyMap[d].recipeCount = parseInt(row.count, 10)
      dailyMap[d].total += parseInt(row.count, 10)
    }
    for (const row of favoriteRows) {
      const d = row.date
      if (!dailyMap[d]) dailyMap[d] = { date: d, recipeCount: 0, favoriteCount: 0, commentCount: 0, total: 0 }
      dailyMap[d].favoriteCount = parseInt(row.count, 10)
      dailyMap[d].total += parseInt(row.count, 10)
    }
    for (const row of commentRows) {
      const d = row.date
      if (!dailyMap[d]) dailyMap[d] = { date: d, recipeCount: 0, favoriteCount: 0, commentCount: 0, total: 0 }
      dailyMap[d].commentCount = parseInt(row.count, 10)
      dailyMap[d].total += parseInt(row.count, 10)
    }

    // Fill all dates in the range with zeros for empty days
    const daily = []
    const cursor = new Date(cutoff)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10)
      if (dailyMap[key]) {
        daily.push(dailyMap[key])
      } else {
        daily.push({ date: key, recipeCount: 0, favoriteCount: 0, commentCount: 0, total: 0 })
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    const maxTotal = daily.reduce((m, d) => Math.max(m, d.total), 0)

    return res.status(200).json(
      resJSON(0, 'ok', { userId: id, days, daily, maxTotal })
    )
  } catch (err) {
    console.error('[GET /users/:id/activity-heatmap] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/author-info — 作者等级信息
// ─────────────────────────────────────────────────────────────────
router.get('/:id/author-info', async (req, res) => {
  try {
    const { getAuthorLevel } = require('../utils/authorLevel')
    const levelInfo = await getAuthorLevel(req.params.id)
    const { User } = require('../models')
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'nickname']
    })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }
    return res.status(200).json(resJSON(0, 'ok', {
      user: { id: user.id, username: user.username, nickname: user.nickname },
      level: levelInfo
    }))
  } catch (err) {
    console.error('[GET /users/:id/author-info] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ── 获取用户的所有改编食谱 ──────────────────────────────────────────────
// GET /api/users/:id/forks（公开）
router.get('/:id/forks', async (req, res) => {
  try {
    const { RecipeFork, Recipe } = require('../models')
    const userId = req.params.id
    const { page = '1', pageSize = '20' } = req.query

    const offset = (parseInt(page) - 1) * parseInt(pageSize)

    const { count, rows } = await RecipeFork.findAndCountAll({
      where: { forkedByUserId: userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(pageSize),
      offset,
      include: [
        {
          model: Recipe,
          as: 'forkedRecipe',
          attributes: ['id', 'title', 'coverImage', 'description', 'category', 'cookTime', 'servings', 'difficulty', 'createdAt']
        },
        {
          model: Recipe,
          as: 'originalRecipe',
          attributes: ['id', 'title']
        }
      ]
    })

    const forks = rows.map(f => ({
      id: f.forkedRecipe.id,
      title: f.forkedRecipe.title,
      coverImage: f.forkedRecipe.coverImage,
      description: f.forkedRecipe.description,
      category: f.forkedRecipe.category,
      cookTime: f.forkedRecipe.cookTime,
      servings: f.forkedRecipe.servings,
      difficulty: f.forkedRecipe.difficulty,
      createdAt: f.forkedRecipe.createdAt,
      originalTitle: f.originalRecipe ? f.originalRecipe.title : null,
      changesNote: f.changesNote
    }))

    return res.status(200).json(resJSON(0, 'ok', { count, forks, page: parseInt(page), pageSize: parseInt(pageSize) }))
  } catch (err) {
    console.error('[GET /users/:id/forks] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/cooked-recipes — 用户做过的食谱列表（分页，公开）
// ─────────────────────────────────────────────────────────────────
router.get('/:id/cooked-recipes', async (req, res) => {
  try {
    const { id } = req.params
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
    const offset = (page - 1) * pageSize

    const user = await User.findByPk(id, { attributes: ['id'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    const { UserRecipeAction } = require('../models')

    const { count, rows } = await UserRecipeAction.findAndCountAll({
      where: { userId: id, action: 'cooked' },
      order: [['lastCookedAt', 'DESC']],
      offset,
      limit: pageSize,
    })

    // JOIN Recipe 表获取食谱基本信息
    const recipeIds = rows.map(r => r.recipeId)
    const recipes = recipeIds.length > 0
      ? await Recipe.findAll({
          where: { id: { [Op.in]: recipeIds } },
          attributes: ['id', 'title', 'coverImage', 'category'],
        })
      : []

    const recipeMap = {}
    for (const r of recipes) {
      recipeMap[r.id] = r
    }

    const list = rows.map(action => {
      const recipe = recipeMap[action.recipeId]
      return {
        recipeId: action.recipeId,
        title: recipe ? recipe.title : '未知食谱',
        coverImage: recipe ? recipe.coverImage : null,
        category: recipe ? recipe.category : null,
        cookCount: action.count,
        lastCookedAt: action.lastCookedAt,
      }
    })

    return res.status(200).json(
      resJSON(0, 'ok', { list, total: count, page, pageSize })
    )
  } catch (err) {
    console.error('[GET /users/:id/cooked-recipes] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/skill-profile — 六维雷达图数据
// ─────────────────────────────────────────────────────────────────
router.get('/:id/skill-profile', async (req, res) => {
  try {
    const { id } = req.params

    const logs = await CookingLog.findAll({
      where: { userId: id },
      include: [{ model: Recipe, attributes: ['category', 'categoryTags'] }],
      raw: true
    })

    if (logs.length === 0) {
      return res.json({ userId: id, totalCooked: 0, dimensions: [] })
    }

    const dims = {
      '中式烹饪': 0,
      '西式料理': 0,
      '甜点烘焙': 0,
      '日韩料理': 0,
      '辛辣口味': 0,
      '清淡口味': 0,
    }

    for (const log of logs) {
      const cat = log['Recipe.category']
      const tagsRaw = log['Recipe.categoryTags']
      let tags = {}
      if (tagsRaw) {
        try { tags = typeof tagsRaw === 'string' ? JSON.parse(tagsRaw) : tagsRaw } catch {}
      }

      if (cat === 'chinese' || tags.cuisine === '中式') dims['中式烹饪']++
      if (cat === 'western' || tags.cuisine === '西式') dims['西式料理']++
      if (cat === 'dessert') dims['甜点烘焙']++
      if (cat === 'japanese' || cat === 'korean') dims['日韩料理']++
      if (tags.flavor && (typeof tags.flavor === 'string' ? tags.flavor.includes('辣') : false)) dims['辛辣口味']++
      if (tags.flavor && (typeof tags.flavor === 'string' ? tags.flavor.includes('清淡') || tags.flavor.includes('鲜') : false)) dims['清淡口味']++
    }

    const maxRaw = Math.max(...Object.values(dims), 1)

    const dimensions = Object.entries(dims).map(([name, rawCount]) => ({
      name,
      value: Math.round((rawCount / maxRaw) * 100),
      rawCount
    }))

    res.json({ userId: id, totalCooked: logs.length, dimensions })
  } catch (err) {
    console.error('skill-profile error:', err)
    res.status(500).json({ error: 'Failed to load skill profile' })
  }
})

module.exports = router