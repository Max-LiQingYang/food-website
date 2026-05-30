# PRD — 营养数据精度校准与内容质量巡检 (Iter#97)

> **项目**: food-website (React 18 + Express + Sequelize + MariaDB)  
> **当前 Commit**: c56b3c7  
> **需求文件夹**: ~/Projects/food-website/iter97-nutrition-calibration/  
> **文档版本**: v1.0 · 2026-05-30  

---

## 1. 问题陈述

### 1.1 营养数据格式缺陷

当前 94 道食谱的 `nutrition` 字段在 MariaDB 中以 `TEXT` 类型存储 JSON 字符串（如 `'{"calories":85,"protein":2,...}'`），Sequelize 查询后原样返回字符串。导致：

1. **前端需手动 JSON.parse**：`RecipeDetailPage.tsx:198` 有 `typeof recipe.nutrition === 'string' ? JSON.parse(recipe.nutrition) : recipe.nutrition` 防御代码，任何消费方遗漏即显示空白
2. **后端多处重复 parse**：`recipes.js` 的 `computeNutriScore()`、`nutrition.js` 的日志创建、`quality.js` 的评分计算、`admin.js` 的质量报告——每处都需 `if (typeof === 'string') try { JSON.parse } catch {}`
3. **无写入校验**：创建/更新食谱时无 nutrition 格式/范围校验，脏数据可能写入 DB
4. **浮点显示不规范**：当前值全部为整数，但真实营养数据应有精度（如 85.5kcal），显示层无统一格式化

### 1.2 内容质量巡检缺失

现有质量相关能力分散：

- `routes/quality.js`：单食谱质量评分（食材/步骤/营养 3 维度）
- `routes/admin.js`：`/api/admin/quality-report` 已有摘要统计，但**缺少 tips/story/video 等字段覆盖率**
- 前端 `QualityScoreModal.tsx`：展示单食谱质量详情弹窗
- 前端 `DashboardPage.tsx`：作者统计仪表板（浏览/收藏/评论趋势）

**缺口**：
- 无系统性的字段完整性巡检端点（story ✅/tips ❌/video ❌ 等覆盖率）
- 无法一键查看"质量最低的 10 道食谱"及具体缺失字段
- 现有 `/api/admin/quality-report` 不含 tips/story/video/coverImage 覆盖率
- 无前端页面展示内容质量仪表板

---

## 2. 用户故事

### P0 — 营养数据格式化修复

| ID | 用户故事 | 验收条件 |
|----|---------|---------|
| P0-1 | 作为前端开发者，我希望 API 返回的 `nutrition` 是解析后的对象而非 JSON 字符串，这样我不必每次手动 `JSON.parse` | `GET /api/recipes/:id` 返回 `nutrition: {calories: 85, protein: 2, ...}` 而非 `nutrition: "{\"calories\":85,...}"` |
| P0-2 | 作为前端开发者，我希望 NutritionCard 直接接收对象 prop，无需再处理字符串 | `NutritionCard` 组件移除所有 `JSON.parse` 防御代码，直接用 `nutrition.calories` 访问 |
| P0-3 | 作为后端开发者，我希望创建/更新食谱时有 nutrition 校验中间件，拒绝非法格式或超出合理范围的数据 | POST/PUT 食谱时 nutrition 必须是合法 JSON 对象，calories ∈ [5, 3000]，protein/fat/carbs ∈ [0, 500]，fiber ∈ [0, 100]，sodium ∈ [0, 10000] |
| P0-4 | 作为用户，我希望营养数值显示保留 1 位小数（如 85.5g 蛋白质），而非全部取整 | NutritionCard 中 `85` → `85.0`，`12.5` → `12.5`，`0` → `0` |

### P1 — 内容质量仪表板

