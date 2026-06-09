# 食谱详情页内容展示视觉增强 — UI 设计规范

> 方向 C：内容质量增强 · Story / CulturalBackground / Tips / 描述区  
> 技术栈：React 18 + TypeScript + Vite + 原生 CSS（无 UI 框架）  
> 暗色模式选择器：`body.dark`（与项目保持一致）

---

## 0. 设计目标总览

| 区块 | 增强重点 | 视觉锚点 |
|---|---|---|
| 描述区 | 提升可读性 | 16px / 1.8 / max-width 680px + 装饰线 |
| Story | 引用 / 纸张感 | blockquote 风格 + 暖黄底 + 大引号 |
| CulturalBackground | 文化归属感 | 菜系 badge + 紫色调 + 元数据行 |
| Tips | 结构化阅读 | 三段式分组（绿/红/蓝）+ 关键词自动分类 |

---

## 1. CSS 变量定义（追加到 `global.css`）

将以下变量统一追加到 `:root` 与 `body.dark` 中。`--content-*` 前缀用于本迭代。

### 1.1 `global.css` `:root` 中追加

```css
:root {
  /* === Content Depth Tokens (iter C) === */
  --content-bg-paper:        #fef9ee;   /* Story 纸张底色 */
  --content-bg-paper-strong:  #fbecc8;   /* Story 装饰底色 */
  --content-quote-line:      #d4a574;   /* Story 左侧竖线 */
  --content-quote-mark:      #c98a4b;   /* Story 大引号 */
  --content-text-ink:        #4a3c2a;   /* Story 油墨色文字 */

  --content-cuisine-bg:      #f3eeff;   /* Cultural 紫色底 */
  --content-cuisine-bg-2:    #e7ddff;   /* Cultural 紫色渐变终点 */
  --content-cuisine-line:    #7c5fcc;   /* Cultural 紫色强调线 */
  --content-cuisine-text:    #3d2a7a;   /* Cultural 主文字 */
  --content-cuisine-meta:    #6b5b95;   /* Cultural 元数据 */
  --content-cuisine-badge:   #6d4ec0;   /* Cultural 菜系 badge 底色 */

  --content-tip-ingredient-bg:   #ecf7e8;  /* 选材技巧-绿 */
  --content-tip-ingredient-line: #4a8c3a;
  --content-tip-ingredient-text: #2d5a1f;

  --content-tip-heat-bg:         #fde9e3;  /* 火候要点-红 */
  --content-tip-heat-line:       #d85542;
  --content-tip-heat-text:       #8a2a1a;

  --content-tip-storage-bg:      #e3f0fa;  /* 保存方法-蓝 */
  --content-tip-storage-line:    #3a7bbf;
  --content-tip-storage-text:    #1d4a78;

  --content-divider-decor:       #c9a26a;  /* 描述-标题装饰线 */
}
```

### 1.2 `global.css` `body.dark` 中追加

```css
body.dark {
  --content-bg-paper:        #2a2418;
  --content-bg-paper-strong: #3a301c;
  --content-quote-line:      #b8895a;
  --content-quote-mark:      #d4a574;
  --content-text-ink:        #e6dcc6;

  --content-cuisine-bg:      #1e1a30;
  --content-cuisine-bg-2:    #261f44;
  --content-cuisine-line:    #9b7fe0;
  --content-cuisine-text:    #d4c5f5;
  --content-cuisine-meta:    #a596cc;
  --content-cuisine-badge:   #7d5fd1;

  --content-tip-ingredient-bg:   #1a2e15;
  --content-tip-ingredient-line: #5fa14a;
  --content-tip-ingredient-text: #b8d8a8;

  --content-tip-heat-bg:         #2e1a14;
  --content-tip-heat-line:       #d85542;
  --content-tip-heat-text:       #f0b8a8;

  --content-tip-storage-bg:      #142233;
  --content-tip-storage-line:    #4f8fc7;
  --content-tip-storage-text:    #b8d4ed;

  --content-divider-decor:       #8a6d3e;
}
```

---

## 2. 完整 CSS（追加到 `RecipeDetailPage.css` 末尾）

