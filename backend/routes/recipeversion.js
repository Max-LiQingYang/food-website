'use strict'

/**
 * routes/recipeversion.js
 * 食谱版本历史与对比路由
 *
 * GET  /api/recipe-versions/:recipeId            — 获取某食谱的所有版本列表
 * GET  /api/recipe-versions/:recipeId/diff?v1=X&v2=Y — 对比两个版本
 *
 * 公开端点（无需认证），只读。
 */

const express = require('express')
const { RecipeVersion, Recipe } = require('../models')
const { Op } = require('sequelize')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

// ─────────────────────────────────────────────────────────────────
// GET /:recipeId — 版本列表
// ─────────────────────────────────────────────────────────────────
router.get('/:recipeId', async (req, res) => {
  try {
    const { recipeId } = req.params

    const recipe = await Recipe.findByPk(recipeId, { attributes: ['id', 'title'] })
    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在'))
    }

    const versions = await RecipeVersion.findAll({
      where: { recipeId },
      order: [['version', 'DESC']],
    })

    const parsed = versions.map(v => {
      const data = v.toJSON()
      try { data.changes = JSON.parse(data.changes || '{}') } catch { data.changes = {} }
      return data
    })

    return res.json(resJSON(0, 'ok', {
      recipeTitle: recipe.title,
      recipeId,
      versions: parsed,
      total: parsed.length,
    }))
  } catch (err) {
    console.error('[GET /recipe-versions/:recipeId] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误'))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:recipeId/diff?v1=X&v2=Y — 版本对比
// ─────────────────────────────────────────────────────────────────
router.get('/:recipeId/diff', async (req, res) => {
  try {
    const { recipeId } = req.params
    const v1 = parseInt(req.query.v1, 10)
    const v2 = parseInt(req.query.v2, 10)

    if (!v1 || !v2 || v1 === v2) {
      return res.status(400).json(resJSON(400, '请提供两个不同的版本号 v1 和 v2'))
    }

    const recipe = await Recipe.findByPk(recipeId, { attributes: ['id', 'title'] })
    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在'))
    }

    // 按版本号查询（排序以确保 old/new 正确）
    const [verA, verB] = await Promise.all([
      RecipeVersion.findOne({ where: { recipeId, version: v1 } }),
      RecipeVersion.findOne({ where: { recipeId, version: v2 } }),
    ])

    if (!verA || !verB) {
      return res.status(404).json(resJSON(404, '版本不存在'))
    }

    // v1 < v2 时，v1 是旧版本，v2 是新版本
    const oldVer = v1 < v2 ? verA : verB
    const newVer = v1 < v2 ? verB : verA

    let oldSnapshot = {}
    let newSnapshot = {}
    try { oldSnapshot = JSON.parse(oldVer.changes || '{}') } catch { oldSnapshot = {} }
    try { newSnapshot = JSON.parse(newVer.changes || '{}') } catch { newSnapshot = {} }

    // 提取 snapshot
    const oldData = oldSnapshot.snapshot || {}
    const newData = newSnapshot.snapshot || {}

    // 计算变更字段
    const allFields = new Set([
      ...Object.keys(oldData),
      ...Object.keys(newData),
    ])
    const changedFields = []
    const fieldDiffs = {}

    for (const field of allFields) {
      if (field === 'updatedAt' || field === 'createdAt') continue
      const oldVal = JSON.stringify(oldData[field])
      const newVal = JSON.stringify(newData[field])
      if (oldVal !== newVal) {
        changedFields.push(field)
        fieldDiffs[field] = {
          old: oldData[field],
          new: newData[field],
          status: !oldData[field] ? 'added' : !newData[field] ? 'removed' : 'modified',
        }
      }
    }

    return res.json(resJSON(0, 'ok', {
      recipeTitle: recipe.title,
      recipeId,
      oldVersion: {
        version: oldVer.version,
        createdAt: oldVer.createdAt,
        summary: oldVer.summary,
      },
      newVersion: {
        version: newVer.version,
        createdAt: newVer.createdAt,
        summary: newVer.summary,
      },
      changedFields,
      fieldDiffs,
      totalChanged: changedFields.length,
    }))
  } catch (err) {
    console.error('[GET /recipe-versions/:recipeId/diff] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误'))
  }
})

module.exports = router