| ID | 用户故事 | 验收条件 |
|----|---------|---------|
| P1-1 | 作为运营人员，我希望有一个 API 端点返回所有 94 道食谱的字段完整性报告 | `GET /api/admin/content-quality` 返回每道食谱的 8 项字段检查结果 |
| P1-2 | 作为运营人员，我希望看到各字段的覆盖率统计 | 返回：nutrition 覆盖率、tips 覆盖率、story 覆盖率、culturalBackground 覆盖率、coverImage 覆盖率、video 覆盖率、ingredients 覆盖率、steps 覆盖率 |
| P1-3 | 作为运营人员，我希望看到质量最低的 10 道食谱及具体缺失字段 | 返回 bottom 10 列表，每条含 recipeId、title、missingFields 数组、qualityScore |
| P1-4 | 作为运营人员，我希望有一个前端页面展示内容质量仪表板 | 新增 `/content-quality` 页面，展示覆盖率柱状图、底部食谱列表、缺失字段标注 |

### P2 — 数据补齐

| ID | 用户故事 | 验收条件 |
|----|---------|---------|
| P2-1 | 作为用户，我希望每道食谱都有烹饪小贴士（tips） | 缺少 tips 的食谱补齐，tips 覆盖率从当前值提升至 100% |
| P2-2 | 作为用户，我希望营养数据合理准确 | 对营养数据不合理的食谱（如热量偏离同类菜均值 ±2σ）做人工校验与修正 |

---

## 3. 技术方案

### 3.1 P0 — 营养数据格式化修复

#### 3.1.1 后端 API 响应层 JSON 自动解析

**核心思路**：在 Sequelize 查询后、响应返回前，统一将 `nutrition`（及 `ingredients`、`steps`、`categoryTags`）从字符串解析为对象。

**方案 A（推荐）：Sequelize getter 钩子**

在 `models/recipe.js` 的 `nutrition` 字段定义中添加 `get()` 钩子：

```js
nutrition: {
  type: DataTypes.TEXT,
  allowNull: true,
  comment: '营养信息 JSON: {calories, protein, fat, carbs, fiber, sodium}',
  get() {
    const raw = this.getDataValue('nutrition')
    if (!raw) return null
    if (typeof raw === 'object') return raw
    try { return JSON.parse(raw) } catch { return null }
  },
},
```

**优势**：
- 所有通过 `Recipe.findByPk`/`findAll` 查询的结果自动获得解析后的对象
- 无需修改每个路由中的响应处理逻辑
- 不改变 DB 存储格式（仍为 TEXT），不触发 migration
- 对 `ingredients`、`steps`、`categoryTags` 同理添加 getter

**影响面分析**：
- `routes/recipes.js`：移除 `attachContentScore` 中 `typeof item.nutrition === 'string' ? JSON.parse(...)` 防御
- `routes/nutrition.js`：移除 `typeof recipe.nutrition === 'string' ? JSON.parse(...)` 防御
- `routes/quality.js`：移除 `computeNutritionInfo` 中的 `typeof nutrition === 'string'` 分支
- `routes/admin.js`：移除 `computeScore` 中的 `typeof n === 'string' ? JSON.parse(n)` 分支
- 前端 `RecipeDetailPage.tsx`：移除 `typeof recipe.nutrition === 'string' ? JSON.parse(recipe.nutrition)` 防御

#### 3.1.2 NutritionCard 前端简化

当前 `NutritionCard.tsx` 已声明 `nutrition: NutritionData` 类型（对象），前端实际 parse 发生在 `RecipeDetailPage.tsx:198`。

**修改**：
1. `RecipeDetailPage.tsx` 中移除 L197-198 的 JSON.parse 防御
2. L526-527 简化为 `const nutrition: NutritionData | null = (recipe as any).nutrition ?? null`
3. 确保 API 类型定义 `api.ts` 中 `Recipe.nutrition` 类型已是对象（当前 L100 已是 `nutrition?: { calories?: number; ... }`，无需改动）

#### 3.1.3 Nutrition 写入校验中间件

