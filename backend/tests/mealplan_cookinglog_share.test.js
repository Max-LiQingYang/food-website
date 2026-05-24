const request = require('supertest')
const express = require('express')
const { Sequelize, DataTypes } = require('sequelize')

// In-memory SQLite for testing
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
})

// Define test models
const MealPlan = sequelize.define('MealPlan', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.STRING, allowNull: false },
  weekStart: { type: DataTypes.STRING, allowNull: false },
  meals: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
}, { tableName: 'meal_plans', timestamps: true })

const CookingLog = sequelize.define('CookingLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.STRING, allowNull: false },
  recipeId: { type: DataTypes.STRING, allowNull: false },
  recipeTitle: { type: DataTypes.STRING, allowNull: false },
  recipeCategory: { type: DataTypes.STRING, allowNull: true },
  cookedAt: { type: DataTypes.DATEONLY, allowNull: false },
  rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  notes: { type: DataTypes.TEXT, allowNull: true },
  duration: { type: DataTypes.INTEGER, allowNull: true },
  photoUrl: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'cooking_logs', timestamps: true })

// Share info model
const ShareInfo = sequelize.define('ShareInfo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  recipeId: { type: DataTypes.STRING, allowNull: false },
  userId: { type: DataTypes.STRING, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  shareUrl: { type: DataTypes.STRING, allowNull: true },
  shareCount: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'share_infos', timestamps: true })

