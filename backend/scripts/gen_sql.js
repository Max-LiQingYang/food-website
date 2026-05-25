'use strict'

const content = require('./fill_story_cb.js');
const fs = require('fs');

const entryMap = {};
for (const [key, data] of Object.entries(content)) {
  const parts = key.split('|');
  const mapKey = parts[0] + '|' + parts[1];
  if (!entryMap[mapKey]) entryMap[mapKey] = [];
  entryMap[mapKey].push({ story: data.story, cb: data.cb, isV2: parts[2] === 'v2' });
}

for (const arr of Object.values(entryMap)) {
  arr.sort((a, b) => Number(a.isV2) - Number(b.isV2));
}

const recipes = [
  {id:'fa9c7954-c4ab-490e-9317-c432a9a124b5',title:'东北乱炖',cat:'chinese'},
  {id:'fd415ba1-450e-43ea-b937-39af983ad89c',title:'东坡肉',cat:'chinese'},
  {id:'ae778ee5-1b8d-4cfe-89ab-14650f063dd4',title:'兰州牛肉面',cat:'chinese'},
  {id:'09dbb410-3205-4f07-b418-bb6c1b4f7533',title:'冬阴功汤',cat:'thai'},
  {id:'7ba9985a-5524-43b3-9c6b-476811aaff37',title:'冬阴功汤',cat:'thai'},
  {id:'7f6d1f14-6d57-477c-b46e-0e5858497892',title:'凯撒沙拉',cat:'western'},
  {id:'b26f268f-71a9-446a-8ccd-8412acb730fd',title:'剁椒鱼头',cat:'chinese'},
  {id:'6e5b80cf-4c37-4347-8aed-682d5644c175',title:'卤肉饭',cat:'chinese'},
  {id:'46be9d06-6039-4fde-bd53-aadb96c28c14',title:'印式咖喱角',cat:'indian'},
  {id:'6f4ff7b4-e185-4161-b624-abcab729b9c5',title:'可乐鸡翅',cat:'chinese'},
  {id:'6ee5d393-b772-4246-b973-9b4884d7a9c8',title:'味噌拉面',cat:'japanese'},
  {id:'59012b77-7f32-4d97-8241-6a7aec8d20c3',title:'啤酒鸭',cat:'chinese'},
  {id:'57bb4513-899e-44f1-8941-a02204f8d735',title:'回锅肉',cat:'chinese'},
  {id:'b1901221-ebd2-42bc-a0f3-0b2bafe1840e',title:'回锅肉',cat:'chinese'},
  {id:'054369ce-c16d-4420-9f92-c7bffc7713f6',title:'地三鲜',cat:'chinese'},
  {id:'cb61f2dc-aabb-4a7a-bbd0-af3478bb7165',title:'大盘鸡',cat:'chinese'},
  {id:'8ce887af-988b-4073-bdbe-8d1a1d288627',title:'天妇罗',cat:'japanese'},
  {id:'50f568b3-91e5-4973-9bb3-aee0f2d04ed5',title:'奶油培根意面',cat:'western'},
  {id:'422e64b0-2dba-49ae-9521-21d3b323ebca',title:'奶油蘑菇汤',cat:'western'},
  {id:'3aaf78d9-79be-4333-975a-782bfa3393a8',title:'宫保鸡丁',cat:'chinese'},
  {id:'f9c902fe-124c-4f84-aeae-47e74b925729',title:'小炒肉',cat:'chinese'},
  {id:'b9427e2d-4d21-4179-8b59-354195ece7b5',title:'小炒黄牛肉',cat:'chinese'},
  {id:'4302f2c5-ed54-4bd2-b13a-dffe5a3383c4',title:'干炒牛河',cat:'chinese'},
  {id:'b550ceea-3dba-47d8-9caa-bf8b9f0eb441',title:'干煸四季豆',cat:'chinese'},
  {id:'324ff51f-816c-49df-9063-f5d43c635cd9',title:'干锅花菜',cat:'chinese'},
  {id:'60b2ed1c-48e4-4474-8c72-5e8acec291b8',title:'德州烤排骨',cat:'western'},
  {id:'54e73067-c15b-43f0-a5a7-c07bbb64892b',title:'意大利肉酱面',cat:'western'},
  {id:'e442f02d-bbcd-401d-96b1-104ac57bebf4',title:'扬州炒饭',cat:'chinese'},
  {id:'0cd3362c-d336-4fe2-9e08-1c5c8480a94a',title:'抹茶千层蛋糕',cat:'japanese'},
  {id:'30eb4af1-c144-4067-8a0a-b9f5d8406d6d',title:'提拉米苏',cat:'dessert'},
  {id:'3acc7ea6-799f-4189-8a97-074efc84d042',title:'提拉米苏',cat:'dessert'},
  {id:'aa53892c-8ff3-4c04-a9ab-441fd0725fea',title:'日式咖喱饭',cat:'japanese'},
  {id:'e6c16baf-a0e5-4285-84a5-fab7aee86260',title:'日式照烧鸡腿',cat:'japanese'},
  {id:'ed5cc34f-c81f-4eb2-b01a-57db55ed348a',title:'日式牛丼',cat:'japanese'},
  {id:'fcfd6517-3d9e-4dcc-9504-2be9f6bb644d',title:'普罗旺斯炖菜',cat:'western'},
  {id:'73e5e22f-f297-4d05-b082-483e3ee40793',title:'水煮牛肉',cat:'chinese'},
  {id:'07cdd22c-9bd4-478d-8fa9-aedff08eca3d',title:'水煮鱼',cat:'chinese'},
  {id:'a535bb2d-2bb9-438f-81ef-97ab33a454ca',title:'法式洋葱汤',cat:'western'},
  {id:'b00be566-d8d0-4666-a5dc-70b54da977bb',title:'法式洋葱汤',cat:'western'},
  {id:'39272dd0-9e5c-4dfd-b5b4-4836d6dcbad4',title:'法式焦糖布丁',cat:'dessert'},
  {id:'224220d6-fb83-45d6-976f-83c10bc123b1',title:'泰式绿咖喱鸡',cat:'thai'},
  {id:'a182c8e6-d003-477b-b0d3-fde8b3beb225',title:'泰式绿咖喱鸡',cat:'thai'},
  {id:'4dea8210-d00c-40ca-8c33-734b6c66c8f5',title:'泰式酸辣鸡爪',cat:'thai'},
  {id:'d34e5e50-ffe8-4a79-b1e5-bcd8f4258990',title:'清蒸鲈鱼',cat:'chinese'},
  {id:'6837177a-e004-4a85-ac66-e5e18a9b0b57',title:'焦糖布丁',cat:'dessert'},
  {id:'14302720-58e3-4308-bd6a-e513d901e2a9',title:'班尼迪克蛋',cat:'western'},
  {id:'2fff92e4-88f8-41cf-ba61-e7703cffe08b',title:'班尼迪克蛋',cat:'western'},
  {id:'119e87b3-e87e-4c4d-aed4-c289970090d4',title:'番茄意面',cat:'western'},
  {id:'a5a89e54-55bb-4181-967d-7659b72d9a7a',title:'白切鸡',cat:'chinese'},
  {id:'1a5f7533-18a7-448c-bcf0-556fd4607cb4',title:'白灼基围虾',cat:'chinese'},
  {id:'7a475ae8-902a-47ec-a1ce-21fd04ba4213',title:'章鱼小丸子',cat:'japanese'},
  {id:'1aff7a73-50b9-4dee-a034-52b8df246343',title:'糖醋排骨',cat:'chinese'},
  {id:'283e2f47-b02a-4192-a84a-f1a9af0db60a',title:'红烧牛腩',cat:'chinese'},
  {id:'46aef06d-fcbb-4b33-8357-41ba0e8d8893',title:'红烧肉',cat:'chinese'},
  {id:'a087d040-46ef-4d69-891c-79e6a06e48dd',title:'罗宋汤',cat:'western'},
  {id:'63cd90c0-dfba-41b1-bcbd-7d361ba6ee12',title:'芒果糯米饭',cat:'thai'},
  {id:'b0d365e7-715b-4ac7-9abe-ef49054728a4',title:'芒果糯米饭',cat:'thai'},
  {id:'585ea9b8-4be3-4441-aef6-79985d025e4b',title:'葱油拌面',cat:'chinese'},
  {id:'0a40d033-0408-435e-bd7b-9208ee3ef260',title:'蒜蓉粉丝蒸扇贝',cat:'chinese'},
  {id:'8f72bfdd-ff1e-4be8-8682-d506a5c1a4d4',title:'蒜蓉粉丝蒸扇贝',cat:'chinese'},
  {id:'6a64cc95-e85b-4c23-b23d-801aff9d7228',title:'虾饺',cat:'chinese'},
  {id:'3a7b10bd-d148-4c82-8798-bd352f0be83a',title:'蚝油生菜',cat:'chinese'},
  {id:'1055de2b-2a7d-435b-a9ab-b626ec3ee81b',title:'西红柿炒鸡蛋',cat:'chinese'},
  {id:'7b4b5620-d9b7-4a90-bedd-b077dfdfe111',title:'豚骨拉面',cat:'japanese'},
  {id:'3f64a978-84b0-4760-9f95-94e4c5b84cef',title:'越南牛肉河粉',cat:'vietnamese'},
  {id:'f7416c81-c532-4435-98f4-77d889be8b7e',title:'辣子鸡',cat:'chinese'},
  {id:'90b6fbe4-94e7-4378-91bf-1792190c98b1',title:'避风塘炒蟹',cat:'chinese'},
  {id:'f6c8d688-bd80-4290-ad76-a06a03fbb66a',title:'酸菜鱼',cat:'chinese'},
  {id:'904072cf-f520-49ad-8c41-484c5a87246a',title:'酸辣土豆丝',cat:'chinese'},
  {id:'dfe14298-d087-4a33-aca4-089244fe1f1c',title:'醋溜白菜',cat:'chinese'},
  {id:'e009b9db-4abb-4bd7-ab71-447785f5c987',title:'韩式拌饭',cat:'korean'},
  {id:'e4ca8023-0c88-4696-916d-e95a862e03ad',title:'韩式拌饭',cat:'korean'},
  {id:'2299444c-376e-4555-ae74-c2e461a1af14',title:'韩式泡菜炒五花肉',cat:'korean'},
  {id:'f9db704a-5938-4712-982e-ee7565af9d49',title:'韩式泡菜锅',cat:'korean'},
  {id:'056481bb-0fd3-4aa3-8a27-856914a23ede',title:'韩式炒年糕',cat:'korean'},
  {id:'ecb7926c-4d91-40ce-98ca-ac8ddaa8c609',title:'韩式烤五花肉',cat:'korean'},
  {id:'ad300756-3332-4fdd-97c3-4a5d9f8c653f',title:'鱼头豆腐汤',cat:'chinese'},
  {id:'3fa05f8f-eda6-4957-98df-3b32296b1684',title:'鱼香肉丝',cat:'chinese'},
  {id:'e1896402-5804-4889-a48d-66772ef7c80a',title:'鱼香肉丝',cat:'chinese'},
  {id:'466a81cd-8a5b-49c5-95bc-cc8f3862f6b5',title:'麻婆豆腐',cat:'chinese'},
  {id:'0e5168a1-aa87-458b-aac6-9081ada87e5c',title:'麻酱凉面',cat:'chinese'}
];

const seen = {};
let sql = '-- Fill story and culturalBackground for all 81 recipes\n';
sql += 'START TRANSACTION;\n\n';
let warnings = 0;

for (const r of recipes) {
  const mapKey = r.title + '|' + r.cat;
  seen[mapKey] = (seen[mapKey] || 0) + 1;
  const idx = Math.min(seen[mapKey] - 1, (entryMap[mapKey] || []).length - 1);
  const entry = entryMap[mapKey] ? entryMap[mapKey][idx] : null;

  if (!entry) {
    console.log('WARNING: No content for', r.title, r.cat, '(occ', seen[mapKey] + ')');
    warnings++;
    continue;
  }

  const s = entry.story.replace(/"/g, '\\"').replace(/\n/g, ' ');
  const c = entry.cb.replace(/"/g, '\\"').replace(/\n/g, ' ');
  sql += 'UPDATE recipes SET story = "' + s + '", culturalBackground = "' + c + '" WHERE id = "' + r.id + '";\n';
}

sql += '\nCOMMIT;\n';
fs.writeFileSync('backend/scripts/update_story_cb.sql', sql, 'utf8');
console.log('Generated SQL with', recipes.length, 'recipes,', warnings, 'warnings');