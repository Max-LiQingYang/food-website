# PRD — 食谱数据完整性增强：cookingTime 补齐与展示优化

> **迭代编号**：Iter#113  
> **创建日期**：2026-06-09  
> **项目**：food-website（~/Projects/food-website/）  
> **部署**：http://39.103.68.205/  
> **技术栈**：React 18 + Express + Sequelize + MariaDB  
> **基准 Commit**：a5bdcf5  
> **输出目录**：iter113-data-completeness/

---

## 一、问题陈述

### 1.1 现状

生产数据库（MariaDB）中存在 **20 道食谱**的 `cookTime` 字段为 `NULL` 或 `0`，导致：

- **RecipeCard** 上不显示烹饪时长标签（`recipe.cookTime != null` 条件过滤）
- **RecipeDetailPage** 上缺失烹饪时长信息（同样条件过滤）
- 用户无法根据烹饪时间筛选/排序食谱
- 数据不完整影响列表排序（`sortBy: cookTime_asc | cookTime_desc` 返回异常）

### 1.2 已验证信息

| 检查项 | 结果 |
|--------|------|
| `backend/models/recipe.js` cookTime 字段定义 | `INTEGER, allowNull: true` |
| `backend/seeds/seed.js` 食谱总数 | 94 道，全部具有有效 cookTime（5-240min） |
| 前端 RecipeCard cookTime 渲染条件 | `{recipe.cookTime != null && <span>⏱ {recipe.cookTime}分钟</span>}` |
| 前端 DetailPage cookTime 渲染条件 | `{recipe.cookTime != null && <span className="detail-tag">⏱ {recipe.cookTime} 分钟</span>}` |
| API sortBy 参数支持 | `cookTime_asc` / `cookTime_desc` |
| 生产 DB 缺失数量 | **20 道**（需 DBA / 直接查询确认具体列表） |
| 现有暗色模式 | `body.dark` / `[data-theme='dark']` 双选择器体系 |

---

## 二、需求分级

| 优先级 | 模块 | 工作量估算 | 风险 |
|--------|------|-----------|------|
| **P0** | 补充缺失 cookingTime 数据 | 1.5h | 数据一致性 |
| **P1** | 详情页烹饪时间展示增强 | 3h | UI 兼容性 |
| **P2** | 卡片烹饪时间标签增强 | 1.5h | 暗色模式 |

---

## 三、P0：补充缺失的 cookingTime 数据

### 3.1 目标

为生产 DB 中 20 道 `cookTime IS NULL OR cookTime = 0` 的食谱补充合理烹饪时间，同时确保 `seed.js` 中所有 94 道食谱均有有效 `cookTime`。

### 3.2 烹饪时间估算规则

根据食谱复杂度（difficulty）、食材数量（ingredients.length）、步骤数（steps.length）综合评估：

| 难度 | 时间范围 | 典型值 |
|------|----------|--------|
| `easy` | 10–30 分钟 | 15 分钟 |
| `medium` | 20–60 分钟 | 35 分钟 |
| `hard` | 45–120+ 分钟 | 75 分钟 |

**细化参考**：

| 条件 | 时间调整 |
|------|----------|
| 含「炖/卤/焖/烤」类方法 | +30–60 分钟 |
| 含「蒸/煮/焯」类方法 | +10–20 分钟 |
| 含「发酵/腌制/醒发」 | +30–120 分钟 |
| 食材数 ≤ 5 | -10 分钟 |
| 食材数 ≥ 12 | +15 分钟 |
| 步骤数 ≤ 3 | -5 分钟 |
| 步骤数 ≥ 8 | +10 分钟 |
| 甜点/烘焙类 | +15–30 分钟（含冷却） |
| 凉拌/沙拉类 | 5–15 分钟 |

### 3.3 实施步骤

#### Step 1：定位缺失食谱

