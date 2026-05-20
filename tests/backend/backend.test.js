/**
 * 后端 API 测试 - 收藏食谱功能
 * 使用真实 Express app + SQLite 内存数据库 + supertest
 *
 * 架构：
 * - 环境变量在 require('app') 之前设置，使 app 连接内存 SQLite
 * - db.sequelize.sync({ force: true }) 在每个测试文件前重建表
 * - JWT token 由 jsonwebtoken 手动签发
 * - 所有测试使用 supertest 调真实 HTTP 端点
 */
'use strict'

// ── 1. 环境变量（必须在加载 app 之前设置）───────────────────────
process.env.NODE_ENV = 'test'
process.env.DB_DIALECT = 'sqlite'
process.env.DB_STORAGE = ':memory:'
process.env.JWT_SECRET = 'test-secret-key-for-testing-only'
process.env.JWT_EXPIRES_IN = '1h'
process.env.CORS_ORIGIN = '*'
process.env.RATE_LIMIT_WINDOW_MS = '900000'
process.env.RATE_LIMIT_MAX = '1000'

// ── 2. 延迟加载 app（让 env 先就绪）─────────────────────────────
const app = require('../../backend/app')

// ── 3. 测试工具 ─────────────────────────────────────────────────
const request = require('supertest')
const { v4: uuidv4 } = require('uuid')
const jwt = require('jsonwebtoken')
const db = require('../../backend/models')
const favoriteService = require('../../backend/services/favoriteService')

// ── 4. 测试 JWT token 生成 ────────────────────────────────────────
function makeToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  })
}

// ── 5. 测试固件（测试用户 + 测试食谱）────────────────────────────
const TEST_USER_ID = uuidv4()
const TEST_USER = { id: TEST_USER_ID, username: 'testuser_jest', email: 'jest@test.com' }

const TEST_RECIPE_ID = uuidv4()
const TEST_RECIPE = {
  id: TEST_RECIPE_ID,
  title: '测试食谱_JEST',
  coverImage: 'https://example.com/test.jpg',
  author: '测试作者',
  cookTime: 30
}

// 第二个食谱（用于分页测试）
const TEST_RECIPE2_ID = uuidv4()

// ── 6. 全局设置/清理 ─────────────────────────────────────────────
// 每个测试前重建表结构，确保数据隔离
beforeEach(async () => {
  await db.sequelize.sync({ force: true })
  favoriteService.clearCache()
})

describe('GET /api/favorites/:recipeId/count — 获取收藏总数', () => {
  const USER_A_ID = uuidv4()
  const USER_B_ID = uuidv4()
  const RECIPE_ID = uuidv4()

  beforeEach(async () => {
    await db.User.create({ id: USER_A_ID, username: 'userA', email: 'a@test.com' })
    await db.User.create({ id: USER_B_ID, username: 'userB', email: 'b@test.com' })
    await db.Recipe.create({ id: RECIPE_ID, title: '热门食谱', author: '大厨', cookTime: 45 })
  })

  test('无收藏时应返回 count: 0', async () => {
    const res = await request(app)
      .get(`/api/favorites/${RECIPE_ID}/count`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.count).toBe(0)
    expect(res.body.data.recipeId).toBe(RECIPE_ID)
  })

  test('1 人收藏应返回 count: 1', async () => {
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ recipeId: RECIPE_ID })

    const res = await request(app)
      .get(`/api/favorites/${RECIPE_ID}/count`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.data.count).toBe(1)
  })

  test('多人收藏应返回正确的总数', async () => {
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ recipeId: RECIPE_ID })

    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(USER_B_ID)}`)
      .send({ recipeId: RECIPE_ID })

    const res = await request(app)
      .get(`/api/favorites/${RECIPE_ID}/count`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.data.count).toBe(2)
  })

  test('取消收藏后 count 应减少（软删除记录不计入）', async () => {
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ recipeId: RECIPE_ID })

    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(USER_B_ID)}`)
      .send({ recipeId: RECIPE_ID })

    // B 取消收藏
    await request(app)
      .delete(`/api/favorites/${RECIPE_ID}`)
      .set('Authorization', `Bearer ${makeToken(USER_B_ID)}`)

    const res = await request(app)
      .get(`/api/favorites/${RECIPE_ID}/count`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.data.count).toBe(1)
  })

  test('重复收藏（幂等）不增加 count', async () => {
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ recipeId: RECIPE_ID })

    // 重复收藏
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ recipeId: RECIPE_ID })

    const res = await request(app)
      .get(`/api/favorites/${RECIPE_ID}/count`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.data.count).toBe(1)
  })

  test('无 token 应返回 401', async () => {
    const res = await request(app)
      .get(`/api/favorites/${RECIPE_ID}/count`)

    expect(res.status).toBe(401)
    expect(res.body.code).toBe(401)
  })

  test('不存在的 recipeId 应返回 count: 0', async () => {
    const nonExistentId = uuidv4()
    const res = await request(app)
      .get(`/api/favorites/${nonExistentId}/count`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.data.count).toBe(0)
  })
})