新增 `backend/middleware/validateNutrition.js`：

```js
'use strict'

/**
 * middleware/validateNutrition.js
 * 食谱 nutrition 字段写入校验
 *
 * 校验规则：
 *   1. 如果提供 nutrition，必须是合法 JSON 对象（或可 JSON.parse 的字符串）
 *   2. 数值范围校验
 */

const NUTRITION_RANGES = {
  calories: { min: 5, max: 3000 },    // kcal per serving
  protein:  { min: 0, max: 500 },     // g
  fat:      { min: 0, max: 500 },     // g
  carbs:    { min: 0, max: 500 },     // g
  fiber:    { min: 0, max: 100 },     // g
  sodium:   { min: 0, max: 10000 },   // mg
}

function validateNutrition(req, res, next) {
  const { nutrition } = req.body
  if (nutrition === undefined || nutrition === null) return next()

  let parsed = nutrition
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) } catch {
      return res.status(400).json({ code: 400, message: 'nutrition 必须是合法 JSON', data: null })
    }
  }

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    return res.status(400).json({ code: 400, message: 'nutrition 必须是 JSON 对象', data: null })
  }

  // 数值范围校验
  const errors = []
  for (const [key, range] of Object.entries(NUTRITION_RANGES)) {
    const val = parsed[key]
    if (val !== undefined && val !== null) {
      const num = Number(val)
      if (isNaN(num)) {
        errors.push(`${key} 必须是数字`)
      } else if (num < range.min || num > range.max) {
        errors.push(`${key} 超出合理范围 (${range.min}~${range.max})`)
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ code: 400, message: `nutrition 校验失败: ${errors.join('; ')}`, data: null })
  }

  // 标准化：写入 DB 前转为 JSON 字符串
  req.body.nutrition = JSON.stringify(parsed)
  next()
}

module.exports = validateNutrition
```

**挂载位置**：`routes/recipes.js` 中 `POST /` 和 `PUT /:id` 路由，在 `auth` 中间件之后、处理函数之前。

#### 3.1.4 浮点显示规范化

在 `NutritionCard.tsx` 中修改数值显示逻辑：

```tsx
// 当前：
{value}

// 修改为：
{Number.isInteger(value) ? value : value.toFixed(1)}
```

对于整数（如 85），显示 `85`（不加 `.0`，保持简洁）；对于浮点（如 85.5），显示 `85.5`。

> **设计决策**：不为整数强制添加 `.0`，因为当前 94 道食谱全部是整数，强制 `.0` 会让现有数据看起来不自然。仅在出现真正小数时才显示小数位。

#### 3.1.5 对 ingredients/steps/categoryTags 同步添加 getter

为保持一致性，对 `ingredients`、`steps`、`categoryTags` 同样添加 `get()` 钩子：

```js
ingredients: {
  type: DataTypes.TEXT,
  allowNull: true,
  get() {
    const raw = this.getDataValue('ingredients')
    if (!raw) return null
    if (typeof raw === 'object') return raw
    try { return JSON.parse(raw) } catch { return null }
  },
},
// steps, categoryTags 同理
```

这可以消除后端各路由中散布的 `if (typeof === 'string') JSON.parse()` 防御代码。

---

### 3.2 P1 — 内容质量仪表板

#### 3.2.1 后端内容质量巡检端点

**新增端点**：`GET /api/admin/content-quality`

在现有 `routes/admin.js` 中新增路由：

```js
router.get('/admin/content-quality', async (req, res) => {
  // 1. 查询所有食谱
  // 2. 逐条检查 8 个字段完整性
  // 3. 汇总覆盖率
  // 4. 排序输出 bottom 10
})
```

**字段完整性检查项**（8 项，每项 0/1 分）：

