# PRD: 食谱评分维度细化

> **版本**: v1.0  
> **日期**: 2026-06-11  
> **状态**: 待评审  
> **关联迭代**: Iter#?? — 评分多维化

---

## 1. 概述

### 1.1 背景

当前 food-website 的评论系统仅支持单一 `rating` (1-5) 评分维度。用户在对食谱评分时，只能给出一个笼统的综合分，无法表达对口味的偏好、对难度的感知、对卖相的评价或对性价比的判断。

社区反馈显示：同一道菜，有人因为「好吃但太难」打 3 分，有人因为「简单好吃」打 5 分——单一评分把不同维度的感受压缩在一起，既降低了评分的信息量，也影响了社区评分的参考价值。

### 1.2 目标

将评分从**单一维度**扩展为**4个独立维度**：口味 (taste)、难度 (difficulty)、卖相 (presentation)、性价比 (value)。每个维度 1-5 分，可独立填写（可选项），但至少需要一个综合 rating。

### 1.3 范围

| 范围 | 说明 |
|------|------|
| **In Scope** | Comment 模型+4 字段、API 扩展（返回/统计/创建）、前端表单+卡片+统计图 |
| **Out of Scope** | 评分权重算法、AI 评分推荐、历史数据回填、移动端原生改造 |

---

## 2. 用户故事

| ID | 作为... | 我想要... | 以便... |
|----|---------|-----------|---------|
| US-1 | 普通用户 | 在评论时分别为口味/难度/卖相/性价比打分 | 更精准地表达我对这道菜的感受 |
| US-2 | 普通用户 | 在食谱详情页看到 4 维评分的统计平均值 | 快速了解这道菜在各个维度的社区评价 |
| US-3 | 普通用户 | 在评论卡片中看到评论者的 4 维评分 | 理解评论者的评分依据 |
| US-4 | 访客用户 | 通过雷达图/条形图直观对比各维度表现 | 一眼看出这道菜的优劣势 |
| US-5 | 老用户 | 我的历史评论不受影响，4 维显示为「未评」 | 不会因为新功能感觉评论被篡改 |
| US-6 | 开发者 | 4 维字段为 nullable，不需要回填历史数据 | 避免数据迁移风险和业务争议 |

---

## 3. 功能规格

### 3.1 后端 — 数据模型

#### Comment 模型新增字段

在 `backend/models/comment.js` 的 `define()` 返回值中增加：

```javascript
taste: {
  type: DataTypes.INTEGER,
  allowNull: true,
  validate: { min: 1, max: 5 },
  comment: '口味评分(1-5)'
},
difficulty: {
  type: DataTypes.INTEGER,
  allowNull: true,
  validate: { min: 1, max: 5 },
  comment: '难度评分(1-5)'
},
presentation: {
  type: DataTypes.INTEGER,
  allowNull: true,
  validate: { min: 1, max: 5 },
  comment: '卖相评分(1-5)'
},
value: {
  type: DataTypes.INTEGER,
  allowNull: true,
  validate: { min: 1, max: 5 },
  comment: '性价比评分(1-5)'
}
```

**约束**：
- 全部 `allowNull: true` — 老评论和仅填 rating 的新评论均合法
- 每个字段独立 validate min:1 / max:5
- `rating` 字段保持不变 — 作为综合评分继续存在
- 新评论的业务校验：**至少需提供 rating**（在路由层校验，不在模型层）

### 3.2 后端 — API 变更

#### 3.2.1 GET /api/recipes/:id/comments

**现有响应**（comment 对象）：

```json
{
  "id": 1,
  "content": "...",
  "rating": 4,
  "userId": "...",
  "recipeId": "...",
  "createdAt": "...",
  "likesCount": 0,
  "isLiked": false,
  "user": { "id": "...", "username": "...", "nickname": "..." },
  "replies": [],
  "replyCount": 0
}
```

**变更**：每个 comment 对象新增 4 个字段（值为 null 或 1-5）：

```json
{
  // ... 现有字段不变 ...,
  "taste": 5,
  "difficulty": 3,
  "presentation": 4,
  "value": null
}
```

**实现要点**：Sequelize `findAll()` 默认返回所有模型字段，只要模型定义了新字段且不做 `attributes` 白名单限制，就会自动包含。当前路由未做 attributes 限制 → **零代码改动即可扩展响应**。

#### 3.2.2 GET /api/recipes/:id/comments/stats

**现有响应**：

