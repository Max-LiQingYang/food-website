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
 * NutriScore 计算（基于营养数据的综合评分）
 * A ≥ 4, B ≥ 2.5, C ≥ 1, D ≥ 0, E < 0
 */
function computeNutriScore(nutrition) {
  if (!nutrition) return null
  let score = 0
  // 蛋白质评分（每 10g +1 分）
  if (nutrition.protein) score += nutrition.protein / 10
  // 膳食纤维评分（每 5g +1 分）
  if (nutrition.fiber) score += nutrition.fiber / 5
  // 钠超标扣分（每超过 600mg -1 分）
  if (nutrition.sodium && nutrition.sodium > 600) score -= (nutrition.sodium - 600) / 600
  // 脂肪超标扣分（每超过 20g -0.5 分）
  if (nutrition.fat && nutrition.fat > 20) score -= (nutrition.fat - 20) / 40
  // 热量超标扣分（每超过 500kcal -0.5 分）
  if (nutrition.calories && nutrition.calories > 500) score -= (nutrition.calories - 500) / 500

  if (score >= 4) return 'A'
  if (score >= 2.5) return 'B'
  if (score >= 1) return 'C'
  if (score >= 0) return 'D'
  return 'E'
}

/**
 * Smart Difficulty 计算
 */
function computeSmartDifficulty(recipe) {
  if (!recipe) return 'beginner'
  const cookTime = parseInt(recipe.cookTime || 0, 10)
  const stepsCount = Array.isArray(recipe.steps) ? recipe.steps.length : 0
  const ingredientsCount = Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0

  // 也考虑 categoryTags 中的技法（method）维度
  let methodCount = 0
  if (recipe.categoryTags) {
    if (typeof recipe.categoryTags === 'string') {
      try {
        const tags = JSON.parse(recipe.categoryTags)
        methodCount = tags.method ? tags.method.length : 0
      } catch {}
    } else if (typeof recipe.categoryTags === 'object') {
      methodCount = recipe.categoryTags.method ? recipe.categoryTags.method.length : 0
    }
  }

  let complexity = 0
  if (cookTime >= 90) complexity += 3
  else if (cookTime >= 45) complexity += 2
  else if (cookTime >= 20) complexity += 1

  if (stepsCount >= 8) complexity += 3
  else if (stepsCount >= 5) complexity += 2
  else if (stepsCount >= 3) complexity += 1

  if (ingredientsCount >= 12) complexity += 3
  else if (ingredientsCount >= 8) complexity += 2
  else if (ingredientsCount >= 5) complexity += 1

  if (methodCount >= 3) complexity += 1

  if (complexity >= 7) return 'advanced'
  if (complexity >= 4) return 'intermediate'
  return 'beginner'
}

/**
 * 批量附加 nutriScore 和 smartDifficulty
 */
function attachContentScore(items) {
  if (!items || items.length === 0) return
  for (const item of items) {
    // 如果 DB 已有则使用，否则计算
    if (item.nutriScore == null && item.nutrition) {
      let nutrition
      if (typeof item.nutrition === 'string') {
        try { nutrition = JSON.parse(item.nutrition) } catch { nutrition = null }
      } else {
        nutrition = item.nutrition
      }
      item.nutriScore = computeNutriScore(nutrition)
    }
    if (item.smartDifficulty == null) {
      item.smartDifficulty = computeSmartDifficulty(item)
    }
  }
}
function computeQuality(recipe) {
  const views = parseInt(recipe.viewCount || 0, 10)
  const fav = parseInt(recipe.favoriteCount || 0, 10)
  const com = parseInt(recipe.commentCount || 0, 10)
  const rating = parseFloat(recipe.avgRating || 0)
  // 质量分 = 浏览量*0.3 + 收藏数*2 + 平均评分*5 + 评论数*1.5
  const score = views * 0.3 + fav * 2 + rating * 5 + com * 1.5
  const truncated = Math.round(score * 10) / 10
  let label = null
  if (truncated >= 20) label = '🔥 热门食谱'
  else if (truncated >= 8) label = '📈 高分食谱'
  else if (truncated >= 3) label = '📊 品质食谱'
  return { qualityScore: score, qualityLabel: label }
}

