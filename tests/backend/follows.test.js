'use strict'

/**
 * tests/backend/follows.test.js
 * 用户关注系统测试
 *
 * 覆盖：
 *   POST /api/users/:id/follow         — 关注
 *   DELETE /api/users/:id/follow       — 取消关注
 *   GET  /api/users/:id/followers      — 粉丝列表
 *   GET  /api/users/:id/following      — 关注列表
 *   GET  /api/users/:id/follow-status  — 关注状态
 *   GET  /api/users/:id/stats          — 统计含 followersCount/followingCount
 */

// ── 环境变量 ──
process.env.NODE_ENV = 'test'
process.env.DB_DIALECT = 'sqlite'
process.env.DB_STORAGE = ':memory:'
process.env.JWT_SECRET = 'test-secret-key-for-follows-test'
process.env.JWT_EXPIRES_IN = '1h'
process.env.CORS_ORIGIN = '*'
process.env.RATE_LIMIT_WINDOW_MS = '900000'
process.env.RATE_LIMIT_MAX = '1000'

const request = require('supertest')
const app = require('../../backend/app')
const db = require('../../backend/models')

let user1Token, user2Token, user3Token
let user1Id, user2Id, user3Id

beforeAll(async () => {
  await db.sequelize.sync({ force: true })

  const res1 = await request(app)
    .post('/api/auth/register')
    .send({ username: 'follow_user1', password: '123456', email: 'follow1@test.com' })
  user1Token = res1.body.data.token
  user1Id = res1.body.data.user.id

  const res2 = await request(app)
    .post('/api/auth/register')
    .send({ username: 'follow_user2', password: '123456', email: 'follow2@test.com' })
  user2Token = res2.body.data.token
  user2Id = res2.body.data.user.id

  const res3 = await request(app)
    .post('/api/auth/register')
    .send({ username: 'follow_user3', password: '123456', email: 'follow3@test.com' })
  user3Token = res3.body.data.token
  user3Id = res3.body.data.user.id
})

afterAll(async () => {
  await db.sequelize.close()
})

// ─────────────────────────────────────────────────────────────────
// 关注基础操作
// ─────────────────────────────────────────────────────────────────

describe('Follow - 关注基础操作', () => {
  test('user1 关注 user2 → 201', async () => {
    const res = await request(app)
      .post(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`)

    expect(res.status).toBe(201)
    expect(res.body.code).toBe(0)
    expect(res.body.data.followed).toBe(true)
  })

  test('重复关注 → 200 幂等返回已关注', async () => {
    const res = await request(app)
      .post(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.followed).toBe(true)
  })

  test('user2 关注 user1 → 201', async () => {
    const res = await request(app)
      .post(`/api/users/${user1Id}/follow`)
      .set('Authorization', `Bearer ${user2Token}`)

    expect(res.status).toBe(201)
    expect(res.body.data.followed).toBe(true)
  })

  test('不能关注自己 → 400', async () => {
    const res = await request(app)
      .post(`/api/users/${user1Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`)

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
  })

  test('未登录关注 → 401', async () => {
    const res = await request(app)
      .post(`/api/users/${user2Id}/follow`)

    expect(res.status).toBe(401)
  })

  test('关注不存在的用户 → 404', async () => {
    const res = await request(app)
      .post('/api/users/00000000-0000-0000-0000-000000000000/follow')
      .set('Authorization', `Bearer ${user1Token}`)

    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────
// 关注状态
// ─────────────────────────────────────────────────────────────────

describe('Follow - 关注状态', () => {
  test('user1 查看 user2 → isFollowing=true', async () => {
    const res = await request(app)
      .get(`/api/users/${user2Id}/follow-status`)
      .set('Authorization', `Bearer ${user1Token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.isFollowing).toBe(true)
  })

  test('user1 查看 user3 → isFollowing=false', async () => {
    const res = await request(app)
      .get(`/api/users/${user3Id}/follow-status`)
      .set('Authorization', `Bearer ${user1Token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.isFollowing).toBe(false)
  })

  test('未登录查看 follow-status → 401', async () => {
    const res = await request(app)
      .get(`/api/users/${user2Id}/follow-status`)

    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────
// 关注列表
// ─────────────────────────────────────────────────────────────────

describe('Follow - 关注列表', () => {
  test('user1 的关注列表 → 包含 user2', async () => {
    const res = await request(app)
      .get(`/api/users/${user1Id}/following`)

    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(1)
    expect(res.body.data.list[0].id).toBe(user2Id)
    expect(res.body.data.list[0]).toHaveProperty('username')
    expect(res.body.data.list[0]).toHaveProperty('followedAt')
  })

  test('user2 的粉丝列表 → 包含 user1', async () => {
    const res = await request(app)
      .get(`/api/users/${user2Id}/followers`)

    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(1)
    expect(res.body.data.list[0].id).toBe(user1Id)
  })

  test('user3 的关注/粉丝都为空', async () => {
    const [followingRes, followersRes] = await Promise.all([
      request(app).get(`/api/users/${user3Id}/following`),
      request(app).get(`/api/users/${user3Id}/followers`)
    ])

    expect(followingRes.body.data.total).toBe(0)
    expect(followersRes.body.data.total).toBe(0)
  })

  test('不存在的用户 → 404', async () => {
    const res = await request(app)
      .get('/api/users/00000000-0000-0000-0000-000000000000/followers')

    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────
// 取消关注
// ─────────────────────────────────────────────────────────────────

describe('Follow - 取消关注', () => {
  test('user1 取消关注 user2 → 200', async () => {
    const res = await request(app)
      .delete(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.followed).toBe(false)
  })

  test('取消后关注列表为空', async () => {
    const res = await request(app)
      .get(`/api/users/${user1Id}/following`)

    expect(res.body.data.total).toBe(0)
  })

  test('取消未关注的用户 → 404', async () => {
    const res = await request(app)
      .delete(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`)

    expect(res.status).toBe(404)
  })

  test('取消关注不存在的用户 → 404', async () => {
    const res = await request(app)
      .delete('/api/users/00000000-0000-0000-0000-000000000000/follow')
      .set('Authorization', `Bearer ${user1Token}`)

    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────
// 统计接口
// ─────────────────────────────────────────────────────────────────

describe('Follow - 用户统计', () => {
  beforeAll(async () => {
    await request(app)
      .post(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`)

    await request(app)
      .post(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user3Token}`)
  })

  test('user2 的 followersCount=2, followingCount=1', async () => {
    const res = await request(app)
      .get(`/api/users/${user2Id}/stats`)

    expect(res.status).toBe(200)
    expect(res.body.data.followersCount).toBe(2)
    expect(res.body.data.followingCount).toBe(1)
  })

  test('user1 的 followersCount=1, followingCount=1', async () => {
    const res = await request(app)
      .get(`/api/users/${user1Id}/stats`)

    expect(res.status).toBe(200)
    expect(res.body.data.followersCount).toBe(1)
    expect(res.body.data.followingCount).toBe(1)
  })

  test('不存在的用户 stats → 404', async () => {
    const res = await request(app)
      .get('/api/users/00000000-0000-0000-0000-000000000000/stats')

    expect(res.status).toBe(404)
  })
})