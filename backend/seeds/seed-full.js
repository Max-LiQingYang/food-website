/**
 * seeds/seed-full.js
 * 批量导入食谱数据（50+精选家常菜谱）
 *
 * 运行方式：
 *   cd backend && node seeds/seed-full.js
 *
 * 数据来源：
 *   1. 现有种子数据（seed.js 中的精选食谱）
 *   2. 新增批量食谱（new-recipes-p1~p4.json）
 */

const crypto = require('crypto')
const uuidv4 = () => crypto.randomUUID()
const bcrypt = require('bcryptjs')
const path = require('path')
const fs = require('fs')
const db = require('../models')

// ─── 现有种子食谱（24道）──────────────────────────────────────
const existingRecipes = [
  {
    title: '宫保鸡丁', category: 'chinese', difficulty: 'medium', servings: 3, cookTime: 25,
    author: '家常美食',
    coverImage: 'https://placehold.co/400x300/E74C3C/white?text=宫保鸡丁',
    description: '经典川菜，鸡肉嫩滑，花生酥脆，麻辣鲜香，老少皆宜。',
    ingredients: [ { name: '鸡胸肉', amount: 300, unit: 'g' }, { name: '花生米', amount: 50, unit: 'g' }, { name: '干辣椒', amount: 10, unit: '个' }, { name: '花椒', amount: 1, unit: '勺' }, { name: '葱姜蒜', amount: 15, unit: 'g' }, { name: '生抽', amount: 2, unit: '勺' }, { name: '醋', amount: 1, unit: '勺' }, { name: '糖', amount: 1, unit: '勺' } ],
    steps: [ { stepNumber: 1, content: '鸡胸肉切丁，用料酒、生抽、淀粉腌制15分钟' }, { stepNumber: 2, content: '花生米小火炒至金黄盛出备用' }, { stepNumber: 3, content: '调汁：生抽2勺、醋1勺、糖1勺、淀粉适量加少许水搅匀' }, { stepNumber: 4, content: '热锅冷油，下鸡丁滑炒至变色盛出' }, { stepNumber: 5, content: '锅中留底油，爆香干辣椒、花椒、葱姜蒜' }, { stepNumber: 6, content: '倒入鸡丁和花生米翻炒，淋入调好的酱汁' }, { stepNumber: 7, content: '大火收汁，撒上葱花出锅' } ],
    categoryTags: { ingredient: '肉类', method: '炒', cuisine: '川菜', flavor: '麻辣', price: '普通家常' }
  },
  {
    title: '红烧肉', category: 'chinese', difficulty: 'medium', servings: 4, cookTime: 90,
    author: '家常美食',
    coverImage: 'https://placehold.co/400x300/8B4513/white?text=红烧肉',
    description: '肥而不腻、入口即化的经典红烧肉，浓油赤酱，是下饭的绝佳选择。',
    ingredients: [ { name: '五花肉', amount: 500, unit: 'g' }, { name: '冰糖', amount: 30, unit: 'g' }, { name: '八角', amount: 2, unit: '个' }, { name: '桂皮', amount: 1, unit: '块' }, { name: '生抽', amount: 3, unit: '勺' }, { name: '老抽', amount: 1, unit: '勺' }, { name: '料酒', amount: 2, unit: '勺' }, { name: '姜', amount: 3, unit: '片' } ],
    steps: [ { stepNumber: 1, content: '五花肉切3厘米方块，冷水下锅焯水去血沫' }, { stepNumber: 2, content: '捞出洗净，沥干水分' }, { stepNumber: 3, content: '锅中放少许油，下冰糖小火炒至焦糖色' }, { stepNumber: 4, content: '放入五花肉翻炒上色' }, { stepNumber: 5, content: '加入八角、桂皮、姜片、料酒、生抽、老抽' }, { stepNumber: 6, content: '加热水没过肉块，大火烧开转小火炖60分钟' }, { stepNumber: 7, content: '大火收汁，待汤汁浓稠即可出锅' } ],
    categoryTags: { ingredient: '肉类', method: '炖', cuisine: '家常菜', flavor: '咸鲜', price: '普通家常' }
  },
  {
    title: '鱼香肉丝', category: 'chinese', difficulty: 'medium', servings: 3, cookTime: 20,
    author: '家常美食',
    coverImage: 'https://placehold.co/400x300/E74C3C/white?text=鱼香肉丝',
    description: '酸甜微辣的经典川菜，肉丝嫩滑，配菜爽脆，鱼香汁浓郁下饭。',
    ingredients: [ { name: '猪里脊肉', amount: 250, unit: 'g' }, { name: '木耳', amount: 50, unit: 'g' }, { name: '胡萝卜', amount: 1, unit: '根' }, { name: '青椒', amount: 1, unit: '个' }, { name: '泡椒', amount: 3, unit: '个' }, { name: '葱姜蒜', amount: 15, unit: 'g' }, { name: '醋', amount: 2, unit: '勺' }, { name: '糖', amount: 2, unit: '勺' }, { name: '生抽', amount: 2, unit: '勺' } ],
    steps: [ { stepNumber: 1, content: '猪里脊切丝，用料酒、生抽、淀粉腌制10分钟' }, { stepNumber: 2, content: '木耳泡发切丝，胡萝卜、青椒切丝' }, { stepNumber: 3, content: '调鱼香汁：醋2勺、糖2勺、生抽2勺、淀粉1勺、水适量搅匀' }, { stepNumber: 4, content: '热锅冷油，下肉丝滑炒至变色盛出' }, { stepNumber: 5, content: '锅中留底油，爆香泡椒、葱姜蒜' }, { stepNumber: 6, content: '下配菜翻炒至断生' }, { stepNumber: 7, content: '倒入肉丝和鱼香汁，大火翻炒均匀即可' } ],
    categoryTags: { ingredient: '肉类', method: '炒', cuisine: '川菜', flavor: '酸甜', price: '普通家常' }
  },
  {
    title: '麻婆豆腐', category: 'chinese', difficulty: 'easy', servings: 2, cookTime: 15,
    author: '家常美食',
    coverImage: 'https://placehold.co/400x300/CC0000/white?text=麻婆豆腐',
    description: '麻辣鲜香的经典川菜，嫩豆腐搭配肉末和花椒，简单快手味道十足。',
    ingredients: [ { name: '嫩豆腐', amount: 1, unit: '盒' }, { name: '猪肉末', amount: 50, unit: 'g' }, { name: '豆瓣酱', amount: 1, unit: '勺' }, { name: '花椒粉', amount: 1, unit: '茶匙' }, { name: '蒜末', amount: 1, unit: '勺' }, { name: '葱花', amount: 10, unit: 'g' }, { name: '水淀粉', amount: 2, unit: '勺' } ],
    steps: [ { stepNumber: 1, content: '豆腐切2厘米方块，开水加盐焯2分钟' }, { stepNumber: 2, content: '热锅冷油，下肉末炒至变色' }, { stepNumber: 3, content: '加入豆瓣酱炒出红油' }, { stepNumber: 4, content: '加适量水烧开，轻轻放入豆腐块' }, { stepNumber: 5, content: '中火煮3分钟入味' }, { stepNumber: 6, content: '淋入水淀粉勾芡，撒花椒粉和葱花' } ],
    categoryTags: { ingredient: '豆制品', method: '煮', cuisine: '川菜', flavor: '麻辣', price: '经济实惠' }
  },
  {
    title: '糖醋排骨', category: 'chinese', difficulty: 'medium', servings: 3, cookTime: 40,
    author: '家常美食',
    coverImage: 'https://placehold.co/400x300/CD5C5C/white?text=糖醋排骨',
    description: '色泽红亮、酸甜适口的经典家常菜，外酥里嫩，大人小孩都爱吃。',
    ingredients: [ { name: '小排', amount: 500, unit: 'g' }, { name: '醋', amount: 3, unit: '勺' }, { name: '糖', amount: 3, unit: '勺' }, { name: '生抽', amount: 2, unit: '勺' }, { name: '料酒', amount: 2, unit: '勺' }, { name: '姜', amount: 3, unit: '片' }, { name: '白芝麻', amount: 5, unit: 'g' } ],
    steps: [ { stepNumber: 1, content: '小排冷水下锅焯水，捞出洗净' }, { stepNumber: 2, content: '锅中放油，下排骨煎至两面金黄' }, { stepNumber: 3, content: '加入姜片、料酒、生抽翻炒上色' }, { stepNumber: 4, content: '加热水没过排骨，大火烧开转小火炖25分钟' }, { stepNumber: 5, content: '加入醋和糖，大火收汁至浓稠' }, { stepNumber: 6, content: '撒上白芝麻出锅' } ],
    categoryTags: { ingredient: '肉类', method: '炖', cuisine: '家常菜', flavor: '酸甜', price: '普通家常' }
  },
  {
    title: '水煮牛肉', category: 'chinese', difficulty: 'hard', servings: 3, cookTime: 30,
    author: '家常美食',
    coverImage: 'https://placehold.co/400x300/B22222/white?text=水煮牛肉',
    description: '麻辣鲜香的川菜经典，牛肉嫩滑入味，汤底红亮，辣而不燥。',
    ingredients: [ { name: '牛里脊', amount: 300, unit: 'g' }, { name: '豆芽', amount: 200, unit: 'g' }, { name: '郫县豆瓣酱', amount: 2, unit: '勺' }, { name: '干辣椒', amount: 15, unit: '个' }, { name: '花椒', amount: 2, unit: '勺' }, { name: '蒜末', amount: 2, unit: '勺' }, { name: '生抽', amount: 2, unit: '勺' }, { name: '淀粉', amount: 1, unit: '勺' } ],
    steps: [ { stepNumber: 1, content: '牛里脊逆纹切薄片，用蛋清、淀粉、料酒腌制15分钟' }, { stepNumber: 2, content: '豆芽焯水铺在碗底' }, { stepNumber: 3, content: '热锅冷油，下豆瓣酱炒出红油，加蒜末爆香' }, { stepNumber: 4, content: '加水烧开，下牛肉片滑散煮至变色' }, { stepNumber: 5, content: '将牛肉和汤汁倒在豆芽上' }, { stepNumber: 6, content: '另起锅烧热油，下干辣椒和花椒炸香' }, { stepNumber: 7, content: '将热油浇在牛肉上，滋啦一声即成' } ],
    categoryTags: { ingredient: '肉类', method: '煮', cuisine: '川菜', flavor: '麻辣', price: '中档' }
  },
  {
    title: '清蒸鲈鱼', category: 'chinese', difficulty: 'easy', servings: 2, cookTime: 20,
    author: '家常美食',
    coverImage: 'https://placehold.co/400x300/4682B4/white?text=清蒸鲈鱼',
    description: '原汁原味的粤式经典，鱼肉鲜嫩，豉油提味，清淡而不寡淡。',
    ingredients: [ { name: '鲈鱼', amount: 1, unit: '条' }, { name: '葱', amount: 3, unit: '根' }, { name: '姜', amount: 5, unit: '片' }, { name: '蒸鱼豉油', amount: 3, unit: '勺' }, { name: '料酒', amount: 1, unit: '勺' }, { name: '红椒丝', amount: 10, unit: 'g' } ],
    steps: [ { stepNumber: 1, content: '鲈鱼处理干净，两面各划三刀' }, { stepNumber: 2, content: '鱼身抹料酒，塞入姜片，腌制10分钟' }, { stepNumber: 3, content: '盘底铺葱段和姜片，放上鱼' }, { stepNumber: 4, content: '水开后上锅大火蒸8分钟，关火焖2分钟' }, { stepNumber: 5, content: '倒掉盘中蒸汁，铺上葱丝和红椒丝' }, { stepNumber: 6, content: '淋上蒸鱼豉油，浇上一勺热油激香' } ],
    categoryTags: { ingredient: '海鲜类', method: '蒸', cuisine: '粤菜', flavor: '清淡', price: '中档' }
  },
  {
    title: '番茄意面', category: 'western', difficulty: 'easy', servings: 2, cookTime: 20,
    author: '家常美食',
    coverImage: 'https://placehold.co/400x300/FF6347/white?text=番茄意面',
    description: '经典的意大利面做法，酸甜可口的番茄酱汁搭配弹牙的意面。',
    ingredients: [ { name: '意大利面', amount: 200, unit: 'g' }, { name: '番茄', amount: 3, unit: '个' }, { name: '蒜', amount: 3, unit: '瓣' }, { name: '洋葱', amount: 1, unit: '个' }, { name: '橄榄油', amount: 2, unit: '勺' }, { name: '番茄酱', amount: 3, unit: '勺' }, { name: '盐', amount: 1, unit: '茶匙' }, { name: '黑胡椒', amount: 1, unit: '茶匙' }, { name: '帕玛森芝士', amount: 20, unit: 'g' } ],
    steps: [ { stepNumber: 1, content: '大锅烧水，加盐，下意面煮8-10分钟至弹牙' }, { stepNumber: 2, content: '番茄划十字，开水烫后去皮切碎' }, { stepNumber: 3, content: '平底锅倒橄榄油，爆香蒜末和洋葱丁' }, { stepNumber: 4, content: '倒入番茄碎和番茄酱，小火熬煮10分钟' }, { stepNumber: 5, content: '加盐和黑胡椒调味' }, { stepNumber: 6, content: '将煮好的意面拌入酱汁，撒上芝士碎即可' } ],
    categoryTags: { ingredient: '主食类', method: '煮', cuisine: '西餐', flavor: '酸甜', price: '普通家常' }
  },
  {
    title: '提拉米苏', category: 'dessert', difficulty: 'medium', servings: 6, cookTime: 30,
    author: '家常美食',
    coverImage: 'https://placehold.co/400x300/8B4513/white?text=提拉米苏',
    description: '来自意大利的经典甜点，马斯卡彭芝士与浓缩咖啡的完美结合，入口即化。',
    ingredients: [ { name: '马斯卡彭芝士', amount: 250, unit: 'g' }, { name: '手指饼干', amount: 200, unit: 'g' }, { name: '浓缩咖啡', amount: 200, unit: 'ml' }, { name: '鸡蛋', amount: 3, unit: '个' }, { name: '糖', amount: 80, unit: 'g' }, { name: '可可粉', amount: 20, unit: 'g' }, { name: '朗姆酒', amount: 2, unit: '勺' } ],
    steps: [ { stepNumber: 1, content: '蛋黄加糖打至浓稠发白' }, { stepNumber: 2, content: '加入马斯卡彭芝士搅拌均匀' }, { stepNumber: 3, content: '蛋白打发至硬性发泡，轻轻拌入芝士糊' }, { stepNumber: 4, content: '浓缩咖啡冷却，加入朗姆酒' }, { stepNumber: 5, content: '手指饼干快速蘸咖啡液，铺满容器底部' }, { stepNumber: 6, content: '铺一层芝士糊，再铺一层蘸咖啡的饼干' }, { stepNumber: 7, content: '重复层叠，最后盖上芝士糊' }, { stepNumber: 8, content: '冷藏4小时以上，食用前筛上可可粉' } ],
    categoryTags: { ingredient: '蛋奶类', method: '烤', cuisine: '西餐', flavor: '甜', price: '中档' }
  },
  {
    title: '抹茶千层蛋糕', category: 'japanese', difficulty: 'hard', servings: 8, cookTime: 60,
    author: '家常美食',
    coverImage: 'https://placehold.co/400x300/2E8B57/white?text=抹茶千层',
    description: '细腻的抹茶可丽饼层层叠加，搭配丝滑奶油，日式甜点的经典之作。',
    ingredients: [ { name: '低筋面粉', amount: 100, unit: 'g' }, { name: '抹茶粉', amount: 15, unit: 'g' }, { name: '鸡蛋', amount: 3, unit: '个' }, { name: '牛奶', amount: 400, unit: 'ml' }, { name: '黄油', amount: 30, unit: 'g' }, { name: '糖', amount: 60, unit: 'g' }, { name: '淡奶油', amount: 400, unit: 'ml' }, { name: '糖粉', amount: 30, unit: 'g' } ],
    steps: [ { stepNumber: 1, content: '面粉和抹茶粉过筛混合' }, { stepNumber: 2, content: '鸡蛋加糖打散，慢慢倒入牛奶搅拌均匀' }, { stepNumber: 3, content: '将液体分次倒入粉类，搅拌至无颗粒' }, { stepNumber: 4, content: '加入融化黄油搅匀，过滤面糊，冷藏30分钟' }, { stepNumber: 5, content: '小火摊薄饼皮，约可做20张' }, { stepNumber: 6, content: '淡奶油加糖粉打至硬性发泡' }, { stepNumber: 7, content: '一层饼皮一层奶油叠放' }, { stepNumber: 8, content: '冷藏2小时定型后切块食用' } ],
    categoryTags: { ingredient: '蛋奶类', method: '烤', cuisine: '日料', flavor: '甜', price: '中档' }
  },
  {
    title: '韩式拌饭', category: 'korean', difficulty: 'medium', servings: 2, cookTime: 35,
    author: '家常美食',
    coverImage: 'https://placehold.co/400x300/FF4500/white?text=韩式拌饭',
    description: '色彩缤纷的韩式经典料理，多种蔬菜搭配米饭和辣酱，营养均衡又美味。',
    ingredients: [ { name: '米饭', amount: 300, unit: 'g' }, { name: '牛肉', amount: 100, unit: 'g' }, { name: '菠菜', amount: 100, unit: 'g' }, { name: '胡萝卜', amount: 1, unit: '根' }, { name: '豆芽', amount: 100, unit: 'g' }, { name: '鸡蛋', amount: 1, unit: '个' }, { name: '韩式辣酱', amount: 2, unit: '勺' }, { name: '芝麻油', amount: 1, unit: '勺' } ],
    steps: [ { stepNumber: 1, content: '牛肉切丝，用酱油、糖、芝麻油腌制' }, { stepNumber: 2, content: '菠菜焯水，拌入盐和芝麻油' }, { stepNumber: 3, content: '胡萝卜切丝炒熟，豆芽焯水沥干' }, { stepNumber: 4, content: '牛肉炒熟备用' }, { stepNumber: 5, content: '煎一个太阳蛋' }, { stepNumber: 6, content: '碗中盛米饭，将各种蔬菜和牛肉围着摆放' }, { stepNumber: 7, content: '中间放煎蛋，搭配韩式辣酱拌匀食用' } ],
    categoryTags: { ingredient: '主食类', method: '炒', cuisine: '韩料', flavor: '甜辣', price: '普通家常' }
  },
  {
    title: '味噌拉面', category: 'japanese', difficulty: 'medium', servings: 2, cookTime: 40,
    author: '家常美食',
    coverImage: 'https://placehold.co/400x300/8B4513/white?text=味噌拉面',
    description: '浓郁味噌汤底搭配弹牙拉面，配上溏心蛋和叉烧，冬日暖身首选。',
    ingredients: [ { name: '拉面', amount: 200, unit: 'g' }, { name: '味噌', amount: 3, unit: '勺' }, { name: '猪骨汤', amount: 800, unit: 'ml' }, { name: '叉烧肉', amount: 100, unit: 'g' }, { name: '溏心蛋', amount: 2, unit: '个' }, { name: '玉米粒', amount: 50, unit: 'g' }, { name: '黄油', amount: 10, unit: 'g' }, { name: '葱花', amount: 10, unit: 'g' } ],
    steps: [ { stepNumber: 1, content: '猪骨汤加热至微沸' }, { stepNumber: 2, content: '味噌用少量热汤化开，倒入汤中搅匀' }, { stepNumber: 3, content: '另一锅煮面至弹牙，捞出放入碗中' }, { stepNumber: 4, content: '汤中加一小块黄油增香' }, { stepNumber: 5, content: '将味噌汤浇入面碗' }, { stepNumber: 6, content: '摆上切好的叉烧、溏心蛋、玉米粒和葱花' } ],
    categoryTags: { ingredient: '主食类', method: '煮', cuisine: '日料', flavor: '咸鲜', price: '普通家常' }
  },
  {
    title: '法式焦糖布丁', category: 'dessert', difficulty: 'medium', servings: 4, cookTime: 60,
    author: '家常美食',
    coverImage: 'https://placehold.co/400x300/DAA520/white?text=焦糖布丁',
    description: '经典法式甜点，焦糖的微苦与蛋奶的香甜交织，口感丝滑细腻。',
    ingredients: [ { name: '鸡蛋', amount: 3, unit: '个' }, { name: '牛奶', amount: 300, unit: 'ml' }, { name: '淡奶油', amount: 100, unit: 'ml' }, { name: '糖', amount: 80, unit: 'g' }, { name: '香草精', amount: 1, unit: '茶匙' } ],
    steps: [ { stepNumber: 1, content: '50g糖加水小火熬至琥珀色焦糖' }, { stepNumber: 2, content: '焦糖迅速倒入布丁模具底部' }, { stepNumber: 3, content: '牛奶和淡奶油加热至微沸' }, { stepNumber: 4, content: '鸡蛋加剩余糖打散至融化' }, { stepNumber: 5, content: '热牛奶缓慢倒入蛋液，边倒边搅' }, { stepNumber: 6, content: '过滤蛋奶液，加入香草精' }, { stepNumber: 7, content: '倒入模具，水浴法150°C烤40分钟' }, { stepNumber: 8, content: '冷却后冷藏4小时，脱模食用' } ],
    categoryTags: { ingredient: '蛋奶类', method: '烤', cuisine: '西餐', flavor: '甜', price: '普通家常' }
  }
]