```sql
-- 在生产 DB 上执行，导出缺失食谱清单
SELECT id, title, difficulty, category, 
       JSON_LENGTH(ingredients) AS ing_count,
       JSON_LENGTH(steps) AS step_count
FROM recipes 
WHERE cookTime IS NULL OR cookTime = 0;
```

#### Step 2：评估并补齐 cookTime

对每条缺失食谱，按 §3.2 规则估算合理烹饪时间，生成 UPDATE 语句：

```sql
-- 示例（具体值需根据实际食谱评估）
UPDATE recipes SET cookTime = 35 WHERE id = '<uuid>' AND (cookTime IS NULL OR cookTime = 0);
-- ... 重复 20 次
```

#### Step 3：验证数据完整性

```sql
-- 确认无遗漏
SELECT COUNT(*) AS missing_count FROM recipes WHERE cookTime IS NULL OR cookTime = 0;
-- 期望结果：0
```

#### Step 4：同步 seed.js

`backend/seeds/seed.js` 已从生产 DB 导出（注释标记 `自动导出自生产 DB (2026-06-08T04:34:57.229Z)`），需重新导出或手动同步：

```bash
# 方案 A：重新从生产 DB 导出（推荐）
cd backend && node seeds/seed-export.js > seeds/seed.js

# 方案 B：手动在 seed.js 中补全缺失食谱的 cookTime
```

#### Step 5：添加数据完整性检查

在 `seed.js` 末尾增加自检逻辑：

```js
// ── 数据完整性自检 ──
;(function validateSeed() {
  const missing = recipes.filter(r => r.cookTime == null || r.cookTime === 0)
  if (missing.length > 0) {
    console.error(`❌ ${missing.length} recipes missing cookTime:`, 
      missing.map(r => r.title))
    process.exit(1)
  }
  console.log(`✅ All ${recipes.length} recipes have valid cookTime`)
})()
```

### 3.4 验收标准

- [ ] 生产 DB 中 `SELECT COUNT(*) FROM recipes WHERE cookTime IS NULL OR cookTime = 0` 返回 0
- [ ] seed.js 中所有 94 道食谱 cookTime 有效（非 null、> 0）
- [ ] seed.js 末尾自检通过
- [ ] 按 cookingTime 排序接口正常返回（`GET /api/recipes?sortBy=cookTime_asc`）
- [ ] 现有食谱其他字段未被修改

---

## 四、P1：食谱详情页烹饪时间展示增强

### 4.1 当前实现

```tsx
// RecipeDetailPage.tsx L706-708
{recipe.cookTime != null && (
  <span className="detail-tag">⏱ {recipe.cookTime} 分钟</span>
)}
```

**问题**：仅显示纯数字文本，缺乏可视化、无难度关联、无时间区间语义。

### 4.2 目标设计

将烹饪时间展示升级为**时间进度条 + 图标 + 难度关联**的复合组件。

### 4.3 UI 规格

```
┌─────────────────────────────────────────────────────┐
│  ⏱ 烹饪时间                                         │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  └──────────────────────────────────────────────┘   │
│  0min                                         120max│
│                                                     │
│  ⏱ 35 分钟    🟡 中等难度                           │
│  ▎快速      ▎普通      ▎慢炖                         │
└─────────────────────────────────────────────────────┘
```

### 4.4 组件设计

新增 `CookingTimeBar` 组件：`frontend/src/components/CookingTimeBar.tsx` + `CookingTimeBar.css`

#### Props

```ts
interface CookingTimeBarProps {
  cookTime: number        // 烹饪时长（分钟）
  difficulty?: string      // 难度：easy | medium | hard
  /** 基准最大时间（默认 120min），用于进度条比例 */
  maxTime?: number
}
```

#### 时间区间分类

| 区间 | 标签 | 颜色 | 图标 |
|------|------|------|------|
| ≤15min | 快速 | `#22c55e`（成功绿） | ⚡ |
| 16–45min | 普通 | `#f59e0b`（琥珀） | ⏱ |
| 46+min | 慢炖 | `#e8663e`（主色暖橙） | 🍲 |

