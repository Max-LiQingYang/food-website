/**
 * seed-enhance-season.js
 * 迭代#17：为55道食谱添加季节标签 + 难度校准
 * 运行方式：容器内 docker exec food-backend node seeds/seed-enhance-season.js
 *
 * season 可选值: spring, summer, autumn, winter, all（四季皆宜）
 */

const { Sequelize, DataTypes } = require('sequelize')

const DB_NAME = process.env.DB_NAME || 'food_website'
const DB_USER = process.env.DB_USER || 'food_user'
const DB_PASS = process.env.DB_PASSWORD || process.env.DB_PASS || 'food_password'
const DB_HOST = process.env.DB_HOST || '172.17.0.1'

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  dialect: 'mysql',
  logging: false
})

// 季节数据：按 title 匹配
const SEASON_DATA = {
  '白切鸡': 'summer',
  '白灼基围虾': 'summer',
  '班尼迪克蛋': 'spring',
  '葱油拌面': 'spring',
  '醋溜白菜': 'autumn',
  '大盘鸡': 'autumn',
  '德州烤排骨': 'summer',
  '地三鲜': 'summer',
  '东北乱炖': 'winter',
  '东坡肉': 'autumn',
  '冬阴功汤': 'summer',
  '剁椒鱼头': 'winter',
  '法式焦糖布丁': 'all',
  '法式洋葱汤': 'winter',
  '番茄意面': 'summer',
  '干煸四季豆': 'summer',
  '干锅花菜': 'autumn',
  '宫保鸡丁': 'all',
  '韩式拌饭': 'all',
  '韩式炒年糕': 'winter',
  '韩式烤五花肉': 'summer',
  '韩式泡菜炒五花肉': 'autumn',
  '蚝油生菜': 'spring',
  '红烧牛腩': 'autumn',
  '红烧肉': 'autumn',
  '焦糖布丁': 'all',
  '凯撒沙拉': 'summer',
  '可乐鸡翅': 'summer',
  '辣子鸡': 'winter',
  '兰州牛肉面': 'all',
  '卤肉饭': 'winter',
  '罗宋汤': 'winter',
  '麻酱凉面': 'summer',
  '麻婆豆腐': 'winter',
  '芒果糯米饭': 'summer',
  '抹茶千层蛋糕': 'spring',
  '奶油蘑菇汤': 'winter',
  '奶油培根意面': 'all',
  '啤酒鸭': 'autumn',
  '清蒸鲈鱼': 'spring',
  '日式咖喱饭': 'autumn',
  '日式牛丼': 'all',
  '日式照烧鸡腿': 'all',
  '水煮牛肉': 'winter',
  '酸菜鱼': 'winter',
  '酸辣土豆丝': 'summer',
  '蒜蓉粉丝蒸扇贝': 'summer',
  '泰式绿咖喱鸡': 'summer',
  '泰式酸辣鸡爪': 'summer',
  '糖醋排骨': 'autumn',
  '提拉米苏': 'all',
  '味噌拉面': 'winter',
  '西红柿炒鸡蛋': 'summer',
  '虾饺': 'summer',
  '小炒黄牛肉': 'winter',
  '小炒肉': 'spring',
  '扬州炒饭': 'spring',
  '意大利肉酱面': 'all',
  '印式咖喱角': 'all',
  '鱼头豆腐汤': 'winter',
  '鱼香肉丝': 'all',
  '越南牛肉河粉': 'all',
  '章鱼小丸子': 'summer',
  // 回锅肉有 2 个版本，用 v2 variant
}const DIFFICULTY_CALIBRATION = {
  // easy → medium（偏简单的菜但需要一定技巧）
  '可乐鸡翅': 'medium',
  '蒜蓉粉丝蒸扇贝': 'medium',
  '清蒸鲈鱼': 'medium',
  // medium → hard（工艺复杂的菜）
  '大盘鸡': 'hard',
  '红烧肉': 'hard',
  // hard → easy（实际不难的菜）
  '班尼迪克蛋': 'medium',  // 荷包蛋+荷兰酱其实有技巧, medium合理
  '凯撒沙拉': 'easy',
}

async function main() {
  try {
    await sequelize.authenticate()
    console.log('✅ DB connected')

    // 1. 先添加 season 列（如不存在）
    try {
      await sequelize.query("ALTER TABLE recipes ADD COLUMN season VARCHAR(32) DEFAULT NULL COMMENT '季节标签: spring/summer/autumn/winter/all'")
      console.log('✅ Added season column')
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('ℹ️  season column already exists')
      } else {
        throw e
      }
    }

    // 2. 批量更新季节标签
    let seasonUpdated = 0
    let seasonSkipped = 0
    for (const [title, season] of Object.entries(SEASON_DATA)) {
      const [result] = await sequelize.query(
        'UPDATE recipes SET season = ? WHERE title = ? AND (season IS NULL OR season = "")',
        { replacements: [season, title] }
      )
      if (result.affectedRows > 0) {
        seasonUpdated += result.affectedRows
        console.log(`  ✅ ${title} → season=${season}`)
      } else {
        seasonSkipped++
      }
    }
    console.log(`\n📊 Season: ${seasonUpdated} updated, ${seasonSkipped} skipped (already set)`)

    // 3. 难度校准
    let diffUpdated = 0
    for (const [title, newDifficulty] of Object.entries(DIFFICULTY_CALIBRATION)) {
      const [result] = await sequelize.query(
        'UPDATE recipes SET difficulty = ? WHERE title = ? AND difficulty != ?',
        { replacements: [newDifficulty, title, newDifficulty] }
      )
      if (result.affectedRows > 0) {
        diffUpdated += result.affectedRows
        console.log(`  ✅ ${title} → difficulty=${newDifficulty}`)
      }
    }
    console.log(`\n📊 Difficulty calibration: ${diffUpdated} updated`)

    // 4. 验证最终分布
    const [stats] = await sequelize.query(
      "SELECT difficulty, COUNT(*) as cnt FROM recipes GROUP BY difficulty ORDER BY difficulty"
    )
    console.log('\n📊 Final difficulty distribution:', JSON.stringify(stats))

    const [seasonStats] = await sequelize.query(
      "SELECT season, COUNT(*) as cnt FROM recipes GROUP BY season ORDER BY season"
    )
    console.log('📊 Season distribution:', JSON.stringify(seasonStats))

    // 5. 确认 favoriteCount/commentCount 列已存在
    try {
      await sequelize.query("ALTER TABLE recipes ADD COLUMN favoriteCount INT DEFAULT 0 NOT NULL COMMENT '收藏计数'")
      console.log('✅ Added favoriteCount column')
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('ℹ️  favoriteCount column already exists')
      } else { throw e }
    }
    try {
      await sequelize.query("ALTER TABLE recipes ADD COLUMN commentCount INT DEFAULT 0 NOT NULL COMMENT '评论计数'")
      console.log('✅ Added commentCount column')
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('ℹ️  commentCount column already exists')
      } else { throw e }
    }

    // 6. 回填 favoriteCount / commentCount
    await sequelize.query(`
      UPDATE recipes r SET r.favoriteCount = (
        SELECT COUNT(*) FROM favorites f WHERE f.recipeId = r.id AND f.isDeleted = 0
      )
    `)
    await sequelize.query(`
      UPDATE recipes r SET r.commentCount = (
        SELECT COUNT(*) FROM comments c WHERE c.recipeId = r.id
      )
    `)
    console.log('✅ Backfilled favoriteCount and commentCount')

    await sequelize.close()
    console.log('\n✅ Season seed complete!')
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

main()