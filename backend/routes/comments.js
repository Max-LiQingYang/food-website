'use strict'

/**
 * routes/comments.js
 * 评论相关路由
 *
 * GET    /recipes/:recipeId/comments            — 获取食谱评论列表（分页，支持 sort=latest|hot）
 * GET    /recipes/:recipeId/comments/stats       — 获取评分统计
 * GET    /recipes/:recipeId/ratings/trends       — 获取评分趋势（按月/周）
 * POST   /recipes/:recipeId/comments             — 发表评论（需认证）
 * POST   /comments/:id/like                      — 点赞评论（需认证）
 * DELETE /comments/:id/like                      — 取消点赞（需认证）
 * POST   /comments/:id/reply                     — 回复评论（需认证）
 * DELETE /comments/:id                           — 删除自己的评论（需认证）
 */

const express = require('express')
const { Op, fn, col, literal } = require('sequelize')
const { Comment, User, CommentLike } = require('../models')
const auth = require('../middleware/auth')
const { createActivity } = require('../utils/activity')
const { createNotification } = require('../utils/notificationHelper')
const { checkAllAchievements } = require('../utils/achievementChecker')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

/**
 * GET /recipes/:recipeId/comments
 * 获取食谱评论列表（分页，支持排序），包含回复树
 */
router.get('/recipes/:recipeId/comments', async (req, res) => {
  try {
    const { recipeId } = req.params
    let page = parseInt(req.query.page, 10) || 1
    let pageSize = parseInt(req.query.pageSize, 10) || 20
    const sort = req.query.sort || 'latest'

    if (page < 1) page = 1
    if (pageSize > 50) pageSize = 50
    if (pageSize < 1) pageSize = 20

    const offset = (page - 1) * pageSize

    // 排序方式
    let order
    if (sort === 'hot') {
      order = [['likesCount', 'DESC'], ['createdAt', 'DESC']]
    } else {
      order = [['createdAt', 'DESC']]
    }

    // 只获取顶级评论（parentId IS NULL）
    const { count, rows } = await Comment.findAndCountAll({
      where: { recipeId, parentId: null },
      order,
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

    // 获取所有回复
    const commentIds = rows.map(r => r.id)
    let replies = []
    if (commentIds.length > 0) {
      replies = await Comment.findAll({
        where: { parentId: { [Op.in]: commentIds } },
        order: [['createdAt', 'ASC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'nickname']
          }
        ]
      })
    }

    // 如果用户已登录，检查哪些评论已点赞
    let likedSet = new Set()
    if (req.headers.authorization && commentIds.length > 0) {
      try {
        const jwt = require('jsonwebtoken')
        const token = req.headers.authorization.replace('Bearer ', '')
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'food-jwt-secret-key-2026')
        const allCommentIds = [...commentIds, ...replies.map(r => r.id)]
        const likes = await CommentLike.findAll({
          where: {
            commentId: { [Op.in]: allCommentIds },
            userId: decoded.userId
          },
          attributes: ['commentId']
        })
        likedSet = new Set(likes.map(l => l.commentId))
      } catch {
        // 静默失败
      }
    }

    // 将回复聚合到对应的顶级评论下
    const repliesByParent = {}
    for (const reply of replies) {
      const item = reply.toJSON()
      item.isLiked = likedSet.has(item.id)
      if (!repliesByParent[reply.parentId]) {
        repliesByParent[reply.parentId] = []
      }
      repliesByParent[reply.parentId].push(item)
    }

    const list = rows.map(r => {
      const item = r.toJSON()
      item.isLiked = likedSet.has(item.id)
      item.replies = repliesByParent[item.id] || []
      item.replyCount = item.replies.length
      return item
    })

    return res.status(200).json(
      resJSON(0, 'ok', {
        list,
        total: count,
        page,
        pageSize,
        sort
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
 * GET /recipes/:recipeId/ratings/trends
 * 获取评分趋势（按月聚合）
 */
router.get('/recipes/:recipeId/ratings/trends', async (req, res) => {
  try {
    const { recipeId } = req.params

    const comments = await Comment.findAll({
      where: { recipeId, rating: { [Op.ne]: null } },
      attributes: ['rating', 'createdAt']
    })

    // 按月聚合
    const monthlyMap = {}
    for (const c of comments) {
      const d = new Date(c.createdAt)
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      if (!monthlyMap[key]) {
        monthlyMap[key] = { sum: 0, count: 0 }
      }
      monthlyMap[key].sum += c.rating
      monthlyMap[key].count++
    }

    const monthly = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        avgRating: Math.round((data.sum / data.count) * 10) / 10,
        count: data.count
      }))

    return res.status(200).json(
      resJSON(0, 'ok', { monthly, total: comments.length })
    )
  } catch (err) {
    console.error('[GET /recipes/:recipeId/ratings/trends] Error:', err)
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

    const user = await User.findByPk(req.userId)

    const comment = await Comment.create({
      content: content.trim(),
      rating: rating || null,
      userId: req.userId,
      recipeId,
      likesCount: 0
    })

    setImmediate(() => {
      recipe.increment('commentCount', { by: 1 }).catch(err => {
        console.error('[commentCount increment error]', err)
      })
    })

    const result = comment.toJSON()
    result.isLiked = false
    result.user = {
      id: user.id,
      username: user.username,
      nickname: user.nickname
    }
    result.replies = []
    result.replyCount = 0

    setImmediate(() => {
      createActivity(req.userId, 'comment', recipeId, 'recipe', {
        content: content.trim().substring(0, 100)
      })
      if (recipe.userId && recipe.userId !== req.userId) {
        createNotification({
          userId: recipe.userId,
          type: 'comment',
          message: '有人评论了你的食谱「' + recipe.title + '」',
          link: '/recipe/' + recipeId
        }).catch(err => console.error('[comment notif err]', err))
      }
      checkAllAchievements(req.userId, ['first-comment']).catch(err => {
        console.error('[comment achievement err]', err)
      })
    })

    return res.status(201).json(resJSON(0, 'ok', result))
  } catch (err) {
    console.error('[POST /recipes/:recipeId/comments] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

/**
 * POST /comments/:id/like
 * 点赞评论（需认证）
 */
router.post('/comments/:id/like', auth, async (req, res) => {
  try {
    const { id } = req.params
    const comment = await Comment.findByPk(id)
    if (!comment) {
      return res.status(404).json(resJSON(404, '评论不存在', null))
    }

    const existing = await CommentLike.findOne({
      where: { commentId: id, userId: req.userId }
    })
    if (existing) {
      return res.status(200).json(resJSON(0, '已点赞', null))
    }

    await CommentLike.create({ commentId: id, userId: req.userId })
    await comment.increment('likesCount', { by: 1 })

    return res.status(200).json(resJSON(0, '点赞成功', null))
  } catch (err) {
    console.error('[POST /comments/:id/like] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

/**
 * DELETE /comments/:id/like
 * 取消点赞（需认证）
 */
router.delete('/comments/:id/like', auth, async (req, res) => {
  try {
    const { id } = req.params
    const existing = await CommentLike.findOne({
      where: { commentId: id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json(resJSON(404, '未点赞', null))
    }

    await existing.destroy()
    const comment = await Comment.findByPk(id)
    if (comment && comment.likesCount > 0) {
      await comment.decrement('likesCount', { by: 1 })
    }

    return res.status(200).json(resJSON(0, '取消点赞成功', null))
  } catch (err) {
    console.error('[DELETE /comments/:id/like] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

/**
 * POST /comments/:id/reply
 * 回复评论（需认证）
 */
router.post('/comments/:id/reply', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { content } = req.body

    if (!content || content.trim().length === 0) {
      return res.status(400).json(resJSON(400, '回复内容不能为空', null))
    }

    if (content.trim().length > 500) {
      return res.status(400).json(resJSON(400, '回复内容不能超过 500 字', null))
    }

    // 检查父评论是否存在
    const parentComment = await Comment.findByPk(id)
    if (!parentComment) {
      return res.status(404).json(resJSON(404, '评论不存在', null))
    }

    // 如果父评论本身是回复，则挂到顶级评论下
    const parentId = parentComment.parentId || parentComment.id
    const replyToComments = parentId

    const user = await User.findByPk(req.userId)
    const replyToUser = await User.findByPk(parentComment.userId)

    const reply = await Comment.create({
      content: content.trim(),
      userId: req.userId,
      recipeId: parentComment.recipeId,
      parentId: replyToComments,
      likesCount: 0
    })

    const result = reply.toJSON()
    result.isLiked = false
    result.user = {
      id: user.id,
      username: user.username,
      nickname: user.nickname
    }

    // 通知被回复者
    setImmediate(() => {
      if (parentComment.userId !== req.userId) {
        createNotification({
          userId: parentComment.userId,
          type: 'reply',
          message: (user.nickname || user.username) + ' 回复了你的评论',
          link: '/recipe/' + parentComment.recipeId
        }).catch(err => console.error('[reply notif err]', err))
      }
    })

    return res.status(201).json(resJSON(0, 'ok', result))
  } catch (err) {
    console.error('[POST /comments/:id/reply] Error:', err)
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

    // 同时删除所有子回复和点赞
    await Comment.destroy({ where: { [Op.or]: [{ id }, { parentId: id }] } })
    await CommentLike.destroy({ where: { commentId: id } })

    const { Recipe } = require('../models')
    const recipe = await Recipe.findByPk(comment.recipeId)
    if (recipe && recipe.commentCount > 0) {
      await recipe.decrement('commentCount', { by: 1 })
    }

    return res.status(200).json(resJSON(0, 'ok', null))
  } catch (err) {
    console.error('[DELETE /comments/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router