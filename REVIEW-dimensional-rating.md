# Code Review: dimensional-rating (commit 559b2da)

**审查日期**：2026-06-11  
**审查人**：Coordinator（Code Reviewer 子代理）  
**结论**：🟡 **有条件通过**（1 个 P0 + 3 个 P1，无阻塞性安全问题）

---

## 🔴 P0 — 必须修复

### P0-1. `body.dark` 与 `[data-theme='dark']` 双暗色模式冲突导致雷达图颜色不更新

**文件**：`frontend/src/components/DimensionRadar.tsx:62-65` + `CommentSection.css`（两套暗色规则）  
**严重度**：🔴 P0 — 功能缺陷

**问题**：
- CSS 同时存在 `body.dark` 和 `[data-theme='dark']` 两套暗色规则
- `DimensionRadar.tsx` 的 JS 检测只监听 `body.dark`：
  ```ts
  const check = () => setIsDark(document.body.classList.contains('dark'))
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  ```
- 如果站点实际使用 `data-theme` 属性切换暗色模式，雷达图颜色（gridColor / textColor / accentColor / fillOpacity）将**永远不会切换到暗色值**，白底白字不可见

**修复**：
- Option A：统一为一种暗色机制（推荐 `[data-theme='dark']`），同步修改 JS 检测逻辑：
  ```ts
  const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
  ```
- Option B：同时检测两者：
  ```ts
  const check = () => {
    const hasDataTheme = document.documentElement.getAttribute('data-theme') === 'dark'
    const hasBodyDark = document.body.classList.contains('dark')
    setIsDark(hasDataTheme || hasBodyDark)
  }
  ```

---

## 🟡 P1 — 建议修复

### P1-1. Stats 端点全量查询评论，无 SQL 聚合

**文件**：`backend/routes/comments.js:149-157`  
**严重度**：🟡 P1 — 性能隐患

**问题**：
```js
const comments = await Comment.findAll({
  where: { recipeId },
  attributes: ['rating', 'taste', 'difficulty', 'presentation', 'value']
})
```
- 拉取该食谱**所有评论的全部 5 个数值字段**到应用层，再用 JS 循环计算平均值
- 对于有 500+ 评论的热门食谱，每次 stats 调用都会传输大量数据
- 没有缓存，每次页面刷新都重新查询

**修复**：用 SQL 聚合在数据库层直接计算：
```js
const stats = await Comment.findOne({
  where: { recipeId },
  attributes: [
    [fn('COUNT', col('id')), 'total'],
    [fn('COUNT', col('rating')), 'ratedCount'],
    [fn('AVG', col('rating')), 'averageRating'],
    [fn('AVG', col('taste')), 'avgTaste'],
    [fn('AVG', col('difficulty')), 'avgDifficulty'],
    [fn('AVG', col('presentation')), 'avgPresentation'],
    [fn('AVG', col('value')), 'avgValue'],
    [fn('COUNT', col('taste')), 'countTaste'],
    // ... 其余 count
  ],
  raw: true
})
```
`AVG()` 自动忽略 NULL，无需手动过滤。分布数据仍需单独查，可用 `GROUP BY rating`。

### P1-2. Recharts / DimensionRadar 未做代码分割（lazy load）

**文件**：`frontend/src/components/CommentSection.tsx:8`  
**严重度**：🟡 P1 — 包体积

**问题**：
```tsx
import DimensionRadar from './DimensionRadar'
```
- `DimensionRadar` 同步导入 → 连带 Recharts（~170KB gzip）打入主 chunk
- 雷达图只在 stats 区域渲染，且仅在 `stats.dimensionAverages` 存在时才显示
- 大部分用户可能永远看不到雷达图（新站点，四维评分可选）

**修复**：
```tsx
const DimensionRadar = React.lazy(() => import('./DimensionRadar'))
// 使用时包裹 Suspense
```

### P1-3. CSS 变量命名不一致（两套变量体系）

