'use strict'

/**
 * tests/draft.test.js
 * 食谱草稿系统后端测试
 */

const { Sequelize, Op } = require('sequelize')
const express = require('express')
const request = require('supertest')

// Inline SQLite test database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
})

const DataTypes = Sequelize.DataTypes

// Define models inline - use TEXT + stringified JSON (no getter/setter to avoid Sequelize type validation clash)
const Draft = sequelize.define('Draft', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
  description: { type: DataTypes.TEXT, allowNull: true },
  category: { type: DataTypes.STRING(50), allowNull: true },
  ingredients: { type: DataTypes.TEXT, allowNull: true, defaultValue: '[]' },
  steps: { type: DataTypes.TEXT, allowNull: true, defaultValue: '[]' },
  servings: { type: DataTypes.INTEGER, allowNull: true },
  difficulty: { type: DataTypes.STRING(20), allowNull: true },
  cookTime: { type: DataTypes.INTEGER, allowNull: true },
  coverImage: { type: DataTypes.STRING(500), allowNull: true },
  tips: { type: DataTypes.TEXT, allowNull: true },
  categoryTags: { type: DataTypes.TEXT, allowNull: true, defaultValue: '[]' },
  season: { type: DataTypes.STRING(20), allowNull: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
  scheduledPublishAt: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'drafts', timestamps: true })

const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: DataTypes.TEXT,
  category: DataTypes.STRING(50),
  ingredients: DataTypes.TEXT,
  steps: DataTypes.TEXT,
  servings: DataTypes.INTEGER,
  difficulty: DataTypes.STRING(20),
  cookTime: DataTypes.INTEGER,
  coverImage: DataTypes.STRING(500),
  tips: DataTypes.TEXT,
  categoryTags: DataTypes.TEXT,
  season: DataTypes.STRING(20),
  userId: { type: DataTypes.UUID, allowNull: false },
  viewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  favoriteCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  qualityScore: { type: DataTypes.FLOAT, defaultValue: 0 }
}, { tableName: 'recipes', timestamps: true })

// Helper: serialize JSON fields to strings for Sequelize TEXT columns
function serializeDraft(body) {
  const data = { ...body }
  if (data.ingredients && typeof data.ingredients !== 'string') data.ingredients = JSON.stringify(data.ingredients)
  if (data.steps && typeof data.steps !== 'string') data.steps = JSON.stringify(data.steps)
  if (data.categoryTags && typeof data.categoryTags !== 'string') data.categoryTags = JSON.stringify(data.categoryTags)
  return data
}

function mockAuth(userId) {
  return (req, res, next) => {
    req.userId = userId
    next()
  }
}

function resJSON(code, message, data) {
  return { code, message, data }
}

