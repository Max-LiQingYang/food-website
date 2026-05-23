'use strict'

/**
 * 后端 API 测试 - 收藏夹（Collection）功能
 * 覆盖: CRUD + 食谱添加/移除 + 权限校验
 *
 * API 端点:
 * POST   /api/collections                     — 创建收藏夹 {name, description?}
 * GET    /api/collections                     — 用户收藏夹列表（含食谱数）
 * GET    /api/collections/:id                 — 收藏夹详情（含分页食谱列表）
 * PUT    /api/collections/:id                 — 更新收藏夹
 * DELETE /api/collections/:id                 — 删除收藏夹（级联）
 * POST   /api/collections/:id/recipes         — 添加食谱（幂等）
 * DELETE /api/collections/:id/recipes/:recipeId — 移除食谱
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
const RECIPE_ID = uuidv4()
const RECIPE_B_ID = uuidv4()

beforeEach(async () => {
  await db.sequelize.sync({ force: true })
  await db.User.create({ id: USER_A_ID, username: 'userA', email: 'a@test.com' })
  await db.User.create({ id: USER_B_ID, username: 'userB', email: 'b@test.com' })
  await db.Recipe.create({ id: RECIPE_ID, title: '测试食谱A', author: '大厨', cookTime: 30 })
  await db.Recipe.create({ id: RECIPE_B_ID, title: '测试食谱B', author: '二厨', cookTime: 20 })
})

afterAll(async () => {
  await db.sequelize.close()
})

// ─────────────────────────────────────────────────────────────────
// POST /api/collections — 创建收藏夹
// ─────────────────────────────────────────────────────────────────
describe('POST /api/collections — 创建收藏夹', () => {
  test('正常创建应返回 201', async () => {
    const res = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ name: '我的最爱', description: '最爱的食谱' })

    expect(res.status).toBe(201)
    expect(res.body.code).toBe(0)
    expect(res.body.data.name).toBe('我的最爱')
    expect(res.body.data.description).toBe('最爱的食谱')
    expect(res.body.data.userId).toBe(USER_A_ID)
  })

  test('只传 name 也应该成功', async () => {
    const res = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ name: '简单收藏夹' })

    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('简单收藏夹')
    expect(res.body.data.description).toBeNull()
  })

  test('缺少 name 应返回 400', async () => {
    const res = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ description: '没名字' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
    expect(res.body.message).toContain('不能为空')
  })

  test('空 name 应返回 400', async () => {
    const res = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ name: '' })

    expect(res.status).toBe(400)
  })

  test('无 token 应返回 401', async () => {
    const res = await request(app)
      .post('/api/collections')
      .send({ name: '未登录收藏夹' })

    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────
// GET /api/collections — 收藏夹列表
// ─────────────────────────────────────────────────────────────────
describe('GET /api/collections — 收藏夹列表', () => {
  test('应返回该用户的所有收藏夹', async () => {
    const token = makeToken(USER_A_ID)
    await request(app)
      .post('/api/collections').set('Authorization', `Bearer ${token}`)
      .send({ name: '收藏夹A' })
    await request(app)
      .post('/api/collections').set('Authorization', `Bearer ${token}`)
      .send({ name: '收藏夹B' })

    const res = await request(app)
      .get('/api/collections')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data).toHaveLength(2)
  })

  test('应包含 recipeCount 字段', async () => {
    const token = makeToken(USER_A_ID)
    const createRes = await request(app)
      .post('/api/collections').set('Authorization', `Bearer ${token}`)
      .send({ name: '带数量的收藏夹' })

    const collectionId = createRes.body.data.id

    // 添加一个食谱到收藏夹
    await request(app)
      .post(`/api/collections/${collectionId}/recipes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: RECIPE_ID })

    const res = await request(app)
      .get('/api/collections')
      .set('Authorization', `Bearer ${token}`)

    expect(res.body.data[0].recipeCount).toBe(1)
    expect(res.body.data[0].recipes).toBeUndefined()
  })

  test('不同用户应互不可见', async () => {
    await request(app)
      .post('/api/collections').set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ name: '用户A的收藏夹' })
    await request(app)
      .post('/api/collections').set('Authorization', `Bearer ${makeToken(USER_B_ID)}`)
      .send({ name: '用户B的收藏夹' })

    const resA = await request(app)
      .get('/api/collections').set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
    const resB = await request(app)
      .get('/api/collections').set('Authorization', `Bearer ${makeToken(USER_B_ID)}`)

    expect(resA.body.data).toHaveLength(1)
    expect(resA.body.data[0].name).toBe('用户A的收藏夹')
    expect(resB.body.data).toHaveLength(1)
    expect(resB.body.data[0].name).toBe('用户B的收藏夹')
  })

  test('无收藏夹应返回空数组', async () => {
    const res = await request(app)
      .get('/api/collections')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  test('无 token 应返回 401', async () => {
    const res = await request(app).get('/api/collections')
    expect(res.status).toBe(401)
  })

  test('应按 createdAt DESC 排序', async () => {
    const token = makeToken(USER_A_ID)
    await request(app)
      .post('/api/collections').set('Authorization', `Bearer ${token}`)
      .send({ name: '第一个' })
    await new Promise(r => setTimeout(r, 50))
    await request(app)
      .post('/api/collections').set('Authorization', `Bearer ${token}`)
      .send({ name: '第二个' })

    const res = await request(app)
      .get('/api/collections').set('Authorization', `Bearer ${token}`)

    expect(res.body.data[0].name).toBe('第二个')
    expect(res.body.data[1].name).toBe('第一个')
  })
})

// ─────────────────────────────────────────────────────────────────
// GET /api/collections/:id — 收藏夹详情（含食谱列表）
// ─────────────────────────────────────────────────────────────────
describe('GET /api/collections/:id — 收藏夹详情', () => {
  let collectionId

  beforeEach(async () => {
    const token = makeToken(USER_A_ID)
    const createRes = await request(app)
      .post('/api/collections').set('Authorization', `Bearer ${token}`)
      .send({ name: '详情测试夹' })
    collectionId = createRes.body.data.id
    await request(app)
      .post(`/api/collections/${collectionId}/recipes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: RECIPE_ID })
    await request(app)
      .post(`/api/collections/${collectionId}/recipes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: RECIPE_B_ID })
  })

  test('应返回收藏夹信息及食谱列表', async () => {
    const res = await request(app)
      .get(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.name).toBe('详情测试夹')
    expect(res.body.data.recipes).toHaveLength(2)
    expect(res.body.data.totalRecipes).toBe(2)
    expect(res.body.data.recipes[0]).toHaveProperty('title')
  })

  test('访问他人的收藏夹应返回 404', async () => {
    const res = await request(app)
      .get(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${makeToken(USER_B_ID)}`)

    expect(res.status).toBe(404)
  })

  test('不存在的 id 应返回 404', async () => {
    const res = await request(app)
      .get(`/api/collections/${uuidv4()}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    expect(res.status).toBe(404)
  })

  test('无 token 应返回 401', async () => {
    const res = await request(app).get(`/api/collections/${collectionId}`)
    expect(res.status).toBe(401)
  })

  test('食谱列表应支持分页', async () => {
    const res = await request(app)
      .get(`/api/collections/${collectionId}?pageSize=1&page=1`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.data.recipes).toHaveLength(1)
    expect(res.body.data.totalRecipes).toBe(2)
    expect(res.body.data.page).toBe(1)
    expect(res.body.data.pageSize).toBe(1)
  })

  test('空收藏夹应返回空食谱列表', async () => {
    const token = makeToken(USER_B_ID)
    const cr = await request(app)
      .post('/api/collections').set('Authorization', `Bearer ${token}`)
      .send({ name: '空收藏夹' })

    const res = await request(app)
      .get(`/api/collections/${cr.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.recipes).toEqual([])
    expect(res.body.data.totalRecipes).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────
// PUT /api/collections/:id — 更新收藏夹
// ─────────────────────────────────────────────────────────────────
describe('PUT /api/collections/:id — 更新收藏夹', () => {
  let collectionId

  beforeEach(async () => {
    const token = makeToken(USER_A_ID)
    const res = await request(app)
      .post('/api/collections').set('Authorization', `Bearer ${token}`)
      .send({ name: '原名', description: '原描述' })
    collectionId = res.body.data.id
  })

  test('更新名称应返回 200', async () => {
    const res = await request(app)
      .put(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ name: '新名称' })

    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('新名称')
    expect(res.body.data.description).toBe('原描述')
  })

  test('更新描述应返回 200', async () => {
    const res = await request(app)
      .put(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ description: '新描述' })

    expect(res.status).toBe(200)
    expect(res.body.data.description).toBe('新描述')
  })

  test('别人更新应返回 404', async () => {
    const res = await request(app)
      .put(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${makeToken(USER_B_ID)}`)
      .send({ name: '别人改的' })

    expect(res.status).toBe(404)
  })

  test('不传任何字段应返回 400', async () => {
    const res = await request(app)
      .put(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({})

    expect(res.status).toBe(400)
  })

  test('无 token 应返回 401', async () => {
    const res = await request(app)
      .put(`/api/collections/${collectionId}`)
      .send({ name: '无认证' })

    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────
// DELETE /api/collections/:id — 删除收藏夹（级联）
// ─────────────────────────────────────────────────────────────────
describe('DELETE /api/collections/:id — 删除收藏夹', () => {
  let collectionId

  beforeEach(async () => {
    const token = makeToken(USER_A_ID)
    const res = await request(app)
      .post('/api/collections').set('Authorization', `Bearer ${token}`)
      .send({ name: '待删收藏夹' })
    collectionId = res.body.data.id
    await request(app)
      .post(`/api/collections/${collectionId}/recipes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: RECIPE_ID })
  })

  test('正常删除应返回 200', async () => {
    const res = await request(app)
      .delete(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
  })

  test('删除后关联食谱应自动清理', async () => {
    await request(app)
      .delete(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    // 关联表应无对应记录
    const colRecs = await db.sequelize.query(
      `SELECT * FROM collection_recipes WHERE collectionId = :id`,
      { replacements: { id: collectionId }, type: db.sequelize.QueryTypes.SELECT }
    )
    expect(colRecs).toHaveLength(0)

    // 食谱本身不应被删除
    const recipe = await db.Recipe.findByPk(RECIPE_ID)
    expect(recipe).not.toBeNull()
  })

  test('别人删除应返回 404', async () => {
    const res = await request(app)
      .delete(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${makeToken(USER_B_ID)}`)

    expect(res.status).toBe(404)
  })

  test('无 token 应返回 401', async () => {
    const res = await request(app)
      .delete(`/api/collections/${collectionId}`)
    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────
// POST /api/collections/:id/recipes — 添加食谱
// ─────────────────────────────────────────────────────────────────
describe('POST /api/collections/:id/recipes — 添加食谱', () => {
  let collectionId

  beforeEach(async () => {
    const token = makeToken(USER_A_ID)
    const res = await request(app)
      .post('/api/collections').set('Authorization', `Bearer ${token}`)
      .send({ name: '添加测试夹' })
    collectionId = res.body.data.id
  })

  test('添加食谱应返回 201', async () => {
    const res = await request(app)
      .post(`/api/collections/${collectionId}/recipes`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ recipeId: RECIPE_ID })

    expect(res.status).toBe(201)
    expect(res.body.code).toBe(0)
    expect(res.body.message).toBe('已添加')
  })

  test('重复添加应幂等返回 200', async () => {
    await request(app)
      .post(`/api/collections/${collectionId}/recipes`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ recipeId: RECIPE_ID })

    const res = await request(app)
      .post(`/api/collections/${collectionId}/recipes`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ recipeId: RECIPE_ID })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.message).toBe('已在收藏夹中')
  })

  test('缺少 recipeId 应返回 400', async () => {
    const res = await request(app)
      .post(`/api/collections/${collectionId}/recipes`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({})

    expect(res.status).toBe(400)
  })

  test('添加到他人收藏夹应返回 404', async () => {
    const res = await request(app)
      .post(`/api/collections/${collectionId}/recipes`)
      .set('Authorization', `Bearer ${makeToken(USER_B_ID)}`)
      .send({ recipeId: RECIPE_ID })

    expect(res.status).toBe(404)
  })

  test('添加不存在的食谱应返回 404', async () => {
    const res = await request(app)
      .post(`/api/collections/${collectionId}/recipes`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ recipeId: uuidv4() })

    expect(res.status).toBe(404)
    expect(res.body.message).toContain('食谱不存在')
  })
})

// ─────────────────────────────────────────────────────────────────
// DELETE /api/collections/:id/recipes/:recipeId — 移除食谱
// ─────────────────────────────────────────────────────────────────
describe('DELETE /api/collections/:id/recipes/:recipeId — 移除食谱', () => {
  let collectionId

  beforeEach(async () => {
    const token = makeToken(USER_A_ID)
    const res = await request(app)
      .post('/api/collections').set('Authorization', `Bearer ${token}`)
      .send({ name: '移除测试夹' })
    collectionId = res.body.data.id
    await request(app)
      .post(`/api/collections/${collectionId}/recipes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: RECIPE_ID })
  })

  test('正常移除应返回 200', async () => {
    const res = await request(app)
      .delete(`/api/collections/${collectionId}/recipes/${RECIPE_ID}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
  })

  test('移除后确认列表减少', async () => {
    await request(app)
      .delete(`/api/collections/${collectionId}/recipes/${RECIPE_ID}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    const detail = await request(app)
      .get(`/api/collections/${collectionId}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    expect(detail.body.data.recipes).toHaveLength(0)
  })

  test('从他人收藏夹移除应返回 404', async () => {
    const res = await request(app)
      .delete(`/api/collections/${collectionId}/recipes/${RECIPE_ID}`)
      .set('Authorization', `Bearer ${makeToken(USER_B_ID)}`)

    expect(res.status).toBe(404)
  })

  test('移除不存在的食谱（幂等）应返回 200', async () => {
    const res = await request(app)
      .delete(`/api/collections/${collectionId}/recipes/${uuidv4()}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    expect(res.status).toBe(200)
  })

  test('无 token 应返回 401', async () => {
    const res = await request(app)
      .delete(`/api/collections/${collectionId}/recipes/${RECIPE_ID}`)

    expect(res.status).toBe(401)
  })
})