| # | 字段 | 完整性条件 | 权重 |
|---|------|-----------|------|
| 1 | coverImage | 非空且为有效 URL（含 `http`） | 1 |
| 2 | ingredients | 非空且解析后数组长度 ≥ 2 | 1 |
| 3 | steps | 非空且解析后数组长度 ≥ 2 | 1 |
| 4 | nutrition | 非空且解析后含 calories + 至少 2 个其他字段 | 1 |
| 5 | story | 非空且字数 ≥ 20 | 1 |
| 6 | culturalBackground | 非空且字数 ≥ 20 | 1 |
| 7 | tips | 非空且字数 ≥ 10 | 1 |
| 8 | video | VideoEmbed 表中存在关联记录 | 1 |

**响应结构**：

```json
{
  "code": 0,
  "data": {
    "totalRecipes": 94,
    "fieldCoverage": {
      "coverImage":          { "count": 90, "pct": 95.7 },
      "ingredients":         { "count": 94, "pct": 100  },
      "steps":               { "count": 94, "pct": 100  },
      "nutrition":           { "count": 94, "pct": 100  },
      "story":               { "count": 94, "pct": 100  },
      "culturalBackground":  { "count": 94, "pct": 100  },
      "tips":                { "count": 72, "pct": 76.6 },
      "video":               { "count": 56, "pct": 59.6 }
    },
    "overallScore": {
      "avg": 7.2,
      "distribution": {
        "8分": 30, "7分": 25, "6分": 20, "5分": 10, ...
      }
    },
    "bottomRecipes": [
      {
        "id": "uuid",
        "title": "某食谱名",
        "score": 3,
        "missingFields": ["tips", "video", "coverImage"]
      },
      ...
    ],
    "recipes": [
      {
        "id": "uuid",
        "title": "食谱名",
        "score": 8,
        "fieldStatus": {
          "coverImage": true,
          "ingredients": true,
          "steps": true,
          "nutrition": true,
          "story": true,
          "culturalBackground": true,
          "tips": false,
          "video": true
        }
      },
      ...
    ]
  }
}
```

**性能考量**：94 道食谱量级小，全量扫描无性能问题。video 关联查询可批量 `VideoEmbed.findAll({ group: ['recipeId'] })` 避免 N+1。

#### 3.2.2 前端内容质量仪表板页面

**新增页面**：`ContentQualityPage.tsx` + `ContentQualityPage.css`

路由：`/content-quality`（仅管理员可见，或通过 AdminReviewPage 入口访问）

**页面布局**：

```
┌─────────────────────────────────────────┐
│  内容质量巡检                            │
├─────────────────────────────────────────┤
│  [覆盖率总览]                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │封面   │ │食材   │ │步骤   │ │营养   │   │
│  │95.7% │ │100%  │ │100%  │ │100%  │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │故事   │ │文化   │ │贴士   │ │视频   │   │
│  │100%  │ │100%  │ │76.6% │ │59.6% │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│                                         │
│  [质量分布]                              │
│  ■■■■■■■■ 8分(30)                       │
│  ■■■■■■■  7分(25)                       │
│  ■■■■■    6分(20)                       │
│  ...                                    │
│                                         │
│  [质量最低 10 道食谱]                     │
│  #  食谱名        得分  缺失字段          │
│  1  某食谱        3    tips,video,cover  │
│  2  ...          4    video             │
│  ...                                    │
└─────────────────────────────────────────┘
```

**CSS 约束**：
- 所有新样式需包含 `body.dark` 暗色覆写
- 响应式布局（移动端卡片竖排，桌面端 4 列网格）
- 复用现有 CSS 变量（`--color-primary`、`--color-text-muted` 等）

**路由注册**：在 `App.tsx` 中添加：
```tsx
<Route path="/content-quality" element={<ContentQualityPage />} />
```

在 `AdminReviewPage.tsx` 或管理员入口中添加导航链接。

---

### 3.3 P2 — 数据补齐

#### 3.3.1 Tips 补齐

**方案**：编写一次性 seed 脚本 `backend/seed-97-tips.js`

