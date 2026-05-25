/**
 * scripts/fill_videos_2.js
 * 第二轮：为更多热门食谱填充视频教程链接（20→81 目标：40→81）
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

// ── 视频数据映射 ───────────────────────────────────────────
const VIDEO_MAP = [
  // ─── Chinese ─────────────────────────────────────────────
  {
    title: '酸菜鱼',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1mK411F7oM',
        platform: 'bilibili',
        title: '厨师长教你：川菜"酸菜水煮鱼"的家常做法，鱼片滑嫩，麻辣鲜香',
        duration: 301,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '红烧肉',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1HA411v7iv',
        platform: 'bilibili',
        title: '厨师长教你："电饭锅红烧肉"的家常做法，满满的小技巧，收藏了',
        duration: 565,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '宫保鸡丁',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1Xt411Z7z8',
        platform: 'bilibili',
        title: '厨师长教你："宫保鸡丁"的川味正宗做法，一看就有食欲，收藏了',
        duration: 222,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '麻婆豆腐',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1Rs411V7i9',
        platform: 'bilibili',
        title: '厨师长教你："麻婆豆腐"的正宗做法，吃的停不下来',
        duration: 286,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '糖醋排骨',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1dq4y1Q718',
        platform: 'bilibili',
        title: '厨师长教你："糖醋排骨"的最新做法，酸甜开胃，好吃不腻',
        duration: 196,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '清蒸鲈鱼',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1QU4y1j7T4',
        platform: 'bilibili',
        title: '厨师长教你："清蒸鲈鱼"，鲜嫩美味，内附蒸鱼酱油专业调制方法',
        duration: 223,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '可乐鸡翅',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1vE411h7VP',
        platform: 'bilibili',
        title: '厨师长教你："可乐鸡翅"的家常做法，味道鲜嫩可口，先收藏起来',
        duration: 240,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '西红柿炒鸡蛋',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1Py4y1S7EF',
        platform: 'bilibili',
        title: '厨师长分享："番茄炒蛋"的6种做法，多种版本适合各类人群',
        duration: 503,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '葱油拌面',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1Pm4y1X796',
        platform: 'bilibili',
        title: '厨师长分享："葱油拌面"，葱香酱香十足，吃起来根本停不下来',
        duration: 542,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '剁椒鱼头',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1R34y1p7qG',
        platform: 'bilibili',
        title: '厨师长一道剁椒鱼头俘获四伯的胃，笑称你会做我会吃，天生一对',
        duration: 424,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '东坡肉',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1CebaznE19',
        platform: 'bilibili',
        title: '做一道稀溜耙的家常版"东坡肉"，肥而不腻，伯爷直接密干',
        duration: 1056,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '酸辣土豆丝',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1TFo7BiEYe',
        platform: 'bilibili',
        title: '酸辣土豆丝像我这样做，酸辣爽口，超级入味',
        duration: 295,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '地三鲜',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1iW411N7CY',
        platform: 'bilibili',
        title: '厨师长教你一道北方菜："地三鲜"的家常做法，味道很赞',
        duration: 191,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '虾饺',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1xhLw69EGM',
        platform: 'bilibili',
        title: '皮薄爆汁的广东早茶水晶虾饺',
        duration: 216,
        sortOrder: 0,
      },
    ],
  },
  // ─── Western ────────────────────────────────────────────
  {
    title: '普罗旺斯炖菜',
    videos: [
      {
        url: 'https://www.youtube.com/embed/nL1nM3Sr3bg',
        platform: 'youtube',
        title: '《料理鼠王》里普罗旺斯炖菜，法式杂菜煲 Ratatouille Recipe',
        duration: 520,
        sortOrder: 0,
      },
    ],
  },
  {
    title: '意大利肉酱面',
    videos: [
      {
        url: 'https://www.youtube.com/embed/JBN-k3-noVo',
        platform: 'youtube',
        title: '番茄肉酱意面 Spaghetti with Meat Sauce',
        duration: 480,
        sortOrder: 0,
      },
    ],
  },
  // ─── Japanese ───────────────────────────────────────────
  {
    title: '豚骨拉面',
    videos: [
      {
        url: 'https://www.youtube.com/embed/wv5dylzXuBs',
        platform: 'youtube',
        title: '《豚骨拉面全套配方》| Tonkotsu Ramen [Eng Sub]',
        duration: 600,
        sortOrder: 0,
      },
    ],
  },
  // ─── Thai ───────────────────────────────────────────────
  {
    title: '芒果糯米饭',
    videos: [
      {
        url: 'https://www.youtube.com/embed/WB___WEpfkw',
        platform: 'youtube',
        title: '椰汁芒果糯米饭 Mango Sticky Rice Recipe Thailand',
        duration: 450,
        sortOrder: 0,
      },
    ],
  },
  // ─── Extra Chinese ──────────────────────────────────────
  {
    title: '白灼基围虾',
    videos: [
      {
        url: 'https://www.bilibili.com/video/BV1urFSzBEWv',
        platform: 'bilibili',
        title: '厨师长分享现场版"一虾两吃"，白灼虾汁水充沛，香辣虾酥脆够味',
        duration: 899,
        sortOrder: 0,
      },
    ],
  },
]

// ── 主逻辑 ─────────────────────────────────────────────────
async function main() {
  const dryRun = process.argv.includes('--dry-run')

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

    const [recipes] = await sequelize.query(
      'SELECT id, title, category FROM recipes ORDER BY (COALESCE(viewCount,0)) DESC'
    )
    console.log(`📊 共 ${recipes.length} 道食谱`)

    const recipeMap = {}
    for (const r of recipes) {
      const key = r.title.trim()
      if (!recipeMap[key]) recipeMap[key] = []
      recipeMap[key].push(r)
    }

    let inserted = 0
    let skipped = 0
    let alreadyExists = 0

    for (const entry of VIDEO_MAP) {
      const candidates = recipeMap[entry.title]
      if (!candidates || candidates.length === 0) {
        console.log(`⚠️  未找到食谱: "${entry.title}"`)
        skipped++
        continue
      }

      const recipe = candidates[0]

      // 检查是否已有视频记录
      const [existing] = await sequelize.query(
        'SELECT COUNT(*) AS cnt FROM video_embeds WHERE recipeId = ?',
        { replacements: [recipe.id] }
      )
      if (existing[0].cnt > 0) {
        console.log(`⏭️  ${recipe.title} 已有 ${existing[0].cnt} 个视频，跳过`)
        alreadyExists++
        continue
      }

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
            console.log(`✅ ${recipe.title} → ${video.platform}: ${(video.title || video.url).slice(0, 30)}`)
            inserted++
          } catch (err) {
            console.error(`❌ ${recipe.title} 插入失败:`, err.message)
          }
        }
      }
    }

    if (dryRun) {
      console.log(`\n📋 DRY-RUN 完成，共 ${VIDEO_MAP.reduce((s, e) => s + e.videos.length, 0)} 条待插入记录`)
    } else {
      console.log(`\n✅ 完成！插入 ${inserted} 条，跳过 ${skipped} 道未匹配，${alreadyExists} 道已有视频`)
    }
  } catch (err) {
    console.error('❌ 脚本执行失败:', err.message)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

main()
