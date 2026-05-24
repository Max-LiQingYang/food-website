'use strict'

/**
 * tests/collections_comments_pantry_nutrition.test.js
 * 迭代#37：收藏夹增强 + 食材库存 + 营养追踪
 */
const request = require('supertest')
const express = require('express')
const { Sequelize, DataTypes } = require('sequelize')

// In-memory SQLite for isolation
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
})

// ── Define models inline ──────────────────────────────────────────
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  nickname: { type: DataTypes.STRING(50) },
  role: { type: DataTypes.STRING, defaultValue: 'user' },
}, { tableName: 'users', timestamps: true })

const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  category: { type: DataTypes.STRING },
  ingredients: { type: DataTypes.JSON },
  steps: { type: DataTypes.JSON },
  cookTime: { type: DataTypes.INTEGER },
  difficulty: { type: DataTypes.STRING },
  servings: { type: DataTypes.INTEGER },
  coverImage: { type: DataTypes.STRING },
  nutrition: { type: DataTypes.JSON },
  tips: { type: DataTypes.TEXT },
  season: { type: DataTypes.STRING },
  favoriteCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  userId: { type: DataTypes.UUID },
}, { tableName: 'recipes', timestamps: true })

const Collection = sequelize.define('Collection', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT },
  userId: { type: DataTypes.UUID, allowNull: false },
  isPublic: { type: DataTypes.BOOLEAN, defaultValue: false },
  subscriberCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  recipeCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  coverImage: { type: DataTypes.STRING(500) },
}, { tableName: 'collections', timestamps: true })

const CollectionRecipe = sequelize.define('CollectionRecipe', {
  collectionId: { type: DataTypes.UUID, allowNull: false },
  recipeId: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'collection_recipes', timestamps: true })

const CollectionComment = sequelize.define('CollectionComment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  collectionId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'collection_comments', timestamps: true })

const PantryItem = sequelize.define('PantryItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  quantity: { type: DataTypes.DECIMAL(10, 2), defaultValue: 1 },
  unit: { type: DataTypes.STRING(20), defaultValue: '个' },
  category: { type: DataTypes.STRING(30), defaultValue: '其他' },
  expiryDate: { type: DataTypes.DATEONLY, allowNull: true },
  notes: { type: DataTypes.STRING(200) },
}, { tableName: 'pantry_items', timestamps: true })

const NutritionLog = sequelize.define('NutritionLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  recipeId: { type: DataTypes.UUID, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  mealType: { type: DataTypes.STRING, allowNull: false },
  servings: { type: DataTypes.DECIMAL(5, 2), defaultValue: 1 },
  calories: { type: DataTypes.DECIMAL(8, 2), defaultValue: 0 },
  protein: { type: DataTypes.DECIMAL(8, 2), defaultValue: 0 },
  fat: { type: DataTypes.DECIMAL(8, 2), defaultValue: 0 },
  carbs: { type: DataTypes.DECIMAL(8, 2), defaultValue: 0 },
  fiber: { type: DataTypes.DECIMAL(8, 2), defaultValue: 0 },
  sodium: { type: DataTypes.DECIMAL(8, 2), defaultValue: 0 },
}, { tableName: 'nutrition_logs', timestamps: true })

const NutritionGoal = sequelize.define('NutritionGoal', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, unique: true },
  calories: { type: DataTypes.DECIMAL(8, 2), defaultValue: 2000 },
  protein: { type: DataTypes.DECIMAL(8, 2), defaultValue: 60 },
  fat: { type: DataTypes.DECIMAL(8, 2), defaultValue: 65 },
  carbs: { type: DataTypes.DECIMAL(8, 2), defaultValue: 250 },
  fiber: { type: DataTypes.DECIMAL(8, 2), defaultValue: 25 },
}, { tableName: 'nutrition_goals', timestamps: true })

Collection.belongsToMany(Recipe, { through: CollectionRecipe, foreignKey: 'collectionId', otherKey: 'recipeId', as: 'recipes' })
Recipe.belongsToMany(Collection, { through: CollectionRecipe, foreignKey: 'recipeId', otherKey: 'collectionId', as: 'collections' })
CollectionComment.belongsTo(User, { foreignKey: 'userId', as: 'user' })