1. 查询所有 `tips IS NULL OR tips = ''` 的食谱
2. 基于食谱的 category + ingredients + steps，生成合理的烹饪小贴士
3. 考虑使用 LLM 辅助生成（需人工审核后入库），或从预置 tips 模板库匹配
4. 输出 SQL UPDATE 语句到文件，人工审核后执行

**Tips 模板示例**（按分类）：
- 川菜类：「腌制肉类时加入少许料酒和淀粉，可使肉质更嫩滑。」
- 汤品类：「煲汤时先用大火煮开再转小火慢炖，汤色更清澈。」
- 甜品类：「打发蛋白时容器需无油无水，否则影响蓬松度。」

#### 3.3.2 营养数据合理性修正

**方案**：统计脚本 + 人工修正

1. 按 category 分组统计各营养字段的均值和标准差
2. 标记偏离均值 ±2σ 的食谱
3. 生成修正建议报告（CSV/Markdown）
4. 人工审核后更新

**合理范围参考**（单份，由当前数据统计得出）：

| 分类 | calories 均值 | calories 范围 | protein 均值 |
|------|-------------|--------------|-------------|
| chinese | ~200 | 50~600 | ~15g |
| dessert | ~300 | 100~800 | ~5g |
| western | ~350 | 100~700 | ~20g |

> **注意**：P2 为数据运营任务，非纯技术实现。tips 补齐和营养修正均需内容审核，不纳入自动化 CI。

---

## 4. 数据库变更

**无 DDL 变更**。nutrition 字段保持 TEXT 类型，通过 Sequelize getter 层做运行时解析。

若未来需优化查询性能，可考虑：
- 添加 `nutrition_calories` 等物化列（ALTER TABLE ADD COLUMN）
- 但当前 94 道食谱量级无需此优化

---

## 5. 文件变更清单

### 后端

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `models/recipe.js` | 修改 | 为 nutrition/ingredients/steps/categoryTags 添加 `get()` 钩子 |
| `middleware/validateNutrition.js` | **新增** | nutrition 写入校验中间件 |
| `routes/recipes.js` | 修改 | 挂载 validateNutrition 中间件；移除 attachContentScore 中的 JSON.parse 防御 |
| `routes/nutrition.js` | 修改 | 移除所有 `typeof === 'string' ? JSON.parse()` 防御 |
| `routes/quality.js` | 修改 | 移除 computeNutritionInfo 中的 parse 防御 |
| `routes/admin.js` | 修改 | 移除 computeScore 中的 parse 防御；新增 `/admin/content-quality` 端点 |
| `tests/nutrition_calibration.test.js` | **新增** | P0 单元测试 |
| `tests/content_quality.test.js` | **新增** | P1 单元测试 |
| `seed-97-tips.js` | **新增** | P2 tips 补齐脚本 |

### 前端

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `components/NutritionCard.tsx` | 修改 | 浮点显示规范化（整数不加 `.0`，小数保留 1 位） |
| `pages/RecipeDetailPage.tsx` | 修改 | 移除 nutrition JSON.parse 防御（L197-198, L526-527） |
| `pages/ContentQualityPage.tsx` | **新增** | 内容质量仪表板页面 |
| `pages/ContentQualityPage.css` | **新增** | 含 body.dark 暗色覆写 |
| `api.ts` | 修改 | 新增 `getContentQualityReport()` API 调用 |
| `App.tsx` | 修改 | 注册 `/content-quality` 路由 |

---

## 6. 测试计划

### 6.1 P0 单元测试 (`tests/nutrition_calibration.test.js`)