```json
{
  "total": 200,
  "ratedCount": 180,
  "averageRating": 4.2,
  "distribution": { "1": 5, "2": 10, "3": 30, "4": 80, "5": 55 }
}
```

**变更**：新增 `dimensionAverages` 对象，key 为维度名，value 为平均分和计数：

```json
{
  "total": 200,
  "ratedCount": 180,
  "averageRating": 4.2,
  "distribution": { "1": 5, "2": 10, "3": 30, "4": 80, "5": 55 },
  "dimensionAverages": {
    "taste":    { "average": 4.1, "count": 120 },
    "difficulty": { "average": 3.2, "count": 95 },
    "presentation": { "average": 3.8, "count": 88 },
    "value":    { "average": 4.5, "count": 76 }
  }
}
```

**实现要点**：
1. 查询时增加 `attributes` 包含 4 个新维度字段
2. 对每个维度独立计算 AVG，**忽略 NULL**
3. 某维度全部 NULL → `average: 0, count: 0`

#### 3.2.3 POST /api/recipes/:id/comments

**现有请求体**：

```json
{
  "content": "...",
  "rating": 4,
  "imageUrls": ["..."]
}
```

**变更**：`rating` 仍为必填（至少需有综合评分），新增 4 个可选字段：

```json
{
  "content": "...",
  "rating": 4,
  "taste": 5,
  "difficulty": 3,
  "presentation": 4,
  "value": null,
  "imageUrls": ["..."]
}
```

**校验规则**：
- `rating`: 必填，1-5 整数
- `taste/difficulty/presentation/value`: 可选，若提供则 1-5 整数
- `rating` 未提供或无效 → 400
- 4 维提供但无效 → 400

### 3.3 前端 — 组件变更

#### 3.3.1 TypeScript 类型更新

`frontend/src/api.ts` — Comment 接口扩展：

```typescript
export interface Comment {
  // ... 现有字段不变 ...,
  taste: number | null
  difficulty: number | null
  presentation: number | null
  value: number | null
}

export interface DimensionAverage {
  average: number
  count: number
}

export interface CommentStats {
  // ... 现有字段不变 ...,
  dimensionAverages: {
    taste: DimensionAverage
    difficulty: DimensionAverage
    presentation: DimensionAverage
    value: DimensionAverage
  }
}
```

#### 3.3.2 CommentSection 组件

| 区域 | 变更内容 |
|------|----------|
| **评论表单** | 在现有 StarRating（综合评分）下方，增加 4 行维度评分（每行：标签 + StarRating），统一使用 `size="sm"` |
| **评论卡片** | 在现有 rating 展示旁，追加 4 维标签式展示（如 `口味5 · 难度3 · 卖相4`），未填维度不显示 |
| **统计区** | 在现有评分分布柱状图下方，新增 **Recharts 雷达图**，展示 `dimensionAverages` 的 4 维平均分 |
| **loading/空态** | 老评论 4 维为 null，卡片中不显示维度段；统计区若无任何维度数据则不展示雷达图 |

#### 3.3.3 新增组件：DimensionRadar

位置：`frontend/src/components/DimensionRadar.tsx`

```tsx
// 纯展示组件
interface Props {
  data: Record<string, { average: number; count: number }>
}
```

使用 Recharts 的 `<RadarChart>`, `<PolarGrid>`, `<PolarAngleAxis>`, `<Radar>` 渲染。

---

## 4. 验收标准

| # | 验收条件 | 覆盖故事 |
|---|----------|----------|
| AC-1 | 发表评论时，可同时填写综合评分 + 口味/难度/卖相/性价比 4 维评分（均为可选项） | US-1 |
| AC-2 | 仅填写综合评分（不填 4 维）可以成功发表评论 | US-1 |
| AC-3 | 不填综合评分（只填 4 维）被拒绝，返回 400 错误 | US-1 |
| AC-4 | 4 维评分任一超出 1-5 范围被拒绝，返回 400 错误 | US-1 |
| AC-5 | 食谱详情页统计区展示 4 维平均分雷达图（有维度数据时） | US-2, US-4 |
| AC-6 | 若该食谱所有评论均未填写某维度，雷达图该维度不展示或显示「暂无数据」 | US-2 |
| AC-7 | 评论卡片展示该评论的 4 维评分（仅展示已填写的维度） | US-3 |
| AC-8 | 历史评论（无 4 维字段）的评论卡片不展示维度评分段；统计区正常计算（忽略 NULL） | US-5 |
| AC-9 | 数据库迁移后，老评论的 taste/difficulty/presentation/value 均为 NULL | US-5, US-6 |
| AC-10 | GET /api/recipes/:id/comments/stats 返回 `dimensionAverages`，各维度独立计算平均值 | US-2 |