/**
 * 批量获取食谱的平均评分
 * @param {string[]} recipeIds
 * @returns {Promise<Object<string, {avgRating:number, ratingCount:number}>>}
 */
async function fetchAvgRatings(recipeIds) {
  if (!recipeIds || recipeIds.length === 0) return {}
  const { Comment } = require('../models')
  const { fn: fn2, col: col2 } = require('sequelize')

  const results = await Comment.findAll({
    attributes: [
      'recipeId',
      [fn2('AVG', col2('rating')), 'avgRating'],
      [fn2('COUNT', col2('rating')), 'ratingCount'],
    ],
    where: {
      recipeId: { [Op.in]: recipeIds },
      rating: { [Op.ne]: null },
    },
    group: ['recipeId'],
    raw: true,
  })

  const map = {}
  results.forEach(r => {
    map[r.recipeId] = {
      avgRating: Math.round(parseFloat(r.avgRating || '0') * 10) / 10,
      ratingCount: parseInt(r.ratingCount || '0', 10),
    }
  })
  return map
}

/**
 * 为食谱列表批量附加 avgRating、ratingCount 并重新计算 qualityScore
 */
async function attachRatingInfo(items) {
  if (!items || items.length === 0) return
  const ids = items.map(i => i.id)
  const ratingMap = await fetchAvgRatings(ids)
  for (const item of items) {
    const info = ratingMap[item.id] || { avgRating: 0, ratingCount: 0 }
    item.avgRating = info.avgRating
    item.ratingCount = info.ratingCount
    Object.assign(item, computeQuality(item))
  }
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
  'viewCount',
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

    const list = rows.map(r => r.toJSON())
    await attachRatingInfo(list)
    attachContentScore(list)

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

    const list = rows.map(r => r.toJSON())
    await attachRatingInfo(list)
    attachContentScore(list)

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
            item.recommendType = 'popular'
            return item
          })
          recommended = [...recommended, ...hotList]
        }

        await attachRatingInfo(recommended)

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
        item.recommendType = 'seasonal'
        item.seasonContext = `${currentSeason}当季推荐`
        return item
      })

      await attachRatingInfo(list)

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
        return item
      })
      await attachRatingInfo(list)

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
        viewCount: data.viewCount || 0,
        favoriteCount: data.favoriteCount || 0,
        commentCount: data.commentCount || 0,
        matchScore,
        matchedIngredients: matchedNames,
        totalIngredients: recipeIngredientNames.length,
        recommendType: 'ingredient',
      }
    })

    // 按匹配度降序
    results.sort((a, b) => b.matchScore - a.matchScore)
    await attachRatingInfo(results)

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

    const list = featured.map(r => r.toJSON())
    await attachRatingInfo(list)

    return res.json(resJSON(0, 'ok', list))
  } catch (err) {
    logger.error('获取精选食谱失败:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /rankings — 食谱排行榜（Top 20）
// 参数: ?period=week|month|all（默认 all）, ?sortBy=composite|views|rating（默认 composite）
// ─────────────────────────────────────────────────────────────────
router.get('/rankings', async (req, res) => {
  res.set({
    'Cache-Control': 'public, max-age=120, s-maxage=300',
  })

  try {
    const { period = 'all', sortBy = 'composite' } = req.query

    // 计算时间范围
    let dateWhere = {}
    if (period === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      dateWhere = { createdAt: { [Op.gte]: weekAgo } }
    } else if (period === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      dateWhere = { createdAt: { [Op.gte]: monthAgo } }
    }

    // 根据排序方式确定 SQL order
    let order
    if (sortBy === 'views') {
      order = [['viewCount', 'DESC'], ['createdAt', 'DESC']]
    } else if (sortBy === 'rating') {
      // 评分需要查 Comment 表，先按 favoriteCount 取候选集，后面用 JS 重排
      order = [['favoriteCount', 'DESC'], ['commentCount', 'DESC'], ['createdAt', 'DESC']]
    } else {
      order = [['favoriteCount', 'DESC'], ['commentCount', 'DESC'], ['createdAt', 'DESC']]
    }

    const recipes = await Recipe.findAll({
      where: dateWhere,
      attributes: LIST_ATTRIBUTES,
      order,
      limit: 50,
    })

    let ranked = recipes.map(r => r.toJSON())

    // 获取平均评分
    await attachRatingInfo(ranked)

    if (sortBy === 'rating') {
      ranked.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))
    } else if (sortBy === 'views') {
      ranked.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    } else {
      // composite: 使用 qualityScore
      ranked.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))
    }

    // 取 Top 20 并赋予排名
    ranked = ranked.slice(0, 20).map((item, i) => ({
      ...item,
      compositeScore: item.qualityScore || 0,
      rank: i + 1,
    }))

    return res.json(resJSON(0, 'ok', { period, sortBy, list: ranked }))
  } catch (err) {
    console.error('[GET /recipes/rankings] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/versions — 食谱版本历史
// ─────────────────────────────────────────────────────────────────
router.get('/:id/versions', async (req, res) => {
  res.set({
    'Cache-Control': 'private, max-age=30',
  })

  try {
    const { id } = req.params
    const { RecipeVersion } = require('../models')

    const versions = await RecipeVersion.findAll({
      where: { recipeId: id },
      order: [['version', 'DESC']],
      limit: 20,
    })

    const parsed = versions.map(v => {
      const d = v.toJSON()
      if (d.changes) {
        try {
          d.changes = JSON.parse(d.changes)
        } catch {
          d.changes = {}
        }
      }
      return d
    })

    return res.json(resJSON(0, 'ok', parsed))
  } catch (err) {
    console.error('[GET /recipes/:id/versions] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/similar — 相似食谱推荐（基于 categoryTags Jaccard 相似度）
// ─────────────────────────────────────────────────────────────────
router.get('/:id/similar', async (req, res) => {
  res.set({
    'Cache-Control': 'public, max-age=300, s-maxage=600',
    Vary: 'Accept-Encoding',
  })
  try {
    const { id } = req.params
    const recipe = await Recipe.findByPk(id, {
      attributes: ['id', 'category', 'categoryTags', 'nutrition']
    })
    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }

    const data = recipe.toJSON()
    let sourceTags = null
    if (data.categoryTags) {
      try { sourceTags = JSON.parse(data.categoryTags) } catch { sourceTags = null }
    }

    // 获取候选食谱
    const candidates = await Recipe.findAll({
      where: { id: { [Op.ne]: id } },
      attributes: LIST_ATTRIBUTES.concat(['ingredients']),
      limit: 50,
    })

    // 计算 Jaccard 相似度
    let scored = candidates.map(candidate => {
      const c = candidate.toJSON()
      let candidateTags = null
      if (c.categoryTags) {
        try { candidateTags = JSON.parse(c.categoryTags) } catch { candidateTags = null }
      }

      let similarity = 0

      if (sourceTags && candidateTags && typeof sourceTags === 'object' && typeof candidateTags === 'object') {
        // 计算五维 Jaccard 相似度
        const dimensions = ['ingredient', 'method', 'cuisine', 'flavor', 'price']
        let totalScore = 0
        let validDims = 0

        for (const dim of dimensions) {
          const src = sourceTags[dim]
          const tgt = candidateTags[dim]
          if (Array.isArray(src) && Array.isArray(tgt) && src.length > 0 && tgt.length > 0) {
            const setA = new Set(src)
            const setB = new Set(tgt)
            let intersection = 0
            for (const item of setA) {
              if (setB.has(item)) intersection++
            }
            const union = new Set([...setA, ...setB]).size
            if (union > 0) {
              totalScore += intersection / union
              validDims++
            }
          }
        }

        if (validDims > 0) {
          similarity = totalScore / validDims
        }

        // category 匹配加分
        if (sourceTags.cuisine && candidateTags.cuisine) {
          const cuisineMatch = sourceTags.cuisine.some(c =>
            Array.isArray(candidateTags.cuisine) && candidateTags.cuisine.includes(c)
          )
          if (cuisineMatch) similarity = Math.min(1, similarity + 0.15)
        }
      } else if (data.category && c.category === data.category) {
        // 无 categoryTags 时按同 category 算基础分
        similarity = 0.3
      }

      return { recipe: c, similarity: Math.round(similarity * 100) / 100 }
    })

    // 按相似度降序，排除自身，取前 5
    scored = scored
      .filter(s => s.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)

    // 如果不足 5 条，按 category 补充
    if (scored.length < 5 && data.category) {
      const existingIds = scored.map(s => s.recipe.id).concat(id)
      const fillRecipes = await Recipe.findAll({
        where: { id: { [Op.notIn]: existingIds }, category: data.category },
        attributes: LIST_ATTRIBUTES,
        order: [['favoriteCount', 'DESC']],
        limit: 5 - scored.length,
      })
      for (const fr of fillRecipes) {
        scored.push({ recipe: fr.toJSON(), similarity: 0 })
      }
    }

    // 如果仍不足 5 条，随机补充热门食谱
    if (scored.length < 5) {
      const existingIds = scored.map(s => s.recipe.id).concat(id)
      const hotRecipes = await Recipe.findAll({
        where: { id: { [Op.notIn]: existingIds } },
        attributes: LIST_ATTRIBUTES,
        order: [['favoriteCount', 'DESC']],
        limit: 5 - scored.length,
      })
      for (const hr of hotRecipes) {
        scored.push({ recipe: hr.toJSON(), similarity: 0 })
      }
    }

    // 附加 nutriScore/smartDifficulty
    const list = scored.map(s => {
      attachContentScore([s.recipe])
      return s
    })

    return res.status(200).json(
      resJSON(0, 'ok', {
        recipeId: id,
        list,
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
// GET /popular — 热门食谱（按 qualityScore 加权排序）
// ─────────────────────────────────────────────────────────────────
router.get('/popular', async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1
    let pageSize = parseInt(req.query.pageSize, 10) || 12
    if (page < 1) page = 1
    if (pageSize > 100) pageSize = 100
    const offset = (page - 1) * pageSize

    const { count, rows } = await Recipe.findAndCountAll({
      attributes: LIST_ATTRIBUTES,
      order: [['favoriteCount', 'DESC']],
      offset,
      limit: pageSize,
    })

    let list = rows.map(r => r.toJSON())
    list = list.map(item => {
      const q = computeQuality(item)
      item.qualityScore = q.qualityScore
      item.qualityLabel = q.qualityLabel
      return item
    })

    // 按 qualityScore 降序重排
    list.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))

    await attachRatingInfo(list)
    attachContentScore(list)

    return res.status(200).json(resJSON(0, 'ok', { list, total: count, page, pageSize }))
  } catch (err) {
    console.error('[Popular] Error:', err.message)
    return res.status(500).json(resJSON(1, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /new-user-recommend — 新用户引导推荐
// ─────────────────────────────────────────────────────────────────
router.get('/new-user-recommend', async (req, res) => {
  try {
    const { difficulty, season } = req.query
    const where = {}
    const { Op: OpSe } = require('sequelize')

    if (difficulty) {
      where.difficulty = difficulty
    }
    if (season) {
      where[OpSe.or] = [
        { season },
        { season: 'all' }
      ]
    }

    const rows = await Recipe.findAll({
      where,
      order: [['favoriteCount', 'DESC']],
      limit: 6,
      attributes: LIST_ATTRIBUTES,
    })

    let list = rows.map(r => r.toJSON())
    list = list.map(item => {
      const q = computeQuality(item)
      item.qualityScore = q.qualityScore
      item.qualityLabel = q.qualityLabel
      item.recommendType = 'new-user'
      return item
    })

    await attachRatingInfo(list)
    attachContentScore(list)

    return res.status(200).json(resJSON(0, 'ok', { list, matched: { difficulty, season } }))
  } catch (err) {
    console.error('[NewUserRecommend] Error:', err.message)
    return res.status(500).json(resJSON(1, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /quality-check — 自动质量检查
// ─────────────────────────────────────────────────────────────────
router.get('/quality-check', async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1
    let pageSize = parseInt(req.query.pageSize, 10) || 20
    if (page < 1) page = 1
    if (pageSize > 100) pageSize = 100
    const offset = (page - 1) * pageSize

    const { count, rows } = await Recipe.findAndCountAll({
      attributes: ['id', 'title', 'description', 'coverImage', 'steps', 'nutrition', 'tips', 'cookTime', 'difficulty', 'servings', 'category'],
      offset,
      limit: pageSize,
      order: [['createdAt', 'DESC']],
    })

    const list = rows.map(r => {
      const recipe = r.toJSON()
      const issues = []

      // 标题长度
      if (!recipe.title || String(recipe.title).trim().length < 3) {
        issues.push('标题过短（<3字符）')
      }
      // 描述完整性
      if (!recipe.description || String(recipe.description).trim().length < 10) {
        issues.push('描述不完整（<10字符）')
      }
      // 步骤数
      const steps = Array.isArray(recipe.steps) ? recipe.steps : []
      if (steps.length < 3) {
        issues.push('步骤数不足（<3步）')
      }
      // 封面图
      if (!recipe.coverImage) {
        issues.push('缺少封面图片')
      }
      // 营养数据
      if (!recipe.nutrition || (typeof recipe.nutrition === 'object' && Object.keys(recipe.nutrition).length === 0)) {
        issues.push('缺少营养数据')
      }
      // Tips
      if (!recipe.tips || String(recipe.tips).trim().length === 0) {
        issues.push('缺少小贴士')
      }

      // 质量评分（0-100）
      let baseScore = 100
      baseScore -= issues.length * 16  // 每项缺失扣16分
      const qualityScore = Math.max(0, Math.min(100, baseScore))

      return {
        id: recipe.id,
        title: recipe.title,
        qualityScore,
        issues,
        passed: issues.length <= 1,  // 1个以下问题视为通过
        dimensions: {
          title: (recipe.title || '').length >= 3,
          description: (recipe.description || '').length >= 10,
          steps: steps.length >= 3,
          coverImage: !!recipe.coverImage,
          nutrition: !!(recipe.nutrition && typeof recipe.nutrition === 'object' && Object.keys(recipe.nutrition).length > 0),
          tips: (recipe.tips || '').trim().length > 0,
        }
      }
    })

    const passedCount = list.filter(i => i.passed).length
    const failedCount = list.length - passedCount

    return res.status(200).json(resJSON(0, 'ok', {
      list,
      total: count,
      page,
      pageSize,
      summary: { passedCount, failedCount, passRate: count > 0 ? Math.round((passedCount / count) * 100) : 0 }
    }))
  } catch (err) {
    console.error('[QualityCheck] Error:', err.message)
    return res.status(500).json(resJSON(1, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /low-quality — 低质量食谱列表
// ─────────────────────────────────────────────────────────────────
router.get('/low-quality', async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1
    let pageSize = parseInt(req.query.pageSize, 10) || 20
    if (page < 1) page = 1
    if (pageSize > 100) pageSize = 100
    const offset = (page - 1) * pageSize

    const { count, rows } = await Recipe.findAndCountAll({
      attributes: ['id', 'title', 'description', 'coverImage', 'steps', 'nutrition', 'tips', 'cookTime', 'difficulty', 'servings', 'category', 'favoriteCount', 'viewCount'],
      offset,
      limit: pageSize,
      order: [['createdAt', 'DESC']],
    })

    const allWithQuality = rows.map(r => {
      const recipe = r.toJSON()
      const issues = []

      if (!recipe.title || String(recipe.title).trim().length < 3) issues.push('标题过短')
      if (!recipe.description || String(recipe.description).trim().length < 10) issues.push('描述不完整')
      const steps = Array.isArray(recipe.steps) ? recipe.steps : []
      if (steps.length < 3) issues.push('步骤不足')
      if (!recipe.coverImage) issues.push('缺封面')
      if (!recipe.nutrition || Object.keys(recipe.nutrition).length === 0) issues.push('缺营养数据')
      if (!recipe.tips || !recipe.tips.trim()) issues.push('缺小贴士')

      let baseScore = 100
      baseScore -= issues.length * 16
      const qualityScore = Math.max(0, Math.min(100, baseScore))

      return { id: recipe.id, title: recipe.title, qualityScore, issues, passed: issues.length <= 1 }
    })

    const lowQuality = allWithQuality.filter(i => !i.passed)

    return res.status(200).json(resJSON(0, 'ok', {
      list: lowQuality,
      total: lowQuality.length,
      page,
      pageSize,
      allTotal: count,
    }))
  } catch (err) {
    console.error('[LowQuality] Error:', err.message)
    return res.status(500).json(resJSON(1, '服务器错误', null))
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

    // 添加 nutriScore 和 smartDifficulty
    attachContentScore([data])

    // 批量获取平均评分（单食谱也使用批量 API 保持一致性）
    const ratingMap = await fetchAvgRatings([id])
    const ratingInfo = ratingMap[id] || { avgRating: 0, ratingCount: 0 }
    data.avgRating = ratingInfo.avgRating
    data.ratingCount = ratingInfo.ratingCount
    // 重新计算质量分（含评分）
    Object.assign(data, computeQuality(data))

    // 非阻塞递增浏览量（不等待写入完成）
    setImmediate(async () => {
      try {
        await Recipe.update({ viewCount: data.viewCount + 1 }, { where: { id } })
      } catch (vErr) {
        console.warn('[VIEW COUNT] increment failed:', vErr.message)
      }
    })

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

    // ── 创建版本快照 ──
    setImmediate(async () => {
      try {
        const { RecipeVersion } = require('../models')
        const lastVersion = await RecipeVersion.findOne({
          where: { recipeId: id },
          order: [['version', 'DESC']],
        })
        const newVersion = lastVersion ? lastVersion.version + 1 : 1

        // 生成变更摘要
        const changedFields = Object.keys(updateData).filter(k => k !== 'updatedAt')
        const summaries = []
        if (changedFields.includes('title')) summaries.push('标题')
        if (changedFields.includes('ingredients')) summaries.push('食材')
        if (changedFields.includes('steps')) summaries.push('步骤')
        if (changedFields.includes('description')) summaries.push('简介')
        if (changedFields.includes('tips')) summaries.push('小贴士')
        if (changedFields.includes('nutrition')) summaries.push('营养信息')
        if (changedFields.includes('category')) summaries.push('分类')
        if (changedFields.includes('difficulty')) summaries.push('难度')
        if (changedFields.includes('cookTime')) summaries.push('烹饪时长')
        if (changedFields.includes('coverImage')) summaries.push('封面图片')
        if (changedFields.includes('servings')) summaries.push('份数')
        const summary = summaries.length > 0 ? `更新了${summaries.join('、')}` : '更新了食谱'

        await RecipeVersion.create({
          recipeId: id,
          version: newVersion,
          changes: JSON.stringify({
            changedFields,
            snapshot: {
              title: updateData.title || recipe.title,
              description: updateData.description !== undefined ? updateData.description : recipe.description,
            },
          }),
          userId: req.userId,
          summary,
        })
      } catch (verr) {
        console.error('[RecipeVersion] Error creating version:', verr)
      }
    })

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
module.exports.attachRatingInfo = attachRatingInfo
module.exports.attachContentScore = attachContentScore
