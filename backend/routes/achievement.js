'use strict'

/**
 * routes/achievement.js
 * 成就系统路由
 *
 * GET  /                       — 获取当前用户成就列表（需认证）
 * GET  /user/:userId           — 获取指定用户完整成就列表（含未解锁，含进度）
 * GET  /user/:userId/grouped   — 获取指定用户成就按分类分组
 */

const express = require('express')
const { Achievement, Recipe, Favorite, Comment, CookingLog, Follow, sequelize } = require('../models')
const auth = require('../middleware/auth')
const { getAllAchievementsWithProgress } = require('../utils/achievementChecker')

const router = express.Router()

// ─────────────────────────────────────────────────────────────────
// 全量成就定义 + 分类元数据
// ─────────────────────────────────────────────────────────────────
const ALL_ACHIEVEMENTS = [
  // 发布者类 (publisher)
  { type: 'first_recipe', title: '初次下厨', description: '发布第一篇食谱', icon: '🍳', category: 'publisher', maxProgress: 1 },
  { type: 'ten_recipes', title: '小有名气', description: '发布 10 篇食谱', icon: '📝', category: 'publisher', maxProgress: 10 },
  { type: 'fifty_recipes', title: '食谱达人', description: '发布 50 篇食谱', icon: '📚', category: 'publisher', maxProgress: 50 },
  { type: 'hundred_recipes', title: '食谱大师', description: '发布 100 篇食谱', icon: '👨‍🍳', category: 'publisher', maxProgress: 100 },
  { type: 'popular_recipe', title: '人气食谱', description: '一篇食谱获得 100+ 收藏', icon: '🔥', category: 'publisher', maxProgress: 100 },
  // 收藏家类
  { type: 'first_favorite', title: '初次收藏', description: '收藏第一篇食谱', icon: '❤️', category: 'collector', maxProgress: 1 },
  { type: 'ten_favorites', title: '收藏爱好者', description: '收藏 10 篇食谱', icon: '💕', category: 'collector', maxProgress: 10 },
  { type: 'fifty_favorites', title: '美食收藏家', description: '收藏 50 篇食谱', icon: '📋', category: 'collector', maxProgress: 50 },
  // 评论家类
  { type: 'first_comment', title: '首次发言', description: '发表第一篇评论', icon: '💬', category: 'commenter', maxProgress: 1 },
  { type: 'ten_comments', title: '活跃评论', description: '发表 10 条评论', icon: '🗣️', category: 'commenter', maxProgress: 10 },
  { type: 'fifty_comments', title: '评论达人', description: '发表 50 条评论', icon: '📢', category: 'commenter', maxProgress: 50 },
  // 厨神（烹饪）类
  { type: 'first_cook', title: '初次烹饪', description: '记录第一次烹饪', icon: '🔪', category: 'cook', maxProgress: 1 },
  { type: 'ten_cooks', title: '烹饪新手', description: '完成 10 次烹饪', icon: '🥘', category: 'cook', maxProgress: 10 },
  { type: 'thirty_cooks', title: '家常大厨', description: '完成 30 次烹饪', icon: '🍲', category: 'cook', maxProgress: 30 },
  { type: 'hundred_cooks', title: '厨神降临', description: '完成 100 次烹饪', icon: '👑', category: 'cook', maxProgress: 100 },
  { type: 'streak_7', title: '连续七天', description: '连续 7 天下厨', icon: '🔥', category: 'cook', maxProgress: 7 },
  // 探索家类
  { type: 'browse_50', title: '美食探索者', description: '浏览 50 篇食谱', icon: '🔍', category: 'explorer', maxProgress: 50 },
  { type: 'cuisine_master', title: '菜系通吃', description: '烹饪过 5 种菜系', icon: '🌏', category: 'explorer', maxProgress: 5 },
  // 社交达人类
  { type: 'first_follow', title: '首次关注', description: '关注第一位用户', icon: '👋', category: 'social', maxProgress: 1 },
  { type: 'ten_followers', title: '小有人气', description: '获得 10 位粉丝', icon: '🌟', category: 'social', maxProgress: 10 },
  { type: 'fifty_followers', title: '人气之星', description: '获得 50 位粉丝', icon: '⭐', category: 'social', maxProgress: 50 },
  { type: 'ten_following', title: '广泛关注', description: '关注 10 位用户', icon: '👀', category: 'social', maxProgress: 10 },
]

const CATEGORY_META = {
  publisher: { label: '发布者', color: '#e8663e' },
  collector: { label: '收藏家', color: '#e74c3c' },
  commenter: { label: '评论家', color: '#8e44ad' },
  cook: { label: '厨神', color: '#f39c12' },
  explorer: { label: '探索家', color: '#2ecc71' },
  social: { label: '社交', color: '#3498db' },
}

function resJSON(code, message, data) {
  return { code, message, data }
}