**文件**：`frontend/src/components/CommentSection.css`（全文）  
**严重度**：🟡 P1 — 可维护性

**问题**：
- 亮色模式使用 `--accent-warm`、`--text-primary`、`--border-color`、`--bg-primary`
- `body.dark` 规则使用 `--color-primary`、`--color-text`、`--color-border`、`--color-card`
- 两套变量名不互通，暗色模式不是通过覆盖变量实现，而是重新声明了一套完全不同的规则

**修复**：统一使用一套 CSS 变量，暗色模式只需覆盖变量值：
```css
body.dark {
  --accent-warm: #f87171;
  --text-primary: #e0e0ee;
  --border-color: #2e2e48;
  --bg-primary: #1e1e32;
  --bg-secondary: #1a1a2e;
}
```
当前 CSS 中的 `body.dark` 规则基本都是多余的（因为变量值变了就不需要重复规则），可大幅精简。

---

## 🟢 优点

### ✅ 空值处理全链路健壮
- **后端** `validComments.filter(c => c[dim] != null)` — 正确忽略 NULL（review #1）
- **后端** 空表返回 `{ average: 0, count: 0 }` — 不崩不抛（review #1）
- **前端** `comment[key] != null` 过滤 NULL 徽章，`badges.length === 0` 返回 null（review #1d）
- **前端** `stats.dimensionAverages &&` 守卫缺失响应不崩（review #4c）
- **DimensionRadar** 自身空值守卫 `if (!data || Object.keys(data).length === 0) return null`（review #3）

### ✅ 迁移脚本幂等正确
- `SHOW COLUMNS FROM comments LIKE 'taste'` 检测已迁移（review #1a）
- 输出友好中文提示
- 错误处理干净

### ✅ 可选字段验证安全
- `validateDimensionRating()` 正确处理 `val == null` → 跳过（review #1c）
- `Number(val)` + `Number.isInteger()` + 范围检查，拒绝非数字/浮点/超界（review #2a）
- Sequelize model `validate: { min: 1, max: 5 }` 作为数据库层防线（review #2b）
- 前端 StarRating 只输出 1-5，结构上无越界（review #2c）

### ✅ 前端降级优雅
- 无维度数据时雷达区不渲染
- 旧评论无维度评分时不显示徽章
- 空状态提示「暂无维度评分数据」

### ✅ 向后兼容
- API 新增 `dimensionAverages` 字段，老客户端忽略即可
- 老评论 `taste/difficulty/presentation/value` 为 NULL，所有查询/渲染正确跳过

---

## 附录：逐文件审查摘要

| 文件 | 状态 | 备注 |
|------|------|------|
| `backend/models/comment.js` | ✅ | Sequelize validate min/max 正确，allowNull 正确 |
| `backend/routes/comments.js` | 🟡 | /stats 无 SQL 聚合（P1-1），其余正确 |
| `backend/scripts/migrate-dimensional-rating.js` | ✅ | 幂等，清晰 |
| `backend/package.json` | ✅ | npm script 命名清晰 |
| `frontend/src/api.ts` | ✅ | Comment/CommentStats 类型完整，可选字段正确 |
| `frontend/src/components/DimensionRadar.tsx` | 🔴 | 暗色检测单一（P0-1），其余健壮 |
| `frontend/src/components/CommentSection.tsx` | 🟡 | 未 lazy load Radar（P1-2），空值处理优秀 |
| `frontend/src/components/CommentSection.css` | 🟡 | 双暗色+双变量体系（P0-1、P1-3） |

---

## 最终结论

**🟡 有条件通过**

- 修复 P0-1（暗色模式不一致）后可合入主分支
- P1-1（SQL 聚合）建议在下一个迭代中优化——当前问题不阻塞上线，但对热门食谱有性能影响
- P1-2（lazy load）和 P1-3（变量统一）建议随暗色模式修复一并处理，避免 CSS 债务累积
