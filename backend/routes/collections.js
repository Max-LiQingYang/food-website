'use strict'

/**
 * routes/collections.js
 * 收藏夹 CRUD + 发现路由
 *
 * POST   /                         — 创建收藏夹 {name, description?, isPublic?} (auth)
 * GET    /                         — 获取当前用户所有收藏夹 (auth)
 * GET    /public                   — 公开收藏夹列表 (no auth)
 * GET    /:id                      — 单个收藏夹详情 (auth)
 * PUT    /:id                      — 更新收藏夹 (auth)
 * DELETE /:id                      — 删除收藏夹 (auth)
 * POST   /:id/recipes              — 添加食谱 (auth)
 * DELETE /:id/recipes/:recipeId    — 移除食谱 (auth)
 * PUT    /:id/toggle-public        — 切换公开/私密 (auth)
 * POST   /:id/subscribe            — 订阅收藏夹 (auth)
 * DELETE /:id/subscribe            — 取消订阅 (auth)
 */

const express = require('express')
const { Collection, CollectionRecipe, Recipe, User } = require('../models')
const auth = require('../middleware/auth')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

// ─────────────────────────────────────────────────────────────────
// GET /public — 公开收藏夹列表（按订阅数排序，无需认证）
// ─────────────────────────────────────────────────────────────────
router.get('/public', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
    const offset = (page - 1) * pageSize

    const { rows, count } = await Collection.findAndCountAll({
      where: { isPublic: true },
      order: [['subscriberCount', 'DESC'], ['createdAt', 'DESC']],
      offset,
      limit: pageSize,
      include: [
        {
          model: Recipe,
          as: 'recipes',
          through: { attributes: [] },
          attributes: ['id']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'nickname', 'avatar'],
          constraints: false
        }
      ]
    })

    // Re-fetch user since Collection has belongsTo User
    const result = await Promise.all(rows.map(async (c) => {
      const data = c.toJSON()
      // get user info directly
      if (data.userId && !data.user) {
        const user = await User.findByPk(data.userId, {
          attributes: ['id', 'username', 'nickname', 'avatar']
        })
        if (user) data.user = user.toJSON()
      }
      data.recipeCount = (data.recipes || []).length
      data.recipes = undefined
      return data
    }))

    return res.status(200).json(resJSON(0, 'ok', {
      list: result,
      total: count,
      page,
      pageSize
    }))
  } catch (err) {
    console.error('[GET /collections/public] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// POST / — 创建收藏夹 (auth)
// ─────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPublic } = req.body

    if (!name || String(name).trim().length === 0) {
      return res.status(400).json(resJSON(400, '收藏夹名称不能为空', null))
    }

    const collection = await Collection.create({
      name: String(name).trim(),
      description: description || null,
      isPublic: isPublic === true,
      userId: req.userId
    })

    return res.status(201).json(resJSON(0, 'ok', collection))
  } catch (err) {
    console.error('[POST /collections] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET / — 获取当前用户所有收藏夹 (auth)
// ─────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const collections = await Collection.findAll({
      where: { userId: req.userId },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Recipe,
          as: 'recipes',
          through: { attributes: [] },
          attributes: ['id']
        }
      ]
    })

    const result = collections.map(c => {
      const data = c.toJSON()
      data.recipeCount = (data.recipes || []).length
      data.recipes = undefined
      return data
    })

    return res.status(200).json(resJSON(0, 'ok', result))
  } catch (err) {
    console.error('[GET /collections] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id — 单个收藏夹详情 (auth)
// ─────────────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params

    const collection = await Collection.findOne({
      where: { id, userId: req.userId }
    })

    if (!collection) {
      return res.status(404).json(resJSON(404, '收藏夹不存在', null))
    }

    let page = parseInt(req.query.page, 10) || 1
    let pageSize = parseInt(req.query.pageSize, 10) || 20
    if (page < 1) page = 1
    if (pageSize > 100) pageSize = 100
    if (pageSize < 1) pageSize = 20

    // Sort & filter support
    const sortBy = req.query.sortBy || 'createdAt'
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC'
    const allowedSorts = ['createdAt', 'title', 'cookTime', 'difficulty', 'favoriteCount']
    const finalSort = allowedSorts.includes(sortBy) ? sortBy : 'createdAt'

    const filterDifficulty = req.query.difficulty

    const totalCount = await CollectionRecipe.count({
      where: { collectionId: id }
    })

    // Build recipe include where clause
    const recipeWhere = {}
    if (filterDifficulty) {
      recipeWhere.difficulty = filterDifficulty
    }

    const recipeRows = await CollectionRecipe.findAll({
      where: { collectionId: id },
      offset: (page - 1) * pageSize,
      limit: pageSize,
      order: [[{ model: Recipe, as: 'Recipe' }, finalSort, sortOrder]],
      include: [
        {
          model: Recipe,
          as: 'Recipe',
          where: Object.keys(recipeWhere).length > 0 ? recipeWhere : undefined,
          attributes: [
            'id', 'title', 'coverImage', 'author', 'cookTime',
            'description', 'category', 'categoryTags', 'servings',
            'difficulty', 'favoriteCount', 'userId', 'createdAt', 'updatedAt'
          ]
        }
      ]
    })

    const recipes = recipeRows.map(r => r.Recipe.toJSON())

    const data = collection.toJSON()
    data.recipes = recipes
    data.totalRecipes = totalCount
    data.page = page
    data.pageSize = pageSize

    return res.status(200).json(resJSON(0, 'ok', data))
  } catch (err) {
    console.error('[GET /collections/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// PUT /:id — 更新收藏夹 (auth)
// ─────────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const collection = await Collection.findOne({
      where: { id, userId: req.userId }
    })

    if (!collection) {
      return res.status(404).json(resJSON(404, '收藏夹不存在', null))
    }

    const { name, description, isPublic } = req.body
    const updateData = {}
    if (name !== undefined) updateData.name = String(name).trim()
    if (description !== undefined) updateData.description = description
    if (isPublic !== undefined) updateData.isPublic = isPublic === true

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json(resJSON(400, '没有需要更新的字段', null))
    }

    await collection.update(updateData)

    return res.status(200).json(resJSON(0, 'ok', collection))
  } catch (err) {
    console.error('[PUT /collections/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// DELETE /:id — 删除收藏夹 (auth)
// ─────────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const collection = await Collection.findOne({
      where: { id, userId: req.userId }
    })

    if (!collection) {
      return res.status(404).json(resJSON(404, '收藏夹不存在', null))
    }

    await CollectionRecipe.destroy({ where: { collectionId: id } })
    await collection.destroy()

    return res.status(200).json(resJSON(0, 'ok', null))
  } catch (err) {
    console.error('[DELETE /collections/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// POST /:id/recipes — 添加食谱到收藏夹 (auth)
// ─────────────────────────────────────────────────────────────────
router.post('/:id/recipes', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { recipeId } = req.body

    if (!recipeId) {
      return res.status(400).json(resJSON(400, 'recipeId 不能为空', null))
    }

    const collection = await Collection.findOne({
      where: { id, userId: req.userId }
    })
    if (!collection) {
      return res.status(404).json(resJSON(404, '收藏夹不存在', null))
    }

    const recipe = await Recipe.findByPk(recipeId)
    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }

    const [entry, created] = await CollectionRecipe.findOrCreate({
      where: { collectionId: id, recipeId },
      defaults: { collectionId: id, recipeId }
    })

    // Auto-set coverImage from first recipe if not set
    const c = collection.toJSON()
    if (!c.coverImage && recipe.coverImage) {
      await collection.update({ coverImage: recipe.coverImage })
    }
    // Update recipeCount
    const recipeCount = await CollectionRecipe.count({ where: { collectionId: id } })
    await collection.update({ recipeCount })

    return res.status(created ? 201 : 200).json(
      resJSON(0, created ? '已添加' : '已在收藏夹中', entry)
    )
  } catch (err) {
    console.error('[POST /collections/:id/recipes] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// DELETE /:id/recipes/:recipeId — 从收藏夹移除食谱 (auth)
// ─────────────────────────────────────────────────────────────────
router.delete('/:id/recipes/:recipeId', auth, async (req, res) => {
  try {
    const { id, recipeId } = req.params

    const collection = await Collection.findOne({
      where: { id, userId: req.userId }
    })
    if (!collection) {
      return res.status(404).json(resJSON(404, '收藏夹不存在', null))
    }

    await CollectionRecipe.destroy({
      where: { collectionId: id, recipeId }
    })

    return res.status(200).json(resJSON(0, 'ok', null))
  } catch (err) {
    console.error('[DELETE /collections/:id/recipes/:recipeId] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// PUT /:id/toggle-public — 切换公开/私密 (auth, owner only)
// ─────────────────────────────────────────────────────────────────
router.put('/:id/toggle-public', auth, async (req, res) => {
  try {
    const { id } = req.params
    const collection = await Collection.findOne({
      where: { id, userId: req.userId }
    })
    if (!collection) {
      return res.status(404).json(resJSON(404, '收藏夹不存在', null))
    }

    const newValue = !collection.isPublic
    await collection.update({ isPublic: newValue })
    return res.status(200).json(resJSON(0, 'ok', { isPublic: newValue }))
  } catch (err) {
    console.error('[PUT /:id/toggle-public] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// POST /:id/subscribe — 订阅收藏夹 (auth)
// ─────────────────────────────────────────────────────────────────
router.post('/:id/subscribe', auth, async (req, res) => {
  try {
    const { id } = req.params
    const collection = await Collection.findByPk(id)
    if (!collection) {
      return res.status(404).json(resJSON(404, '收藏夹不存在', null))
    }
    if (collection.userId === req.userId) {
      return res.status(400).json(resJSON(400, '不能订阅自己的收藏夹', null))
    }
    if (!collection.isPublic) {
      return res.status(400).json(resJSON(400, '该收藏夹未公开', null))
    }

    await collection.increment('subscriberCount', { by: 1 })
    return res.status(200).json(resJSON(0, '订阅成功', null))
  } catch (err) {
    console.error('[POST /:id/subscribe] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// DELETE /:id/subscribe — 取消订阅收藏夹 (auth)
// ─────────────────────────────────────────────────────────────────
router.delete('/:id/subscribe', auth, async (req, res) => {
  try {
    const { id } = req.params
    const collection = await Collection.findByPk(id)
    if (!collection) {
      return res.status(404).json(resJSON(404, '收藏夹不存在', null))
    }

    await collection.decrement('subscriberCount', { by: 1 })
    // ensure not negative (handled by DB default 0)
    return res.status(200).json(resJSON(0, '已取消订阅', null))
  } catch (err) {
    console.error('[DELETE /:id/subscribe] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// Collection Comments — 收藏夹评论互动
// ─────────────────────────────────────────────────────────────────

// GET /:id/comments — 获取收藏夹评论列表
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20))

    const collection = await Collection.findByPk(id)
    if (!collection) {
      return res.status(404).json(resJSON(404, '收藏夹不存在', null))
    }

    const { CollectionComment, User } = require('../models')
    const { rows, count } = await CollectionComment.findAndCountAll({
      where: { collectionId: id },
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: pageSize,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'nickname', 'avatar'],
      }],
    })

    return res.status(200).json(resJSON(0, 'ok', { list: rows, total: count, page, pageSize }))
  } catch (err) {
    console.error('[GET /collections/:id/comments] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// POST /:id/comments — 评论收藏夹 (auth)
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { content } = req.body

    if (!content || String(content).trim().length === 0) {
      return res.status(400).json(resJSON(400, '评论内容不能为空', null))
    }

    const collection = await Collection.findByPk(id)
    if (!collection) {
      return res.status(404).json(resJSON(404, '收藏夹不存在', null))
    }
    if (!collection.isPublic && collection.userId !== req.userId) {
      return res.status(403).json(resJSON(403, '无权评论非公开收藏夹', null))
    }

    const { CollectionComment } = require('../models')
    const comment = await CollectionComment.create({
      collectionId: id,
      userId: req.userId,
      content: String(content).trim(),
    })

    return res.status(201).json(resJSON(0, 'ok', comment))
  } catch (err) {
    console.error('[POST /collections/:id/comments] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// DELETE /:id/comments/:commentId — 删除评论 (auth, owner or admin only)
router.delete('/:id/comments/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params
    const { CollectionComment } = require('../models')
    const comment = await CollectionComment.findByPk(commentId)

    if (!comment) {
      return res.status(404).json(resJSON(404, '评论不存在', null))
    }

    // Only comment author or collection owner can delete
    if (comment.userId !== req.userId) {
      const collection = await Collection.findByPk(comment.collectionId)
      if (!collection || collection.userId !== req.userId) {
        return res.status(403).json(resJSON(403, '无权删除此评论', null))
      }
    }

    await comment.destroy()
    return res.status(200).json(resJSON(0, 'ok', null))
  } catch (err) {
    console.error('[DELETE /collections/:id/comments/:commentId] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

module.exports = router