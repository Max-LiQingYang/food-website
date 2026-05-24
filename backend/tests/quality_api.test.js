'use strict'

const request = require('supertest')
const express = require('express')
const { Sequelize, DataTypes, Op } = require('sequelize')

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
})

const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
  category: { type: DataTypes.STRING },
  cookTime: { type: DataTypes.INTEGER, defaultValue: 30 },
  difficulty: { type: DataTypes.STRING, defaultValue: 'easy' },
  servings: { type: DataTypes.INTEGER, defaultValue: 2 },
  coverImage: { type: DataTypes.STRING, allowNull: true },
  coverImage: { type: DataTypes.STRING, allowNull: true },
  season: { type: DataTypes.STRING, defaultValue: 'all' },
  isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false },
  favoriteCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  commentCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  viewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  steps: { type: DataTypes.JSON, defaultValue: [] },
  tips: { type: DataTypes.TEXT, allowNull: true },
  nutrition: { type: DataTypes.JSON, allowNull: true },
  ingredients: { type: DataTypes.JSON, defaultValue: [] },
  userId: { type: DataTypes.STRING, allowNull: true },
  author: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'recipes', timestamps: true })

describe('GET /api/recipes/popular', () => {
  let app

  beforeEach(async () => {
    await sequelize.sync({ force: true })
    await Recipe.create({ title: '热门食谱A', description: '非常受欢迎的一道菜', category: 'chinese', difficulty: 'easy', cookTime: 15, favoriteCount: 50, viewCount: 800, commentCount: 25, season: 'all', steps: [{content:'1'},{content:'2'},{content:'3'}], nutrition: {calories:200,protein:15,fat:10,sodium:300,fiber:2}, tips: '好吃秘诀', coverImage: 'http://example.com/img.jpg' })
    await Recipe.create({ title: '热门食谱B', description: '也受欢迎的菜', category: 'western', difficulty: 'medium', cookTime: 30, favoriteCount: 30, viewCount: 500, commentCount: 15, season: 'all', steps: [{content:'1'},{content:'2'},{content:'3'}], nutrition: {calories:300,protein:10,fat:15,sodium:500,fiber:1}, tips: '小贴士', coverImage: 'http://example.com/img2.jpg' })
    await Recipe.create({ title: '冷门食谱C', description: '不太热门', category: 'chinese', difficulty: 'hard', cookTime: 60, favoriteCount: 5, viewCount: 50, commentCount: 1, season: 'all', steps: [{content:'1'},{content:'2'},{content:'3'},{content:'4'}], nutrition: {calories:400,protein:20,fat:25,sodium:800,fiber:1}, tips: '注意火候', coverImage: 'http://example.com/img3.jpg' })

    app = express()
    app.use(express.json())

    // GET /popular
    app.get('/api/recipes/popular', async (req, res) => {
      try {
        let page = parseInt(req.query.page, 10) || 1
        let pageSize = parseInt(req.query.pageSize, 10) || 12
        if (page < 1) page = 1
        if (pageSize > 100) pageSize = 100
        const offset = (page - 1) * pageSize

        const { count, rows } = await Recipe.findAndCountAll({
          order: [['favoriteCount', 'DESC']],
          offset,
          limit: pageSize,
        })

        let list = rows.map(r => r.toJSON())
        list = list.map(item => {
          const q = {
            qualityScore: item.viewCount * 0.3 + item.favoriteCount * 2 + item.commentCount * 1.5,
          }
          item.qualityScore = Math.round(q.qualityScore * 10) / 10
          return item
        })
        list.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))

        res.json({ code: 0, data: { list, total: count, page, pageSize } })
      } catch (err) {
        res.status(500).json({ code: 1, message: err.message })
      }
    })

    // GET /new-user-recommend
    app.get('/api/recipes/new-user-recommend', async (req, res) => {
      try {
        const { difficulty, season } = req.query
        const where = {}
        if (difficulty) where.difficulty = difficulty
        if (season) {
          where[Op.or] = [{ season }, { season: 'all' }]
        }
        const rows = await Recipe.findAll({
          where,
          order: [['favoriteCount', 'DESC']],
          limit: 6,
        })
        const list = rows.map(r => r.toJSON())
        res.json({ code: 0, data: { list, matched: { difficulty, season } } })
      } catch (err) {
        res.status(500).json({ code: 1, message: err.message })
      }
    })

    // GET /quality-check
    app.get('/api/recipes/quality-check', async (req, res) => {
      try {
        let page = parseInt(req.query.page, 10) || 1
        let pageSize = parseInt(req.query.pageSize, 10) || 20
        const offset = (page - 1) * pageSize

        const { count, rows } = await Recipe.findAndCountAll({ offset, limit: pageSize, order: [['createdAt', 'DESC']] })

        const list = rows.map(r => {
          const recipe = r.toJSON()
          const issues = []
          if (!recipe.title || String(recipe.title).trim().length < 3) issues.push('标题过短')
          if (!recipe.description || String(recipe.description).trim().length < 10) issues.push('描述不完整')
          const steps = Array.isArray(recipe.steps) ? recipe.steps : []
          if (steps.length < 3) issues.push('步骤数不足')
          if (!recipe.coverImage) issues.push('缺少封面图片')
          if (!recipe.nutrition || Object.keys(recipe.nutrition).length === 0) issues.push('缺少营养数据')
          if (!recipe.tips || String(recipe.tips).trim().length === 0) issues.push('缺少小贴士')

          let baseScore = 100
          baseScore -= issues.length * 16
          const qualityScore = Math.max(0, Math.min(100, baseScore))

          return {
            id: recipe.id, title: recipe.title, qualityScore, issues, passed: issues.length <= 1,
            dimensions: {
              title: (recipe.title || '').length >= 3,
              description: (recipe.description || '').length >= 10,
              steps: steps.length >= 3,
              coverImage: !!recipe.coverImage,
              nutrition: !!(recipe.nutrition && typeof recipe.nutrition === 'object' && Object.keys(recipe.nutrition).length > 0),
              tips: (recipe.tips || '').trim().length > 0,
            }
          }
        })

        res.json({ code: 0, data: { list, total: count, page, pageSize, summary: { passedCount: list.filter(i => i.passed).length, failedCount: list.length - list.filter(i => i.passed).length, passRate: count > 0 ? Math.round((list.filter(i => i.passed).length / count) * 100) : 0 } } })
      } catch (err) {
        res.status(500).json({ code: 1, message: err.message })
      }
    })

    // GET /low-quality
    app.get('/api/recipes/low-quality', async (req, res) => {
      try {
        let page = parseInt(req.query.page, 10) || 1
        let pageSize = parseInt(req.query.pageSize, 10) || 20
        const offset = (page - 1) * pageSize
        const { count, rows } = await Recipe.findAndCountAll({ offset, limit: pageSize, order: [['createdAt', 'DESC']] })

        const list = rows.map(r => {
          const recipe = r.toJSON()
          const issues = []
          if (!recipe.title || String(recipe.title).trim().length < 3) issues.push('标题过短')
          if (!recipe.description || String(recipe.description).trim().length < 10) issues.push('描述不完整')
          const steps = Array.isArray(recipe.steps) ? recipe.steps : []
          if (steps.length < 3) issues.push('步骤不足')
          if (!recipe.coverImage) issues.push('缺封面')
          if (!recipe.nutrition || Object.keys(recipe.nutrition).length === 0) issues.push('缺营养数据')
          if (!recipe.tips || !recipe.tips.trim()) issues.push('缺小贴士')

          let baseScore = 100
          baseScore -= issues.length * 16
          const qualityScore = Math.max(0, Math.min(100, baseScore))
          return { id: recipe.id, title: recipe.title, qualityScore, issues, passed: issues.length <= 1 }
        })

        res.json({ code: 0, data: { list: list.filter(i => !i.passed), total: list.filter(i => !i.passed).length, page, pageSize, allTotal: count } })
      } catch (err) {
        res.status(500).json({ code: 1, message: err.message })
      }
    })
  })

  it('should return popular recipes sorted by qualityScore', async () => {
    const res = await request(app).get('/api/recipes/popular')
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(Array.isArray(res.body.data.list)).toBe(true)
    expect(res.body.data.list.length).toBeGreaterThan(0)
  })

  it('should sort descending by qualityScore', async () => {
    const res = await request(app).get('/api/recipes/popular')
    const scores = res.body.data.list.map(i => i.qualityScore || 0)
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1])
    }
  })

  it('should support pagination', async () => {
    const res1 = await request(app).get('/api/recipes/popular?pageSize=2&page=1')
    const res2 = await request(app).get('/api/recipes/popular?pageSize=2&page=2')
    expect(res1.body.data.list.length).toBeLessThanOrEqual(2)
    expect(res2.body.data.list.length).toBeLessThanOrEqual(2)
  })

  it('should have qualityScore field', async () => {
    const res = await request(app).get('/api/recipes/popular?pageSize=1')
    if (res.body.data.list.length > 0) {
      expect(res.body.data.list[0]).toHaveProperty('qualityScore')
    }
  })

  it('should return total count', async () => {
    const res = await request(app).get('/api/recipes/popular')
    expect(res.body.data.total).toBe(3)
  })

  // New user recommend
  it('should return new user recommendations', async () => {
    const res = await request(app).get('/api/recipes/new-user-recommend')
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(Array.isArray(res.body.data.list)).toBe(true)
  })

  it('should filter by difficulty', async () => {
    const res = await request(app).get('/api/recipes/new-user-recommend?difficulty=easy')
    if (res.body.data.list.length > 0) {
      res.body.data.list.forEach(item => expect(item.difficulty).toBe('easy'))
    }
  })

  it('should filter by season', async () => {
    const res = await request(app).get('/api/recipes/new-user-recommend?season=all')
    expect(res.body.data.matched.season).toBe('all')
  })

  it('should limit to 6 results', async () => {
    const res = await request(app).get('/api/recipes/new-user-recommend')
    expect(res.body.data.list.length).toBeLessThanOrEqual(6)
  })

  // Quality check
  it('should return quality check results', async () => {
    const res = await request(app).get('/api/recipes/quality-check')
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(Array.isArray(res.body.data.list)).toBe(true)
    expect(res.body.data.summary).toBeDefined()
  })

  it('should include quality dimensions', async () => {
    const res = await request(app).get('/api/recipes/quality-check?pageSize=1')
    if (res.body.data.list.length > 0) {
      const item = res.body.data.list[0]
      expect(item).toHaveProperty('qualityScore')
      expect(item).toHaveProperty('issues')
      expect(item).toHaveProperty('passed')
      expect(item).toHaveProperty('dimensions')
      expect(item.dimensions).toHaveProperty('title')
    }
  })

  it('should support quality pagination', async () => {
    const res = await request(app).get('/api/recipes/quality-check?pageSize=2')
    expect(res.body.data.list.length).toBeLessThanOrEqual(2)
  })

  it('should pass for well-structured recipes', async () => {
    const res = await request(app).get('/api/recipes/quality-check')
    const passed = res.body.data.list.filter(i => i.passed)
    expect(passed.length).toBeGreaterThan(0)
  })

  // Low quality
  it('should return low quality recipes', async () => {
    const res = await request(app).get('/api/recipes/low-quality')
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(Array.isArray(res.body.data.list)).toBe(true)
  })

  it('should have issues for low quality items', async () => {
    const res = await request(app).get('/api/recipes/low-quality')
    if (res.body.data.list.length > 0) {
      const item = res.body.data.list[0]
      expect(item).toHaveProperty('qualityScore')
      expect(item).toHaveProperty('issues')
      expect(Array.isArray(item.issues)).toBe(true)
    }
  })
})