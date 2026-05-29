# PRD：排行榜页面 UI 美化设计方案

> 版本: 1.0 | 日期: 2026-05-29 | 基于 DESIGN_RULES.md v2026-05-29

---

## 0. 设计约束与原则

- **所有颜色/间距/圆角/阴影** 必须使用 `var(--xxx)` 引用现有 CSS 变量，**禁止硬编码色值**
- **不新增 CSS 变量**，仅使用 DESIGN_RULES.md 已定义的变量体系
- **暖橙主色调** `--color-primary: #e8663e`
- **所有交互在 touch 设备必须可用**（`:active` 替代 `:hover`）
- 间距使用 **4px 倍数**，圆角使用规范值（8px/12px/16px/9999px）
- 移动端优先（Mobile-first），≥600px 断点做 PC 增强

---

## 1. 高优先级改动清单（CSS 类名 & 变量变更）

### 1.1 新增 CSS Class

| Class | 位置 | 用途 |
|-------|------|------|
| `.rank-card--gold` | `.rank-card` 同级 | 第 1 名卡片：金色渐变边框 + 微光背景 |
| `.rank-card--silver` | `.rank-card` 同级 | 第 2 名卡片：银色左边框 + 浅灰背景 |
| `.rank-card--bronze` | `.rank-card` 同级 | 第 3 名卡片：铜色左边框 + 暖棕背景 |
| `.rank-card__rank-crown` | `.rank-card__badge` 内 | 第 1 名皇冠图标（::before 伪元素） |
| `.rank-card__rank-medal` | `.rank-card__badge` 内 | 第 2/3 名奖牌标识 |
| `.rank-card__progress-bar` | `.rank-card__info` 内 | 评分进度条容器 |
| `.rank-card__progress-fill` | `.rank-card__progress-bar` 内 | 进度条填充（渐变 + 宽度动态） |
| `.rank-card__stars` | `.rank-card__progress-bar` 下方 | 星级文字展示（★★★★☆） |
| `.rank-card__meta-row` | `.rank-card__info` 内 | 合并后的单行元信息 |
| `.rank-card__meta-sep` | `.rank-card__meta-row` 内 | 元信息分隔符 "·" |

### 1.2 修改现有 CSS Class

| Class | 改动 | 设计理由 |
|-------|------|----------|
| `.rank-card` | `align-items: center` → `align-items: stretch`；`height` 新增 `min-height: 96px` | 内容区需要垂直方向弹性布局；统一卡片高度 |
| `.rank-card__cover-wrap` | `80×80` → `100×80`；`border-radius: 10px` → `var(--radius-sm, 8px)` | 横向空间更充裕；统一圆角规范 |
| `.rank-card__badge` | `min-width: 44px` → `min-width: 48px` | 为 TOP3 特殊标识留空间 |
| `.rank-card__rank-num` | 移除硬编码的 `.rank-1/.rank-2/.rank-3/.rank-4~10` 背景色 → 改用 `var(--color-xxx)` 体系 | 遵守「禁止硬编码色值」规则 |
| `.rank-card__info` | 新增 `display: flex; flex-direction: column; gap: 6px` | 标题、元信息、进度条垂直排列 |
| `.rank-card__meta` | 合并为单行 `.rank-card__meta-row`，分隔符 "·" 隔开 | 精简信息密度，一屏可见更多卡片 |
| `.rank-card__stats` | 从右侧独立列 → 移除或并入 info 底部 | 卡片横向空间留给封面+信息；统计数据可折叠到 info 区 |
| `.rank-card--top` | 拆分 → `.rank-card--gold` / `.rank-card--silver` / `.rank-card--bronze` | 三名各自独立视觉语言，不再笼统 |
| `.rank-card:hover` | `translateY(-1px)` → `translateY(-2px)` + `--shadow-md` | 悬浮感更强 |
| `.rank-card__cover-img` | 新增 `transition: transform var(--transition-fast)` | 封面 hover 放大动画 |

