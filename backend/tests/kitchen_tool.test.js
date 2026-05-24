'use strict'

/**
 * tests/kitchen_tool.test.js
 * 厨房工具系统 — API 测试
 */

const request = require('supertest')
const express = require('express')
const { Sequelize, DataTypes } = require('sequelize')

const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })

const KitchenTool = sequelize.define('KitchenTool', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, defaultValue: 'basic' },
  icon: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
  essential: { type: DataTypes.BOOLEAN, defaultValue: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'kitchen_tools', timestamps: false })

const RecipeTool = sequelize.define('RecipeTool', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  recipeId: { type: DataTypes.UUID, allowNull: false },
  toolId: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'recipe_tools', timestamps: false })

const UserTool = sequelize.define('UserTool', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.STRING, allowNull: false },
  toolId: { type: DataTypes.UUID, allowNull: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'user_tools', timestamps: false })

const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'recipes', timestamps: false })

KitchenTool.hasMany(RecipeTool, { foreignKey: 'toolId' })
RecipeTool.belongsTo(KitchenTool, { foreignKey: 'toolId' })

// UserTool 关联
KitchenTool.hasMany(UserTool, { foreignKey: 'toolId' })
UserTool.belongsTo(KitchenTool, { foreignKey: 'toolId' })

const mockAuth = (req, res, next) => { req.user = { userId: 'test-user' }; next() }
const mockToken = 'test-token'

function createApp() {
  const app = express()
  app.use(express.json())

  // 公开：工具列表
  app.get('/api/tools', async (req, res) => {
    const where = {}
    if (req.query.category) where.category = req.query.category
    if (req.query.essential === 'true') where.essential = true
    const list = await KitchenTool.findAll({ where, order: [['category', 'ASC'], ['name', 'ASC']] })
    res.json({ code: 0, data: { list, total: list.length } })
  })

  // 公开：食谱工具
  app.get('/api/recipes/:recipeId/tools', async (req, res) => {
    const tools = await RecipeTool.findAll({
      where: { recipeId: req.params.recipeId },
      include: [{ model: KitchenTool }],
    })
    const toolList = tools.map(rt => rt.KitchenTool).filter(Boolean)
    res.json({ code: 0, data: { list: toolList, total: toolList.length } })
  })

  // 认证：创建工具
  app.post('/api/tools', mockAuth, async (req, res) => {
    const tool = await KitchenTool.create(req.body)
    res.status(201).json({ code: 0, data: tool })
  })

  // 认证：关联工具到食谱
  app.post('/api/recipes/:recipeId/tools', mockAuth, async (req, res) => {
    const existing = await RecipeTool.findOne({ where: { recipeId: req.params.recipeId, toolId: req.body.toolId } })
    if (existing) return res.status(400).json({ code: 400, message: '已关联' })
    const link = await RecipeTool.create({ recipeId: req.params.recipeId, toolId: req.body.toolId })
    res.status(201).json({ code: 0, data: link })
  })

  // 认证：用户工具库
  app.get('/api/my-tools', mockAuth, async (req, res) => {
    const userTools = await UserTool.findAll({
      where: { userId: req.user.userId },
      include: [{ model: KitchenTool }],
    })
    res.json({ code: 0, data: { list: userTools.map(ut => ut.KitchenTool).filter(Boolean), total: userTools.length } })
  })

  app.post('/api/my-tools', mockAuth, async (req, res) => {
    const existing = await UserTool.findOne({ where: { userId: req.user.userId, toolId: req.body.toolId } })
    if (existing) return res.status(400).json({ code: 400, message: '已添加' })
    await UserTool.create({ userId: req.user.userId, toolId: req.body.toolId })
    res.status(201).json({ code: 0, message: '工具添加成功' })
  })

  app.delete('/api/my-tools/:toolId', mockAuth, async (req, res) => {
    await UserTool.destroy({ where: { userId: req.user.userId, toolId: req.params.toolId } })
    res.json({ code: 0, message: '工具已移除' })
  })

  app.get('/api/recipes/:recipeId/missing-tools', mockAuth, async (req, res) => {
    const recipeTools = await RecipeTool.findAll({
      where: { recipeId: req.params.recipeId },
      include: [{ model: KitchenTool }],
    })
    const neededTools = recipeTools.map(rt => rt.KitchenTool).filter(Boolean)
    if (!neededTools.length) return res.json({ code: 0, data: { list: [], total: 0, message: '无需特殊工具' } })
    const userTools = await UserTool.findAll({
      where: { userId: req.user.userId },
      include: [{ model: KitchenTool }],
    })
    const ownedIds = new Set(userTools.map(ut => ut.toolId))
    const missing = neededTools.filter(t => !ownedIds.has(t.id))
    res.json({ code: 0, data: { list: missing, total: missing.length } })
  })

  return app
}

