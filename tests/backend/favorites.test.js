'use strict'

/**
 * 后端 API 测试 - 收藏功能
 * 覆盖: GET/POST/DELETE /api/favorites, 收藏状态查询, 收藏计数
 */

// ── 环境变量 ──
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
const favoriteService = require('../../backend/services/favoriteService')

function makeToken(userId, extra = {}) {
  return jwt.sign({ userId, ...extra }, process.env.JWT_SECRET, { expiresIn: '1h' })
}

const USER_A_ID = uuidv4()
const USER_B_ID = uuidv4()
const RECIPE_ID = uuidv4()
const RECIPE_B_ID = uuidv4()

beforeEach(async () => {
  await db.sequelize.sync({ force: true })
  // 清除缓存
  favoriteService.clearCache()
  // 创建测试用户
  await db.User.create({ id: USER_A_ID, username: 'userA', email: 'a@test.com', nickname: '用户A' })
  await db.User.create({ id: USER_B_ID, username: 'userB', email: 'b@test.com', nickname: '用户B' })
  // 创建测试食谱
  await db.Recipe.create({
    id: RECIPE_ID,
    title: '测试食谱',
    author: '用户A',
    cookTime: 30,
    category: 'chinese',
    userId: USER_A_ID
  })
  await db.Recipe.create({
    id: RECIPE_B_ID,
    title: '测试食谱B',
    author: '用户A',
    cookTime: 20,
    category: 'western',
    userId: USER_A_ID
  })
})

afterAll(async () => {
  await db.sequelize.close()
})

// ─────────────────────────────────────────────────────────────────
// POST /api/favorites — 添加收藏
// ─────────────────────────────────────────────────────────────────
describe('POST /api/favorites — 添加收藏', () => {
  test('应成功收藏食谱并返回 201', async () => {
    const token = makeToken(USER_B_ID)
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: RECIPE_ID })

    expect(res.status).toBe(201)
    expect(res.body.code).toBe(0)
    expect(res.body.message).toBe('收藏成功')
  })

  test('重复收藏应幂等返回 200', async () => {
    const token = makeToken(USER_B_ID)

    // 第一次收藏
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: RECIPE_ID })

    // 第二次收藏（幂等）
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: RECIPE_ID })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.message).toBe('已收藏')
  })

  test('未登录应返回 401', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .send({ recipeId: RECIPE_ID })

    expect(res.status).toBe(401)
  })

  test('recipeId 为空应返回 400', async () => {
    const token = makeToken(USER_B_ID)
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('recipeId')
  })

  test('recipeId 格式无效应返回 400', async () => {
    const token = makeToken(USER_B_ID)
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: 'not-a-valid-uuid' })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('格式无效')
  })
})

