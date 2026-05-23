'use strict'

/**
 * 后端 API 测试 - 评论与评分
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
const { CommentLike } = db

function makeToken(userId, extra = {}) {
  return jwt.sign({ userId, ...extra }, process.env.JWT_SECRET, { expiresIn: '1h' })
}

const USER_A_ID = uuidv4()
const USER_B_ID = uuidv4()
const RECIPE_ID = uuidv4()

beforeEach(async () => {
  await db.sequelize.sync({ force: true })
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
})

afterAll(async () => {
  await db.sequelize.close()
})

// ─────────────────────────────────────────────────────────────────
// POST /api/recipes/:recipeId/comments — 发表评论
// ─────────────────────────────────────────────────────────────────
describe('POST /api/recipes/:recipeId/comments — 发表评论', () => {
  test('应成功发表带评分的评论', async () => {
    const token = makeToken(USER_B_ID)
    const res = await request(app)
      .post(`/api/recipes/${RECIPE_ID}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '非常好吃！', rating: 5 })

    expect(res.status).toBe(201)
    expect(res.body.code).toBe(0)
    expect(res.body.data.content).toBe('非常好吃！')
    expect(res.body.data.rating).toBe(5)
    expect(res.body.data.userId).toBe(USER_B_ID)
    expect(res.body.data.recipeId).toBe(RECIPE_ID)
    expect(res.body.data.user.username).toBe('userB')
  })

  test('应成功发表不带评分的评论', async () => {
    const token = makeToken(USER_B_ID)
    const res = await request(app)
      .post(`/api/recipes/${RECIPE_ID}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '看起来不错' })

    expect(res.status).toBe(201)
    expect(res.body.data.rating).toBeNull()
  })

  test('未登录应返回 401', async () => {
    const res = await request(app)
      .post(`/api/recipes/${RECIPE_ID}/comments`)
      .send({ content: 'test' })

    expect(res.status).toBe(401)
  })

  test('评论内容为空应返回 400', async () => {
    const token = makeToken(USER_B_ID)
    const res = await request(app)
      .post(`/api/recipes/${RECIPE_ID}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '' })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('不能为空')
  })

  test('评分超出范围应返回 400', async () => {
    const token = makeToken(USER_B_ID)
    const res = await request(app)
      .post(`/api/recipes/${RECIPE_ID}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'test', rating: 6 })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('1-5')
  })

  test('对不存在的食谱评论应返回 404', async () => {
    const token = makeToken(USER_B_ID)
    const fakeId = uuidv4()
    const res = await request(app)
      .post(`/api/recipes/${fakeId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'test' })

    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────
// GET /api/recipes/:recipeId/comments — 获取评论列表
// ─────────────────────────────────────────────────────────────────
describe('GET /api/recipes/:recipeId/comments — 获取评论列表', () => {
  beforeEach(async () => {
    // 创建多条评论
    for (let i = 1; i <= 5; i++) {
      await db.Comment.create({
        content: `评论 ${i}`,
        rating: i <= 3 ? 4 : 5,
        userId: i <= 3 ? USER_A_ID : USER_B_ID,
        recipeId: RECIPE_ID
      })
    }
  })

  test('应返回分页评论列表', async () => {
    const res = await request(app).get(`/api/recipes/${RECIPE_ID}/comments`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.list).toHaveLength(5)
    expect(res.body.data.total).toBe(5)
  })

  test('应支持最新/最热排序切换', async () => {
    // 先清理 beforeEach 创建的5条评论，重建测试数据
    await db.Comment.destroy({ where: { recipeId: RECIPE_ID } })

    const c1 = await db.Comment.create({
      content: '最新评论', rating: 4, userId: USER_B_ID, recipeId: RECIPE_ID, likesCount: 10, createdAt: new Date('2026-01-03')
    })
    await db.Comment.create({
      content: '最热评论', rating: 5, userId: USER_B_ID, recipeId: RECIPE_ID, likesCount: 99, createdAt: new Date('2026-01-01')
    })
    await db.Comment.create({
      content: '中间评论', rating: 3, userId: USER_A_ID, recipeId: RECIPE_ID, likesCount: 5, createdAt: new Date('2026-01-02')
    })

    // 最新排序
    const resLatest = await request(app)
      .get(`/api/recipes/${RECIPE_ID}/comments`)
      .query({ sort: 'latest' })
    expect(resLatest.body.data.list[0].content).toBe('最新评论')
    expect(resLatest.body.data.list[2].content).toBe('最热评论')

    // 最热排序
    const resHot = await request(app)
      .get(`/api/recipes/${RECIPE_ID}/comments`)
      .query({ sort: 'hot' })
    expect(resHot.body.data.list[0].content).toBe('最热评论')
  })

  test('应包含点赞信息和用户已点赞状态', async () => {
    const token = makeToken(USER_A_ID)
    const comment = await db.Comment.create({
      content: '带点赞的评论', rating: 4, userId: USER_B_ID, recipeId: RECIPE_ID, likesCount: 3
    })
    await CommentLike.create({ commentId: comment.id, userId: USER_A_ID })

    const res = await request(app)
      .get(`/api/recipes/${RECIPE_ID}/comments`)
      .set('Authorization', `Bearer ${token}`)

    const found = res.body.data.list.find(c => c.id === comment.id)
    expect(found).toBeDefined()
    expect(found.likesCount).toBe(3)
    expect(found.isLiked).toBe(true)
  })

  test('按时间倒序排列', async () => {
    const res = await request(app).get(`/api/recipes/${RECIPE_ID}/comments`)

    const times = res.body.data.list.map(c => new Date(c.createdAt).getTime())
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeLessThanOrEqual(times[i - 1])
    }
  })

  test('应包含用户信息', async () => {
    const res = await request(app).get(`/api/recipes/${RECIPE_ID}/comments`)

    const first = res.body.data.list[0]
    expect(first.user).toBeDefined()
    expect(first.user.username).toBeDefined()
  })

  test('应支持分页参数', async () => {
    const res = await request(app)
      .get(`/api/recipes/${RECIPE_ID}/comments`)
      .query({ page: 1, pageSize: 2 })

    expect(res.body.data.list).toHaveLength(2)
    expect(res.body.data.total).toBe(5)
  })

  test('无评论的食谱应返回空列表', async () => {
    const otherRecipeId = uuidv4()
    await db.Recipe.create({
      id: otherRecipeId,
      title: '另一个食谱',
      author: 'test',
      userId: USER_A_ID
    })

    const res = await request(app).get(`/api/recipes/${otherRecipeId}/comments`)

    expect(res.status).toBe(200)
    expect(res.body.data.list).toHaveLength(0)
    expect(res.body.data.total).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────
// GET /api/recipes/:recipeId/comments/stats — 评分统计
// ─────────────────────────────────────────────────────────────────
describe('GET /api/recipes/:recipeId/comments/stats — 评分统计', () => {
  test('应返回正确的评分统计', async () => {
    // 创建带评分的评论
    await db.Comment.create({ content: '很好', rating: 5, userId: USER_A_ID, recipeId: RECIPE_ID })
    await db.Comment.create({ content: '还行', rating: 3, userId: USER_B_ID, recipeId: RECIPE_ID })
    await db.Comment.create({ content: '不错', rating: 4, userId: USER_A_ID, recipeId: RECIPE_ID })
    await db.Comment.create({ content: '无评分', rating: null, userId: USER_B_ID, recipeId: RECIPE_ID })

    const res = await request(app).get(`/api/recipes/${RECIPE_ID}/comments/stats`)

    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(4)
    expect(res.body.data.ratedCount).toBe(3)
    expect(res.body.data.averageRating).toBe(4)  // (5+3+4)/3 = 4
    expect(res.body.data.distribution[5]).toBe(1)
    expect(res.body.data.distribution[4]).toBe(1)
    expect(res.body.data.distribution[3]).toBe(1)
    expect(res.body.data.distribution[2]).toBe(0)
    expect(res.body.data.distribution[1]).toBe(0)
  })

  test('无评论时应返回零值', async () => {
    const res = await request(app).get(`/api/recipes/${RECIPE_ID}/comments/stats`)

    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(0)
    expect(res.body.data.ratedCount).toBe(0)
    expect(res.body.data.averageRating).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────
// POST /api/comments/:id/like — 点赞评论
// ─────────────────────────────────────────────────────────────────
describe('POST /api/comments/:id/like — 点赞评论', () => {
  let commentId

  beforeEach(async () => {
    const comment = await db.Comment.create({
      content: '待点赞评论',
      rating: 4,
      userId: USER_B_ID,
      recipeId: RECIPE_ID,
      likesCount: 0
    })
    commentId = comment.id
  })

  test('应成功点赞', async () => {
    const token = makeToken(USER_A_ID)
    const res = await request(app)
      .post(`/api/comments/${commentId}/like`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)

    const comment = await db.Comment.findByPk(commentId)
    expect(comment.likesCount).toBe(1)

    const like = await CommentLike.findOne({ where: { commentId, userId: USER_A_ID } })
    expect(like).not.toBeNull()
  })

  test('重复点赞应返回成功但不重复计数', async () => {
    await CommentLike.create({ commentId, userId: USER_A_ID })
    await db.Comment.update({ likesCount: 1 }, { where: { id: commentId } })

    const token = makeToken(USER_A_ID)
    const res = await request(app)
      .post(`/api/comments/${commentId}/like`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    // 点赞数不变
    const comment = await db.Comment.findByPk(commentId)
    expect(comment.likesCount).toBe(1)
  })

  test('未登录应返回 401', async () => {
    const res = await request(app).post(`/api/comments/${commentId}/like`)
    expect(res.status).toBe(401)
  })

  test('点赞不存在的评论应返回 404', async () => {
    const token = makeToken(USER_A_ID)
    const res = await request(app)
      .post('/api/comments/99999/like')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────
// DELETE /api/comments/:id/like — 取消点赞
// ─────────────────────────────────────────────────────────────────
describe('DELETE /api/comments/:id/like — 取消点赞', () => {
  let commentId

  beforeEach(async () => {
    const comment = await db.Comment.create({
      content: '待取消点赞评论',
      rating: 4,
      userId: USER_B_ID,
      recipeId: RECIPE_ID,
      likesCount: 1
    })
    commentId = comment.id
    await CommentLike.create({ commentId, userId: USER_A_ID })
  })

  test('应成功取消点赞', async () => {
    const token = makeToken(USER_A_ID)
    const res = await request(app)
      .delete(`/api/comments/${commentId}/like`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)

    const comment = await db.Comment.findByPk(commentId)
    expect(comment.likesCount).toBe(0)

    const like = await CommentLike.findOne({ where: { commentId, userId: USER_A_ID } })
    expect(like).toBeNull()
  })

  test('未点赞时取消应返回 404', async () => {
    // 先删除已有点赞
    await CommentLike.destroy({ where: { commentId, userId: USER_A_ID } })

    const token = makeToken(USER_A_ID)
    const res = await request(app)
      .delete(`/api/comments/${commentId}/like`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })

  test('未登录应返回 401', async () => {
    const res = await request(app).delete(`/api/comments/${commentId}/like`)
    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────
// DELETE /api/comments/:id — 删除评论
// ─────────────────────────────────────────────────────────────────
describe('DELETE /api/comments/:id — 删除评论', () => {
  let commentId

  beforeEach(async () => {
    const comment = await db.Comment.create({
      content: '要删除的评论',
      rating: 4,
      userId: USER_A_ID,
      recipeId: RECIPE_ID
    })
    commentId = comment.id
  })

  test('应成功删除自己的评论', async () => {
    const token = makeToken(USER_A_ID)
    const res = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)

    // 验证已删除
    const found = await db.Comment.findByPk(commentId)
    expect(found).toBeNull()
  })

  test('不能删除别人的评论', async () => {
    const token = makeToken(USER_B_ID)
    const res = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.message).toContain('无权')
  })

  test('未登录应返回 401', async () => {
    const res = await request(app).delete(`/api/comments/${commentId}`)

    expect(res.status).toBe(401)
  })

  test('删除不存在的评论应返回 404', async () => {
    const token = makeToken(USER_A_ID)
    const res = await request(app)
      .delete('/api/comments/99999')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})
