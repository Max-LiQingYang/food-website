'use strict'

/**
 * 后端 API 测试 - 购物清单（ShoppingList）功能
 * 覆盖: 生成（合并食材）、列表、更新、权限校验
 *
 * API 端点:
 * POST   /api/shopping-list/generate    — 从食谱 ID 生成购物清单（合并同名食材）
 * GET    /api/shopping-list             — 当前用户的购物清单列表
 * PUT    /api/shopping-list/:id          — 更新购物清单 {name?, items?}
 */

process.env.NODE_ENV = 'test'
process.env.DB_DIALECT = 'sqlite'
process.env.DB_STORAGE = ':memory:'
process.env.JWT_SECRET = 'test-secret-key-for-testing-only'
process.env.JWT_EXPIRES_IN = '1h'
process.env.CORS_ORIGIN = '*'
process.env.RATE_LIMIT_WINDOW_MS = '900000'
process.env.RATE_LIMIT_MAX = '1000'

const app = require('../../backend/app')
const request = require('supertest')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const db = require('../../backend/models')

function makeToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' })
}

const USER_A_ID = uuidv4()
const USER_B_ID = uuidv4()

// 测试食谱，含完整的 ingredients JSON
const RECIPE_TOMATO_EGG_ID = uuidv4()
const RECIPE_EGG_SOUP_ID = uuidv4()
const RECIPE_NO_INGREDIENTS_ID = uuidv4()

beforeEach(async () => {
  await db.sequelize.sync({ force: true })
  await db.User.create({ id: USER_A_ID, username: 'userA', email: 'a@test.com' })
  await db.User.create({ id: USER_B_ID, username: 'userB', email: 'b@test.com' })
  await db.Recipe.create({
    id: RECIPE_TOMATO_EGG_ID, title: '番茄炒蛋', author: '家常', cookTime: 10,
    ingredients: JSON.stringify([
      { name: '番茄', amount: 2, unit: '个' },
      { name: '鸡蛋', amount: 3, unit: '个' },
      { name: '葱', amount: 1, unit: '根' }
    ])
  })
  await db.Recipe.create({
    id: RECIPE_EGG_SOUP_ID, title: '番茄蛋汤', author: '家常', cookTime: 15,
    ingredients: JSON.stringify([
      { name: '番茄', amount: 1, unit: '个' },
      { name: '鸡蛋', amount: 2, unit: '个' }
    ])
  })
  await db.Recipe.create({
    id: RECIPE_NO_INGREDIENTS_ID, title: '无食材食谱', author: '怪厨', cookTime: 5,
    ingredients: '[]'
  })
})

afterAll(async () => {
  await db.sequelize.close()
})

// ─────────────────────────────────────────────────────────────────
// POST /api/shopping-list/generate
// ─────────────────────────────────────────────────────────────────
describe('POST /api/shopping-list/generate — 生成购物清单', () => {
  test('应正确合并同名食材', async () => {
    const res = await request(app)
      .post('/api/shopping-list/generate')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ recipeIds: [RECIPE_TOMATO_EGG_ID, RECIPE_EGG_SOUP_ID] })

    expect(res.status).toBe(201)
    expect(res.body.code).toBe(0)

    const items = res.body.data.items
    expect(items).toBeInstanceOf(Array)

    // 番茄：2 + 1 = 3
    const tomato = items.find(i => i.name === '番茄')
    expect(tomato).toBeDefined()
    expect(tomato.amount).toBe(3)
    expect(tomato.unit).toBe('个')
    expect(tomato.checked).toBe(false)

    // 鸡蛋：3 + 2 = 5
    const egg = items.find(i => i.name === '鸡蛋')
    expect(egg).toBeDefined()
    expect(egg.amount).toBe(5)

    // 葱：只在第一个食谱中有
    const scallion = items.find(i => i.name === '葱')
    expect(scallion).toBeDefined()
    expect(scallion.amount).toBe(1)
  })

  test('单个食谱也应生成清单', async () => {
    const res = await request(app)
      .post('/api/shopping-list/generate')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ recipeIds: [RECIPE_TOMATO_EGG_ID] })

    expect(res.status).toBe(201)
    expect(res.body.data.items).toHaveLength(3)
  })

  test('无食材的食谱应返回 400', async () => {
    const res = await request(app)
      .post('/api/shopping-list/generate')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ recipeIds: [RECIPE_NO_INGREDIENTS_ID] })

    expect(res.status).toBe(400)
  })

  test('空 recipeIds 应返回 400', async () => {
    const res = await request(app)
      .post('/api/shopping-list/generate')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ recipeIds: [] })

    expect(res.status).toBe(400)
  })

  test('缺少 recipeIds 字段应返回 400', async () => {
    const res = await request(app)
      .post('/api/shopping-list/generate')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({})

    expect(res.status).toBe(400)
  })

  test('不存在的食谱 ID 应返回 404', async () => {
    const res = await request(app)
      .post('/api/shopping-list/generate')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ recipeIds: [uuidv4()] })

    expect(res.status).toBe(404)
  })

  test('无 token 应返回 401', async () => {
    const res = await request(app)
      .post('/api/shopping-list/generate')
      .send({ recipeIds: [RECIPE_TOMATO_EGG_ID] })

    expect(res.status).toBe(401)
  })

  test('重复生成应追加到最近清单', async () => {
    const token = makeToken(USER_A_ID)

    // 第一次生成
    await request(app)
      .post('/api/shopping-list/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeIds: [RECIPE_TOMATO_EGG_ID] })

    // 第二次生成（应该追加）
    const res = await request(app)
      .post('/api/shopping-list/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeIds: [RECIPE_EGG_SOUP_ID] })

    expect(res.status).toBe(201)

    const items = res.body.data.items
    // 番茄应该是之前3个，追加1个过 = 4个（第一次 2 + 第二次 1 + ... ）
    // 实际上合并逻辑是：已有清单的番茄 2 + 新食谱的番茄 1 = 3
    // 哦不，是从已有清单的 items 和新 recipe 合并
    // 已有清单 items: 番茄 2 + 鸡蛋 3 + 葱 1
    // 新食谱: 番茄 1 + 鸡蛋 2
    // 结果: 番茄 3, 鸡蛋 5, 葱 1
    const tomato = items.find(i => i.name === '番茄')
    expect(tomato.amount).toBe(3)
    expect(items).toHaveLength(3)
  })
})