afterAll(async () => {
  await db.sequelize.close()
})

// ── 7. 每个 describe 块前创建干净数据 ───────────────────────────
describe('POST /api/favorites — 添加收藏', () => {
  beforeEach(async () => {
    await db.User.create(TEST_USER)
    await db.Recipe.create(TEST_RECIPE)
  })

  test('正常添加收藏应返回 201', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)
      .send({ recipeId: TEST_RECIPE_ID })

    expect(res.status).toBe(201)
    expect(res.body.code).toBe(0)
    expect(res.body.message).toBe('收藏成功')
    expect(res.body.data).toHaveProperty('id')
    expect(res.body.data.recipeId).toBe(TEST_RECIPE_ID)
    expect(res.body.data.userId).toBe(TEST_USER_ID)
  })

  test('缺少 recipeId 应返回 400', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
    expect(res.body.message).toBe('recipeId 不能为空')
  })

  test('recipeId 为空字符串应返回 400', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)
      .send({ recipeId: '' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
  })

  test('recipeId UUID 格式错误应返回 400', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)
      .send({ recipeId: 'not-a-valid-uuid' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
    expect(res.body.message).toBe('recipeId 格式无效')
  })

  test('重复收藏应幂等返回 200（不抛错）', async () => {
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)
      .send({ recipeId: TEST_RECIPE_ID })

    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)
      .send({ recipeId: TEST_RECIPE_ID })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.message).toBe('已收藏')
    expect(res.body.data).toBeNull()
  })

  test('无 Authorization header 应返回 401', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .send({ recipeId: TEST_RECIPE_ID })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe(401)
  })

  test('Bearer token 为空应返回 401', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', 'Bearer ')
      .send({ recipeId: TEST_RECIPE_ID })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe(401)
  })

  test('无效 JWT token 应返回 401', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', 'Bearer invalid.token.here')
      .send({ recipeId: TEST_RECIPE_ID })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe(401)
  })

  test('收藏不存在的 recipeId（UUID 格式正确）应幂等返回 201', async () => {
    const nonExistentRecipeId = uuidv4()
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)
      .send({ recipeId: nonExistentRecipeId })

    expect(res.status).toBe(201)
    expect(res.body.code).toBe(0)
    expect(res.body.data.recipeId).toBe(nonExistentRecipeId)
  })
})

describe('DELETE /api/favorites/:recipeId — 取消收藏', () => {
  beforeEach(async () => {
    await db.User.create(TEST_USER)
    await db.Recipe.create(TEST_RECIPE)
  })

  test('正常取消收藏应返回 200', async () => {
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)
      .send({ recipeId: TEST_RECIPE_ID })

    const res = await request(app)
      .delete(`/api/favorites/${TEST_RECIPE_ID}`)
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.message).toBe('取消收藏成功')
  })

  test('重复取消（未收藏状态）应幂等返回 200', async () => {
    const res = await request(app)
      .delete(`/api/favorites/${TEST_RECIPE_ID}`)
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.message).toBe('未收藏，无需取消')
  })

  test('取消后重新添加应成功', async () => {
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)
      .send({ recipeId: TEST_RECIPE_ID })

    await request(app)
      .delete(`/api/favorites/${TEST_RECIPE_ID}`)
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)

    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)
      .send({ recipeId: TEST_RECIPE_ID })

    expect(res.status).toBe(201)
    expect(res.body.message).toBe('收藏成功')
  })

  test('无 token 应返回 401', async () => {
    const res = await request(app)
      .delete(`/api/favorites/${TEST_RECIPE_ID}`)

    expect(res.status).toBe(401)
    expect(res.body.code).toBe(401)
  })
})

