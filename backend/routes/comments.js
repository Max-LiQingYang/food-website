'use strict'

/**
 * routes/comments.js
 * 评论相关路由
 *
 * GET  /recipes/:recipeId/comments       — 获取食谱评论列表（公开）
 * POST /recipes/:recipeId/comments       — 发表评论（需认证）
 * GET  /recipes/:recipeId/comments/stats  — 获取评分统计（公开）
 * DEL  /comments/:id                     — 删除自己的评论（需认证）
 */

const express = require('express')
const { Comment, User } = require('../models')
const auth = require('../middleware/auth')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

/**
 * GET /recipes/:recipeId/comments
 * 获取食谱评论列表（分页，按时间倒序）
 */
router.get('/recipes/:recipeId/comments', async (req, res) => {
  try {
    const { recipeId } = req.params
    let page = parseInt(req.query.page, 10) || 1
    let pageSize = parseInt(req.query.pageSize, 10) || 20

    if (page < 1) page = 1
    if (pageSize > 50) pageSize = 50
    if (pageSize < 1) pageSize = 20

    const offset = (page - 1) * pageSize

    const { count, rows } = await Comment.findAndCountAll({
      where: { recipeId },
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'nickname']
        }
      ]
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
    console.error('[GET /recipes/:recipeId/comments] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

/**
 * GET /recipes/:recipeId/comments/stats
 * 获取评分统计：平均分、评分数量、各星级分布
 */
router.get('/recipes/:recipeId/comments/stats', async (req, res) => {
  try {
    const { recipeId } = req.params

    const comments = await Comment.findAll({
      where: { recipeId },
      attributes: ['rating']
    })

    const total = comments.length
    const ratedComments = comments.filter(c => c.rating != null)
    const ratedCount = ratedComments.length

    let averageRating = 0
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

    if (ratedCount > 0) {
      let sum = 0
      for (const c of ratedComments) {
        sum += c.rating
        distribution[c.rating] = (distribution[c.rating] || 0) + 1
      }
      averageRating = Math.round((sum / ratedCount) * 10) / 10
    }

    return res.status(200).json(
      resJSON(0, 'ok', {
        total,
        ratedCount,
        averageRating,
        distribution
      })
    )
  } catch (err) {
    console.error('[GET /recipes/:recipeId/comments/stats] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

/**
 * POST /recipes/:recipeId/comments
 * 发表评论（需认证）
 */
router.post('/recipes/:recipeId/comments', auth, async (req, res) => {
  try {
    const { recipeId } = req.params
    const { content, rating } = req.body

    if (!content || content.trim().length === 0) {
      return res.status(400).json(resJSON(400, '评论内容不能为空', null))
    }

    if (content.trim().length > 1000) {
      return res.status(400).json(resJSON(400, '评论内容不能超过 1000 字', null))
    }

    if (rating != null && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
      return res.status(400).json(resJSON(400, '评分必须是 1-5 的整数', null))
    }

    // 检查食谱是否存在
    const { Recipe } = require('../models')
    const recipe = await Recipe.findByPk(recipeId)
    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }

    // 获取用户显示名
    const user = await User.findByPk(req.userId)

    const comment = await Comment.create({
      content: content.trim(),
      rating: rating || null,
      userId: req.userId,
      recipeId
    })

    // 返回时带上用户信息
    const result = comment.toJSON()
    result.user = {
      id: user.id,
      username: user.username,
      nickname: user.nickname
    }

    return res.status(201).json(resJSON(0, 'ok', result))
  } catch (err) {
    console.error('[POST /recipes/:recipeId/comments] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

/**
 * DELETE /comments/:id
 * 删除自己的评论（需认证）
 */
router.delete('/comments/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const comment = await Comment.findByPk(id)

    if (!comment) {
      return res.status(404).json(resJSON(404, '评论不存在', null))
    }

    if (comment.userId !== req.userId) {
      return res.status(403).json(resJSON(403, '无权删除此评论', null))
    }

    await Comment.destroy({ where: { id } })

    return res.status(200).json(resJSON(0, 'ok', null))
  } catch (err) {
    console.error('[DELETE /comments/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router
