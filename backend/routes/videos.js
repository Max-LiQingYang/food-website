'use strict'

/**
 * routes/videos.js
 * 食谱视频管理 — CRUD + 按食谱查询
 */

const express = require('express')
const router = express.Router()
const { VideoEmbed, Recipe } = require('../models')
const auth = require('../middleware/auth')

// 获取指定食谱的所有视频
router.get('/recipes/:recipeId/videos', async (req, res) => {
  try {
    const { recipeId } = req.params
    const videos = await VideoEmbed.findAll({
      where: { recipeId },
      order: [['sortOrder', 'ASC']],
    })
    if (!videos.length) {
      // Debug: 检查 recipeId 是否在 video_embeds 表中有记录
      const count = await VideoEmbed.count({ where: { recipeId } })
      if (count > 0) {
        console.warn(`[videos] findAll returned 0 but count=${count} for recipeId=${recipeId} — possible findAll vs count mismatch`)
      }
    }
    res.json({ code: 0, data: { list: videos, total: videos.length } })
  } catch (err) {
    console.error('[GET /videos] error:', err.message)
    res.status(500).json({ code: 500, message: '获取视频列表失败' })
  }
})

// 添加视频到食谱（需认证）
router.post('/recipes/:recipeId/videos', auth, async (req, res) => {
  try {
    const { recipeId } = req.params
    const { videoUrl, platform, coverImage, title, duration, sortOrder } = req.body

    // 检查食谱是否存在
    const recipe = await Recipe.findByPk(recipeId)
    if (!recipe) {
      return res.status(404).json({ code: 404, message: '食谱不存在' })
    }

    const maxOrder = await VideoEmbed.max('sortOrder', { where: { recipeId } })
    const video = await VideoEmbed.create({
      recipeId,
      videoUrl,
      platform: platform || 'generic',
      coverImage,
      title,
      duration,
      sortOrder: sortOrder ?? (maxOrder !== null ? maxOrder + 1 : 0),
    })

    res.status(201).json({ code: 0, data: video, message: '视频添加成功' })
  } catch (err) {
    console.error('[POST /videos] error:', err.message)
    res.status(500).json({ code: 500, message: '添加视频失败' })
  }
})

// 更新视频信息
router.put('/videos/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { videoUrl, platform, coverImage, title, duration, sortOrder } = req.body
    const video = await VideoEmbed.findByPk(id)
    if (!video) {
      return res.status(404).json({ code: 404, message: '视频不存在' })
    }
    await video.update({ videoUrl, platform, coverImage, title, duration, sortOrder })
    res.json({ code: 0, data: video, message: '视频更新成功' })
  } catch (err) {
    console.error('[PUT /videos] error:', err.message)
    res.status(500).json({ code: 500, message: '更新视频失败' })
  }
})

// 删除视频
router.delete('/videos/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const video = await VideoEmbed.findByPk(id)
    if (!video) {
      return res.status(404).json({ code: 404, message: '视频不存在' })
    }
    await video.destroy()
    res.json({ code: 0, message: '视频删除成功' })
  } catch (err) {
    console.error('[DELETE /videos] error:', err.message)
    res.status(500).json({ code: 500, message: '删除视频失败' })
  }
})

module.exports = router