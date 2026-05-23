'use strict'

/**
 * tests/backend/feed.test.js
 * 动态流测试
 *
 * 覆盖：
 *   GET /api/feed                    — 关注用户动态（需认证）
 *   GET /api/users/:id/activities    — 用户活动记录
 *   活动类型：create_recipe, comment, favorite, follow
 */

// ── 环境变量 ──
process.env.NODE_ENV = 'test'
process.env.DB_DIALECT = 'sqlite'
process.env.DB_STORAGE = ':memory:'
process.env.JWT_SECRET = 'test-secret-key-for-feed-test'
process.env.JWT_EXPIRES_IN = '1h'
process.env.CORS_ORIGIN = '*'
process.env.RATE_LIMIT_WINDOW_MS = '900000'
process.env.RATE_LIMIT_MAX = '1000'

const request = require('supertest')
const app = require('../../backend/app')
const db = require('../../backend/models')

let user1Token, user2Token, user1Id, user2Id
let recipeId

beforeAll(async () => {
  await db.sequelize.sync({ force: true })

  const r1 = await request(app)
    .post('/api/auth/register')
    .send({ username: 'feed_user1', password: '123456' })
  user1Token = r1.body.data.token
  user1Id = r1.body.data.user.id

  const r2 = await request(app)
    .post('/api/auth/register')
    .send({ username: 'feed_user2', password: '123456' })
  user2Token = r2.body.data.token
  user2Id = r2.body.data.user.id

  // user1 创建食谱
  const recipeRes = await request(app)
    .post('/api/recipes')
    .set('Authorization', `Bearer ${user1Token}`)
    .send({
      title: 'Feed测试食谱',
      description: '测试动态流',
      category: 'chinese',
      ingredients: [{ name: '材料', amount: 1, unit: '份' }],
      steps: [{ stepNumber: 1, content: '步骤1' }]
    })
  recipeId = recipeRes.body.data.id

  // user1 关注 user2
  await request(app)
    .post(`/api/users/${user2Id}/follow`)
    .set('Authorization', `Bearer ${user1Token}`)

  // user2 创建食谱
  const r = await request(app)
    .post('/api/recipes')
    .set('Authorization', `Bearer ${user2Token}`)
    .send({
      title: 'user2的食谱',
      description: 'feed测试',
      category: 'western',
      ingredients: [{ name: '牛肉', amount: 200, unit: 'g' }],
      steps: [{ stepNumber: 1, content: '煎牛排' }]
    })

  // user1 收藏 user2 食谱
  await request(app)
    .post('/api/favorites')
    .set('Authorization', `Bearer ${user1Token}`)
    .send({ recipeId: r.body.data.id })

  // user1 评论 user2 食谱
  await request(app)
    .post(`/api/recipes/${r.body.data.id}/comments`)
    .set('Authorization', `Bearer ${user1Token}`)
    .send({ content: '看起来很好吃！', rating: 5 })

  await new Promise(r => setTimeout(r, 100))
})

afterAll(async () => {
  await db.sequelize.close()
})

// ─────────────────────────────────────────────────────────────────
// 动态流
// ─────────────────────────────────────────────────────────────────

describe('Feed - 动态流', () => {
  test('user1 获取 feed → 返回 user2 的活动', async () => {
    const res = await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${user1Token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data).toHaveProperty('list')
    expect(res.body.data).toHaveProperty('total')
    expect(res.body.data).toHaveProperty('hasMore')
    const activities = res.body.data.list
    const createRecipeActivities = activities.filter(a => a.type === 'create_recipe')
    expect(createRecipeActivities.length).toBeGreaterThanOrEqual(1)
  })

  test('每个活动项包含 user 信息', async () => {
    const res = await request(app)
      .get('/api/feed?pageSize=10')
      .set('Authorization', `Bearer ${user1Token}`)

    for (const activity of res.body.data.list) {
      expect(activity).toHaveProperty('userId')
      expect(activity).toHaveProperty('type')
      expect(activity).toHaveProperty('createdAt')
    }
  })

  test('未登录获取 feed → 401', async () => {
    const res = await request(app).get('/api/feed')
    expect(res.status).toBe(401)
  })

  test('分页参数正常工作', async () => {
    const res = await request(app)
      .get('/api/feed?page=1&pageSize=2')
      .set('Authorization', `Bearer ${user1Token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.list.length).toBeLessThanOrEqual(2)
  })
})

// ─────────────────────────────────────────────────────────────────
// 用户活动记录
// ─────────────────────────────────────────────────────────────────

describe('Feed - 用户活动记录', () => {
  test('user1 的活动记录包含 create_recipe, follow, favorite, comment', async () => {
    const res = await request(app)
      .get(`/api/users/${user1Id}/activities`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)

    const types = res.body.data.list.map(a => a.type)
    expect(types).toContain('create_recipe')
    expect(types).toContain('follow')
    expect(types).toContain('favorite')
    expect(types).toContain('comment')
  })

  test('user2 的活动记录包含 create_recipe', async () => {
    const res = await request(app)
      .get(`/api/users/${user2Id}/activities`)

    expect(res.status).toBe(200)
    const types = res.body.data.list.map(a => a.type)
    expect(types).toContain('create_recipe')
  })

  test('活动记录分页正常', async () => {
    const res = await request(app)
      .get(`/api/users/${user1Id}/activities?page=1&pageSize=2`)

    expect(res.status).toBe(200)
    expect(res.body.data.list.length).toBeLessThanOrEqual(2)
  })

  test('不存在的用户 → 404', async () => {
    const res = await request(app)
      .get('/api/users/00000000-0000-0000-0000-000000000000/activities')

    expect(res.status).toBe(404)
  })
})