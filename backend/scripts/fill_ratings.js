/**
 * scripts/fill_ratings.js
 * 为所有食谱生成真实的评分数据
 *
 * 评分分布原则：
 * - 热门食谱（高viewCount/favoriteCount）：评分多（10-18条），平均分高（4.2-4.8）
 * - 普通食谱：评分中等（3-10条），平均分中等（3.5-4.3）
 * - 冷门食谱：评分少（1-3条），可能出现低分（2-3星）
 *
 * 使用方式：
 *   node scripts/fill_ratings.js                         # 插入数据
 *   node scripts/fill_ratings.js --dry-run               # 只预览不插入
 *   node scripts/fill_ratings.js --clear-first           # 先清空旧评分再插入
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

// ── 评分模板 ───────────────────────────────────────────────
// 每道食谱根据流行度排名生成不同分数段和评论数的评分

const ratingComments = {
  5: [
    '非常棒！做出来家人抢着吃 😋',
    '太好吃了，已经做了无数次了',
    '五星好评，教程非常详细，新手也能成功',
    '这食谱太赞了，完全超出预期！',
    '味道绝了，饭店水准，以后不用出去吃了',
    '超级美味，朋友们都说好吃，多次被要食谱',
    '给孩子做的，吃得停不下来，谢谢分享',
    '完美！按照步骤做出来零失败',
    '这配方就是我要找的，味道特别正宗',
    '太好吃了，已经推荐给所有朋友了',
  ],
  4: [
    '不错，味道很好，就是有一点点咸',
    '挺好吃的，步骤详细，一次成功',
    '味道不错，比我想象中简单',
    '好吃！就是卖相没博主做得好哈哈',
    '不错的家常做法，全家都喜欢',
    '味道很好，还会再做，下次试试加辣椒',
    '简单易学，口感不错，推荐',
    '挺好的，一次就成功了，很有成就感',
    '色香味俱全，就是费了点时间',
    '好吃，已收藏，下次做给朋友尝尝',
  ],
  3: [
    '还行吧，味道中规中矩',
    '一般般，可能是我手艺问题',
    '还可以，不难吃但也不是很惊艳',
    '普通家常味道，没什么特别的',
    '步骤挺清楚的，但做出来味道一般',
    '三颗星，味道还可以但是有点油腻',
    '感觉缺了点什么，可能料不够全',
    '做法倒是简单，味道一般般吧',
    '不是很对我的口味，不过家人觉得还行',
    '还可以，下次调整一下配料试试',
  ],
  2: [
    '不太满意，味道偏淡了',
    '失败了，可能是火候没掌握好',
    '做出来跟图片差好多 😅',
    '味道一般，不会再做了',
    '不太推荐，有更好的做法',
    '步骤不够详细，有些地方没看懂',
    '太咸了，建议调整一下配料比例',
    '口感不好，不知道哪里出问题了',
  ],
  1: [
    '完全失败了，味道很奇怪',
    '不推荐，按照步骤做出来很难吃',
    '差评，浪费食材了',
    '教程有误，做出来完全不是那个味',
    '太难了，新手根本做不出来',
    '味道真不行，不会再试了',
  ],
}

// ── 评分分布引擎 ───────────────────────────────────────────
function generateRatings(popularity, recipeId, adminId, secondUserId) {
  // popularity: 0=冷门, 1=普通, 2=热门
  let count, avgTarget, spread

  switch (popularity) {
    case 'hot':
      count = 10 + Math.floor(Math.random() * 9) // 10-18
      avgTarget = 4.2 + Math.random() * 0.6 // 4.2-4.8
      spread = 0.8
      break
    case 'normal':
      count = 3 + Math.floor(Math.random() * 8) // 3-10
      avgTarget = 3.5 + Math.random() * 0.8 // 3.5-4.3
      spread = 1.0
      break
    case 'cold':
    default:
      count = 1 + Math.floor(Math.random() * 3) // 1-3
      avgTarget = 2.5 + Math.random() * 1.0 // 2.5-3.5
      spread = 1.2
      break
  }

  const userIDs = [adminId]
  if (secondUserId) userIDs.push(secondUserId)

  // 生成评分，使最终均值接近 avgTarget
  let ratings = []
  const attempts = 0
  while (ratings.length < count && attempts < 1000) {
    // 用正态近似生成
    let r = Math.round(avgTarget + (Math.random() - 0.5) * spread * 2)
    r = Math.max(1, Math.min(5, r))
    ratings.push(r)
  }

  // 保证每道食谱至少有一条五星评价（如果是热门/普通）
  if (popularity !== 'cold' && !ratings.some(r => r === 5)) {
    ratings[0] = 5
  }

  // 保证至少一条1-3星（避免全是满分）
  if (!ratings.some(r => r <= 3)) {
    ratings[ratings.length - 1] = 2 + Math.floor(Math.random() * 2)
  }

  // 实际数量微调
  ratings = ratings.slice(0, count)

  // 打乱顺序
  for (let i = ratings.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ratings[i], ratings[j]] = [ratings[j], ratings[i]]
  }

  // 生成带日期的评论记录
  const records = []
  const now = new Date()
  for (let i = 0; i < ratings.length; i++) {
    const rating = ratings[i]
    const comments = ratingComments[rating] || ratingComments[3]
    const comment = comments[Math.floor(Math.random() * comments.length)]
    const userId = userIDs[Math.floor(Math.random() * userIDs.length)]

    // 日期从30天前到现在随机分布
    const daysAgo = Math.floor(Math.random() * 30)
    const date = new Date(now.getTime() - daysAgo * 86400000 - Math.floor(Math.random() * 86400000))

    records.push({
      content: comment,
      rating,
      userId,
      recipeId,
      likesCount: Math.floor(Math.random() * 20),
      createdAt: date.toISOString().replace('T', ' ').slice(0, 19),
    })
  }

  return records
}

// ── 主逻辑 ─────────────────────────────────────────────────
async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const clearFirst = process.argv.includes('--clear-first')

  const { Sequelize } = require('sequelize')

  const dbConfig = {
    host: process.env.DB_HOST || '172.17.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    database: process.env.DB_NAME || 'food_website',
    username: process.env.DB_USER || 'food_user',
    password: process.env.DB_PASS || 'food_password',
    dialect: 'mysql',
  }

  const sequelize = new Sequelize(dbConfig)

  try {
    await sequelize.authenticate()
    console.log('✅ 数据库连接成功')

    // 获取用户ID
    const [users] = await sequelize.query('SELECT id, username FROM users')
    const adminId = users.find(u => u.username === 'admin')?.id
    const secondId = users.find(u => u.username !== 'admin')?.id
    console.log(`👤 管理员: ${adminId?.slice(0, 8)}... ${secondId ? `其他: ${secondId.slice(0, 8)}...` : '无'}`)

    if (!adminId) {
      console.error('❌ 未找到管理员用户')
      process.exit(1)
    }

    // 获取食谱按流行度排序
    const [rawRecipes] = await sequelize.query(
      'SELECT id, title, category, viewCount, favoriteCount FROM recipes ORDER BY (COALESCE(viewCount,0)*0.3 + COALESCE(favoriteCount,0)*2) DESC'
    )
    console.log(`📊 共 ${rawRecipes.length} 道食谱`)

    // 分为热门(30%)、普通(40%)、冷门(30%)
    const total = rawRecipes.length
    const hotCount = Math.ceil(total * 0.3)
    const normalCount = Math.ceil(total * 0.4)

    const recipes = rawRecipes.map((r, i) => ({
      ...r,
      popularity: i < hotCount ? 'hot' : i < hotCount + normalCount ? 'normal' : 'cold',
    }))

    // 统计
    const popCount = { hot: 0, normal: 0, cold: 0 }
    recipes.forEach(r => popCount[r.popularity]++)
    console.log(`📊 热门: ${popCount.hot}, 普通: ${popCount.normal}, 冷门: ${popCount.cold}`)

    // 清空旧数据
    if (clearFirst && !dryRun) {
      console.log('🧹 清空旧评论和评分数据...')
      await sequelize.query('DELETE FROM comments')
      await sequelize.query('UPDATE recipes SET avgRating=0, ratingCount=0')
      console.log('✅ 旧数据已清空')
    }

    // 生成评分数据
    let allRecords = []
    const recipeStats = []

    for (const recipe of recipes) {
      const records = generateRatings(recipe.popularity, recipe.id, adminId, secondId)
      allRecords = allRecords.concat(records)

      const sum = records.reduce((s, r) => s + r.rating, 0)
      recipeStats.push({
        id: recipe.id,
        title: recipe.title,
        popularity: recipe.popularity,
        count: records.length,
        avg: sum / records.length,
      })

      if (dryRun) {
        const stars = '⭐'.repeat(Math.round(sum / records.length))
        console.log(`  [${recipe.popularity}] ${recipe.title.slice(0, 12)}: ${records.length}条, 均分${(sum / records.length).toFixed(1)}${stars}`)
      }
    }

    if (dryRun) {
      console.log(`\n📋 DRY-RUN 完成，共 ${allRecords.length} 条待插入`)
      const ratingDist = {}
      allRecords.forEach(r => { ratingDist[r.rating] = (ratingDist[r.rating] || 0) + 1 })
      console.log('评分分布:', Object.entries(ratingDist).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}星:${v}条`).join(', '))
      return
    }

    // 批量插入评论
    console.log(`\n🔄 正在插入 ${allRecords.length} 条评论...`)
    const BATCH = 50
    for (let i = 0; i < allRecords.length; i += BATCH) {
      const batch = allRecords.slice(i, i + BATCH)
      const values = batch.map(r =>
        `('${r.content.replace(/'/g, "\\'")}', ${r.rating}, '${r.userId}', '${r.recipeId}', ${r.likesCount}, '${r.createdAt}')`
      ).join(',\n')
      try {
        await sequelize.query(
          `INSERT INTO comments (content, rating, userId, recipeId, likesCount, createdAt) VALUES ${values}`
        )
      } catch (err) {
        console.error(`❌ 批次 ${i}-${i + BATCH} 插入失败:`, err.message)
      }
      if ((i / BATCH) % 4 === 0) process.stdout.write('.')
    }
    console.log('\n✅ 评论插入完成')

    // 更新每道食谱的 avgRating 和 ratingCount
    console.log('🔄 更新食谱评分统计...')
    let updated = 0
    for (const stat of recipeStats) {
      const [rows] = await sequelize.query(
        `UPDATE recipes SET avgRating=${stat.avg.toFixed(2)}, ratingCount=${stat.count} WHERE id='${stat.id}'`
      )
      if (rows.affectedRows > 0) updated++
    }
    console.log(`✅ 更新了 ${updated}/${recipeStats.length} 道食谱的评分统计`)

    // 打印最终统计
    const [result] = await sequelize.query(
      "SELECT COUNT(*) AS withRatings, AVG(avgRating) AS avgAvg FROM recipes WHERE ratingCount > 0"
    )
    console.log(`\n📊 最终统计:`)
    console.log(`  有评分食谱: ${result[0].withRatings}`)
    console.log(`  平均评分: ${parseFloat(result[0].avgAvg || 0).toFixed(2)}`)
    console.log(`  总评论数: ${allRecords.length}`)

  } catch (err) {
    console.error('❌ 脚本执行失败:', err.message)
    console.error(err.stack)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

main()