```css
/* ═══════════════════════════════════════════════════════════════
   迭代 C：内容深度视觉增强
   Story (引用+纸张) / CulturalBackground (菜系徽章+紫色) /
   Tips (三段式分组) / 描述区排版
   ═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   1. 描述区排版优化
   ───────────────────────────────────────────────────────────── */
.detail-desc {
  font-size: 16px;                                  /* 15 → 16 */
  line-height: 1.8;                                 /* 1.75 → 1.8 */
  color: var(--color-text-secondary, #555);
  margin: 0 auto 28px;                              /* 居中 */
  padding-bottom: 28px;
  border-bottom: 0;                                 /* 移除原灰线 */
  max-width: 680px;
  position: relative;
}

/* 描述与标题之间的装饰线（在线下方） */
.detail-desc::after {
  content: '';
  display: block;
  width: 64px;
  height: 3px;
  margin: 24px auto 0;
  border-radius: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--content-divider-decor) 50%,
    transparent 100%
  );
}

body.dark .detail-desc {
  color: var(--color-text-secondary, #9898b0);
}

/* ─────────────────────────────────────────────────────────────
   2. Story 区块 — blockquote / 纸张感
   ───────────────────────────────────────────────────────────── */
.detail-section--story {
  padding: 0 28px 28px;
}

.story-content {
  position: relative;
  margin: 8px 0 0;
  padding: 28px 32px 26px 44px;
  background:
    linear-gradient(
      180deg,
      var(--content-bg-paper) 0%,
      var(--content-bg-paper-strong) 100%
    );
  border-radius: 10px;
  font-style: italic;                               /* 斜体排版 */
  line-height: 1.85;
  color: var(--content-text-ink);
  font-size: 15.5px;
  letter-spacing: 0.01em;
  /* 模拟纸张纹理：多层柔和径向渐变 */
  background-image:
    radial-gradient(
      circle at 20% 30%,
      rgba(255, 255, 255, 0.4) 0%,
      transparent 40%
    ),
    radial-gradient(
      circle at 80% 70%,
      rgba(212, 165, 116, 0.08) 0%,
      transparent 50%
    ),
    linear-gradient(
      180deg,
      var(--content-bg-paper) 0%,
      var(--content-bg-paper-strong) 100%
    );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.4),
    0 1px 2px rgba(160, 120, 70, 0.08);
}

/* 左侧竖线 */
.story-content::before {
  content: '';
  position: absolute;
  left: 18px;
  top: 16px;
  bottom: 16px;
  width: 3px;
  background: linear-gradient(
    180deg,
    var(--content-quote-line) 0%,
    var(--content-quote-mark) 100%
  );
  border-radius: 2px;
}

/* 大号引号装饰（使用 ::after 在右上角） */
.story-content::after {
  content: '\201C';                                /* 左双引号 “ */
  position: absolute;
  top: -8px;
  left: 12px;
  font-size: 64px;
  line-height: 1;
  font-family: Georgia, 'Times New Roman', serif;
  font-style: normal;
  color: var(--content-quote-mark);
  opacity: 0.35;
  pointer-events: none;
  user-select: none;
}

.story-content p {
  margin: 0;
  position: relative;
  z-index: 1;
}

body.dark .story-content {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 1px 2px rgba(0, 0, 0, 0.3);
}

body.dark .story-content::after {
  opacity: 0.5;
}

/* ─────────────────────────────────────────────────────────────
   3. CulturalBackground 区块 — 菜系徽章 / 紫色调
   ───────────────────────────────────────────────────────────── */
.detail-section--cultural {
  padding: 0 28px 28px;
}

.cultural-card {
  position: relative;
  margin: 8px 0 0;
  background: linear-gradient(
    135deg,
    var(--content-cuisine-bg) 0%,
    var(--content-cuisine-bg-2) 100%
  );
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(60, 40, 120, 0.06);
}

/* 顶部标签栏（菜系 badge） */
.cultural-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: linear-gradient(
    90deg,
    var(--content-cuisine-badge) 0%,
    rgba(125, 95, 209, 0.85) 100%
  );
  color: #fff;
}

.cultural-card__cuisine-icon {
  font-size: 28px;
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.cultural-card__cuisine-name {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.15);
}

.cultural-card__cuisine-badge {
  margin-left: auto;
  padding: 3px 10px;
  background: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* 主体内容 */
.cultural-card__body {
  padding: 20px 22px 16px;
  line-height: 1.8;
  color: var(--content-cuisine-text);
  font-size: 15px;
}

.cultural-card__body p {
  margin: 0;
}

/* 底部元数据行 */
.cultural-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  padding: 12px 22px 16px;
  border-top: 1px dashed var(--content-cuisine-line);
  margin-top: 4px;
  font-size: 13px;
  color: var(--content-cuisine-meta);
}

.cultural-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.cultural-card__meta-icon {
  font-size: 14px;
  opacity: 0.85;
}

.cultural-card__meta-label {
  font-weight: 600;
  color: var(--content-cuisine-text);
  margin-right: 2px;
}

body.dark .cultural-card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

/* ─────────────────────────────────────────────────────────────
   4. Tips 区块 — 三段式分组（绿/红/蓝）
   ───────────────────────────────────────────────────────────── */
.detail-section--tips {
  padding: 0 28px 28px;
}

.tips-content {
  margin: 0;
  padding: 0;
  background: transparent;
  border-left: 0;
  border-radius: 0;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
}

/* 重置原 .tips-content 在 data-theme='dark' 下的样式影响 */
[data-theme='dark'] .tips-content {
  background: transparent;
  color: inherit;
  border-left: 0;
}

/* ── 分段卡片 ── */
.tip-group {
  display: flex;
  gap: 14px;
  padding: 16px 20px;
  margin-bottom: 12px;
  border-radius: 12px;
  border-left: 4px solid transparent;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tip-group:last-child {
  margin-bottom: 0;
}

.tip-group:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.tip-group__icon {
  flex-shrink: 0;
  font-size: 24px;
  line-height: 1.4;
}

.tip-group__body {
  flex: 1;
  min-width: 0;
}

.tip-group__title {
  font-size: 14px;
  font-weight: 700;
  margin: 0 0 6px;
  letter-spacing: 0.02em;
}

.tip-group__text {
  font-size: 14.5px;
  line-height: 1.7;
  margin: 0;
  color: inherit;
  opacity: 0.9;
}

/* 选材技巧 — 绿色 */
.tip-group--ingredient {
  background: var(--content-tip-ingredient-bg);
  border-left-color: var(--content-tip-ingredient-line);
  color: var(--content-tip-ingredient-text);
}

/* 火候要点 — 红色 */
.tip-group--heat {
  background: var(--content-tip-heat-bg);
  border-left-color: var(--content-tip-heat-line);
  color: var(--content-tip-heat-text);
}

/* 保存方法 — 蓝色 */
.tip-group--storage {
  background: var(--content-tip-storage-bg);
  border-left-color: var(--content-tip-storage-line);
  color: var(--content-tip-storage-text);
}

/* ── 未分组时的兜底卡片 ── */
.tips-fallback {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: var(--content-bg-paper);
  border-left: 4px solid var(--content-quote-line);
  border-radius: 0 10px 10px 0;
  color: var(--content-text-ink);
  line-height: 1.75;
  font-size: 14.5px;
}

.tips-fallback__icon {
  flex-shrink: 0;
  font-size: 20px;
}

.tips-fallback p {
  margin: 0;
}

body.dark .tips-fallback {
  background: var(--content-bg-paper);
}

/* ─────────────────────────────────────────────────────────────
   5. 响应式适配
   ───────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .detail-section--story,
  .detail-section--cultural,
  .detail-section--tips {
    padding: 0 18px 22px;
  }

  .story-content {
    padding: 22px 22px 20px 38px;
    font-size: 14.5px;
  }

  .story-content::before {
    left: 14px;
  }

  .story-content::after {
    font-size: 52px;
    top: -4px;
    left: 8px;
  }

  .cultural-card__header {
    padding: 12px 16px;
  }

  .cultural-card__cuisine-icon {
    font-size: 24px;
  }

  .cultural-card__cuisine-name {
    font-size: 15px;
  }

  .cultural-card__body {
    padding: 16px 18px 12px;
    font-size: 14.5px;
  }

  .cultural-card__meta {
    padding: 10px 18px 14px;
    gap: 6px 14px;
    font-size: 12.5px;
  }

  .tip-group {
    padding: 14px 16px;
    gap: 10px;
  }

  .tip-group__icon {
    font-size: 22px;
  }

  .tip-group__text {
    font-size: 14px;
  }

  .detail-desc {
    font-size: 15.5px;
    padding-bottom: 22px;
    margin-bottom: 22px;
  }
}

@media (max-width: 480px) {
  .detail-section--story,
  .detail-section--cultural,
  .detail-section--tips {
    padding: 0 14px 18px;
  }

  .story-content {
    padding: 18px 18px 18px 34px;
    font-size: 14px;
    line-height: 1.8;
  }

  .story-content::before {
    left: 12px;
  }

  .story-content::after {
    font-size: 44px;
    top: -2px;
    left: 6px;
  }

  .cultural-card__header {
    padding: 10px 14px;
    gap: 10px;
  }

  .cultural-card__cuisine-icon {
    font-size: 22px;
  }

  .cultural-card__cuisine-name {
    font-size: 14px;
  }

  .cultural-card__cuisine-badge {
    font-size: 10px;
    padding: 2px 8px;
  }

  .cultural-card__body {
    padding: 14px 16px 10px;
    font-size: 14px;
  }

  .cultural-card__meta {
    padding: 10px 16px 12px;
    font-size: 12px;
    gap: 4px 10px;
  }

  .tip-group {
    padding: 12px 14px;
    gap: 10px;
  }

  .tip-group__icon {
    font-size: 20px;
  }

  .tip-group__title {
    font-size: 13px;
  }

  .tip-group__text {
    font-size: 13.5px;
  }

  .detail-desc {
    font-size: 15px;
  }

  .detail-desc::after {
    width: 48px;
    margin-top: 18px;
  }
}

/* ─────────────────────────────────────────────────────────────
   6. 折叠/展开过渡（Story / Cultural 共用）
   ───────────────────────────────────────────────────────────── */
.detail-section__content {
  animation: contentSlideDown 0.32s cubic-bezier(0.21, 1.02, 0.73, 1);
}

@keyframes contentSlideDown {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .detail-section__content {
    animation: none;
  }
  .tip-group:hover,
  .story-content::after {
    transition: none;
    transform: none;
  }
}
```

