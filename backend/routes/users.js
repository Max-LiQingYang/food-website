'use strict'

/**
 * routes/users.js
 * 用户相关路由（公开）
 *
 * GET /:id/profile  — 用户信息
 * GET /:id/recipes  — 用户发布的食谱
 */

const express = require('express')
const { User, Recipe } = require('../models')

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
      attributes: ['id', 'username', 'nickname', 'createdAt']
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

module.exports = router