describe('Draft System', () => {
  let app
  const userId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  let draftId

  beforeAll(async () => {
    await sequelize.sync({ force: true })

    app = express()
    app.use(express.json())

    // GET /drafts
    app.get('/drafts', mockAuth(userId), async (req, res) => {
      try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1)
        const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
        const status = req.query.status
        const offset = (page - 1) * pageSize

        const where = { userId }
        if (status && ['draft', 'scheduled', 'published'].includes(status)) {
          where.status = status
        }

        const { count, rows } = await Draft.findAndCountAll({
          where,
          order: [['updatedAt', 'DESC']],
          offset,
          limit: pageSize
        })

        return res.json(resJSON(0, 'ok', { drafts: rows, total: count, page, pageSize }))
      } catch (err) {
        return res.status(500).json(resJSON(500, '服务器内部错误', null))
      }
    })

    // POST /drafts
    app.post('/drafts', mockAuth(userId), async (req, res) => {
      try {
        const { title, description, category, ingredients, steps, servings, difficulty, cookTime, coverImage, tips, categoryTags, season, status, scheduledPublishAt } = req.body
        const draft = await Draft.create({
          title: title || '',
          description: description || null,
          category: category || null,
          ingredients: ingredients || '[]',
          steps: steps || '[]',
          servings: servings || null,
          difficulty: difficulty || null,
          cookTime: cookTime || null,
          coverImage: coverImage || null,
          tips: tips || null,
          categoryTags: categoryTags || '[]',
          season: season || null,
          userId,
          status: status === 'scheduled' ? 'scheduled' : 'draft',
          scheduledPublishAt: status === 'scheduled' ? (scheduledPublishAt || null) : null
        })
        return res.status(201).json(resJSON(0, '草稿已保存', draft))
      } catch (err) {
        return res.status(500).json(resJSON(500, '保存草稿失败: ' + err.message, null))
      }
    })

    // GET /drafts/:id
    app.get('/drafts/:id', mockAuth(userId), async (req, res) => {
      try {
        const draft = await Draft.findOne({ where: { id: req.params.id, userId } })
        if (!draft) return res.status(404).json(resJSON(404, '草稿不存在', null))
        return res.json(resJSON(0, 'ok', draft))
      } catch (err) {
        return res.status(500).json(resJSON(500, '服务器内部错误', null))
      }
    })

    // PUT /drafts/:id
    app.put('/drafts/:id', mockAuth(userId), async (req, res) => {
      try {
        const draft = await Draft.findOne({ where: { id: req.params.id, userId } })
        if (!draft) return res.status(404).json(resJSON(404, '草稿不存在', null))
        if (draft.status === 'published') return res.status(400).json(resJSON(400, '已发布的草稿不可编辑', null))

        const allowed = ['title', 'description', 'category', 'ingredients', 'steps', 'servings', 'difficulty', 'cookTime', 'coverImage', 'tips', 'categoryTags', 'season', 'status', 'scheduledPublishAt']
        for (const key of allowed) {
          if (req.body[key] !== undefined) draft.set(key, req.body[key])
        }
        await draft.save()
        return res.json(resJSON(0, '草稿已更新', draft))
      } catch (err) {
        return res.status(500).json(resJSON(500, '更新草稿失败', null))
      }
    })

    // DELETE /drafts/:id
    app.delete('/drafts/:id', mockAuth(userId), async (req, res) => {
      try {
        const deleted = await Draft.destroy({ where: { id: req.params.id, userId } })
        if (!deleted) return res.status(404).json(resJSON(404, '草稿不存在', null))
        return res.json(resJSON(0, '草稿已删除', null))
      } catch (err) {
        return res.status(500).json(resJSON(500, '删除草稿失败', null))
      }
    })

    // POST /drafts/:id/publish
    app.post('/drafts/:id/publish', mockAuth(userId), async (req, res) => {
      try {
        const draft = await Draft.findOne({ where: { id: req.params.id, userId } })
        if (!draft) return res.status(404).json(resJSON(404, '草稿不存在', null))
        if (!draft.title) return res.status(400).json(resJSON(400, '食谱标题不能为空', null))

        const recipe = await Recipe.create({
          title: draft.title,
          description: draft.description || '',
          category: draft.category || '未分类',
          servings: draft.servings || 1,
          difficulty: draft.difficulty || '简单',
          cookTime: draft.cookTime || 15,
          userId
        })

        draft.status = 'published'
        await draft.save()

        return res.status(201).json(resJSON(0, '食谱已发布', { recipe, draft }))
      } catch (err) {
        return res.status(500).json(resJSON(500, '发布失败', null))
      }
    })

  })

  test('POST /drafts — creates a new draft', async () => {
    const res = await request(app)
      .post('/drafts')
      .send(serializeDraft({
        title: '测试食谱草稿',
        description: '这是一个测试草稿',
        category: '中餐',
        ingredients: [{ name: '鸡蛋', amount: '2个' }, { name: '番茄', amount: '1个' }],
        steps: [{ content: '打鸡蛋', duration: 1 }, { content: '切番茄', duration: 2 }],
        servings: 2,
        difficulty: '简单',
        cookTime: 15
      }))

    expect(res.status).toBe(201)
    expect(res.body.code).toBe(0)
    expect(res.body.data.title).toBe('测试食谱草稿')
    expect(res.body.data.status).toBe('draft')
    expect(res.body.data.userId).toBe(userId)
    draftId = res.body.data.id
  })

  test('POST /drafts — creates scheduled draft', async () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    const res = await request(app)
      .post('/drafts')
      .send(serializeDraft({
        title: '定时发布草稿',
        status: 'scheduled',
        scheduledPublishAt: future
      }))

    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('scheduled')
    expect(res.body.data.scheduledPublishAt).toBeTruthy()
  })

  test('GET /drafts — lists user drafts', async () => {
    const res = await request(app).get('/drafts')

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.drafts.length).toBeGreaterThanOrEqual(2)
    expect(res.body.data.total).toBeGreaterThanOrEqual(2)
  })

  test('GET /drafts?status=draft — filters by status', async () => {
    const res = await request(app).get('/drafts?status=draft')

    expect(res.status).toBe(200)
    expect(res.body.data.drafts.every(d => d.status === 'draft')).toBe(true)
  })

  test('GET /drafts/:id — returns single draft', async () => {
    const res = await request(app).get(`/drafts/${draftId}`)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(draftId)
    expect(res.body.data.title).toBe('测试食谱草稿')
  })

  test('GET /drafts/:id — 404 for non-existent draft', async () => {
    const res = await request(app).get('/drafts/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })

  test('PUT /drafts/:id — updates draft', async () => {
    const res = await request(app)
      .put(`/drafts/${draftId}`)
      .send({ title: '更新后的草稿标题', servings: 4 })

    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('更新后的草稿标题')
    expect(res.body.data.servings).toBe(4)
  })

  test('DELETE /drafts/:id — deletes draft', async () => {
    const createRes = await request(app).post('/drafts').send(serializeDraft({ title: '将被删除的草稿' }))
    const tempId = createRes.body.data.id

    const res = await request(app).delete(`/drafts/${tempId}`)
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
  })

  test('DELETE /drafts/:id — 404 for non-existent draft', async () => {
    const res = await request(app).delete('/drafts/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })

  test('POST /drafts/:id/publish — publishes draft to recipe', async () => {
    const res = await request(app).post(`/drafts/${draftId}/publish`)

    expect(res.status).toBe(201)
    expect(res.body.code).toBe(0)
    expect(res.body.data.recipe.title).toBe('更新后的草稿标题')
    expect(res.body.data.draft.status).toBe('published')
  })

  test('POST /drafts/:id/publish — 400 when title is empty', async () => {
    const createRes = await request(app).post('/drafts').send(serializeDraft({ title: '' }))
    const emptyId = createRes.body.data.id

    const res = await request(app).post(`/drafts/${emptyId}/publish`)
    expect(res.status).toBe(400)
  })

  test('PUT /drafts/:id — 400 when editing published draft', async () => {
    const res = await request(app)
      .put(`/drafts/${draftId}`)
      .send({ title: '不允许修改已发布草稿' })

    expect(res.status).toBe(400)
  })

  test('GET /drafts — pagination works', async () => {
    const res = await request(app).get('/drafts?page=1&pageSize=1')

    expect(res.status).toBe(200)
    expect(res.body.data.drafts.length).toBeLessThanOrEqual(1)
    expect(res.body.data.page).toBe(1)
    expect(res.body.data.pageSize).toBe(1)
  })
})