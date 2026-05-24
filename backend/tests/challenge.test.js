'use strict'

/**
 * tests/challenge.test.js
 * 挑战赛系统 — API 测试（投稿 + 投票 + 排行榜）
 */

const request = require('supertest')
const express = require('express')
const { Sequelize, DataTypes } = require('sequelize')

const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })

const Challenge = sequelize.define('Challenge', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  theme: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('draft', 'active', 'voting', 'closed'), defaultValue: 'draft' },
  submissionCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  voteCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  createdBy: { type: DataTypes.STRING },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'challenges', timestamps: false })

const ChallengeSubmission = sequelize.define('ChallengeSubmission', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  challengeId: { type: DataTypes.UUID, allowNull: false },
  recipeId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.STRING },
  voteCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'challenge_submissions', timestamps: false })

const ChallengeVote = sequelize.define('ChallengeVote', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  submissionId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.STRING, allowNull: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'challenge_votes', timestamps: false })

const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  coverImage: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
}, { tableName: 'recipes', timestamps: false })

Challenge.hasMany(ChallengeSubmission, { foreignKey: 'challengeId' })
ChallengeSubmission.belongsTo(Challenge, { foreignKey: 'challengeId' })
ChallengeSubmission.belongsTo(Recipe, { foreignKey: 'recipeId' })
ChallengeSubmission.hasMany(ChallengeVote, { foreignKey: 'submissionId' })
ChallengeVote.belongsTo(ChallengeSubmission, { foreignKey: 'submissionId' })

const mockAuth = (req, res, next) => { req.user = { userId: 'test-user' }; next() }
const mockToken = 'test-token'

function createApp() {
  const app = express()
  app.use(express.json())

  app.get('/api/challenges', async (req, res) => {
    const where = {}
    if (req.query.status) where.status = req.query.status
    const list = await Challenge.findAll({ where, order: [['createdAt', 'DESC']] })
    res.json({ code: 0, data: { list, total: list.length } })
  })

  app.get('/api/challenges/:id', async (req, res) => {
    const c = await Challenge.findByPk(req.params.id)
    if (!c) return res.status(404).json({ code: 404, message: '挑战不存在' })
    res.json({ code: 0, data: c })
  })

  app.post('/api/challenges', mockAuth, async (req, res) => {
    const c = await Challenge.create({ ...req.body, createdBy: req.user.userId })
    res.status(201).json({ code: 0, data: c })
  })

  app.post('/api/challenges/:id/submit', mockAuth, async (req, res) => {
    const challenge = await Challenge.findByPk(req.params.id)
    if (!challenge) return res.status(404).json({ code: 404, message: '挑战不存在' })
    if (challenge.status !== 'active') return res.status(400).json({ code: 400, message: '挑战未开始或已结束' })
    const recipe = await Recipe.findByPk(req.body.recipeId)
    if (!recipe) return res.status(404).json({ code: 404, message: '食谱不存在' })
    const existing = await ChallengeSubmission.findOne({ where: { challengeId: req.params.id, userId: req.user.userId } })
    if (existing) return res.status(400).json({ code: 400, message: '已投稿' })
    const sub = await ChallengeSubmission.create({ challengeId: req.params.id, recipeId: req.body.recipeId, userId: req.user.userId })
    await Challenge.increment('submissionCount', { by: 1, where: { id: req.params.id } })
    res.status(201).json({ code: 0, data: sub })
  })

  app.post('/api/challenges/:id/vote', mockAuth, async (req, res) => {
    const challenge = await Challenge.findByPk(req.params.id)
    if (!challenge) return res.status(404).json({ code: 404, message: '挑战不存在' })
    if (challenge.status !== 'voting' && challenge.status !== 'active') return res.status(400).json({ code: 400, message: '不可投票' })
    const submission = await ChallengeSubmission.findByPk(req.body.submissionId)
    if (!submission) return res.status(404).json({ code: 404, message: '投稿不存在' })

    const allSubs = await ChallengeSubmission.findAll({ where: { challengeId: req.params.id } })
    const subIds = allSubs.map(s => s.id)
    const oldVote = await ChallengeVote.findOne({ where: { submissionId: subIds, userId: req.user.userId } })

    if (oldVote) {
      await ChallengeVote.destroy({ where: { id: oldVote.id } })
      await ChallengeSubmission.decrement('voteCount', { by: 1, where: { id: oldVote.submissionId } })
    }

    await ChallengeVote.create({ submissionId: req.body.submissionId, userId: req.user.userId })
    await ChallengeSubmission.increment('voteCount', { by: 1, where: { id: req.body.submissionId } })
    if (!oldVote) await Challenge.increment('voteCount', { by: 1, where: { id: req.params.id } })

    res.json({ code: 0, message: oldVote ? '改投成功' : '投票成功' })
  })

  app.get('/api/challenges/:id/ranking', async (req, res) => {
    const subs = await ChallengeSubmission.findAll({
      where: { challengeId: req.params.id },
      order: [['voteCount', 'DESC']],
      include: [{ model: Recipe }],
    })
    const ranked = subs.map((s, i) => ({ rank: i + 1, submission: s }))
    res.json({ code: 0, data: { list: ranked, total: ranked.length } })
  })

  app.get('/api/challenges/:id/submissions', async (req, res) => {
    const subs = await ChallengeSubmission.findAll({ where: { challengeId: req.params.id }, order: [['voteCount', 'DESC']] })
    res.json({ code: 0, data: { list: subs, total: subs.length } })
  })

  return app
}

