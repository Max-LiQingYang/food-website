'use strict'

/**
 * middleware/errorHandler.js
 * 全局错误处理
 *
 * - process.on('uncaughtException') 捕获并记录
 * - Express 四参数 (err, req, res, next) 中间件
 * - 生产环境不泄漏 stack，响应 500
 * - 开发环境返回详细错误
 */

const isProd = process.env.NODE_ENV === 'production'

/**
 * 捕获未处理的同步/异步异常
 * 记录后优雅退出（防止进程进入不可知状态）
 */
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err)
  // 生产环境：进程不应继续，建议退出
  if (isProd) {
    console.error('Process will exit due to uncaughtException in production.')
    process.exit(1)
  }
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[unhandledRejection] Unhandled Rejection at:', promise, 'reason:', reason)
  if (isProd) {
    process.exit(1)
  }
})

/**
 * Express 全局错误处理中间件
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function errorHandler(err, req, res, next) {
  // 防止重复发送响应
  if (res.headersSent) {
    return next(err)
  }

  const status = err.status || err.statusCode || 500

  if (isProd) {
    // 生产环境：敏感信息不泄漏
    console.error(`[${req.method}] ${req.originalUrl} ${status} — ${err.message}`)
    return res.status(status).json({
      code: status,
      message: '服务器内部错误',
      data: null
    })
  }

  // 开发环境：返回完整错误信息
  console.error(`[${req.method}] ${req.originalUrl} [ERROR]`, err)
  return res.status(status).json({
    code: status,
    message: err.message || '服务器内部错误',
    data: process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
  })
}

module.exports = errorHandler
