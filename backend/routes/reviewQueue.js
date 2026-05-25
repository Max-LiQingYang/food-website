'use strict'

/**
 * routes/reviewQueue.js
 * 内容审核路由
 *
 * GET  /admin/review-queue  — 审核队列（管理员）
 * POST /admin/review-batch  — 批量审核（管理员）
 * GET  /admin/review-history — 审核历史（管理员）
 */

const express = require('express')
const router = express.Router()
const adminAuth = require('../middleware/adminAuth')
const { Recipe, Comment, ReviewHistory, User, Sequelize } = require('../models')
const Op = Sequelize.Op

function resJSON(code, message, data) {
  return { code, message, data }
}

// GET /admin/review-queue — 审核队列
router.get('/admin/review-queue', adminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
    const type = req.query.type // recipe|comment
    const offset = (page - 1) * pageSize

    let recipes = []
    let comments = []
    let totalRecipes = 0
    let totalComments = 0

    // Get unreviewed recipes (qualityScore < threshold or flagged)
    const reviewThreshold = parseFloat(req.query.threshold) || 5.0
    if (!type || type === 'recipe') {
      const result = await Recipe.findAndCountAll({
        where: {
          [Op.or]: [
            { qualityScore: { [Op.lt]: reviewThreshold } },
            { qualityScore: null }
          ]
        },
        attributes: ['id', 'title', 'description', 'category', 'qualityScore', 'viewCount', 'favoriteCount', 'userId', 'createdAt'],
        order: [['qualityScore', 'ASC'], ['createdAt', 'DESC']],
        offset,
        limit: type === 'recipe' ? pageSize : 10
      })
      recipes = result.rows
      totalRecipes = result.count
    }

    // Get unreviewed comments (with images or flagged)
    if (!type || type === 'comment') {
      const result = await Comment.findAndCountAll({
        where: {
          imageUrls: { [Op.ne]: null },
          [Op.and]: Sequelize.literal("JSON_LENGTH(imageUrls) > 0 OR isFeatured = false")
        },
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'nickname'] }
        ],
        order: [['createdAt', 'DESC']],
        offset,
        limit: type === 'comment' ? pageSize : 10
      })
      comments = result.rows
      totalComments = result.count
    }

    return res.json(resJSON(0, 'ok', {
      recipes: {
        items: recipes,
        total: totalRecipes
      },
      comments: {
        items: comments,
        total: totalComments
      },
      page,
      pageSize
    }))
  } catch (err) {
    console.error('[GET /admin/review-queue] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// POST /admin/review-batch — 批量审核
router.post('/admin/review-batch', adminAuth, async (req, res) => {
  try {
    const reviewerId = req.userId
    const { items } = req.body // [{ type: 'recipe'|'comment', id, action, reason }]

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json(resJSON(400, '请提供审核项', null))
    }

    const results = []
    for (const item of items) {
      const { type, id, action, reason } = item
      if (!['approved', 'rejected', 'flagged'].includes(action)) {
        results.push({ id, type, status: 'skipped', reason: '无效操作' })
        continue
      }

      let previousScore = null
      if (type === 'recipe') {
        const recipe = await Recipe.findByPk(id)
        if (!recipe) {
          results.push({ id, type, status: 'skipped', reason: '食谱不存在' })
          continue
        }
        previousScore = recipe.qualityScore

        // Adjust quality score based on action
        let scoreAdjust = 0
        if (action === 'approved') scoreAdjust = 2.0
        else if (action === 'rejected') scoreAdjust = -3.0
        else if (action === 'flagged') scoreAdjust = -1.0

        const newScore = Math.max(0, Math.min(100, (recipe.qualityScore || 5) + scoreAdjust))
        await Recipe.update({ qualityScore: newScore }, { where: { id } })
        results.push({ id, type, status: action, previousScore, newScore })
      } else if (type === 'comment') {
        const comment = await Comment.findByPk(id)
        if (!comment) {
          results.push({ id, type, status: 'skipped', reason: '评论不存在' })
          continue
        }

        if (action === 'approved') {
          await Comment.update({ isFeatured: true }, { where: { id } })
        } else if (action === 'flagged') {
          await Comment.update({ isFeatured: false }, { where: { id } })
        }
        results.push({ id, type, status: action })
      }

      // Record review history
      await ReviewHistory.create({
        reviewableType: type,
        reviewableId: id,
        reviewerId,
        action,
        reason: reason || null,
        previousScore: previousScore !== null ? previousScore : null,
        newScore: results[results.length - 1]?.newScore || null
      })
    }

    return res.json(resJSON(0, '审核完成', { results }))
  } catch (err) {
    console.error('[POST /admin/review-batch] Error:', err)
    return res.status(500).json(resJSON(500, '批量审核失败', null))
  }
})

// GET /admin/review-history — 审核历史
router.get('/admin/review-history', adminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
    const offset = (page - 1) * pageSize

    const { count, rows } = await ReviewHistory.findAndCountAll({
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize,
      include: [
        { model: User, as: 'reviewer', attributes: ['id', 'username', 'nickname'] }
      ]
    })

    return res.json(resJSON(0, 'ok', { items: rows, total: count, page, pageSize }))
  } catch (err) {
    console.error('[GET /admin/review-history] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// POST /comments/:id/feature — 标记评论为精华（管理员）
router.post('/comments/:id/feature', adminAuth, async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.id)
    if (!comment) {
      return res.status(404).json(resJSON(404, '评论不存在', null))
    }

    await Comment.update(
      { isFeatured: req.body.featured !== false },
      { where: { id: req.params.id } }
    )

    return res.json(resJSON(0, '评论标记已更新', null))
  } catch (err) {
    console.error('[POST /comments/:id/feature] Error:', err)
    return res.status(500).json(resJSON(500, '操作失败', null))
  }
})

// GET /comments/:recipeId/hot — 热门评论排行榜
router.get('/comments/:recipeId/hot', async (req, res) => {
  try {
    const limit = Math.min(20, parseInt(req.query.limit, 10) || 10)

    const comments = await Comment.findAll({
      where: { recipeId: req.params.recipeId },
      order: [
        ['isFeatured', 'DESC'],
        ['likesCount', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit,
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'nickname', 'avatar'] }
      ]
    })

    return res.json(resJSON(0, 'ok', comments))
  } catch (err) {
    console.error('[GET /comments/:recipeId/hot] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router