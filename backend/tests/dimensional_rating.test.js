'use strict'

/**
 * tests/dimensional_rating.test.js
 * 食谱评分维度细化（四维评分 + dimensionAverages 统计）测试
 *
 * 覆盖：
 *  - POST /recipes/:id/comments 4 维字段校验（合法、非法、NULL）
 *  - GET /recipes/:id/comments/stats dimensionAverages 计算
 *  - 4 维边界值 1 和 5
 *  - SQL 注入 / UUID 异常路径
 */

const { Sequelize, DataTypes, Op } = require('sequelize')
const express = require('express')
const request = require('supertest')

// ============== Test DB (sqlite in-memory) ==============
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
})

const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: true },
  commentCount: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'recipes', timestamps: true })

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  username: { type: DataTypes.STRING, allowNull: false },
  nickname: { type: DataTypes.STRING, allowNull: true }
}, { tableName: 'users', timestamps: true })

const Comment = sequelize.define('Comment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  parentId: { type: DataTypes.INTEGER, allowNull: true },
  content: { type: DataTypes.TEXT, allowNull: false },
  rating: { type: DataTypes.INTEGER, allowNull: true },
  taste: { type: DataTypes.INTEGER, allowNull: true },
  difficulty: { type: DataTypes.INTEGER, allowNull: true },
  presentation: { type: DataTypes.INTEGER, allowNull: true },
  value: { type: DataTypes.INTEGER, allowNull: true },
  likesCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  userId: { type: DataTypes.UUID, allowNull: false },
  recipeId: { type: DataTypes.UUID, allowNull: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'comments', timestamps: false })

// ============== Mirrored route handlers (subset) ==============
const DIMENSION_FIELDS = ['taste', 'difficulty', 'presentation', 'value']

function validateDimensionRating(body, field) {
  const val = body[field]
  if (val == null) return null
  const num = Number(val)
  if (!Number.isInteger(num) || num < 1 || num > 5) {
    return field + '评分必须是 1-5 的整数'
  }
  return null
}

function buildApp() {
  const app = express()
  app.use(express.json())

  // GET stats
  app.get('/api/recipes/:recipeId/comments/stats', async (req, res) => {
    try {
      const { recipeId } = req.params
      const comments = await Comment.findAll({
        where: { recipeId },
        attributes: ['rating', 'taste', 'difficulty', 'presentation', 'value']
      })

      const total = comments.length
      const ratedComments = comments.filter(c => c.rating != null)
      const ratedCount = ratedComments.length

      let averageRating = 0
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      if (ratedCount > 0) {
        let sum = 0
        for (const c of ratedComments) {
          sum += c.rating
          distribution[c.rating] = (distribution[c.rating] || 0) + 1
        }
        averageRating = Math.round((sum / ratedCount) * 10) / 10
      }

      const dimensionAverages = {}
      for (const dim of DIMENSION_FIELDS) {
        const valid = comments.filter(c => c[dim] != null)
        if (valid.length > 0) {
          const sum = valid.reduce((s, c) => s + c[dim], 0)
          dimensionAverages[dim] = {
            average: Math.round((sum / valid.length) * 10) / 10,
            count: valid.length
          }
        } else {
          dimensionAverages[dim] = { average: 0, count: 0 }
        }
      }

      res.json({ code: 0, data: { total, ratedCount, averageRating, distribution, dimensionAverages } })
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message })
    }
  })

  // POST comment (simplified - skip auth)
  app.post('/api/recipes/:recipeId/comments', async (req, res) => {
    try {
      const { recipeId } = req.params
      const { content, rating } = req.body

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ code: 400, message: '评论内容不能为空' })
      }

      if (rating != null && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
        return res.status(400).json({ code: 400, message: '评分必须是 1-5 的整数' })
      }

      for (const dim of DIMENSION_FIELDS) {
        const errMsg = validateDimensionRating(req.body, dim)
        if (errMsg) {
          return res.status(400).json({ code: 400, message: errMsg })
        }
      }

      const recipe = await Recipe.findByPk(recipeId)
      if (!recipe) {
        return res.status(404).json({ code: 404, message: '食谱不存在' })
      }

      const dimValues = {}
      for (const dim of DIMENSION_FIELDS) {
        const raw = req.body[dim]
        dimValues[dim] = raw != null ? Number(raw) : null
      }

      const comment = await Comment.create({
        content: content.trim(),
        rating: rating != null ? Number(rating) : null,
        ...dimValues,
        userId: req.body.userId,
        recipeId,
        likesCount: 0
      })

      res.status(201).json({ code: 0, data: comment })
    } catch (err) {
      res.status(500).json({ code: 500, message: err.message })
    }
  })

  return app
}

