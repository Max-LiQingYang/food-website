# PRD：食谱内容质量标准 v1.0

> **方向**：方向 C — 内容质量提升  
> **项目**：美食食谱网站（food-website）  
> **当前数据量**：94 道食谱  
> **创建日期**：2026-06-09  

---

## 目录

1. [内容质量检查清单](#1-内容质量检查清单)
2. [内容优化方案](#2-内容优化方案)
3. [数据一致性验证清单](#3-数据一致性验证清单)
4. [附录：字段规范速查表](#附录字段规范速查表)

---

## 1. 内容质量检查清单

每道食谱满分 **100 分**，分 8 个维度逐项打分。

### 1.1 必填字段完整性（10 分）

| 检查项 | 规则 | 分值 |
|--------|------|------|
| title | 非空，长度 ≥ 2 | 3 分 |
| description | 非空 | 3 分 |
| ingredients | 非空 JSON 数组，长度 ≥ 1 | 2 分 |
| steps | 非空 JSON 数组，长度 ≥ 1 | 2 分 |

**扣分细则**：
- title 为空或长度 < 2 → 扣 3 分
- description 为 NULL 或空字符串 → 扣 3 分
- ingredients 为 NULL 或空数组 → 扣 2 分
- steps 为 NULL 或空数组 → 扣 2 分

### 1.2 图片质量（15 分）

| 检查项 | 规则 | 分值 |
|--------|------|------|
| 图片存在 | coverImage 非空 | 5 分 |
| 图片有效 | URL 格式合法（http/https 开头） | 5 分 |
| 图片高清 | 非 placehold.co 占位图 | 5 分 |

**扣分细则**：
- coverImage 为 NULL 或空字符串 → 扣 5 分
- coverImage 不以 `http://` 或 `https://` 开头 → 扣 5 分
- coverImage 包含 `placehold.co` → 扣 5 分（标记为占位图，需替换）

### 1.3 描述吸引力（15 分）

| 检查项 | 规则 | 分值 |
|--------|------|------|
| 描述长度 | 字数 ≥ 50（中文字符计数） | 5 分 |
| 描述具体 | 包含具体食材/口味/做法关键词 | 5 分 |
| 描述诱人 | 有感官描述（香/酥/嫩/鲜等） | 5 分 |

**扣分细则**：
- 字数 < 50 → 扣 5 分
- 字数 < 20 → 再扣 5 分（即"描述具体"也扣）
- 无感官词汇（如：香、酥、嫩、鲜、滑、脆、软、糯、浓、醇、Q弹、入口即化、外酥里嫩等）→ 扣 5 分

**感官词库**（用于检测）：
```
香、酥、嫩、鲜、滑、脆、软、糯、浓、醇、弹、爽、辣、麻、甜、酸、咸、苦、甘、
Q弹、入口即化、外酥里嫩、鲜嫩多汁、肥而不腻、麻辣鲜香、酸甜可口、回味无穷、
唇齿留香、色香味俱全、垂涎欲滴、食指大动、鲜美无比、浓郁醇厚、清爽可口
```

### 1.4 食材列表清晰度（15 分）

| 检查项 | 规则 | 分值 |
|--------|------|------|
| 食材数量 | ingredients 数组长度 ≥ 3 | 5 分 |
| 食材分组 | 有分组结构（如主料/辅料/调料） | 5 分 |
| 数量准确 | 每条食材有 name + amount + unit | 5 分 |

**扣分细则**：
- ingredients 数组长度 < 3 → 扣 5 分
- 无分组结构（所有食材在同一层级，无 category/group 字段）→ 扣 5 分
- 超过 30% 的食材缺少 amount 或 unit → 扣 5 分

**食材分组检测规则**：
- 检查 ingredients 数组中的元素是否有 `category`、`group`、`section` 字段
- 或者检查是否有"主料"、"辅料"、"调料"、"腌料"等分组标记

### 1.5 步骤详细度（15 分）

| 检查项 | 规则 | 分值 |
|--------|------|------|
| 步骤数量 | steps 数组长度 ≥ 3 | 5 分 |
| 步骤描述长度 | 每步平均字数 ≥ 15 | 5 分 |
| 步骤具体性 | 包含温度/时间/火候等量化信息 | 5 分 |

**扣分细则**：
- steps 数组长度 < 3 → 扣 5 分
- 平均每步字数 < 15 → 扣 5 分
- 所有步骤中均无量化信息（温度数字、时间数字、火候描述如"大火/中火/小火"）→ 扣 5 分

**量化关键词**（用于检测）：
```
分钟、小时、秒、度、℃、°C、克、g、毫升、ml、大火、中火、小火、文火、猛火、
预热、°F、华氏、汤匙、茶匙、适量（仅当与数字搭配时）
```

### 1.6 烹饪技巧/tips（10 分）

| 检查项 | 规则 | 分值 |
|--------|------|------|
| tips 存在 | tips 字段非空 | 5 分 |
| tips 实用 | tips 字数 ≥ 20，内容具体 | 5 分 |

**扣分细则**：
- tips 为 NULL 或空字符串 → 扣 10 分（整项不得分）
- tips 字数 < 20 → 扣 5 分（只给"存在"分）

### 1.7 营养信息完整（10 分）

| 检查项 | 规则 | 分值 |
|--------|------|------|
| 热量 | nutrition.calories 存在且 > 0 | 3 分 |
| 蛋白质 | nutrition.protein 存在 | 2 分 |
| 脂肪 | nutrition.fat 存在 | 2 分 |
| 碳水 | nutrition.carbs 存在 | 2 分 |
| 膳食纤维 | nutrition.fiber 存在 | 1 分 |

**扣分细则**：
- nutrition 为 NULL → 扣 10 分
- nutrition 解析失败（非合法 JSON）→ 扣 10 分
- 逐项缺失按上述分值扣分

### 1.8 分类与季节标签准确（10 分）

| 检查项 | 规则 | 分值 |
|--------|------|------|
| 分类合规 | category 在合法枚举值内 | 4 分 |
| 季节合理 | season 在合法枚举值内 | 3 分 |
| 难度合规 | difficulty 在合法枚举值内 | 3 分 |

**扣分细则**：
- category 不在合法枚举值内（含 NULL）→ 扣 4 分
- season 不在合法枚举值内（含 NULL）→ 扣 3 分
- difficulty 不在合法枚举值内（含 NULL）→ 扣 3 分

---

### 评分等级

| 分数区间 | 等级 | 含义 |
|----------|------|------|
| 90–100 | ⭐⭐⭐⭐⭐ | 优质内容 |
| 75–89 | ⭐⭐⭐⭐ | 良好，少量优化空间 |
| 60–74 | ⭐⭐⭐ | 一般，需重点优化 |
| 40–59 | ⭐⭐ | 较差，多项缺失 |
| 0–39 | ⭐ | 严重缺失，需重做 |

---

## 2. 内容优化方案

按优先级分 4 个阶段执行，每阶段完成后重新评分验证。

### 2.1 P0：补全缺失的必填字段和图片（目标：消除 0 分项）

| 动作 | 说明 | 修复方式 |
|------|------|----------|
| 补全缺失 description | 对 description 为空的食谱，基于 title + ingredients 生成描述 | AI 生成 + 人工审核 |
| 补全缺失 ingredients | 对 ingredients 为空的食谱，基于 title 生成食材列表 | AI 生成 + 人工审核 |
| 补全缺失 steps | 对 steps 为空的食谱，基于 title + ingredients 生成步骤 | AI 生成 + 人工审核 |
| 替换占位图 | 将 placehold.co 图片替换为 Unsplash 真实美食图片 | 脚本批量替换 |
| 补全缺失封面图 | 对 coverImage 为空的食谱，匹配 Unsplash 图片 | 按 title 关键词搜索匹配 |

**验收标准**：所有食谱 title/description/ingredients/steps 非空，coverImage 无 placehold.co。

### 2.2 P1：优化描述和步骤描述（目标：提升吸引力分 + 步骤分）

| 动作 | 说明 | 修复方式 |
|------|------|----------|
| 扩写短描述 | description 字数 < 50 的，扩写至 80–150 字 | AI 扩写 |
| 添加感官描述 | 无感官词汇的 description，注入 2–3 个感官词 | AI 润色 |
| 细化步骤 | 平均每步 < 15 字的，补充温度/时间/火候细节 | AI 补充 |
| 添加量化信息 | 步骤中缺少量化信息的，补充具体数值 | AI 补充 |

**验收标准**：所有食谱 description 字数 ≥ 50，步骤平均字数 ≥ 15。

### 2.3 P2：补充烹饪小贴士（目标：提升 tips 分）

| 动作 | 说明 | 修复方式 |
|------|------|----------|
| 补全缺失 tips | 对 tips 为空的食谱，生成 2–3 条实用小贴士 | AI 生成 |
| 扩写短 tips | tips 字数 < 20 的，扩写至 30–80 字 | AI 扩写 |

**验收标准**：所有食谱 tips 非空且字数 ≥ 20。

### 2.4 P3：补全营养信息（目标：提升营养分）

| 动作 | 说明 | 修复方式 |
|------|------|----------|
| 补全缺失 nutrition | 对 nutrition 为空的食谱，基于食材估算营养 | 食材数据库推算 |
| 补全缺失字段 | nutrition 中缺失个别字段的，补充估算值 | 食材数据库推算 |

**验收标准**：所有食谱 nutrition 包含 calories/protein/fat/carbs。

---

## 3. 数据一致性验证清单

### 3.1 分类标签合规性检查

#### 合法枚举值

**category（主分类）**：
```
chinese, western, japanese, korean, dessert, thai, indian, vietnamese, mexican, mediterranean
```
> 注：`other` 为历史遗留值，不推荐使用但暂时保留兼容。

**difficulty（难度）**：
```
easy, medium, hard
```

**season（季节）**：
```
spring, summer, autumn, winter, all
```

#### 检查规则

| 规则 ID | 规则描述 | 严重级别 |
|---------|----------|----------|
| C-001 | category 必须为合法枚举值，NULL 视为违规 | 🔴 错误 |
| C-002 | category 为 `other` 时，应检查 categoryTags 中 cuisine 维度是否有更精确的分类 | 🟡 警告 |
| C-003 | difficulty 必须为 `easy`/`medium`/`hard` 之一，NULL 视为违规 | 🔴 错误 |
| C-004 | season 必须为 `spring`/`summer`/`autumn`/`winter`/`all` 之一，NULL 视为违规 | 🔴 错误 |
| C-005 | categoryTags 必须为合法 JSON，解析失败视为违规 | 🔴 错误 |
| C-006 | categoryTags 中的 cuisine 值应与 category 一致（如 category=chinese 但 cuisine 含 japanese 则为警告） | 🟡 警告 |

### 3.2 季节标签合理性检查

| 规则 ID | 规则描述 | 严重级别 |
|---------|----------|----------|
| S-001 | 标题含"春"且 season ≠ spring → 警告 | 🟡 警告 |
| S-002 | 标题含"夏"/"凉"/"冰"且 season ≠ summer → 警告 | 🟡 警告 |
| S-003 | 标题含"秋"且 season ≠ autumn → 警告 | 🟡 警告 |
| S-004 | 标题含"冬"/"暖"/"炖"/"煲"且 season ≠ winter → 警告 | 🟡 警告 |
| S-005 | season = all 但标题含明确季节词 → 建议细化 | 🔵 建议 |
| S-006 | 食材中含明确季节性食材但 season 不匹配 → 警告 | 🟡 警告 |

**季节性食材关键词**：
- 春季：春笋、香椿、荠菜、蚕豆、豌豆苗、草莓、樱桃
- 夏季：西瓜、苦瓜、冬瓜、丝瓜、绿豆、荷叶、莲藕
- 秋季：螃蟹、南瓜、板栗、山药、柿子、柚子、梨
- 冬季：羊肉、萝卜、白菜、冬笋、腊肉、火锅

### 3.3 难度标签与实际步骤匹配

| 规则 ID | 规则描述 | 严重级别 |
|---------|----------|----------|
| D-001 | difficulty = easy 但 steps ≥ 8 → 建议升级为 medium | 🟡 警告 |
| D-002 | difficulty = easy 但 cookTime ≥ 60 分钟 → 建议升级为 medium | 🟡 警告 |
| D-003 | difficulty = hard 但 steps ≤ 3 且 cookTime ≤ 30 → 建议降级为 easy | 🟡 警告 |
| D-004 | difficulty = medium 但 steps ≤ 3 且 cookTime ≤ 20 → 建议降级为 easy | 🔵 建议 |
| D-005 | difficulty = medium 但 steps ≥ 10 且 cookTime ≥ 90 → 建议升级为 hard | 🔵 建议 |
| D-006 | 步骤中包含特殊技巧关键词但 difficulty ≠ hard → 建议升级 | 🟡 警告 |

**特殊技巧关键词**（用于 D-006 检测）：
```
发酵、打发、揉面、擀面、裱花、拉糖、翻糖、酥皮、开酥、水浴、隔水、
油温、糖色、勾芡、挂糊、上浆、焯水、过油、收汁、拔丝、挂霜
```

**难度自动推断规则**（用于缺失 difficulty 时自动填充）：
```
steps ≤ 3 且 cookTime ≤ 30 且无特殊技巧 → easy
steps ≥ 8 或 cookTime ≥ 90 或有特殊技巧 → hard
其他 → medium
```

---

## 附录：字段规范速查表

### Recipe 模型字段一览

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | UUID | ✅ | 自动生成 |
| title | STRING | ✅ | 食谱标题 |
| coverImage | STRING | 推荐 | 封面图片 URL（https） |
| author | STRING | 可选 | 作者名 |
| cookTime | INTEGER | 推荐 | 烹饪时长（分钟） |
| description | TEXT | ✅ | 食谱简介（≥50字） |
| category | STRING | ✅ | 主分类（枚举值） |
| ingredients | TEXT(JSON) | ✅ | 食材列表 |
| steps | TEXT(JSON) | ✅ | 烹饪步骤 |
| servings | INTEGER | 可选 | 份数 |
| difficulty | STRING | ✅ | 难度（枚举值） |
| categoryTags | TEXT(JSON) | 推荐 | 多维分类标签 |
| nutrition | TEXT(JSON) | 推荐 | 营养信息 |
| tips | TEXT | 推荐 | 烹饪小贴士（≥20字） |
| story | TEXT | 可选 | 烹饪故事 |
| culturalBackground | TEXT | 可选 | 文化背景 |
| season | STRING | ✅ | 季节标签（枚举值） |
| userId | STRING | 可选 | 创建者 ID |
| isFeatured | BOOLEAN | 可选 | 编辑精选 |
| viewCount | INTEGER | 自动 | 浏览量 |
| favoriteCount | INTEGER | 自动 | 收藏数 |
| commentCount | INTEGER | 自动 | 评论数 |
| createdAt | DATE | 自动 | 创建时间 |
| updatedAt | DATE | 自动 | 更新时间 |

### 合法枚举值汇总

| 字段 | 合法值 |
|------|--------|
| category | chinese, western, japanese, korean, dessert, thai, indian, vietnamese, mexican, mediterranean |
| difficulty | easy, medium, hard |
| season | spring, summer, autumn, winter, all |

### 营养信息 JSON 结构

```json
{
  "calories": 350,    // 热量（千卡），必填
  "protein": 25.5,    // 蛋白质（克），必填
  "fat": 12.3,        // 脂肪（克），必填
  "carbs": 30.8,      // 碳水化合物（克），必填
  "fiber": 3.2,       // 膳食纤维（克），推荐
  "sodium": 580       // 钠（毫克），可选
}
```

### 食材 JSON 结构（推荐分组格式）

```json
[
  { "name": "鸡胸肉", "amount": "300", "unit": "克", "group": "主料" },
  { "name": "青椒", "amount": "2", "unit": "个", "group": "辅料" },
  { "name": "生抽", "amount": "2", "unit": "汤匙", "group": "调料" }
]
```

### 步骤 JSON 结构

```json
[
  { "stepNumber": 1, "content": "鸡胸肉切丁，加料酒、生抽、淀粉腌制15分钟", "image": null },
  { "stepNumber": 2, "content": "热锅凉油，油温六成热时下鸡丁滑炒至变色盛出", "image": null }
]
```
