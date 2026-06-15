'use strict'

/**
 * routes/tags.js
 * 标签智能优化 — 热门标签 / 标签搜索 / 标签建议 / 日志记录
 */

const express = require('express')
const router = express.Router()
const { Op } = require('sequelize')
const { TagSuggestion, Recipe } = require('../models')
const auth = require('../middleware/auth')

// ── 标签列表（GET /api/tags）──────────────────────────────────────────────

/**
 * GET /api/tags
 * 返回所有标签列表，按关联菜谱数降序排序
 * 
 * 数据源：从 Recipe.categoryTags JSON 字段中聚合提取
 * categoryTags 结构: { ingredient: [], method: [], cuisine: [], flavor: [], price: [] }
 * 每个字段的值可以是字符串或数组格式
 * 
 * 响应格式：
 * {
 *   code: 0,
 *   message: 'ok',
 *   data: [
 *     { id: '川菜', name: '川菜', recipeCount: 15 },
 *     { id: '炒', name: '炒', recipeCount: 12 },
 *     ...
 *   ]
 * }
 */
router.get('/tags', async (req, res) => {
  try {
    // 查询所有食谱的 categoryTags
    const recipes = await Recipe.findAll({
      attributes: ['categoryTags'],
      raw: true,
    })

    // 统计每个标签出现的次数
    const tagCountMap = new Map() // tag -> count

    recipes.forEach(recipe => {
      const rawTags = recipe.categoryTags
      if (!rawTags) return

      let tagsObj = {}
      try {
        tagsObj = typeof rawTags === 'string' ? JSON.parse(rawTags) : rawTags
      } catch (err) {
        return // 忽略解析失败的记录
      }

      if (typeof tagsObj !== 'object' || tagsObj === null) return

      // 提取所有标签值（支持字符串和数组格式）
      Object.values(tagsObj).forEach(val => {
        if (!val) return
        
        const values = []
        if (typeof val === 'string') {
          // 支持逗号分隔的多值格式
          val.split(',').forEach(v => {
            const trimmed = v.trim()
            if (trimmed) values.push(trimmed)
          })
        } else if (Array.isArray(val)) {
          val.forEach(v => {
            if (typeof v === 'string' && v.trim()) {
              values.push(v.trim())
            }
          })
        }

        // 累计计数
        values.forEach(tag => {
          tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1)
        })
      })
    })

    // 转换为数组并按 count 降序排序
    const tags = Array.from(tagCountMap.entries())
      .map(([tag, count]) => ({
        tag,
        count,
      }))
      .sort((a, b) => b.count - a.count)

    res.json({
      code: 0,
      message: 'ok',
      data: tags,
    })
  } catch (err) {
    console.error('[GET /api/tags] error:', err.message)
    res.status(500).json({ code: 500, message: '获取标签列表失败' })
  }
})

// ── 热门标签 ──────────────────────────────────────────────────────────────

// GET /api/tags/popular — 返回热门标签统计
router.get('/tags/popular', async (req, res) => {
  try {
    const { limit = 30, category, minCount = 1 } = req.query
    const where = { count: { [Op.gte]: parseInt(minCount, 10) || 1 } }
    if (category) where.category = category

    const tags = await TagSuggestion.findAll({
      where,
      order: [['count', 'DESC']],
      limit: Math.min(parseInt(limit, 10) || 30, 100),
    })

    res.json({
      code: 0,
      data: {
        list: tags.map(t => ({
          tag: t.tag,
          category: t.category,
          count: t.count,
        })),
        total: tags.length,
      },
    })
  } catch (err) {
    console.error('[GET /tags/popular] error:', err.message)
    res.status(500).json({ code: 500, message: '获取热门标签失败' })
  }
})

// GET /api/tags/search — 标签搜索
router.get('/tags/search', async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.trim().length < 1) {
      return res.json({ code: 0, data: { list: [], total: 0 } })
    }

    const tags = await TagSuggestion.findAll({
      where: {
        tag: { [Op.like]: `%${q.trim()}%` },
      },
      order: [['count', 'DESC']],
      limit: 20,
    })

    res.json({
      code: 0,
      data: {
        list: tags.map(t => ({ tag: t.tag, category: t.category, count: t.count })),
        total: tags.length,
      },
    })
  } catch (err) {
    console.error('[GET /tags/search] error:', err.message)
    res.status(500).json({ code: 500, message: '标签搜索失败' })
  }
})

