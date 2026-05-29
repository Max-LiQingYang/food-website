# PRD — RankingsPage 修复方案

> 文件：`frontend/src/pages/RankingsPage.tsx` + `RankingsPage.css`
> 目标：修复浮点数精度、排名标识、标签可见性、进度条颜色等 5 个问题。

---

## P0 修复

### 1. 浮点数精度 → `362.59999999999997`

**根因：** `getPrimaryStat()` 对 composite/views/favorites 返回原始浮点，JSX 中 `>=1000` 才 toFixed(1)，<1000 时直接渲染 raw float。

**修复 — RankingsPage.tsx（`getPrimaryStat`）：**

```tsx
// 改前
const getPrimaryStat = (item: RankedRecipe) => {
  switch (sortBy) {
    case 'views': return { value: item.viewCount ?? 0, label: '浏览' }
    case 'favorites': return { value: item.favoriteCount ?? 0, label: '收藏' }
    case 'rating': return { value: item.avgRating ? item.avgRating.toFixed(1) : '-', label: '评分' }
    default: return { value: item.compositeScore ?? 0, label: '综合分' }
  }
}

// 改后：composite 保留 1 位小数，整数型 round
const getPrimaryStat = (item: RankedRecipe) => {
  switch (sortBy) {
    case 'views': return { value: Math.round(item.viewCount ?? 0), label: '浏览' }
    case 'favorites': return { value: Math.round(item.favoriteCount ?? 0), label: '收藏' }
    case 'rating': return { value: item.avgRating ? item.avgRating.toFixed(1) : '-', label: '评分' }
    default: return { value: (item.compositeScore ?? 0).toFixed(1), label: '综合分' }
  }
}
```

**修复 — RankingsPage.tsx（渲染处），`>=1000` 判断需适配 toFixed(1) 后的字符串：**

```tsx
// 改前
{typeof primaryStat.value === 'number'
  ? primaryStat.value >= 1000
    ? (primaryStat.value / 1000).toFixed(1) + 'k'
    : primaryStat.value
  : primaryStat.value}

// 改后（value 统一为 string|number，>=1000 判断 parseFloat）
{typeof primaryStat.value === 'number'
  ? primaryStat.value >= 1000
    ? (primaryStat.value / 1000).toFixed(1) + 'k'
    : primaryStat.value
  : parseFloat(primaryStat.value) >= 1000
    ? (parseFloat(primaryStat.value) / 1000).toFixed(1) + 'k'
    : primaryStat.value}
```

---

### 2. 排名标识 `#4` 风格割裂

**根因：** `rankBadge()` 中第 4 名以后渲染 `#{rank}`，与 TOP3 的纯数字圆形不一致。

**修复 — RankingsPage.tsx（`rankBadge`）：**

```tsx
// 改前（第4名以后分支）
<span className="rank-card__rank-num rank-card__rank-num--normal">#{rank}</span>

// 改后：去掉 #，只保留数字
<span className="rank-card__rank-num rank-card__rank-num--normal">{rank}</span>
```

---

## P1 优化

### 3. 综合分标签太小（11px, #999）

**修复 — RankingsPage.css：**

```css
/* 改前 */
.rank-card__stat-label {
  font-size: 11px;
  color: var(--color-text-muted, #999);
  white-space: nowrap;
}

/* 改后：放大到 12px，颜色加深 */
.rank-card__stat-label {
  font-size: 12px;
  color: var(--color-text-secondary, #666);
  white-space: nowrap;
}
```

---

### 4. 标签区精简（12px 一整行）

**修复 — RankingsPage.css：**

```css
/* 改前 */
.rank-card__meta-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #999);
  white-space: nowrap;
  overflow: hidden;
}

/* 改后：缩小到 11px，间距收紧到 2px */
.rank-card__meta-row {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  color: var(--color-text-muted, #999);
  white-space: nowrap;
  overflow: hidden;
}
```

---

### 5. 评分进度条颜色分等级

**根因：** 所有卡片共用同一个橙色渐变 `.rank-card__progress-fill`。

**修复 — RankingsPage.css（新增 TOP3 + 普通渐变色）：**

```css
/* 原有通用 fill → 改为普通排名（蓝色→紫色） */
.rank-card__progress-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 第1名：金色进度条 */
.rank-card--gold .rank-card__progress-fill {
  background: linear-gradient(90deg, #ffd700, #f59e0b);
}

/* 第2名：银色进度条 */
.rank-card--silver .rank-card__progress-fill {
  background: linear-gradient(90deg, #c0c0c0, #a8a8a8);
}

/* 第3名：铜色进度条 */
.rank-card--bronze .rank-card__progress-fill {
  background: linear-gradient(90deg, #cd7f32, #b87333);
}
```

---

## 改动汇总

| # | 优先级 | 文件 | 改动 |
|---|--------|------|------|
| 1 | P0 | TSX `getPrimaryStat` | composite `.toFixed(1)`, views/favorites `Math.round` |
| 1 | P0 | TSX 渲染处 | value 为 string 时 `parseFloat` 判断 ≥1000 |
| 2 | P0 | TSX `rankBadge` | 第4名以后去掉 `#`，只输出 `{rank}` |
| 3 | P1 | CSS `.rank-card__stat-label` | `font-size: 11→12px`, `color: #999→#666` |
| 4 | P1 | CSS `.rank-card__meta-row` | `font-size: 12→11px`, `gap: 4→2px` |
| 5 | P1 | CSS `.rank-card__progress-fill` | 默认蓝紫渐变 + TOP3 金银铜覆盖 |
