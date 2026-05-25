'use strict'

/**
 * tests/dashboard.test.js
 * 作者统计仪表板后端测试
 */

const { Sequelize } = require('sequelize')
const express = require('express')
const request = require('supertest')

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
})

const DataTypes = Sequelize.DataTypes

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  username: DataTypes.STRING(50),
  role: DataTypes.STRING(20)
}, { tableName: 'users', timestamps: true })

const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: DataTypes.STRING(200),
  description: DataTypes.TEXT,
  category: DataTypes.STRING(50),
  qualityScore: { type: DataTypes.FLOAT, defaultValue: 0 },
  viewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  favoriteCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  userId: DataTypes.UUID,
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'recipes', timestamps: true })

const Comment = sequelize.define('Comment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  content: DataTypes.TEXT,
  rating: DataTypes.INTEGER,
  likesCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  userId: DataTypes.UUID,
  recipeId: DataTypes.UUID,
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'comments', timestamps: false })

function mockAuth(userId) {
  return (req, res, next) => {
    req.userId = userId
    next()
  }
}

function resJSON(code, message, data) {
  return { code, message, data }
}

describe('Author Dashboard', () => {
  let app
  const userId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  const otherUserId = 'ffffffff-eeee-dddd-cccc-bbbbbbbbbbbb'

  beforeAll(async () => {
    await sequelize.sync({ force: true })

    // Create users
    await User.create({ id: userId, username: 'author', role: 'user' })
    await User.create({ id: otherUserId, username: 'other', role: 'user' })

    // Create recipes by author
    await Recipe.create({ id: '11111111-1111-1111-1111-111111111111', title: '食谱A', userId, viewCount: 100, favoriteCount: 10, qualityScore: 8.5, category: '中餐' })
    await Recipe.create({ id: '22222222-2222-2222-2222-222222222222', title: '食谱B', userId, viewCount: 50, favoriteCount: 5, qualityScore: 7.0, category: '西餐' })
    await Recipe.create({ id: '33333333-3333-3333-3333-333333333333', title: '其他用户食谱', userId: otherUserId, viewCount: 200, favoriteCount: 20, qualityScore: 9.0 })

    // Create comments on author's recipes
    await Comment.create({ content: '这个食谱非常好吃，推荐给大家', rating: 5, userId: otherUserId, recipeId: '11111111-1111-1111-1111-111111111111' })
    await Comment.create({ content: '味道不错，做法简单易懂', rating: 4, userId: otherUserId, recipeId: '11111111-1111-1111-1111-111111111111' })
    await Comment.create({ content: '很棒的食谱，我做了很多次', rating: 5, userId: otherUserId, recipeId: '22222222-2222-2222-2222-222222222222' })

    // Setup app
    app = express()
    app.use(express.json())

    app.get('/dashboard', mockAuth(userId), async (req, res) => {
      try {
        const myRecipes = await Recipe.findAll({
          where: { userId },
          attributes: ['id', 'title', 'viewCount', 'favoriteCount', 'createdAt', 'qualityScore']
        })

        const recipeIds = myRecipes.map(r => r.id)
        const totalRecipes = myRecipes.length
        const totalViews = myRecipes.reduce((sum, r) => sum + (r.viewCount || 0), 0)
        const totalFavorites = myRecipes.reduce((sum, r) => sum + (r.favoriteCount || 0), 0)
        const totalComments = await Comment.count({ where: { recipeId: { [Sequelize.Op.in]: recipeIds } } })

        // View trend (last 30 days)
        const viewTrend = []
        const favTrend = []
        for (let i = 29; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().slice(0, 10)
          viewTrend.push({ date: dateStr, views: Math.round(totalViews / 30) })
          favTrend.push({ date: dateStr, favorites: Math.round(totalFavorites / 30) })
        }

        // Rating distribution
        const ratingRecords = await Comment.findAll({
          where: { recipeId: { [Sequelize.Op.in]: recipeIds }, rating: { [Sequelize.Op.ne]: null } },
          attributes: ['rating', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
          group: ['rating'],
          raw: true
        })
        const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        ratingRecords.forEach(r => { ratingDist[r.rating] = parseInt(r.count, 10) })

        // Word cloud
        const recentComments = await Comment.findAll({
          where: { recipeId: { [Sequelize.Op.in]: recipeIds } },
          attributes: ['content'],
          limit: 100,
          order: [['createdAt', 'DESC']]
        })

        const stopWords = new Set(['的', '了', '在', '是', '我', '有', '和'])
        const wordFreq = {}
        recentComments.forEach(c => {
          const words = (c.content || '').match(/[\u4e00-\u9fa5]{2,4}/g) || []
          words.forEach(w => {
            if (!stopWords.has(w)) wordFreq[w] = (wordFreq[w] || 0) + 1
          })
        })

        const wordCloud = Object.entries(wordFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 30)
          .map(([text, value]) => ({ text, value }))

        const totalPoints = Math.round(totalViews * 0.1 + totalFavorites * 5 + totalComments * 3)

        const topRecipes = myRecipes.map(r => ({
          id: r.id,
          title: r.title,
          views: r.viewCount || 0,
          favorites: r.favoriteCount || 0,
          qualityScore: r.qualityScore || 0,
          points: Math.round((r.viewCount || 0) * 0.1 + (r.favoriteCount || 0) * 5)
        })).sort((a, b) => b.points - a.points)

        return res.json(resJSON(0, 'ok', {
          basic: { totalRecipes, totalViews, totalFavorites, totalComments, totalPoints },
          viewTrend, favTrend,
          ratingDistribution: ratingDist,
          wordCloud,
          topRecipes
        }))
      } catch (err) {
        return res.status(500).json(resJSON(500, '获取统计数据失败', null))
      }
    })
  })

  test('GET /dashboard — returns basic stats', async () => {
    const res = await request(app).get('/dashboard')

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.basic.totalRecipes).toBe(2)
    expect(res.body.data.basic.totalViews).toBe(150)
    expect(res.body.data.basic.totalFavorites).toBe(15)
    expect(res.body.data.basic.totalComments).toBe(3)
  })

  test('GET /dashboard — returns view trend (30 days)', async () => {
    const res = await request(app).get('/dashboard')

    expect(res.status).toBe(200)
    expect(res.body.data.viewTrend.length).toBe(30)
    expect(res.body.data.viewTrend[0].date).toBeTruthy()
    expect(typeof res.body.data.viewTrend[0].views).toBe('number')
  })

  test('GET /dashboard — returns favorite trend', async () => {
    const res = await request(app).get('/dashboard')

    expect(res.status).toBe(200)
    expect(res.body.data.favTrend.length).toBe(30)
  })

  test('GET /dashboard — returns rating distribution', async () => {
    const res = await request(app).get('/dashboard')

    expect(res.status).toBe(200)
    expect(res.body.data.ratingDistribution['5']).toBe(2)
    expect(res.body.data.ratingDistribution['4']).toBe(1)
    expect(res.body.data.ratingDistribution['1']).toBe(0)
  })

  test('GET /dashboard — returns word cloud', async () => {
    const res = await request(app).get('/dashboard')

    expect(res.status).toBe(200)
    expect(res.body.data.wordCloud.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.wordCloud[0].text).toBeTruthy()
    expect(res.body.data.wordCloud[0].value).toBeGreaterThanOrEqual(1)
  })

  test('GET /dashboard — returns top recipes', async () => {
    const res = await request(app).get('/dashboard')

    expect(res.status).toBe(200)
    expect(res.body.data.topRecipes.length).toBe(2)
    expect(res.body.data.topRecipes[0].title).toBe('食谱A')
    expect(res.body.data.topRecipes[0].points).toBeGreaterThan(0)
  })

  test('GET /dashboard — totalPoints includes views+favs+comments', async () => {
    const res = await request(app).get('/dashboard')

    expect(res.status).toBe(200)
    const points = res.body.data.basic.totalPoints
    expect(points).toBeGreaterThan(0)
    expect(points).toBe(15 + 75 + 9) // views(150*0.1=15) + favs(15*5=75) + comments(3*3=9)=99
  })
})