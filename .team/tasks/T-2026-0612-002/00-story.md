# T-2026-0612-002: ComparePage 集成 4 维评分可视化

> **Type:** Story  
> **Status:** Draft  
> **Parent:** #134（4 维评分已上线）  
> **Created:** 2026-06-12  
> **Author:** product (subagent)

---

## 1. 用户故事

### US-1: 做菜决策者 — 4 维雷达图对比

> **As a** 在「做哪道好」之间犹豫的用户  
> **I want** 在对比页面看到 2-3 道菜的 4 维评分雷达图（口味/难度/卖相/性价比）  
> **So that** 我能一眼看出每道菜在各维度的强弱，辅助决策。

### US-2: 数据驱动型用户 — 数值化维度对比表

> **As a** 喜欢看具体数字的用户  
> **I want** 对比表中新增 4 维平均分和评分人数  
> **So that** 我能结合雷达图 + 精确数值做出理性判断。

### US-3: 移动端用户 — 响应式对比体验

> **As a** 在手机上浏览的用户  
> **I want** 4 维评分对比在窄屏下也能清晰展示  
> **So that** 我在任何设备上都能做决策。

---

## 2. 验收标准（Acceptance Criteria）

### 后端

- **AC-1** `POST /api/recipes/compare` 返回的 `data.recipes[]` 中每个食谱对象新增 `dimensionAverages` 字段，结构为 `{ taste: { average: number, count: number }, difficulty: { average: number, count: number }, presentation: { average: number, count: number }, value: { average: number, count: number } }`；当某维度无评分数据时 `average=0, count=0`。
- **AC-2** 后端不新增数据库查询轮次：复用 `Comment` 模型已有的 `taste/difficulty/presentation/value` 列，在 compare 路由内对返回的 recipeIds 批量聚合（单次 `findAll` + 内存计算），不引入 N+1。
- **AC-3** 后端 compare 测试 `backend/tests/compare.test.js` 覆盖新增字段：至少 1 条 case 验证 `dimensionAverages` 存在且结构正确，1 条 case 验证无评分时返回 `{ average: 0, count: 0 }`。

### 前端

- **AC-4** ComparePage 在对比结果区域新增「4 维评分对比」section（位于现有对比表格上方或独立卡片），包含：
  - 每道菜一个独立雷达图（复用 `DimensionRadar` 组件，`multiColor=true`），2 道菜并排、3 道菜三列网格。
  - 雷达图下方附维度数值摘要（平均分 + 评分人数），2-3 列布局。
- **AC-5** 对比表格 `dimensions` 数组中新增 4 行（口味/难度/卖相/性价比），每行显示各食谱对应维度的 `average` 值（格式 `X.X 分 (N人评)`），替代或补充现有单一 `avgRating` 行。
- **AC-6** 暗色模式（`body.dark`）下雷达图颜色自动切换（复用 `DimensionRadar` 内置 dark 检测），4 维对比卡片和表格行遵循现有 `body.dark .cmp-*` 样式体系。
- **AC-7** 移动端（≤600px）雷达图网格从 2-3 列降为单列堆叠，雷达图 `size="sm"`，确保不溢出。
- **AC-8** 前端测试 `ComparePage.test.tsx` 扩展：mock 返回含 `dimensionAverages` 的对比结果，验证雷达图区域渲染（至少验证维度标签「口味」「难度」「卖相」「性价比」出现在 DOM 中）。

---

## 3. 风险 / 边界

| # | 风险 | 缓解 |
|---|------|------|
| R1 | Comment 表 4 维字段可能大量为 NULL（历史评论未填维度分） | AC-2 已定义：`average=0, count=0` 作为无数据兜底；前端 DimensionRadar 内置空态（`暂无维度评分数据`） |
| R2 | 3 道菜对比时雷达图并排可能在小屏溢出 | AC-7 已定义移动端单列降级；雷达图 `size="sm"`（160px）确保安全 |
| R3 | `DimensionRadar` 组件目前仅用于个人评分历史（单用户视角），首次用于多食谱对比场景 | 该组件已支持 `multiColor` 模式 + 自定义 `tooltipFormatter`，接口通用；不涉及组件内部改动 |
| R4 | compare 路由目前使用 `Recipe.findAll` 的 `attributes` 白名单，不包含 Comment 关联 | 需新增一次 `Comment.findAll({ where: { recipeId: recipeIds }, attributes: [...] })` 批量查询，内存聚合 |

---

