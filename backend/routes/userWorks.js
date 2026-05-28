'use strict'

/**
 * routes/userWorks.js
 * 用户作品墙路由
 *
 * GET /api/users/:userId/works — 获取用户的带图评论（分页）
 *   - 仅返回 imageUrls 非空且有图片的评论
 *   - 包含关联的食谱标题和封面图
 */

const express = require('express')
const { Op, Sequelize } = require('sequelize')
const { Comment, Recipe, User } = require('../models')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

/**
 * GET /users/:userId/works
 * 用户作品列表（带图评论）
 */
router.get('/users/:userId/works', async (req, res) => {
  try {
    const { userId } = req.params
    let page = parseInt(req.query.page, 10) || 1
    let pageSize = parseInt(req.query.pageSize, 10) || 12

    if (page < 1) page = 1
    if (pageSize > 50) pageSize = 50
    if (pageSize < 1) pageSize = 12

    const offset = (page - 1) * pageSize

    // 只查询有图片的评论（imageUrls 非空且不是空数组）
    const { count, rows } = await Comment.findAndCountAll({
      where: {
        userId,
        imageUrls: { [Op.ne]: null },
        [Op.and]: [
          Sequelize.where(Sequelize.col('imageUrls'), '!=', '[]')
        ]
      },
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize,
      include: [
        {
          model: Recipe,
          as: 'recipe',
          attributes: ['id', 'title', 'coverImage']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    })

    const list = rows
      .filter(c => {
        try {
          const urls = typeof c.imageUrls === 'string' ? JSON.parse(c.imageUrls) : (c.imageUrls || [])
          return Array.isArray(urls) && urls.length > 0
        } catch {
          return false
        }
      })
      .map(c => ({
        id: c.id,
        content: c.content?.substring(0, 100) || '',
        imageUrls: (() => {
          try {
            const urls = typeof c.imageUrls === 'string' ? JSON.parse(c.imageUrls) : (c.imageUrls || [])
            return Array.isArray(urls) ? urls : []
          } catch {
            return []
          }
        })(),
        recipe: c.recipe ? {
          id: c.recipe.id,
          title: c.recipe.title,
          coverImage: c.recipe.coverImage
        } : null,
        rating: c.rating,
        createdAt: c.createdAt
      }))

    res.json(resJSON(0, 'ok', { list, total: count, page, pageSize }))
  } catch (err) {
    console.error('Error fetching user works:', err)
    res.status(500).json(resJSON(500, '获取失败', null))
  }
})

module.exports = router
