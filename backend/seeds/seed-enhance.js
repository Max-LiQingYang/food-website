#!/usr/bin/env node
/**
 * seeds/seed-enhance.js
 * 增强现有食谱数据：为 10 道热门食谱补充营养信息（nutrition）和烹饪小贴士（tips）
 *
 * 运行方式：
 *   cd backend && node seeds/seed-enhance.js
 *
 * 注意：此脚本通过匹配 title 更新已有食谱，不会删除或重建数据。
 */

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const { Sequelize, DataTypes } = require('sequelize')

// 数据库连接（复用项目配置）
const DB_CONFIG = {
  dialect: process.env.DB_DIALECT || 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3307', 10),
  username: process.env.DB_USER || 'food',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || 'food',
  database: process.env.DB_NAME || 'food',
  logging: false,
}

const sequelize = new Sequelize(DB_CONFIG.database, DB_CONFIG.username, DB_CONFIG.password, {
  host: DB_CONFIG.host,
  port: DB_CONFIG.port,
  dialect: DB_CONFIG.dialect,
  logging: false,
})

// ─── 10 道热门食谱增强数据 ──────────────────────────────────────────
const ENHANCED_RECIPES = [
  {
    title: '宫保鸡丁',
    nutrition: { calories: 385, protein: 28, fat: 22, carbs: 16, fiber: 2, sodium: 820 },
    tips: '炒花生米时一定要小火慢炒，否则容易外焦里生。腌制鸡丁时加少许蛋清能让肉质更嫩滑。鱼香汁提前调好，下锅后大火快炒才够锅气。',
  },
  {
    title: '红烧肉',
    nutrition: { calories: 520, protein: 18, fat: 42, carbs: 12, fiber: 0, sodium: 650 },
    tips: '五花肉选肥瘦相间的三层肉最合适。炒糖色时用小火，冰糖融化成琥珀色即可下肉，过火会发苦。炖煮时加一勺黄酒能去腥增香。收汁时不要离开锅，很容易糊。',
  },
  {
    title: '西红柿炒鸡蛋',
    nutrition: { calories: 180, protein: 12, fat: 12, carbs: 8, fiber: 2, sodium: 480 },
    tips: '鸡蛋打散后加少许水或牛奶，炒出来更嫩。番茄先切小块炒出红油再下蛋，味道更浓郁。最后撒一点葱花和白糖提鲜，酸甜平衡更好吃。',
  },
  {
    title: '麻婆豆腐',
    nutrition: { calories: 220, protein: 14, fat: 15, carbs: 10, fiber: 3, sodium: 980 },
    tips: '豆腐先用盐水焯一下，既去豆腥又不易碎。豆瓣酱一定要炒出红油才够香。勾芡分两次，第一次薄芡让汤汁变稠，第二次厚芡挂在豆腐上。',
  },
  {
    title: '糖醋排骨',
    nutrition: { calories: 450, protein: 22, fat: 28, carbs: 30, fiber: 1, sodium: 720 },
    tips: '排骨焯水后用厨房纸吸干水分，下锅炸时不易溅油。糖醋汁的比例是 3 份糖、2 份醋、1 份生抽，这是黄金比例。炸排骨复炸一次外皮更酥脆。',
  },
  {
    title: '鱼香肉丝',
    nutrition: { calories: 310, protein: 20, fat: 18, carbs: 18, fiber: 3, sodium: 860 },
    tips: '肉丝逆着纹路切，炒出来不柴。泡椒是鱼香味的关键，没有泡椒可以用剁椒加少许醋代替。鱼香汁要提前调好，下锅后全程大火快炒。',
  },
  {
    title: '水煮牛肉',
    nutrition: { calories: 380, protein: 32, fat: 24, carbs: 8, fiber: 2, sodium: 1100 },
    tips: '牛肉逆纹切薄片，用蛋清和淀粉上浆，煮出来才嫩。最后淋热油那一步不能省，油要烧到冒烟才能激发出辣椒和花椒的香味。垫底的蔬菜可以用豆芽、莴笋或白菜。',
  },
  {
    title: '清蒸鲈鱼',
    nutrition: { calories: 180, protein: 26, fat: 7, carbs: 2, fiber: 0, sodium: 380 },
    tips: '鱼腹内的黑膜一定要刮干净，否则会苦。蒸鱼水开后计时，一斤左右的鱼蒸 8-10 分钟刚好。蒸出来的汤汁很腥，一定要倒掉再淋蒸鱼豉油。最后浇一勺滚烫的花生油，鱼肉瞬间锁住鲜味。',
  },
  {
    title: '番茄意面',
    nutrition: { calories: 340, protein: 10, fat: 12, carbs: 48, fiber: 4, sodium: 520 },
    tips: '煮意面的水要像海水一样咸（1000ml 水加 10g 盐），这样面条才有底味。意面煮到比包装说明少 1 分钟，在酱汁里继续煮到弹牙。番茄炒出汁后加少许糖中和酸味，风味更柔和。',
  },
  {
    title: '提拉米苏',
    nutrition: { calories: 420, protein: 8, fat: 28, carbs: 38, fiber: 1, sodium: 180 },
    tips: '马斯卡彭奶酪和蛋黄的混合要轻柔翻拌，不要过度搅拌以免出水。手指饼干在咖啡液中浸泡约 2 秒即可，太久会软烂塌陷。做好的提拉米苏冷藏至少 4 小时，隔夜风味更融合。',
  },
]

async function enhanceRecipes() {
  try {
    await sequelize.authenticate()
    console.log('✅ 数据库连接成功')

    let updatedCount = 0
    let notFound = []

    for (const recipe of ENHANCED_RECIPES) {
      const [affectedRows] = await sequelize.query(
        `UPDATE recipes SET nutrition = :nutrition, tips = :tips WHERE title = :title`,
        {
          replacements: {
            title: recipe.title,
            nutrition: JSON.stringify(recipe.nutrition),
            tips: recipe.tips,
          },
          type: Sequelize.QueryTypes.UPDATE,
        }
      )

      if (affectedRows > 0) {
        console.log(`  ✅ 已更新: ${recipe.title}`)
        updatedCount++
      } else {
        notFound.push(recipe.title)
        console.log(`  ❌ 未找到: ${recipe.title}`)
      }
    }

    console.log(`\n📊 结果: 成功更新 ${updatedCount}/${ENHANCED_RECIPES.length}`)
    if (notFound.length > 0) {
      console.log(`   未匹配到: ${notFound.join('、')}`)
    }

    await sequelize.close()
    console.log('✅ 数据库连接已关闭')
  } catch (err) {
    console.error('❌ 脚本执行失败:', err.message)
    process.exit(1)
  }
}

enhanceRecipes()