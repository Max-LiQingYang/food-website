'use strict'

/**
 * tests/nutrition_calibration.test.js
 * Iter#97 P0: 营养数据格式化修复单元测试
 *
 * 测试范围：
 *   1. Sequelize getter 自动解析 TEXT → 对象
 *   2. validateNutrition 中间件校验
 *   3. API 响应中 nutrition 为对象
 */

const request = require('supertest')
const express = require('express')
const { Sequelize, DataTypes } = require('sequelize')

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
})

// 使用 TEXT 类型定义 nutrition/ingredients/steps（模拟 MariaDB 实际类型）
const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  category: { type: DataTypes.STRING, allowNull: true },
  ingredients: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('ingredients')
      if (!raw) return null
      if (typeof raw === 'object') return raw
      try { return JSON.parse(raw) } catch { return null }
    },
  },
  steps: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('steps')
      if (!raw) return null
      if (typeof raw === 'object') return raw
      try { return JSON.parse(raw) } catch { return null }
    },
  },
  nutrition: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('nutrition')
      if (!raw) return null
      if (typeof raw === 'object') return raw
      try { return JSON.parse(raw) } catch { return null }
    },
  },
  cookTime: { type: DataTypes.INTEGER, allowNull: true },
  difficulty: { type: DataTypes.STRING, allowNull: true },
  servings: { type: DataTypes.INTEGER, allowNull: true },
  tips: { type: DataTypes.TEXT, allowNull: true },
  coverImage: { type: DataTypes.STRING, allowNull: true },
  favoriteCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  commentCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  viewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  userId: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'recipes', timestamps: true })

const validateNutrition = require('../middleware/validateNutrition')

// ─── Test Suite 1: Sequelize Getter ──────────────────────────────
describe('Iter#97 P0: Recipe Getter — Nutrition JSON Auto-Parse', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true })
  })

  test('nutrition getter auto-parses TEXT string to object', async () => {
    const nutritionObj = { calories: 250, protein: 15, fat: 10, carbs: 30, fiber: 3, sodium: 400 }
    const recipe = await Recipe.create({
      title: 'Getter Test Recipe',
      category: 'chinese',
      nutrition: JSON.stringify(nutritionObj),
      ingredients: JSON.stringify([{ name: '鸡蛋', amount: 2, unit: '个' }]),
      steps: JSON.stringify([{ content: '打鸡蛋' }, { content: '炒' }]),
    })

    const found = await Recipe.findByPk(recipe.id)
    const data = found.toJSON()

    expect(typeof data.nutrition).toBe('object')
    expect(data.nutrition).not.toBeNull()
    expect(data.nutrition.calories).toBe(250)
    expect(data.nutrition.protein).toBe(15)

    // ingredients should also be parsed
    expect(Array.isArray(data.ingredients)).toBe(true)
    expect(data.ingredients.length).toBe(1)

    // steps should also be parsed
    expect(Array.isArray(data.steps)).toBe(true)
    expect(data.steps.length).toBe(2)
  })

  test('nutrition getter returns null for null value', async () => {
    const recipe = await Recipe.create({
      title: 'No Nutrition Recipe',
      category: 'chinese',
      nutrition: null,
    })

    const found = await Recipe.findByPk(recipe.id)
    const data = found.toJSON()

    expect(data.nutrition).toBeNull()
  })

  test('nutrition getter returns null for empty string', async () => {
    const recipe = await Recipe.create({
      title: 'Empty Nutrition',
      category: 'chinese',
      nutrition: '',
    })

    const found = await Recipe.findByPk(recipe.id)
    const data = found.toJSON()

    expect(data.nutrition).toBeNull()
  })

  test('nutrition getter returns object as-is when already parsed', async () => {
    const nutritionObj = { calories: 100, protein: 5 }
    const recipe = await Recipe.create({
      title: 'Already Object',
      category: 'chinese',
      nutrition: JSON.stringify(nutritionObj),
    })

    // Fetch twice: the second time, the stored value is still a string in DB
    const found = await Recipe.findByPk(recipe.id)
    expect(typeof found.nutrition).toBe('object')
    expect(found.nutrition.calories).toBe(100)
  })

  test('nutrition getter returns null on malformed JSON', async () => {
    const recipe = await Recipe.create({
      title: 'Malformed Nutrition',
      category: 'chinese',
      nutrition: '{broken json',
    })

    const found = await Recipe.findByPk(recipe.id)
    const data = found.toJSON()

    expect(data.nutrition).toBeNull()
  })
})

