'use strict'

/**
 * 后端 API 测试 - 食谱分享功能
 * 覆盖: GET /api/recipes/:id/share
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
const { v4: uuidv4 } = require('uuid')
const db = require('../../backend/models')

const RECIPE_ID = uuidv4()

beforeEach(async () => {
  await db.sequelize.sync({ force: true })
  await db.Recipe.create({
    id: RECIPE_ID,
    title: '番茄炒蛋',
    description: '经典家常菜，简单美味',
    author: '家常大厨',
    cookTime: 10,
    category: 'chinese',
    servings: 2,
    difficulty: 'easy'
  })
})

afterAll(async () => {
  await db.sequelize.close()
})

// ─────────────────────────────────────────────────────────────────
// GET /api/recipes/:id/share — 获取分享信息
// ─────────────────────────────────────────────────────────────────
describe('GET /api/recipes/:id/share — 获取分享信息', () => {
  test('应返回分享信息', async () => {
    const res = await request(app)
      .get(`/api/recipes/${RECIPE_ID}/share`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.title).toBe('番茄炒蛋')
    expect(res.body.data.description).toBe('经典家常菜，简单美味')
    expect(res.body.data.shareUrl).toContain(`/recipe/${RECIPE_ID}`)
    expect(res.body.data.shareText).toContain('番茄炒蛋')
  })

  test('不存在的食谱应返回 404', async () => {
    const res = await request(app)
      .get(`/api/recipes/${uuidv4()}/share`)

    expect(res.status).toBe(404)
  })

  test('分享接口无需认证', async () => {
    const res = await request(app)
      .get(`/api/recipes/${RECIPE_ID}/share`)

    expect(res.status).toBe(200)
  })

  test('shareUrl 应包含完整路径', async () => {
    const res = await request(app)
      .get(`/api/recipes/${RECIPE_ID}/share`)

    expect(res.body.data.shareUrl).toContain('/recipe/')
    expect(res.body.data.shareUrl).not.toContain('undefined')
  })

  test('shareText 应包含标题和链接', async () => {
    const res = await request(app)
      .get(`/api/recipes/${RECIPE_ID}/share`)

    expect(res.body.data.shareText).toContain('番茄炒蛋')
    expect(res.body.data.shareText).toContain('http')
  })
})