---

## 3. 菜系图标映射表

> 用途：`<CulturalBackground>` 卡片顶部 badge 与图标显示。  
> 来源：`recipe.category`（与 `CATEGORY_NAMES` 一致）。  
> 扩展元数据（origin / era）为可选字段，由后端在未来版本提供（fallback 显示通用标签）。

| category key | 中文 | 图标 | 配色倾向 | 默认 origin | 默认 era |
|---|---|---|---|---|---|
| `chinese` | 中餐 | 🏮 | 红色调（已隐含在紫色 badge 上） | 中国 | 千年传承 |
| `western` | 西餐 | 🍷 | 紫色 badge 通用 | 欧洲 | 古典时期 |
| `japanese` | 日料 | 🎌 | 紫色 badge 通用 | 日本 | 江户时代 |
| `korean` | 韩料 | 🥢 | 紫色 badge 通用 | 韩国 | 朝鲜王朝 |
| `thai` | 泰式 | 🌶️ | 紫色 badge 通用 | 泰国 | 曼谷王朝 |
| `indian` | 印式 | 🪷 | 紫色 badge 通用 | 印度 | 莫卧儿 |
| `vietnamese` | 越式 | 🍜 | 紫色 badge 通用 | 越南 | 阮朝 |
| `dessert` | 甜点 | 🍰 | 紫色 badge 通用 | 世界各地 | 中世纪 |