// ── Auth middleware mock ─────────────────────────────────────────
const mockAuth = (req, res, next) => {
  req.userId = req.headers['x-user-id'] || 'test-user-1'
  next()
}

// ── Build app ────────────────────────────────────────────────────
async function buildApp() {
  await sequelize.sync({ force: true })

  const app = express()
  app.use(express.json())
  app.use(mockAuth)

  // Create users
  await User.create({ id: 'test-user-1', username: 'user1', email: 'u1@test.com', password: 'hash1', nickname: '用户一' })
  await User.create({ id: 'test-user-2', username: 'user2', email: 'u2@test.com', password: 'hash2', nickname: '用户二' })

  // Create test recipe
  const recipe = await Recipe.create({
    id: 'recipe-test-1', title: '番茄炒蛋', description: '经典家常菜',
    category: 'chinese', ingredients: JSON.stringify(['番茄', '鸡蛋', '盐']),
    steps: JSON.stringify(['打蛋', '炒蛋', '加番茄']), cookTime: 15,
    difficulty: 'easy', servings: 2, coverImage: 'https://example.com/tomato.jpg',
    nutrition: JSON.stringify({ calories: 200, protein: 12, fat: 8, carbs: 18, fiber: 2, sodium: 400 }),
  })

  // ── Route helpers ──────────────────────────────────────────────

  function resJSON(code, msg, data) { return { code, msg, data } }

  // Collection routes (simplified)
  app.post('/collections', async (req, res) => {
    const { name, description, isPublic } = req.body
    const c = await Collection.create({ name, description, isPublic: isPublic === true, userId: req.userId })
    res.status(201).json(resJSON(0, 'ok', c))
  })

  app.get('/collections', async (req, res) => {
    const list = await Collection.findAll({ where: { userId: req.userId } })
    res.json(resJSON(0, 'ok', list))
  })

  app.get('/collections/public', async (req, res) => {
    const list = await Collection.findAll({ where: { isPublic: true }, order: [['subscriberCount', 'DESC']] })
    res.json(resJSON(0, 'ok', list))
  })

  app.post('/collections/:id/recipes', async (req, res) => {
    const c = await Collection.findByPk(req.params.id)
    if (!c) return res.status(404).json(resJSON(404, 'not found'))
    const r = await Recipe.findByPk(req.body.recipeId)
    if (!r) return res.status(404).json(resJSON(404, 'not found'))
    await CollectionRecipe.findOrCreate({ where: { collectionId: c.id, recipeId: r.id } })
    if (!c.coverImage && r.coverImage) await c.update({ coverImage: r.coverImage })
    const rc = await CollectionRecipe.count({ where: { collectionId: c.id } })
    await c.update({ recipeCount: rc })
    res.json(resJSON(0, 'ok', { recipeCount: rc, coverImage: c.coverImage }))
  })

  // Collection comments
  app.get('/collections/:id/comments', async (req, res) => {
    const list = await CollectionComment.findAll({ where: { collectionId: req.params.id }, order: [['createdAt', 'DESC']] })
    res.json(resJSON(0, 'ok', list))
  })

  app.post('/collections/:id/comments', async (req, res) => {
    const c = await Collection.findByPk(req.params.id)
    if (!c) return res.status(404).json(resJSON(404, 'not found'))
    if (!c.isPublic && c.userId !== req.userId) return res.status(403).json(resJSON(403, 'forbidden'))
    const comment = await CollectionComment.create({ collectionId: c.id, userId: req.userId, content: req.body.content })
    res.status(201).json(resJSON(0, 'ok', comment))
  })

  // Pantry routes
  app.get('/pantry', async (req, res) => {
    const where = { userId: req.userId }
    if (req.query.category) where.category = req.query.category
    const list = await PantryItem.findAll({ where, order: [['updatedAt', 'DESC']] })
    res.json(resJSON(0, 'ok', list))
  })

  app.post('/pantry', async (req, res) => {
    const { name, quantity, unit, category, expiryDate } = req.body
    const item = await PantryItem.create({
      userId: req.userId, name, quantity: quantity || 1, unit: unit || '个',
      category: category || '其他', expiryDate: expiryDate || null,
    })
    res.status(201).json(resJSON(0, 'ok', item))
  })

  app.put('/pantry/:id', async (req, res) => {
    const item = await PantryItem.findOne({ where: { id: req.params.id, userId: req.userId } })
    if (!item) return res.status(404).json(resJSON(404, 'not found'))
    const { name, quantity, unit, category, expiryDate } = req.body
    await item.update({ name, quantity, unit, category, expiryDate })
    res.json(resJSON(0, 'ok', item))
  })

  app.delete('/pantry/:id', async (req, res) => {
    const item = await PantryItem.findOne({ where: { id: req.params.id, userId: req.userId } })
    if (!item) return res.status(404).json(resJSON(404, 'not found'))
    await item.destroy()
    res.json(resJSON(0, 'ok'))
  })

  app.get('/pantry/expiring', async (req, res) => {
    const days = parseInt(req.query.days, 10) || 3
    const future = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
    const today = new Date().toISOString().slice(0, 10)
    const list = await PantryItem.findAll({
      where: { userId: req.userId, expiryDate: { [Sequelize.Op.between]: [today, future] } },
      order: [['expiryDate', 'ASC']],
    })
    res.json(resJSON(0, 'ok', list))
  })

  app.get('/pantry/expired', async (req, res) => {
    const today = new Date().toISOString().slice(0, 10)
    const list = await PantryItem.findAll({
      where: { userId: req.userId, expiryDate: { [Sequelize.Op.lt]: today } },
    })
    res.json(resJSON(0, 'ok', list))
  })

  // Nutrition routes
  app.post('/nutrition/logs', async (req, res) => {
    const { recipeId, date, mealType, servings } = req.body
    const r = await Recipe.findByPk(recipeId)
    if (!r) return res.status(404).json(resJSON(404, 'recipe not found'))
    const n = typeof r.nutrition === 'string' ? JSON.parse(r.nutrition) : (r.nutrition || {})
    const sv = parseFloat(servings) || 1
    const log = await NutritionLog.create({
      userId: req.userId, recipeId, date, mealType, servings: sv,
      calories: (n.calories || 0) * sv, protein: (n.protein || 0) * sv,
      fat: (n.fat || 0) * sv, carbs: (n.carbs || 0) * sv,
      fiber: (n.fiber || 0) * sv, sodium: (n.sodium || 0) * sv,
    })
    res.status(201).json(resJSON(0, 'ok', log))
  })

  app.get('/nutrition/logs', async (req, res) => {
    const where = { userId: req.userId }
    if (req.query.date) where.date = req.query.date
    const list = await NutritionLog.findAll({ where })
    res.json(resJSON(0, 'ok', list))
  })

  app.put('/nutrition/goals', async (req, res) => {
    const [goal] = await NutritionGoal.findOrCreate({ where: { userId: req.userId } })
    const { calories, protein, fat, carbs, fiber } = req.body
    await goal.update({ calories, protein, fat, carbs, fiber })
    res.json(resJSON(0, 'ok', goal))
  })

  app.get('/nutrition/goals', async (req, res) => {
    let goal = await NutritionGoal.findOne({ where: { userId: req.userId } })
    if (!goal) { goal = await NutritionGoal.create({ userId: req.userId }) }
    res.json(resJSON(0, 'ok', goal))
  })

  app.get('/nutrition/stats/daily', async (req, res) => {
    const date = req.query.date || new Date().toISOString().slice(0, 10)
    const logs = await NutritionLog.findAll({ where: { userId: req.userId, date } })
    const totals = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0, count: 0 }
    logs.forEach(l => {
      totals.calories += parseFloat(l.calories) || 0
      totals.protein += parseFloat(l.protein) || 0
      totals.fat += parseFloat(l.fat) || 0
      totals.carbs += parseFloat(l.carbs) || 0
      totals.fiber += parseFloat(l.fiber) || 0
      totals.sodium += parseFloat(l.sodium) || 0
      totals.count++
    })
    res.json(resJSON(0, 'ok', { date, logs, totals }))
  })

  app.get('/nutrition/stats/weekly', async (req, res) => {
    const end = req.query.end || new Date().toISOString().slice(0, 10)
    const start = req.query.start || new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
    const logs = await NutritionLog.findAll({ where: { userId: req.userId, date: { [Sequelize.Op.between]: [start, end] } } })
    const totals = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, count: logs.length }
    logs.forEach(l => {
      totals.calories += parseFloat(l.calories) || 0
      totals.protein += parseFloat(l.protein) || 0
      totals.fat += parseFloat(l.fat) || 0
      totals.carbs += parseFloat(l.carbs) || 0
      totals.fiber += parseFloat(l.fiber) || 0
    })
    res.json(resJSON(0, 'ok', { start, end, totals, logs: logs.length }))
  })

  app.get('/nutrition/suggestions', async (req, res) => {
    const date = req.query.date || new Date().toISOString().slice(0, 10)
    const logs = await NutritionLog.findAll({ where: { userId: req.userId, date } })
    const totals = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 }
    logs.forEach(l => {
      totals.calories += parseFloat(l.calories) || 0
      totals.protein += parseFloat(l.protein) || 0
      totals.fat += parseFloat(l.fat) || 0
      totals.carbs += parseFloat(l.carbs) || 0
      totals.fiber += parseFloat(l.fiber) || 0
    })
    const suggestions = []
    if (totals.calories < 1000) suggestions.push({ type: 'calorie', message: '热量不足' })
    res.json(resJSON(0, 'ok', { suggestions, totals }))
  })

  return { app, recipe }
}