### 1.3 CSS 变量使用对照

| 属性 | 旧值（硬编码） | 新值（变量） |
|------|---------------|-------------|
| 排名 1 背景 | `linear-gradient(135deg, #ffd700, #ffc107)` | `linear-gradient(135deg, var(--color-star, #f59e0b), #ffd700)`（渐变两端可使用现有变量 + 固定终点色） |
| 排名 1 阴影 | `0 2px 8px rgba(255,193,7,0.3)` | `0 2px 12px rgba(245, 158, 11, 0.25)`（基于 `--color-star`） |
| 排名 2 背景 | `linear-gradient(135deg, #e0e0e0, #bdbdbd)` | `var(--color-bg-secondary, #f5f0eb)` + 银色左边框（保持简洁） |
| 排名 3 背景 | `linear-gradient(135deg, #cd7f32, #b8860b)` | `var(--color-primary-bg, #fff3ed)` + 铜色左边框 |
| 排名 4+ 背景 | `var(--color-bg-secondary)` | 不变 ✅ |
| 统计区渐变文字 | `linear-gradient(135deg, #e8663e, #f5a623)` | `linear-gradient(135deg, var(--color-primary, #e8663e), var(--color-star, #f59e0b))` |

---

## 2. TOP3 详细设计

### 2.1 第 1 名 — 金牌 🥇

**视觉层级**：最高优先级，一眼可识别。

| 属性 | 值 | 变量来源 |
|------|-----|----------|
| 卡片左边框 | `3px solid` 金色渐变 | 使用 `border-left` + `border-image` 或独立左边框色 |
| 卡片背景 | 极淡金色渐变（从左到右消失） | `linear-gradient(105deg, rgba(245,158,11,0.06) 0%, var(--color-card) 40%)` |
| 卡片阴影 | `0 2px 16px rgba(245,158,11,0.15)` | 基于 `--color-star` |
| 排名圆徽章背景 | `linear-gradient(135deg, #ffd700, var(--color-star))` | `--color-star: #f59e0b` |
| 排名圆徽章阴影 | `0 2px 12px rgba(245,158,11,0.35)` | 金色光晕 |
| 排名数字 | 白色粗体 `#fff`，字号 20px | |
| 皇冠图标 | `♛` 或 `👑` 置于排名圆徽章上方，`position: absolute; top: -8px; font-size: 14px` | Unicode 字符，无需额外资源 |

**皇冠图标放置位置**：
```
┌──────────────────────────────┐
│  ♛                           │  ← 皇冠悬浮在排名徽章正上方 -8px
│ ┌────┐  ┌──────┐  ┌───────┐ │
│ │ ①  │  │ 封面 │  │ 标题  │ │  ← 排名徽章内显示 "1"
│ └────┘  │100×80│  │ 元信息│ │
│         └──────┘  │ ★★★★ │ │
│                   └───────┘ │
└──────────────────────────────┘
```

**CSS 实现要点**：
```css
.rank-card--gold {
  border-left: 3px solid var(--color-star, #f59e0b);
  background: linear-gradient(105deg, rgba(245,158,11,0.06) 0%, var(--color-card, #fff) 40%);
  box-shadow: 0 2px 16px rgba(245,158,11,0.12);
}

.rank-card__badge {
  position: relative; /* 为皇冠提供定位上下文 */
}

.rank-card__rank-crown {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  line-height: 1;
  /* 使用 ♛ 字符，通过 ::before 伪元素注入 */
}
```

### 2.2 第 2 名 — 银牌 🥈

| 属性 | 值 | 变量来源 |
|------|-----|----------|
| 卡片左边框 | `3px solid var(--color-border, #e8e0d8)` + 微银色调 | `--color-border` |
| 卡片背景 | `linear-gradient(105deg, rgba(0,0,0,0.02) 0%, var(--color-card) 40%)` | 极淡灰 |
| 排名圆徽章背景 | `linear-gradient(135deg, #c0c0c0, #a8a8a8)` | 银灰色渐变 |
| 排名圆徽章阴影 | `0 2px 8px rgba(0,0,0,0.12)` | |
| 排名数字 | `var(--color-text, #333)` 粗体 | |