// ============== Tests ==============
describe('Dimensional Rating (4-dim) Backend', () => {
  let app
  let recipe
  let user

  beforeAll(async () => {
    await sequelize.sync({ force: true })
    app = buildApp()
    user = await User.create({ username: 'tester', nickname: '测试员' })
    recipe = await Recipe.create({ title: '番茄炒蛋', userId: user.id })
  })

  beforeEach(async () => {
    await Comment.destroy({ where: {}, truncate: true })
  })

  // ---------- POST 4 维字段校验 ----------
  describe('POST /api/recipes/:id/comments - 4 维字段校验', () => {
    test('合法 4 维评分 (1-5) 全部保存成功', async () => {
      const res = await request(app)
        .post(`/api/recipes/${recipe.id}/comments`)
        .send({
          content: '好吃！',
          userId: user.id,
          taste: 5,
          difficulty: 2,
          presentation: 4,
          value: 3
        })
      expect(res.status).toBe(201)
      expect(res.body.code).toBe(0)
      expect(res.body.data.taste).toBe(5)
      expect(res.body.data.difficulty).toBe(2)
      expect(res.body.data.presentation).toBe(4)
      expect(res.body.data.value).toBe(3)
    })

    test('边界值 1 - 全部维度为 1', async () => {
      const res = await request(app)
        .post(`/api/recipes/${recipe.id}/comments`)
        .send({
          content: '一般般',
          userId: user.id,
          taste: 1,
          difficulty: 1,
          presentation: 1,
          value: 1
        })
      expect(res.status).toBe(201)
      expect(res.body.data.taste).toBe(1)
    })

    test('边界值 5 - 全部维度为 5', async () => {
      const res = await request(app)
        .post(`/api/recipes/${recipe.id}/comments`)
        .send({
          content: '完美！',
          userId: user.id,
          taste: 5,
          difficulty: 5,
          presentation: 5,
          value: 5
        })
      expect(res.status).toBe(201)
      expect(res.body.data.taste).toBe(5)
    })

    test('非数字 "abc" → 400', async () => {
      const res = await request(app)
        .post(`/api/recipes/${recipe.id}/comments`)
        .send({
          content: 'test',
          userId: user.id,
          taste: 'abc'
        })
      expect(res.status).toBe(400)
      expect(res.body.message).toMatch(/taste.*1-5/)
    })

    test('越界 6 → 400', async () => {
      const res = await request(app)
        .post(`/api/recipes/${recipe.id}/comments`)
        .send({
          content: 'test',
          userId: user.id,
          taste: 6
        })
      expect(res.status).toBe(400)
    })

    test('越界 0 → 400', async () => {
      const res = await request(app)
        .post(`/api/recipes/${recipe.id}/comments`)
        .send({
          content: 'test',
          userId: user.id,
          taste: 0
        })
      expect(res.status).toBe(400)
    })

    test('负数 -1 → 400', async () => {
      const res = await request(app)
        .post(`/api/recipes/${recipe.id}/comments`)
        .send({
          content: 'test',
          userId: user.id,
          taste: -1
        })
      expect(res.status).toBe(400)
    })

    test('浮点数 3.5 → 400 (要求整数)', async () => {
      const res = await request(app)
        .post(`/api/recipes/${recipe.id}/comments`)
        .send({
          content: 'test',
          userId: user.id,
          taste: 3.5
        })
      expect(res.status).toBe(400)
    })

    test('不传 4 维字段 → 201 (旧评论兼容)', async () => {
      const res = await request(app)
        .post(`/api/recipes/${recipe.id}/comments`)
        .send({
          content: '普通评论，无维度评分',
          userId: user.id
        })
      expect(res.status).toBe(201)
      expect(res.body.data.taste).toBeNull()
      expect(res.body.data.difficulty).toBeNull()
      expect(res.body.data.presentation).toBeNull()
      expect(res.body.data.value).toBeNull()
    })

    test('4 维字段显式传 null → 201', async () => {
      const res = await request(app)
        .post(`/api/recipes/${recipe.id}/comments`)
        .send({
          content: 'test',
          userId: user.id,
          taste: null,
          difficulty: null,
          presentation: null,
          value: null
        })
      expect(res.status).toBe(201)
    })

    test('部分维度提供部分不提供 → 201', async () => {
      const res = await request(app)
        .post(`/api/recipes/${recipe.id}/comments`)
        .send({
          content: '只评口味',
          userId: user.id,
          taste: 4
        })
      expect(res.status).toBe(201)
      expect(res.body.data.taste).toBe(4)
      expect(res.body.data.difficulty).toBeNull()
    })
  })

  // ---------- GET stats dimensionAverages 计算 ----------
  describe('GET /api/recipes/:id/comments/stats - dimensionAverages', () => {
    test('空表 → 4 维 count 全部为 0', async () => {
      const res = await request(app).get(`/api/recipes/${recipe.id}/comments/stats`)
      expect(res.status).toBe(200)
      expect(res.body.data.dimensionAverages).toBeDefined()
      expect(res.body.data.dimensionAverages.taste).toEqual({ average: 0, count: 0 })
      expect(res.body.data.dimensionAverages.difficulty).toEqual({ average: 0, count: 0 })
      expect(res.body.data.dimensionAverages.presentation).toEqual({ average: 0, count: 0 })
      expect(res.body.data.dimensionAverages.value).toEqual({ average: 0, count: 0 })
    })

    test('单条评论完整 4 维 → 平均分等于其值', async () => {
      await Comment.create({
        content: 'c1', userId: user.id, recipeId: recipe.id,
        taste: 4, difficulty: 3, presentation: 5, value: 2
      })
      const res = await request(app).get(`/api/recipes/${recipe.id}/comments/stats`)
      expect(res.status).toBe(200)
      expect(res.body.data.dimensionAverages.taste).toEqual({ average: 4, count: 1 })
      expect(res.body.data.dimensionAverages.difficulty).toEqual({ average: 3, count: 1 })
      expect(res.body.data.dimensionAverages.presentation).toEqual({ average: 5, count: 1 })
      expect(res.body.data.dimensionAverages.value).toEqual({ average: 2, count: 1 })
    })

    test('多条评论取平均 (含小数舍入)', async () => {
      // 口味: 5, 4, 3 → avg = 4.0
      await Comment.create({ content: 'c1', userId: user.id, recipeId: recipe.id, taste: 5 })
      await Comment.create({ content: 'c2', userId: user.id, recipeId: recipe.id, taste: 4 })
      await Comment.create({ content: 'c3', userId: user.id, recipeId: recipe.id, taste: 3 })
      // 难度: 2, 4 → avg = 3.0
      await Comment.create({ content: 'c4', userId: user.id, recipeId: recipe.id, difficulty: 2 })
      await Comment.create({ content: 'c5', userId: user.id, recipeId: recipe.id, difficulty: 4 })

      const res = await request(app).get(`/api/recipes/${recipe.id}/comments/stats`)
      expect(res.body.data.dimensionAverages.taste).toEqual({ average: 4, count: 3 })
      expect(res.body.data.dimensionAverages.difficulty).toEqual({ average: 3, count: 2 })
      expect(res.body.data.dimensionAverages.presentation).toEqual({ average: 0, count: 0 })
      expect(res.body.data.dimensionAverages.value).toEqual({ average: 0, count: 0 })
    })

    test('NULL 字段被忽略，不计入 count', async () => {
      await Comment.create({
        content: 'c1', userId: user.id, recipeId: recipe.id,
        taste: 5, difficulty: null, presentation: null, value: null
      })
      await Comment.create({
        content: 'c2', userId: user.id, recipeId: recipe.id,
        taste: null, difficulty: 3, presentation: 4, value: 5
      })
      const res = await request(app).get(`/api/recipes/${recipe.id}/comments/stats`)
      expect(res.body.data.dimensionAverages.taste).toEqual({ average: 5, count: 1 })
      expect(res.body.data.dimensionAverages.difficulty).toEqual({ average: 3, count: 1 })
      expect(res.body.data.dimensionAverages.presentation).toEqual({ average: 4, count: 1 })
      expect(res.body.data.dimensionAverages.value).toEqual({ average: 5, count: 1 })
    })

    test('平均分四舍五入到 1 位小数 (1位)', async () => {
      // 3 个口味分: 5, 4, 4 → avg = 4.333... → 4.3
      await Comment.create({ content: 'a', userId: user.id, recipeId: recipe.id, taste: 5 })
      await Comment.create({ content: 'b', userId: user.id, recipeId: recipe.id, taste: 4 })
      await Comment.create({ content: 'c', userId: user.id, recipeId: recipe.id, taste: 4 })
      const res = await request(app).get(`/api/recipes/${recipe.id}/comments/stats`)
      expect(res.body.data.dimensionAverages.taste.average).toBe(4.3)
      expect(res.body.data.dimensionAverages.taste.count).toBe(3)
    })
  })

  // ---------- 综合统计 + 旧字段兼容 ----------
  describe('GET stats - 综合统计与 distribution 兼容', () => {
    test('averageRating 仅算有 rating 字段的评论', async () => {
      await Comment.create({ content: 'a', userId: user.id, recipeId: recipe.id, rating: 5, taste: 5 })
      await Comment.create({ content: 'b', userId: user.id, recipeId: recipe.id, rating: 3, taste: 1 })
      await Comment.create({ content: 'c', userId: user.id, recipeId: recipe.id, rating: null, taste: 4 })
      const res = await request(app).get(`/api/recipes/${recipe.id}/comments/stats`)
      expect(res.body.data.ratedCount).toBe(2)
      expect(res.body.data.averageRating).toBe(4)  // (5+3)/2 = 4
      expect(res.body.data.dimensionAverages.taste.count).toBe(3)  // 维度 count 包含无 rating 的
    })
  })

  // ---------- 安全 / SQL 注入 / 错误输入 ----------
  describe('安全性 / 边界', () => {
    test('recipeId 注入字符串 → 仍走 Sequelize 参数化查询，不抛 SQL 错误', async () => {
      // 构造恶意 recipeId - 由于 UUID 类型，findByPk 会返回 null
      const maliciousId = "' OR '1'='1"
      const res = await request(app).get(`/api/recipes/${encodeURIComponent(maliciousId)}/comments/stats`)
      // 找不到 → stats total = 0, 仍返回 200
      expect(res.status).toBe(200)
      expect(res.body.data.total).toBe(0)
    })

    test('不存在的 recipeId → 200 + 空统计', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const res = await request(app).get(`/api/recipes/${fakeId}/comments/stats`)
      expect(res.status).toBe(200)
      expect(res.body.data.total).toBe(0)
    })

    test('超大字符串 taste 字段 → 400', async () => {
      const res = await request(app)
        .post(`/api/recipes/${recipe.id}/comments`)
        .send({
          content: 'x',
          userId: user.id,
          taste: 'not-a-number-1234567890'
        })
      expect(res.status).toBe(400)
    })

    test('布尔 true 作为 taste → 201 (Number(true) === 1, 接受)', async () => {
      // 实际行为：Number(true) === 1 且 isInteger(1) === true → 通过校验
      // 记录这个边界 case：Boolean 类型会被 Number() 强转为 1
      const res = await request(app)
        .post(`/api/recipes/${recipe.id}/comments`)
        .send({
          content: 'x',
          userId: user.id,
          taste: true
        })
      expect(res.status).toBe(201)
      expect(res.body.data.taste).toBe(1)
    })

    test('字符串 "5" (数字字符串) → 201 (Number() 转换通过)', async () => {
      const res = await request(app)
        .post(`/api/recipes/${recipe.id}/comments`)
        .send({
          content: 'x',
          userId: user.id,
          taste: '5'
        })
      // Number('5') = 5, isInteger true → 接受
      expect(res.status).toBe(201)
      expect(res.body.data.taste).toBe(5)
    })
  })
})
