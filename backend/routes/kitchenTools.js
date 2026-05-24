'use strict'

/**
 * routes/kitchenTools.js
 * 厨房工具管理 — 工具列表 + 用户工具库 + 食谱工具关联 + 推荐
 */

const express = require('express')
const router = express.Router()
const { Op } = require('sequelize')
const { KitchenTool, RecipeTool, UserTool, Recipe } = require('../models')
const auth = require('../middleware/auth')

// ── 公开路由 ─────────────────────────────────────────────────────────────────

// 获取所有工具（按分类分组）
router.get('/tools', async (req, res) => {
  try {
    const { category, essential } = req.query
    const where = {}
    if (category) where.category = category
    if (essential === 'true') where.essential = true

    const tools = await KitchenTool.findAll({
      where,
      order: [['category', 'ASC'], ['name', 'ASC']],
    })
    res.json({ code: 0, data: { list: tools, total: tools.length } })
  } catch (err) {
    console.error('[GET /tools] error:', err.message)
    res.status(500).json({ code: 500, message: '获取工具列表失败' })
  }
})

// 获取特定食谱所需工具
router.get('/recipes/:recipeId/tools', async (req, res) => {
  try {
    const { recipeId } = req.params
    const tools = await RecipeTool.findAll({
      where: { recipeId },
      include: [{ model: KitchenTool, as: 'tool' }],
    })
    const toolList = tools.map(rt => rt.tool).filter(Boolean)
    res.json({ code: 0, data: { list: toolList, total: toolList.length } })
  } catch (err) {
    console.error('[GET /recipes/:id/tools] error:', err.message)
    res.status(500).json({ code: 500, message: '获取食谱工具失败' })
  }
})

// 获取食谱缺少的工具（基于用户已有工具）
router.get('/recipes/:recipeId/missing-tools', auth, async (req, res) => {
  try {
    const { recipeId } = req.params
    const userId = req.user.userId

    // 获取食谱所需工具
    const recipeTools = await RecipeTool.findAll({
      where: { recipeId },
      include: [{ model: KitchenTool, as: 'tool' }],
    })
    const neededTools = recipeTools.map(rt => rt.tool).filter(Boolean)
    if (!neededTools.length) {
      return res.json({ code: 0, data: { list: [], total: 0, message: '该食谱无需特殊工具' } })
    }

    // 获取用户已有的工具
    const userTools = await UserTool.findAll({
      where: { userId },
      include: [{ model: KitchenTool, as: 'tool' }],
    })
    const ownedToolIds = new Set(userTools.map(ut => ut.toolId))

    // 找出缺少的工具
    const missingTools = neededTools.filter(t => !ownedToolIds.has(t.id))

    res.json({ code: 0, data: { list: missingTools, total: missingTools.length } })
  } catch (err) {
    console.error('[GET /missing-tools] error:', err.message)
    res.status(500).json({ code: 500, message: '获取缺少工具失败' })
  }
})

// ── 需认证路由 ────────────────────────────────────────────────────────────

// 创建工具（管理员）
router.post('/tools', auth, async (req, res) => {
  try {
    const { name, category, icon, description, essential } = req.body
    const tool = await KitchenTool.create({ name, category, icon, description, essential })
    res.status(201).json({ code: 0, data: tool, message: '工具创建成功' })
  } catch (err) {
    console.error('[POST /tools] error:', err.message)
    res.status(500).json({ code: 500, message: '创建工具失败' })
  }
})

// 给食谱添加工具关联
router.post('/recipes/:recipeId/tools', auth, async (req, res) => {
  try {
    const { recipeId } = req.params
    const { toolId } = req.body
    const existing = await RecipeTool.findOne({ where: { recipeId, toolId } })
    if (existing) return res.status(400).json({ code: 400, message: '已关联该工具' })
    const link = await RecipeTool.create({ recipeId, toolId })
    res.status(201).json({ code: 0, data: link, message: '工具关联成功' })
  } catch (err) {
    console.error('[POST /recipes/:id/tools] error:', err.message)
    res.status(500).json({ code: 500, message: '关联工具失败' })
  }
})

// 删除食谱工具关联
router.delete('/recipes/:recipeId/tools/:toolId', auth, async (req, res) => {
  try {
    await RecipeTool.destroy({ where: { recipeId: req.params.recipeId, toolId: req.params.toolId } })
    res.json({ code: 0, message: '工具关联已删除' })
  } catch (err) {
    console.error('[DELETE /tools/:id] error:', err.message)
    res.status(500).json({ code: 500, message: '删除关联失败' })
  }
})

// ── 用户工具库 ─────────────────────────────────────────────────────────────

// 获取用户的工具库
router.get('/my-tools', auth, async (req, res) => {
  try {
    const userTools = await UserTool.findAll({
      where: { userId: req.user.userId },
      include: [{ model: KitchenTool, as: 'tool' }],
    })
    const tools = userTools.map(ut => ut.tool).filter(Boolean)
    res.json({ code: 0, data: { list: tools, total: tools.length } })
  } catch (err) {
    console.error('[GET /my-tools] error:', err.message)
    res.status(500).json({ code: 500, message: '获取工具库失败' })
  }
})

// 添加工具到用户工具库
router.post('/my-tools', auth, async (req, res) => {
  try {
    const { toolId } = req.body
    const existing = await UserTool.findOne({ where: { userId: req.user.userId, toolId } })
    if (existing) return res.status(400).json({ code: 400, message: '已添加该工具' })
    await UserTool.create({ userId: req.user.userId, toolId })
    res.status(201).json({ code: 0, message: '工具添加成功' })
  } catch (err) {
    console.error('[POST /my-tools] error:', err.message)
    res.status(500).json({ code: 500, message: '添加工具失败' })
  }
})

// 从用户工具库删除工具
router.delete('/my-tools/:toolId', auth, async (req, res) => {
  try {
    await UserTool.destroy({ where: { userId: req.user.userId, toolId: req.params.toolId } })
    res.json({ code: 0, message: '工具已移除' })
  } catch (err) {
    console.error('[DELETE /my-tools/:id] error:', err.message)
    res.status(500).json({ code: 500, message: '移除工具失败' })
  }
})

// 批量添加工具到用户工具库
router.post('/my-tools/batch', auth, async (req, res) => {
  try {
    const { toolIds } = req.body
    const userId = req.user.userId
    if (!Array.isArray(toolIds) || !toolIds.length) {
      return res.status(400).json({ code: 400, message: '请提供工具 ID 列表' })
    }
    let added = 0
    for (const toolId of toolIds) {
      const existing = await UserTool.findOne({ where: { userId, toolId } })
      if (!existing) {
        await UserTool.create({ userId, toolId })
        added++
      }
    }
    res.json({ code: 0, data: { added }, message: `成功添加 ${added} 个工具` })
  } catch (err) {
    console.error('[POST /my-tools/batch] error:', err.message)
    res.status(500).json({ code: 500, message: '批量添加工具失败' })
  }
})

module.exports = router