```css
.rank-card--silver {
  border-left: 3px solid var(--color-border, #e8e0d8);
  background: linear-gradient(105deg, rgba(0,0,0,0.02) 0%, var(--color-card, #fff) 40%);
}

/* 排名 2 徽章 */
.rank-card--silver .rank-card__rank-num {
  background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
  color: var(--color-text, #333);
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
```

### 2.3 第 3 名 — 铜牌 🥉

| 属性 | 值 | 变量来源 |
|------|-----|----------|
| 卡片左边框 | `3px solid` 铜色调 | 使用 `var(--color-primary-light, #f5a885)` 或独立铜色 |
| 卡片背景 | `linear-gradient(105deg, rgba(232,102,62,0.04) 0%, var(--color-card) 40%)` | 极淡暖橙底 |
| 排名圆徽章背景 | `linear-gradient(135deg, #cd7f32, #b87333)` | 铜色渐变 |
| 排名圆徽章阴影 | `0 2px 8px rgba(184,115,51,0.25)` | |
| 排名数字 | `#fff` 粗体 | |

```css
.rank-card--bronze {
  border-left: 3px solid var(--color-primary-light, #f5a885);
  background: linear-gradient(105deg, rgba(232,102,62,0.04) 0%, var(--color-card, #fff) 40%);
}

.rank-card--bronze .rank-card__rank-num {
  background: linear-gradient(135deg, #cd7f32, #b87333);
  color: #fff;
  box-shadow: 0 2px 8px rgba(184,115,51,0.25);
}
```

### 2.4 第 4-20 名 — 普通排名

| 属性 | 值 |
|------|-----|
| 卡片左边框 | 无（保持默认 1px 全边框） |
| 卡片背景 | `var(--color-card, #fff)` |
| 排名圆徽章背景 | `var(--color-bg-secondary, #f5f0eb)` |
| 排名数字 | `var(--color-text-secondary, #666)`，字号 14px |
| 排名文字 | `#4`, `#5` ... `#20` |

### 2.5 TSX 端修改要点

`rankEmoji()` 函数改造：
```tsx
// 旧逻辑：return emoji 字符串
// 新逻辑：return JSX，包含 crown + medal 结构

const rankBadge = (rank: number) => {
  if (rank === 1) return (
    <div className="rank-card__badge">
      <span className="rank-card__rank-crown">♛</span>
      <span className="rank-card__rank-num rank-card__rank-num--gold">1</span>
    </div>
  )
  if (rank === 2) return (
    <div className="rank-card__badge">
      <span className="rank-card__rank-num rank-card__rank-num--silver">2</span>
    </div>
  )
  if (rank === 3) return (
    <div className="rank-card__badge">
      <span className="rank-card__rank-num rank-card__rank-num--bronze">3</span>
    </div>
  )
  return (
    <div className="rank-card__badge">
      <span className="rank-card__rank-num rank-card__rank-num--normal">#{rank}</span>
    </div>
  )
}
```

卡片 className 改造：
```tsx
// 旧: rank-card--top / rank-card--normal
// 新: rank-card--gold / rank-card--silver / rank-card--bronze / rank-card--normal
const cardClass = item.rank === 1 ? 'rank-card--gold'
  : item.rank === 2 ? 'rank-card--silver'
  : item.rank === 3 ? 'rank-card--bronze'
  : 'rank-card--normal'
```

---

## 3. 评分进度条方案

### 3.1 进度条颜色规格

使用现有 CSS 变量构建三段式渐变：

