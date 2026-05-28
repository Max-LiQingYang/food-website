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
const { Op, fn, col, literal } = require('sequelize')
const auth = require('../middleware/auth')

const { createActivity } = require('../utils/activity')
const { checkAllAchievements } = require('../utils/achievementChecker')
const { searchByIngredients, aiFallbackSearch } = require('../utils/ingredientSearch')

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

// ── 热门搜索：内存频率追踪 ──

const searchFrequency = new Map()
const SEARCH_CACHE_TTL = 3600_000 // 1 小时

/**
 * 修复疑似二次 URL 编码导致的 Mojibake
 * 当 UTF-8 字符串被双次 URL 编码并解码后，呈现为 Latin-1 解释的乱码。
 * 例如："\u00e9\u00b8\u00a1\u00e8\u009b\u008b" -> 重解为 UTF-8 后为 "\u9e21\u86cb"
 * 仅当重解结果包含 CJK 字符时才替换，避免误伤合法 Latin-1 字符串。
 */
function fixMojibake(str) {
  if (!str || !/[\u0080-\u00ff]/.test(str)) return str
  try {
    const buf = Buffer.from(str, 'latin1')
    const fixed = buf.toString('utf-8')
    if (fixed !== str && /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(fixed)) {
      return fixed
    }
  } catch (e) {
    // ignore
  }
  return str
}

function trackSearch(term) {
  if (!term || !term.trim()) return
  const raw = term.trim()
  const fixed = fixMojibake(raw)
  const q = fixed.toLowerCase()
  const now = Date.now()

  // 合并现有已损坏条目的计数
  if (fixed !== raw) {
    const corruptKey = raw.toLowerCase()
    if (searchFrequency.has(corruptKey)) {
      searchFrequency.delete(corruptKey)
    }
  }

  const entry = searchFrequency.get(q)
  if (entry) {
    entry.count++
    entry.updatedAt = now
  } else {
    searchFrequency.set(q, { text: fixed, count: 1, updatedAt: now })
  }
  // 定期清理低频条目（超过 1 小时未更新的 < 2 次搜索）
  if (searchFrequency.size > 100) {
    const threshold = now - SEARCH_CACHE_TTL
    for (const [key, val] of searchFrequency) {
      if (val.count < 2 && val.updatedAt < threshold) searchFrequency.delete(key)
    }
  }
}