// POST /api/tags/log — 记录标签点击/使用行为
router.post('/tags/log', async (req, res) => {
  try {
    const { tag, category } = req.body
    if (!tag || !tag.trim()) {
      return res.status(400).json({ code: 400, message: 'tag 必填' })
    }

    const tagText = tag.trim().toLowerCase()
    // 查找或创建
    const [record] = await TagSuggestion.findOrCreate({
      where: { tag: tagText },
      defaults: { tag: tagText, category: category || null, count: 1 },
    })

    if (!record._options.isNewRecord) {
      // 已有记录：递增 count
      await record.increment('count', { by: 1 })
    }

    res.json({ code: 0, message: 'ok' })
  } catch (err) {
    console.error('[POST /tags/log] error:', err.message)
    res.status(500).json({ code: 500, message: '记录标签失败' })
  }
})

// POST /api/tags/suggest — 基于用户行为的标签推荐
router.post('/tags/suggest', auth, async (req, res) => {
  try {
    const userId = req.user.id
    const { recipeId } = req.body

    if (!recipeId) {
      return res.status(400).json({ code: 400, message: 'recipeId 必填' })
    }

    const recipe = await Recipe.findByPk(recipeId, {
      attributes: ['id', 'category', 'categoryTags', 'title', 'ingredients'],
    })

    if (!recipe) {
      return res.status(404).json({ code: 404, message: '食谱不存在' })
    }

    // 从食谱中提取标签
    const recipeTags = []
    if (recipe.category) recipeTags.push(recipe.category)
    if (recipe.categoryTags) {
      let ctags = recipe.categoryTags
      if (typeof ctags === 'string') {
        try { ctags = JSON.parse(ctags) } catch { ctags = [] }
      }
      if (Array.isArray(ctags)) {
        // categoryTags 是对象数组 [{key,value},...]
        ctags.forEach(ct => {
          if (ct.value) recipeTags.push(ct.value)
        })
      }
    }

    // 查询热门关联标签
    const relatedTags = await TagSuggestion.findAll({
      where: {
        tag: { [Op.in]: recipeTags.length > 0 ? recipeTags : [''] },
        count: { [Op.gte]: 2 },
      },
      order: [['count', 'DESC']],
      limit: 10,
    })

    // 解析关联标签
    const suggestions = new Map()
    relatedTags.forEach(rt => {
      suggestions.set(rt.tag, { tag: rt.tag, count: rt.count, reason: 'popular' })
      if (rt.relatedTags) {
        try {
          const rel = JSON.parse(rt.relatedTags)
          if (Array.isArray(rel)) {
            rel.forEach(r => {
              if (!suggestions.has(r.tag)) {
                suggestions.set(r.tag, { tag: r.tag, count: r.count || 0, reason: 'related' })
              }
            })
          }
        } catch { /* ignore */ }
      }
    })

    res.json({
      code: 0,
      data: {
        suggestions: Array.from(suggestions.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 15),
      },
    })
  } catch (err) {
    console.error('[POST /tags/suggest] error:', err.message)
    res.status(500).json({ code: 500, message: '标签推荐失败' })
  }
})

// ── 标签统计 ──────────────────────────────────────────────────────────────

// GET /api/tags/stats — 返回每个分类的统计数据
router.get('/tags/stats', async (req, res) => {
  try {
    const labelMap = {
      cuisine: '菜系',
      flavor: '口味',
      cooking: '烹饪方式',
      ingredient: '食材',
      meal: '餐点类型',
      difficulty: '难度',
      season: '季节',
    }

    // 汇总查询：按 category 分组聚合
    const rows = await TagSuggestion.sequelize.query(
      `SELECT category, COUNT(*) AS tagCount, SUM(count) AS countSum
       FROM tag_suggestions
       WHERE category IS NOT NULL
       GROUP BY category
       ORDER BY SUM(count) DESC`,
      { type: TagSuggestion.sequelize.QueryTypes.SELECT }
    )

    // 对每个分类取 top 5 标签
    const categories = await Promise.all(
      rows.map(async (row) => {
        const topTags = await TagSuggestion.findAll({
          where: { category: row.category },
          order: [['count', 'DESC']],
          limit: 5,
          attributes: ['tag'],
          raw: true,
        })

        return {
          category: row.category,
          label: labelMap[row.category] || row.category,
          tagCount: parseInt(row.tagCount, 10) || 0,
          countSum: parseInt(row.countSum, 10) || 0,
          topTags: topTags.map(t => t.tag),
        }
      })
    )

    res.json({ code: 0, data: { categories } })
  } catch (err) {
    console.error('[GET /tags/stats] error:', err.message)
    res.status(500).json({ code: 500, message: '获取标签统计失败' })
  }
})

