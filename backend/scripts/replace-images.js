'use strict'

/**
 * scripts/replace-images.js
 * 将所有 placehold.co 占位图替换为 Unsplash 真实美食图片
 *
 * 运行方式：
 *   cd backend && node scripts/replace-images.js
 */

const db = require('../models')

// Unsplash 美食图片映射（每道菜对应一张真实食物照片）
// 使用 images.unsplash.com CDN，w=400&h=300&fit=crop 裁剪为统一尺寸
const IMAGE_MAP = {
  // 中餐
  '宫保鸡丁': 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400&h=300&fit=crop',
  '红烧肉': 'https://images.unsplash.com/photo-1623689046286-01cd25b32d79?w=400&h=300&fit=crop',
  '麻婆豆腐': 'https://images.unsplash.com/photo-1582452919408-aca4cd4cff2e?w=400&h=300&fit=crop',
  '鱼香肉丝': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop',
  '糖醋排骨': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  '水煮牛肉': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
  '清蒸鲈鱼': 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&h=300&fit=crop',
  '红烧牛腩': 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop',
  '小炒肉': 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&h=300&fit=crop',
  '酸辣土豆丝': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
  '回锅肉': 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop',
  '大盘鸡': 'https://images.unsplash.com/photo-1598515213692-5f5a39c4949e?w=400&h=300&fit=crop',
  '干锅花菜': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop',
  '可乐鸡翅': 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=300&fit=crop',
  '葱油拌面': 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400&h=300&fit=crop',
  '麻酱凉面': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop',
  '兰州牛肉面': 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400&h=300&fit=crop',
  '鱼头豆腐汤': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
  '蒜蓉粉丝蒸虾': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
  '地三鲜': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop',

  // 西餐
  '番茄意面': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop',
  '法式焗蜗牛': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
  '凯撒沙拉': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
  '奶油蘑菇汤': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
  '奶油培根意面': 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&h=300&fit=crop',
  '意大利肉酱面': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop',
  '德州烤排骨': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',

  // 日料
  '抹茶千层蛋糕': 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=300&fit=crop',
  '味噌拉面': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop',
  '日式炸猪排': 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop',
  '亲子丼': 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=300&fit=crop',

  // 韩餐
  '韩式拌饭': 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=400&h=300&fit=crop',
  '韩式炒年糕': 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop',
  '泡菜豆腐汤': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',

  // 泰餐
  '冬阴功汤': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
  '泰式芒果糯米饭': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop',
  '泰式酸辣鸡爪': 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=300&fit=crop',
  '芒果糯米饭': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop',

  // 印度菜
  '黄油鸡': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
  '印度烤饼': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
  '印式咖喱角': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',

  // 地中海
  '希腊沙拉': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop',

  // 甜点
  '提拉米苏': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop',
  '法式焦糖布丁': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop',
}

// 通用 fallback：按分类提供默认图片
const CATEGORY_FALLBACK = {
  chinese: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
  western: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
  japanese: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop',
  korean: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=400&h=300&fit=crop',
  thai: 'https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=400&h=300&fit=crop',
  indian: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
  mediterranean: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop',
  dessert: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop',
}

async function replaceImages() {
  try {
    await db.sequelize.sync()

    const recipes = await db.Recipe.findAll()
    let updated = 0
    let skipped = 0
    let fallback = 0

    for (const recipe of recipes) {
      const title = recipe.title
      const newImage = IMAGE_MAP[title]

      if (newImage) {
        // 精确匹配
        if (recipe.coverImage !== newImage) {
          await recipe.update({ coverImage: newImage })
          console.log(`✅ ${title} → Unsplash 精确匹配`)
          updated++
        } else {
          skipped++
        }
      } else if (recipe.coverImage && recipe.coverImage.includes('placehold.co')) {
        // 无精确匹配但使用了 placeholder → 用分类 fallback
        const fallbackImage = CATEGORY_FALLBACK[recipe.category] || CATEGORY_FALLBACK.chinese
        await recipe.update({ coverImage: fallbackImage })
        console.log(`🔄 ${title} → 分类 fallback (${recipe.category})`)
        fallback++
      } else {
        // 已经是真实图片
        skipped++
      }
    }

    console.log(`\n📊 替换结果：`)
    console.log(`   精确匹配更新: ${updated}`)
    console.log(`   分类 fallback: ${fallback}`)
    console.log(`   已跳过（无变化）: ${skipped}`)
    console.log(`   总计: ${recipes.length}`)

    process.exit(0)
  } catch (err) {
    console.error('❌ 图片替换失败:', err.message)
    process.exit(1)
  }
}

replaceImages()