#### 进度条计算

```ts
const percentage = Math.min((cookTime / maxTime) * 100, 100)
const timeCategory = cookTime <= 15 ? 'quick' : cookTime <= 45 ? 'normal' : 'slow'
const categoryColor = CATEGORY_COLORS[timeCategory]
```

#### 难度关联展示

```
⏱ 35 分钟  ·  🟡 中等难度  →  预计需要 35 分钟，中等难度
⏱ 15 分钟  ·  🟢 简单      →  快速上手，15 分钟搞定
⏱ 90 分钟  ·  🔴 困难      →  需要耐心，建议周末尝试
```

### 4.5 暗色模式

```css
/* CookingTimeBar.css */
.cooking-time-bar__track {
  background: var(--color-border-light, #f0ebe5);
}
body.dark .cooking-time-bar__track {
  background: var(--color-border-dark, #444);
}

.cooking-time-bar__fill--quick {
  background: linear-gradient(90deg, #22c55e, #4ade80);
}
body.dark .cooking-time-bar__fill--quick {
  background: linear-gradient(90deg, #166534, #22c55e);
}

.cooking-time-bar__fill--normal {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}
body.dark .cooking-time-bar__fill--normal {
  background: linear-gradient(90deg, #92400e, #f59e0b);
}

.cooking-time-bar__fill--slow {
  background: linear-gradient(90deg, #e8663e, #f5a885);
}
body.dark .cooking-time-bar__fill--slow {
  background: linear-gradient(90deg, #9a3412, #e8663e);
}
```

### 4.6 DetailPage 集成

在 `RecipeDetailPage.tsx` 中替换现有 `<span className="detail-tag">⏱ {recipe.cookTime} 分钟</span>`：

```tsx
{/* 替换前 */}
{recipe.cookTime != null && (
  <span className="detail-tag">⏱ {recipe.cookTime} 分钟</span>
)}

{/* 替换后 */}
{recipe.cookTime != null && (
  <CookingTimeBar 
    cookTime={recipe.cookTime} 
    difficulty={recipe.difficulty}
    maxTime={180}
  />
)}
```

放置位置：详情页标签行（`.detail-tags` div），位于难度标签之后、质量标签之前。

### 4.7 验收标准

- [ ] CookingTimeBar 组件独立渲染，带进度条、分类标签、难度关联
- [ ] 三个时间区间颜色正确（快速绿/普通琥珀/慢炖暖橙）
- [ ] 进度条宽度与 cookTime 成比例（上限基准可配置）
- [ ] 暗色模式下所有颜色变体正常显示（`body.dark`）
- [ ] cookTime 为 null/0 时组件不渲染（保持现有守卫逻辑）
- [ ] 移动端（≤480px）进度条不溢出
- [ ] 现有 `.detail-tag` 样式不受影响

---

## 五、P2：食谱卡片烹饪时间标签增强

### 5.1 当前实现

```tsx
// RecipeCard.tsx L248
{recipe.cookTime != null && (
  <span className="recipe-card__tag recipe-card__tag--time">
    ⏱ {recipe.cookTime}分钟
  </span>
)}
```

CSS 现状：
```css
.recipe-card__tag--time {
  background: rgba(232, 102, 62, 0.08);
  color: var(--color-primary, #E8663E);
}
```

**问题**：所有烹饪时间统一暖橙色，无法直观区分快慢；无暗色模式专门适配。

### 5.2 目标设计

按时间区间动态切换标签样式，使用图标 + 文字 + 色系区分。

### 5.3 实现方案

#### 新增工具函数