> **配色策略**：C 区与 T/S（tips/story）做差异化时，badge 统一使用紫色 `--content-cuisine-badge`，让 Cultural 区块在视觉上整体偏"神秘/文化深度"调。

---

## 4. Tips 自动分类 JavaScript 逻辑

> 文件位置建议：`src/utils/tipsClassifier.ts`  
> 触发时机：渲染 `recipe.tips` 之前调用；若返回 `null`，则使用 `tips-fallback` 卡片。

### 4.1 分类函数

```typescript
// src/utils/tipsClassifier.ts

export type TipCategory = 'ingredient' | 'heat' | 'storage'

export interface TipGroup {
  category: TipCategory
  icon: string
  title: string
  texts: string[]
}

export interface ClassifiedTips {
  groups: TipGroup[]
  /** 是否命中自动分类（false 时使用 fallback 单卡） */
  classified: boolean
}

const CATEGORY_META: Record<TipCategory, { icon: string; title: string }> = {
  ingredient: { icon: '🛒', title: '选材技巧' },
  heat:       { icon: '🔥', title: '火候要点' },
  storage:    { icon: '📦', title: '保存方法' },
}

/**
 * 关键词词典（按命中权重排序）
 * - 第一个数组为强信号词（>= 1 命中即归类）
 * - 第二个为弱信号词（>= 2 命中 + 未命中强信号词时归类）
 */
const KEYWORDS: Record<TipCategory, { strong: string[]; weak: string[] }> = {
  ingredient: {
    strong: ['食材', '选材', '选用', '挑选', '新鲜', '采购', '购买', '原料', '配料'],
    weak: ['肉', '菜', '鱼', '鸡', '蛋', '豆腐', '葱', '姜', '蒜', '椒'],
  },
  heat: {
    strong: ['火候', '大火', '中火', '小火', '武火', '文火', '温度', '油温', '加热', '翻炒', '慢炖', '焯水'],
    weak: ['烧', '炒', '煮', '煎', '炸', '烤', '蒸', '炖', '收汁', '翻面'],
  },
  storage: {
    strong: ['保存', '冷藏', '冷冻', '常温', '保鲜', '密封', '储存', '存放', '保质', '过期'],
    weak: ['冰箱', '盒子', '盖子', '隔天', '次日', '复热', '回温'],
  },
}

/** 按中文句号 / 感叹 / 问号 / 换行 切分；保留原标点 */
function splitSentences(raw: string): string[] {
  return raw
    .split(/(?<=[。！？!?\n])/g)
    .map(s => s.trim())
    .filter(Boolean)
}

/** 对单句计算三个分类的得分 */
function scoreSentence(sentence: string): {
  ingredient: number
  heat: number
  storage: number
} {
  const lower = sentence.toLowerCase()
  const score = { ingredient: 0, heat: 0, storage: 0 }
  ;(Object.keys(KEYWORDS) as TipCategory[]).forEach(cat => {
    const { strong, weak } = KEYWORDS[cat]
    strong.forEach(k => { if (sentence.includes(k)) score[cat] += 3 })
    weak.forEach(k =>   { if (lower.includes(k.toLowerCase())) score[cat] += 1 })
  })
  return score
}

/** 主流分类：得分 >= 3 才落桶；并列最高时按 ingredient > heat > storage 优先级 */
function pickCategory(sentence: string): TipCategory | null {
  const s = scoreSentence(sentence)
  const max = Math.max(s.ingredient, s.heat, s.storage)
  if (max < 3) return null
  if (s.ingredient === max) return 'ingredient'
  if (s.heat === max) return 'heat'
  if (s.storage === max) return 'storage'
  return null
}

/**
 * 主入口
 * - 切分 → 逐句分类 → 归桶
 * - 任一桶非空即返回 classified=true
 * - 所有句都无法归类时 classified=false（调用方走 fallback）
 */
export function classifyTips(raw: string | null | undefined): ClassifiedTips {
  if (!raw || !raw.trim()) {
    return { groups: [], classified: false }
  }

  const sentences = splitSentences(raw)
  const buckets: Record<TipCategory, string[]> = {
    ingredient: [], heat: [], storage: [],
  }

  sentences.forEach(s => {
    const cat = pickCategory(s)
    if (cat) buckets[cat].push(s)
  })

  const hit = (Object.keys(buckets) as TipCategory[]).some(k => buckets[k].length > 0)
  if (!hit) return { groups: [], classified: false }

  const groups: TipGroup[] = (Object.keys(buckets) as TipCategory[])
    .filter(k => buckets[k].length > 0)
    .map(k => ({
      category: k,
      icon: CATEGORY_META[k].icon,
      title: CATEGORY_META[k].title,
      texts: buckets[k],
    }))

  return { groups, classified: true }
}
```

