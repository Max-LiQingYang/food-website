'use strict'

/**
 * routes/reports.js
 * 举报路由
 *
 * POST  /reports                    — 提交举报（需认证）
 * GET   /reports                    — 获取举报列表（admin 专用）
 * PUT   /reports/:id/review         — 审查举报（admin 专用）
 */

const express = require('express')
const { Op } = require('sequelize')
const { Report, Recipe, User } = require('../models')
const auth = require('../middleware/auth')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

/**
 * POST /reports
 * 提交举报（需认证）
 */
router.post('/', auth, async (req, res) => {
  try {
    const { recipeId, reason, description } = req.body

    if (!recipeId) {
      return res.status(400).json(resJSON(400, '请指定被举报的食谱', null))
    }

    const validReasons = ['spam', 'inappropriate', 'copyright', 'inaccurate', 'other']
    if (!validReasons.includes(reason)) {
      return res.status(400).json(resJSON(400, '举报原因无效', null))
    }

    if (description && description.length > 1000) {
      return res.status(400).json(resJSON(400, '补充说明不能超过 1000 字', null))
    }

    // 检查食谱是否存在
    const recipe = await Recipe.findByPk(recipeId)
    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }

    // 不能举报自己的食谱
    if (recipe.userId === req.userId) {
      return res.status(400).json(resJSON(400, '不能举报自己的食谱', null))
    }

    // 检查是否已举报过该食谱
    const existing = await Report.findOne({
      where: { recipeId, reporterId: req.userId, status: 'pending' }
    })
    if (existing) {
      return res.status(400).json(resJSON(400, '你已经举报过这个食谱了', null))
    }

    const report = await Report.create({
      recipeId,
      reporterId: req.userId,
      reason,
      description: description || null,
      status: 'pending'
    })

    return res.status(201).json(resJSON(0, '举报已提交', { id: report.id, status: report.status }))
  } catch (err) {
    console.error('[POST /reports] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

/**
 * GET /reports
 * 获取举报列表（admin 专用）
 */
router.get('/', auth, async (req, res) => {
  try {
    // 检查 role（admin 专用）
    
    const { User: UserModel } = require('../models')
    const currentUser = await UserModel.findByPk(req.userId)
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json(resJSON(403, '仅管理员可查看举报列表', null))
    }

    let page = parseInt(req.query.page, 10) || 1
    let pageSize = parseInt(req.query.pageSize, 10) || 20
    const status = req.query.status // pending|reviewed|dismissed|resolved

    if (page < 1) page = 1
    if (pageSize > 100) pageSize = 100

    const where = {}
    if (status && ['pending', 'reviewed', 'dismissed', 'resolved'].includes(status)) {
      where.status = status
    }

    const offset = (page - 1) * pageSize
    const { count, rows } = await Report.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize,
      include: [
        { model: Recipe, as: 'recipe', attributes: ['id', 'title', 'coverImage', 'userId'] },
        { model: User, as: 'reporter', attributes: ['id', 'username', 'nickname'] }
      ]
    })

    return res.status(200).json(
      resJSON(0, 'ok', {
        list: rows,
        total: count,
        page,
        pageSize
      })
    )
  } catch (err) {
    console.error('[GET /reports] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

/**
 * PUT /reports/:id/review
 * 审查举报（admin 专用）
 */
router.put('/:id/review', auth, async (req, res) => {
  try {
    const { User: UserModel } = require('../models')
    const currentUser = await UserModel.findByPk(req.userId)
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json(resJSON(403, '仅管理员可审查举报', null))
    }

    const { id } = req.params
    const { status } = req.body

    const validStatuses = ['reviewed', 'dismissed', 'resolved']
    if (!validStatuses.includes(status)) {
      return res.status(400).json(resJSON(400, '无效的处理状态', null))
    }

    const report = await Report.findByPk(id)
    if (!report) {
      return res.status(404).json(resJSON(404, '举报不存在', null))
    }

    report.status = status
    report.reviewedAt = new Date()
    report.reviewerId = req.userId
    await report.save()

    return res.status(200).json(resJSON(0, '处理完成', report))
  } catch (err) {
    console.error('[PUT /reports/:id/review] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router