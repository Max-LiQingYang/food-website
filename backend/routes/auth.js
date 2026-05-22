'use strict'

/**
 * routes/auth.js
 * 认证相关路由
 *
 * POST /register — 注册
 * POST /login   — 登录
 * GET  /me      — 获取当前用户信息（需认证）
 */

const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { User } = require('../models')
const auth = require('../middleware/auth')

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'food-website-dev-secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

/**
 * 通用响应封装
 * @param {number} code
 * @param {string} message
 * @param {any} data
 */
function resJSON(code, message, data) {
  return { code, message, data }
}

// ─────────────────────────────────────────────────────────────────
// POST /register — 用户注册
// ─────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, nickname } = req.body

    if (!username || !password) {
      return res.status(400).json(resJSON(400, '用户名和密码不能为空', null))
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username } })
    if (existingUser) {
      return res.status(409).json(resJSON(4001, '用户名已存在', null))
    }

    // 如果提供了邮箱，检查邮箱是否已存在
    if (email) {
      const existingEmail = await User.findOne({ where: { email } })
      if (existingEmail) {
        return res.status(409).json(resJSON(4003, '邮箱已被注册', null))
      }
    }

    // bcrypt 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建用户
    const user = await User.create({
      username,
      password: hashedPassword,
      email: email || null,
      nickname: nickname || null,
    })

    // 生成 JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    return res.status(201).json(
      resJSON(0, 'ok', {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
          role: user.role,
          createdAt: user.createdAt,
        },
      })
    )
  } catch (err) {
    console.error('[POST /register] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// POST /login — 用户登录
// ─────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password, email } = req.body

    // 兼容两个字段名：前端可能传 email 也可能传 username
    const identifier = email || username

    if (!identifier || !password) {
      return res.status(400).json(resJSON(400, '用户名和密码不能为空', null))
    }

    // 查找用户：支持用邮箱或用户名登录
    const where = identifier.includes('@') ? { email: identifier } : { username: identifier }
    const user = await User.findOne({ where })
    if (!user) {
      return res.status(401).json(resJSON(4002, '用户名或密码错误', null))
    }

    // bcrypt 比对密码
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json(resJSON(4002, '用户名或密码错误', null))
    }

    // 生成 JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    return res.status(200).json(
      resJSON(0, 'ok', {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
          role: user.role,
          createdAt: user.createdAt,
        },
      })
    )
  } catch (err) {
    console.error('[POST /login] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /me — 获取当前用户信息（需认证）
// ─────────────────────────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'username', 'email', 'nickname', 'role', 'createdAt'],
    })

    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    return res.status(200).json(
      resJSON(0, 'ok', {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        createdAt: user.createdAt,
      })
    )
  } catch (err) {
    console.error('[GET /me] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router
