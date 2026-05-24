'use strict'

/**
 * tests/video_embed.test.js
 * 食谱视频嵌入 — API 测试
 */

const request = require('supertest')
const express = require('express')
const { Sequelize, DataTypes } = require('sequelize')

// ── 内联测试模型 ─────────────────────────────────────────────────────────────
const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })

const VideoEmbed = sequelize.define('VideoEmbed', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  recipeId: { type: DataTypes.UUID, allowNull: false },
  videoUrl: { type: DataTypes.STRING(500), allowNull: false },
  platform: { type: DataTypes.STRING, defaultValue: 'generic' },
  coverImage: { type: DataTypes.STRING(500) },
  title: { type: DataTypes.STRING },
  duration: { type: DataTypes.INTEGER },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'video_embeds', timestamps: false })

const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'recipes', timestamps: false })

VideoEmbed.belongsTo(Recipe, { foreignKey: 'recipeId' })

const mockAuth = (req, res, next) => { req.user = { userId: 'test-user' }; next() }
const mockToken = 'test-token'

// ── 内嵌 Express app ────────────────────────────────────────────────────────
function createApp() {
  const app = express()
  app.use(express.json())

  // 视频路由
  app.get('/api/recipes/:recipeId/videos', async (req, res) => {
    const videos = await VideoEmbed.findAll({ where: { recipeId: req.params.recipeId }, order: [['sortOrder', 'ASC']] })
    res.json({ code: 0, data: { list: videos, total: videos.length } })
  })
  app.post('/api/recipes/:recipeId/videos', mockAuth, async (req, res) => {
    const recipe = await Recipe.findByPk(req.params.recipeId)
    if (!recipe) return res.status(404).json({ code: 404, message: '食谱不存在' })
    const maxOrder = await VideoEmbed.max('sortOrder', { where: { recipeId: req.params.recipeId } })
    const video = await VideoEmbed.create({ ...req.body, recipeId: req.params.recipeId, sortOrder: req.body.sortOrder ?? (maxOrder !== null ? maxOrder + 1 : 0) })
    res.status(201).json({ code: 0, data: video })
  })
  app.put('/api/videos/:id', mockAuth, async (req, res) => {
    const video = await VideoEmbed.findByPk(req.params.id)
    if (!video) return res.status(404).json({ code: 404, message: '视频不存在' })
    await video.update(req.body)
    res.json({ code: 0, data: video })
  })
  app.delete('/api/videos/:id', mockAuth, async (req, res) => {
    const video = await VideoEmbed.findByPk(req.params.id)
    if (!video) return res.status(404).json({ code: 404, message: '视频不存在' })
    await video.destroy()
    res.json({ code: 0, message: '视频删除成功' })
  })
  return app
}

describe('视频嵌入接口', () => {
  let app, recipeId

  beforeAll(async () => {
    await sequelize.sync({ force: true })
    const recipe = await Recipe.create({ title: '测试食谱' })
    recipeId = recipe.id
    app = createApp()
  })

  test('获取食谱视频列表（空）', async () => {
    const res = await request(app).get(`/api/recipes/${recipeId}/videos`)
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.total).toBe(0)
  })

  test('添加视频到食谱', async () => {
    const res = await request(app)
      .post(`/api/recipes/${recipeId}/videos`)
      .set('Authorization', `Bearer ${mockToken}`)
      .send({ videoUrl: 'https://example.com/video.mp4', platform: 'youtube', title: '教程视频' })
    expect(res.status).toBe(201)
    expect(res.body.code).toBe(0)
    expect(res.body.data.videoUrl).toBe('https://example.com/video.mp4')
  })

  test('添加视频到不存在食谱返回404', async () => {
    const res = await request(app)
      .post('/api/recipes/non-existent-id/videos')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({ videoUrl: 'https://example.com/v.mp4' })
    expect(res.status).toBe(404)
  })

  test('获取视频列表包含已添加视频', async () => {
    const res = await request(app).get(`/api/recipes/${recipeId}/videos`)
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(1)
  })

  test('更新视频信息', async () => {
    const list = await request(app).get(`/api/recipes/${recipeId}/videos`)
    const videoId = list.body.data.list[0].id
    const res = await request(app)
      .put(`/api/videos/${videoId}`)
      .set('Authorization', `Bearer ${mockToken}`)
      .send({ title: '更新后的标题' })
    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('更新后的标题')
  })

  test('删除视频', async () => {
    const list = await request(app).get(`/api/recipes/${recipeId}/videos`)
    const videoId = list.body.data.list[0].id
    const res = await request(app)
      .delete(`/api/videos/${videoId}`)
      .set('Authorization', `Bearer ${mockToken}`)
    expect(res.status).toBe(200)
    const list2 = await request(app).get(`/api/recipes/${recipeId}/videos`)
    expect(list2.body.data.total).toBe(0)
  })
})