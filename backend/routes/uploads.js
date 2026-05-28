'use strict'

/**
 * routes/uploads.js
 * 文件上传路由
 *
 * POST /api/upload/comment-images — 上传评论图片（需认证）
 *   - multipart/form-data，字段名 images，最多3个文件
 *   - 支持格式：jpg, png, webp
 *   - 单张 ≤5MB
 *   - 返回上传后的 URL 列表
 */

const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const auth = require('../middleware/auth')

const router = express.Router()

// 确保上传目录存在
const uploadDir = path.join(__dirname, '..', 'uploads', 'comments')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 文件存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
    cb(null, uniqueName)
  }
})

// 文件类型过滤
const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp']
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowed.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error('仅支持 jpg/png/webp 格式'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
})

/**
 * POST /upload/comment-images
 * 上传评论图片
 */
router.post('/upload/comment-images', auth, (req, res) => {
  upload.array('images', 3)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            code: 400,
            message: '单张图片不能超过5MB',
            data: null
          })
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            code: 400,
            message: '最多上传3张图片',
            data: null
          })
        }
        return res.status(400).json({ code: 400, message: err.message, data: null })
      }
      return res.status(400).json({ code: 400, message: err.message, data: null })
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请选择图片',
        data: null
      })
    }

    const urls = req.files.map(f => `/uploads/comments/${f.filename}`)
    res.json({
      code: 0,
      message: 'ok',
      data: { urls }
    })
  })
})

module.exports = router