describe('挑战赛系统接口', () => {
  let app, challengeId, recipeId

  beforeAll(async () => {
    await sequelize.sync({ force: true })
    const recipe = await Recipe.create({ title: '参赛食谱', description: '美味' })
    recipeId = recipe.id
    app = createApp()
  })

  test('创建挑战', async () => {
    const res = await request(app)
      .post('/api/challenges')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({ title: '夏日快手挑战', theme: 'summer', status: 'active', description: '做夏日美食' })
    expect(res.status).toBe(201)
    expect(res.body.code).toBe(0)
    challengeId = res.body.data.id
  })

  test('获取挑战列表', async () => {
    const res = await request(app).get('/api/challenges')
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBeGreaterThanOrEqual(1)
  })

  test('获取挑战详情', async () => {
    const res = await request(app).get(`/api/challenges/${challengeId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('夏日快手挑战')
  })

  test('用户投稿', async () => {
    const res = await request(app)
      .post(`/api/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${mockToken}`)
      .send({ recipeId })
    expect(res.status).toBe(201)
  })

  test('不可重复投稿', async () => {
    const res = await request(app)
      .post(`/api/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${mockToken}`)
      .send({ recipeId })
    expect(res.status).toBe(400)
  })

  test('显示投稿列表', async () => {
    const res = await request(app).get(`/api/challenges/${challengeId}/submissions`)
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(1)
  })

  test('对投稿投票', async () => {
    const subs = await request(app).get(`/api/challenges/${challengeId}/submissions`)
    const submissionId = subs.body.data.list[0].id
    const res = await request(app)
      .post(`/api/challenges/${challengeId}/vote`)
      .set('Authorization', `Bearer ${mockToken}`)
      .send({ submissionId })
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('投票成功')

    // 再次获取投稿列表，确认票数 +1
    const subs2 = await request(app).get(`/api/challenges/${challengeId}/submissions`)
    expect(subs2.body.data.list[0].voteCount).toBe(1)
  })

  test('改投功能', async () => {
    // 用另一个用户投稿第二个食谱（直接创建投稿记录）
    const recipe2 = await Recipe.create({ title: '第二个食谱' })
    const sub2 = await ChallengeSubmission.create({ challengeId, recipeId: recipe2.id, userId: 'user2' })
    await Challenge.increment('submissionCount', { by: 1, where: { id: challengeId } })
    const submissionId2 = sub2.id

    // 改投到第二个投稿
    const res = await request(app)
      .post(`/api/challenges/${challengeId}/vote`)
      .set('Authorization', `Bearer ${mockToken}`)
      .send({ submissionId: submissionId2 })
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('改投成功')

    // 第二个投稿得票应为 1
    const subs = await request(app).get(`/api/challenges/${challengeId}/submissions`)
    const sub2Result = subs.body.data.list.find(s => s.id === submissionId2)
    expect(sub2Result.voteCount).toBe(1)
  })

  test('获取排行榜', async () => {
    const res = await request(app).get(`/api/challenges/${challengeId}/ranking`)
    expect(res.status).toBe(200)
    expect(res.body.data.list.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.list[0].rank).toBe(1)
  })

  test('不存在的挑战返回404', async () => {
    const res = await request(app).get('/api/challenges/non-existent')
    expect(res.status).toBe(404)
  })
})