---

## 5. 架构设计

### 5.1 数据库变更

#### 迁移 SQL（MariaDB 兼容）

```sql
ALTER TABLE comments
  ADD COLUMN taste INT NULL COMMENT '口味评分(1-5)',
  ADD COLUMN difficulty INT NULL COMMENT '难度评分(1-5)',
  ADD COLUMN presentation INT NULL COMMENT '卖相评分(1-5)',
  ADD COLUMN value INT NULL COMMENT '性价比评分(1-5)';
```

> **MariaDB 兼容性说明**：
> - MariaDB 10.2+ 支持 `ALTER TABLE ... ADD COLUMN` 多列语法
> - `INT NULL` 在 MariaDB 中默认不指定 DEFAULT 时为 `DEFAULT NULL`
> - 无需显式写 `AFTER rating`（可选优化，放在 rating 后面更工整）
> - 生产环境请先备份，建议在低峰期执行

#### 优化版（字段排序更工整）：

```sql
ALTER TABLE comments
  ADD COLUMN taste INT NULL COMMENT '口味评分(1-5)' AFTER rating,
  ADD COLUMN difficulty INT NULL COMMENT '难度评分(1-5)' AFTER taste,
  ADD COLUMN presentation INT NULL COMMENT '卖相评分(1-5)' AFTER difficulty,
  ADD COLUMN value INT NULL COMMENT '性价比评分(1-5)' AFTER presentation;
```

### 5.2 API 设计总结

| 端点 | 方法 | 变更类型 | 说明 |
|------|------|----------|------|
| `/recipes/:id/comments` | GET | **扩展响应** | 每个 comment 对象新增 taste/difficulty/presentation/value 字段 |
| `/recipes/:id/comments/stats` | GET | **扩展响应** | 新增 dimensionAverages 对象 |
| `/recipes/:id/comments` | POST | **扩展请求** | 新增 4 个可选字段 taste/difficulty/presentation/value；rating 仍必填 |

**不变更的端点**：
- `POST /comments/:id/reply` — 回复不需要评分维度
- `DELETE /comments/:id` — 删除逻辑不变
- `POST /comments/:id/like` / `DELETE /comments/:id/like` — 点赞不变
- `GET /recipes/:recipeId/ratings/trends` — 趋势仍基于 rating 综合评分

### 5.3 组件树

```
RecipeDetailPage
└── CommentSection
    ├── [统计区] comment-stats
    │   ├── comment-stats__main      ← 综合评分展示（不变）
    │   ├── comment-stats__bars       ← 评分分布柱状图（不变）
    │   └── ✨ DimensionRadar        ← 新增：4维雷达图
    ├── [表单] comment-form
    │   ├── StarRating (综合评分)     ← 不变
    │   ├── ✨ StarRating (口味)      ← 新增
    │   ├── ✨ StarRating (难度)      ← 新增
    │   ├── ✨ StarRating (卖相)      ← 新增
    │   ├── ✨ StarRating (性价比)    ← 新增
    │   ├── textarea                  ← 不变
    │   └── CommentImagePicker       ← 不变
    └── [列表] comment-list
        └── comment-item
            ├── comment-item__header   ← 用户信息 + 综合评分
            ├── ✨ comment-item__dimensions  ← 新增：4维标签展示
            ├── comment-item__content  ← 不变
            └── comment-item__actions  ← 不变
```

### 5.4 数据流图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           用户操作                                   │
│  ┌──────────────┐                    ┌──────────────────────────┐   │
│  │ 填写评论表单  │                    │ 浏览食谱详情页             │   │
│  │ + 4维评分     │                    │                          │   │
│  └──────┬───────┘                    └──────────┬───────────────┘   │
└─────────┼───────────────────────────────────────┼───────────────────┘
          │ POST /api/recipes/:id/comments        │ GET /.../comments
          │ {rating, taste, difficulty, ...}      │ + GET /.../comments/stats
          ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Express API 层                               │
│  routes/comments.js                                                 │
│  ┌──────────────┐  ┌──────────────────┐  ┌────────────────────┐    │
│  │ POST handler  │  │ GET /comments     │  │ GET /stats         │    │
│  │ 校验 + 创建   │  │ 返回 Comment[]    │  │ 计算 dimensionAvg  │    │
│  └──────┬───────┘  └────────┬─────────┘  └─────────┬──────────┘    │
└─────────┼───────────────────┼───────────────────────┼───────────────┘
          │                   │                       │
          ▼                   ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Sequelize ORM                                │
