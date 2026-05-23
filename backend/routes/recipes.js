'use strict'

/**
 * routes/recipes.js
 * 食谱相关路由
 *
 * GET  /           — 列表（分页 + 分类筛选，公开）
 * GET  /search     — 搜索（标题 + 食材，公开）
 * GET  /:id        — 详情（公开）
 * POST /           — 创建（需认证）
 * PUT  /:id        — 编辑（需认证 + 作者）
 * DEL  /:id        — 删除（需认证 + 作者）
 */

const express = require('express')
const { Recipe } = require('../models')
const { Op, fn, col } = require('sequelize')
const auth = require('../middleware/auth')

const { createActivity } = require('../utils/activity')

const router = express.Router()

/**
 * 通用响应封装
 * @param {number} code
 * @param {string} message
 * @param {any} data
 */
function resJSON(code, message, data) {
  return { code, message, data }
}

/**
 * 计算食谱质量评分
 * qualityScore = f(commentCount, favoriteCount, totalScorePotential)
 * @param {Object} recipe - 食谱对象
 * @returns {{ qualityScore: number, qualityLabel: string|null }}
 */
function computeQuality(recipe) {
  const fav = recipe.favoriteCount || 0
  const com = recipe.commentCount || 0
  // 质量分 = 收藏数 * 2 + 评论数 * 3（评论比收藏权重略高，因为评论代表真实互动）
  const score = fav * 2 + com * 3
  let label = null
  if (score >= 10) label = '🔥 热门食谱'
  else if (score >= 3) label = '📈 高分食谱'
  return { qualityScore: score, qualityLabel: label }
}

/**
 * 构建食材排除条件
 * @param {string} excludeStr - 逗号分隔的食材名称
 * @returns {Array|null} Sequelize where 条件数组，无排除时返回 null
 */
function buildExcludeCondition(excludeStr) {
  if (!excludeStr || String(excludeStr).trim().length === 0) return null
  const excludeList = String(excludeStr)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  if (excludeList.length === 0) return null
  return excludeList.map(name => ({
    ingredients: { [Op.notLike]: `%${name}%` },
  }))
}

/**
 * 列表查询的公共属性（不含 ingredients/steps，节省带宽）
 */
const LIST_ATTRIBUTES = [
  'id',
  'title',
  'coverImage',
  'author',
  'cookTime',
  'description',
  'category',
  'categoryTags',
  'servings',
  'difficulty',
  'userId',
  'createdAt',
  'updatedAt',
  'nutrition',
  'tips',
  'season',
  'favoriteCount',
  'commentCount',
  'isFeatured',
]