// ─────────────────────────────────────────────────────────────────
// GET / — 获取当前用户成就列表（已解锁）
// ─────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const achievements = await Achievement.findAll({
      where: { userId: req.userId },
      order: [['unlockedAt', 'DESC']]
    })
    return res.status(200).json(resJSON(0, 'ok', achievements))
  } catch (err) {
    console.error('[GET /achievements] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /user/:userId — 获取指定用户完整成就列表（含进度）
// 返回所有成就定义 + 用户解锁状态 + 当前进度
// ─────────────────────────────────────────────────────────────────
router.get('/user/:userId', async (req, res) => {
  try {
    const result = await getAllAchievementsWithProgress(req.params.userId)
    return res.status(200).json(resJSON(0, 'ok', result))
  } catch (err) {
    console.error('[GET /achievements/user/:userId] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /user/:userId/grouped — 获取指定用户成就按分类分组
// 返回全量成就定义 + 解锁状态 + 当前进度，按 category 分组
// ─────────────────────────────────────────────────────────────────
router.get('/user/:userId/grouped', async (req, res) => {
  try {
    const { userId } = req.params

    // 查询用户已解锁的成就
    const unlocked = await Achievement.findAll({
      where: { userId },
      raw: true
    })
    const unlockedMap = {}
    for (const a of unlocked) {
      unlockedMap[a.type] = a
    }

    // 计算各类 progress
    const recipeCount = await Recipe.count({ where: { userId: userId } })
    const favoriteCount = await Favorite.count({ where: { userId } })
    const commentCount = await Comment.count({ where: { userId } })
    const cookCount = await CookingLog.count({ where: { userId } })
    const followerCount = await Follow.count({ where: { followeeId: userId } })
    const followingCount = await Follow.count({ where: { followingId: userId } })

    // 菜系通吃：统计不重复的 recipe category
    const distinctCategories = await CookingLog.findAll({
      include: [{ model: Recipe, attributes: ['category'], where: { userId: userId } }],
      group: ['Recipe.category'],
      raw: true
    })
    const cuisineCount = distinctCategories.length

    // 最受欢迎的食谱收藏数
    const maxFavs = await Favorite.findAll({
      attributes: [[sequelize.fn('COUNT', '*'), 'cnt']],
      include: [{ model: Recipe, attributes: [], where: { userId: userId } }],
      group: ['recipeId'],
      order: [[sequelize.fn('COUNT', '*'), 'DESC']],
      limit: 1,
      raw: true
    })
    const maxRecipeFavs = maxFavs.length > 0 ? Number(maxFavs[0].cnt) : 0

    // 浏览计数 (从 CookingLog 总数替代)
    const browseCount = await CookingLog.count({ where: { userId } })

    // 构建完整成就列表
    const categories = {}
    for (const def of ALL_ACHIEVEMENTS) {
      let progress = 0
      switch (def.type) {
        case 'first_recipe': progress = recipeCount; break
        case 'ten_recipes': progress = recipeCount; break
        case 'fifty_recipes': progress = recipeCount; break
        case 'hundred_recipes': progress = recipeCount; break
        case 'popular_recipe': progress = maxRecipeFavs; break
        case 'first_favorite': progress = favoriteCount; break
        case 'ten_favorites': progress = favoriteCount; break
        case 'fifty_favorites': progress = favoriteCount; break
        case 'first_comment': progress = commentCount; break
        case 'ten_comments': progress = commentCount; break
        case 'fifty_comments': progress = commentCount; break
        case 'first_cook': progress = cookCount; break
        case 'ten_cooks': progress = cookCount; break
        case 'thirty_cooks': progress = cookCount; break
        case 'hundred_cooks': progress = cookCount; break
        case 'streak_7': progress = 0; break  // 连续天数计算较复杂，暂为0
        case 'browse_50': progress = browseCount; break
        case 'cuisine_master': progress = cuisineCount; break
        case 'first_follow': progress = followingCount; break
        case 'ten_followers': progress = followerCount; break
        case 'fifty_followers': progress = followerCount; break
        case 'ten_following': progress = followingCount; break
        default: progress = 0
      }

      const existing = unlockedMap[def.type]
      const isUnlocked = existing && existing.unlockedAt

      if (!categories[def.category]) {
        categories[def.category] = {
          key: def.category,
          label: CATEGORY_META[def.category]?.label || def.category,
          color: CATEGORY_META[def.category]?.color || '#999',
          total: 0,
          unlocked: 0,
          achievements: []
        }
      }

      categories[def.category].achievements.push({
        ...def,
        unlocked: !!isUnlocked,
        unlockedAt: existing?.unlockedAt || null,
        progress: Math.min(progress, def.maxProgress),
        maxProgress: def.maxProgress
      })
      categories[def.category].total++
      if (isUnlocked) categories[def.category].unlocked++
    }

    const totalCount = ALL_ACHIEVEMENTS.length
    const unlockedCount = ALL_ACHIEVEMENTS.filter(d => unlockedMap[d.type]).length

    res.json({
      userId,
      totalCount,
      unlockedCount,
      categories: Object.values(categories)
    })
  } catch (err) {
    console.error('achievements grouped error:', err)
    res.status(500).json({ error: 'Failed to load achievements' })
  }
})

module.exports = router