describe('MealPlan API', () => {
  let app
  const userId = 'test-user-id'
  const testMeals = [
    { day: 0, mealType: 'breakfast', recipeId: 'r1', recipeTitle: '小米粥' },
    { day: 0, mealType: 'lunch', recipeId: 'r2', recipeTitle: '番茄炒蛋' },
  ]

  beforeAll(async () => {
    await sequelize.sync({ force: true })
    app = express()
    app.use(express.json())

    // Auth middleware mock
    app.use((req, res, next) => {
      req.user = { id: userId, username: 'testuser' }
      next()
    })

    // Routes
    const { Router } = require('express')
    const router = Router()

    // GET /meal-plans
    router.get('/', async (req, res) => {
      try {
        const { weekStart } = req.query
        const where = { userId: req.user.id }
        if (weekStart) where.weekStart = weekStart
        const plans = await MealPlan.findAll({ where })
        res.json({ code: 200, data: plans })
      } catch (err) {
        res.status(500).json({ code: 500, message: 'Internal error' })
      }
    })

    // POST /meal-plans
    router.post('/', async (req, res) => {
      try {
        const { weekStart, meals } = req.body
        const existing = await MealPlan.findOne({ where: { userId: req.user.id, weekStart } })
        if (existing) {
          existing.meals = meals
          await existing.save()
          return res.json({ code: 200, data: existing })
        }
        const plan = await MealPlan.create({ userId: req.user.id, weekStart, meals })
        res.status(201).json({ code: 200, data: plan })
      } catch (err) {
        res.status(500).json({ code: 500, message: err.message })
      }
    })

    // PUT /meal-plans/:id
    router.put('/:id', async (req, res) => {
      try {
        const plan = await MealPlan.findOne({ where: { id: req.params.id, userId: req.user.id } })
        if (!plan) return res.status(404).json({ code: 404, message: 'Not found' })
        const { meals } = req.body
        plan.meals = meals
        await plan.save()
        res.json({ code: 200, data: plan })
      } catch (err) {
        res.status(500).json({ code: 500, message: err.message })
      }
    })

    // DELETE /meal-plans/:id
    router.delete('/:id', async (req, res) => {
      try {
        const plan = await MealPlan.findOne({ where: { id: req.params.id, userId: req.user.id } })
        if (!plan) return res.status(404).json({ code: 404, message: 'Not found' })
        await plan.destroy()
        res.json({ code: 200, message: 'Deleted' })
      } catch (err) {
        res.status(500).json({ code: 500, message: err.message })
      }
    })

    // POST /meal-plans/:id/generate-shopping-list
    router.post('/:id/generate-shopping-list', async (req, res) => {
      try {
        const plan = await MealPlan.findOne({ where: { id: req.params.id, userId: req.user.id } })
        if (!plan) return res.status(404).json({ code: 404, message: 'Not found' })
        res.json({ code: 200, data: { id: 'shopping-list-id', meals: plan.meals } })
      } catch (err) {
        res.status(500).json({ code: 500, message: err.message })
      }
    })

    // GET /share/:recipeId
    router.get('/share/:recipeId', async (req, res) => {
      try {
        const info = await ShareInfo.findOne({ where: { recipeId: req.params.recipeId } })
        if (info) {
          info.shareCount = (info.shareCount || 0) + 1
          await info.save()
        }
        res.json({
          code: 200,
          data: info || {
            title: '食谱',
            description: '分享这道美食',
            shareUrl: `https://example.com/recipe/${req.params.recipeId}`,
            shareText: `来看看这道美食`,
          }
        })
      } catch (err) {
        res.status(500).json({ code: 500, message: err.message })
      }
    })

    app.use('/api/meal-plans', router)
    app.use('/api/share', router)
  })

  beforeEach(async () => {
    await MealPlan.destroy({ where: {} })
    await ShareInfo.destroy({ where: {} })
  })

  describe('MealPlans CRUD', () => {
    it('GET /meal-plans returns empty list initially', async () => {
      const res = await request(app).get('/api/meal-plans')
      expect(res.status).toBe(200)
      expect(res.body.code).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('POST /meal-plans creates a new plan', async () => {
      const res = await request(app)
        .post('/api/meal-plans')
        .send({ weekStart: '2026-05-25', meals: testMeals })
      expect(res.status).toBe(201)
      expect(res.body.data.weekStart).toBe('2026-05-25')
      expect(res.body.data.meals).toHaveLength(2)
    })

    it('POST /meal-plans updates existing plan for same week', async () => {
      // Create first
      await request(app)
        .post('/api/meal-plans')
        .send({ weekStart: '2026-05-25', meals: testMeals })
      // Update same week
      const newMeals = [{ day: 1, mealType: 'dinner', recipeId: 'r3', recipeTitle: '新菜' }]
      const res = await request(app)
        .post('/api/meal-plans')
        .send({ weekStart: '2026-05-25', meals: newMeals })
      expect(res.status).toBe(200)
      expect(res.body.data.meals).toHaveLength(1)
      expect(res.body.data.meals[0].recipeTitle).toBe('新菜')
    })

    it('GET /meal-plans filtered by weekStart', async () => {
      await request(app)
        .post('/api/meal-plans')
        .send({ weekStart: '2026-05-25', meals: testMeals })
      await request(app)
        .post('/api/meal-plans')
        .send({ weekStart: '2026-06-01', meals: [{ day: 0, mealType: 'lunch', recipeId: 'r4', recipeTitle: '意面' }] })
      const res = await request(app).get('/api/meal-plans?weekStart=2026-05-25')
      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].weekStart).toBe('2026-05-25')
    })

    it('PUT /meal-plans/:id updates plan meals', async () => {
      const createRes = await request(app)
        .post('/api/meal-plans')
        .send({ weekStart: '2026-05-25', meals: testMeals })
      const planId = createRes.body.data.id
      const res = await request(app)
        .put(`/api/meal-plans/${planId}`)
        .send({ meals: [] })
      expect(res.status).toBe(200)
      expect(res.body.data.meals).toEqual([])
    })

    it('PUT /meal-plans/:id returns 404 for non-existent plan', async () => {
      const res = await request(app)
        .put('/api/meal-plans/non-existent-id')
        .send({ meals: [] })
      expect(res.status).toBe(404)
    })

    it('DELETE /meal-plans/:id deletes plan', async () => {
      const createRes = await request(app)
        .post('/api/meal-plans')
        .send({ weekStart: '2026-05-25', meals: testMeals })
      const planId = createRes.body.data.id
      const res = await request(app).delete(`/api/meal-plans/${planId}`)
      expect(res.status).toBe(200)
      const getRes = await request(app).get('/api/meal-plans')
      expect(getRes.body.data).toHaveLength(0)
    })

    it('DELETE /meal-plans/:id returns 404 for non-existent', async () => {
      const res = await request(app).delete('/api/meal-plans/non-existent')
      expect(res.status).toBe(404)
    })

    it('POST /meal-plans/:id/generate-shopping-list returns shopping list', async () => {
      const createRes = await request(app)
        .post('/api/meal-plans')
        .send({ weekStart: '2026-05-25', meals: testMeals })
      const planId = createRes.body.data.id
      const res = await request(app).post(`/api/meal-plans/${planId}/generate-shopping-list`)
      expect(res.status).toBe(200)
      expect(res.body.data.id).toBeDefined()
    })

    it('POST /meal-plans/:id/generate-shopping-list returns 404 for non-existent', async () => {
      const res = await request(app).post('/api/meal-plans/non-existent/generate-shopping-list')
      expect(res.status).toBe(404)
    })

    it('creates plans with different week starts', async () => {
      for (const week of ['2026-05-25', '2026-06-01', '2026-06-08']) {
        await request(app)
          .post('/api/meal-plans')
          .send({ weekStart: week, meals: testMeals })
      }
      const res = await request(app).get('/api/meal-plans')
      expect(res.body.data).toHaveLength(3)
    })
  })
})