```js
describe('Iter#97 P0: Nutrition Calibration', () => {
  // 1. Model getter: nutrition 自动解析
  test('Recipe getter 将 nutrition TEXT 字符串解析为对象', async () => { ... })
  test('Recipe getter 对 null/空 nutrition 返回 null', async () => { ... })
  test('Recipe getter 对已解析的对象直接返回', async () => { ... })

  // 2. 写入校验中间件
  test('validateNutrition 拒绝非 JSON 字符串', async () => { ... })
  test('validateNutrition 拒绝 calories > 3000', async () => { ... })
  test('validateNutrition 拒绝 calories < 5', async () => { ... })
  test('validateNutrition 通过合法 nutrition 数据', async () => { ... })
  test('validateNutrition 允许 nutrition 为空（optional 字段）', async () => { ... })
  test('validateNutrition 将对象标准化为 JSON 字符串存入 DB', async () => { ... })

  // 3. API 响应验证
  test('GET /api/recipes/:id 返回 nutrition 为对象', async () => { ... })
  test('GET /api/recipes 列表中 nutrition 为对象', async () => { ... })
})
```

### 6.2 P1 单元测试 (`tests/content_quality.test.js`)

```js
describe('Iter#97 P1: Content Quality Dashboard', () => {
  // 1. 端点可达
  test('GET /api/admin/content-quality 返回 200', async () => { ... })

  // 2. 字段覆盖率计算
  test('fieldCoverage 包含 8 个字段', async () => { ... })
  test('fieldCoverage 各字段 count + pct 合理', async () => { ... })

  // 3. 底部食谱排序
  test('bottomRecipes 最多 10 条且按 score 升序', async () => { ... })
  test('bottomRecipes 每条含 missingFields', async () => { ... })

  // 4. Video 关联检查
  test('video 字段正确反映 VideoEmbed 关联', async () => { ... })
})
```

### 6.3 构建 0 Warnings

```bash
cd frontend && npx tsc --noEmit   # TypeScript 类型检查 0 errors
cd frontend && npm run build       # Vite 构建 0 warnings
```

---

## 7. 验收标准

| # | 验收项 | 优先级 | 验证方式 |
|---|--------|--------|---------|
| 1 | `GET /api/recipes/:id` 返回的 `nutrition` 是对象（`typeof === 'object'`）而非字符串 | P0 | curl + 断言 |
| 2 | `NutritionCard` 在食谱详情页正常渲染，无 `JSON.parse` 相关错误 | P0 | 浏览器访问食谱详情页 |
| 3 | `POST /api/recipes` 传入非法 nutrition 返回 400 | P0 | 测试用例 |
| 4 | `POST /api/recipes` 传入超范围 nutrition 返回 400 | P0 | 测试用例 |
| 5 | 营养数值浮点显示：整数显示 `85`，小数显示 `85.5` | P0 | 浏览器验证 |
| 6 | `GET /api/admin/content-quality` 返回 94 道食谱的完整质量指标 | P1 | curl + 断言 |
| 7 | 内容质量仪表板页面 `/content-quality` 正常展示 | P1 | 浏览器访问 |
| 8 | 覆盖率统计含 8 个字段（coverImage/ingredients/steps/nutrition/story/culturalBackground/tips/video） | P1 | API 响应验证 |
| 9 | 质量最低 10 道食谱列表含 missingFields | P1 | API 响应验证 |
| 10 | 所有测试通过 | P0 | `npm test` |
| 11 | 前端构建 0 warnings | P0 | `npm run build` |
| 12 | 所有新 CSS 包含 `body.dark` 暗色覆写 | P1 | CSS 代码审查 |

---

## 8. 不做的范围（Out of Scope）

| 不做 | 原因 |
|------|------|
| 将 DB 中 nutrition 列从 TEXT 改为 JSON 类型 | 需 ALTER TABLE 且 MariaDB JSON 类型与 Sequelize 兼容性有坑；getter 方案无侵入 |
| 自动化 LLM 生成 tips 并直接入库 | 需人工审核，不应自动写入生产 DB |
| 营养数据可视化对比页面（多食谱并列） | 超出本迭代范围，属于推荐/对比功能增强 |
| 营养数据实时计算（根据食材自动推算） | 需接入食物成分数据库，复杂度高 |
| 前端 NutritionDashboard 功能增强 | 现有页面功能完整，本迭代仅修复数据格式层 |
| 全局 JSON 字段序列化中间件（通用化 ingredients/steps 等） | 当前仅 nutrition 有明确的格式问题，按需处理 |
| 迁移现有 94 条 nutrition 数据为更高精度浮点 | 当前数据均为合理整数，无浮点需求；仅规范显示层 |
| 内容质量巡检定时任务 /cron | 本迭代只做手动触发的端点，不做定时自动巡检 |

