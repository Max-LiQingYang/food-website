'use strict'

/**
 * seed-enhance-all.js
 * 为所有55道食谱补充 nutrition + tips 数据，并将 placehold.co 图片替换为 Unsplash 真实美食图片
 *
 * 运行方式：cd backend && node seeds/seed-enhance-all.js
 * 服务器：docker cp + docker exec node require
 */

const { Sequelize } = require('sequelize')
const path = require('path')

// ── 数据库配置 ──────────────────────────────────────────────
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
  pool: { max: 3, min: 0, acquire: 30000, idle: 10000 },
})

// ═══════════════════════════════════════════════════════════════
// ALL 55 RECIPES — Nutrition, Tips, and Real Images (Unsplash)
// ═══════════════════════════════════════════════════════════════

const ENHANCED_RECIPES = [
  // ── 中餐 (Chinese) ──
  {
    title: '宫保鸡丁',
    image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400&h=300&fit=crop',
    nutrition: { calories: 385, protein: 28, fat: 22, carbs: 16, fiber: 2, sodium: 820 },
    tips: '炒花生米时一定要小火慢炒，否则容易外焦里生。腌制鸡丁时加少许蛋清能让肉质更嫩滑。鱼香汁提前调好，下锅后大火快炒才够锅气。',
  },
  {
    title: '红烧肉',
    image: 'https://images.unsplash.com/photo-1623689046286-01cd25b32d79?w=400&h=300&fit=crop',
    nutrition: { calories: 520, protein: 18, fat: 42, carbs: 12, fiber: 0, sodium: 650 },
    tips: '五花肉选肥瘦相间的三层肉最合适。炒糖色时用小火，冰糖融化成琥珀色即可下肉，过火会发苦。炖煮时加一勺黄酒能去腥增香。',
  },
  {
    title: '西红柿炒鸡蛋',
    image: 'https://images.unsplash.com/photo-1623689046286-01cd25b32d79?w=400&h=300&fit=crop',
    nutrition: { calories: 180, protein: 12, fat: 12, carbs: 8, fiber: 2, sodium: 480 },
    tips: '鸡蛋打散后加少许水或牛奶，炒出来更嫩。番茄先切小块炒出红油再下蛋，味道更浓郁。最后撒一点葱花和白糖提鲜，酸甜平衡更好吃。',
  },
  {
    title: '麻婆豆腐',
    image: 'https://images.unsplash.com/photo-1582452919408-aca4cd4cff2e?w=400&h=300&fit=crop',
    nutrition: { calories: 220, protein: 14, fat: 15, carbs: 10, fiber: 3, sodium: 980 },
    tips: '豆腐先用盐水焯一下，既去豆腥又不易碎。豆瓣酱一定要炒出红油才够香。勾芡分两次，第一次薄芡让汤汁变稠，第二次厚芡挂在豆腐上。',
  },
  {
    title: '糖醋排骨',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
    nutrition: { calories: 450, protein: 22, fat: 28, carbs: 30, fiber: 1, sodium: 720 },
    tips: '排骨焯水后用厨房纸吸干水分，下锅炸时不易溅油。糖醋汁的比例是 3 份糖、2 份醋、1 份生抽，这是黄金比例。复炸一次外皮更酥脆。',
  },
  {
    title: '鱼香肉丝',
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop',
    nutrition: { calories: 310, protein: 20, fat: 18, carbs: 18, fiber: 3, sodium: 860 },
    tips: '肉丝逆着纹路切，炒出来不柴。泡椒是鱼香味的关键，没有泡椒可以用剁椒加少许醋代替。鱼香汁要提前调好，下锅后全程大火快炒。',
  },
  {
    title: '水煮牛肉',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    nutrition: { calories: 380, protein: 32, fat: 24, carbs: 8, fiber: 2, sodium: 1100 },
    tips: '牛肉逆纹切薄片，用蛋清和淀粉上浆，煮出来才嫩。最后淋热油那一步不能省，油要烧到冒烟才能激发出辣椒和花椒的香味。',
  },
  {
    title: '清蒸鲈鱼',
    image: 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&h=300&fit=crop',
    nutrition: { calories: 180, protein: 26, fat: 7, carbs: 2, fiber: 0, sodium: 380 },
    tips: '鱼腹内的黑膜一定要刮干净，否则会苦。蒸鱼水开后计时，一斤左右的鱼蒸 8-10 分钟刚好。蒸出来的汤汁很腥，一定要倒掉再淋蒸鱼豉油。',
  },
  {
    title: '番茄意面',
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop',
    nutrition: { calories: 340, protein: 10, fat: 12, carbs: 48, fiber: 4, sodium: 520 },
    tips: '煮意面的水要像海水一样咸（1000ml 水加 10g 盐），这样面条才有底味。意面煮到比包装说明少 1 分钟，在酱汁里继续煮到弹牙。',
  },
  {
    title: '提拉米苏',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop',
    nutrition: { calories: 420, protein: 8, fat: 28, carbs: 38, fiber: 1, sodium: 180 },
    tips: '马斯卡彭奶酪和蛋黄的混合要轻柔翻拌，不要过度搅拌以免出水。手指饼干在咖啡液中浸泡约 2 秒即可，太久会软烂塌陷。冷藏至少 4 小时。',
  },
  // ── 中餐 2 ──
  {
    title: '地三鲜',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    nutrition: { calories: 220, protein: 6, fat: 14, carbs: 22, fiber: 5, sodium: 580 },
    tips: '茄子先撒盐腌制10分钟挤掉水分，炸的时候不易吸油。土豆炸到表面金黄微焦更有口感。最后大火快炒才能保持锅气。',
  },
  {
    title: '回锅肉',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
    nutrition: { calories: 480, protein: 22, fat: 38, carbs: 8, fiber: 2, sodium: 820 },
    tips: '五花肉冷水下锅煮至八成熟，切薄片更易出油。蒜苗先炒白色部分再放绿叶，口感更均匀。豆瓣酱要炒出红油才够香。',
  },
  {
    title: '大盘鸡',
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&h=300&fit=crop',
    nutrition: { calories: 420, protein: 32, fat: 24, carbs: 20, fiber: 3, sodium: 760 },
    tips: '鸡肉先煸炒至表面金黄再炖煮，肉更香。土豆要炖到软糯入味但不要散。最后收汁要留一些浓汁拌面吃。',
  },
  {
    title: '酸辣土豆丝',
    image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop',
    nutrition: { calories: 160, protein: 4, fat: 8, carbs: 20, fiber: 3, sodium: 450 },
    tips: '土豆丝切好后用冷水浸泡去掉多余淀粉，炒出来更脆。白醋分两次放，炝锅时放一半增香，出锅前放一半提酸。',
  },
  {
    title: '干煸四季豆',
    image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop',
    nutrition: { calories: 190, protein: 6, fat: 14, carbs: 12, fiber: 4, sodium: 560 },
    tips: '四季豆一定要煸熟透，否则容易中毒。用中小火慢慢煸到表皮起皱才够香。加少许芽菜或橄榄菜增味更地道。',
  },
  {
    title: '干锅花菜',
    image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop',
    nutrition: { calories: 170, protein: 6, fat: 12, carbs: 10, fiber: 4, sodium: 520 },
    tips: '花菜焯水后要沥干水分，否则下锅变炖菜。五花肉煸出油再炒花菜更香。最后用小火慢慢干煸出焦香。',
  },
  {
    title: '小炒肉',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
    nutrition: { calories: 350, protein: 24, fat: 26, carbs: 6, fiber: 1, sodium: 680 },
    tips: '五花肉切薄片，先煸出油至卷曲才香。青红椒要最后下锅大火快炒保持脆嫩。加少许豆豉增香是点睛之笔。',
  },
  {
    title: '醋溜白菜',
    image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop',
    nutrition: { calories: 80, protein: 3, fat: 5, carbs: 8, fiber: 3, sodium: 380 },
    tips: '白菜帮和菜叶分开炒，帮先炒至半透明再放菜叶。醋要沿锅边淋入才能激发出香味。大火快炒保持脆嫩口感。',
  },
  {
    title: '扬州炒饭',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    nutrition: { calories: 380, protein: 14, fat: 16, carbs: 46, fiber: 1, sodium: 620 },
    tips: '用隔夜冷饭炒出来的效果最好，粒粒分明。蛋液先与米饭拌匀再炒，每粒米都裹上蛋香。叉烧丁或火腿丁增加咸香。',
  },
  {
    title: '葱油拌面',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
    nutrition: { calories: 360, protein: 10, fat: 18, carbs: 42, fiber: 1, sodium: 480 },
    tips: '炸葱油要用小火慢慢把葱的香味炸出来，葱变焦黄即可捞出。酱油和糖的比例 2:1 最合适。面条捞出后趁热拌入葱油。',
  },
  {
    title: '啤酒鸭',
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&h=300&fit=crop',
    nutrition: { calories: 340, protein: 28, fat: 22, carbs: 6, fiber: 1, sodium: 720 },
    tips: '鸭肉要先煸炒出油再炖，这样不腻。啤酒要一次性加足，中途不加水。加入八角桂皮增香，收汁到浓稠挂勺。',
  },
  {
    title: '东北乱炖',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    nutrition: { calories: 260, protein: 16, fat: 14, carbs: 22, fiber: 5, sodium: 680 },
    tips: '排骨提前焯水去血沫。蔬菜按耐煮程度依次下锅：土豆和玉米先煮10分钟，再加入豆角和南瓜。炖到汤汁浓稠即可。',
  },
  {
    title: '东坡肉',
    image: 'https://images.unsplash.com/photo-1623689046286-01cd25b32d79?w=400&h=300&fit=crop',
    nutrition: { calories: 540, protein: 20, fat: 46, carbs: 10, fiber: 0, sodium: 700 },
    tips: '五花肉切大块后先用棉线捆扎，炖煮时不易散形。黄酒的量要盖过肉块，小火慢炖至少2小时。最后蒸一下可以去油更酥烂。',
  },
  {
    title: '红烧牛腩',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    nutrition: { calories: 380, protein: 30, fat: 24, carbs: 10, fiber: 1, sodium: 650 },
    tips: '牛腩焯水后用温水冲洗干净，冷水冲洗会让肉质变硬。炖煮时加一小块陈皮或山楂，牛肉更容易软烂。至少炖1.5小时。',
  },
  {
    title: '兰州牛肉面',
    image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop',
    nutrition: { calories: 340, protein: 22, fat: 12, carbs: 40, fiber: 1, sodium: 880 },
    tips: '牛骨汤底要熬煮至少3小时才够浓郁。白萝卜片先焯水去苦味再放入汤中。拉面煮到刚好断生，过凉水更筋道。',
  },
  {
    title: '白灼基围虾',
    image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop',
    nutrition: { calories: 120, protein: 24, fat: 2, carbs: 2, fiber: 0, sodium: 320 },
    tips: '虾不要煮太久，变红卷曲后再煮30秒即可捞出。水中加姜片和料酒去腥。蘸料用生抽、醋、姜末、少许糖调制。',
  },
  {
    title: '韩式泡菜炒五花肉',
    image: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=400&h=300&fit=crop',
    nutrition: { calories: 420, protein: 22, fat: 34, carbs: 8, fiber: 2, sodium: 920 },
    tips: '五花肉切薄片先煸至微焦。泡菜要用发酵久的酸泡菜才够味。加一勺泡菜汁一起炒，味道更浓郁。',
  },
  {
    title: '韩式烤五花肉',
    image: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=400&h=300&fit=crop',
    nutrition: { calories: 480, protein: 20, fat: 42, carbs: 4, fiber: 0, sodium: 680 },
    tips: '五花肉切厚片，用厨房纸吸干水分再烤。烤到两面金黄微焦即可。蘸料用韩式辣酱、蒜片、生菜包裹最地道。',
  },
  {
    title: '韩式炒年糕',
    image: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=400&h=300&fit=crop',
    nutrition: { calories: 320, protein: 8, fat: 10, carbs: 52, fiber: 2, sodium: 780 },
    tips: '年糕先用温水泡软再炒，口感更Q弹。辣椒酱和辣椒粉搭配使用颜色更好看。最后加少许糖中和辣味。',
  },
  {
    title: '韩式拌饭',
    image: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=400&h=300&fit=crop',
    nutrition: { calories: 450, protein: 18, fat: 16, carbs: 58, fiber: 4, sodium: 720 },
    tips: '几种蔬菜分别焯水或炒制，码放整齐。煎蛋要单面煎，蛋黄保持流心。拌饭酱用韩式辣酱、雪碧、芝麻油调和。',
  },
  {
    title: '日式咖喱饭',
    image: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=400&h=300&fit=crop',
    nutrition: { calories: 480, protein: 16, fat: 18, carbs: 64, fiber: 3, sodium: 860 },
    tips: '洋葱要炒到焦糖化，这是咖喱香浓的关键。咖喱块最后放入，融化后小火煮5分钟让味道融合。第二天吃更入味。',
  },
  {
    title: '日式照烧鸡腿',
    image: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=400&h=300&fit=crop',
    nutrition: { calories: 350, protein: 28, fat: 18, carbs: 16, fiber: 0, sodium: 720 },
    tips: '鸡腿去骨后先用叉子在皮上扎孔，腌料更入味。皮朝下煎到金黄酥脆再翻面。照烧汁收浓到能挂在鸡腿上即可。',
  },
  {
    title: '日式牛丼',
    image: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=400&h=300&fit=crop',
    nutrition: { calories: 420, protein: 24, fat: 18, carbs: 42, fiber: 1, sodium: 780 },
    tips: '肥牛片不用解冻直接下锅，煮到变色即可。洋葱切薄丝炒至透明变软。汤汁要稍多些，浇在米饭上非常下饭。',
  },
  {
    title: '味噌拉面',
    image: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=400&h=300&fit=crop',
    nutrition: { calories: 420, protein: 22, fat: 16, carbs: 50, fiber: 2, sodium: 920 },
    tips: '味噌不要煮沸，关火后搅拌溶解保留风味。汤底用鸡骨和猪骨熬煮更浓郁。配菜用溏心蛋、叉烧、玉米粒。',
  },
  {
    title: '奶油蘑菇汤',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
    nutrition: { calories: 220, protein: 6, fat: 18, carbs: 10, fiber: 2, sodium: 520 },
    tips: '蘑菇先干煸出水再加油炒，香味更浓郁。用搅拌机打碎后过筛口感更细腻。淡奶油最后加入，不要煮沸。',
  },
  {
    title: '奶油培根意面',
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop',
    nutrition: { calories: 480, protein: 18, fat: 24, carbs: 48, fiber: 2, sodium: 720 },
    tips: '培根先煎到焦脆出油。煮面水留半杯，加芝士时用来调节浓稠度。关火后再加蛋黄和芝士拌匀，余温足够融化。',
  },
  {
    title: '意大利肉酱面',
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop',
    nutrition: { calories: 460, protein: 22, fat: 18, carbs: 52, fiber: 3, sodium: 820 },
    tips: '肉酱至少要炖30分钟才够味，用红酒炖煮更香。番茄膏炒到颜色变深再加水，风味更浓郁。意面煮到弹牙口感。',
  },
  {
    title: '法式洋葱汤',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
    nutrition: { calories: 180, protein: 8, fat: 10, carbs: 16, fiber: 2, sodium: 680 },
    tips: '洋葱要用小火慢慢炒到焦糖色，至少30分钟。白葡萄酒进去后要把锅底焦香刮起来。法棍片烤脆后再放汤上烤芝士。',
  },
  {
    title: '法式焦糖布丁',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop',
    nutrition: { calories: 280, protein: 6, fat: 18, carbs: 26, fiber: 0, sodium: 120 },
    tips: '蛋黄糊不要过度搅拌以免产生气泡。水浴法烤制要用温水，水量到模具一半高。冷藏4小时以上口感更细腻。',
  },
  {
    title: '班尼迪克蛋',
    image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=300&fit=crop',
    nutrition: { calories: 320, protein: 18, fat: 24, carbs: 10, fiber: 1, sodium: 680 },
    tips: '荷兰酱制作中蛋黄和黄油乳化是关键，水温不能太高。水波蛋要用新鲜鸡蛋，蛋白才不易散。英式马芬烤到表面微焦。',
  },
  {
    title: '凯撒沙拉',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    nutrition: { calories: 220, protein: 12, fat: 16, carbs: 8, fiber: 3, sodium: 620 },
    tips: '罗马生菜要手撕不用刀切，口感更好。面包丁用蒜油烤到金黄酥脆。帕玛森芝士刨片最后撒上，不要用粉状芝士。',
  },
  {
    title: '冬阴功汤',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
    nutrition: { calories: 140, protein: 12, fat: 8, carbs: 6, fiber: 1, sodium: 980 },
    tips: '冬阴功酱要先炒出香味再加水。椰奶最后放，煮沸即可不要久煮。香茅用刀拍裂再入锅更易出味。',
  },
  {
    title: '泰式绿咖喱鸡',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
    nutrition: { calories: 340, protein: 26, fat: 22, carbs: 8, fiber: 2, sodium: 780 },
    tips: '绿咖喱酱要先炒出香味再下椰奶。椰奶分两次加，先加浓椰奶炒出油再加稀椰奶煮。茄子最后放，煮到刚好软烂。',
  },
  {
    title: '泰式酸辣鸡爪',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
    nutrition: { calories: 180, protein: 16, fat: 10, carbs: 4, fiber: 0, sodium: 680 },
    tips: '鸡爪煮好后立刻放入冰水中浸泡，口感更Q弹。鱼露和柠檬汁按2:1比例调配。至少腌制4小时以上才够入味。',
  },
  {
    title: '越南牛肉河粉',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
    nutrition: { calories: 320, protein: 24, fat: 10, carbs: 38, fiber: 1, sodium: 860 },
    tips: '牛骨汤底要熬煮4小时以上，期间不断撇浮沫。河粉用温水泡软即可，不要煮过头。生牛肉片用热汤直接烫熟最嫩。',
  },
  {
    title: '芒果糯米饭',
    image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop',
    nutrition: { calories: 380, protein: 6, fat: 12, carbs: 64, fiber: 3, sodium: 120 },
    tips: '糯米要提前浸泡至少4小时。椰浆煮糯米时加少许盐可提升甜度。芒果选成熟的，切法要薄厚均匀才美观。',
  },
  {
    title: '蚝油生菜',
    image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop',
    nutrition: { calories: 60, protein: 3, fat: 3, carbs: 6, fiber: 2, sodium: 480 },
    tips: '生菜焯水时间极短，下锅15秒即可捞出。蚝油汁用蒜末爆香后调味，淋在生菜上。摆盘要整齐，淋汁要均匀。',
  },
  {
    title: '蒜蓉粉丝蒸扇贝',
    image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop',
    nutrition: { calories: 140, protein: 14, fat: 6, carbs: 8, fiber: 0, sodium: 480 },
    tips: '粉丝提前用温水泡软。蒜蓉分一半炸金蒜一半用生蒜，口感层次更丰富。蒸的时间不要超过5分钟，否则扇贝变老。',
  },
  {
    title: '麻酱凉面',
    image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop',
    nutrition: { calories: 320, protein: 10, fat: 14, carbs: 40, fiber: 2, sodium: 520 },
    tips: '芝麻酱要先用温水慢慢澥开，加少许香油更顺滑。面条煮好后过冰水口感更劲道。黄瓜丝和豆芽增加脆爽口感。',
  },
  {
    title: '可乐鸡翅',
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&h=300&fit=crop',
    nutrition: { calories: 290, protein: 22, fat: 14, carbs: 18, fiber: 0, sodium: 520 },
    tips: '鸡翅两面划刀更易入味。先用姜片和料酒煸炒去腥再倒入可乐。可乐煮到浓稠挂满鸡翅即可，最后大火收汁。',
  },
  {
    title: '印式咖喱角',
    image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop',
    nutrition: { calories: 280, protein: 8, fat: 16, carbs: 28, fiber: 3, sodium: 520 },
    tips: '土豆馅要炒到干爽不粘手，包的时候才好操作。咖喱粉和孜然粉要先炒出香味。封口处刷蛋液捏紧，炸的时候不易散开。',
  },
  {
    title: '德州烤排骨',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
    nutrition: { calories: 480, protein: 34, fat: 36, carbs: 8, fiber: 0, sodium: 880 },
    tips: '排骨先用干腌料（辣椒粉、蒜粉、黑胡椒、盐）涂抹均匀，冷藏腌制过夜。低温慢烤 2-3 小时至肉骨分离。最后刷酱高温烤 5 分钟上色。',
  },
  {
    title: '罗宋汤',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
    nutrition: { calories: 180, protein: 10, fat: 8, carbs: 20, fiber: 4, sodium: 680 },
    tips: '牛肉炖到软烂再加入蔬菜。番茄要炒出红油再放汤中。最后加一小勺酸奶油搅拌均匀，口感更浓郁顺滑。',
  },
  {
    title: '鱼头豆腐汤',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    nutrition: { calories: 160, protein: 18, fat: 8, carbs: 4, fiber: 0, sodium: 520 },
    tips: '鱼头先煎到两面金黄再加水，煮出的汤更白。豆腐切块后焯水去豆腥。大火煮开转小火炖 20 分钟，汤汁奶白。',
  },
  {
    title: '抹茶千层蛋糕',
    image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=300&fit=crop',
    nutrition: { calories: 280, protein: 5, fat: 18, carbs: 26, fiber: 1, sodium: 100 },
    tips: '抹茶粉先加少许热水搅拌成糊再和面糊混合，不易结块。煎饼皮用中小火，每张只煎单面。做好的蛋糕冷藏 3 小时再切。',
  },
]

