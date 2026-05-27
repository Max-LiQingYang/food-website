// fill_videos_4.js — 迭代 #72: 视频覆盖率 62.2% → ~82.9%
// 15 道热门食谱视频教程补充
// 生产 DB: MariaDB food_website，通过 172.17.0.1 连接
// 注意：video_embeds 表无 updatedAt 列（仅提供 createdAt）

const mysql = require("mysql2/promise");
const { v4: uuidv4 } = require("uuid");

const videos = [
  {
    title: "兰州牛肉面", id: "ae778ee5-1b8d-4cfe-89ab-14650f063dd4",
    url: "https://www.bilibili.com/video/BV1Ay4y1i7S1", platform: "bilibili",
    videoTitle: "兰州人家庭版正宗兰州牛肉面的做法(不是兰州拉面啦)详尽菜谱步骤在视频最后", duration: 480, sortOrder: 0
  },
  {
    title: "大盘鸡", id: "cb61f2dc-aabb-4a7a-bbd0-af3478bb7165",
    url: "https://www.bilibili.com/video/BV1XNyTYZEWh", platform: "bilibili",
    videoTitle: "比饭店做的还好吃的大盘鸡只要一分钟就能学会，味道超赞", duration: 360, sortOrder: 0
  },
  {
    title: "小炒肉", id: "f9c902fe-124c-4f84-aeae-47e74b925729",
    url: "https://www.bilibili.com/video/BV1Hy4y1b7Lw", platform: "bilibili",
    videoTitle: "在家自己做小炒肉", duration: 300, sortOrder: 0
  },
  {
    title: "水煮牛肉", id: "73e5e22f-f297-4d05-b082-483e3ee40793",
    url: "https://www.bilibili.com/video/BV1Qu411G7ae", platform: "bilibili",
    videoTitle: "原来这才是水煮牛肉的正宗做法!", duration: 420, sortOrder: 0
  },
  {
    title: "扬州炒饭", id: "e442f02d-bbcd-401d-96b1-104ac57bebf4",
    url: "https://www.bilibili.com/video/BV1j541187ad", platform: "bilibili",
    videoTitle: "要做正宗的扬州炒饭，蛋丝是灵魂。否则一不小心就变成蛋炒饭了", duration: 360, sortOrder: 0
  },
  {
    title: "鱼头豆腐汤", id: "ad300756-3332-4fdd-97c3-4a5d9f8c653f",
    url: "https://www.bilibili.com/video/BV1AX4y1N77u", platform: "bilibili",
    videoTitle: "老太教你做鱼头豆腐汤如何味道鲜美汤白如牛奶", duration: 300, sortOrder: 0
  },
  {
    title: "日式牛丼", id: "ed5cc34f-c81f-4eb2-b01a-57db55ed348a",
    url: "https://www.bilibili.com/video/BV1cJ411D7do", platform: "bilibili",
    videoTitle: "【Mingsze】超简单日式牛丼 六个步骤 10分钟", duration: 360, sortOrder: 0
  },
  {
    title: "韩式烤五花肉", id: "ecb7926c-4d91-40ce-98ca-ac8ddaa8c609",
    url: "https://www.bilibili.com/video/BV1mT4y1u7nS", platform: "bilibili",
    videoTitle: "来自韩剧请回答1988里的烤肉，韩式猪五花，保证看着视频流口水", duration: 420, sortOrder: 0
  },
  {
    title: "干煸四季豆", id: "b550ceea-3dba-47d8-9caa-bf8b9f0eb441",
    url: "https://www.bilibili.com/video/BV1os411e7Hf", platform: "bilibili",
    videoTitle: "【美食台】干煸四季豆，美味的关键在于炸!", duration: 240, sortOrder: 0
  },
  {
    title: "罗宋汤", id: "a087d040-46ef-4d69-891c-79e6a06e48dd",
    url: "https://www.bilibili.com/video/BV1oT41197mk", platform: "bilibili",
    videoTitle: "俄罗斯姐姐教你怎么做罗宋汤，第一次做就能成功!", duration: 360, sortOrder: 0
  },
  {
    title: "凯撒沙拉", id: "7f6d1f14-6d57-477c-b46e-0e5858497892",
    url: "https://www.bilibili.com/video/BV1pp411R7Bo", platform: "bilibili",
    videoTitle: "【迷迭香】一招教你学做经典凯撒沙拉!", duration: 240, sortOrder: 0
  },
  {
    title: "日式咖喱饭", id: "aa53892c-8ff3-4c04-a9ab-441fd0725fea",
    url: "https://www.bilibili.com/video/BV18d4y1Z7Uo", platform: "bilibili",
    videoTitle: "【日本家常菜】学做正宗日式咖喱饭 好吃的秘诀 和风无水番茄奇玛咖哩肉饭", duration: 480, sortOrder: 0
  },
  {
    title: "醋溜白菜", id: "dfe14298-d087-4a33-aca4-089244fe1f1c",
    url: "https://www.bilibili.com/video/BV1Wh4y1R7cn", platform: "bilibili",
    videoTitle: "现在网上这个醋溜白菜真的太火了，居然还有人不会做，今天就教您正确的做法", duration: 300, sortOrder: 0
  },
  {
    title: "奶油培根意面", id: "50f568b3-91e5-4973-9bb3-aee0f2d04ed5",
    url: "https://www.bilibili.com/video/BV1So4y137Ns", platform: "bilibili",
    videoTitle: "奶油培根意面浓郁奶香一人食小锅", duration: 300, sortOrder: 0
  },
  {
    title: "东北乱炖", id: "fa9c7954-c4ab-490e-9317-c432a9a124b5",
    url: "https://www.bilibili.com/video/BV1ct411f7ZW", platform: "bilibili",
    videoTitle: "东北乱炖最正宗家常做法:食材选料最重要，先后顺序不能乱!", duration: 420, sortOrder: 0
  }
];

async function main() {
  const conn = await mysql.createConnection({
    host: "172.17.0.1", user: "food_user", password: "food_password", database: "food_website"
  });

  let inserted = 0;
  let errors = 0;

  for (const v of videos) {
    try {
      await conn.query(
        `INSERT INTO video_embeds (id, recipeId, videoUrl, platform, title, duration, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [uuidv4(), v.id, v.url, v.platform, v.videoTitle, v.duration, v.sortOrder]
      );
      console.log(`  ✅ ${v.title} (${v.id.substr(0,8)})`);
      inserted++;
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") {
        console.log(`  ⏭ ${v.title} — 已存在`);
      } else {
        console.error(`  ❌ ${v.title}: ${e.message}`);
        errors++;
      }
    }
  }

  await conn.end();
  console.log(`\n插入 ${inserted} 条，失败 ${errors} 条`);
}

main().catch(e => { console.error(e.message); process.exit(1); });