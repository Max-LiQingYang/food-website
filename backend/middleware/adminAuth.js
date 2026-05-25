'use strict'

/**
 * middleware/adminAuth.js
 * 管理员认证中间件
 *
 * 继承 auth 中间件 + 验证 role === 'admin'
 * 从 Authorization: Bearer <token> 提取 JWT，验证是否管理员
 */

const jwt = require('jsonwebtoken')
const secret = process.env.JWT_SECRET || 'food-website-jwt-secret-key-2026'

/**
 * 管理员认证中间件
 */
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 401,
      message: '未授权，请先登录',
      data: null
    })
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.verify(token, secret)

    if (!decoded.userId) {
      return res.status(401).json({
        code: 401,
        message: '未授权，请先登录',
        data: null
      })
    }

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '权限不足，需要管理员权限',
        data: null
      })
    }

    req.userId = decoded.userId
    next()
  } catch (err) {
    console.error('[adminAuth] JWT verify failed:', err.message)
    return res.status(401).json({
      code: 401,
      message: '未授权，请先登录',
      data: null
    })
  }
}

module.exports = adminAuth