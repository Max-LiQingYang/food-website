# Iter#100 — 内容质量：食谱评分覆盖率补齐与内容质量巡检

## 1. 现状评估

### 生产 DB（MariaDB）当前状态
| 指标 | 数据 |
|------|------|
| 食谱总数 | 94（UUID 主键） |
| 无评分食谱 | **0 道** ✅（100%覆盖） |
| 评分分布 | ~1分: 1道, ~2分: 10道, ~3分: 33道, ~4分: 50道 |
| story 覆盖率 | 94/94 ✅ |
| culturalBackground 覆盖率 | 94/94 ✅ |
| nutrition 完整性 | 94/94 ✅ |
| categoryTags 完整性 | 94/94 ✅ |
| steps 完整性 | 94/94 ✅ |
| 视频覆盖率 | 94/94 ✅ |

**结论：生产 DB 的数据工作已在上一轮 Iter#100 执行中提前完成，当前无数据异常。核心遗留问题是 seed.js 种子数据不同步。**

### Seed.js 当前状态
| 项目 | 数量 |
|------|------|
| 食谱对象 | 34 道 |
| videoEmbeds 条目 | 170 条（≈85 个食谱的视频对） |
| 挑战赛定义 | 5 条 |
| 用户定义 | admin(管理员) + 普通用户 |
| 评分生成逻辑 | 已实现（随机生成，按热度分级） |

### 核心差距
- **Seed.js 仅 34 道食谱 vs 生产 DB 94 道**：需补齐 60 道食谱的完整数据
- Seed.js 的 videoEmbeds 条目与生产 DB 视频数据不一致
- 评分生成逻辑在 seed.js 中已存在（基于 Recipe.findAll + 热度分级），但运行时是基于 Recipe 模型动态生成

---

## 2. 核心任务

### 任务 A：Seed.js 同步（主要工作量）

**方案：从生产 DB 导出全部 94 道食谱数据，重新生成 seed.js 的 recipes 数组**

1. **数据导出脚本**
   - 编写 `backend/scripts/export-recipes.js`：从生产 DB 查询全部 94 道食谱的完整字段
   - 输出格式：JSON 数组，每个元素包含食谱所有字段
   - 关键字段：id, title, description, category, season, cookTime, servings, difficulty, coverImage, author, 
   - JSON 字段：ingredients, steps, nutrition, categoryTags 需保持 JSON 格式
   - 数值字段：avgRating, ratingCount, viewCount, favoriteCount
   - 文本字段：story, culturalBackground, tips

2. **seed.js 重构**
   - 保留现有 seed.js 的整体结构（const recipes, const videoEmbeds, const challenges, seed() 函数）
   - 使用导出数据替换 `const recipes = [...]` 数组
   - 保持 UUID 自动生成（uuidv4()）而非固定 UUID
   - 保持 JSON.stringify 格式
   - 保留评分生成逻辑和用户创建逻辑

3. **质量要求**
   - 每个食谱对象包含完整字段（27+ 个字段）
   - JSON.stringify 对 ingredients/steps/nutrition/categoryTags 字段正确使用
   - seed.js 运行时无语法错误（node --check）

### 任务 B：内容质量巡检脚本

编写 `backend/scripts/quality-check.js`，对生产 DB 执行以下检查：

1. **食谱完整性**：检查所有 94 道食谱是否都有 story, culturalBackground
2. **营养数据**：检查 nutrition JSON 是否有效（calories, protein, fat, carbs 字段齐全）
3. **分类标签**：检查 categoryTags 数组不为空，包含 5 个维度（mealType, cuisine, dietary, cookingMethod, seasoning）
4. **步骤完整性**：检查 steps 数组长度 ≥ 3
5. **食材完整性**：检查 ingredients 数组长度 ≥ 3
6. **视频覆盖**：检查 video_embeds 表覆盖情况
7. **异常检测**：检测 avgRating、viewCount 等数值异常

**输出**：控制台打印健康报告，exit code 0=正常，1=发现异常

### 任务 C：构建验证 + 部署闭环

1. ✅ `npm run build` 0 warnings 0 errors (前端)
2. ✅ seed.js 语法验证（node --check backend/seeds/seed.js）
3. ✅ quality-check.js 在生产 DB 验证
4. ✅ Git commit + push （message: "iter#100: seed.js 同步 34→94 + 质量巡检脚本"）
5. ✅ 服务器部署（docker cp 前/后端）
6. ✅ API 验证（首页、详情 200）

---

## 3. 技术方案

### Seed.js 数据导出流程
```
生产 DB (MariaDB) → export-recipes.js → JSON → 模板填充 → 新的 seed.js
```

### 字段格式规范
- `ingredients`: `JSON.stringify([{name, amount, unit}, ...])`
- `steps`: `JSON.stringify([{stepNumber, content}, ...])` 或 `JSON.stringify(["步骤1", ...])`（兼容现有格式）
- `nutrition`: `JSON.stringify({calories, protein, fat, carbs})`
- `categoryTags`: `JSON.stringify(["chinese", ...])`
- `season`: 字符串（"all", "summer", "winter", "spring", "autumn"）

### videoEmbeds 结构
保持现有格式：`{title: "食谱名", videos: [{title, url, platform, duration}]}`
每条食谱对应 1-2 个视频条目

### 评分生成策略（已有）
seed.js 中已实现的逻辑：基于 Recipe.findAll 后的热度分级排序，hot(30%)/normal(40%)/cold(30%) 三档生成随机评分

---

## 4. 验收标准

| # | 检查项 | 预期 |
|---|--------|------|
| 1 | seed.js recipes 数组长度 | 94 |
| 2 | seed.js 无 JavaScript 语法错误 | node --check 通过 |
| 3 | npm run build | 0 warnings, 0 errors |
| 4 | 首页 HTTP 200 | curl http://39.103.68.205/ 返回 200 |
| 5 | API 详情端点 | curl /api/recipes/xxx 返回 200 |
| 6 | Git commit 推送 | 成功推送至 origin/main |
| 7 | iteration-tracker.md 更新 | Iter#100 标记 ✅ |
| 8 | iteration-lessons.md 更新 | 关键陷阱记录 |

---

## 5. 关键风险与缓解

| 风险 | 缓解 |
|------|------|
| seed.js JSON.stringify 格式错误 | 使用 export 脚本自动生成，避免手工编写 |
| 大数据量 seed.js 运行慢 | 使用 bulkCreate + 事务批量处理 |
| 生产 DB 连接信息硬编码 | 使用环境变量（DB_HOST/DB_USER/DB_PASS） |
| seed.js 覆盖现有数据 | seed.js 需包含 truncate + re-insert 逻辑 |
