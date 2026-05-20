'use strict'

/**
 * middleware/auth.js
 * JWT 认证中间件
 *
 * 从 Authorization: Bearer <token> 提取 JWT
 * 验证通过：req.userId = decoded.userId
 * 验证失败/无 token：返回 401
 */

// PUBLIC_PATHS — 公开路由（无需认证），可被外部引用
const PUBLIC_PATHS = [
  { method: 'GET', path: '/health' },
  { method: 'GET', path: '/api/favorites/:recipeId/status' } // 收藏状态查询暂需登录
]

/**
 * 认证中间件
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function auth(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 401,
      message: '未授权，请先登录',
      data: null
    })
  }

  const token = authHeader.slice(7) // 去掉 "Bearer " 前缀

  try {
    // jsonwebtoken 延迟 require（package.json 已声明依赖）
     
    const jwt = require('jsonwebtoken')

    const secret = process.env.JWT_SECRET
    if (!secret) {
      // JWT_SECRET 未配置时，不抛错，返回 401
      console.error('[auth] JWT_SECRET is not configured in environment variables')
      return res.status(401).json({
        code: 401,
        message: '未授权，请先登录',
        data: null
      })
    }

    const decoded = jwt.verify(token, secret)

    if (!decoded.userId) {
      return res.status(401).json({
        code: 401,
        message: '未授权，请先登录',
        data: null
      })
    }

    // 注入 userId 到请求上下文
    req.userId = decoded.userId
    next()
  } catch (err) {
    // JWT 格式错误 / 过期 / 签名不匹配
    console.error('[auth] JWT verify failed:', err.message)
    return res.status(401).json({
      code: 401,
      message: '未授权，请先登录',
      data: null
    })
  }
}

module.exports = auth
module.exports.PUBLIC_PATHS = PUBLIC_PATHS