| 分数区间 | 颜色 | CSS 变量 |
|----------|------|----------|
| 0-3 分 | 暖灰 → 浅橙 | `var(--color-text-muted)` → `var(--color-primary-light)` |
| 3-4 分 | 浅橙 → 暖橙 | `var(--color-primary-light)` → `var(--color-primary)` |
| 4-5 分 | 暖橙 → 金色 | `var(--color-primary)` → `var(--color-star)` |

**实现方式**：单一渐变条，从左到右颜色过渡
```css
.rank-card__progress-bar {
  height: 4px;
  border-radius: 2px;
  background: var(--color-bg-secondary, #f5f0eb);
  overflow: hidden;
}

.rank-card__progress-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(
    90deg,
    var(--color-primary-light, #f5a885) 0%,
    var(--color-primary, #e8663e) 60%,
    var(--color-star, #f59e0b) 100%
  );
  /* width 由 JS 动态设置：percentage = (rating / 5) * 100 */
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

**动画效果**：
- 入场动画：进度条从 0 弹性过渡到目标宽度（`0.6s cubic-bezier(0.34, 1.56, 0.64, 1)`）
- 切换排序方式时触发重渲染，进度条重新播放入场动画

### 3.2 星级渲染方案

**方案选择：CSS + Unicode 纯文本渲染**（不依赖图片/字体图标，保证跨平台）

```
评分 4.2 → ★★★★☆  (4 实心 + 1 空心)
评分 3.8 → ★★★★☆  (四舍五入到整数星)
```

**CSS 实现**：
```css
.rank-card__stars {
  font-size: 13px;
  letter-spacing: 2px;
  color: var(--color-star, #f59e0b);
  line-height: 1;
  /* 文字内容由 JS 动态生成，如 "★★★★☆" */
}
```

**JS 端星级生成函数**：
```ts
function renderStars(rating: number): string {
  const full = Math.round(rating)  // 四舍五入
  const empty = 5 - full
  return '★'.repeat(full) + '☆'.repeat(empty)
}
```

### 3.3 进度条 + 星级组合布局

```
┌────────────────────────────────────┐
│  标题文字                          │
│  川菜 · 中等 · 30分钟              │  ← 元信息行
│  ████████████░░░░  4.2  ★★★★☆    │  ← 进度条 + 数值 + 星级
└────────────────────────────────────┘
```

```css
.rank-card__rating-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rank-card__progress-bar {
  flex: 1;
  max-width: 120px; /* 限制进度条最大宽度，避免过长 */
}

.rank-card__rating-value {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-primary, #e8663e);
  min-width: 28px;
  text-align: right;
}

.rank-card__stars {
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--color-star, #f59e0b);
  white-space: nowrap;
}
```

---

## 4. Hover 交互设计

### 4.1 卡片整体 hover

| 属性 | 正常态 | hover 态 | 过渡 |
|------|--------|----------|------|
| `transform` | `translateY(0)` | `translateY(-2px)` | `var(--transition-fast, 0.2s ease)` |
| `box-shadow` | `var(--shadow-sm)` 或无 | `var(--shadow-md, 0 4px 12px rgba(0,0,0,0.08))` | `var(--transition-fast, 0.2s ease)` |
| `border-color` | `var(--color-border)` | `var(--color-primary-light)` (仅普通卡片) | `var(--transition-fast)` |

```css
.rank-card {
  transition: transform var(--transition-fast, 0.2s ease),
              box-shadow var(--transition-fast, 0.2s ease),
              border-color var(--transition-fast, 0.2s ease);
}

.rank-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.08));
}

/* TOP3 hover 时阴影加强 */
.rank-card--gold:hover {
  box-shadow: 0 4px 20px rgba(245,158,11,0.2);
}

.rank-card--silver:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}

.rank-card--bronze:hover {
  box-shadow: 0 4px 16px rgba(184,115,51,0.2);
}
```

### 4.2 封面图 hover 放大

```css
.rank-card__cover-img {
  transition: transform var(--transition-fast, 0.2s ease);
}