describe('CookingLog API', () => {
  let app
  const userId = 'test-user-id'

  beforeAll(async () => {
    app = express()
    app.use(express.json())

    app.use((req, res, next) => {
      req.user = { id: userId, username: 'testuser' }
      next()
    })

    const { Router } = require('express')
    const router = Router()

    // GET /cooking-logs
    router.get('/', async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1
        const pageSize = parseInt(req.query.pageSize) || 20
        const offset = (page - 1) * pageSize
        const { count, rows } = await CookingLog.findAndCountAll({
          where: { userId: req.user.id },
          order: [['cookedAt', 'DESC']],
          offset, limit: pageSize,
        })
        res.json({ code: 200, data: { list: rows, total: count, page, pageSize } })
      } catch (err) {
        res.status(500).json({ code: 500, message: err.message })
      }
    })

    // POST /cooking-logs
    router.post('/', async (req, res) => {
      try {
        const { recipeId, recipeTitle, recipeCategory, cookedAt, rating, notes, duration } = req.body
        if (!recipeId || !cookedAt || !rating) {
          return res.status(400).json({ code: 400, message: 'Missing required fields' })
        }
        if (rating < 1 || rating > 5) {
          return res.status(400).json({ code: 400, message: 'Rating must be 1-5' })
        }
        const log = await CookingLog.create({
          userId: req.user.id, recipeId, recipeTitle, recipeCategory,
          cookedAt, rating, notes, duration,
        })
        res.status(201).json({ code: 200, data: log })
      } catch (err) {
        res.status(500).json({ code: 500, message: err.message })
      }
    })

    // PUT /cooking-logs/:id
    router.put('/:id', async (req, res) => {
      try {
        const log = await CookingLog.findOne({ where: { id: req.params.id, userId: req.user.id } })
        if (!log) return res.status(404).json({ code: 404, message: 'Not found' })
        const { rating, notes, duration } = req.body
        if (rating !== undefined) {
          if (rating < 1 || rating > 5) return res.status(400).json({ code: 400, message: 'Rating must be 1-5' })
          log.rating = rating
        }
        if (notes !== undefined) log.notes = notes
        if (duration !== undefined) log.duration = duration
        await log.save()
        res.json({ code: 200, data: log })
      } catch (err) {
        res.status(500).json({ code: 500, message: err.message })
      }
    })

    // DELETE /cooking-logs/:id
    router.delete('/:id', async (req, res) => {
      try {
        const log = await CookingLog.findOne({ where: { id: req.params.id, userId: req.user.id } })
        if (!log) return res.status(404).json({ code: 404, message: 'Not found' })
        await log.destroy()
        res.json({ code: 200, message: 'Deleted' })
      } catch (err) {
        res.status(500).json({ code: 500, message: err.message })
      }
    })

    // GET /cooking-logs/stats
    router.get('/stats', async (req, res) => {
      try {
        const logs = await CookingLog.findAll({ where: { userId: req.user.id } })
        const totalCooked = logs.length
        const now = new Date()
        const thisMonth = logs.filter(l => {
          const d = new Date(l.cookedAt)
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        }).length
        const avgRating = logs.length > 0
          ? (logs.reduce((s, l) => s + l.rating, 0) / logs.length)
          : 0
        // Category distribution
        const byCategory = {}
        logs.forEach(l => {
          if (l.recipeCategory) {
            byCategory[l.recipeCategory] = (byCategory[l.recipeCategory] || 0) + 1
          }
        })
        // Last 12 months
        const byMonth = []
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          byMonth.push({
            month: monthKey,
            count: logs.filter(l => l.cookedAt.startsWith(monthKey)).length,
          })
        }
        res.json({
          code: 200,
          data: { totalCooked, thisMonthCount: thisMonth, averageRating: Math.round(avgRating * 10) / 10, byCategory, byMonth },
        })
      } catch (err) {
        res.status(500).json({ code: 500, message: err.message })
      }
    })

    app.use('/api/cooking-logs', router)
  })

  beforeEach(async () => {
    await CookingLog.destroy({ where: {} })
  })

  describe('CookingLogs CRUD', () => {
    it('GET /cooking-logs returns empty list initially', async () => {
      const res = await request(app).get('/api/cooking-logs')
      expect(res.status).toBe(200)
      expect(res.body.data.list).toEqual([])
      expect(res.body.data.total).toBe(0)
    })

    it('POST /cooking-logs creates a log', async () => {
      const res = await request(app)
        .post('/api/cooking-logs')
        .send({ recipeId: 'r1', recipeTitle: '番茄炒蛋', recipeCategory: '中式', cookedAt: '2026-05-24', rating: 5, notes: '好吃', duration: 15 })
      expect(res.status).toBe(201)
      expect(res.body.data.recipeTitle).toBe('番茄炒蛋')
      expect(res.body.data.rating).toBe(5)
    })

    it('POST /cooking-logs with missing fields returns 400', async () => {
      const res = await request(app)
        .post('/api/cooking-logs')
        .send({ recipeId: 'r1' })
      expect(res.status).toBe(400)
    })

    it('POST /cooking-logs with invalid rating returns 400', async () => {
      const res = await request(app)
        .post('/api/cooking-logs')
        .send({ recipeId: 'r1', recipeTitle: 'test', cookedAt: '2026-05-24', rating: 10 })
      expect(res.status).toBe(400)
    })

    it('GET /cooking-logs with pagination', async () => {
      // Create 25 logs
      for (let i = 0; i < 25; i++) {
        await CookingLog.create({
          userId, recipeId: `r${i}`, recipeTitle: `Recipe ${i}`,
          cookedAt: '2026-05-24', rating: 4,
        })
      }
      const res = await request(app).get('/api/cooking-logs?page=2&pageSize=20')
      expect(res.body.data.list).toHaveLength(5)
      expect(res.body.data.total).toBe(25)
      expect(res.body.data.page).toBe(2)
    })

    it('PUT /cooking-logs/:id updates log', async () => {
      const createRes = await request(app)
        .post('/api/cooking-logs')
        .send({ recipeId: 'r1', recipeTitle: '旧标题', cookedAt: '2026-05-24', rating: 3 })
      const logId = createRes.body.data.id
      const res = await request(app)
        .put(`/api/cooking-logs/${logId}`)
        .send({ rating: 5, notes: '更新了' })
      expect(res.status).toBe(200)
      expect(res.body.data.rating).toBe(5)
      expect(res.body.data.notes).toBe('更新了')
    })

    it('PUT /cooking-logs/:id with invalid rating returns 400', async () => {
      const createRes = await request(app)
        .post('/api/cooking-logs')
        .send({ recipeId: 'r1', recipeTitle: '测试', cookedAt: '2026-05-24', rating: 3 })
      const logId = createRes.body.data.id
      const res = await request(app)
        .put(`/api/cooking-logs/${logId}`)
        .send({ rating: 0 })
      expect(res.status).toBe(400)
    })

    it('PUT /cooking-logs/:id returns 404 for non-existent', async () => {
      const res = await request(app).put('/api/cooking-logs/non-existent').send({ rating: 4 })
      expect(res.status).toBe(404)
    })

    it('DELETE /cooking-logs/:id deletes log', async () => {
      const createRes = await request(app)
        .post('/api/cooking-logs')
        .send({ recipeId: 'r1', recipeTitle: '删除测试', cookedAt: '2026-05-24', rating: 4 })
      const logId = createRes.body.data.id
      const res = await request(app).delete(`/api/cooking-logs/${logId}`)
      expect(res.status).toBe(200)
      const getRes = await request(app).get('/api/cooking-logs')
      expect(getRes.body.data.total).toBe(0)
    })

    it('DELETE /cooking-logs/:id returns 404 for non-existent', async () => {
      const res = await request(app).delete('/api/cooking-logs/non-existent')
      expect(res.status).toBe(404)
    })
  })

  describe('CookingLog Stats', () => {
    it('GET /cooking-logs/stats returns zero stats for empty DB', async () => {
      const res = await request(app).get('/api/cooking-logs/stats')
      expect(res.status).toBe(200)
      expect(res.body.data.totalCooked).toBe(0)
      expect(res.body.data.thisMonthCount).toBe(0)
      expect(res.body.data.averageRating).toBe(0)
    })

    it('GET /cooking-logs/stats returns correct totals', async () => {
      for (let i = 0; i < 5; i++) {
        await CookingLog.create({
          userId, recipeId: `r${i}`, recipeTitle: `Recipe ${i}`,
          recipeCategory: '中式',
          cookedAt: '2026-05-24', rating: 4,
        })
      }
      const res = await request(app).get('/api/cooking-logs/stats')
      expect(res.body.data.totalCooked).toBe(5)
      expect(res.body.data.averageRating).toBe(4)
    })

    it('GET /cooking-logs/stats returns category distribution', async () => {
      const cats = ['中式', '西式', '甜品', '中式', '日式']
      for (let i = 0; i < 5; i++) {
        await CookingLog.create({
          userId, recipeId: `r${i}`, recipeTitle: `Recipe ${i}`,
          recipeCategory: cats[i],
          cookedAt: '2026-05-24', rating: 4,
        })
      }
      const res = await request(app).get('/api/cooking-logs/stats')
      expect(res.body.data.byCategory['中式']).toBe(2)
      expect(res.body.data.byCategory['西式']).toBe(1)
      expect(res.body.data.byCategory['甜品']).toBe(1)
      expect(res.body.data.byCategory['日式']).toBe(1)
    })

    it('GET /cooking-logs/stats returns 12-month breakdown', async () => {
      const months = ['2025-06', '2025-06', '2026-01', '2026-05', '2026-05']
      for (let i = 0; i < 5; i++) {
        await CookingLog.create({
          userId, recipeId: `r${i}`, recipeTitle: `Recipe ${i}`,
          cookedAt: `${months[i]}-15`, rating: 3,
        })
      }
      const res = await request(app).get('/api/cooking-logs/stats')
      expect(res.body.data.byMonth).toHaveLength(12)
      const june25 = res.body.data.byMonth.find((m) => m.month === '2025-06')
      expect(june25.count).toBe(2)
    })

    it('average rating correctly calculated', async () => {
      await CookingLog.create({ userId, recipeId: 'r1', recipeTitle: 'A', cookedAt: '2026-05-24', rating: 5 })
      await CookingLog.create({ userId, recipeId: 'r2', recipeTitle: 'B', cookedAt: '2026-05-24', rating: 3 })
      await CookingLog.create({ userId, recipeId: 'r3', recipeTitle: 'C', cookedAt: '2026-05-24', rating: 4 })
      const res = await request(app).get('/api/cooking-logs/stats')
      expect(res.body.data.averageRating).toBe(4) // (5+3+4)/3 = 4
    })
  })
})