async function enhanceAll() {
  try {
    await sequelize.authenticate()
    console.log('✅ 数据库连接成功')

    let updated = 0
    let notFound = []
    let imgUpdated = 0

    for (const recipe of ENHANCED_RECIPES) {
      const result = await sequelize.query(
        `UPDATE recipes SET nutrition = :nutrition, tips = :tips, coverImage = :image WHERE title = :title`,
        {
          replacements: {
            title: recipe.title,
            nutrition: JSON.stringify(recipe.nutrition),
            tips: recipe.tips,
            image: recipe.image,
          },
          type: Sequelize.QueryTypes.UPDATE,
        }
      )
      // Sequelize v6 + MySQL2 returns [null, affectedRows] for UPDATE
      const affectedRows = result[1]

      if (affectedRows > 0) {
        updated++
        console.log(`  ✅ 已增强: ${recipe.title}`)
        if (recipe.image && recipe.image.includes('unsplash')) imgUpdated++
      } else {
        notFound.push(recipe.title)
        console.log(`  ❌ 未匹配: ${recipe.title}`)
      }
    }

    console.log(`\n📊 结果: 成功更新 ${updated}/${ENHANCED_RECIPES.length}`)
    console.log(`  其中图片替换: ${imgUpdated} 道`)
    if (notFound.length > 0) {
      console.log(`  未匹配: ${notFound.join('、')}`)
    }

    await sequelize.close()
    console.log('✅ 数据库连接已关闭')
  } catch (err) {
    console.error('❌ 脚本执行失败:', err.message)
    process.exit(1)
  }
}

enhanceAll()