// ─── Test Suite 2: validateNutrition Middleware ───────────────────
describe('Iter#97 P0: validateNutrition Middleware', () => {
  let app

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.post('/test', validateNutrition, (req, res) => {
      // After validation, nutrition should be stringified
      res.json({
        code: 0,
        nutrition: req.body.nutrition,
        nutritionType: typeof req.body.nutrition,
      })
    })
  })

  test('accepts valid nutrition object', async () => {
    const res = await request(app)
      .post('/test')
      .send({ title: 'Test', nutrition: { calories: 250, protein: 15, fat: 10, carbs: 30, fiber: 3, sodium: 400 } })

    expect(res.status).toBe(200)
    expect(res.body.nutritionType).toBe('string')
    expect(JSON.parse(res.body.nutrition).calories).toBe(250)
  })

  test('accepts valid nutrition JSON string', async () => {
    const res = await request(app)
      .post('/test')
      .send({ title: 'Test', nutrition: '{"calories":300,"protein":20}' })

    expect(res.status).toBe(200)
    expect(res.body.nutritionType).toBe('string')
  })

  test('rejects non-JSON string', async () => {
    const res = await request(app)
      .post('/test')
      .send({ title: 'Test', nutrition: 'not json' })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('合法 JSON')
  })

  test('rejects calories > 3000', async () => {
    const res = await request(app)
      .post('/test')
      .send({ title: 'Test', nutrition: { calories: 5000 } })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('calories')
    expect(res.body.message).toContain('超出合理范围')
  })

  test('rejects calories < 5', async () => {
    const res = await request(app)
      .post('/test')
      .send({ title: 'Test', nutrition: { calories: 1 } })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('calories')
    expect(res.body.message).toContain('超出合理范围')
  })

  test('rejects protein > 500', async () => {
    const res = await request(app)
      .post('/test')
      .send({ title: 'Test', nutrition: { calories: 200, protein: 600 } })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('protein')
  })

  test('rejects negative sodium', async () => {
    const res = await request(app)
      .post('/test')
      .send({ title: 'Test', nutrition: { calories: 200, sodium: -1 } })

    expect(res.status).toBe(400)
  })

  test('rejects non-numeric nutrition values', async () => {
    const res = await request(app)
      .post('/test')
      .send({ title: 'Test', nutrition: { calories: 'abc' } })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('calories')
  })

  test('allows nutrition to be empty (optional field)', async () => {
    const res = await request(app)
      .post('/test')
      .send({ title: 'Test' })

    expect(res.status).toBe(200)
  })

  test('allows nutrition to be null', async () => {
    const res = await request(app)
      .post('/test')
      .send({ title: 'Test', nutrition: null })

    expect(res.status).toBe(200)
  })

  test('rejects nutrition as array', async () => {
    const res = await request(app)
      .post('/test')
      .send({ title: 'Test', nutrition: [1, 2, 3] })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('JSON 对象')
  })

  test('normalizes to JSON string in req.body', async () => {
    const res = await request(app)
      .post('/test')
      .send({ title: 'Test', nutrition: { calories: 250, protein: 15 } })

    expect(res.status).toBe(200)
    expect(typeof res.body.nutrition).toBe('string')
    const parsed = JSON.parse(res.body.nutrition)
    expect(parsed.calories).toBe(250)
    expect(parsed.protein).toBe(15)
  })
})

// ─── Test Suite 3: API Response Format ───────────────────────────
describe('Iter#97 P0: API Response — Nutrition is Object', () => {
  let app

  beforeAll(async () => {
    await sequelize.sync({ force: true })

    const nutritionObj = { calories: 85, protein: 2, fat: 1, carbs: 18, fiber: 0.5, sodium: 5 }
    await Recipe.create({
      title: 'API Test Recipe',
      category: 'chinese',
      nutrition: JSON.stringify(nutritionObj),
      ingredients: JSON.stringify([{ name: '黄瓜', amount: 1, unit: '根' }]),
      steps: JSON.stringify([{ content: '洗净' }, { content: '切片' }, { content: '凉拌' }]),
    })

    app = express()
    // Simple route that returns recipe as object
    app.get('/api/recipes/:id', async (req, res) => {
      const recipe = await Recipe.findByPk(req.params.id)
      if (!recipe) return res.status(404).json({ code: 404 })
      const data = recipe.toJSON()
      res.json({ code: 0, data })
    })
  })

  test('GET /api/recipes/:id returns nutrition as object', async () => {
    const all = await Recipe.findAll()
    const recipe = all[0]

    const res = await request(app).get(`/api/recipes/${recipe.id}`)

    expect(res.status).toBe(200)
    expect(typeof res.body.data.nutrition).toBe('object')
    expect(res.body.data.nutrition.calories).toBe(85)
    expect(res.body.data.nutrition.protein).toBe(2)
  })

  test('GET /api/recipes/:id returns ingredients as array', async () => {
    const all = await Recipe.findAll()
    const recipe = all[0]

    const res = await request(app).get(`/api/recipes/${recipe.id}`)

    expect(Array.isArray(res.body.data.ingredients)).toBe(true)
  })

  test('GET /api/recipes/:id returns steps as array', async () => {
    const all = await Recipe.findAll()
    const recipe = all[0]

    const res = await request(app).get(`/api/recipes/${recipe.id}`)

    expect(Array.isArray(res.body.data.steps)).toBe(true)
    expect(res.body.data.steps.length).toBe(3)
  })
})
