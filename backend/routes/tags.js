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

module.exports = router