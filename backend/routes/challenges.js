'use strict'

/**
 * routes/challenges.js
 * 挑战赛系统 — CRUD + 投稿 + 投票 + 排行榜
 */

const express = require('express')
const router = express.Router()
const { Op } = require('sequelize')
const { Challenge, ChallengeSubmission, ChallengeVote, Recipe, User } = require('../models')
const auth = require('../middleware/auth')
const { createNotification } = require('../utils/notificationHelper')

// ── 公开路由 ─────────────────────────────────────────────────────────────────

// 获取挑战列表（支持按状态筛选、分页）
router.get('/challenges', async (req, res) => {
  try {
    const { status, page = '1', pageSize = '12' } = req.query
    const where = {}
    if (status) where.status = status
    else where.status = { [Op.ne]: 'draft' }

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const { count, rows } = await Challenge.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(pageSize),
      offset,
    })
    res.json({ code: 0, data: { list: rows, total: count, page: parseInt(page), pageSize: parseInt(pageSize) } })
  } catch (err) {
    console.error('[GET /challenges] error:', err.message)
    res.status(500).json({ code: 500, message: '获取挑战列表失败' })
  }
})

// 获取挑战详情（含投稿列表）
router.get('/challenges/:id', async (req, res) => {
  try {
    const { id } = req.params
    const challenge = await Challenge.findByPk(id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'username', 'nickname'] }],
    })
    if (!challenge) {
      return res.status(404).json({ code: 404, message: '挑战不存在' })
    }
    res.json({ code: 0, data: challenge })
  } catch (err) {
    console.error('[GET /challenges/:id] error:', err.message)
    res.status(500).json({ code: 500, message: '获取挑战详情失败' })
  }
})

// 获取挑战投稿列表（按投票数排序）
router.get('/challenges/:id/submissions', async (req, res) => {
  try {
    const { id } = req.params
    const { page = '1', pageSize = '20' } = req.query
    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const { count, rows } = await ChallengeSubmission.findAndCountAll({
      where: { challengeId: id },
      order: [['voteCount', 'DESC'], ['createdAt', 'ASC']],
      limit: parseInt(pageSize),
      offset,
      include: [
        { model: Recipe, as: 'recipe', attributes: ['id', 'title', 'coverImage', 'description', 'difficulty', 'cookTime'] },
        { model: User, as: 'submitter', attributes: ['id', 'username', 'nickname'] },
      ],
    })
    res.json({ code: 0, data: { list: rows, total: count, page: parseInt(page), pageSize: parseInt(pageSize) } })
  } catch (err) {
    console.error('[GET /submissions] error:', err.message)
    res.status(500).json({ code: 500, message: '获取投稿列表失败' })
  }
})

// ── 需认证路由 ────────────────────────────────────────────────────────────

// 创建挑战（仅管理员）
router.post('/challenges', auth, async (req, res) => {
  try {
    const { title, description, theme, coverImage, startDate, endDate, status, rules, prize } = req.body
    const challenge = await Challenge.create({
      title, description, theme, coverImage, startDate, endDate,
      status: status || 'draft', rules, prize,
      createdBy: req.userId,
    })
    res.status(201).json({ code: 0, data: challenge, message: '挑战创建成功' })
  } catch (err) {
    console.error('[POST /challenges] error:', err.message)
    res.status(500).json({ code: 500, message: '创建挑战失败' })
  }
})