describe('ShareInfo API', () => {
  let app

  beforeAll(async () => {
    app = express()
    app.use(express.json())

    app.use((req, res, next) => {
      req.user = { id: 'test-user', username: 'testuser' }
      next()
    })

    const { Router } = require('express')
    const router = Router()

    // GET /share/:recipeId
    router.get('/recipes/:recipeId/share', async (req, res) => {
      try {
        const info = await ShareInfo.findOne({ where: { recipeId: req.params.recipeId } })
        if (!info) {
          return res.json({
            code: 200,
            data: {
              title: '默认食谱',
              description: '默认分享描述',
              shareUrl: `https://example.com/recipe/${req.params.recipeId}`,
              shareText: `来看看这道美食`,
            }
          })
        }
        res.json({ code: 200, data: info })
      } catch (err) {
        res.status(500).json({ code: 500, message: err.message })
      }
    })

    // POST /share/:recipeId/record
    router.post('/recipes/:recipeId/share/record', async (req, res) => {
      try {
        const [info, created] = await ShareInfo.findOrCreate({
          where: { recipeId: req.params.recipeId },
          defaults: { userId: req.user.id, title: req.body.title || '食谱', description: req.body.description || '', shareUrl: req.body.shareUrl || '', shareCount: 1 },
        })
        if (!created) {
          info.shareCount += 1
          await info.save()
        }
        res.json({ code: 200, data: info })
      } catch (err) {
        res.status(500).json({ code: 500, message: err.message })
      }
    })

    app.use('/api/share', router)
  })

  beforeEach(async () => {
    await ShareInfo.destroy({ where: {} })
  })

  it('GET /share/recipes/:recipeId/share returns fallback for unknown', async () => {
    const res = await request(app).get('/api/share/recipes/unknown/share')
    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('默认食谱')
    expect(res.body.data.shareUrl).toContain('unknown')
  })

  it('POST /share/recipes/:recipeId/share/record creates share info', async () => {
    const res = await request(app)
      .post('/api/share/recipes/r1/share/record')
      .send({ title: '番茄炒蛋', description: '经典家常菜' })
    expect(res.status).toBe(200)
    expect(res.body.data.shareCount).toBe(1)
  })

  it('POST /share/recipes/:recipeId/share/record increments count', async () => {
    await request(app).post('/api/share/recipes/r1/share/record').send({})
    const res = await request(app).post('/api/share/recipes/r1/share/record').send({})
    expect(res.body.data.shareCount).toBe(2)
  })

  it('GET returns persisted share info', async () => {
    await request(app)
      .post('/api/share/recipes/r1/share/record')
      .send({ title: '番茄炒蛋', description: '经典' })
    const res = await request(app).get('/api/share/recipes/r1/share')
    expect(res.body.data.title).toBe('番茄炒蛋')
    expect(res.body.data.description).toBe('经典')
  })

  it('share count increases with each share record', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/share/recipes/r1/share/record').send({})
    }
    const res = await request(app).get('/api/share/recipes/r1/share')
    expect(res.body.data.shareCount).toBe(5)
  })
})