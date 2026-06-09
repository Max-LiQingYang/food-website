'use strict'

/**
 * routes/dashboard.js
 * 个性化烹饪仪表板路由
 *
 * GET /  — 获取个人烹饪仪表板数据（概览、趋势、营养、口味、菜系、建议、成就）
 *          保留原 authorStats 作为子对象（向后兼容）
 */

const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { Recipe, Comment, Favorite, User, CookingLog, NutritionLog, NutritionGoal, Achievement, Sequelize, sequelize } = require('../models')
const Op = Sequelize.Op
const { getAllAchievementsWithProgress } = require('../utils/achievementChecker')

function resJSON(code, message, data) {
  return { code, message, data }
}

/** Safe JSON parse for categoryTags / nutrition fields */
function safeParseJSON(raw) {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try { return JSON.parse(raw) } catch { return null }
}

/** Get Monday of current week */
function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

// GET / — 个人烹饪仪表板
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.userId

    // ═══════════════════════════════════════════════════════════
    // 1. Overview 统计
    // ═══════════════════════════════════════════════════════════
    const totalCooks = await CookingLog.count({ where: { userId } })
    const totalFavorites = await Favorite.count({ where: { userId, isDeleted: false } })
    const totalComments = await Comment.count({ where: { userId } })
    const totalRecipes = await Recipe.count({ where: { userId } })

    // Week cooking counts
    const now = new Date()
    const thisMonday = getMonday(now)
    const lastMonday = new Date(thisMonday)
    lastMonday.setDate(lastMonday.getDate() - 7)

    const weekCookCount = await CookingLog.count({
      where: { userId, cookedAt: { [Op.gte]: thisMonday } }
    })
    const lastWeekCookCount = await CookingLog.count({
      where: { userId, cookedAt: { [Op.gte]: lastMonday, [Op.lt]: thisMonday } }
    })

    // Week change percentage
    let weekChangePct = 0
    if (lastWeekCookCount > 0) {
      weekChangePct = Math.round(((weekCookCount - lastWeekCookCount) / lastWeekCookCount) * 1000) / 10
    } else if (weekCookCount > 0) {
      weekChangePct = 100.0 // first week with data
    }

    // Week average rating
    const weekAvgRatingResult = await CookingLog.findAll({
      where: { userId, cookedAt: { [Op.gte]: thisMonday }, rating: { [Op.ne]: null } },
      attributes: [[Sequelize.fn('AVG', Sequelize.col('rating')), 'avgRating']],
      raw: true
    })
    const weekAvgRating = weekAvgRatingResult[0]?.avgRating
      ? Math.round(parseFloat(weekAvgRatingResult[0].avgRating) * 10) / 10
      : 0

    // ═══════════════════════════════════════════════════════════
    // 2. Streak 连续烹饪天数
    // ═══════════════════════════════════════════════════════════
    const streakDates = await CookingLog.findAll({
      where: { userId },
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('cookedAt')), 'date']],
      order: [['cookedAt', 'DESC']],
      limit: 365,
      raw: true
    })
    const dateSet = new Set(streakDates.map(d => {
      const val = d.date
      return typeof val === 'string' ? val.slice(0, 10) : new Date(val).toISOString().slice(0, 10)
    }))
    let streak = 0
    const todayStr = now.toISOString().slice(0, 10)
    for (let i = 0; i <= 365; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().slice(0, 10)
      if (dateSet.has(ds)) {
        streak++
      } else {
        // Allow today to have no record yet (start from yesterday)
        if (i === 0) continue
        break
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 3. CookingTrend 近30天每日烹饪次数
    // ═══════════════════════════════════════════════════════════
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const trendRows = await CookingLog.findAll({
      where: { userId, cookedAt: { [Op.gte]: thirtyDaysAgo } },
      attributes: ['cookedAt', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      group: ['cookedAt'],
      order: [['cookedAt', 'ASC']],
      raw: true
    })
    const trendMap = {}
    trendRows.forEach(r => {
      const val = r.cookedAt
      const key = typeof val === 'string' ? val.slice(0, 10) : new Date(val).toISOString().slice(0, 10)
      trendMap[key] = parseInt(r.count, 10)
    })
    const cookingTrend = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().slice(0, 10)
      cookingTrend.push({ date: ds, count: trendMap[ds] || 0 })
    }

    // ═══════════════════════════════════════════════════════════
    // 4. NutritionRadar 近7天营养摄入 vs 目标
    // ═══════════════════════════════════════════════════════════
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Get nutrition goal
    let goalObj = await NutritionGoal.findOne({ where: { userId } })
    let goalValues
    if (goalObj) {
      goalValues = {
        calories: parseFloat(goalObj.calories) || 2000,
        protein: parseFloat(goalObj.protein) || 60,
        fat: parseFloat(goalObj.fat) || 65,
        carbs: parseFloat(goalObj.carbs) || 250,
        fiber: parseFloat(goalObj.fiber) || 25,
        sodium: 2000 // sodium not in NutritionGoal model, use default
      }
    } else {
      const recommended = NutritionGoal.getRecommended()
      goalValues = {
        calories: recommended.calories || 2000,
        protein: recommended.protein || 60,
        fat: recommended.fat || 65,
        carbs: recommended.carbs || 250,
        fiber: recommended.fiber || 25,
        sodium: 2000
      }
    }

    const nutritionAvg = await NutritionLog.findAll({
      where: { userId, date: { [Op.gte]: sevenDaysAgo } },
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('calories')), 'calories'],
        [Sequelize.fn('AVG', Sequelize.col('protein')), 'protein'],
        [Sequelize.fn('AVG', Sequelize.col('fat')), 'fat'],
        [Sequelize.fn('AVG', Sequelize.col('carbs')), 'carbs'],
        [Sequelize.fn('AVG', Sequelize.col('fiber')), 'fiber'],
        [Sequelize.fn('AVG', Sequelize.col('sodium')), 'sodium']
      ],
      raw: true
    })
    const nav = nutritionAvg[0] || {}
    const nutritionRadar = {
      actual: {
        calories: nav.calories ? Math.round(parseFloat(nav.calories) / goalValues.calories * 1000) / 10 : 0,
        protein: nav.protein ? Math.round(parseFloat(nav.protein) / goalValues.protein * 1000) / 10 : 0,
        fat: nav.fat ? Math.round(parseFloat(nav.fat) / goalValues.fat * 1000) / 10 : 0,
        carbs: nav.carbs ? Math.round(parseFloat(nav.carbs) / goalValues.carbs * 1000) / 10 : 0,
        fiber: nav.fiber ? Math.round(parseFloat(nav.fiber) / goalValues.fiber * 1000) / 10 : 0,
        sodium: nav.sodium ? Math.round(parseFloat(nav.sodium) / goalValues.sodium * 1000) / 10 : 0
      },
      goal: {
        calories: 100,
        protein: 100,
        fat: 100,
        carbs: 100,
        fiber: 100,
        sodium: 100
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 5. FlavorDistribution & CuisineDistribution
    // ═══════════════════════════════════════════════════════════
    // 5a. Favorited recipes' categoryTags
    const favRecipes = await Favorite.findAll({
      where: { userId, isDeleted: false },
      include: [{ model: Recipe, as: 'recipe', attributes: ['id', 'categoryTags'] }],
      raw: false
    })
    const flavorCount = {}
    const cuisineCount = {}
    const userCuisineSet = new Set()

    favRecipes.forEach(fav => {
      const tags = safeParseJSON(fav.recipe?.categoryTags)
      if (tags) {
        if (tags.flavor) flavorCount[tags.flavor] = (flavorCount[tags.flavor] || 0) + 1
        if (tags.cuisine) {
          cuisineCount[tags.cuisine] = (cuisineCount[tags.cuisine] || 0) + 1
          userCuisineSet.add(tags.cuisine)
        }
      }
    })

    // 5b. Cooked recipes' categoryTags (weight x2)
    // CookingLog doesn't have Recipe association, so we fetch cooked recipeIds separately
    const cookedLogRows = await CookingLog.findAll({
      where: { userId },
      attributes: ['recipeId', 'recipeCategory'],
      raw: true
    })
    const cookedRecipeIdSet = new Set(cookedLogRows.map(cl => cl.recipeId))
    if (cookedRecipeIdSet.size > 0) {
      const cookedRecipeRows = await Recipe.findAll({
        where: { id: { [Op.in]: [...cookedRecipeIdSet] } },
        attributes: ['id', 'categoryTags'],
        raw: true
      })
      const cookedRecipeMap = {}
      cookedRecipeRows.forEach(r => { cookedRecipeMap[r.id] = safeParseJSON(r.categoryTags) })
      cookedLogRows.forEach(cl => {
        const tags = cookedRecipeMap[cl.recipeId]
        if (tags) {
          if (tags.flavor) flavorCount[tags.flavor] = (flavorCount[tags.flavor] || 0) + 2
          if (tags.cuisine) {
            cuisineCount[tags.cuisine] = (cuisineCount[tags.cuisine] || 0) + 2
            userCuisineSet.add(tags.cuisine)
          }
        }
        // Also use recipeCategory as fallback
        if (cl.recipeCategory) {
          userCuisineSet.add(cl.recipeCategory)
          cuisineCount[cl.recipeCategory] = (cuisineCount[cl.recipeCategory] || 0) + 1
        }
      })
    }

    const flavorDistribution = Object.entries(flavorCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const cuisineDistribution = Object.entries(cuisineCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // ═══════════════════════════════════════════════════════════
    // 6. Suggestions
    // ═══════════════════════════════════════════════════════════
    // 6a. Untried cuisines
    const allCuisineRows = await Recipe.findAll({
      attributes: ['categoryTags'],
      raw: true
    })
    const allCuisineSet = new Set()
    const cuisineRecipeCount = {}
    allCuisineRows.forEach(r => {
      const tags = safeParseJSON(r.categoryTags)
      if (tags?.cuisine) {
        allCuisineSet.add(tags.cuisine)
        cuisineRecipeCount[tags.cuisine] = (cuisineRecipeCount[tags.cuisine] || 0) + 1
      }
    })
    const untriedCuisines = [...allCuisineSet]
      .filter(c => !userCuisineSet.has(c))
      .map(c => ({
        name: c,
        recipeCount: cuisineRecipeCount[c] || 0,
        link: `/category/${encodeURIComponent(c)}`
      }))
      .sort((a, b) => b.recipeCount - a.recipeCount)
      .slice(0, 5)

    // 6b. Nutrient gap
    const nutrientLabels = {
      calories: '热量', protein: '蛋白质', fat: '脂肪',
      carbs: '碳水', fiber: '纤维', sodium: '钠'
    }
    let nutrientGap = null
    const actual = nutritionRadar.actual
    let minPct = Infinity
    let gapNutrient = null
    for (const [key, pct] of Object.entries(actual)) {
      if (pct < minPct) {
        minPct = pct
        gapNutrient = key
      }
    }
    if (gapNutrient && minPct < 100) {
      // Find recipe highest in that nutrient
      const topRecipeForNutrient = await Recipe.findAll({
        attributes: ['id', 'title', 'coverImage', 'nutrition'],
        raw: true,
        limit: 100
      })
      let bestRecipe = null
      let bestVal = 0
      topRecipeForNutrient.forEach(r => {
        const nut = safeParseJSON(r.nutrition)
        if (nut && nut[gapNutrient]) {
          const val = parseFloat(nut[gapNutrient])
          if (val > bestVal) {
            bestVal = val
            bestRecipe = {
              id: r.id,
              title: r.title,
              coverImage: r.coverImage || '',
              nutrition: { [gapNutrient]: val }
            }
          }
        }
      })
      nutrientGap = {
        nutrient: gapNutrient,
        nutrientLabel: nutrientLabels[gapNutrient] || gapNutrient,
        currentPct: minPct,
        recommendedRecipe: bestRecipe
      }
    }

    // 6c. Not cooked favorites
    // Use manual approach: find all fav recipe IDs, subtract cooked recipe IDs
    const allFavRows = await Favorite.findAll({
      where: { userId, isDeleted: false },
      attributes: ['recipeId'],
      raw: true
    })
    const favRecipeIds = allFavRows.map(f => f.recipeId)
    const cookedRecipeIds = await CookingLog.findAll({
      where: { userId },
      attributes: ['recipeId'],
      raw: true
    })
    const cookedSet = new Set(cookedRecipeIds.map(c => c.recipeId))
    const unCookedIds = favRecipeIds.filter(id => !cookedSet.has(id))
    let finalNotCooked = []
    if (unCookedIds.length > 0) {
      const unCookedRecipes = await Recipe.findAll({
        where: { id: { [Op.in]: unCookedIds.slice(0, 6) } },
        attributes: ['id', 'title', 'coverImage', 'category'],
        raw: true
      })
      finalNotCooked = unCookedRecipes.map(r => ({
        id: r.id,
        title: r.title,
        coverImage: r.coverImage || '',
        category: r.category || ''
      }))
    }

    // ═══════════════════════════════════════════════════════════
    // 7. Achievements
    // ═══════════════════════════════════════════════════════════
    const recentAchievements = await Achievement.findAll({
      where: { userId },
      order: [['unlockedAt', 'DESC']],
      limit: 3,
      raw: true
    })
    const recent = recentAchievements.map(a => ({
      type: a.type,
      title: a.title,
      icon: a.icon,
      unlockedAt: a.unlockedAt ? (typeof a.unlockedAt === 'string' ? a.unlockedAt.slice(0, 10) : new Date(a.unlockedAt).toISOString().slice(0, 10)) : ''
    }))

    // Next milestone
    let nextMilestone = null
    try {
      const allAchievements = await getAllAchievementsWithProgress(userId)
      const locked = allAchievements
        .filter(a => !a.unlocked && a.progress > 0)
        .sort((a, b) => (b.progress / b.maxProgress) - (a.progress / a.maxProgress))
      if (locked.length > 0) {
        const next = locked[0]
        nextMilestone = {
          type: next.type,
          title: next.title,
          icon: next.icon,
          description: next.description,
          progress: next.progress,
          maxProgress: next.maxProgress
        }
      }
    } catch (err) {
      console.error('[Dashboard] achievementChecker error:', err.message)
    }

    // ═══════════════════════════════════════════════════════════
    // 8. AuthorStats (保留原有逻辑，向后兼容)
    // ═══════════════════════════════════════════════════════════
    const myRecipes = await Recipe.findAll({
      where: { userId },
      attributes: ['id', 'title', 'viewCount', 'favoriteCount', 'createdAt', 'qualityScore']
    })
    const myRecipeIds = myRecipes.map(r => r.id)

    const authorTotalViews = myRecipes.reduce((sum, r) => sum + (r.viewCount || 0), 0)
    const authorTotalFavorites = myRecipes.reduce((sum, r) => sum + (r.favoriteCount || 0), 0)
    const authorTotalComments = myRecipeIds.length > 0
      ? await Comment.count({ where: { recipeId: { [Op.in]: myRecipeIds } } })
      : 0

    // View trend (estimated)
    const authorViewTrend = []
    const authorFavTrend = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      let dailyViews = 0
      let dailyFavs = 0
      for (const recipe of myRecipes) {
        const daysSinceCreation = Math.max(1, Math.ceil((Date.now() - new Date(recipe.createdAt).getTime()) / 86400000))
        if (daysSinceCreation <= 30 && i < daysSinceCreation) {
          dailyViews += Math.round((recipe.viewCount || 0) / daysSinceCreation * 0.3)
          dailyFavs += Math.round((recipe.favoriteCount || 0) / daysSinceCreation * 0.3)
        }
      }
      authorViewTrend.push({ date: dateStr, views: dailyViews })
      authorFavTrend.push({ date: dateStr, favorites: dailyFavs })
    }

    // Rating distribution
    const ratingDistribution = myRecipeIds.length > 0
      ? await Comment.findAll({
          where: { recipeId: { [Op.in]: myRecipeIds }, rating: { [Op.ne]: null } },
          attributes: ['rating', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
          group: ['rating'],
          raw: true
        })
      : []
    const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    ratingDistribution.forEach(r => { ratingDist[r.rating] = parseInt(r.count, 10) })

    // Word cloud
    const recentAuthorComments = myRecipeIds.length > 0
      ? await Comment.findAll({
          where: { recipeId: { [Op.in]: myRecipeIds } },
          attributes: ['content'],
          limit: 100,
          order: [['createdAt', 'DESC']],
          raw: true
        })
      : []
    const stopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那', '这个', '那个', '什么', '怎么', '为什么', '非常', '真的', '但是', '而且', '因为', '所以', '如果', '虽然', '可以', '应该', '能够', '可能', '已经', '还是', '就是', '只是', '不是', '觉得', '感觉', '好吃', '不错', '喜欢', '太', '很'])
    const wordFreq = {}
    recentAuthorComments.forEach(c => {
      const text = c.content || ''
      const words = text.match(/[\u4e00-\u9fa5]{2,4}/g) || []
      words.forEach(w => {
        if (!stopWords.has(w) && w.length >= 2) {
          wordFreq[w] = (wordFreq[w] || 0) + 1
        }
      })
    })
    const wordCloud = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([text, value]) => ({ text, value }))

    // Points
    const pointsFromViews = Math.round(authorTotalViews * 0.1)
    const pointsFromFavs = authorTotalFavorites * 5
    const pointsFromComments = authorTotalComments * 3
    const totalPoints = pointsFromViews + pointsFromFavs + pointsFromComments

    // Top recipes
    const topRecipes = myRecipes
      .map(r => ({
        id: r.id,
        title: r.title,
        views: r.viewCount || 0,
        favorites: r.favoriteCount || 0,
        qualityScore: r.qualityScore || 0,
        points: Math.round((r.viewCount || 0) * 0.1 + (r.favoriteCount || 0) * 5)
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10)

    const authorStats = {
      totalRecipes: myRecipes.length,
      totalViews: authorTotalViews,
      totalFavorites: authorTotalFavorites,
      totalComments: authorTotalComments,
      totalPoints,
      viewTrend: authorViewTrend,
      favTrend: authorFavTrend,
      ratingDistribution: ratingDist,
      wordCloud,
      topRecipes
    }

    // ═══════════════════════════════════════════════════════════
    // Response
    // ═══════════════════════════════════════════════════════════
    return res.json(resJSON(0, 'ok', {
      overview: {
        totalCooks,
        totalFavorites,
        totalComments,
        totalRecipes,
        streak,
        weekCookCount,
        lastWeekCookCount,
        weekChangePct,
        weekAvgRating
      },
      cookingTrend,
      nutritionRadar,
      flavorDistribution,
      cuisineDistribution,
      suggestions: {
        untriedCuisines,
        nutrientGap,
        notCookedFavorites: finalNotCooked
      },
      achievements: {
        recent,
        nextMilestone
      },
      authorStats
    }))
  } catch (err) {
    console.error('[GET /dashboard] Error:', err)
    return res.status(500).json(resJSON(500, '获取统计数据失败', null))
  }
})

module.exports = router
