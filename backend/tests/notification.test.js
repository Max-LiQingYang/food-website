/**
 * @jest-environment node
 */

process.env.DATABASE_URL = 'sqlite::memory:'
process.env.DB_DIALECT = 'sqlite'

const request = require('supertest')
const { Sequelize, DataTypes } = require('sequelize')

// Build inline models to avoid production config
const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })

// Minimal model definitions
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  username: { type: DataTypes.STRING(50), allowNull: false, unique: 'uq_username' },
  email: { type: DataTypes.STRING(100), allowNull: false, unique: 'uq_email' },
  password: { type: DataTypes.STRING(255), allowNull: false },
  nickname: { type: DataTypes.STRING(50), allowNull: true },
  role: { type: DataTypes.STRING(20), defaultValue: 'user' }
}, { tableName: 'users', timestamps: true })

const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING },
  userId: { type: DataTypes.UUID }
}, { tableName: 'recipes', timestamps: true })

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.STRING },
  message: { type: DataTypes.STRING(500) },
  link: { type: DataTypes.STRING, allowNull: true },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'notifications', timestamps: false })

const Follow = sequelize.define('Follow', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  followerId: { type: DataTypes.UUID, allowNull: false },
  followingId: { type: DataTypes.UUID, allowNull: false }
}, { tableName: 'follows', timestamps: false })

const Favorite = sequelize.define('Favorite', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  recipeId: { type: DataTypes.UUID, allowNull: false }
}, { tableName: 'favorites', timestamps: true })

// Build express app
const express = require('express')
const app = express()
app.use(express.json())

// Auth middleware (simple token verification)
const jwt = require('jsonwebtoken')

function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ code: 401, message: '未登录', data: null })
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'test-secret')
    req.userId = decoded.id
    next()
  } catch (e) {
    return res.status(401).json({ code: 401, message: '登录已过期', data: null })
  }
}

function resJSON(c, m, d) { return { code: c, message: m, data: d } }

// Register routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body
    const bcrypt = require('bcryptjs')
    const hashed = await bcrypt.hash(password, 10)
    const user = await User.create({ username, email, password: hashed, nickname: username })
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '7d' })
    res.json(resJSON(0, 'ok', { token, user: { id: user.id, username: user.username, nickname: user.nickname } }))
  } catch (e) { res.status(500).json(resJSON(500, e.message, null)) }
})

app.post('/api/recipes', auth, async (req, res) => {
  const r = await Recipe.create({ ...req.body, userId: req.userId })
  res.status(201).json(resJSON(0, 'ok', r))
})

app.post('/api/users/:id/follow', auth, async (req, res) => {
  if (req.params.id === req.userId) return res.status(400).json(resJSON(400, '不能关注自己', null))
  const [follow, created] = await Follow.findOrCreate({ where: { followerId: req.userId, followingId: req.params.id } })
  if (created) {
    const follower = await User.findByPk(req.userId)
    setImmediate(async () => {
      await Notification.create({ userId: req.params.id, type: 'follow', message: (follower.nickname || follower.username) + ' 关注了你', link: '/user/' + req.userId })
    })
    res.status(201).json(resJSON(0, 'ok', { followed: true }))
  } else {
    res.status(200).json(resJSON(0, '已关注', { followed: true }))
  }
})

// Notification routes
app.get('/api/notifications', auth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 20))
  const offset = (page - 1) * pageSize
  const { rows, count } = await Notification.findAndCountAll({ where: { userId: req.userId }, order: [['createdAt', 'DESC']], offset, limit: pageSize })
  const unreadCount = await Notification.count({ where: { userId: req.userId, isRead: false } })
  res.json(resJSON(0, 'ok', { list: rows, total: count, page, pageSize, unreadCount }))
})

app.get('/api/notifications/unread-count', auth, async (req, res) => {
  const count = await Notification.count({ where: { userId: req.userId, isRead: false } })
  res.json(resJSON(0, 'ok', { count }))
})