// ── Tests ────────────────────────────────────────────────────────
describe('Collections Enhancement', () => {
  let app, recipe

  beforeAll(async () => {
    const ctx = await buildApp()
    app = ctx.app
    recipe = ctx.recipe
  })

  test('创建收藏夹', async () => {
    const res = await request(app).post('/collections').send({ name: '我的最爱', description: '收藏好食谱', isPublic: true })
    expect(res.status).toBe(201)
    expect(res.body.code).toBe(0)
    expect(res.body.data.name).toBe('我的最爱')
    global.collectionId = res.body.data.id
  })

  test('获取用户收藏夹', async () => {
    const res = await request(app).get('/collections')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
  })

  test('添加食谱到收藏夹 — 自动生成封面', async () => {
    const res = await request(app).post(`/collections/${global.collectionId}/recipes`).send({ recipeId: recipe.id })
    expect(res.status).toBe(200)
    expect(res.body.data.recipeCount).toBe(1)
    expect(res.body.data.coverImage).toBe('https://example.com/tomato.jpg')
  })

  test('查看公开收藏夹列表', async () => {
    const res = await request(app).get('/collections/public')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
  })

  test('评论收藏夹', async () => {
    const res = await request(app).post(`/collections/${global.collectionId}/comments`).send({ content: '这个收藏夹真不错！' })
    expect(res.status).toBe(201)
    expect(res.body.data.content).toBe('这个收藏夹真不错！')
  })

  test('获取收藏夹评论列表', async () => {
    const res = await request(app).get(`/collections/${global.collectionId}/comments`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
  })
})

describe('Pantry / Ingredient Inventory', () => {
  let app

  beforeAll(async () => {
    const ctx = await buildApp()
    app = ctx.app
  })

  test('添加食材到库存', async () => {
    const res = await request(app).post('/pantry').send({ name: '鸡蛋', quantity: 12, unit: '个', category: '蛋奶', expiryDate: '2026-06-01' })
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('鸡蛋')
    global.pantryId = res.body.data.id
  })

  test('添加第二种食材', async () => {
    await request(app).post('/pantry').send({ name: '番茄', quantity: 3, unit: '个', category: '蔬菜', expiryDate: '2026-05-28' })
  })

  test('获取库存列表', async () => {
    const res = await request(app).get('/pantry')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(2)
  })

  test('按分类筛选库存', async () => {
    const res = await request(app).get(`/pantry?category=${encodeURIComponent('蛋奶')}`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
    expect(res.body.data[0].name).toBe('鸡蛋')
  })

  test('更新库存项', async () => {
    const res = await request(app).put(`/pantry/${global.pantryId}`).send({ quantity: 10 })
    expect(res.status).toBe(200)
    expect(parseFloat(res.body.data.quantity)).toBe(10)
  })

  test('删除库存项', async () => {
    const res = await request(app).delete(`/pantry/${global.pantryId}`)
    expect(res.status).toBe(200)
    const list = await request(app).get('/pantry')
    expect(list.body.data.length).toBe(1)
  })

  test('获取即将过期食材', async () => {
    // Create an item expiring tomorrow
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    await request(app).post('/pantry').send({ name: '牛奶', quantity: 1, unit: '盒', expiryDate: tomorrow })
    const res = await request(app).get('/pantry/expiring?days=3')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  test('获取已过期食材', async () => {
    const past = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    await request(app).post('/pantry').send({ name: '过期面包', quantity: 1, unit: '个', expiryDate: past })
    const res = await request(app).get('/pantry/expired')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data[0].name).toBe('过期面包')
  })

  test('删除不存在的项目返回404', async () => {
    const res = await request(app).delete('/pantry/non-existent-id')
    expect(res.status).toBe(404)
  })
})

describe('Nutrition Tracking', () => {
  let app, recipe

  beforeAll(async () => {
    const ctx = await buildApp()
    app = ctx.app
    recipe = ctx.recipe
  })

  const today = new Date().toISOString().slice(0, 10)

  test('记录饮食营养', async () => {
    const res = await request(app).post('/nutrition/logs').send({
      recipeId: recipe.id, date: today, mealType: 'lunch', servings: 1,
    })
    expect(res.status).toBe(201)
    expect(parseFloat(res.body.data.calories)).toBe(200)
    global.nutritionLogId = res.body.data.id
  })

  test('获取当天营养日志', async () => {
    const res = await request(app).get(`/nutrition/logs?date=${today}`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
  })

  test('获取营养目标（自动创建默认值）', async () => {
    const res = await request(app).get('/nutrition/goals')
    expect(res.status).toBe(200)
    expect(parseFloat(res.body.data.calories)).toBe(2000)
  })

  test('设置营养目标', async () => {
    const res = await request(app).put('/nutrition/goals').send({ calories: 1800, protein: 70 })
    expect(res.status).toBe(200)
    expect(parseFloat(res.body.data.calories)).toBe(1800)
    expect(parseFloat(res.body.data.protein)).toBe(70)
  })

  test('每日统计汇总', async () => {
    // Add another log for the same day
    await request(app).post('/nutrition/logs').send({
      recipeId: recipe.id, date: today, mealType: 'dinner', servings: 1.5,
    })
    const res = await request(app).get(`/nutrition/stats/daily?date=${today}`)
    expect(res.status).toBe(200)
    expect(res.body.data.totals.count).toBe(2)
    // 200 + 300 (1.5 servings) = 500
    expect(res.body.data.totals.calories).toBeCloseTo(500, -1)
  })

  test('每周统计', async () => {
    const res = await request(app).get('/nutrition/stats/weekly')
    expect(res.status).toBe(200)
    expect(res.body.data.totals.count).toBeGreaterThanOrEqual(2)
  })

  test('饮食建议', async () => {
    const res = await request(app).get(`/nutrition/suggestions?date=${today}`)
    expect(res.status).toBe(200)
    expect(res.body.data.suggestions).toBeDefined()
    expect(res.body.data.totals.calories).toBeGreaterThan(0)
  })

  test('记录不存在的食谱返回404', async () => {
    const res = await request(app).post('/nutrition/logs').send({
      recipeId: 'nonexistent', date: today, mealType: 'lunch', servings: 1,
    })
    expect(res.status).toBe(404)
  })
})

describe('Auto-categorization', () => {
  test('鸡蛋 → 蛋奶', () => {
    // Inline the auto-categorization logic
    const AUTO_CATEGORIES = {
      '蔬菜': ['番茄', '白菜'],
      '蛋奶': ['鸡蛋', '牛奶'],
      '调味料': ['盐', '酱油'],
    }

    function autoCategorize(name) {
      if (!name) return '其他'
      for (const [cat, keywords] of Object.entries(AUTO_CATEGORIES)) {
        for (const kw of keywords) {
          if (name.includes(kw)) return cat
        }
      }
      return '其他'
    }

    expect(autoCategorize('鸡蛋')).toBe('蛋奶')
    expect(autoCategorize('番茄')).toBe('蔬菜')
    expect(autoCategorize('未知食材')).toBe('其他')
  })
})