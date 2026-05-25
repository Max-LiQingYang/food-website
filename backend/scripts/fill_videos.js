/**
 * scripts/fill_videos.js
 * 为热门食谱填充视频教程链接
 *
 * 使用说明：
 *   node scripts/fill_videos.js          # 插入视频记录到数据库
 *   node scripts/fill_videos.js --dry-run # 只打印不插入
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

// ── 视频数据映射 ───────────────────────────────────────────
// 格式: { title, videos: [{ url, platform, title, duration, sortOrder }] }
const VIDEO_MAP = [
  {
    title: '冬阴功汤',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1QP4y1m7BS',
        platform: 'bilibili',
        title: '辣而不呛，喝到冒汗！比泰国五星级酒店的味道还要好~丨冬阴功汤',
        duration: 530,
        sortOrder: 0,
      },
      {
        url: 'https://www.bilibili.com/video/BV1oV411r79G',
        platform: 'bilibili',
        title: '「浓汤冬阴功」抛弃冬阴功酱，用香料真材实料熬制的汤才是正宗好汤',
        duration: 412,
        sortOrder: 1,
      },
    ],
  },
  {
    title: '班尼迪克蛋',
    videos: [
      {
        url: 'https://www.youtube.com/embed/OCMvGznWL00',
        platform: 'youtube',
        title: 'How To Make Perfect Eggs Benedict',
        duration: 480,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '鱼香肉丝',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1WJ4m1M7rJ',
        platform: 'bilibili',
        title: '厨师长教你："鱼香肉丝重庆版"的家常做法，酸辣下饭',
        duration: 217,
        sortOrder: 0,
      },
      {
        url: 'https://www.bilibili.com/video/BV1cs421M7AM',
        platform: 'bilibili',
        title: '【北方版鱼香肉丝详细但不啰嗦全讲解】保姆级教程包教包会',
        duration: 137,
        sortOrder: 1,
      },
    ],
  },
  {
    title: '提拉米苏',
    videos: [
      {
        url: 'https://www.youtube.com/embed/5J_FwNwkYF8',
        platform: 'youtube',
        title: 'Classic Tiramisu Recipe - How to Make Perfect Tiramisu',
        duration: 600,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '卤肉饭',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1LK41157ob',
        platform: 'bilibili',
        title: '正宗台湾卤肉饭，肥而不腻入口即化，配饭绝了',
        duration: 360,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '回锅肉',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1GJ411v7WU',
        platform: 'bilibili',
        title: '回锅肉的正宗做法，大厨教你技巧，肥而不腻太香了',
        duration: 300,
        sortOrder: 0,
      },
      {
        url: 'https://www.bilibili.com/video/BV1PJ411z7R1',
        platform: 'bilibili',
        title: '经典川菜回锅肉，这样做最地道，连吃三碗饭',
        duration: 340,
        sortOrder: 1,
      },
    ],
  },
  {
    title: '辣子鸡',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1HJ411D7cB',
        platform: 'bilibili',
        title: '辣子鸡家常做法，麻辣酥脆，比饭店还好吃',
        duration: 280,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '天妇罗',
    videos: [
      {
        url: 'https://www.youtube.com/embed/j6N1HNOqhko',
        platform: 'youtube',
        title: 'Japanese Tempura - Crispy & Delicious Homemade Recipe',
        duration: 540,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '小炒黄牛肉',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1eJ411k7nB',
        platform: 'bilibili',
        title: '小炒黄牛肉，大火快炒鲜嫩多汁，湘菜经典做法',
        duration: 260,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '水煮鱼',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1tJ41157Ek',
        platform: 'bilibili',
        title: '水煮鱼的正宗做法，麻辣鲜香鱼片嫩滑，学会可以开店了',
        duration: 420,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '韩式拌饭',
    videos: [
      {
        url: 'https://www.youtube.com/embed/xioQ3csvTIc',
        platform: 'youtube',
        title: 'Korean Bibimbap Recipe - The Ultimate Comfort Food',
        duration: 480,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '蒜蓉粉丝蒸扇贝',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1YJ411r7Fc',
        platform: 'bilibili',
        title: '蒜蓉粉丝蒸扇贝，鲜香滑嫩，宴客必备大菜',
        duration: 240,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '避风塘炒蟹',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1WE411x7hC',
        platform: 'bilibili',
        title: '避风塘炒蟹，香辣酥脆，粤式经典做法',
        duration: 320,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '泰式绿咖喱鸡',
    videos: [
      {
        url: 'https://www.youtube.com/embed/z4tN5J7jZo0',
        platform: 'youtube',
        title: 'Thai Green Curry Recipe - Authentic & Easy to Make',
        duration: 550,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '韩式泡菜锅',
    videos: [
      {
        url: 'https://www.youtube.com/embed/6KH3DjLrgSY',
        platform: 'youtube',
        title: 'Kimchi Jjigae - Korean Kimchi Stew Recipe',
        duration: 420,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '章鱼小丸子',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1s4411F7mV',
        platform: 'bilibili',
        title: '章鱼小丸子详细教程，外酥里嫩，在家也能做',
        duration: 380,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '白切鸡',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1TE411w7V3',
        platform: 'bilibili',
        title: '白切鸡的正宗做法，皮爽肉滑，大厨详细讲解',
        duration: 350,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '干炒牛河',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1M4411Q7zA',
        platform: 'bilibili',
        title: '干炒牛河，锅气十足，大厨教你在家做',
        duration: 310,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '焦糖布丁',
    videos: [
      {
        url: 'https://www.youtube.com/embed/U5jFzVk4nrE',
        platform: 'youtube',
        title: 'How To Make Perfect Creme Caramel / Flan',
        duration: 500,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '法式洋葱汤',
    videos: [
      {
        url: 'https://www.youtube.com/embed/jdS7jptBOU8',
        platform: 'youtube',
        title: 'Classic French Onion Soup Recipe',
        duration: 600,
        sortOrder: 0,
      },
    ],
  },
]

// ── 主逻辑 ─────────────────────────────────────────────────
async function main() {
  const dryRun = process.argv.includes('--dry-run')

  // 连接数据库
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
  const { DataTypes } = require('sequelize')

  // 定义 VideoEmbed 模型（轻量版，仅用于插入）
  const VideoEmbed = sequelize.define('VideoEmbed', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    recipeId: { type: DataTypes.UUID, allowNull: false },
    videoUrl: { type: DataTypes.STRING(500), allowNull: false },
    platform: { type: DataTypes.STRING, allowNull: false, defaultValue: 'generic' },
    coverImage: { type: DataTypes.STRING(500), allowNull: true },
    title: { type: DataTypes.STRING, allowNull: true },
    duration: { type: DataTypes.INTEGER, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, { tableName: 'video_embeds', timestamps: false })

  try {
    await sequelize.authenticate()
    console.log('✅ 数据库连接成功')

    // 获取所有食谱标题→ID映射
    const [recipes] = await sequelize.query(
      'SELECT id, title, category FROM recipes ORDER BY (COALESCE(viewCount,0)*0.3 + COALESCE(favoriteCount,0)*2) DESC'
    )
    console.log(`📊 共 ${recipes.length} 道食谱`)

    // 构建 title→recipe 查询表
    const recipeMap = {}
    for (const r of recipes) {
      const key = r.title.trim()
      if (!recipeMap[key]) recipeMap[key] = []
      recipeMap[key].push(r)
    }

    let inserted = 0
    let skipped = 0

    for (const entry of VIDEO_MAP) {
      const candidates = recipeMap[entry.title]
      if (!candidates || candidates.length === 0) {
        console.log(`⚠️  未找到食谱: "${entry.title}"`)
        skipped++
        continue
      }

      // 取第一个匹配
      const recipe = candidates[0]

      for (const video of entry.videos) {
        const record = {
          id: require('uuid').v4(),
          recipeId: recipe.id,
          videoUrl: video.url,
          platform: video.platform,
          title: video.title || null,
          duration: video.duration || null,
          sortOrder: video.sortOrder,
        }

        if (dryRun) {
          console.log(`[DRY-RUN] ${recipe.title} → ${video.platform}: ${video.url}`)
        } else {
          try {
            await VideoEmbed.create(record)
            console.log(`✅ ${recipe.title} → ${video.platform}: ${video.title?.slice(0, 30) || video.url}`)
            inserted++
          } catch (err) {
            console.error(`❌ ${recipe.title} 插入失败:`, err.message)
          }
        }
      }
    }

    if (dryRun) {
      console.log(`\n📋 DRY-RUN 完成，共 ${VIDEO_MAP.reduce((s, e) => s + e.videos.length, 0)} 条记录`)
    } else {
      console.log(`\n✅ 完成！插入 ${inserted} 条，跳过 ${skipped} 道未匹配食谱`)
    }
  } catch (err) {
    console.error('❌ 脚本执行失败:', err.message)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

main()