/**
 * 为 seed.js 的 recipes 添加 season 字段
 * 合并 seed-enhance-season.js 的 SEASON_DATA + 本次新分配的 season
 * 运行：node scripts/add-season-to-seed.js
 */
const fs = require('fs');
const path = require('path');

// 完整季节数据（合并现有 + 新增）
const SEASON_DATA = {
  // == 原有 seed-enhance-season.js 映射 ==
  '东北乱炖': 'winter',
  '东坡肉': 'autumn',
  '兰州牛肉面': 'all',
  '冬阴功汤': 'summer',
  '凯撒沙拉': 'summer',
  '印式咖喱角': 'all',
  '可乐鸡翅': 'summer',
  '味噌拉面': 'winter',
  '啤酒鸭': 'autumn',
  '回锅肉': 'autumn',
  '地三鲜': 'summer',
  '大盘鸡': 'autumn',
  '奶油培根意面': 'all',
  '奶油蘑菇汤': 'winter',
  '宫保鸡丁': 'all',
  '小炒肉': 'spring',
  '干煸四季豆': 'summer',
  '干锅花菜': 'autumn',
  '德州烤排骨': 'summer',
  '意大利肉酱面': 'all',
  '扬州炒饭': 'spring',
  '抹茶千层蛋糕': 'spring',
  '提拉米苏': 'all',
  '日式咖喱饭': 'autumn',
  '日式照烧鸡腿': 'all',
  '日式牛丼': 'all',
  '水煮牛肉': 'winter',
  '法式洋葱汤': 'winter',
  '法式焦糖布丁': 'all',
  '泰式绿咖喱鸡': 'summer',
  '泰式酸辣鸡爪': 'summer',
  '清蒸鲈鱼': 'spring',
  '班尼迪克蛋': 'spring',
  '番茄意面': 'summer',
  '白灼基围虾': 'summer',
  '糖醋排骨': 'autumn',
  '红烧牛腩': 'autumn',
  '红烧肉': 'autumn',
  '罗宋汤': 'winter',
  '芒果糯米饭': 'summer',
  '葱油拌面': 'spring',
  '蒜蓉粉丝蒸扇贝': 'summer',
  '蚝油生菜': 'spring',
  '西红柿炒鸡蛋': 'summer',
  '越南牛肉河粉': 'all',
  '酸辣土豆丝': 'summer',
  '醋溜白菜': 'autumn',
  '韩式拌饭': 'all',
  '韩式泡菜炒五花肉': 'autumn',
  '韩式炒年糕': 'winter',
  '韩式烤五花肉': 'summer',
  '鱼头豆腐汤': 'winter',
  '鱼香肉丝': 'all',
  '麻婆豆腐': 'winter',
  '麻酱凉面': 'summer',
  // == 本次新增映射（从 season=all 升级） ==
  '卤肉饭': 'winter',
  '剁椒鱼头': 'winter',
  '酸菜鱼': 'winter',
  '辣子鸡': 'winter',
  '小炒黄牛肉': 'winter',
  '白切鸡': 'summer',
  '虾饺': 'summer',
  '章鱼小丸子': 'summer',
  // 小炒肉/干炒牛河/扬州炒饭/糖醋排骨已在上方更新
  // 以下保持 all 但可考虑以后细化
  '焦糖布丁': 'all',
};

const seedPath = path.join(__dirname, '..', 'seeds', 'seed.js');
let content = fs.readFileSync(seedPath, 'utf-8');

// Parse the recipes array
const recipeStart = content.indexOf('const recipes = [');

// Use simple approach: add season field after difficulty for each recipe
let added = 0;
let skipped = 0;

// Find each recipe object and add season after difficulty
for (const [title, season] of Object.entries(SEASON_DATA)) {
  // Search for this recipe entry using title
  const titlePattern = `title: '${title.replace(/'/g, "\\'")}'`;
  const titleIdx = content.indexOf(titlePattern);
  if (titleIdx === -1) {
    skipped++;
    continue;
  }

  // Find difficulty line after this title
  const afterTitle = content.indexOf(',', titleIdx);
  const segment = content.slice(titleIdx, titleIdx + 300);
  const diffMatch = segment.match(/difficulty: '[^']+'/);
  if (!diffMatch) { skipped++; continue; }

  const diffFull = diffMatch[0];
  const diffEnd = content.indexOf(diffFull, titleIdx) + diffFull.length;
  const afterDiff = content.slice(diffEnd, diffEnd + 10);

  // Check if season already exists
  const seasonCheck = content.slice(titleIdx, afterTitle + 200);
  if (/\bseason: '/.test(seasonCheck)) {
    skipped++;
    continue;
  }

  // Add season right after difficulty
  const insert = `,\n    season: '${season}'`;
  content = content.slice(0, diffEnd) + insert + content.slice(diffEnd);
  added++;
}

// Write back
fs.writeFileSync(seedPath, content, 'utf-8');
console.log(`✅ seed.js updated: ${added} recipes got season field, ${skipped} skipped (already had or not found)`);

// Also update seed-enhance-season.js with the comprehensive data
const enhancePath = path.join(__dirname, '..', 'seeds', 'seed-enhance-season.js');
let enhanceContent = fs.readFileSync(enhancePath, 'utf-8');

// Replace the SEASON_DATA object with comprehensive version
const dataStart = enhanceContent.indexOf("const SEASON_DATA = {");
const dataEnd = enhanceContent.indexOf("const DIFFICULTY_CALIBRATION");
if (dataStart === -1 || dataEnd === -1) {
  console.error('❌ Could not find SEASON_DATA in seed-enhance-season.js');
  process.exit(1);
}

const newDataEntries = Object.entries(SEASON_DATA)
  .filter(([k]) => k !== '回锅肉') // handled with comment below
  .sort((a, b) => a[0].localeCompare(b[0], 'zh'))
  .map(([title, s]) => `  '${title}': '${s}'`)
  .join(',\n');

// Rebuild SEASON_DATA with all entries
const newDataSection = `const SEASON_DATA = {\n${newDataEntries},\n  // 回锅肉有 2 个版本，用 v2 variant
}`;

enhanceContent = enhanceContent.slice(0, dataStart) + newDataSection + enhanceContent.slice(dataEnd);
fs.writeFileSync(enhancePath, enhanceContent, 'utf-8');
console.log('✅ seed-enhance-season.js updated with comprehensive SEASON_DATA');