// ─── 读取新食谱批次 ──────────────────────────────────────────
function loadNewRecipes() {
  const all = []
  const dir = __dirname
  for (let i = 1; i <= 4; i++) {
    const file = path.join(dir, 'new-recipes-p' + i + '.json')
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
      // Add author if missing
      for (const r of data) {
        r.author = r.author || '家常美食'
      }
      all.push(...data)
    }
  }
  return all
}

// ─── 为食谱添加 categoryTags（新食谱已有，老食谱补充） ─────
function ensureCategoryTags(recipe) {
  if (recipe.categoryTags) return

  // Fallback: derive from existing category
  const cat = recipe.category
  const defaults = {
    chinese: { ingredient: '肉类', method: '炒', cuisine: '家常菜', flavor: '咸鲜', price: '普通家常' },
    western: { ingredient: '主食类', method: '煮', cuisine: '西餐', flavor: '咸鲜', price: '普通家常' },
    japanese: { ingredient: '海鲜类', method: '煮', cuisine: '日料', flavor: '咸鲜', price: '普通家常' },
    korean: { ingredient: '肉类', method: '炒', cuisine: '韩料', flavor: '甜辣', price: '普通家常' },
    dessert: { ingredient: '蛋奶类', method: '烤', cuisine: '西餐', flavor: '甜', price: '普通家常' },
    thai: { ingredient: '海鲜类', method: '煲汤', cuisine: '东南亚菜', flavor: '酸辣', price: '普通家常' },
    indian: { ingredient: '肉类', method: '炖', cuisine: '东南亚菜', flavor: '香辣', price: '普通家常' }
  }
  recipe.categoryTags = defaults[cat] || defaults.chinese
}