// ─────────────────────────────────────────────────────────────────
// GET / — 食谱列表（分页 + 分类筛选）
// ─────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  // 设置缓存头：公开接口可缓存 60 秒，CDN 可缓存 5 分钟
  res.set({
    'Cache-Control': 'public, max-age=60, s-maxage=300',
    Vary: 'Accept-Encoding',
  })
  try {
    let page = parseInt(req.query.page, 10) || 1
    let pageSize = parseInt(req.query.pageSize, 10) || 20
    const { category, userId, exclude } = req.query

    if (page < 1) page = 1
    if (pageSize > 100) pageSize = 100
    if (pageSize < 1) pageSize = 20

    const offset = (page - 1) * pageSize
    const where = {}

    if (category) {
      where.category = category
    }
    if (userId) {
      where.userId = userId
    }

    // 食材排除
    const excludeCond = buildExcludeCondition(exclude)
    if (excludeCond) {
      where[Op.and] = excludeCond
    }

    const { count, rows } = await Recipe.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize,
      attributes: LIST_ATTRIBUTES,
    })

    const list = rows.map(r => {
      const item = r.toJSON()
      Object.assign(item, computeQuality(item))
      return item
    })

    return res.status(200).json(
      resJSON(0, 'ok', {
        list,
        total: count,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('[GET /recipes] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /search — 搜索食谱（标题 + 食材）
// ─────────────────────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  // 搜索结果短时缓存
  res.set({
    'Cache-Control': 'public, max-age=30, s-maxage=120',
    Vary: 'Accept-Encoding',
  })
  try {
    let page = parseInt(req.query.page, 10) || 1
    let pageSize = parseInt(req.query.pageSize, 10) || 20
    const { q, exclude, category, difficulty, sortBy } = req.query

    if (page < 1) page = 1
    if (pageSize > 100) pageSize = 100
    if (pageSize < 1) pageSize = 20

    const offset = (page - 1) * pageSize

    if (!q || q.trim().length === 0) {
      return res.status(400).json(resJSON(400, '搜索关键词不能为空', null))
    }

    const keyword = `%${q.trim()}%`

    const where = {
      [Op.or]: [{ title: { [Op.like]: keyword } }, { ingredients: { [Op.like]: keyword } }],
    }

    // 分类筛选
    if (category) {
      where.category = category
    }

    // 难度筛选
    if (difficulty) {
      where.difficulty = difficulty
    }

    // 食材排除
    const excludeCond = buildExcludeCondition(exclude)
    if (excludeCond) {
      // 合并 AND 条件
      const andConds = [excludeCond]
      if (category || difficulty) {
        // where already has direct fields, need to use Op.and
        const directWhere = {}
        if (category) directWhere.category = category
        if (difficulty) directWhere.difficulty = difficulty
        andConds.push(directWhere)
        // remove direct fields from where
        delete where.category
        delete where.difficulty
      }
      where[Op.and] = andConds
    }

    // 排序方式
    let order = [['createdAt', 'DESC']]
    if (sortBy === 'cookTime_asc') {
      order = [['cookTime', 'ASC'], ['createdAt', 'DESC']]
    } else if (sortBy === 'cookTime_desc') {
      order = [['cookTime', 'DESC'], ['createdAt', 'DESC']]
    } else if (sortBy === 'oldest') {
      order = [['createdAt', 'ASC']]
    }

    const { count, rows } = await Recipe.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize,
      attributes: LIST_ATTRIBUTES,
    })

    const list = rows.map(r => {
      const item = r.toJSON()
      Object.assign(item, computeQuality(item))
      return item
    })

    return res.status(200).json(
      resJSON(0, 'ok', {
        list,
        total: count,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('[GET /recipes/search] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /categories — 分类统计（数量 + 难度分布 + 烹饪时间范围）
// ─────────────────────────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  res.set({
    'Cache-Control': 'public, max-age=300, s-maxage=600',
    Vary: 'Accept-Encoding',
  })
  try {
    const whereCategory = { category: { [Op.ne]: null } }

    // 1. 各分类数量
    const results = await Recipe.findAll({
      attributes: ['category', [fn('COUNT', col('id')), 'count']],
      where: whereCategory,
      group: ['category'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      raw: true,
    })

    // 2. 难度分布（按 category + difficulty 聚合）
    const difficultyStats = await Recipe.findAll({
      attributes: ['category', 'difficulty', [fn('COUNT', col('id')), 'count']],
      where: {
        category: { [Op.ne]: null },
        difficulty: { [Op.ne]: null },
      },
      group: ['category', 'difficulty'],
      raw: true,
    })

    // 3. 烹饪时间范围（按 category 聚合 min/max cookTime）
    const cookTimeStats = await Recipe.findAll({
      attributes: [
        'category',
        [fn('MIN', col('cookTime')), 'minCookTime'],
        [fn('MAX', col('cookTime')), 'maxCookTime'],
      ],
      where: {
        category: { [Op.ne]: null },
        cookTime: { [Op.ne]: null },
      },
      group: ['category'],
      raw: true,
    })

    // 聚合为 Map
    const difficultyMap = {}
    for (const row of difficultyStats) {
      if (!difficultyMap[row.category]) difficultyMap[row.category] = {}
      difficultyMap[row.category][row.difficulty] = parseInt(row.count, 10)
    }

    const cookTimeMap = {}
    for (const row of cookTimeStats) {
      cookTimeMap[row.category] = {
        minCookTime: parseInt(row.minCookTime, 10),
        maxCookTime: parseInt(row.maxCookTime, 10),
      }
    }

    const total = results.reduce((sum, r) => sum + parseInt(r.count, 10), 0)

    return res.status(200).json(
      resJSON(0, 'ok', {
        list: results.map(r => ({
          category: r.category,
          count: parseInt(r.count, 10),
          difficulty: difficultyMap[r.category] || {},
          cookTimeRange: cookTimeMap[r.category] || null,
        })),
        total,
      })
    )
  } catch (err) {
    console.error('[GET /recipes/categories] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /recommend — 食材推荐菜谱 + 协同过滤 + 季节性推荐
// ─────────────────────────────────────────────────────────────────
router.get('/recommend', async (req, res) => {
  try {
    const { ingredients, exclude, type } = req.query

    // ─── 模式1: 协同过滤推荐（无需食材参数） ───
    if (type === 'collaborative' || (!ingredients && req.headers.authorization)) {
      try {
        const jwt = require('jsonwebtoken')
        const token = req.headers.authorization.replace('Bearer ', '')
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'food-jwt-secret-key-2026')
        const userId = decoded.userId
        const { Favorite, Recipe } = require('../models')
        const { Op: Op2 } = require('sequelize')

        // 获取当前用户收藏的食谱ID
        const myFavorites = await Favorite.findAll({
          where: { userId, isDeleted: false },
          attributes: ['recipeId']
        })
        const myRecipeIds = myFavorites.map(f => f.recipeId)

        let recommended = []

        if (myRecipeIds.length > 0) {
          // 查找收藏了同样食谱的其他用户
          const similarUsers = await Favorite.findAll({
            where: {
              recipeId: { [Op2.in]: myRecipeIds },
              userId: { [Op2.ne]: userId },
              isDeleted: false
            },
            attributes: ['userId']
          })
          const similarUserIds = [...new Set(similarUsers.map(f => f.userId))]

          if (similarUserIds.length > 0) {
            // 查找这些用户收藏的其他食谱
            const collabFavs = await Favorite.findAll({
              where: {
                userId: { [Op2.in]: similarUserIds },
                recipeId: { [Op2.notIn]: myRecipeIds },
                isDeleted: false
              },
              attributes: ['recipeId'],
              order: [['createdAt', 'DESC']]
            })

            // 按出现次数聚合
            const recipeCount = {}
            collabFavs.forEach(f => {
              recipeCount[f.recipeId] = (recipeCount[f.recipeId] || 0) + 1
            })

            const topIds = Object.entries(recipeCount)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 12)
              .map(([id]) => id)

            if (topIds.length > 0) {
              const recipes = await Recipe.findAll({
                where: { id: { [Op2.in]: topIds } },
                attributes: LIST_ATTRIBUTES
              })
              // 保持 topIds 顺序
              const recipeMap = {}
              recipes.forEach(r => { recipeMap[r.id] = r })
              recommended = topIds.map(id => recipeMap[id]).filter(Boolean).map(r => {
                const item = r.toJSON()
                Object.assign(item, computeQuality(item))
                item.recommendType = 'collaborative'
                return item
              })
            }
          }
        }

        // 如果没有足够的协同推荐，按收藏数补充热门食谱
        if (recommended.length < 6) {
          const existingIds = recommended.map(r => r.id)
          const hotRecipes = await Recipe.findAll({
            where: {
              id: { [Op2.notIn]: existingIds },
              ...(myRecipeIds.length > 0 ? { id: { [Op2.notIn]: [Op2.in, myRecipeIds] } } : {})
            },
            order: [['favoriteCount', 'DESC']],
            limit: 12 - recommended.length,
            attributes: LIST_ATTRIBUTES
          })
          const hotList = hotRecipes.map(r => {
            const item = r.toJSON()
            Object.assign(item, computeQuality(item))
            item.recommendType = 'popular'
            return item
          })
          recommended = [...recommended, ...hotList]
        }

        return res.status(200).json(resJSON(0, 'ok', { list: recommended, recommendType: 'collaborative' }))
      } catch (authErr) {
        // token 验证失败，回退到默认推荐
        console.warn('[COLLAB RECOMMEND] Auth failed:', authErr.message)
      }
    }

    // ─── 模式2: 季节性推荐（无需食材参数） ───
    if (type === 'seasonal') {
      const now = new Date()
      const month = now.getMonth() + 1
      let currentSeason
      if (month >= 3 && month <= 5) currentSeason = 'spring'
      else if (month >= 6 && month <= 8) currentSeason = 'summer'
      else if (month >= 9 && month <= 11) currentSeason = 'autumn'
      else currentSeason = 'winter'

      const { Op: Op3 } = require('sequelize')
      const seasonalRecipes = await Recipe.findAll({
        where: {
          [Op3.or]: [
            { season: currentSeason },
            { season: 'all' }
          ]
        },
        order: [['favoriteCount', 'DESC']],
        limit: 12,
        attributes: LIST_ATTRIBUTES
      })

      const list = seasonalRecipes.map(r => {
        const item = r.toJSON()
        Object.assign(item, computeQuality(item))
        item.recommendType = 'seasonal'
        item.seasonContext = `${currentSeason}当季推荐`
        return item
      })

      return res.status(200).json(resJSON(0, 'ok', { list, recommendType: 'seasonal', season: currentSeason }))
    }

    // ─── 模式3: 食材推荐（原逻辑增强 + 质量分） ───
    if (!ingredients || String(ingredients).trim().length === 0) {
      // 无参数时返回热门推荐
      const hotRecipes = await Recipe.findAll({
        order: [['favoriteCount', 'DESC']],
        limit: 12,
        attributes: LIST_ATTRIBUTES
      })
      const list = hotRecipes.map(r => {
        const item = r.toJSON()
        Object.assign(item, computeQuality(item))
        return item
      })
      return res.status(200).json(resJSON(0, 'ok', { list, recommendType: 'popular' }))
    }

    // 解析输入食材列表
    const inputList = String(ingredients)
      .split(/[,，、\s]+/)
      .map(s => s.trim())
      .filter(Boolean)

    if (inputList.length === 0) {
      return res.status(400).json(resJSON(400, '请输入有效的食材名称', null))
    }

    // 构建 where 条件
    const where = {
      [Op.or]: inputList.map(name => ({
        ingredients: { [Op.like]: `%${name}%` },
      })),
    }

    // 食材排除
    const excludeCond = buildExcludeCondition(exclude)
    if (excludeCond) {
      where[Op.and] = excludeCond
    }

    // 1. 数据库模糊匹配（OR 逻辑：匹配任意一种食材即可，按匹配数量排序）
    const dbRecipes = await Recipe.findAll({
      where,
      attributes: LIST_ATTRIBUTES.concat(['ingredients']),
    })

    // 2. 计算匹配度
    const results = dbRecipes.map(recipe => {
      const data = recipe.toJSON()
      let recipeIngredientNames = []
      if (data.ingredients) {
        try {
          const parsed = JSON.parse(data.ingredients)
          recipeIngredientNames = (Array.isArray(parsed) ? parsed : []).map(i => i.name)
        } catch {
          // 非 JSON 格式则直接用原文
          recipeIngredientNames = [String(data.ingredients)]
        }
      }

      let matchedCount = 0
      const matchedNames = []
      for (const input of inputList) {
        const found = recipeIngredientNames.some(name =>
          name.toLowerCase().includes(input.toLowerCase())
        )
        if (found) {
          matchedCount++
          matchedNames.push(input)
        }
      }

      const matchScore = Math.round((matchedCount / inputList.length) * 100)

      return {
        id: data.id,
        title: data.title,
        coverImage: data.coverImage,
        author: data.author,
        cookTime: data.cookTime,
        description: data.description,
        category: data.category,
        difficulty: data.difficulty,
        servings: data.servings,
        userId: data.userId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        ...computeQuality(data),
        matchScore,
        matchedIngredients: matchedNames,
        totalIngredients: recipeIngredientNames.length,
        recommendType: 'ingredient',
      }
    })

    // 按匹配度降序
    results.sort((a, b) => b.matchScore - a.matchScore)

    // 3. AI 无结果增强（仅当数据库匹配不到时）
    let aiGenerated = false
    let aiRecipes = []

    if (results.length === 0 && process.env.AI_API_KEY && process.env.NODE_ENV !== 'test') {
      try {
        const ingredientStr = inputList.join('、')
        const aiPrompt = `你是一个美食食谱推荐专家。用户提供了以下食材：${ingredientStr}。请推荐 3 道包含这些食材的菜谱，每道菜谱包含：菜名、简介、所需食材列表（从用户食材中选取）、烹饪时长（分钟）、难度（easy/medium/hard）、份数。以 JSON 数组格式返回，每个元素包含 title, description, ingredients(数组[{name, amount, unit}]), cookTime, difficulty, servings 字段。只返回 JSON，不要其他文字。`

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)

        const aiRes = await fetch(
          `${process.env.AI_API_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v3'}/chat/completions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.AI_API_KEY}`,
            },
            body: JSON.stringify({
              model: process.env.AI_MODEL || 'deepseek-v3.2',
              messages: [{ role: 'user', content: aiPrompt }],
              temperature: 0.7,
            }),
            signal: controller.signal,
          }
        )

        clearTimeout(timeout)

        if (aiRes.ok) {
          const aiData = await aiRes.json()
          const content = aiData.choices?.[0]?.message?.content || ''
          // 提取 JSON 数组
          const jsonMatch = content.match(/\[\s*\{[\s\S]*?\}\s*\]/)
          if (jsonMatch) {
            aiRecipes = JSON.parse(jsonMatch[0])
            aiGenerated = true
          }
        }
      } catch (aiErr) {
        console.warn('[RECOMMEND] AI fallback failed:', aiErr.message)
      }
    }

    return res.status(200).json(
      resJSON(0, 'ok', {
        input: inputList,
        list: results,
        aiGenerated,
        aiRecipes,
      })
    )
  } catch (err) {
    console.error('[GET /recipes/recommend] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /featured — 编辑精选食谱列表
// ─────────────────────────────────────────────────────────────────
router.get('/featured', async (req, res) => {
  res.set({
    'Cache-Control': 'public, max-age=300, s-maxage=600',
  })

  try {
    const featured = await Recipe.findAll({
      where: { isFeatured: true },
      attributes: LIST_ATTRIBUTES,
      order: [['createdAt', 'DESC']],
    })

    return res.json(resJSON(0, 'ok', featured))
  } catch (err) {
    logger.error('获取精选食谱失败:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/similar — 相似食谱推荐（基于 categoryTags 或 category）
// ─────────────────────────────────────────────────────────────────
router.get('/:id/similar', async (req, res) => {
  res.set({
    'Cache-Control': 'public, max-age=300, s-maxage=600',
    Vary: 'Accept-Encoding',
  })
  try {
    const { id } = req.params
    const recipe = await Recipe.findByPk(id, { attributes: ['id', 'category', 'categoryTags'] })
    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }

    const data = recipe.toJSON()
    let categoryTagsParsed = null
    if (data.categoryTags) {
      try {
        categoryTagsParsed = JSON.parse(data.categoryTags)
      } catch {
        categoryTagsParsed = null
      }
    }

    let similarRecipes

    if (categoryTagsParsed && typeof categoryTagsParsed === 'object') {
      // 基于 categoryTags 做精确匹配
      const cuisine = categoryTagsParsed.cuisine
      const method = categoryTagsParsed.method
      const ingredient = categoryTagsParsed.ingredient

      const where = { id: { [Op.ne]: id } }
      const orConditions = []

      if (cuisine) orConditions.push({ categoryTags: { [Op.like]: `%${cuisine}%` } })
      if (method) orConditions.push({ categoryTags: { [Op.like]: `%${method}%` } })
      if (ingredient) orConditions.push({ categoryTags: { [Op.like]: `%${ingredient}%` } })

      if (orConditions.length > 0) {
        where[Op.or] = orConditions
        similarRecipes = await Recipe.findAll({
          where,
          order: [['createdAt', 'DESC']],
          limit: 6,
          attributes: LIST_ATTRIBUTES,
        })

        // 若匹配不足 6 条，按同 category 补充
        if (similarRecipes.length < 6 && data.category) {
          const existingIds = similarRecipes.map(r => r.id).concat([id])
          const fillRecipes = await Recipe.findAll({
            where: {
              id: { [Op.notIn]: existingIds },
              category: data.category,
            },
            order: [['createdAt', 'DESC']],
            limit: 6 - similarRecipes.length,
            attributes: LIST_ATTRIBUTES,
          })
          similarRecipes = similarRecipes.concat(fillRecipes)
        }
      } else if (data.category) {
        similarRecipes = await Recipe.findAll({
          where: { id: { [Op.ne]: id }, category: data.category },
          order: [['createdAt', 'DESC']],
          limit: 6,
          attributes: LIST_ATTRIBUTES,
        })
      } else {
        similarRecipes = await Recipe.findAll({
          where: { id: { [Op.ne]: id } },
          order: [['createdAt', 'DESC']],
          limit: 6,
          attributes: LIST_ATTRIBUTES,
        })
      }
    } else if (data.category) {
      similarRecipes = await Recipe.findAll({
        where: { id: { [Op.ne]: id }, category: data.category },
        order: [['createdAt', 'DESC']],
        limit: 6,
        attributes: LIST_ATTRIBUTES,
      })
    } else {
      similarRecipes = await Recipe.findAll({
        where: { id: { [Op.ne]: id } },
        order: [['createdAt', 'DESC']],
        limit: 6,
        attributes: LIST_ATTRIBUTES,
      })
    }

    return res.status(200).json(
      resJSON(0, 'ok', {
        recipeId: id,
        list: similarRecipes,
      })
    )
  } catch (err) {
    console.error('[GET /recipes/:id/similar] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/share — 食谱分享摘要
// ─────────────────────────────────────────────────────────────────
router.get('/:id/share', async (req, res) => {
  res.set({
    'Cache-Control': 'public, max-age=600, s-maxage=3600',
    Vary: 'Accept-Encoding',
  })

  try {
    const { id } = req.params
    const recipe = await Recipe.findByPk(id, {
      attributes: ['id', 'title', 'description', 'coverImage', 'category'],
    })

    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }

    const data = recipe.toJSON()
    const shareUrl = `${process.env.FRONTEND_URL || 'http://39.103.68.205'}/recipe/${id}`

    return res.status(200).json(
      resJSON(0, 'ok', {
        title: data.title,
        description: data.description || '',
        coverImage: data.coverImage || '',
        shareUrl,
        shareText: `来看看这道【${data.title}】吧！${shareUrl}`,
      })
    )
  } catch (err) {
    console.error('[GET /recipes/:id/share] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id — 食谱详情（含 ingredients 和 steps 解析为 JSON）
// ─────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  // 食谱详情可缓存更久（内容不常变化）
  res.set({
    'Cache-Control': 'public, max-age=300, s-maxage=600',
    Vary: 'Accept-Encoding',
  })

  try {
    const { id } = req.params

    const recipe = await Recipe.findByPk(id)

    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }

    const data = recipe.toJSON()

    // 解析 JSON 字段
    if (data.ingredients) {
      try {
        data.ingredients = JSON.parse(data.ingredients)
      } catch {
        data.ingredients = []
      }
    } else {
      data.ingredients = []
    }

    if (data.steps) {
      try {
        data.steps = JSON.parse(data.steps)
      } catch {
        data.steps = []
      }
    } else {
      data.steps = []
    }

    if (data.categoryTags) {
      try {
        data.categoryTags = JSON.parse(data.categoryTags)
      } catch {
        data.categoryTags = null
      }
    }

    if (data.nutrition) {
      try {
        data.nutrition = JSON.parse(data.nutrition)
      } catch {
        data.nutrition = null
      }
    }

    // 添加质量评分
    Object.assign(data, computeQuality(data))

    return res.status(200).json(resJSON(0, 'ok', data))
  } catch (err) {
    console.error('[GET /recipes/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// POST / — 创建食谱（需认证）
// ─────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      ingredients,
      steps,
      coverImage,
      servings,
      difficulty,
      cookTime,
      categoryTags,
      nutrition,
      tips,
    } = req.body

    if (!title || title.trim().length === 0) {
      return res.status(400).json(resJSON(400, '食谱标题不能为空', null))
    }

    // 从 User 模型获取用户显示名
    const { User } = require('../models')
    const user = await User.findByPk(req.userId)

    const recipe = await Recipe.create({
      title: title.trim(),
      description: description || null,
      category: category || null,
      ingredients: ingredients ? JSON.stringify(ingredients) : null,
      steps: steps ? JSON.stringify(steps) : null,
      coverImage: coverImage || null,
      servings: servings != null ? parseInt(servings, 10) : null,
      difficulty: difficulty || null,
      cookTime: cookTime != null ? parseInt(cookTime, 10) : null,
      categoryTags: categoryTags
        ? typeof categoryTags === 'string'
          ? categoryTags
          : JSON.stringify(categoryTags)
        : null,
      nutrition: nutrition
        ? typeof nutrition === 'string'
          ? nutrition
          : JSON.stringify(nutrition)
        : null,
      tips: tips || null,
      author: user ? user.nickname || user.username : '未知用户',
      userId: req.userId,
    })

    // 记录活动（不阻塞响应）
    setImmediate(() => {
      createActivity(req.userId, 'create_recipe', recipe.id, 'recipe', {
        title: recipe.title
      })
    })

    return res.status(201).json(resJSON(0, 'ok', recipe))
  } catch (err) {
    console.error('[POST /recipes] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// PUT /:id — 编辑食谱（需认证 + 作者本人）
// ─────────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const recipe = await Recipe.findByPk(id)

    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }

    if (recipe.userId !== req.userId) {
      return res.status(403).json(resJSON(403, '无权编辑此食谱', null))
    }

    const {
      title,
      description,
      category,
      ingredients,
      steps,
      coverImage,
      servings,
      difficulty,
      cookTime,
      categoryTags,
      nutrition,
      tips,
    } = req.body

    const updateData = {}
    if (title !== undefined) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (ingredients !== undefined) updateData.ingredients = JSON.stringify(ingredients)
    if (steps !== undefined) updateData.steps = JSON.stringify(steps)
    if (coverImage !== undefined) updateData.coverImage = coverImage
    if (servings !== undefined) updateData.servings = parseInt(servings, 10)
    if (difficulty !== undefined) updateData.difficulty = difficulty
    if (cookTime !== undefined) updateData.cookTime = parseInt(cookTime, 10)
    if (categoryTags !== undefined)
      updateData.categoryTags =
        typeof categoryTags === 'string' ? categoryTags : JSON.stringify(categoryTags)
    if (nutrition !== undefined)
      updateData.nutrition = typeof nutrition === 'string' ? nutrition : JSON.stringify(nutrition)
    if (tips !== undefined) updateData.tips = tips
    updateData.updatedAt = new Date()

    await Recipe.update(updateData, { where: { id } })

    const updated = await Recipe.findByPk(id)
    const data = updated.toJSON()
    if (data.ingredients) {
      try {
        data.ingredients = JSON.parse(data.ingredients)
      } catch {
        data.ingredients = []
      }
    }
    if (data.steps) {
      try {
        data.steps = JSON.parse(data.steps)
      } catch {
        data.steps = []
      }
    }
    if (data.nutrition) {
      try {
        data.nutrition = JSON.parse(data.nutrition)
      } catch {
        data.nutrition = null
      }
    }

    return res.status(200).json(resJSON(0, 'ok', data))
  } catch (err) {
    console.error('[PUT /recipes/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// DELETE /:id — 删除食谱（需认证 + 作者本人）
// ─────────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const recipe = await Recipe.findByPk(id)

    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }

    if (recipe.userId !== req.userId) {
      return res.status(403).json(resJSON(403, '无权删除此食谱', null))
    }

    await Recipe.destroy({ where: { id } })

    return res.status(200).json(resJSON(0, 'ok', null))
  } catch (err) {
    console.error('[DELETE /recipes/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router
module.exports.auth = auth
