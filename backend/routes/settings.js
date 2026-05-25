'use strict'

/**
 * routes/settings.js
 * 用户个人设置路由
 *
 * GET  /settings              — 获取当前用户所有设置
 * PUT  /settings/profile      — 更新个人信息
 * PUT  /settings/notifications — 更新通知偏好
 * PUT  /settings/privacy      — 更新隐私设置
 * GET  /settings/export       — 导出个人数据（JSON）
 * GET  /settings/export/csv   — 导出收藏数据（CSV）
 */

const express = require('express')
const { User, Recipe, Favorite, CookingLog, Comment } = require('../models')
const { Op } = require('sequelize')
const auth = require('../middleware/auth')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

/** Merge user preferences with defaults */
function getDefaultSettings() {
  return {
    notifications: {
      commentReply: true,
      followUpdate: true,
      challenge: true,
      system: true
    },
    privacy: {
      collectionVisibility: 'public',
      cookingLogVisibility: 'public'
    }
  }
}

function parsePrefs(user) {
  const defaults = getDefaultSettings()
  if (!user.preferences) return defaults
  try {
    const prefs = typeof user.preferences === 'string'
      ? JSON.parse(user.preferences)
      : user.preferences

    return {
      notifications: { ...defaults.notifications, ...(prefs.notifications || {}) },
      privacy: { ...defaults.privacy, ...(prefs.privacy || {}) },
      diet: prefs.diet || '',
      cuisine: prefs.cuisine || '',
      difficulty: prefs.difficulty || '',
      maxCookTime: prefs.maxCookTime || '',
      allergies: prefs.allergies || []
    }
  } catch {
    return defaults
  }
}

// GET /settings — get all settings
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'username', 'email', 'nickname', 'preferences', 'role', 'createdAt']
    })
    if (!user) return res.status(404).json(resJSON(404, '用户不存在', null))

    return res.status(200).json(resJSON(0, 'success', {
      profile: {
        nickname: user.nickname || '',
        username: user.username,
        email: user.email,
        role: user.role,
        joinedAt: user.createdAt
      },
      ...parsePrefs(user)
    }))
  } catch (err) {
    console.error('[GET /settings] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// PUT /settings/profile — update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { nickname } = req.body
    const update = {}
    if (nickname !== undefined) update.nickname = nickname

    await User.update(update, { where: { id: req.userId } })
    return res.status(200).json(resJSON(0, 'success', { nickname }))
  } catch (err) {
    console.error('[PUT /settings/profile] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// PUT /settings/notifications — update notification prefs
router.put('/notifications', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, { attributes: ['id', 'preferences'] })
    if (!user) return res.status(404).json(resJSON(404, '用户不存在', null))

    const currentPrefs = parsePrefs(user)
    const { commentReply, followUpdate, challenge, system } = req.body

    currentPrefs.notifications = {
      commentReply: commentReply !== undefined ? Boolean(commentReply) : currentPrefs.notifications.commentReply,
      followUpdate: followUpdate !== undefined ? Boolean(followUpdate) : currentPrefs.notifications.followUpdate,
      challenge: challenge !== undefined ? Boolean(challenge) : currentPrefs.notifications.challenge,
      system: system !== undefined ? Boolean(system) : currentPrefs.notifications.system
    }

    await User.update(
      { preferences: JSON.stringify(currentPrefs) },
      { where: { id: req.userId } }
    )

    return res.status(200).json(resJSON(0, 'success', currentPrefs.notifications))
  } catch (err) {
    console.error('[PUT /settings/notifications] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// PUT /settings/privacy — update privacy settings
router.put('/privacy', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, { attributes: ['id', 'preferences'] })
    if (!user) return res.status(404).json(resJSON(404, '用户不存在', null))

    const currentPrefs = parsePrefs(user)
    const { collectionVisibility, cookingLogVisibility } = req.body

    if (collectionVisibility) currentPrefs.privacy.collectionVisibility = collectionVisibility
    if (cookingLogVisibility) currentPrefs.privacy.cookingLogVisibility = cookingLogVisibility

    await User.update(
      { preferences: JSON.stringify(currentPrefs) },
      { where: { id: req.userId } }
    )

    return res.status(200).json(resJSON(0, 'success', currentPrefs.privacy))
  } catch (err) {
    console.error('[PUT /settings/privacy] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// GET /settings/export — export user data as JSON
router.get('/export', auth, async (req, res) => {
  try {
    const userId = req.userId
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'nickname', 'createdAt']
    })
    const recipes = await Recipe.findAll({
      where: { userId },
      attributes: ['id', 'title', 'description', 'category', 'difficulty', 'servings', 'cookTime', 'ingredients', 'steps', 'tips', 'createdAt']
    })
    const favorites = await Favorite.findAll({
      where: { userId, deletedAt: null },
      include: [{ model: Recipe, attributes: ['id', 'title', 'category'] }],
      order: [['createdAt', 'DESC']]
    })
    const logs = await CookingLog.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 100
    })
    const comments = await Comment.findAll({
      where: { userId },
      attributes: ['id', 'recipeId', 'content', 'rating', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 100
    })

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: user ? user.toJSON() : null,
      recipes: recipes.map(r => r.toJSON()),
      favorites: favorites.map(f => ({
        recipeId: f.recipeId,
        recipeTitle: f.Recipe?.title || '',
        category: f.Recipe?.category || '',
        favoritedAt: f.createdAt
      })),
      cookingLogs: logs.map(l => l.toJSON()),
      comments: comments.map(c => c.toJSON())
    }

    return res.status(200).json(resJSON(0, 'success', exportData))
  } catch (err) {
    console.error('[GET /settings/export] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// GET /settings/export/csv — export favorites as CSV
router.get('/export/csv', auth, async (req, res) => {
  try {
    const userId = req.userId
    const favorites = await Favorite.findAll({
      where: { userId, deletedAt: null },
      include: [{ model: Recipe, attributes: ['id', 'title', 'category'] }],
      order: [['createdAt', 'DESC']]
    })

    let csv = '食谱标题,分类,收藏时间\n'
    for (const fav of favorites) {
      const title = fav.Recipe?.title || ''
      const category = fav.Recipe?.category || ''
      const time = fav.createdAt ? new Date(fav.createdAt).toLocaleDateString('zh-CN') : ''
      csv += `"${title}","${category}","${time}"\n`
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="my-favorites.csv"')
    return res.status(200).send(csv)
  } catch (err) {
    console.error('[GET /settings/export/csv] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router