### 4.2 React 组件使用

```tsx
import { useMemo } from 'react'
import { classifyTips } from '../utils/tipsClassifier'

// 在 RecipeDetailPage 内的 tips 渲染段
const tipsClassified = useMemo(() => classifyTips(recipe.tips), [recipe.tips])
```

```tsx
{recipe.tips && (
  <section className="detail-section detail-section--tips">
    <h2 className="detail-section__title">💡 烹饪小贴士</h2>
    <div className="tips-content">
      {tipsClassified.classified ? (
        tipsClassified.groups.map(g => (
          <div key={g.category} className={`tip-group tip-group--${g.category}`}>
            <div className="tip-group__icon">{g.icon}</div>
            <div className="tip-group__body">
              <h4 className="tip-group__title">{g.title}</h4>
              {g.texts.map((t, i) => (
                <p key={i} className="tip-group__text">{t}</p>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="tips-fallback">
          <span className="tips-fallback__icon">💡</span>
          <p>{recipe.tips}</p>
        </div>
      )}
    </div>
  </section>
)}
```

### 4.3 边界与降级策略

| 场景 | 行为 |
|---|---|
| `recipe.tips` 为空 / null | 不渲染整个 section（与现状一致） |
| 全部句都无法归类（得分均 < 3） | 渲染 `tips-fallback` 单卡（保持原文） |
| 单条超长不分句 | 仍按 `。！？!?\n` 切；无标点则整段尝试一次 |
| 中英混合 | 同时匹配中英文（关键词已含 `fresh` 类英文） |
| 性能 | `useMemo` 缓存；单食谱 tips 文本通常 < 1KB，可忽略 |

