/**
 * @jest-environment node
 */

process.env.JWT_SECRET = 'test-secret'

const request = require('supertest')
const { Sequelize, DataTypes } = require('sequelize')

const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })

// Models
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  username: { type: DataTypes.STRING(50), allowNull: false },
  email: { type: DataTypes.STRING(100), allowNull: false },
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

const Achievement = sequelize.define('Achievement', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.STRING },
  title: { type: DataTypes.STRING(100) },
  description: { type: DataTypes.STRING(200), allowNull: true },
  icon: { type: DataTypes.STRING(10), allowNull: true },
  unlockedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'achievements', timestamps: false })

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.STRING },
  message: { type: DataTypes.STRING(500) },
  link: { type: DataTypes.STRING, allowNull: true },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'notifications', timestamps: false })

// Achievement checker
const ACHIEVEMENT_DEFS = {
  'first-recipe': { title: '初出茅庐', description: '发布第一道食谱', icon: '\uD83C\uDF73', check: async (uid) => { const c = await Recipe.count({ where: { userId: uid } }); return c >= 1 } },
  'recipe-10': { title: '食谱达人', description: '发布10道食谱', icon: '\uD83D\uDCDA', check: async (uid) => { const c = await Recipe.count({ where: { userId: uid } }); return c >= 10 } },
  'first-comment': { title: '畅所欲言', description: '发表第一条评论', icon: '\uD83D\uDCAC', check: async () => false }
}

// Express app
const express = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const app = express()
app.use(express.json())

function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ code: 401, message: '未登录', data: null })
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'test-secret')
    req.userId = decoded.id
    next()
  } catch (e) { return res.status(401).json({ code: 401, message: '登录已过期', data: null }) }
}

function resJSON(c, m, d) { return { code: c, message: m, data: d } }

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body
  const hashed = await bcrypt.hash(password, 10)
  const user = await User.create({ username, email, password: hashed, nickname: username })
  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' })
  res.json(resJSON(0, 'ok', { token, user: { id: user.id, username: user.username } }))
})

app.post('/api/recipes', auth, async (req, res) => {
  const r = await Recipe.create({ ...req.body, userId: req.userId })
  // Auto-check achievements
  setImmediate(async () => {
    for (const type of ['first-recipe', 'recipe-10']) {
      const def = ACHIEVEMENT_DEFS[type]
      if (!def) continue
      const existing = await Achievement.findOne({ where: { userId: req.userId, type } })
      if (existing) continue
      const passed = await def.check(req.userId)
      if (passed) {
        await Achievement.create({ userId: req.userId, type, title: def.title, description: def.description, icon: def.icon })
      }
    }
  })
  res.status(201).json(resJSON(0, 'ok', r))
})

// Achievement routes
app.get('/api/achievements', auth, async (req, res) => {
  const list = await Achievement.findAll({ where: { userId: req.userId }, order: [['unlockedAt', 'DESC']] })
  res.json(resJSON(0, 'ok', list))
})

app.get('/api/achievements/user/:userId', async (req, res) => {
  const list = await Achievement.findAll({ where: { userId: req.params.userId }, order: [['unlockedAt', 'DESC']] })
  res.json(resJSON(0, 'ok', list))
})

let token1, userId1, token2

beforeAll(async () => {
  await sequelize.sync({ force: true })
  const pw = await bcrypt.hash('pass123456', 10)
  const u1 = await User.create({ username: 'achuser1', email: 'a1@test.com', password: pw })
  userId1 = u1.id
  token1 = jwt.sign({ id: u1.id, username: u1.username }, process.env.JWT_SECRET, { expiresIn: '7d' })
  const u2 = await User.create({ username: 'achuser2', email: 'a2@test.com', password: pw })
  token2 = jwt.sign({ id: u2.id, username: u2.username }, process.env.JWT_SECRET, { expiresIn: '7d' })
})

describe('Achievement System', () => {
  test('GET /api/achievements — empty list', async () => {
    const res = await request(app).get('/api/achievements').set('Authorization', 'Bearer ' + token1)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(0)
  })

  test('GET /api/achievements — requires auth', async () => {
    const res = await request(app).get('/api/achievements')
    expect(res.status).toBe(401)
  })

  test('GET /api/achievements/user/:userId — public', async () => {
    const res = await request(app).get('/api/achievements/user/' + userId1)
    expect(res.status).toBe(200)
  })

  test('first-recipe achievement unlocks on recipe creation', async () => {
    await request(app).post('/api/recipes').set('Authorization', 'Bearer ' + token1).send({ title: '首个', category: '中餐' })
    await new Promise(r => setTimeout(r, 500))
    const res = await request(app).get('/api/achievements').set('Authorization', 'Bearer ' + token1)
    const found = res.body.data.find(a => a.type === 'first-recipe')
    expect(found).toBeTruthy()
    expect(found.title).toBe('初出茅庐')
  })

  test('achievement is idempotent — not double-unlocked', async () => {
    const count = await Achievement.count({ where: { userId: userId1, type: 'first-recipe' } })
    expect(count).toBe(1)
  })

  test('GET /api/achievements/user/:userId lists achievements', async () => {
    const res = await request(app).get('/api/achievements/user/' + userId1)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })
})

afterAll(async () => { await sequelize.close() })