// GET /api/tags/related — 基于食谱共现关系返回关联标签
router.get('/tags/related', async (req, res) => {
  try {
    const { tag, limit = 10 } = req.query
    if (!tag || !tag.trim()) {
      return res.status(400).json({ code: 400, message: 'tag 参数必填' })
    }

    const tagText = tag.trim()
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50)

    // 搜索所有 categoryTags 包含该 tag 的食谱
    const recipes = await Recipe.findAll({
      where: {
        categoryTags: { [Op.like]: `%${tagText}%` },
      },
      attributes: ['id', 'categoryTags'],
      raw: true,
    })

    if (recipes.length === 0) {
      return res.json({ code: 0, data: { tag: tagText, related: [] } })
    }

    // 统计共现频率
    const cooccurrenceMap = new Map() // tag -> { cooccurrence, count }
    const tagCountMap = new Map()     // tag -> total recipe count

    recipes.forEach(r => {
      let tags = r.categoryTags
      let tagObj = {}
      if (typeof tags === 'string') {
        try { tagObj = JSON.parse(tags) } catch { tagObj = {} }
      } else if (typeof tags === 'object') {
        tagObj = tags
      }

      // 归一化后的 categoryTags 是对象结构：{ ingredient, method, cuisine, flavor, price }
      // 提取所有字符串值为标签
      const tagValues = new Set()
      Object.values(tagObj).forEach(val => {
        if (val && typeof val === 'string') {
          // 多值格式用 / 分隔，也加入
          val.split('/').forEach(v => {
            const trimmed = v.trim()
            if (trimmed && trimmed !== tagText) {
              tagValues.add(trimmed)
            }
          })
        }
      })

      // 检查当前食谱是否包含目标 tag
      // 在对象所有值和 tagText 之间做子串匹配
      const allValues = Object.values(tagObj).filter(v => typeof v === 'string').join('/')
      const hasTarget = allValues.includes(tagText)
      if (hasTarget) {
        tagValues.forEach(v => {
          const entry = cooccurrenceMap.get(v) || { cooccurrence: 0, count: 0 }
          entry.cooccurrence += 1
          cooccurrenceMap.set(v, entry)
        })
      }

      // 同时累计每个 tag 的总出现次数（count）
      tagValues.forEach(v => {
        const entry = cooccurrenceMap.get(v) || { cooccurrence: 0, count: 0 }
        entry.count += 1
        cooccurrenceMap.set(v, entry)
      })
    })

    // 同时从 TagSuggestion 表中补充 count（热点数据）
    const allRelatedTags = Array.from(cooccurrenceMap.keys())
    if (allRelatedTags.length > 0) {
      const suggestions = await TagSuggestion.findAll({
        where: { tag: { [Op.in]: allRelatedTags } },
        attributes: ['tag', 'count'],
        raw: true,
      })
      suggestions.forEach(s => {
        if (cooccurrenceMap.has(s.tag)) {
          const entry = cooccurrenceMap.get(s.tag)
          // 优先使用 TagSuggestion 中的 count（更权威），否则用计算结果
          entry.count = parseInt(s.count, 10) || entry.count
        }
      })
    }

    // 排序并返回
    const related = Array.from(cooccurrenceMap.entries())
      .map(([tag, data]) => ({
        tag,
        count: parseInt(data.count, 10) || 0,
        cooccurrence: parseInt(data.cooccurrence, 10) || 0,
      }))
      .sort((a, b) => b.cooccurrence - a.cooccurrence || b.count - a.count)
      .slice(0, limitNum)

    res.json({ code: 0, data: { tag: tagText, related } })
  } catch (err) {
    console.error('[GET /tags/related] error:', err.message)
    res.status(500).json({ code: 500, message: '获取关联标签失败' })
  }
})

module.exports = router