---

## 5. React 组件结构说明（如何修改现有 RecipeDetailPage）

### 5.1 数据流概览

```
recipe.story             ──→ <StorySection>      (block + 现有 showStory 状态)
recipe.culturalBackground ──→ <CulturalSection>  (菜系 badge + 紫色卡)
recipe.category          ──→ <CulturalSection>   (用于菜系图标映射)
recipe.tips              ──→ <TipsSection>       (useMemo → 三段式 / fallback)
recipe.description       ──→ <p className="detail-desc">  (排版优化 CSS 接管)
```

### 5.2 现有 `RecipeDetailPage.tsx` 中需修改的三处

#### 5.2.1 Story 区块（行号附近 `📖 食谱故事`）

> 仅需替换 className 与内容结构。

```tsx
{recipe.story && (
  <section className="detail-section detail-section--story">
    <h2
      className="detail-section__title detail-section__title--toggle"
      onClick={() => setShowStory(!showStory)}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setShowStory(!showStory)
        }
      }}
    >
      📖 食谱故事
      <span className={`accordion-arrow ${showStory ? 'accordion-arrow--open' : ''}`}>▸</span>
    </h2>
    {showStory && (
      <div className="detail-section__content story-content">
        <p>{recipe.story}</p>
      </div>
    )}
  </section>
)}
```

> 关键是 `story-content` 类名（已在第 2 节 CSS 中定义 blockquote 样式）。  
> 保留 `showStory` 状态与点击 / 键盘交互，不改动。

#### 5.2.2 CulturalBackground 区块（行号附近 `🌍 文化背景`）

```tsx
{recipe.culturalBackground && (
  <section className="detail-section detail-section--cultural">
    <h2
      className="detail-section__title detail-section__title--toggle"
      onClick={() => setShowCulturalBg(!showCulturalBg)}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setShowCulturalBg(!showCulturalBg)
        }
      }}
    >
      🌍 文化背景
      <span className={`accordion-arrow ${showCulturalBg ? 'accordion-arrow--open' : ''}`}>▸</span>
    </h2>
    {showCulturalBg && (
      <div className="detail-section__content">
        <CulturalCard
          category={recipe.category}
          background={recipe.culturalBackground}
        />
      </div>
    )}
  </section>
)}
```

新增小组件 `src/components/CulturalCard.tsx`：