app.put('/api/notifications/:id/read', auth, async (req, res) => {
  const n = await Notification.findOne({ where: { id: req.params.id, userId: req.userId } })
  if (!n) return res.status(404).json(resJSON(404, '通知不存在', null))
  await n.update({ isRead: true })
  res.json(resJSON(0, 'ok', n))
})

app.put('/api/notifications/read-all', auth, async (req, res) => {
  await Notification.update({ isRead: true }, { where: { userId: req.userId, isRead: false } })
  res.json(resJSON(0, 'ok', null))
})

app.delete('/api/notifications/:id', auth, async (req, res) => {
  const n = await Notification.findOne({ where: { id: req.params.id, userId: req.userId } })
  if (!n) return res.status(404).json(resJSON(404, '通知不存在', null))
  await n.destroy()
  res.json(resJSON(0, 'ok', null))
})

let token1, token2, userId1, userId2, recipeId

beforeAll(async () => {
  await sequelize.sync({ force: true })
  const bcrypt = require('bcryptjs')
  const pw = await bcrypt.hash('pass123456', 10)
  const u1 = await User.create({ username: 'notifuser1', email: 'n1@test.com', password: pw })
  userId1 = u1.id
  token1 = jwt.sign({ id: u1.id, username: u1.username }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '7d' })
  const u2 = await User.create({ username: 'notifuser2', email: 'n2@test.com', password: pw })
  userId2 = u2.id
  token2 = jwt.sign({ id: u2.id, username: u2.username }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '7d' })
  const r = await Recipe.create({ title: '测试食谱', category: '中餐', userId: userId2 })
  recipeId = r.id
})

describe('Notification System', () => {
  test('GET /api/notifications — empty list', async () => {
    const res = await request(app).get('/api/notifications').set('Authorization', 'Bearer ' + token1)
    expect(res.status).toBe(200)
    expect(res.body.data.list).toEqual([])
    expect(res.body.data.unreadCount).toBe(0)
  })

  test('GET /api/notifications/unread-count — zero', async () => {
    const res = await request(app).get('/api/notifications/unread-count').set('Authorization', 'Bearer ' + token1)
    expect(res.body.data.count).toBe(0)
  })

  test('POST follow creates notification', async () => {
    const res = await request(app).post('/api/users/' + userId2 + '/follow').set('Authorization', 'Bearer ' + token1)
    expect(res.status).toBe(201)
    await new Promise(r => setTimeout(r, 500))
    const notifRes = await request(app).get('/api/notifications').set('Authorization', 'Bearer ' + token2)
    expect(notifRes.body.data.total).toBeGreaterThanOrEqual(1)
    expect(notifRes.body.data.list[0].type).toBe('follow')
  })

  test('mark read and delete flow', async () => {
    const n = await Notification.create({ userId: userId1, type: 'milestone', message: '测试', link: '/user/' + userId1 })
    let res = await request(app).put('/api/notifications/' + n.id + '/read').set('Authorization', 'Bearer ' + token1)
    expect(res.status).toBe(200)
    res = await request(app).delete('/api/notifications/' + n.id).set('Authorization', 'Bearer ' + token1)
    expect(res.status).toBe(200)
  })

  test('PUT /api/notifications/read-all', async () => {
    await Notification.create({ userId: userId1, type: 'milestone', message: 'A' })
    await Notification.create({ userId: userId1, type: 'milestone', message: 'B' })
    const res = await request(app).put('/api/notifications/read-all').set('Authorization', 'Bearer ' + token1)
    expect(res.status).toBe(200)
    const unreadRes = await request(app).get('/api/notifications/unread-count').set('Authorization', 'Bearer ' + token1)
    expect(unreadRes.body.data.count).toBe(0)
  })

  test('GET /api/notifications requires auth', async () => {
    const res = await request(app).get('/api/notifications')
    expect(res.status).toBe(401)
  })
})

afterAll(async () => { await sequelize.close() })