---

## 9. 实现顺序建议

```
Phase 1 (P0, ~4h)
├── 1. models/recipe.js: 添加 get() 钩子
├── 2. middleware/validateNutrition.js: 新增校验中间件
├── 3. routes/recipes.js: 挂载中间件 + 移除 JSON.parse 防御
├── 4. routes/nutrition.js, quality.js, admin.js: 移除 JSON.parse 防御
├── 5. NutritionCard.tsx: 浮点显示规范化
├── 6. RecipeDetailPage.tsx: 移除 JSON.parse 防御
└── 7. tests/nutrition_calibration.test.js: P0 测试

Phase 2 (P1, ~6h)
├── 8. routes/admin.js: 新增 /admin/content-quality 端点
├── 9. api.ts: 新增 getContentQualityReport()
├── 10. ContentQualityPage.tsx + .css: 新增仪表板页面
├── 11. App.tsx: 注册路由
└── 12. tests/content_quality.test.js: P1 测试

Phase 3 (P2, ~3h, 数据运营)
├── 13. seed-97-tips.js: 生成 tips 补齐脚本
├── 14. 营养数据异常检测脚本
└── 15. 人工审核 + 入库
```

---

## 10. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| Sequelize getter 在 `raw: true` 查询时不触发 | 部分路由用 `raw: true` 跳过 getter | 在这些路由中手动调用 getter 或改用 `r.toJSON()` 后取值；实测 admin.js 已用 `raw: true`，需手动 parse |
| 现有测试中 Recipe 模型用 JSON 类型（非 TEXT） | 测试 SQLite 内存 DB 中 nutrition 为 JSON，getter 行为不同 | 测试中同步使用 TEXT 类型定义，或测试用例覆盖两种场景 |
| validateNutrition 中间件将 nutrition 标准化为字符串 | 与 getter 解析配合：写入→字符串，读出→对象 | 逻辑自洽，但需确保中间件在 Sequelize create/update 之前执行 |
| VideoEmbed 关联查询增加 content-quality 端点延迟 | 94 道食谱 + 批量查询，延迟可忽略 | 若未来食谱数增长，可缓存结果或改为分页 |
| P2 tips 生成质量参差不齐 | 运营内容质量 | 人工审核环节，不入库不生效 |

---

## 11. 附录：关键代码位置索引

| 位置 | 说明 |
|------|------|
| `backend/models/recipe.js:50-54` | nutrition 字段定义（TEXT 类型） |
| `frontend/src/pages/RecipeDetailPage.tsx:197-198` | 前端 JSON.parse 防御 |
| `frontend/src/pages/RecipeDetailPage.tsx:526-527` | 第二处 nutrition 提取 |
| `frontend/src/components/NutritionCard.tsx` | 营养卡片组件（接收 NutritionData 对象） |
| `backend/routes/recipes.js` → `attachContentScore()` | 后端 JSON.parse 防御（computeNutriScore） |
| `backend/routes/nutrition.js:50-53` | 营养日志创建时 parse |
| `backend/routes/quality.js:66-69` | 质量评分 parse 防御 |
| `backend/routes/admin.js:48-50` | 管理后台 parse 防御 |
| `backend/routes/admin.js:82` | 现有 `/admin/quality-report` 端点 |
| `frontend/src/api.ts:100` | Recipe 类型中 nutrition 定义（已是对象类型） |