```ts
// frontend/src/utils/cookTimeLabel.ts

export type TimeCategory = 'quick' | 'normal' | 'slow'

export interface CookTimeInfo {
  category: TimeCategory
  icon: string
  label: string
  cssClass: string
}

export function getCookTimeInfo(cookTime: number): CookTimeInfo {
  if (cookTime <= 15) {
    return {
      category: 'quick',
      icon: '⚡',
      label: '快速',
      cssClass: 'recipe-card__tag--time-quick',
    }
  }
  if (cookTime <= 45) {
    return {
      category: 'normal',
      icon: '⏱',
      label: '普通',
      cssClass: 'recipe-card__tag--time-normal',
    }
  }
  return {
    category: 'slow',
    icon: '🍲',
    label: '慢炖',
    cssClass: 'recipe-card__tag--time-slow',
  }
}
```

#### RecipeCard 改造

```tsx
{/* 替换现有 cookTime 渲染 */}
{recipe.cookTime != null && (() => {
  const timeInfo = getCookTimeInfo(recipe.cookTime)
  return (
    <span className={`recipe-card__tag recipe-card__tag--time ${timeInfo.cssClass}`}>
      {timeInfo.icon} {recipe.cookTime}分钟
    </span>
  )
})()}
```

#### CSS 三套配色

```css
/* 快速 ≤15min — 绿色系 */
.recipe-card__tag--time-quick {
  background: rgba(34, 197, 94, 0.08);
  color: #16a34a;
}
body.dark .recipe-card__tag--time-quick {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

/* 普通 16–45min — 琥珀色系 */
.recipe-card__tag--time-normal {
  background: rgba(245, 158, 11, 0.08);
  color: #d97706;
}
body.dark .recipe-card__tag--time-normal {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

/* 慢炖 46+min — 暖橙/砖红色系（保持现有品牌色） */
.recipe-card__tag--time-slow {
  background: rgba(232, 102, 62, 0.08);
  color: var(--color-primary, #e8663e);
}
body.dark .recipe-card__tag--time-slow {
  background: rgba(232, 102, 62, 0.15);
  color: var(--color-primary-dark, #c94f2a);
}

/* 通用 hover 效果 */
.recipe-card__tag--time:hover {
  filter: brightness(0.95);
  transition: filter 0.2s ease;
}
body.dark .recipe-card__tag--time:hover {
  filter: brightness(1.15);
}
```

### 5.4 验收标准

- [ ] 快速（≤15min）显示绿底绿字 + ⚡ 图标
- [ ] 普通（16–45min）显示琥珀底琥珀字 + ⏱ 图标
- [ ] 慢炖（46+min）显示暖橙底暖橙字 + 🍲 图标
- [ ] 暗色模式下三种配色变体正确（`body.dark`）
- [ ] hover 时有微交互（brightness 变化）
- [ ] cookTime 为 null/0 时标签不渲染
- [ ] 不破坏现有卡片布局（tag 行已有多个标签，新增 class 不影响 flex 布局）

---

## 六、技术约束

### 6.1 数据库

- **不新增字段**：复用现有 `cookTime` 字段
- **不建新表**
- **UPDATE 操作**：仅修改 `cookTime` 列，不触碰其他字段
- **事务安全**：批量 UPDATE 建议在事务中执行（MariaDB 默认 autocommit）

### 6.2 前端

| 约束 | 说明 |
|------|------|
| 暗色模式 | 所有新增 UI 必须支持 `body.dark` 选择器 |
| 色彩体系 | 严格遵守 `DESIGN_RULES.md` 暖色系规范 |
| 字号 | 标签文字 ≤ 12px（元数据层级） |
| 间距 | 使用 4px 倍数基准 |
| 组件独立性 | CookingTimeBar 为独立组件，可复用 |
| React 版本 | React 18（无 Server Components） |
| TypeScript | 严格模式，新增类型在 `cookTimeLabel.ts` 中定义 |

### 6.3 兼容性

- 不破坏现有 API 接口
- 不改变 Recipe 模型定义
- 不影响现有收藏、评论、搜索功能
- 不影响 SEO 结构化数据（cookTime 已在 schema.org Recipe 中使用）