.rank-card:hover .rank-card__cover-img {
  transform: scale(1.08);
}

.rank-card__cover-wrap {
  overflow: hidden; /* 确保放大不溢出 */
  border-radius: var(--radius-sm, 8px);
}
```

### 4.3 Touch 设备降级

```css
/* 移动端：禁用 hover 上浮，改用 :active 反馈 */
@media (max-width: 768px) {
  .rank-card:hover {
    transform: none;           /* 取消上浮 */
    box-shadow: none;          /* 取消阴影 */
  }

  .rank-card:active {
    transform: scale(0.98);   /* 点击时轻微缩小 */
    background: var(--color-bg-secondary, #f5f0eb); /* 点击底色变化 */
    transition: transform 0.1s ease;
  }

  .rank-card:hover .rank-card__cover-img {
    transform: none;           /* 取消封面放大 */
  }
}
```

---

## 5. 标签/元信息精简

### 5.1 合并方案

**旧结构（两行）**：
```
[川菜] 30分钟 中等        ← 第一行
春推荐 优质               ← 第二行
```

**新结构（一行）**：
```
川菜 · 中等 · 30分钟 · 春季
```

### 5.2 CSS 实现

```css
.rank-card__meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-muted, #999);
  white-space: nowrap;
  overflow: hidden;
}