async function seed() {
  try {
    await db.sequelize.sync()

    // 清空旧数据
    console.log('清空旧数据...')
    await db.Favorite.destroy({ where: {} })
    await db.Recipe.destroy({ where: {} })
    await db.User.destroy({ where: {} })

    // 创建账号
    const hashedPassword = await bcrypt.hash('123456', 10)
    await db.User.create({
      id: uuidv4(),
      username: 'admin',
      email: 'test@test.com',
      password: hashedPassword,
      nickname: '管理员',
      role: 'admin'
    })
    console.log('✅ 管理员账号: test@test.com / 123456')

    await db.User.create({
      id: uuidv4(),
      username: 'jiaochangmeishi',
      email: 'jiachang@food.com',
      password: hashedPassword,
      nickname: '家常美食',
      role: 'user'
    })
    console.log('✅ 家常美食账号: jiaochangmeishi / 123456')

    // 插入食谱数据
    const allRecipes = [...existingRecipes, ...loadNewRecipes()]
    const recipesForDb = allRecipes.map(r => {
      ensureCategoryTags(r)
      return {
        id: uuidv4(),
        title: r.title,
        coverImage: r.coverImage,
        author: r.author || '家常美食',
        cookTime: r.cookTime || 20,
        description: r.description || '',
        category: r.category || 'chinese',
        difficulty: r.difficulty || 'easy',
        servings: r.servings || 2,
        ingredients: JSON.stringify(r.ingredients),
        steps: JSON.stringify(r.steps),
        categoryTags: JSON.stringify(r.categoryTags),
        createdAt: new Date()
      }
    })

    await db.Recipe.bulkCreate(recipesForDb)

    // 统计
    const catCounts = {}
    for (const r of recipesForDb) {
      const tags = JSON.parse(r.categoryTags)
      const cuisine = tags.cuisine
      catCounts[cuisine] = (catCounts[cuisine] || 0) + 1
    }

    console.log('\n✅ 成功导入 ' + recipesForDb.length + ' 道食谱!')
    console.log('   菜系分布:')
    for (const [cuisine, count] of Object.entries(catCounts).sort((a, b) => b[1] - a[1])) {
      console.log('     ' + cuisine + ': ' + count + '道')
    }
    console.log('   分类覆盖: 食材/做法/菜系/口味/价格')

    process.exit(0)
  } catch (err) {
    console.error('❌ 种子数据插入失败:', err.message)
    process.exit(1)
  }
}

seed()