// ─────────────────────────────────────────────────────────────────
// GET /api/shopping-list — 购物清单列表
// ─────────────────────────────────────────────────────────────────
describe('GET /api/shopping-list — 购物清单列表', () => {
  test('应返回用户的购物清单', async () => {
    const token = makeToken(USER_A_ID)
    await request(app)
      .post('/api/shopping-list/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeIds: [RECIPE_TOMATO_EGG_ID] })

    const res = await request(app)
      .get('/api/shopping-list')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0]).toHaveProperty('name')
    expect(res.body.data[0]).toHaveProperty('items')
    expect(res.body.data[0].items).toBeInstanceOf(Array)
  })

  test('不同用户的购物清单互不可见', async () => {
    await request(app)
      .post('/api/shopping-list/generate')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ recipeIds: [RECIPE_TOMATO_EGG_ID] })

    await request(app)
      .post('/api/shopping-list/generate')
      .set('Authorization', `Bearer ${makeToken(USER_B_ID)}`)
      .send({ recipeIds: [RECIPE_TOMATO_EGG_ID] })

    const resA = await request(app)
      .get('/api/shopping-list').set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
    const resB = await request(app)
      .get('/api/shopping-list').set('Authorization', `Bearer ${makeToken(USER_B_ID)}`)

    expect(resA.body.data).toHaveLength(1)
    expect(resB.body.data).toHaveLength(1)
  })

  test('无购物清单应返回空数组', async () => {
    const res = await request(app)
      .get('/api/shopping-list')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    expect(res.data || res.body.data).toHaveLength(0)
  })

  test('无 token 应返回 401', async () => {
    const res = await request(app).get('/api/shopping-list')
    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────
// PUT /api/shopping-list/:id — 更新购物清单
// ─────────────────────────────────────────────────────────────────
describe('PUT /api/shopping-list/:id — 更新购物清单', () => {
  let listId

  beforeEach(async () => {
    const token = makeToken(USER_A_ID)
    const res = await request(app)
      .post('/api/shopping-list/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeIds: [RECIPE_TOMATO_EGG_ID] })
    listId = res.body.data.id
  })

  test('更新 items（标记已购）应返回 200', async () => {
    const updatedItems = [
      { name: '番茄', amount: 2, unit: '个', checked: true },
      { name: '鸡蛋', amount: 3, unit: '个', checked: false },
      { name: '葱', amount: 1, unit: '根', checked: false }
    ]

    const res = await request(app)
      .put(`/api/shopping-list/${listId}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ items: updatedItems })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)

    const items = res.body.data.items
    const tomato = items.find(i => i.name === '番茄')
    expect(tomato.checked).toBe(true)
  })

  test('更新名称应返回 200', async () => {
    const res = await request(app)
      .put(`/api/shopping-list/${listId}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ name: '新名称' })

    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('新名称')
  })

  test('更新他人的购物清单应返回 404', async () => {
    const res = await request(app)
      .put(`/api/shopping-list/${listId}`)
      .set('Authorization', `Bearer ${makeToken(USER_B_ID)}`)
      .send({ name: '别人的清单' })

    expect(res.status).toBe(404)
  })

  test('不存在的 id 应返回 404', async () => {
    const res = await request(app)
      .put(`/api/shopping-list/${uuidv4()}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ name: '不存在的' })

    expect(res.status).toBe(404)
  })

  test('空字段应返回 400', async () => {
    const res = await request(app)
      .put(`/api/shopping-list/${listId}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({})

    expect(res.status).toBe(400)
  })

  test('无 token 应返回 401', async () => {
    const res = await request(app)
      .put(`/api/shopping-list/${listId}`)
      .send({ name: '无认证' })

    expect(res.status).toBe(401)
  })
})