.rank-card__meta-sep {
  color: var(--color-border, #e8e0d8);
  font-size: 10px;
  user-select: none;
}

/* 菜系标签：保留小徽章样式 */
.rank-card__meta-category {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: var(--color-tag-bg, #f0ebe6);
  color: var(--color-tag-text, #666);
}

/* 难度标签：文字色区分 */
.rank-card__meta-difficulty.easy { color: var(--color-success, #27ae60); }
.rank-card__meta-difficulty.medium { color: var(--color-warning, #f39c12); }
.rank-card__meta-difficulty.hard { color: var(--color-danger, #e74c3c); }
```

### 5.3 TSX 元信息渲染

```tsx
<div className="rank-card__meta-row">
  <span className="rank-card__meta-category">{item.category}</span>
  <span className="rank-card__meta-sep">·</span>
  <span className={`rank-card__meta-difficulty ${item.difficulty}`}>
    {DIFFICULTY_LABELS[item.difficulty] || item.difficulty}
  </span>
  <span className="rank-card__meta-sep">·</span>
  <span>{item.cookTime}分钟</span>
  {item.season && item.season !== 'all' && (
    <>
      <span className="rank-card__meta-sep">·</span>
      <span>{SEASON_LABELS[item.season] || item.season}季</span>
    </>
  )}
</div>
```

---

## 6. 移动端适配

### 6.1 断点策略

| 断点 | 卡片布局 | 封面尺寸 | 字号调整 |
|------|---------|---------|---------|
| `≤480px` | 紧凑单列 | 72×56px | 标题 14px，元信息 11px |
| `481-768px` | 标准单列 | 88×68px | 标题 15px，元信息 12px |
| `>768px` | 宽松单列 | 100×80px | 标题 15px，元信息 12px |

### 6.2 CSS 媒体查询

```css
/* ===== 移动端 (<480px) ===== */
@media (max-width: 480px) {
  .rankings-page {
    padding: 12px 8px 32px;
  }

  .rank-card {
    gap: 8px;
    padding: 8px 10px;
    min-height: 80px;
  }

  .rank-card__cover-wrap {
    width: 72px;
    height: 56px;
  }

  .rank-card__badge {
    min-width: 32px;
  }

  .rank-card__rank-num {
    width: 32px;
    height: 32px;
    font-size: 13px;
  }

  .rank-card__rank-crown {
    font-size: 11px;
    top: -6px;
  }

  .rank-card__title {
    font-size: 13px;
  }

  .rank-card__meta-row {
    font-size: 11px;
    gap: 4px;
  }

  .rank-card__progress-bar {
    max-width: 80px;
    height: 3px;
  }

  .rank-card__stars {
    font-size: 11px;
    letter-spacing: 1px;
  }

  .rank-card__rating-value {
    font-size: 12px;
  }

  /* 移动端隐藏统计区，信息更精简 */
  .rank-card__stats {
    display: none;
  }

  /* TOP3 左边框缩小 */
  .rank-card--gold,
  .rank-card--silver,
  .rank-card--bronze {
    border-left-width: 2px;
  }
}

/* ===== 平板 (<768px) ===== */
@media (min-width: 481px) and (max-width: 768px) {
  .rank-card__cover-wrap {
    width: 88px;
    height: 68px;
  }

  .rank-card__badge {
    min-width: 40px;
  }

  .rank-card__rank-num {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }

  .rank-card__progress-bar {
    max-width: 100px;
  }

  /* 平板保留简化统计区 */
  .rank-card__stats {
    min-width: 48px;
    padding-left: 8px;
  }

  .rank-card__stat-value--primary {
    font-size: 16px;
  }
}

/* ===== 桌面 (>768px) 保持现状增强 ===== */
@media (min-width: 769px) {
  .rank-card__progress-bar {
    max-width: 140px;
  }
}
```

### 6.3 Touch 交互适配

```css
/* 全局：禁用移动端 hover 效果 */
@media (hover: none) and (pointer: coarse) {
  .rank-card:hover {
    transform: none;
    box-shadow: none;
  }

  .rank-card:hover .rank-card__cover-img {
    transform: none;
  }

  /* 替代方案：active 态反馈 */
  .rank-card:active {
    transform: scale(0.98);
    background: var(--color-bg-secondary, #f5f0eb);
  }
}
```

---

## 7. TOP3 高亮边框/背景方案总结

### 7.1 三名独立视觉方案对比

| 特征 | 🥇 第 1 名 | 🥈 第 2 名 | 🥉 第 3 名 | #4-#20 |
|------|-----------|-----------|-----------|--------|
| 左边框 | 3px 金色 `var(--color-star)` | 3px 银灰 `var(--color-border)` | 3px 铜色 `var(--color-primary-light)` | 无 |
| 背景渐变 | 金色微光 → 白 | 极淡灰 → 白 | 暖橙微光 → 白 | 纯白 |
| 排名徽章 | 金色渐变 + 皇冠 | 银色渐变 | 铜色渐变 | 灰色圆 |
| 排名阴影 | 金色光晕 | 灰色微影 | 铜色微影 | 无 |
| 排名数字色 | `#fff` | `var(--color-text)` | `#fff` | `var(--color-text-secondary)` |
| hover 阴影 | 金色增强 | 灰色增强 | 铜色增强 | 默认 |

### 7.2 是否使用渐变

| 元素 | 使用渐变？ | 理由 |
|------|-----------|------|
| 排名徽章背景 | ✅ 是 | 金属质感需要渐变体现 |
| 卡片背景 | ✅ 是（微光渐变） | TOP3 需要微妙区分，渐变到卡片白色自然过渡 |
| 左边框 | ❌ 否 | 纯色边框更干净，渐变边框跨浏览器兼容性差 |
| 进度条填充 | ✅ 是 | 从浅橙 → 暖橙 → 金色，视觉引导评分高低 |
| 卡片阴影 | ❌ 否 | 统一使用 `box-shadow`，TOP3 仅调整颜色和扩散半径 |

### 7.3 暗色模式覆写

```css
body.dark .rank-card--gold {
  background: linear-gradient(105deg, rgba(245,158,11,0.08) 0%, var(--color-card, #222) 40%);
  border-left-color: var(--color-star, #f59e0b);
  box-shadow: 0 2px 16px rgba(245,158,11,0.08);
}

body.dark .rank-card--silver {
  background: linear-gradient(105deg, rgba(255,255,255,0.03) 0%, var(--color-card, #222) 40%);
  border-left-color: var(--color-border, #3a3530);
}

body.dark .rank-card--bronze {
  background: linear-gradient(105deg, rgba(232,102,62,0.06) 0%, var(--color-card, #222) 40%);
  border-left-color: var(--color-primary-light, #f5a885);
}

body.dark .rank-card__rank-num--normal {
  background: var(--color-card, #222);
  color: var(--color-text-muted, #888);
}

body.dark .rank-card__progress-bar {
  background: rgba(255,255,255,0.08);
}
```

---

## 8. 实施顺序建议

| 阶段 | 改动内容 | 预计工作量 |
|------|---------|-----------|
| P0 | TSX 端 rankBadge 改造 + cardClass 拆分 | 30min |
| P0 | CSS：rank-card 布局重构（cover 100×80、info flex column） | 45min |
| P0 | CSS：TOP3 独立样式（.rank-card--gold/silver/bronze） | 30min |
| P1 | CSS + TSX：元信息合并单行 | 20min |
| P1 | CSS + TSX：评分进度条 + 星级 | 30min |
| P1 | CSS：hover 交互增强 | 15min |
| P2 | CSS：移动端响应式适配 | 30min |
| P2 | CSS：暗色模式覆写 | 20min |
| P3 | 骨架屏适配新布局 | 20min |

---

## 9. 附录：完整卡片布局线框图

```
┌──────────────────────────────────────────────────────────────┐
│ 🥇 GOLD CARD                                                │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ ♛                                                        │ │
│ │ ┌────┐  ┌──────────┐  ┌────────────────────────────────┐ │ │
│ │ │ ①  │  │  封面图   │  │  红烧肉（标题 15px 粗体）      │ │ │
│ │ │    │  │ 100×80   │  │  川菜 · 中等 · 45分钟 · 冬季   │ │ │
│ │ └────┘  │          │  │  ████████████░░░ 4.2 ★★★★☆    │ │ │
│ │         └──────────┘  └────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────┘ │
│ 3px gold left border + subtle gold gradient bg               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 🥈 SILVER CARD                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ ┌────┐  ┌──────────┐  ┌────────────────────────────────┐ │ │
│ │ │ ②  │  │  封面图   │  │  清蒸鲈鱼                      │ │ │
│ │ │    │  │ 100×80   │  │  粤菜 · 简单 · 20分钟 · 春季   │ │ │
│ │ └────┘  │          │  │  ██████████░░░░░ 4.0 ★★★★☆    │ │ │
│ │         └──────────┘  └────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────┘ │
│ 3px silver left border + subtle gray bg                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 🥉 BRONZE CARD                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ ┌────┐  ┌──────────┐  ┌────────────────────────────────┐ │ │
│ │ │ ③  │  │  封面图   │  │  麻婆豆腐                      │ │ │
│ │ ││ │    │  │ 100×80   │  │  川菜 · 困难 · 30分钟          │ │ │
│ │ └────┘  │          │  │  ██████████░░░░░ 3.8 ★★★★☆    │ │ │
│ │         └──────────┘  └────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────┘ │
│ 3px bronze left border + subtle warm bg                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ #4 NORMAL CARD                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ ┌────┐  ┌──────────┐  ┌────────────────────────────────┐ │ │
│ │ │ #4 │  │  封面图   │  │  宫保鸡丁                      │ │ │
│ │ │    │  │ 100×80   │  │  川菜 · 中等 · 25分钟 · 全年   │ │ │
│ │ └────┘  │          │  │  █████████░░░░░ 3.5 ★★★☆☆    │ │ │
│ │         └──────────┘  └────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────┘ │
│ 1px default border, white bg                                 │
└──────────────────────────────────────────────────────────────┘
```

---

*本文档为设计方案，不涉及代码修改。实施时请严格按照 DESIGN_RULES.md 约束执行。*