/** 获取热门搜索 Top N */
function getHotSearches(limit = 8) {
  // 清理过期条目
  const threshold = Date.now() - SEARCH_CACHE_TTL
  // 同时合并 Mojibake 条目（处理内存中已有的损坏数据）
  const toDelete = []
  const toMerge = []
  for (const [key, val] of searchFrequency) {
    if (val.updatedAt < threshold) {
      toDelete.push(key)
      continue
    }
    const fixed = fixMojibake(key)
    if (fixed !== key) {
      toDelete.push(key)
      toMerge.push({ fixedKey: fixed.toLowerCase(), text: val.text, count: val.count })
    }
  }
  for (const key of toDelete) {
    searchFrequency.delete(key)
  }
  for (const item of toMerge) {
    const existing = searchFrequency.get(item.fixedKey)
    if (existing) {
      existing.count += item.count
    } else {
      searchFrequency.set(item.fixedKey, { text: item.text, count: item.count, updatedAt: Date.now() })
    }
  }
  const sorted = [...searchFrequency.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([key, val]) => ({ text: val.text, count: val.count }))
  return sorted
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

// ─── 推荐增强：多样性控制 + 新鲜度加权 + 编辑精选提升 ───
function enhancedRecommendSort(recipes, options = {}) {
  const maxPerCategory = options.maxPerCategory || 3
  const freshnessDays = options.freshnessDays || 30
  const freshnessBonus = options.freshnessBonus || 0.1
  const editorPickBonus = options.editorPickBonus || 0.2

  if (!recipes || recipes.length === 0) return []

  const items = recipes.map(r => {
    const item = typeof r.toJSON === 'function' ? r.toJSON() : { ...r }

    // 基础分：按被收藏次数归一化（0~0.5）
    const maxFav = Math.max(...recipes.map(r2 => {
      const x = typeof r2.toJSON === 'function' ? r2.toJSON() : r2
      return x.favoriteCount || 0
    }), 1)
    let score = ((item.favoriteCount || 0) / maxFav) * 0.5

    // 新鲜度加分：最近创建的食谱获得额外分数
    if (item.createdAt) {
      const days = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      if (days < freshnessDays) {
        score += freshnessBonus * (1 - days / freshnessDays)
      }
    }

    // 编辑精选加分
    if (item.isFeatured) {
      score += editorPickBonus
      item.recommendReason = '编辑精选'
    } else if (item.season && item.season !== 'all') {
      item.recommendReason = '当季推荐'
    } else if (item.favoriteCount > 50 || item.viewCount > 200) {
      item.recommendReason = '热门食谱'
    } else if (item.createdAt) {
      const days = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      if (days < 14) {
        item.recommendReason = '新上线'
      }
    } else {
      item.recommendReason = '为你推荐'
    }

    item.__sortScore = score
    return item
  })

  // 按评分降序
  items.sort((a, b) => b.__sortScore - a.__sortScore)

  // 多样性控制：每类最多 maxPerCategory 条
  const catCount = {}
  const result = []

  // 第一遍：编辑精选无限制
  for (const item of items) {
    if (item.isFeatured) {
      result.push(item)
      const cat = item.category || 'other'
      catCount[cat] = (catCount[cat] || 0) + 1
    }
  }

  // 第二遍：其余条目受分类上限限制
  for (const item of items) {
    if (item.isFeatured) continue
    const cat = item.category || 'other'
    if ((catCount[cat] || 0) < maxPerCategory) {
      result.push(item)
      catCount[cat] = (catCount[cat] || 0) + 1
    }
  }

  for (const item of result) {
    delete item.__sortScore
  }

  return result
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
 * 批量获取食谱视频数量
 */
async function fetchVideoCounts(recipeIds) {
  if (!recipeIds || recipeIds.length === 0) return {}
  const { VideoEmbed } = require('../models')
  const { fn: fn3, col: col3 } = require('sequelize')

  const results = await VideoEmbed.findAll({
    attributes: [
      'recipeId',
      [fn3('COUNT', col3('id')), 'videoCount'],
    ],
    where: {
      recipeId: { [Op.in]: recipeIds },
    },
    group: ['recipeId'],
    raw: true,
  })

  const map = {}
  results.forEach(r => {
    map[r.recipeId] = parseInt(r.videoCount || '0', 10)
  })
  return map
}

/**
 * 为食谱列表批量附加 videoCount
 */
async function attachVideoInfo(items) {
  if (!items || items.length === 0) return
  const ids = items.map(i => i.id)
  const videoMap = await fetchVideoCounts(ids)
  for (const item of items) {
    item.videoCount = videoMap[item.id] || 0
  }
}

/**
 * 为食谱列表批量附加 avgRating、ratingCount 并重新计算 qualityScore
 */
async function attachRatingInfo(items) {
  if (!items || items.length === 0) return
  const ids = items.map(i => i.id)
  const ratingMap = await fetchAvgRatings(ids)
  // 批量附带视频数量信息
  const videoMap = await fetchVideoCounts(ids)
  for (const item of items) {
    const info = ratingMap[item.id] || { avgRating: 0, ratingCount: 0 }
    item.avgRating = info.avgRating
    item.ratingCount = info.ratingCount
    item.videoCount = videoMap[item.id] || 0
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
  'story',
  'culturalBackground',
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
    const { category, categories, userId, exclude } = req.query

    if (page < 1) page = 1
    if (pageSize > 100) pageSize = 100
    if (pageSize < 1) pageSize = 20

    const offset = (page - 1) * pageSize
    const where = {}

    if (category) {
      where.category = category
    }
    if (categories) {
      where.category = { [Op.in]: categories.split(',').map(c => c.trim()) }
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
// GET /search — 搜索食谱（标题 + 食材 + 描述，带权重排序 + 拼写纠错）
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

    // 追踪搜索词
    if (q && q.trim()) trackSearch(q.trim())

    if (page < 1) page = 1
    if (pageSize > 100) pageSize = 100
    if (pageSize < 1) pageSize = 20

    const offset = (page - 1) * pageSize

    if (!q || q.trim().length === 0) {
      return res.status(400).json(resJSON(400, '搜索关键词不能为空', null))
    }

    const query = q.trim()
    const keyword = `%${query}%`

    // ── 带权重的搜索条件 ──
    // 标题匹配权重最高，描述/标签次之，食材/贴士/故事最低
    const where = {
      [Op.or]: [
        { title: { [Op.like]: keyword } },
        { description: { [Op.like]: keyword } },
        { ingredients: { [Op.like]: keyword } },
        { categoryTags: { [Op.like]: keyword } },
        { tips: { [Op.like]: keyword } },
        { story: { [Op.like]: keyword } },
        { culturalBackground: { [Op.like]: keyword } },
      ],
    }

    // 分类筛选（单分类或分类数组）
    const catFilter = req.query.categories || req.query.category
    if (catFilter) {
      if (req.query.categories) {
        where.category = { [Op.in]: req.query.categories.split(',').map(c => c.trim()) }
      } else {
        where.category = req.query.category
      }
    }

    // 难度筛选
    if (difficulty) {
      where.difficulty = difficulty
    }

    // 食材排除
    const excludeCond = buildExcludeCondition(exclude)
    if (excludeCond) {
      const andConds = [excludeCond]
      const catFilter = req.query.categories || req.query.category
      if (catFilter || difficulty) {
        const directWhere = {}
        if (req.query.categories) {
          directWhere.category = { [Op.in]: req.query.categories.split(',').map(c => c.trim()) }
        } else if (req.query.category) {
          directWhere.category = req.query.category
        }
        if (difficulty) directWhere.difficulty = difficulty
        andConds.push(directWhere)
        delete where.category
        delete where.difficulty
      }
      where[Op.and] = andConds
    }

    // 排序方式：默认按相关性降序（标题 > 描述/标签 > 食材/贴士/故事）
    let order
    if (sortBy === 'cookTime_asc') {
      order = [['cookTime', 'ASC'], ['createdAt', 'DESC']]
    } else if (sortBy === 'cookTime_desc') {
      order = [['cookTime', 'DESC'], ['createdAt', 'DESC']]
    } else if (sortBy === 'oldest') {
      order = [['createdAt', 'ASC']]
    } else {
      const relevanceField = literal(`\n        CASE\n          WHEN title LIKE '%${query}%' THEN 100\n          WHEN description LIKE '%${query}%' THEN 40\n          WHEN categoryTags LIKE '%${query}%' THEN 30\n          WHEN ingredients LIKE '%${query}%' THEN 20\n          WHEN tips LIKE '%${query}%' THEN 10\n          WHEN story LIKE '%${query}%' THEN 10\n          WHEN culturalBackground LIKE '%${query}%' THEN 10\n          ELSE 0\n        END\n      `)
      order = [[relevanceField, 'DESC'], ['favoriteCount', 'DESC'], ['createdAt', 'DESC']]
    }

    const { count, rows } = await Recipe.findAndCountAll({
      where,
      order,
      offset,
      limit: pageSize,
      attributes: LIST_ATTRIBUTES,
    })

    let list = rows.map(r => r.toJSON())

    // ── 搜索结果相关性权重排序 ──
    // 当多词搜索时，精确标题匹配优先
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/[\s,，、]+/).filter(Boolean)
    if (queryWords.length > 1) {
      list.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase()
        const titleB = (b.title || '').toLowerCase()
        // 精确标题匹配优先
        const exactA = titleA === queryLower ? 100 : 0
        const exactB = titleB === queryLower ? 100 : 0
        // 开头匹配次之
        const prefixA = titleA.startsWith(queryLower) ? 50 : 0
        const prefixB = titleB.startsWith(queryLower) ? 50 : 0
        // 所有词都出现在标题中
        const allWordsA = queryWords.every(w => titleA.includes(w)) ? 20 : 0
        const allWordsB = queryWords.every(w => titleB.includes(w)) ? 20 : 0
        // 收藏数排序
        const favA = parseInt(a.favoriteCount || 0, 10)
        const favB = parseInt(b.favoriteCount || 0, 10)

        const scoreA = exactA + prefixA + allWordsA + favA * 0.1
        const scoreB = exactB + prefixB + allWordsB + favB * 0.1
        return scoreB - scoreA
      })
    }

    await attachRatingInfo(list)
    attachContentScore(list)

    // ── 拼写纠错：无结果时尝试模糊匹配 ──
    let spellSuggestion = null
    if (count === 0 && query.length >= 2) {
      // 1. 尝试去掉最后一个字
      if (query.length > 2) {
        const truncated = query.slice(0, -1)
        const altCount = await Recipe.count({
          where: {
            [Op.or]: [
              { title: { [Op.like]: `%${truncated}%` } },
              { ingredients: { [Op.like]: `%${truncated}%` } },
            ],
          },
        })
        if (altCount > 0) spellSuggestion = truncated
      }

      // 2. 尝试逐字拆解（取首字+尾字）
      if (!spellSuggestion && query.length > 3) {
        const fuzzyQ = query[0] + '%' + query[query.length - 1]
        const fuzzyCount = await Recipe.count({
          where: {
            [Op.or]: [
              { title: { [Op.like]: fuzzyQ } },
              { ingredients: { [Op.like]: fuzzyQ } },
            ],
          },
        })
        // 不返回具体建议，只标记可尝试其他关键词
      }

      // 3. 尝试热门或常见食材补全
      const commonKeywords = ['鸡', '肉', '蛋', '菜', '饭', '汤', '鱼', '牛', '猪', '虾', '豆腐', '番茄', '土豆', '鸡蛋', '面', '粉', '饼', '包', '饺']
      if (!spellSuggestion) {
        for (const ck of commonKeywords) {
          if (query.includes(ck)) {
            const found = await Recipe.count({
              where: {
                [Op.or]: [
                  { title: { [Op.like]: `%${ck}%` } },
                  { ingredients: { [Op.like]: `%${ck}%` } },
                ],
              },
              limit: 1,
            })
            if (found > 0) {
              spellSuggestion = ck
              break
            }
          }
        }
      }
    }

    return res.status(200).json(
      resJSON(0, 'ok', {
        list,
        total: count,
        page,
        pageSize,
        spellSuggestion,
      })
    )
  } catch (err) {
    console.error('[GET /recipes/search] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /suggestions — 搜索建议（轻量级，返回标题+ID）
// ─────────────────────────────────────────────────────────────────
router.get('/suggestions', async (req, res) => {
  res.set({
    'Cache-Control': 'public, max-age=15, s-maxage=60',
    Vary: 'Accept-Encoding',
  })
  try {
    const q = (req.query.q || '').trim()
    if (!q || q.length < 1) {
      return res.status(200).json(resJSON(0, 'ok', { list: [], total: 0 }))
    }

    const keyword = `%${q}%`
    const rows = await Recipe.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: keyword } },
          { description: { [Op.like]: keyword } },
        ],
      },
      attributes: ['id', 'title', 'category'],
      limit: 6,
      order: [['favoriteCount', 'DESC'], ['createdAt', 'DESC']],
      raw: true,
    })

    return res.status(200).json(resJSON(0, 'ok', { list: rows, total: rows.length }))
  } catch (err) {
    console.error('[GET /recipes/suggestions] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /hot-searches — 热门搜索词（内存频率统计 Top 8）
// ─────────────────────────────────────────────────────────────────
router.get('/hot-searches', async (req, res) => {
  res.set({
    'Cache-Control': 'public, max-age=60, s-maxage=300',
    Vary: 'Accept-Encoding',
  })
  try {
    const list = getHotSearches(8)
    return res.status(200).json(resJSON(0, 'ok', { list, total: list.length }))
  } catch (err) {
    console.error('[GET /recipes/hot-searches] Error:', err)
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

      let list = seasonalRecipes.map(r => {
        const item = r.toJSON()
        item.recommendType = 'seasonal'
        item.seasonContext = `${currentSeason}当季推荐`
        return item
      })

      // 多样性 + 新鲜度 + 编辑精选加权
      list = enhancedRecommendSort(list)

      // 已有 seasonContext 保留，无 recommendReason 的补充
      for (const item of list) {
        if (!item.recommendReason && item.seasonContext) {
          item.recommendReason = item.seasonContext
        }
      }

      await attachRatingInfo(list)

      return res.status(200).json(resJSON(0, 'ok', { list, recommendType: 'seasonal', season: currentSeason }))
    }

    // ─── 模式3: 食材推荐（智能匹配 + 部分匹配 + AI 降级） ───
    if (!ingredients || String(ingredients).trim().length === 0) {
      // 无参数时返回热门推荐
      const hotRecipes = await Recipe.findAll({
        order: [['favoriteCount', 'DESC']],
        limit: 12,
        attributes: LIST_ATTRIBUTES
      })
      let list = hotRecipes.map(r => {
        const item = r.toJSON()
        return item
      })

      // 多样性 + 新鲜度 + 编辑精选加权
      list = enhancedRecommendSort(list)

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

    // 使用 ingredientSearch 模块（别名感知 + 部分匹配 + 加权排序）
    const searchOptions = {
      ingredients: inputList,
      strict: false,  // 非严格模式：支持部分匹配
    }

    // 食材排除
    if (exclude) {
      searchOptions.exclude = exclude
    }

    const { list: results } = await searchByIngredients(searchOptions)
    await attachRatingInfo(results)

    // AI 降级增强（仅当 DB 匹配不到时）
    let aiGenerated = false
    let aiRecommends = null

    if (results.length === 0 && process.env.AI_API_KEY && process.env.NODE_ENV !== 'test') {
      const aiResult = await aiFallbackSearch(inputList)
      if (aiResult) {
        aiGenerated = aiResult.aiGenerated
        aiRecommends = aiResult.aiRecommends
      }
    }

    return res.status(200).json(
      resJSON(0, 'ok', {
        input: inputList,
        list: results,
        aiGenerated,
        aiRecommends,
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
// 参数: ?period=weekly|monthly|alltime（默认 alltime）, ?sortBy=composite|views|rating|favorites（默认 composite）
// ─────────────────────────────────────────────────────────────────
router.get('/rankings', async (req, res) => {
  res.set({
    'Cache-Control': 'public, max-age=120, s-maxage=300',
  })

  try {
    const { period = 'alltime', sortBy = 'composite' } = req.query

    // 计算时间范围（同时兼容新旧参数名）
    let dateWhere = {}
    const effectivePeriod = {
      'weekly': 'week',
      'monthly': 'month',
      'alltime': 'all',
      'week': 'week',
      'month': 'month',
      'all': 'all'
    }[period] || 'all'

    if (effectivePeriod === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      dateWhere = { createdAt: { [Op.gte]: weekAgo } }
    } else if (effectivePeriod === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      dateWhere = { createdAt: { [Op.gte]: monthAgo } }
    }

    // 根据排序方式确定 SQL order
    const sortField = {
      'composite': 'favoriteCount',
      'views': 'viewCount',
      'rating': 'favoriteCount',
      'favorites': 'favoriteCount',
      'favoriteCount': 'favoriteCount'
    }[sortBy] || 'favoriteCount'

    const order = [[sortField, 'DESC'], ['commentCount', 'DESC'], ['createdAt', 'DESC']]

    const recipes = await Recipe.findAll({
      where: dateWhere,
      attributes: [...LIST_ATTRIBUTES, 'season'],
      order,
      limit: 50,
    })

    let ranked = recipes.map(r => r.toJSON())

    // 获取平均评分 + 视频信息
    await attachRatingInfo(ranked)
    await attachVideoInfo(ranked)

    if (sortBy === 'rating' || sortBy === 'avgRating') {
      ranked.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))
    } else if (sortBy === 'views' || sortBy === 'viewCount') {
      ranked.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    } else if (sortBy === 'favorites' || sortBy === 'favoriteCount') {
      ranked.sort((a, b) => (b.favoriteCount || 0) - (a.favoriteCount || 0))
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

    return res.json(resJSON(0, 'ok', { period: effectivePeriod, sortBy, list: ranked }))
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

    // 获取候选食谱（扩大到 80 条以增加多样性）
    const candidates = await Recipe.findAll({
      where: { id: { [Op.ne]: id } },
      attributes: LIST_ATTRIBUTES.concat(['ingredients']),
      limit: 80,
    })

    // 计算 Jaccard 相似度 + 五维 categoryTags 覆盖度评分
    let scored = candidates.map(candidate => {
      const c = candidate.toJSON()
      let candidateTags = null
      if (c.categoryTags) {
        try { candidateTags = JSON.parse(c.categoryTags) } catch { candidateTags = null }
      }

      let similarity = 0
      const dimensionScores = {}
      const coveredDims = []

      if (sourceTags && candidateTags && typeof sourceTags === 'object' && typeof candidateTags === 'object') {
        const dimensions = ['ingredient', 'method', 'cuisine', 'flavor', 'price']
        let totalScore = 0
        let validDims = 0
        let coveredCount = 0

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
              const dimScore = intersection / union
              totalScore += dimScore
              validDims++
              dimensionScores[dim] = Math.round(dimScore * 100) / 100
              if (dimScore > 0) coveredCount++
            }
          }
        }

        if (validDims > 0) {
          similarity = totalScore / validDims
        }

        // 五维覆盖度评分（额外的覆盖度加分：覆盖维度越多越相似）
        const coverageScore = coveredCount / 5
        similarity = similarity * 0.7 + coverageScore * 0.3

        // cuisine 匹配额外加分
        if (sourceTags.cuisine && candidateTags.cuisine) {
          const cuisineMatch = sourceTags.cuisine.some(c =>
            Array.isArray(candidateTags.cuisine) && candidateTags.cuisine.includes(c)
          )
          if (cuisineMatch) {
            similarity = Math.min(1, similarity + 0.1)
            coveredDims.push('cuisine')
          }
        }

        // 标记哪些维度有匹配
        for (const dim of dimensions) {
          if (dimensionScores[dim] && dimensionScores[dim] > 0) {
            coveredDims.push(dim)
          }
        }
      } else if (data.category && c.category === data.category) {
        // 无 categoryTags 时按同 category 算基础分
        similarity = 0.3
        coveredDims.push('category')
      }

      return {
        recipe: c,
        similarity: Math.round(similarity * 100) / 100,
        dimensionScores: Object.keys(dimensionScores).length > 0 ? dimensionScores : undefined,
        coveredDimensions: coveredDims.length > 0 ? [...new Set(coveredDims)] : undefined,
      }
    })

    // 按相似度降序，排除自身
    scored = scored
      .filter(s => s.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)

    // 多样性控制：最多 2 条同 category 食谱进入 Top 5
    const catCount = {}
    const diversified = []
    const sourceCategory = data.category
    for (const s of scored) {
      const cat = s.recipe.category || 'other'
      const limit = cat === sourceCategory ? 2 : 3
      if ((catCount[cat] || 0) < limit) {
        diversified.push(s)
        catCount[cat] = (catCount[cat] || 0) + 1
      }
      if (diversified.length >= 5) break
    }

    scored = diversified

    // 如果不足 5 条，按 category 补充（但仍受多样性限）
    if (scored.length < 5 && data.category) {
      const existingIds = scored.map(s => s.recipe.id).concat(id)
      const fillRecipes = await Recipe.findAll({
        where: { id: { [Op.notIn]: existingIds }, category: data.category },
        attributes: LIST_ATTRIBUTES,
        order: [['favoriteCount', 'DESC']],
        limit: 5 - scored.length,
      })
      for (const fr of fillRecipes) {
        scored.push({ recipe: fr.toJSON(), similarity: 0, coveredDimensions: ['category'] })
      }
    }

    // 如果仍不足 5 条，补充热门食谱
    if (scored.length < 5) {
      const existingIds = scored.map(s => s.recipe.id).concat(id)
      const hotRecipes = await Recipe.findAll({
        where: { id: { [Op.notIn]: existingIds } },
        attributes: LIST_ATTRIBUTES,
        order: [['favoriteCount', 'DESC']],
        limit: 5 - scored.length,
      })
      for (const hr of hotRecipes) {
        scored.push({ recipe: hr.toJSON(), similarity: 0, coveredDimensions: [] })
      }
    }

    // 附加 nutriScore/smartDifficulty + 推荐原因
    const list = scored.map(s => {
      attachContentScore([s.recipe])
      const r = s.recipe
      if (!r.recommendReason) {
        if (s.similarity >= 0.5) r.recommendReason = '高度匹配'
        else if (s.similarity >= 0.3) r.recommendReason = '口味相近'
        else if (s.similarity > 0) r.recommendReason = '相关推荐'
        else r.recommendReason = '猜你喜欢'
      }
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
      attributes: ['id', 'title', 'description', 'coverImage', 'steps', 'nutrition', 'tips', 'story', 'culturalBackground', 'cookTime', 'difficulty', 'servings', 'category', 'viewCount', 'favoriteCount', 'commentCount', 'createdAt', 'updatedAt', 'userId'],
      offset,
      limit: pageSize,
      order: [['createdAt', 'DESC']],
    })

    // 收集举报统计
    const { Report } = require('../models')
    const recipeIds = rows.map(r => r.id)
    const reportCounts = {}  
    if (recipeIds.length > 0) {
      const reports = await Report.findAll({
        where: { recipeId: { [Op.in]: recipeIds } },
        attributes: ['recipeId', 'status']
      })
      for (const r of reports) {
        if (!reportCounts[r.recipeId]) reportCounts[r.recipeId] = { total: 0, pending: 0 }
        reportCounts[r.recipeId].total++
        if (r.status === 'pending') reportCounts[r.recipeId].pending++
      }
    }

    const list = rows.map(r => {
      const recipe = r.toJSON()
      const issues = []
      const rc = reportCounts[recipe.id] || { total: 0, pending: 0 }

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
      // 社区互动（社区反馈维度）
      if (recipe.viewCount < 10 && recipe.favoriteCount < 1) {
        issues.push('社区互动不足（缺少曝光/收藏）')
      }
      // 🚨 举报风险
      if (rc.pending >= 2) {
        issues.push('待处理举报量高（' + rc.pending + '条）')
      }
      if (rc.total >= 3) {
        issues.push('历史举报频繁（累计' + rc.total + '次）')
      }
      // 时效性：超过60天未更新且互动低
      const daysSinceUpdate = recipe.updatedAt
        ? Math.floor((Date.now() - new Date(recipe.updatedAt).getTime()) / 86400000)
        : 999
      if (daysSinceUpdate > 60 && recipe.commentCount === 0 && recipe.favoriteCount < 5) {
        issues.push('内容陈旧且缺乏互动（超过60天未更新）')
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

    // 附加改编来源信息
    try {
      const { RecipeFork } = require('../models')
      const User = require('../models')['User'] || require('../models/user')(null, null)
      // 查询改编来源（判断当前食谱是否为其他食谱的 fork）
      const forkRecord = await RecipeFork.findOne({
        where: { forkedRecipeId: id },
        include: [
          { model: Recipe, as: 'originalRecipe', attributes: ['id', 'title'] },
          { model: require('../models').User, as: 'forkedBy', attributes: ['id', 'nickname', 'username'] }
        ]
      })
      if (forkRecord && forkRecord.originalRecipe) {
        data.sourceInfo = {
          forkedFrom: { id: forkRecord.originalRecipe.id, title: forkRecord.originalRecipe.title },
          forkedBy: forkRecord.forkedBy
            ? { id: forkRecord.forkedBy.id, nickname: forkRecord.forkedBy.nickname, username: forkRecord.forkedBy.username }
            : null,
          changesNote: forkRecord.changesNote
        }
      }
      // 查询这个食谱被多少人 fork
      const forkCount = await RecipeFork.count({ where: { originalRecipeId: id } })
      data.forkCount = forkCount
    } catch (fErr) {
      // fork 信息附加失败不阻塞主响应
      console.warn('[FORK INFO] attach failed:', fErr.message)
    }

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
      story,
      culturalBackground,
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
      story: story || null,
      culturalBackground: culturalBackground || null,
      author: user ? user.nickname || user.username : '未知用户',
      userId: req.userId,
    })

    // 记录活动 + 成就检查（不阻塞响应）
    setImmediate(() => {
      createActivity(req.userId, 'create_recipe', recipe.id, 'recipe', {
        title: recipe.title
      })
      checkAllAchievements(req.userId, ['first-recipe', 'recipe-10', 'recipe-50', 'recipe-100', 'master-chef']).catch(err => {
        console.error('[recipe achievement err]', err)
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
      story,
      culturalBackground,
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
    if (story !== undefined) updateData.story = story
    if (culturalBackground !== undefined) updateData.culturalBackground = culturalBackground
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

/**
 * 食材替代建议映射表
 * 基于常见类别进行食材替代推荐
 */
const SUBSTITUTION_MAP = {
  '五花肉': ['去皮五花肉', '猪肩肉', '猪腩肉'],
  '猪肉': ['鸡腿肉', '牛肉', '羊肉'],
  '牛肉': ['羊肉', '猪肉', '鸡腿肉'],
  '鸡胸肉': ['鸡腿肉', '鸡翅', '豆腐'],
  '鸡腿': ['鸡翅', '鸡胸肉', '鸭腿'],
  '羊肉': ['牛肉', '猪肉', '鸡腿肉'],
  '排骨': ['猪肩肉', '鸡腿', '牛肋条'],
  '培根': ['火腿片', '烟熏三文鱼', '素培根'],
  '火腿': ['培根', '午餐肉', '熏肉'],
  '香肠': ['火腿肠', '腊肠', '素香肠'],
  '虾': ['虾仁', '鱿鱼', '扇贝', '鱼肉'],
  '鱼': ['虾', '鱿鱼', '豆腐', '鸡胸肉'],
  '三文鱼': ['鳕鱼', '金枪鱼', '鲈鱼'],
  '鱿鱼': ['虾仁', '墨鱼', '扇贝'],
  '扇贝': ['虾仁', '鱿鱼', '带子'],
  '鸡蛋': ['鸭蛋', '鹌鹑蛋', '嫩豆腐'],
  '牛奶': ['豆奶', '杏仁奶', '燕麦奶', '椰奶'],
  '黄油': ['椰子油', '橄榄油', '人造黄油'],
  '奶酪': ['豆腐乳', '素奶酪', '营养酵母'],
  '奶油': ['椰奶', '豆奶', '牛奶'],
  '番茄': ['圣女果', '番茄罐头', '红椒'],
  '土豆': ['红薯', '芋头', '山药', '南瓜'],
  '胡萝卜': ['白萝卜', '南瓜', '红薯'],
  '洋葱': ['青葱', '红葱头', '韭葱'],
  '大蒜': ['蒜苗', '蒜粉', '洋葱'],
  '姜': ['姜粉', '沙姜', '高良姜'],
  '白菜': ['娃娃菜', '卷心菜', '菠菜'],
  '菠菜': ['小油菜', '苋菜', '芝麻菜'],
  '西兰花': ['菜花', '芥蓝', '芦笋'],
  '茄子': ['西葫芦', '南瓜', '青椒'],
  '蘑菇': ['香菇', '杏鲍菇', '金针菇'],
  '玉米': ['豌豆', '毛豆', '青豆'],
  '豆腐': ['豆干', '腐竹', '素鸡', '嫩豆腐'],
  '大米': ['糙米', '小米', '藜麦', '糯米'],
  '面条': ['意面', '米粉', '乌冬面', '拉面'],
  '面粉': ['全麦面粉', '米粉', '杏仁粉'],
  '面包': ['馒头', '法棍', '吐司'],
  '酱油': ['老抽', '生抽', '蒸鱼豉油', '日式酱油'],
  '醋': ['香醋', '陈醋', '米醋', '白醋'],
  '料酒': ['米酒', '黄酒', '清酒'],
  '糖': ['蜂蜜', '枫糖浆', '代糖', '椰糖'],
  '盐': ['海盐', '岩盐', '低钠盐'],
  '胡椒粉': ['花椒粉', '辣椒粉', '五香粉'],
  '辣椒': ['干辣椒', '辣椒粉', '辣酱', '青椒'],
  '花椒': ['麻椒', '藤椒油', '花椒粉'],
  '八角': ['五香粉', '桂皮', '小茴香'],
  '肉桂': ['肉桂粉', '豆蔻', '丁香'],
  '蜂蜜': ['枫糖浆', '龙舌兰蜜', '白糖'],
  '植物油': ['橄榄油', '椰子油', '葵花籽油', '芝麻油'],
  '橄榄油': ['植物油', '牛油果油', '葡萄籽油'],
  '芝麻油': ['橄榄油', '花生油', '辣椒油'],
}

// POST /:id/substitutions — 食材替代建议
router.post('/:id/substitutions', async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id, {
      attributes: ['id', 'title', 'ingredients', 'categoryTags'],
    })
    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }
    let ingredients = recipe.ingredients
    if (typeof ingredients === 'string') {
      try { ingredients = JSON.parse(ingredients) } catch { ingredients = [] }
    }
    if (!Array.isArray(ingredients)) ingredients = []

    const ingredientNames = ingredients.map(function(i) {
      if (typeof i === 'string') return i
      return i.name || i.ingredient || ''
    }).filter(Boolean)

    const substitutions = {}
    ingredientNames.forEach(function(name) {
      if (SUBSTITUTION_MAP[name]) {
        substitutions[name] = SUBSTITUTION_MAP[name]
        return
      }
      for (var key in SUBSTITUTION_MAP) {
        if (SUBSTITUTION_MAP.hasOwnProperty(key)) {
          if (name.indexOf(key) !== -1 || key.indexOf(name) !== -1) {
            substitutions[name] = SUBSTITUTION_MAP[key]
            return
          }
        }
      }
    })

    return res.status(200).json(resJSON(0, 'ok', {
      recipeTitle: recipe.title,
      substitutions: Object.keys(substitutions).length > 0 ? substitutions : null,
      message: Object.keys(substitutions).length > 0
        ? '已为您找到可替代的食材选项'
        : '未找到明确替代建议，可按类别尝试替换',
    }))
  } catch (err) {
    console.error('[POST /recipes/:id/substitutions] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// GET /:id/estimated-cook-time — 智能烹饪时间估算
router.get('/:id/estimated-cook-time', async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id, {
      attributes: ['id', 'title', 'cookTime', 'steps', 'ingredients', 'difficulty', 'categoryTags'],
    })
    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }
    let steps = recipe.steps
    if (typeof steps === 'string') {
      try { steps = JSON.parse(steps) } catch { steps = [] }
    }
    if (!Array.isArray(steps)) steps = []
    let ingredients = recipe.ingredients
    if (typeof ingredients === 'string') {
      try { ingredients = JSON.parse(ingredients) } catch { ingredients = [] }
    }
    if (!Array.isArray(ingredients)) ingredients = []

    var estimatedMinutes = steps.length * 5
    var slowCookingPattern = /(炖|卤|焖|熬|煮|煲|慢|煨|蒸|烤|腌|发酵|醒面|松弛)/

    steps.forEach(function(s) {
      var text = typeof s === 'string' ? s : (s.description || s.text || s.step || '')
      var timeMatches = text.match(/\d+\s*(分钟|小时)/g)
      if (timeMatches) {
        timeMatches.forEach(function(m) {
          var val = parseInt(m, 10)
          if (m.indexOf('小时') !== -1) estimatedMinutes += val * 60
          else estimatedMinutes += val
        })
      } else if (slowCookingPattern.test(text)) {
        estimatedMinutes += 20
      }
    })

    estimatedMinutes += ingredients.length * 2

    var originalTime = parseInt(recipe.cookTime || 0, 10)
    if (originalTime > 0) {
      estimatedMinutes = originalTime
    }

    var rangeMin = Math.max(5, Math.round(estimatedMinutes * 0.8))
    var rangeMax = Math.round(estimatedMinutes * 1.2)

    var timeLabel = '快菜'
    if (estimatedMinutes >= 120) timeLabel = '慢炖'
    else if (estimatedMinutes >= 60) timeLabel = '耗时'
    else if (estimatedMinutes >= 30) timeLabel = '中等'

    return res.status(200).json(resJSON(0, 'ok', {
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      estimatedMinutes: estimatedMinutes,
      timeRange: String(rangeMin) + '-' + String(rangeMax),
      timeLabel: timeLabel,
      originalCookTime: originalTime || null,
      confidence: originalTime > 0 ? 'high' : 'medium',
    }))
  } catch (err) {
    console.error('[GET /recipes/:id/estimated-cook-time] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// GET /:id/enhanced-difficulty — 增强难度评估
router.get('/:id/enhanced-difficulty', async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id, {
      attributes: ['id', 'title', 'cookTime', 'steps', 'ingredients', 'difficulty', 'categoryTags', 'tips'],
    })
    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }
    let steps = recipe.steps
    if (typeof steps === 'string') {
      try { steps = JSON.parse(steps) } catch { steps = [] }
    }
    if (!Array.isArray(steps)) steps = []
    let ingredients = recipe.ingredients
    if (typeof ingredients === 'string') {
      try { ingredients = JSON.parse(ingredients) } catch { ingredients = [] }
    }
    if (!Array.isArray(ingredients)) ingredients = []

    var techniqueWords = ['焯水', '过油', '挂糊', '上浆', '勾芡', '爆炒', '滑炒', '干煸', '炝锅', '熘', '扣', '卷', '酿', '雕花', '裱花', '打发', '乳化', '焦糖化', '低温慢煮', '发酵', '揉面', '出膜', '醒面', '翻糖', '拉丝', '酥皮', '千层', '慕斯', '舒芙蕾']
    var specialTools = ['烤箱', '空气炸锅', '蒸箱', '厨师机', '搅拌机', '破壁机', '料理机', '面包机', '压面机', '面条机', '绞肉机', '模具', '裱花袋', '裱花嘴', '擀面杖', '称', '温度计', '计时器']

    var techniqueCount = 0
    var toolCount = 0
    var matchedTechniques = []
    var matchedTools = []

    var allTextParts = []
    steps.forEach(function(s) {
      allTextParts.push(typeof s === 'string' ? s : (s.description || s.text || ''))
    })
    ingredients.forEach(function(i) {
      allTextParts.push(typeof i === 'string' ? i : (i.name || ''))
    })
    if (recipe.tips) allTextParts.push(recipe.tips)
    var allText = allTextParts.join(' ')

    techniqueWords.forEach(function(tw) {
      if (allText.indexOf(tw) !== -1) {
        techniqueCount++
        matchedTechniques.push(tw)
      }
    })
    specialTools.forEach(function(st) {
      if (allText.indexOf(st) !== -1) {
        toolCount++
        matchedTools.push(st)
      }
    })

    var ct = parseInt(recipe.cookTime || 0, 10)
    var complexity = ct >= 90 ? 3 : (ct >= 45 ? 2 : (ct >= 20 ? 1 : 0))

    var stepsCount = steps.length
    if (stepsCount >= 10) complexity += 4
    else if (stepsCount >= 8) complexity += 3
    else if (stepsCount >= 5) complexity += 2
    else if (stepsCount >= 3) complexity += 1

    var ingredientCount = ingredients.length
    if (ingredientCount >= 15) complexity += 3
    else if (ingredientCount >= 10) complexity += 2
    else if (ingredientCount >= 6) complexity += 1

    if (techniqueCount >= 5) complexity += 4
    else if (techniqueCount >= 3) complexity += 2
    else if (techniqueCount >= 1) complexity += 1

    if (toolCount >= 3) complexity += 3
    else if (toolCount >= 1) complexity += 1

    var level
    if (complexity >= 10) level = 'advanced'
    else if (complexity >= 6) level = 'intermediate'
    else level = 'beginner'

    var levelMap = { advanced: '高级', intermediate: '中等', beginner: '初级' }

    return res.status(200).json(resJSON(0, 'ok', {
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      difficulty: recipe.difficulty,
      enhancedDifficulty: level,
      enhancedDifficultyCN: levelMap[level],
      complexity: complexity,
      details: {
        stepCount: stepsCount,
        ingredientCount: ingredientCount,
        cookTimeMinutes: ct,
        techniqueCount: techniqueCount,
        matchedTechniques: matchedTechniques,
        toolCount: toolCount,
        matchedTools: matchedTools,
      },
    }))
  } catch (err) {
    console.error('[GET /recipes/:id/enhanced-difficulty] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// POST /:id/substitutions — 食材替代建议
// ─────────────────────────────────────────────────────────────────
const INGREDIENT_CATEGORIES = {
  '蛋白质·肉': ['猪肉', '牛肉', '羊肉', '鸡肉', '鸭肉', '五花肉', '里脊', '排骨', '鸡胸肉', '鸡腿', '牛腩', '牛腱', '肉末', '腊肉', '培根', '火腿'],
  '蛋白质·水产': ['鱼', '虾', '蟹', '鱿鱼', '蛤蜊', '虾仁', '三文鱼', '鲈鱼', '带鱼', '龙利鱼', '鳕鱼', '贝'],
  '蛋白质·蛋豆': ['鸡蛋', '鸭蛋', '豆腐', '豆腐干', '千张', '腐竹', '豆皮', '豆浆', '毛豆', '黄豆', '黑豆', '纳豆', '豆豉'],
  '蔬菜·叶菜': ['白菜', '菠菜', '生菜', '油菜', '空心菜', '苋菜', '韭菜', '卷心菜', '羽衣甘蓝'],
  '蔬菜·根茎': ['土豆', '胡萝卜', '萝卜', '红薯', '山药', '芋头', '莲藕', '竹笋', '莴笋'],
  '蔬菜·瓜果': ['番茄', '茄子', '青椒', '甜椒', '黄瓜', '冬瓜', '南瓜', '丝瓜', '苦瓜', '西葫芦', '秋葵'],
  '蔬菜·菌菇': ['香菇', '蘑菇', '金针菇', '杏鲍菇', '木耳', '银耳', '平菇', '茶树菇'],
  '调味料·酱': ['生抽', '老抽', '酱油', '醋', '料酒', '蚝油', '豆瓣酱', '番茄酱', '辣椒酱', '甜面酱', '芝麻酱', '腐乳'],
  '调味料·香辛': ['盐', '糖', '姜', '蒜', '葱', '花椒', '八角', '桂皮', '香叶', '干辣椒', '胡椒粉', '五香粉', '孜然'],
  '主食·米面': ['大米', '糯米', '面粉', '面条', '米粉', '意面', '面包', '馒头', '饺子皮', '馄饨皮', '年糕'],
  '奶制品': ['牛奶', '酸奶', '黄油', '奶油', '奶酪', '芝士', '炼乳', '淡奶油'],
  '干货·果仁': ['花生', '核桃', '杏仁', '腰果', '松子', '芝麻', '枸杞', '红枣', '桂圆', '葡萄干'],
}

/** 食材到类别的快速查找 */
function findIngredientCategory(name) {
  if (!name) return null
  const lower = name.toLowerCase()
  for (const [cat, items] of Object.entries(INGREDIENT_CATEGORIES)) {
    if (items.some(i => lower.includes(i.toLowerCase()) || i.toLowerCase().includes(lower))) {
      return cat
    }
  }
  return null
}

router.post('/:id/substitutions', async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id, {
      attributes: ['id', 'title', 'ingredients'],
    })

    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在'))
    }

    let ingredients = recipe.ingredients
    if (typeof ingredients === 'string') {
      try { ingredients = JSON.parse(ingredients) } catch { ingredients = [] }
    }
    if (!Array.isArray(ingredients)) ingredients = []

    const ingredientNames = ingredients.map(i => {
      if (typeof i === 'string') return i
      return i.name || i.ingredient || ''
    }).filter(Boolean)

    // 从 query 中提取过滤条件
    const filters = {
      avoidAllergens: req.query.avoidAllergens || req.body.avoidAllergens || '',
      diet: req.query.diet || req.body.diet || '',
    }

    // 过敏原排除组
    const ALLERGEN_EXCLUSIONS = {
      '花生': ['花生', '花生酱', '花生碎'],
      '坚果': ['花生', '核桃', '杏仁', '腰果', '松子'],
      '乳制品': ['牛奶', '酸奶', '黄油', '奶油', '奶酪', '芝士', '炼乳', '淡奶油'],
      '鸡蛋': ['鸡蛋', '鸭蛋', '蛋'],
      '海鲜': ['鱼', '虾', '蟹', '鱿鱼', '蛤蜊', '虾仁', '三文鱼', '鲈鱼', '带鱼', '龙利鱼', '鳕鱼', '贝'],
      '麸质': ['面粉', '面条', '面包', '馒头', '饺子皮', '馄饨皮', '意面', '饼干'],
      '大豆': ['豆腐', '豆腐干', '千张', '腐竹', '豆浆', '毛豆', '黄豆', '豆豉', '酱油', '生抽', '老抽', '豆瓣酱'],
    }

    // 饮食排除组
    const DIET_EXCLUSIONS = {
      'vegan': ['猪肉', '牛肉', '羊肉', '鸡肉', '鸭肉', '五花肉', '里脊', '排骨', '鸡胸肉', '鸡腿', '牛腩', '牛腱', '肉末', '腊肉', '培根', '火腿', '鱼', '虾', '蟹', '鱿鱼', '蛤蜊', '虾仁', '三文鱼', '鲈鱼', '带鱼', '龙利鱼', '鳕鱼', '贝', '鸡蛋', '鸭蛋', '牛奶', '酸奶', '黄油', '奶油', '奶酪', '芝士', '炼乳', '淡奶油', '蜂蜜', '蚝油'],
      'vegetarian': ['猪肉', '牛肉', '羊肉', '鸡肉', '鸭肉', '五花肉', '里脊', '排骨', '鸡胸肉', '鸡腿', '牛腩', '牛腱', '肉末', '腊肉', '培根', '火腿', '鱼', '虾', '蟹', '鱿鱼', '蛤蜊', '虾仁', '三文鱼', '鲈鱼', '带鱼', '龙利鱼', '鳕鱼', '贝'],
      'low-carb': ['大米', '糯米', '面粉', '面条', '米粉', '意面', '面包', '馒头', '饺子皮', '馄饨皮', '年糕', '土豆', '红薯', '糖', '冰糖', '红糖', '白糖'],
      'low-fat': ['五花肉', '猪油', '黄油', '奶油', '奶酪', '芝士', '肥肉'],
    }

    // 计算需要排除的食材
    const excludedItems = new Set()

    // 过敏原过滤
    if (filters.avoidAllergens) {
      const allergensList = filters.avoidAllergens.split(',').map(a => a.trim())
      for (const allergen of allergensList) {
        const exclusions = ALLERGEN_EXCLUSIONS[allergen]
        if (exclusions) {
          exclusions.forEach(e => excludedItems.add(e))
        }
      }
    }

    // 饮食限制过滤
    if (filters.diet) {
      const exclusions = DIET_EXCLUSIONS[filters.diet]
      if (exclusions) {
        exclusions.forEach(e => excludedItems.add(e))
      }
    }

    // 建类别索引
    const categorized = {}
    ingredientNames.forEach(name => {
      const cat = findIngredientCategory(name)
      if (cat) {
        if (!categorized[cat]) categorized[cat] = []
        categorized[cat].push(name)
      }
    })

    // 为每个已分类的食材推荐同类别替代品（排除已排除的食材）
    const substitutions = {}
    Object.entries(categorized).forEach(([cat, names]) => {
      const available = (INGREDIENT_CATEGORIES[cat] || []).filter(
        a => !excludedItems.has(a) && !names.some(n =>
          n.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(n.toLowerCase())
        )
      )
      if (available.length > 0) {
        names.forEach(n => {
          substitutions[n] = available.slice(0, 3)
        })
      }
    })

    // 未分类食材提示
    const uncategorized = ingredientNames.filter(n => !findIngredientCategory(n))

    return res.json(resJSON(0, 'ok', {
      substitutions,
      uncategorized,
      totalIngredients: ingredientNames.length,
      categorizedCount: Object.keys(categorized).length,
      activeFilters: filters,
      allergensExcluded: filters.avoidAllergens
        ? filters.avoidAllergens.split(',').map(a => ({ name: a.trim(), excludedCount: [...excludedItems].filter(e =>
          ALLERGEN_EXCLUSIONS[a.trim()]?.includes(e)
        ).length }))
        : [],
    }))
  } catch (err) {
    console.error('[POST /recipes/:id/substitutions] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误'))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/metadata — 智能元数据增强（烹饪时间估算 + 难度增强）
// ─────────────────────────────────────────────────────────────────
router.get('/:id/metadata', async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id, {
      attributes: ['id', 'title', 'steps', 'ingredients', 'categoryTags', 'cookTime', 'difficulty', 'nutrition'],
    })

    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在'))
    }

    let steps = recipe.steps
    if (typeof steps === 'string') {
      try { steps = JSON.parse(steps) } catch { steps = [] }
    }

    let ingredients = recipe.ingredients
    if (typeof ingredients === 'string') {
      try { ingredients = JSON.parse(ingredients) } catch { ingredients = [] }
    }

    // 烹饪时间智能估算
    const estimatedCookTime = estimateCookTime(steps, recipe.cookTime)

    // 难度增强
    const enhancedDifficulty = enhanceDifficulty(recipe, steps, ingredients)

    // 获取步骤中的技术词
    const techTerms = extractTechTerms(steps)

    return res.json(resJSON(0, 'ok', {
      estimatedCookTime,
      enhancedDifficulty,
      techTerms,
      stepCount: Array.isArray(steps) ? steps.length : 0,
      ingredientCount: Array.isArray(ingredients) ? ingredients.length : 0,
    }))
  } catch (err) {
    console.error('[GET /recipes/:id/metadata] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误'))
  }
})

/** 根据步骤内容估算烹饪时间（分钟） */
function estimateCookTime(steps, existingCookTime) {
  // 如果已有准确烹饪时间且不为0，直接返回
  if (existingCookTime && parseInt(existingCookTime, 10) > 5) {
    return parseInt(existingCookTime, 10)
  }

  if (!Array.isArray(steps) || steps.length === 0) {
    return existingCookTime || 30
  }

  // 从步骤中提取时间标注
  const timePattern = /(\d+)\s*(分钟|min|m)|(\d+)\s*(小时|h|hour)/gi
  let totalFromSteps = 0
  let timeFound = false

  steps.forEach(s => {
    const text = typeof s === 'string' ? s : (s.description || s.text || s.step || '')
    let match
    while ((match = timePattern.exec(text)) !== null) {
      if (match[1] && match[2]) {
        totalFromSteps += parseInt(match[1], 10)
        timeFound = true
      } else if (match[3] && match[4]) {
        totalFromSteps += parseInt(match[3], 10) * 60
        timeFound = true
      }
    }
  })

  if (timeFound && totalFromSteps > 0) {
    return totalFromSteps
  }

  // 基于步骤复杂度和慢烹饪动作估算
  const slowActionPattern = /(炖|卤|焖|熬|蒸|煮|烤|慢|发酵|醒面|腌制|卤制|煲)/
  let baseTime = 20 + steps.length * 8

  steps.forEach(s => {
    const text = typeof s === 'string' ? s : (s.description || s.text || s.step || '')
    if (slowActionPattern.test(text)) {
      baseTime += 20  // 慢动作增加20分钟
    }
  })

  // 如果步骤超过6步，时间更充足
  if (steps.length >= 8) baseTime += 20
  else if (steps.length >= 5) baseTime += 10

  return Math.min(Math.max(baseTime, 10), 240)
}

/** 增强的难度评估 */
const TECHNIQUE_WORDS = [
  '切丝', '切片', '切丁', '剁', '斩', '片', '滚刀', '雕花',
  '爆炒', '滑炒', '煸', '溜', '汆', '焯', '过油', '走油',
  '挂糊', '上浆', '拍粉', '勾芡', '淋芡',
  '油温', '温油', '热油', '旺火', '文火', '中火', '大火', '小火', '火候',
  '酥皮', '起酥', '澄面', '烫面', '发面', '揉面', '醒面', '出膜',
  '焦糖', '乳化', '打发', '翻拌', '切拌', '水浴', '隔水',
  '去腥', '腌制', '码味', '上色',
  '雕', '卷', '包', '捏褶皱',
]

function enhanceDifficulty(recipe, steps, ingredients) {
  const existing = computeSmartDifficulty(recipe)
  if (!Array.isArray(steps)) return existing

  // 统计技术词
  let techCount = 0
  steps.forEach(s => {
    const text = typeof s === 'string' ? s : (s.description || s.text || s.step || '')
    TECHNIQUE_WORDS.forEach(tw => {
      if (text.includes(tw)) techCount++
    })
  })

  const ingCount = Array.isArray(ingredients) ? ingredients.length : 0
  const stepCount = steps.length

  // 综合判断
  if (techCount >= 5 || stepCount >= 10 || ingCount >= 15) return 'advanced'
  if (techCount >= 3 || stepCount >= 6 || ingCount >= 8) {
    if (existing === 'beginner') return 'intermediate'
    return existing
  }

  return existing
}

/** 提取步骤中的关键技术词汇 */
function extractTechTerms(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return []
  const found = new Set()
  steps.forEach(s => {
    const text = typeof s === 'string' ? s : (s.description || s.text || s.step || '')
    TECHNIQUE_WORDS.forEach(tw => {
      if (text.includes(tw)) found.add(tw)
    })
  })
  return [...found].slice(0, 10)
}

module.exports = router
module.exports.auth = auth
module.exports.attachRatingInfo = attachRatingInfo
module.exports.attachContentScore = attachContentScore
module.exports.attachVideoInfo = attachVideoInfo