describe('厨房工具接口', () => {
  let app, toolId, recipeId

  beforeAll(async () => {
    await sequelize.sync({ force: true })
    const recipe = await Recipe.create({ title: '需要工具的食谱' })
    recipeId = recipe.id
    app = createApp()
  })

  test('创建工具', async () => {
    const res = await request(app)
      .post('/api/tools')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({ name: '不粘锅', category: 'cooking', icon: '🍳', essential: true })
    expect(res.status).toBe(201)
    toolId = res.body.data.id
  })

  test('获取工具列表', async () => {
    const res = await request(app).get('/api/tools')
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(1)
  })

  test('按分类筛选工具', async () => {
    const res = await request(app).get('/api/tools?category=cooking')
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(1)
  })

  test('筛选必备工具', async () => {
    const res = await request(app).get('/api/tools?essential=true')
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(1)
  })

  test('关联工具到食谱', async () => {
    const res = await request(app)
      .post(`/api/recipes/${recipeId}/tools`)
      .set('Authorization', `Bearer ${mockToken}`)
      .send({ toolId })
    expect(res.status).toBe(201)
  })

  test('重复关联返回400', async () => {
    const res = await request(app)
      .post(`/api/recipes/${recipeId}/tools`)
      .set('Authorization', `Bearer ${mockToken}`)
      .send({ toolId })
    expect(res.status).toBe(400)
  })

  test('获取食谱工具', async () => {
    const res = await request(app).get(`/api/recipes/${recipeId}/tools`)
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(1)
  })

  test('用户工具库为空', async () => {
    const res = await request(app)
      .get('/api/my-tools')
      .set('Authorization', `Bearer ${mockToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(0)
  })

  test('添加工具到用户库', async () => {
    const res = await request(app)
      .post('/api/my-tools')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({ toolId })
    expect(res.status).toBe(201)
  })

  test('再次添加同一工具返回400', async () => {
    const res = await request(app)
      .post('/api/my-tools')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({ toolId })
    expect(res.status).toBe(400)
  })

  test('用户工具库包含已添加工具', async () => {
    const res = await request(app)
      .get('/api/my-tools')
      .set('Authorization', `Bearer ${mockToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(1)
    expect(res.body.data.list[0].name).toBe('不粘锅')
  })

  test('删除用户工具', async () => {
    const res = await request(app)
      .delete(`/api/my-tools/${toolId}`)
      .set('Authorization', `Bearer ${mockToken}`)
    expect(res.status).toBe(200)
    const res2 = await request(app)
      .get('/api/my-tools')
      .set('Authorization', `Bearer ${mockToken}`)
    expect(res2.body.data.total).toBe(0)
  })

  test('缺少工具检测', async () => {
    // 用户已删除工具，食谱需要但不粘锅但用户没有
    const res = await request(app)
      .get(`/api/recipes/${recipeId}/missing-tools`)
      .set('Authorization', `Bearer ${mockToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.list.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.list[0].name).toBe('不粘锅')
  })
})