---

## 七、文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| ✏️ 修改 | `backend/seeds/seed.js` | 补充缺失 cookTime + 末尾自检 |
| ✏️ 修改 | MariaDB 生产库 | UPDATE 20 条记录的 cookTime |
| ✨ 新增 | `frontend/src/components/CookingTimeBar.tsx` | 时间进度条组件 |
| ✨ 新增 | `frontend/src/components/CookingTimeBar.css` | 进度条样式（含暗色模式） |
| ✨ 新增 | `frontend/src/utils/cookTimeLabel.ts` | 时间分类工具函数 |
| ✏️ 修改 | `frontend/src/pages/RecipeDetailPage.tsx` | 集成 CookingTimeBar |
| ✏️ 修改 | `frontend/src/components/RecipeCard.tsx` | 时间标签分类着色 |
| ✏️ 修改 | `frontend/src/components/RecipeCard.css` | 三套时间配色 + 暗色模式 |

---

## 八、风险与回滚

| 风险 | 概率 | 缓解措施 |
|------|------|----------|
| 估算的 cookTime 与实际偏差大 | 中 | 按 §3.2 规则系统评估，保留调整空间 |
| 生产 DB UPDATE 误操作 | 低 | 先 SELECT 确认目标行，事务包裹 UPDATE |
| seed.js 同步遗漏 | 低 | 末尾自检脚本自动拦截 |
| 新组件移动端布局异常 | 低 | 进度条使用 % 宽度，flex 弹性布局 |
| 暗色模式色值不合适 | 中 | 使用半透明叠加而非纯色，保证可读性 |

**回滚方案**：

```sql
-- 生产 DB 回滚（需在执行 UPDATE 前备份受影响行）
-- 1. 备份
CREATE TABLE recipes_cooktime_backup_20260609 AS 
SELECT id, cookTime FROM recipes WHERE cookTime IS NULL OR cookTime = 0;
-- 2. 回滚时
UPDATE recipes r 
JOIN recipes_cooktime_backup_20260609 b ON r.id = b.id 
SET r.cookTime = b.cookTime;
```

前端回滚：git revert 对应 commit。

---

## 九、数据分布参考

当前 seed.js 中 94 道食谱 cookTime 分布（供估算参考）：

| 区间 | 数量 | 占比 | 图标 |
|------|------|------|------|
| 快速（≤15min） | 24 | 25.5% | ⚡ |
| 普通（16–45min） | 48 | 51.1% | ⏱ |
| 慢炖（46+min） | 22 | 23.4% | 🍲 |
| **合计** | **94** | **100%** | |
| Min / Max | 5min / 240min | | |
| 平均值 | 39min | | |

补齐 20 道缺失后，预期分布保持相似比例。

---

## 十、附录

### A. 生产 DB 连接信息

```
Host: 39.103.68.205
DB:   food_website (MariaDB)
User: 参考 .env 文件 DB_USER/DB_PASSWORD
```

### B. 缺失食谱定位查询

```sql
SELECT 
  id, title, category, difficulty,
  JSON_LENGTH(ingredients) AS ings,
  JSON_LENGTH(steps) AS steps,
  cookTime
FROM recipes 
WHERE cookTime IS NULL OR cookTime = 0
ORDER BY difficulty, category;
```

### C. 相关文件路径速查

```
项目根:       ~/Projects/food-website/
种子数据:     backend/seeds/seed.js
Recipe 模型:  backend/models/recipe.js
RecipeCard:   frontend/src/components/RecipeCard.tsx + .css
详情页:       frontend/src/pages/RecipeDetailPage.tsx + .css
设计规范:     frontend/src/styles/DESIGN_RULES.md
API 类型:     frontend/src/api.ts
工具函数:     frontend/src/utils/（新增 cookTimeLabel.ts）
组件目录:     frontend/src/components/（新增 CookingTimeBar）
```