## 4. 涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/routes/compare.js` | **修改** | 新增 Comment 批量查询 + dimensionAverages 聚合逻辑，扩展返回字段 |
| `backend/tests/compare.test.js` | **修改** | 新增 dimensionAverages 相关测试用例 |
| `frontend/src/api.ts` | **修改** | `CompareRecipe` 接口新增 `dimensionAverages` 字段 |
| `frontend/src/pages/ComparePage.tsx` | **修改** | 新增 4 维雷达图 section + 表格维度行 |
| `frontend/src/pages/ComparePage.css` | **修改** | 新增 `.cmp-radar-section` / `.cmp-radar-grid` / `.cmp-dim-summary` 等样式 + dark mode + responsive |
| `frontend/src/pages/ComparePage.test.tsx` | **修改** | mock 数据新增 dimensionAverages，验证雷达图渲染 |
| `frontend/src/components/DimensionRadar.tsx` | **复用** | 不改动，直接 `<DimensionRadar data={...} multiColor size="sm\|md" />` |
| `frontend/src/components/RatingHistoryModule/RatingHistoryModule.tsx` | **复用** | 仅引用 `DIMENSION_LABELS` / `DIMENSION_ICONS`（或 ComparePage 内自行定义常量避免耦合） |

---

## 5. 数据契约

### POST /api/recipes/compare

#### Request（不变）

```json
{
  "recipeIds": ["1", "5", "8"]
}
```

#### Response（扩展 `recipes[].dimensionAverages`）

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "recipes": [
      {
        "id": "1",
        "title": "番茄炒蛋",
        "category": "chinese",
        "difficulty": "easy",
        "servings": 2,
        "cookTime": "15分钟",
        "coverImage": "/uploads/abc.jpg",
        "nutrition": { "calories": { "value": 200, "unit": "kcal" } },
        "ingredients": [{ "name": "番茄", "amount": 2, "unit": "个" }],
        "steps": [{ "stepNumber": 1, "content": "切番茄" }],
        "season": "all",
        "avgRating": 4.5,
        "favoriteCount": 12,
        "commentCount": 5,
        "viewCount": 200,
        "qualityScore": 85,
        "qualityLabel": "热门",
        "dimensionAverages": {
          "taste":    { "average": 4.2, "count": 5 },
          "difficulty": { "average": 2.8, "count": 5 },
          "presentation": { "average": 3.5, "count": 4 },
          "value":    { "average": 4.0, "count": 3 }
        }
      }
    ],
    "summary": { /* 不变 */ }
  }
}
```

#### dimensionAverages Schema

```typescript
interface DimensionAverage {
  average: number   // 0-5，保留 1 位小数；无数据时为 0
  count: number     // 评分人数；无数据时为 0
}

interface DimensionAverages {
  taste: DimensionAverage
  difficulty: DimensionAverage
  presentation: DimensionAverage
  value: DimensionAverage
}
```

> **规则：** 当某维度所有评论该字段均为 NULL 时，返回 `{ average: 0, count: 0 }`（非 null/undefined），前端据此判断空态。

---

## 6. 复用清单

| 组件/工具 | 路径 | 复用方式 |
|-----------|------|----------|
| `DimensionRadar` | `frontend/src/components/DimensionRadar.tsx` | 直接 `<DimensionRadar data={r.dimensionAverages} multiColor size="sm" />` — 已支持多色模式、暗色自动切换、空态兜底 |
| `DIMENSION_LABELS` | `frontend/src/components/RatingHistoryModule/RatingHistoryModule.tsx` (L32-37) | 引用或 ComparePage 内自维护一份（建议自维护，避免跨模块耦合） |
| `DIMENSION_ICONS` | 同上 (L40-45) | 同上 |
| `RatingDimensionAverages` | `frontend/src/components/RatingHistoryModule/RatingDimensionAverages.tsx` | 可选复用（含 CountUp 动画 + delta 标识），但 compare 场景不需要 delta，建议用简化版 |
| `recharts` (RadarChart 等) | npm 依赖（已安装） | DimensionRadar 已封装，无需直接引用 |
| `apiClient.post('/recipes/compare', ...)` | `frontend/src/api.ts` L884 | 调用方式不变，仅扩展返回类型 |
| `Comment` 模型 | `backend/models/comment.js` | compare 路由内 `Comment.findAll({ where: { recipeId }, attributes: ['recipeId', 'taste', 'difficulty', 'presentation', 'value'] })` |

---

## 7. 质量标准

- [ ] `cd frontend && npm run build` 0 warnings / 0 errors
- [ ] `cd backend && npm test -- compare.test.js` 全部通过（含新增 AC-3 用例）
- [ ] `cd frontend && npm test -- ComparePage.test.tsx` 全部通过（含新增 AC-8 用例）
- [ ] 公网访问 `/compare?ids=1,5` 返回 HTTP 200，响应含 `dimensionAverages`
- [ ] 页面实际渲染 4 维雷达图（至少 2 个食谱各一个雷达图）
- [ ] 暗色模式切换后雷达图颜色跟随变化（grid/tick/fill 颜色适配）
- [ ] 移动端（375px 宽）雷达图单列堆叠，无横向溢出
- [ ] 无评分食谱的维度显示「暂无维度评分数据」空态（DimensionRadar 内置）