// 用户投稿
router.post('/challenges/:id/submit', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { recipeId, description } = req.body

    const challenge = await Challenge.findByPk(id)
    if (!challenge) return res.status(404).json({ code: 404, message: '挑战不存在' })
    if (challenge.status !== 'active') return res.status(400).json({ code: 400, message: '挑战未开始或已结束' })

    const recipe = await Recipe.findByPk(recipeId)
    if (!recipe) return res.status(404).json({ code: 404, message: '食谱不存在' })

    // 检查是否已投稿
    const existing = await ChallengeSubmission.findOne({ where: { challengeId: id, userId: req.userId } })
    if (existing) return res.status(400).json({ code: 400, message: '您已投稿，不可重复投递' })

    const submission = await ChallengeSubmission.create({
      challengeId: id,
      recipeId,
      userId: req.userId,
      description,
    })

    // 异步更新投稿计数 + 通知挑战创建者
    setImmediate(async () => {
      try {
        await Challenge.increment('submissionCount', { by: 1, where: { id } })
        // 通知挑战创建者有新投稿
        if (challenge.createdBy && challenge.createdBy !== req.userId) {
          const submitterUser = await User.findByPk(req.userId, { attributes: ['nickname', 'username'] })
          const userName = (submitterUser && (submitterUser.nickname || submitterUser.username)) || '某用户'
          createNotification({
            userId: challenge.createdBy,
            type: 'challenge_update',
            actorId: req.userId,
            message: userName + ' 投稿参与了挑战「' + challenge.title + '」',
            link: '/challenges/' + id,
            targetId: id,
            targetType: 'challenge',
          }).catch(() => {})
        }
      } catch (e) { console.error('[submit] notification error:', e.message) }
    })

    res.status(201).json({ code: 0, data: submission, message: '投稿成功' })
  } catch (err) {
    console.error('[POST /submit] error:', err.message)
    res.status(500).json({ code: 500, message: '投稿失败' })
  }
})

// 投票（每人每个挑战仅能投一票，但可改投）
router.post('/challenges/:id/vote', auth, async (req, res) => {
  try {
    const challengeId = req.params.id
    const { submissionId } = req.body
    const userId = req.userId

    const challenge = await Challenge.findByPk(challengeId)
    if (!challenge) return res.status(404).json({ code: 404, message: '挑战不存在' })
    if (challenge.status !== 'voting' && challenge.status !== 'active') {
      return res.status(400).json({ code: 400, message: '当前不可投票' })
    }

    const submission = await ChallengeSubmission.findByPk(submissionId)
    if (!submission || submission.challengeId !== challengeId) {
      return res.status(404).json({ code: 404, message: '投稿不存在' })
    }

    // 检查用户是否已投票 — 如果已投则改投（删除旧票 + 创建新票）
    const existingVote = await ChallengeVote.findOne({ where: { submissionId: { [Op.ne]: submissionId }, userId, '$submission.challengeId$': challengeId }, include: [{ model: ChallengeSubmission, as: 'submission', attributes: [] }] })

    // 更简单：先查该用户的旧票
    const oldVote = await ChallengeVote.findOne({
      include: [{
        model: ChallengeSubmission, as: 'submission', where: { challengeId },
      }],
      where: { userId },
    })

    const t = await require('../config/database').transaction()

    try {
      if (oldVote) {
        // 改投：删除旧票，扣减旧投稿得票
        await ChallengeVote.destroy({ where: { id: oldVote.id }, transaction: t })
        await ChallengeSubmission.decrement('voteCount', { by: 1, where: { id: oldVote.submissionId }, transaction: t })
      }

      // 创建新票
      const vote = await ChallengeVote.create({ submissionId, userId }, { transaction: t })
      await ChallengeSubmission.increment('voteCount', { by: 1, where: { id: submissionId }, transaction: t })
      await Challenge.increment('voteCount', { by: oldVote ? 0 : 1, where: { id: challengeId }, transaction: t })

      await t.commit()

      const msg = oldVote ? '改投成功' : '投票成功'
      res.json({ code: 0, data: vote, message: msg })
    } catch (err) {
      await t.rollback()
      throw err
    }
  } catch (err) {
    console.error('[POST /vote] error:', err.message)
    res.status(500).json({ code: 500, message: '投票失败' })
  }
})

// 获取用户对当前挑战的投票状态
router.get('/challenges/:id/my-vote', auth, async (req, res) => {
  try {
    const { id } = req.params
    const vote = await ChallengeVote.findOne({
      include: [{
        model: ChallengeSubmission, as: 'submission', where: { challengeId: id },
      }],
      where: { userId: req.userId },
    })
    res.json({ code: 0, data: vote ? { submissionId: vote.submissionId, voted: true } : { voted: false } })
  } catch (err) {
    console.error('[GET /my-vote] error:', err.message)
    res.status(500).json({ code: 500, message: '获取投票状态失败' })
  }
})