describe('GET /api/favorites — 获取收藏列表', () => {
  beforeEach(async () => {
    await db.User.create(TEST_USER)
    await db.Recipe.create(TEST_RECIPE)
    await db.Recipe.create({ id: TEST_RECIPE2_ID, title: '第二道食谱', author: '作者B', cookTime: 20 })
  })

  test('正常返回列表应返回 200，含分页字段', async () => {
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)
      .send({ recipeId: TEST_RECIPE_ID })

    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data).toHaveProperty('total')
    expect(res.body.data).toHaveProperty('page')
    expect(res.body.data).toHaveProperty('pageSize')
    expect(res.body.data).toHaveProperty('list')
    expect(Array.isArray(res.body.data.list)).toBe(true)
  })

  test('分页参数 page=2 应正常返回（空列表）', async () => {
    const res = await request(app)
      .get('/api/favorites?page=2&pageSize=10')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.data.page).toBe(2)
    expect(res.body.data.pageSize).toBe(10)
  })

  test('pageSize > 100 应自动限制为 100', async () => {
    const res = await request(app)
      .get('/api/favorites?pageSize=999')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.data.pageSize).toBe(100)
  })

  test('page=0 应自动修正为 1', async () => {
    const res = await request(app)
      .get('/api/favorites?page=0')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.data.page).toBe(1)
  })

  test('空列表应返回空数组（code=0）', async () => {
    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.data.list).toEqual([])
    expect(res.body.data.total).toBe(0)
  })

  test('收藏列表项应包含 Recipe 关联数据', async () => {
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)
      .send({ recipeId: TEST_RECIPE_ID })

    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.data.list.length).toBeGreaterThan(0)
    const item = res.body.data.list[0]
    expect(item).toHaveProperty('id')
    expect(item).toHaveProperty('userId', TEST_USER_ID)
    expect(item).toHaveProperty('recipeId', TEST_RECIPE_ID)
    expect(item).toHaveProperty('recipe')
    expect(item.recipe).toHaveProperty('title', TEST_RECIPE.title)
    expect(item.recipe).toHaveProperty('coverImage', TEST_RECIPE.coverImage)
    expect(item.recipe).toHaveProperty('author', TEST_RECIPE.author)
    expect(item.recipe).toHaveProperty('cookTime', TEST_RECIPE.cookTime)
  })

  test('无 token 应返回 401', async () => {
    const res = await request(app).get('/api/favorites')

    expect(res.status).toBe(401)
    expect(res.body.code).toBe(401)
  })

  test('多条收藏按 createdAt 倒序排列', async () => {
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)
      .send({ recipeId: TEST_RECIPE_ID })

    // 等待一小段时间确保 createdAt 不同
    await new Promise((r) => setTimeout(r, 50))

    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)
      .send({ recipeId: TEST_RECIPE2_ID })

    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.data.list.length).toBe(2)
    // 最新收藏（TEST_RECIPE2_ID）应在最前
    expect(res.body.data.list[0].recipeId).toBe(TEST_RECIPE2_ID)
    expect(res.body.data.list[1].recipeId).toBe(TEST_RECIPE_ID)
  })
})

describe('GET /api/favorites/:recipeId/status — 查询收藏状态', () => {
  beforeEach(async () => {
    await db.User.create(TEST_USER)
    await db.Recipe.create(TEST_RECIPE)
  })

  test('已收藏应返回 isFavorited: true', async () => {
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)
      .send({ recipeId: TEST_RECIPE_ID })

    const res = await request(app)
      .get(`/api/favorites/${TEST_RECIPE_ID}/status`)
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.isFavorited).toBe(true)
    expect(res.body.data.favoriteId).toBeDefined()
  })

  test('未收藏应返回 isFavorited: false，favoriteId 为 null', async () => {
    const res = await request(app)
      .get(`/api/favorites/${TEST_RECIPE_ID}/status`)
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.isFavorited).toBe(false)
    expect(res.body.data.favoriteId).toBeNull()
  })

  test('取消收藏后状态应为 isFavorited: false', async () => {
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)
      .send({ recipeId: TEST_RECIPE_ID })

    await request(app)
      .delete(`/api/favorites/${TEST_RECIPE_ID}`)
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)

    const res = await request(app)
      .get(`/api/favorites/${TEST_RECIPE_ID}/status`)
      .set('Authorization', `Bearer ${makeToken(TEST_USER_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.data.isFavorited).toBe(false)
  })

  test('无 token 应返回 401', async () => {
    const res = await request(app)
      .get(`/api/favorites/${TEST_RECIPE_ID}/status`)

    expect(res.status).toBe(401)
    expect(res.body.code).toBe(401)
  })
})