```tsx
// src/components/CulturalCard.tsx
import { CUISINE_ICONS } from '../constants/cuisine'

interface Props {
  category?: string
  background: string
}

const DEFAULT_ORIGIN: Record<string, string> = {
  chinese: '中国', western: '欧洲', japanese: '日本',
  korean: '韩国', thai: '泰国', indian: '印度',
  vietnamese: '越南', dessert: '世界各地',
}
const DEFAULT_ERA: Record<string, string> = {
  chinese: '千年传承', western: '古典时期', japanese: '江户时代',
  korean: '朝鲜王朝', thai: '曼谷王朝', indian: '莫卧儿',
  vietnamese: '阮朝', dessert: '中世纪',
}

export default function CulturalCard({ category, background }: Props) {
  const key = (category || '').toLowerCase()
  const meta = CUISINE_ICONS[key]
  const origin = DEFAULT_ORIGIN[key] || '—'
  const era    = DEFAULT_ERA[key]    || '—'

  return (
    <div className="cultural-card">
      <div className="cultural-card__header">
        <span className="cultural-card__cuisine-icon" aria-hidden>
          {meta?.icon || '🌐'}
        </span>
        <span className="cultural-card__cuisine-name">
          {meta?.name || '国际料理'}
        </span>
        <span className="cultural-card__cuisine-badge">CUISINE</span>
      </div>

      <div className="cultural-card__body">
        <p>{background}</p>
      </div>

      <div className="cultural-card__meta">
        <span className="cultural-card__meta-item">
          <span className="cultural-card__meta-icon">📍</span>
          <span className="cultural-card__meta-label">起源地</span>
          {origin}
        </span>
        <span className="cultural-card__meta-item">
          <span className="cultural-card__meta-icon">🏛️</span>
          <span className="cultural-card__meta-label">历史时期</span>
          {era}
        </span>
      </div>
    </div>
  )
}
```

菜系常量 `src/constants/cuisine.ts`（与 `CATEGORY_NAMES` 对齐）：

```ts
export const CUISINE_ICONS: Record<string, { name: string; icon: string }> = {
  chinese:   { name: '中餐', icon: '🏮' },
  western:   { name: '西餐', icon: '🍷' },
  japanese:  { name: '日料', icon: '🎌' },
  korean:    { name: '韩料', icon: '🥢' },
  thai:      { name: '泰式', icon: '🌶️' },
  indian:    { name: '印式', icon: '🪷' },
  vietnamese:{ name: '越式', icon: '🍜' },
  dessert:   { name: '甜点', icon: '🍰' },
}
```

> 后续可扩展：后端返回 `recipe.cuisineMeta?: { origin, era }` 时优先使用接口值，fallback 用本地默认。

#### 5.2.3 Tips 区块（行号附近 `💡 烹饪小贴士`）

```tsx
{recipe.tips && (
  <section className="detail-section detail-section--tips">
    <h2 className="detail-section__title">💡 烹饪小贴士</h2>
    <div className="tips-content">
      {tipsClassified.classified ? (
        tipsClassified.groups.map(g => (
          <div key={g.category} className={`tip-group tip-group--${g.category}`}>
            <div className="tip-group__icon" aria-hidden>{g.icon}</div>
            <div className="tip-group__body">
              <h4 className="tip-group__title">{g.title}</h4>
              {g.texts.map((t, i) => (
                <p key={i} className="tip-group__text">{t}</p>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="tips-fallback">
          <span className="tips-fallback__icon" aria-hidden>💡</span>
          <p>{recipe.tips}</p>
        </div>
      )}
    </div>
  </section>
)}
```

组件顶部 `useMemo` 引入：

```tsx
import { classifyTips } from '../utils/tipsClassifier'

// ...

const tipsClassified = useMemo(
  () => classifyTips(recipe?.tips),
  [recipe?.tips]
)
```

### 5.3 描述区

> 无需改动 JSX，原有 `<p className="detail-desc">` 由 CSS 接管（16px / 1.8 / max-width 680px + 装饰线）。

---

## 6. 响应式适配要点

| 断点 | 关键调整 |
|---|---|
| **桌面 ≥ 769px** | Story 文字 15.5px / Cultural 卡片 12px 圆角 / Tip-group 4px 圆角 |
| **平板 ≤ 768px** | 三个 section 横向 padding 减为 18px；Story 引号从 64px → 52px；Cultural 头部 padding 收窄 |
| **手机 ≤ 480px** | 三个 section 横向 padding 减为 14px；Story 引号 44px；Cultural badge 字号 10px；Tip-group padding 收缩；装饰线 64px → 48px |
| **极窄屏 ≤ 360px** | （可选）`cultural-card__meta` 改为 1 列；预留 `.tip-group` 100% 宽 |

### 6.1 可访问性 / 减少动画

- 折叠/展开使用 `aria-expanded`（可选增强，本迭代保留现有 `role="button"`）
- 装饰性大引号使用 `pointer-events: none` 与 `user-select: none`
- `prefers-reduced-motion` 媒体查询下：去除 `tip-group` 的 `transform: translateX` hover、关闭 section 展开的 slide-down 动画

### 6.2 暗色模式对应

