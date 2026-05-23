'use strict'

/**
 * 后端 API 测试 - 认证功能（注册、登录、获取当前用户）
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
const db = require('../../backend/models')

function makeToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' })
}

beforeEach(async () => {
  await db.sequelize.sync({ force: true })
})

afterAll(async () => {
  await db.sequelize.close()
})

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/register — 注册
// ─────────────────────────────────────────────────────────────────
describe('POST /api/auth/register — 用户注册', () => {
  test('正常注册应返回 201 + token + user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'newuser', password: 'pass123', email: 'new@test.com', nickname: '新用户' })

    expect(res.status).toBe(201)
    expect(res.body.code).toBe(0)
    expect(res.body.data).toHaveProperty('token')
    expect(res.body.data.user).toMatchObject({
      username: 'newuser',
      email: 'new@test.com',
      nickname: '新用户',
      role: 'user'
    })
    expect(res.body.data.user).toHaveProperty('id')
    expect(res.body.data.user).toHaveProperty('createdAt')
    // 不应返回密码
    expect(res.body.data.user).not.toHaveProperty('password')
  })

  test('不含邮箱也应注册成功', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'noemail', password: 'pass123' })

    expect(res.status).toBe(201)
    expect(res.body.code).toBe(0)
    expect(res.body.data.user.username).toBe('noemail')
    expect(res.body.data.user.email).toBeNull()
  })

  test('缺少用户名应返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'pass123' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
  })

  test('缺少密码应返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user1' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
  })

  test('重复用户名应返回 4001', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'dup_user', password: 'pass123' })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'dup_user', password: 'pass456' })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe(4001)
  })

  test('重复邮箱应返回 4003', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'user1', password: 'pass123', email: 'dup@test.com' })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user2', password: 'pass456', email: 'dup@test.com' })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe(4003)
  })

  test('返回的 token 应可验证', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'tokenuser', password: 'pass123' })

    const { token } = res.body.data
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    expect(decoded).toHaveProperty('userId')
    expect(decoded.username).toBe('tokenuser')
  })
})

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/login — 登录
// ─────────────────────────────────────────────────────────────────
describe('POST /api/auth/login — 用户登录', () => {
  beforeEach(async () => {
    // 注册一个测试用户
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'loginuser', password: 'mypass123', email: 'login@test.com', nickname: '登录用户' })
  })

  test('用用户名登录应返回 200 + token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'mypass123' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data).toHaveProperty('token')
    expect(res.body.data.user.username).toBe('loginuser')
  })

  test('用邮箱登录应返回 200 + token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'mypass123' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.user.username).toBe('loginuser')
  })

  test('密码错误应返回 4002', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'wrongpass' })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe(4002)
  })

  test('不存在的用户名应返回 4002', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nonexistent', password: 'mypass123' })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe(4002)
  })

  test('缺少用户名和密码应返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
  })

  test('登录不应返回密码字段', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'mypass123' })

    expect(res.body.data.user).not.toHaveProperty('password')
  })
})

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/me — 获取当前用户信息
// ─────────────────────────────────────────────────────────────────
describe('GET /api/auth/me — 获取当前用户', () => {
  let userId

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'meuser', password: 'pass123', email: 'me@test.com', nickname: 'Me用户' })
    userId = res.body.data.user.id
  })

  test('有效 token 应返回用户信息', async () => {
    const token = makeToken(userId)
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data).toMatchObject({
      username: 'meuser',
      email: 'me@test.com',
      nickname: 'Me用户',
      role: 'user'
    })
  })

  test('无 token 应返回 401', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.code).toBe(401)
  })

  test('无效 token 应返回 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here')

    expect(res.status).toBe(401)
    expect(res.body.code).toBe(401)
  })

  test('已删除用户的 token 应返回 404', async () => {
    const token = makeToken(userId)
    // 删除用户
    await db.User.destroy({ where: { id: userId } })

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
    expect(res.body.code).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────
// 修改密码
// ─────────────────────────────────────────────────────────────────
describe('PUT /api/auth/change-password — 修改密码', () => {
  let token
  const testUsername = 'change_pw_test'

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: testUsername, password: 'old123456' })
    token = res.body.data.token
  })

  test('正确修改密码 → 200', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'old123456', newPassword: 'new654321' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
  })

  test('修改密码后旧密码不可用 + 新密码可用', async () => {
    // 修改密码
    await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'old123456', newPassword: 'new654321' })

    // 新密码应可用
    const newPwRes = await request(app)
      .post('/api/auth/login')
      .send({ username: testUsername, password: 'new654321' })
    expect(newPwRes.status).toBe(200)

    // 旧密码应不可用
    const oldPwRes = await request(app)
      .post('/api/auth/login')
      .send({ username: testUsername, password: 'old123456' })
    expect(oldPwRes.status).toBe(401)
  })

  test('旧密码错误 → 401', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrong', newPassword: 'new123' })

    expect(res.status).toBe(401)
  })

  test('新密码太短 → 400', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'new654321', newPassword: '123' })

    expect(res.status).toBe(400)
  })

  test('缺少参数 → 400', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(400)
  })

  test('未登录 → 401', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .send({ currentPassword: 'test', newPassword: 'test123456' })

    expect(res.status).toBe(401)
  })
})