│  models/comment.js                                                  │
│  taste:INT(1-5)|NULL  difficulty:INT(1-5)|NULL                      │
│  presentation:INT(1-5)|NULL  value:INT(1-5)|NULL                    │
│  rating:INT(1-5)|NULL (不变)                                        │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         MariaDB — 生产环境                           │
│  Table: comments                                                    │
│  + taste INT NULL, difficulty INT NULL,                             │
│    presentation INT NULL, value INT NULL                            │
└─────────────────────────────────────────────────────────────────────┘

前端数据流：
  api.ts (Comment/CommentStats 类型)
    → getComments() / getCommentStats()
      → CommentSection (状态: comments, stats)
        ├→ comment-stats → DimensionRadar (stats.dimensionAverages)
        ├→ comment-form → StarRating × 5 (rating + 4维)
        └→ comment-item → 4维标签 (comment.taste/difficulty/...)
```

### 5.5 风险与兼容性

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| **老评论 4 维 NULL** | 低 | 前端做空值守卫：维度为 null 时卡片不展示，统计计算跳过 NULL |
| **迁移锁表** | 中 | MariaDB ALTER TABLE ADD COLUMN 在 InnoDB 下支持 ALGORITHM=INPLACE（10.3+），建议低峰期执行；约 200 条数据瞬间完成 |
| **API 响应体积增加** | 低 | 每个 comment 新增 4 个 int 字段，约 40 bytes/条 — 可忽略 |
| **recharts 雷达图兼容** | 低 | recharts v3.8.1 已安装，RadarChart 组件成熟；全 NULL 维度时前端做降级展示 |
| **Sequelize 模型同步** | 低 | 项目使用手动管理 schema，不会自动 sync；新增字段后在模型定义中声明即可，不影响现有数据 |

#### 向后兼容性矩阵

| 场景 | 兼容？ | 说明 |
|------|--------|------|
| 老客户端调用 GET /comments | ✅ | 新字段在 JSON 中为 null，JavaScript 访问不报错 |
| 老客户端调用 GET /stats | ✅ | `dimensionAverages` 为新增 key，老客户端不读取即可 |
| 老客户端调用 POST /comments | ✅ | 不传 4 维字段即可，路由层对这些字段做可选处理 |
| 新客户端连旧 API | ⚠️ | `dimensionAverages` 不存在 → 前端判空后不渲染雷达图即可 |

### 5.6 部署顺序（推荐）

```
1. 数据库迁移（ALTER TABLE）
   → 低峰期执行，< 1 秒
2. 部署后端（模型 + 路由变更）
   → 重启 Node 进程，新字段自动生效
3. 部署前端（组件变更）
   → Vite build + 上传静态资源
```

> 后端先部署是安全的：新字段全部 nullable，老前端不传也不报错。

---

## 6. 附录

### 6.1 stats 端点实现伪代码

```javascript
// GET /recipes/:recipeId/comments/stats 中新增逻辑
const dimensions = ['taste', 'difficulty', 'presentation', 'value']
const dimensionAverages = {}

for (const dim of dimensions) {
  const dimComments = comments.filter(c => c[dim] != null)
  if (dimComments.length > 0) {
    const sum = dimComments.reduce((s, c) => s + c[dim], 0)
    dimensionAverages[dim] = {
      average: Math.round((sum / dimComments.length) * 10) / 10,
      count: dimComments.length
    }
  } else {
    dimensionAverages[dim] = { average: 0, count: 0 }
  }
}
```

### 6.2 维度中文映射

```typescript
const DIMENSION_LABELS: Record<string, string> = {
  taste: '口味',
  difficulty: '难度',
  presentation: '卖相',
  value: '性价比'
}
```

### 6.3 相关文件清单

| 文件 | 变更类型 |
|------|----------|
| `backend/models/comment.js` | 修改 — 新增 4 个字段定义 |
| `backend/routes/comments.js` | 修改 — POST 校验 + stats 计算 |
| `frontend/src/api.ts` | 修改 — Comment/CommentStats 类型扩展 |
| `frontend/src/components/CommentSection.tsx` | 修改 — 表单/卡片/统计区 |
| `frontend/src/components/DimensionRadar.tsx` | **新建** — Recharts 雷达图组件 |
| `frontend/src/components/CommentSection.css` | 修改 — 维度评分样式 |
| 数据库迁移脚本 | **新建** — `backend/migrations/XXXX_add_dimension_ratings.sql` |