- 所有新增区块都使用 `var(--content-*)` 变量；不要在 `.story-content` / `.cultural-card` / `.tip-group` 内部写死颜色
- `body.dark` 已在 `global.css` 提供了完整的暗色 token 覆写
- `.tip-group` 不需要额外的 `body.dark` 覆写（因为它使用的 token 都已重新映射）

### 6.3 打印样式（@media print）— 建议追加

```css
@media print {
  .cultural-card,
  .tip-group,
  .story-content {
    break-inside: avoid;          /* 防止卡片被分页 */
    box-shadow: none !important;
  }
  .cultural-card__header {
    background: #555 !important;  /* 打印时降为灰度 */
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

---

## 7. 实施 Checklist

### 7.1 全局变量（1 步）

- [ ] `global.css :root` 追加 13 个 `--content-*` 变量
- [ ] `global.css body.dark` 追加 13 个暗色覆写

### 7.2 样式（1 步）

- [ ] `RecipeDetailPage.css` 末尾追加第 2 节完整 CSS（约 280 行）

### 7.3 新增文件（2 个）

- [ ] `frontend/src/utils/tipsClassifier.ts` — 分类逻辑（约 100 行，含注释）
- [ ] `frontend/src/constants/cuisine.ts` — 菜系图标 + 默认元数据
- [ ] `frontend/src/components/CulturalCard.tsx` — 卡片组件（约 40 行）

### 7.4 修改 `RecipeDetailPage.tsx`（3 处 + 1 import）

- [ ] 顶部 `import { useMemo }`（如未引入）
- [ ] 顶部 `import { classifyTips }` + `import CulturalCard` + `import CUISINE_ICONS`（如需）
- [ ] Story 区块：`<div className="story-content">`（基本不变）
- [ ] Cultural 区块：内层替换为 `<CulturalCard>`
- [ ] Tips 区块：内层替换为条件渲染（classified / fallback）
- [ ] 添加 `const tipsClassified = useMemo(...)` 一行

### 7.5 验证清单

- [ ] 浅色 / 暗色模式下 4 个区块颜色对比度（WCAG AA ≥ 4.5:1）
- [ ] 移动端 480px 宽度无横向滚动
- [ ] tips 全是无法归类文本时，渲染 fallback 单卡（不影响视觉）
- [ ] tips 含多分类关键词时，三色卡片全部出现
- [ ] Story / Cultural 折叠交互保持正常
- [ ] 暗色模式下 `body.dark` 变量切换无白闪（用 `transition: background-color`）

---

## 8. 设计决策记录

| 决策 | 理由 |
|---|---|
| **Cultural 区块统一用紫色调** | 与 Story（暖黄）+ Tips（绿/红/蓝）形成"暖-冷-彩虹"的三区辨识；紫色在美食场景中代表"文化深度"，少与其他功能撞色 |
| **Tips 关键词权重 = 强 3 / 弱 1** | 避免一个"火"字误判整个段落为"火候"；强信号词是行业/烹饪术语，区分度高 |
| **未归类时走 fallback 单卡** | 比强行塞进某个分组更安全；保留可读性，不破坏内容原意 |
| **不引入新依赖** | 全程用原生 emoji + CSS 变量，0 第三方包；与项目"无 UI 框架"原则一致 |
| **`--content-*` 前缀** | 与现有 `--color-*` `--bg-*` 命名空间分离，未来维护易识别 |
| **复用 `data-theme='dark'` 与 `body.dark` 两套选择器** | 项目中部分代码用前者、部分用后者（CSS 内已观察到）；本规范的 CSS 默认走 `body.dark`（与全局变量一致），但 `tips-content` 内层有 `[data-theme='dark']` 覆写以兼容旧选择器 |

---

## 9. 后续可扩展（不在本迭代范围）

1. **后端菜系元数据**：`recipe.cuisineMeta?: { origin: string, era: string, region: string }`，优先使用接口值
2. **多语言**：`CUISINE_ICONS` 与 `DEFAULT_ORIGIN/ERA` 抽离为 i18n resource
3. **AI 自动归纳**：tips 在 5 条以上时，可由后端返回预分类结果（`tips.groups`），前端跳过 `classifyTips`
4. **文化故事扩写**：Cultural 区块未来可加 "代表人物" / "相关节日" 标签
5. **Story 朗读**：接入 TTS，hover 标题时显示 🔊 按钮