// 排行榜（基于投票数 + 投稿活跃度）
router.get('/challenges/:id/ranking', async (req, res) => {
  try {
    const { id } = req.params
    const submissions = await ChallengeSubmission.findAll({
      where: { challengeId: id },
      order: [['voteCount', 'DESC'], ['createdAt', 'ASC']],
      include: [
        { model: Recipe, as: 'recipe', attributes: ['id', 'title', 'coverImage', 'description', 'difficulty', 'userId'] },
        { model: User, as: 'submitter', attributes: ['id', 'username', 'nickname'] },
      ],
    })
    const ranked = submissions.map((s, i) => ({
      rank: i + 1,
      id: s.id,
      recipeId: s.recipeId,
      recipe: s.recipe,
      submitter: s.submitter,
      voteCount: s.voteCount,
      description: s.description,
      createdAt: s.createdAt,
    }))
    res.json({ code: 0, data: { list: ranked, total: ranked.length, challengeId: id } })
  } catch (err) {
    console.error('[GET /ranking] error:', err.message)
    res.status(500).json({ code: 500, message: '获取排行榜失败' })
  }
})

// 获取用户本人的投稿列表
router.get('/my-submissions', auth, async (req, res) => {
  try {
    const submissions = await ChallengeSubmission.findAll({
      where: { userId: req.userId },
      order: [['createdAt', 'DESC']],
      include: [
        { model: Challenge, as: 'challenge', attributes: ['id', 'title', 'theme', 'status'] },
        { model: Recipe, as: 'recipe', attributes: ['id', 'title', 'coverImage'] },
      ],
    })
    res.json({ code: 0, data: { list: submissions, total: submissions.length } })
  } catch (err) {
    console.error('[GET /my-submissions] error:', err.message)
    res.status(500).json({ code: 500, message: '获取投稿列表失败' })
  }
})

// 删除投稿（仅投稿者）
router.delete('/submissions/:id', auth, async (req, res) => {
  try {
    const submission = await ChallengeSubmission.findByPk(req.params.id)
    if (!submission) return res.status(404).json({ code: 404, message: '投稿不存在' })
    if (submission.userId !== req.userId) {
      return res.status(403).json({ code: 403, message: '无权操作' })
    }
    const challengeId = submission.challengeId
    await submission.destroy()
    setImmediate(async () => {
      try {
        await Challenge.decrement('submissionCount', { by: 1, where: { id: challengeId } })
      } catch (e) { console.error('[delete sub] decrement error:', e.message) }
    })
    res.json({ code: 0, message: '投稿已删除' })
  } catch (err) {
    console.error('[DELETE /submissions] error:', err.message)
    res.status(500).json({ code: 500, message: '删除投稿失败' })
  }
})

// ── 通知相关 ──────────────────────────────────────────────────────────────

// 获取挑战的所有参与者ID（内部辅助）
async function getChallengeParticipantIds(challengeId) {
  const subs = await ChallengeSubmission.findAll({
    where: { challengeId },
    attributes: ['userId'],
    raw: true,
  })
  const ids = subs.map(s => s.userId)
  return [...new Set(ids)]
}

/**
 * 通知挑战所有参与者（挑战状态变更时由管理员触发）
 * POST /challenges/:id/notify-participants
 * Body: { message, status? }
 */
router.post('/challenges/:id/notify-participants', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { message, status } = req.body

    const challenge = await Challenge.findByPk(id)
    if (!challenge) return res.status(404).json({ code: 404, message: '挑战不存在' })

    const participantIds = await getChallengeParticipantIds(id)
    // 添加创建者也纳入通知
    if (challenge.createdBy && !participantIds.includes(challenge.createdBy)) {
      participantIds.push(challenge.createdBy)
    }

    if (participantIds.length === 0) {
      return res.json({ code: 0, data: { notified: 0 }, message: '暂无参与者需要通知' })
    }

    const notifMessage = message || (status
      ? '挑战「' + challenge.title + '」状态已更新为：' + status
      : '挑战「' + challenge.title + '」有新的更新')

    let notified = 0
    const errors = []

    for (const userId of participantIds) {
      try {
        await createNotification({
          userId,
          type: 'challenge_update',
          message: notifMessage,
          link: '/challenges/' + id,
          targetId: id,
          targetType: 'challenge',
        })
        notified++
      } catch (e) {
        errors.push(userId)
      }
    }

    res.json({
      code: 0,
      data: { notified, total: participantIds.length, errors: errors.length },
      message: `已通知 ${notified}/${participantIds.length} 位参与者`,
    })
  } catch (err) {
    console.error('[POST /notify-participants] error:', err.message)
    res.status(500).json({ code: 500, message: '通知发送失败' })
  }
})

module.exports = router