// ─────────────────────────────────────────────────────────────────
// GET /api/favorites — 收藏列表
// ─────────────────────────────────────────────────────────────────
describe('GET /api/favorites — 收藏列表', () => {
  test('应返回分页收藏列表', async () => {
    const token = makeToken(USER_B_ID)

    // 先收藏两个食谱
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: RECIPE_ID })
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: RECIPE_B_ID })

    favoriteService.clearCache()

    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.list).toHaveLength(2)
    expect(res.body.data.total).toBe(2)
  })

  test('未登录应返回 401', async () => {
    const res = await request(app).get('/api/favorites')
    expect(res.status).toBe(401)
  })

  test('无收藏应返回空列表', async () => {
    const token = makeToken(USER_B_ID)
    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.list).toHaveLength(0)
    expect(res.body.data.total).toBe(0)
  })

  test('收藏列表应包含食谱信息', async () => {
    const token = makeToken(USER_B_ID)
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: RECIPE_ID })

    favoriteService.clearCache()

    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${token}`)

    const item = res.body.data.list[0]
    expect(item.recipe).toBeDefined()
    expect(item.recipe.title).toBe('测试食谱')
    expect(item.recipeId).toBe(RECIPE_ID)
  })
})

// ─────────────────────────────────────────────────────────────────
// DELETE /api/favorites/:recipeId — 取消收藏
// ─────────────────────────────────────────────────────────────────
describe('DELETE /api/favorites/:recipeId — 取消收藏', () => {
  test('应成功取消收藏', async () => {
    const token = makeToken(USER_B_ID)

    // 先收藏
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: RECIPE_ID })

    // 取消收藏
    const res = await request(app)
      .delete(`/api/favorites/${RECIPE_ID}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.message).toContain('取消收藏')
  })

  test('未收藏时取消应幂等返回 200', async () => {
    const token = makeToken(USER_B_ID)
    const res = await request(app)
      .delete(`/api/favorites/${RECIPE_ID}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toContain('未收藏')
  })

  test('未登录应返回 401', async () => {
    const res = await request(app)
      .delete(`/api/favorites/${RECIPE_ID}`)

    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────
// GET /api/favorites/:recipeId/status — 收藏状态
// ─────────────────────────────────────────────────────────────────
describe('GET /api/favorites/:recipeId/status — 收藏状态', () => {
  test('已收藏应返回 isFavorited: true', async () => {
    const token = makeToken(USER_B_ID)
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: RECIPE_ID })

    const res = await request(app)
      .get(`/api/favorites/${RECIPE_ID}/status`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.isFavorited).toBe(true)
    expect(res.body.data.favoriteId).toBeDefined()
  })

  test('未收藏应返回 isFavorited: false', async () => {
    const token = makeToken(USER_B_ID)
    const res = await request(app)
      .get(`/api/favorites/${RECIPE_ID}/status`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.isFavorited).toBe(false)
    expect(res.body.data.favoriteId).toBeNull()
  })

  test('取消收藏后应返回 isFavorited: false', async () => {
    const token = makeToken(USER_B_ID)
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: RECIPE_ID })

    await request(app)
      .delete(`/api/favorites/${RECIPE_ID}`)
      .set('Authorization', `Bearer ${token}`)

    const res = await request(app)
      .get(`/api/favorites/${RECIPE_ID}/status`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.body.data.isFavorited).toBe(false)
  })

  test('未登录应返回 401', async () => {
    const res = await request(app)
      .get(`/api/favorites/${RECIPE_ID}/status`)

    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────
// GET /api/favorites/:recipeId/count — 收藏计数
// ─────────────────────────────────────────────────────────────────
describe('GET /api/favorites/:recipeId/count — 收藏计数', () => {
  test('应返回正确的收藏计数', async () => {
    const tokenA = makeToken(USER_A_ID)
    const tokenB = makeToken(USER_B_ID)

    // 两个用户都收藏
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ recipeId: RECIPE_ID })
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ recipeId: RECIPE_ID })

    // count 接口也需要认证（挂载在 auth 路由下）
    const res = await request(app)
      .get(`/api/favorites/${RECIPE_ID}/count`)
      .set('Authorization', `Bearer ${tokenA}`)

    expect(res.status).toBe(200)
    expect(res.body.data.count).toBe(2)
    expect(res.body.data.recipeId).toBe(RECIPE_ID)
  })

  test('无收藏时应返回 0', async () => {
    const token = makeToken(USER_B_ID)
    const res = await request(app)
      .get(`/api/favorites/${RECIPE_ID}/count`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.count).toBe(0)
  })

  test('取消收藏后计数应减少', async () => {
    const tokenA = makeToken(USER_A_ID)
    const tokenB = makeToken(USER_B_ID)

    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ recipeId: RECIPE_ID })
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ recipeId: RECIPE_ID })

    // 用户A取消收藏
    await request(app)
      .delete(`/api/favorites/${RECIPE_ID}`)
      .set('Authorization', `Bearer ${tokenA}`)

    const res = await request(app)
      .get(`/api/favorites/${RECIPE_ID}/count`)
      .set('Authorization', `Bearer ${tokenB}`)

    expect(res.body.data.count).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────
// 边界场景
// ─────────────────────────────────────────────────────────────────
describe('收藏功能 — 边界场景', () => {
  test('不同用户收藏互不影响', async () => {
    const tokenA = makeToken(USER_A_ID)
    const tokenB = makeToken(USER_B_ID)

    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ recipeId: RECIPE_ID })

    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ recipeId: RECIPE_ID })

    // 用户A取消
    await request(app)
      .delete(`/api/favorites/${RECIPE_ID}`)
      .set('Authorization', `Bearer ${tokenA}`)

    // 用户B仍应为已收藏
    const res = await request(app)
      .get(`/api/favorites/${RECIPE_ID}/status`)
      .set('Authorization', `Bearer ${tokenB}`)

    expect(res.body.data.isFavorited).toBe(true)
  })

  test('收藏后取消再收藏应恢复', async () => {
    const token = makeToken(USER_B_ID)

    // 收藏
    const r1 = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: RECIPE_ID })
    expect(r1.status).toBe(201)

    // 取消
    await request(app)
      .delete(`/api/favorites/${RECIPE_ID}`)
      .set('Authorization', `Bearer ${token}`)

    // 再收藏
    const r2 = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: RECIPE_ID })
    expect(r2.status).toBe(201)
    expect(r2.body.message).toBe('收藏成功')
  })
})
