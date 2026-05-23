'use strict'

/**
 * 后端 API 测试 - 用户路由
 * 覆盖: GET /api/users/:id/profile, GET /api/users/:id/recipes
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
const { v4: uuidv4 } = require('uuid')
const db = require('../../backend/models')

const USER_A_ID = uuidv4()
const USER_B_ID = uuidv4()

beforeEach(async () => {
  await db.sequelize.sync({ force: true })
  await db.User.create({ id: USER_A_ID, username: 'userA', email: 'a@test.com', nickname: '用户A' })
  await db.User.create({ id: USER_B_ID, username: 'userB', email: 'b@test.com', nickname: '用户B' })

  // 为用户A创建3条食谱
  for (let i = 1; i <= 3; i++) {
    await db.Recipe.create({
      id: uuidv4(),
      title: `用户A的食谱${i}`,
      author: '用户A',
      cookTime: 10 * i,
      category: 'chinese',
      userId: USER_A_ID
    })
  }

  // 为用户B收藏2条食谱
  const aRecipes = await db.Recipe.findAll({ where: { userId: USER_A_ID } })
  for (let i = 0; i < Math.min(2, aRecipes.length); i++) {
    await db.Favorite.create({ id: uuidv4(), userId: USER_B_ID, recipeId: aRecipes[i].id, isDeleted: false })
  }

  // 为用户B添加1条评论
  await db.Comment.create({
    id: 1,
    content: '好菜！',
    rating: 5,
    userId: USER_B_ID,
    recipeId: aRecipes[0].id
  })
})

afterAll(async () => {
  await db.sequelize.close()
})

// ─────────────────────────────────────────────────────────────────
// GET /api/users/:id/profile — 用户信息
// ─────────────────────────────────────────────────────────────────
describe('GET /api/users/:id/profile — 用户信息', () => {
  test('应返回用户基本信息', async () => {
    const res = await request(app).get(`/api/users/${USER_A_ID}/profile`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.username).toBe('userA')
    expect(res.body.data.nickname).toBe('用户A')
    expect(res.body.data.id).toBe(USER_A_ID)
  })

  test('不应返回密码字段', async () => {
    const res = await request(app).get(`/api/users/${USER_A_ID}/profile`)

    expect(res.body.data.password).toBeUndefined()
    expect(res.body.data.email).toBeUndefined()
  })

  test('不存在的用户应返回 404', async () => {
    const fakeId = uuidv4()
    const res = await request(app).get(`/api/users/${fakeId}/profile`)

    expect(res.status).toBe(404)
    expect(res.body.code).toBe(404)
    expect(res.body.message).toContain('不存在')
  })

  test('无效 ID 应返回 500 或 404', async () => {
    const res = await request(app).get('/api/users/invalid-id/profile')

    // 无效 UUID 可能触发数据库错误或返回404
    expect([404, 500]).toContain(res.status)
  })
})

// ─────────────────────────────────────────────────────────────────
// GET /api/users/:id/recipes — 用户发布的食谱
// ─────────────────────────────────────────────────────────────────
describe('GET /api/users/:id/recipes — 用户食谱列表', () => {
  test('应返回用户的食谱列表', async () => {
    const res = await request(app).get(`/api/users/${USER_A_ID}/recipes`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.list).toHaveLength(3)
    expect(res.body.data.total).toBe(3)
  })

  test('无食谱的用户应返回空列表', async () => {
    const res = await request(app).get(`/api/users/${USER_B_ID}/recipes`)

    expect(res.status).toBe(200)
    expect(res.body.data.list).toHaveLength(0)
    expect(res.body.data.total).toBe(0)
  })

  test('应支持分页参数', async () => {
    const res = await request(app)
      .get(`/api/users/${USER_A_ID}/recipes`)
      .query({ page: 1, pageSize: 2 })

    expect(res.status).toBe(200)
    expect(res.body.data.list).toHaveLength(2)
    expect(res.body.data.total).toBe(3)
    expect(res.body.data.page).toBe(1)
    expect(res.body.data.pageSize).toBe(2)
  })

  test('第二页应返回剩余食谱', async () => {
    const res = await request(app)
      .get(`/api/users/${USER_A_ID}/recipes`)
      .query({ page: 2, pageSize: 2 })

    expect(res.status).toBe(200)
    expect(res.body.data.list).toHaveLength(1)
  })

  test('不存在的用户应返回 404', async () => {
    const fakeId = uuidv4()
    const res = await request(app).get(`/api/users/${fakeId}/recipes`)

    expect(res.status).toBe(404)
  })

  test('食谱应按创建时间倒序', async () => {
    const res = await request(app).get(`/api/users/${USER_A_ID}/recipes`)

    const list = res.body.data.list
    for (let i = 1; i < list.length; i++) {
      const prev = new Date(list[i - 1].createdAt)
      const curr = new Date(list[i].createdAt)
      expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime())
    }
  })

  test('食谱应包含必要字段', async () => {
    const res = await request(app).get(`/api/users/${USER_A_ID}/recipes`)

    const recipe = res.body.data.list[0]
    expect(recipe.id).toBeDefined()
    expect(recipe.title).toBeDefined()
    expect(recipe.author).toBeDefined()
    expect(recipe.cookTime).toBeDefined()
    expect(recipe.category).toBeDefined()
    expect(recipe.userId).toBe(USER_A_ID)
  })

  test('不应返回食谱的完整内容字段', async () => {
    const res = await request(app).get(`/api/users/${USER_A_ID}/recipes`)

    const recipe = res.body.data.list[0]
    // 列表接口不应返回完整的步骤和食材
    expect(recipe.steps).toBeUndefined()
    expect(recipe.ingredients).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────
// GET /api/users/:id/stats — 用户烹饪统计
// ─────────────────────────────────────────────────────────────────
describe('GET /api/users/:id/stats — 用户统计', () => {
  test('应返回用户统计信息', async () => {
    const res = await request(app).get(`/api/users/${USER_B_ID}/stats`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.recipeCount).toBe(0)
    expect(res.body.data.favoriteCount).toBe(2)
    expect(res.body.data.commentCount).toBe(1)
  })

  test('零统计用户应返回 0 计数', async () => {
    const res = await request(app).get(`/api/users/${USER_A_ID}/stats`)

    expect(res.status).toBe(200)
    expect(res.body.data.recipeCount).toBe(3)
    expect(res.body.data.favoriteCount).toBe(0)
    expect(res.body.data.commentCount).toBe(0)
  })

  test('不存在的用户应返回 404', async () => {
    const res = await request(app).get(`/api/users/${uuidv4()}/stats`)

    expect(res.status).toBe(404)
  })

  test('应包含所有三个统计字段', async () => {
    const res = await request(app).get(`/api/users/${USER_B_ID}/stats`)

    expect(res.body.data).toHaveProperty('userId')
    expect(res.body.data).toHaveProperty('recipeCount')
    expect(res.body.data).toHaveProperty('favoriteCount')
    expect(res.body.data).toHaveProperty('commentCount')
  })
})

// ─────────────────────────────────────────────────────────────────
// GET /api/users/:id/favorites — 用户收藏的食谱
// ─────────────────────────────────────────────────────────────────
describe('GET /api/users/:id/favorites — 用户收藏食谱', () => {
  test('应返回用户收藏的食谱列表', async () => {
    const res = await request(app).get(`/api/users/${USER_B_ID}/favorites`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.list).toHaveLength(2)
    expect(res.body.data.total).toBe(2)
  })

  test('无收藏的用户应返回空列表', async () => {
    const res = await request(app).get(`/api/users/${USER_A_ID}/favorites`)

    expect(res.status).toBe(200)
    expect(res.body.data.list).toHaveLength(0)
    expect(res.body.data.total).toBe(0)
  })

  test('应支持分页', async () => {
    const res = await request(app)
      .get(`/api/users/${USER_B_ID}/favorites`)
      .query({ page: 1, pageSize: 1 })

    expect(res.status).toBe(200)
    expect(res.body.data.list).toHaveLength(1)
    expect(res.body.data.total).toBe(2)
  })

  test('不存在的用户应返回 404', async () => {
    const res = await request(app).get(`/api/users/${uuidv4()}/favorites`)

    expect(res.status).toBe(404)
  })

  test('不应包含软删除的收藏', async () => {
    // 软删除一条收藏
    const favs = await db.Favorite.findAll({ where: { userId: USER_B_ID } })
    await favs[0].update({ isDeleted: true })

    const res = await request(app).get(`/api/users/${USER_B_ID}/favorites`)

    expect(res.body.data.list).toHaveLength(1)
    expect(res.body.data.total).toBe(1)
  })
})
