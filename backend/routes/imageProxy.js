const express = require('express')
const router = express.Router()
const https = require('https')
const http = require('http')

/**
 * GET /api/image-proxy?url=xxx
 * 代理外部图片，解决跨域/ORB 问题
 */
router.get('/image-proxy', (req, res) => {
  const imageUrl = req.query.url
  if (!imageUrl) {
    return res.status(400).json({ code: 400, message: 'Missing url parameter' })
  }

  // 只允许代理图片 URL
  if (!/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif|svg|ico)(\?.*)?$/i.test(imageUrl) &&
      !imageUrl.includes('images.unsplash.com')) {
    return res.status(400).json({ code: 400, message: 'Invalid image URL' })
  }

  const client = imageUrl.startsWith('https') ? https : http

  client.get(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (proxyRes) => {
    // 转发 Content-Type
    const contentType = proxyRes.headers['content-type']
    if (contentType && contentType.startsWith('image/')) {
      res.set('Content-Type', contentType)
    } else {
      res.set('Content-Type', 'image/jpeg')
    }

    // 强缓存 7 天
    res.set('Cache-Control', 'public, max-age=604800, immutable')
    res.set('Access-Control-Allow-Origin', '*')

    proxyRes.pipe(res)
  }).on('error', (err) => {
    console.error('Image proxy error:', err.message)
    res.status(502).json({ code: 502, message: 'Failed to fetch image' })
  })
})

module.exports = router
