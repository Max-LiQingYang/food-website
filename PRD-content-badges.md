# PRD：食谱内容质量徽章系统（Content Badges）

**版本**：v1.0  
**日期**：2026-06-10  
**作者**：产品专家 Agent  
**状态**：待评审  
**目标 commit**：0d20312

---

## 目录

1. [问题陈述](#1-问题陈述)
2. [功能规格](#2-功能规格)
3. [组件设计](#3-组件设计)
4. [数据流](#4-数据流)
5. [交互行为](#5-交互行为)
6. [视觉设计](#6-视觉设计)
7. [验收标准](#7-验收标准)
8. [边界情况](#8-边界情况)
9. [影响范围](#9-影响范围)
10. [非功能需求](#10-非功能需求)
11. [附录](#11-附录)

---

## 1. 问题陈述

### 1.1 现状

- 94 道食谱全部填充了 `story`、`tips`、`nutrition`、`categoryTags`、`culturalBackground` 字段
- 质量评分范围 84–100 分
- **当前 RecipeCard 只展示**：标题、封面图、难度、时间、评分、分类标签
- 用户无法在浏览列表时快速判断一道食谱的内容深度

### 1.2 用户痛点

> "我时间有限，想找一道有文化故事和视频教程的菜，但要点进去才知道有没有这些内容。"

用户面临「信息不对称」——卡片层缺少内容丰富度的信号，导致：

- 需要反复进出详情页判断内容质量
- 高价值食谱（有故事/文化背景/贴士/视频）与普通食谱在列表中没有区分度
- 无法根据内容类型偏好（如「只要带视频的」）快速过滤

### 1.3 目标

在 RecipeCard 上新增**内容丰富度徽章区域**，用图标 + 文字直观展示四大内容指标，让用户**一眼识别**食谱的内容深度。

---

## 2. 功能规格

### 2.1 四大内容指标

| 指标 | 图标 | 字段来源 | 触发条件 | 含义 |
|------|------|----------|----------|------|
| 故事 | 📖 | `recipe.story` | 字段非空且 length > 0 | 食谱有背后的故事/缘起 |
| 文化 | 🌏 | `recipe.culturalBackground` | 字段非空且 length > 0 | 有文化背景/地域特色说明 |
| 贴士 | 💡 | `recipe.tips` | 字段非空且 length > 0 | 有烹饪小贴士/技巧 |
| 视频 | 🎬 | `(recipe as any).videoCount` | `videoCount > 0` | 有视频教程 |

### 2.2 展示规则

#### 规则 1：有则显示，无则隐藏

- 每个徽章**独立判定**，互不影响
- 字段为 `null`、`undefined` 或空字符串 `""` 时不显示对应徽章
- `videoCount` 为 `0` 或 `undefined` 时不显示视频徽章

#### 规则 2：全无时隐藏整行

- 若四项指标**全部不满足**（即四个徽章都不显示），ContentBadges 组件返回 `null`，不在 DOM 中渲染任何节点

#### 规则 3：自适应排列

- 徽章水平排列，从左到右按固定顺序：📖 故事 → 🌏 文化 → 💡 贴士 → 🎬 视频
- 仅显示有内容的徽章，无间距残留

### 2.3 字段值判定伪代码

```typescript
function getActiveBadges(recipe: Recipe): ContentBadge[] {
  const badges: ContentBadge[] = []

  if (recipe.story && recipe.story.trim().length > 0) {
    badges.push({ key: 'story', icon: '📖', label: '故事' })
  }
  if (recipe.culturalBackground && recipe.culturalBackground.trim().length > 0) {
    badges.push({ key: 'culture', icon: '🌏', label: '文化' })
  }
  if (recipe.tips && recipe.tips.trim().length > 0) {
    badges.push({ key: 'tips', icon: '💡', label: '贴士' })
  }
  const vc = (recipe as any).videoCount
  if (typeof vc === 'number' && vc > 0) {
    badges.push({ key: 'video', icon: '🎬', label: '视频' })
  }

  return badges
}
```

---

## 3. 组件设计

### 3.1 ContentBadges 子组件

新增 `ContentBadges` 作为 RecipeCard 的内部子组件（同文件内定义即可，无需单独文件），保持与现有代码风格一致。

#### Props 接口

```typescript
/**
 * 单个内容徽章的数据
 */
interface ContentBadgeItem {
  /** 唯一标识 */
  key: 'story' | 'culture' | 'tips' | 'video'
  /** emoji 图标 */
  icon: string
  /** 中文标签 */
  label: string
}

/**
 * ContentBadges 组件 Props
 */
interface ContentBadgesProps {
  /** 要展示的徽章列表（已由父组件过滤） */
  badges: ContentBadgeItem[]
}
```

#### 渲染逻辑

```typescript
function ContentBadges({ badges }: ContentBadgesProps) {
  if (badges.length === 0) return null

  return (
    <div className="recipe-card__content-badges" role="list" aria-label="食谱内容丰富度">
      {badges.map(badge => (
        <span
          key={badge.key}
          className={`recipe-card__content-badge recipe-card__content-badge--${badge.key}`}
          role="listitem"
          title={badge.label}
        >
          <span className="recipe-card__content-badge-icon" aria-hidden="true">
            {badge.icon}
          </span>
          <span className="recipe-card__content-badge-label">
            {badge.label}
          </span>
        </span>
      ))}
    </div>
  )
}
```

#### 设计原则

| 原则 | 说明 |
|------|------|
| **纯展示** | 徽章不响应点击，无 hover 弹出/跳转行为 |
| **无状态** | 无内部 state，纯函数组件 |
| **零 API 调用** | 所有数据来自父组件传入的 `recipe` 对象 |
| **渐进增强** | 徽章区域在 `recipe-card__info` 内，作为信息区的一部分，不影响现有卡片布局 |

### 3.2 RecipeCard 集成点

在 `RecipeCard.tsx` 中：

1. 新增 `getActiveBadges` 工具函数（文件顶部，与现有 `getCalories` 风格一致）
2. 在 `return` 的 JSX 中，于 `recipe-card__info` 区域、**标签行 `recipe-card__tags` 之后、元数据行 `recipe-card__meta` 之前**插入 ContentBadges
3. Props 无需变更（从已有 `recipe` prop 计算）

#### 插入位置示意

```tsx
<div className="recipe-card__info">
  <h3 className="recipe-card__title">{titleContent}</h3>

  {/* 紧凑标签行 */}
  <div className="recipe-card__tags">{/* 现有分类/难度/时间/季节标签 */}</div>

  {/* 🆕 内容徽章 → 插在此处 */}
  <ContentBadges badges={getActiveBadges(recipe)} />

  <div className="recipe-card__meta">{/* 作者/卡路里 */}</div>
  <div className="recipe-card__stats">{/* 评分/视频计数 */}</div>
</div>
```

---

## 4. 数据流

### 4.1 数据来源

```
┌──────────────────────────────────────────────────┐
│  GET /api/recipes?page=1&pageSize=20             │
│  → API 响应 → Recipe[]                           │
│  → RecipeCard({ recipe })                        │
│  → getActiveBadges(recipe)                       │
│     ├─ recipe.story          → 📖 故事           │
│     ├─ recipe.culturalBackground → 🌏 文化       │
│     ├─ recipe.tips           → 💡 贴士           │
│     └─ (recipe as any).videoCount → 🎬 视频     │
│  → ContentBadges({ badges })                     │
└──────────────────────────────────────────────────┘
```

### 4.2 零新 API

- 无需新增或修改任何 API 端点
- `story`、`culturalBackground`、`tips` 已存在于 `Recipe` 接口（`api.ts` L92-108）
- `videoCount` 由后端 `routes/recipes.js` L416-440 批量附加到每个 recipe 对象（`item.videoCount = videoMap[item.id] || 0`），前端通过 `(recipe as any).videoCount` 访问
- **建议（可选改进）**：将 `videoCount` 添加到 `api.ts` 的 `Recipe` 接口中，消除 `as any` 类型断言

### 4.3 类型安全

当前 `videoCount` 在 `Recipe` 接口中缺失（仅在 `RecipeCard.tsx` 中用 `as any` 绕过）。PRD 建议：

```typescript
// api.ts - Recipe 接口新增字段
export interface Recipe {
  // ... 现有字段 ...
  videoCount?: number  // 🆕 关联视频数量
}
```

---

## 5. 交互行为

### 5.1 正常状态

| 状态 | 行为 |
|------|------|
| 默认 | 徽章行安静显示在标签行下方，与卡片其他内容一起可见 |
| Hover（桌面） | 无变化。徽章不响应 hover（已在标签行下方，信息层级已足够） |
| 触摸（移动） | 无变化。徽章不可点击 |

### 5.2 与现有交互的关系

| 现有功能 | 是否受影响 | 说明 |
|----------|-----------|------|
| 卡片点击 → 详情页 | ❌ 不影响 | 徽章区域本身不可点击，但事件冒泡到卡片仍会触发导航 |
| 长按菜单 | ❌ 不影响 | 徽章区域不消费长按事件 |
| 收藏按钮 | ❌ 不影响 | 不同层级，无冲突 |
| 快速预览 | ❌ 不影响 | 不同层级 |
| Kebab 菜单 | ❌ 不影响 | 不同层级 |
| 悬停覆盖层 | ❌ 不影响 | 覆盖层在封面图上，徽章在信息区 |

### 5.3 Accessibility

```html
<div class="recipe-card__content-badges" role="list" aria-label="食谱内容丰富度">
  <span role="listitem" title="故事">
    <span aria-hidden="true">📖</span>
    <span>故事</span>
  </span>
  <!-- ... -->
</div>
```

- `role="list"` + `role="listitem"` 确保屏幕阅读器正确播报为列表
- `aria-label="食谱内容丰富度"` 提供列表上下文
- emoji 图标标记为 `aria-hidden="true"` 避免被朗读
- `title` 属性提供 tooltip 作为视觉用户的补充说明

---

## 6. 视觉设计

### 6.1 布局

```
┌─────────────────────────────────┐
│        封面图区域               │
│  [NutriScore]  [推荐理由]       │
│                                 │
│              [🎬 3] ← video     │
├─────────────────────────────────┤
│  食谱标题                        │
│  [🍜中式] [🟢简单] [⏱30min]    │ ← 现有标签行
│  [📖故事] [🌏文化] [💡贴士]     │ ← 🆕 内容徽章
│  👨‍🍳 作者  🔥 350kcal          │ ← 元信息
│  ★★★★☆ 4.5 (128)               │ ← 评分
└─────────────────────────────────┘
```

### 6.2 徽章样式规格

| 属性 | 值 |
|------|-----|
| 容器 | `display: flex; flex-wrap: wrap; gap: 6px;` |
| 容器外边距 | `margin-top: 6px;`（紧跟标签行） |
| 单个徽章 | `inline-flex`，`align-items: center`，`gap: 3px` |
| 高度 | `22px`（min-height，确保 ≥32px 触摸目标将依赖间距组合） |
| 内边距 | `padding: 2px 8px` |
| 圆角 | `border-radius: 10px`（比标签的 12px 略小，视觉区分） |
| 字号 | `font-size: 11px; font-weight: 500` |
| 行高 | `line-height: 1.5` |

### 6.3 颜色方案

#### 亮色模式

| 徽章 | 背景色 | 文字色 |
|------|--------|--------|
| 📖 故事 | `rgba(99, 102, 241, 0.08)` | `#6366f1` |
| 🌏 文化 | `rgba(34, 197, 94, 0.08)` | `#16a34a` |
| 💡 贴士 | `rgba(245, 158, 11, 0.08)` | `#d97706` |
| 🎬 视频 | `rgba(232, 102, 62, 0.08)` | `#e8663e` |

#### 暗色模式 (`body.dark`)

| 徽章 | 背景色 | 文字色 |
|------|--------|--------|
| 📖 故事 | `rgba(99, 102, 241, 0.15)` | `#a5b4fc` |
| 🌏 文化 | `rgba(34, 197, 94, 0.15)` | `#86efac` |
| 💡 贴士 | `rgba(245, 158, 11, 0.15)` | `#fcd34d` |
| 🎬 视频 | `rgba(232, 102, 62, 0.15)` | `#fb923c` |

> 颜色选择依据：与现有 `--tag--time-*` 模式保持一致（半透明背景 + 对应色系前景），区别是徽章用独立颜色体系而非复用时间标签色。

### 6.4 与现有「视频指示器」的关系

RecipeCard 封面图上已有两处视频相关 UI：

1. **封面图右下角**：`.recipe-card__video-indicator` / `.recipe-card__text-indicator`（显示视频数量或"📖 图文教程"）
2. **信息区统计行**：`.recipe-card__stat--video`（显示"▶ N个视频"）

**ContentBadges 中的视频徽章不做替换**——它是新的信息维度，补充而非覆盖：

| 位置 | 作用 | 是否保留 |
|------|------|----------|
| 封面图右下角指示器 | 告诉用户这个食谱有/无视频（二态） | ✅ 保留 |
| 信息区统计行 | 显示具体视频数量 | ✅ 保留 |
| 内容徽章 🎬 视频 | 与其他内容指标并列，展示内容丰富度 | 🆕 新增 |

三者协同：封面指示器给出快速视觉提示 → 内容徽章在信息区与其他指标并列 → 统计行提供精确数量。

---

## 7. 验收标准

### 7.1 构建与类型

| # | 标准 | 验证方式 |
|---|------|----------|
| AC-1 | `npm run build` 或 `vite build` **0 TypeScript errors** | CI / 本地构建 |
| AC-2 | `npm run build` **0 ESLint warnings** | CI / 本地构建 |
| AC-3 | 新增组件/函数有完整 TypeScript 类型标注 | Code review |
| AC-4 | 若将 `videoCount` 加入 `Recipe` 接口，消除 `as any` 断言 | TypeScript 编译 |

### 7.2 功能正确性

| # | 标准 | 验证方式 |
|---|------|----------|
| AC-5 | 有 story 的食谱显示 📖故事 徽章 | 手动测试：打开食谱列表，对比数据库 |
| AC-6 | 有 culturalBackground 的显示 🌏文化 | 同上 |
| AC-7 | 有 tips 的显示 💡贴士 | 同上 |
| AC-8 | videoCount > 0 的显示 🎬视频 | 同上 |
| AC-9 | 四项全无时，徽章行不渲染（DOM 中不存在） | DevTools 检查 |
| AC-10 | 徽章排列顺序固定：📖 → 🌏 → 💡 → 🎬 | 视觉验证 |

### 7.3 视觉与响应式

| # | 标准 | 验证方式 |
|---|------|----------|
| AC-11 | 亮色模式下颜色符合 6.3 节规范 | 视觉验证 / 截图对比 |
| AC-12 | 暗色模式下颜色符合 6.3 节规范 | 切换 `body.dark`，验证 |
| AC-13 | 移动端（≤768px）徽章区域正常展示 | Chrome DevTools 模拟 |
| AC-14 | 移动端每个徽章触摸目标 ≥32px × 22px（高 × 宽） | DevTools 测量 |
| AC-15 | 4 个徽章同时显示时不换行（375px 宽度） | iPhone SE 模拟 |
| AC-16 | 至少 3 个徽章同时显示时 320px 宽度不溢出 | 最小手机宽度测试 |

### 7.4 回归

| # | 标准 | 验证方式 |
|---|------|----------|
| AC-17 | 14+ 处 RecipeCard 引用全部正常渲染 | 遍历 HomePage / SearchPage / AllRecipesPage / CategoryDetailPage / FeaturedSection / PersonalizedRecommendations / UserProfilePage |
| AC-18 | 无徽章食谱的卡片高度与有徽章食谱的卡片高度差 ≤ 28px（1行徽章 + 边距） | 视觉/测量验证 |
| AC-19 | 现有 RecipeCard.test.tsx 通过 | `npm test -- RecipeCard` |
| AC-20 | 卡片点击导航、长按菜单、收藏、预览等功能无回归 | 手动回归测试 |

---

## 8. 边界情况

### 8.1 字段值边界

| 场景 | 预期行为 | 处理方式 |
|------|----------|----------|
| `story: ""`（空字符串） | 不显示 📖故事 | `story.trim().length > 0` 判定为 false |
| `story: "   "`（纯空格） | 不显示 📖故事 | `.trim()` 处理后判定 |
| `story: null` | 不显示 📖故事 | 可选链 `recipe.story &&` 处理 |
| `story: undefined` | 不显示 📖故事 | 同上 |
| `story: "。"`（仅标点，长度 1） | **显示** 📖故事 | 不做语义判断，仅判非空（简化逻辑） |
| `culturalBackground` 同上规则 | 同上 | 同上 |
| `tips` 同上规则 | 同上 | 同上 |

### 8.2 videoCount 边界

| 场景 | 预期行为 | 处理方式 |
|------|----------|----------|
| `videoCount: 0` | 不显示 🎬视频 | `vc > 0` 判定为 false |
| `videoCount: undefined` | 不显示 🎬视频 | `typeof vc === 'number'` 判定为 false |
| `videoCount: null` | 不显示 🎬视频 | 同上 |
| `videoCount: 5` | 显示 🎬视频 | 正常显示 |
| `videoCount` 字段不存在于 recipe 对象 | 不显示 🎬视频 | 安全降级 |
| API 返回 videoCount 为负数（数据异常） | 不显示 🎬视频 | `> 0` 防御 |

### 8.3 全空场景

| 场景 | 预期行为 |
|------|----------|
| 四项指标全无效（story/tips/culturalBackground 为空 且 videoCount≤0） | ContentBadges 返回 `null`，卡片高度等于原高度 |
| 旧数据/迁移中的食谱缺少这些字段 | 安全降级为不显示徽章 |

### 8.4 超长字段

story/tips/culturalBackground 的内容长度**不影响徽章展示**——徽章只判断「有无」，不展示内容正文。因此不存在文本溢出问题。

### 8.5 数据竞态

徽章数据与 recipe 对象同步到达（同一 API 响应），无异步加载问题，无 loading 状态。

---

## 9. 影响范围

### 9.1 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `frontend/src/components/RecipeCard.tsx` | 修改 | 新增 `getActiveBadges` 函数 + `ContentBadges` 组件 + JSX 插入 |
| `frontend/src/components/RecipeCard.css` | 修改 | 新增 `.recipe-card__content-badges` 等样式规则 |
| `frontend/src/api.ts` | 可选修改 | 将 `videoCount` 加入 `Recipe` 接口（消除 `as any`） |
| `frontend/src/components/RecipeCard.test.tsx` | 可选修改 | 新增徽章展示/隐藏的测试用例 |

### 9.2 不变更项

| 项目 | 原因 |
|------|------|
| RecipeCard Props 接口 | 无需新增 props，数据来自已有 `recipe` |
| 后端 API | 字段已全部返回 |
| 数据库 Schema | 字段已存在 |
| RecipeCardSkeleton | 骨架屏不展示内容细节，无需修改 |
| 其他使用 RecipeCard 的页面 | Props 不变，无需改动 |

### 9.3 风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 卡片高度变化导致瀑布流/网格布局错位 | 低 | 徽章行高度约 28px（含间距），现有 grid 布局已有高度差异（标签行可变），风险可控 |
| videoCount 类型不安全（`as any`） | 低 | 建议同步加入 `Recipe` 接口 |
| 暗色模式遗漏 | 低 | CSS 与现有 dark 模式风格一致，审阅清单覆盖 |

---

## 10. 非功能需求

### 10.1 性能

- ContentBadges 为纯函数组件，无副作用，无额外渲染开销
- `getActiveBadges` 为 O(1) 纯函数（仅 4 个字段判定），每个 RecipeCard 计算一次
- 无新增网络请求，无新增依赖

### 10.2 可访问性

- 见 §5.3
- 颜色对比度符合 WCAG AA（亮色模式下文字色对白色背景 ≥ 4.5:1 对比度）

### 10.3 国际化

- 当前仅支持中文标签（「故事」「文化」「贴士」「视频」）
- 如未来需国际化，将 label 改为 i18n key 即可，组件结构无需变更

### 10.4 浏览器兼容性

- 与现有项目一致：Chrome/Edge/Safari/Firefox 最新两个大版本
- 无特殊 CSS 特性需求（flexbox + gap 已在项目中广泛使用）

---

## 11. 附录

### A. CSS 样式参考（伪代码）

```css
/* ── 内容丰富度徽章容器 ── */
.recipe-card__content-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

/* ── 单个徽章 ── */
.recipe-card__content-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.5;
  min-height: 22px;
  user-select: none;
  transition: transform 0.15s ease;
}

.recipe-card__content-badge:hover {
  transform: scale(1.05);
}

/* ── 图标 ── */
.recipe-card__content-badge-icon {
  font-size: 12px;
  line-height: 1;
}

/* ── 标签文字 ── */
.recipe-card__content-badge-label {
  line-height: 1.3;
}

/* ── 各徽章颜色（亮色） ── */
.recipe-card__content-badge--story {
  background: rgba(99, 102, 241, 0.08);
  color: #6366f1;
}

.recipe-card__content-badge--culture {
  background: rgba(34, 197, 94, 0.08);
  color: #16a34a;
}

.recipe-card__content-badge--tips {
  background: rgba(245, 158, 11, 0.08);
  color: #d97706;
}

.recipe-card__content-badge--video {
  background: rgba(232, 102, 62, 0.08);
  color: #e8663e;
}

/* ── 各徽章颜色（暗色） ── */
body.dark .recipe-card__content-badge--story {
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
}

body.dark .recipe-card__content-badge--culture {
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
}

body.dark .recipe-card__content-badge--tips {
  background: rgba(245, 158, 11, 0.15);
  color: #fcd34d;
}

body.dark .recipe-card__content-badge--video {
  background: rgba(232, 102, 62, 0.15);
  color: #fb923c;
}

/* ── 移动端：确保触摸目标 ≥32px ── */
@media (max-width: 768px) {
  .recipe-card__content-badge {
    min-height: 32px;
    padding: 5px 10px;
  }
}
```

### B. 现有 RecipeCard 标签行的视觉模式（参考）

现有标签（分类/难度/时间/季节）使用的模式为：

```css
.recipe-card__tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.5;
  transition: transform 0.2s ease;
}
```

ContentBadges 在视觉上与此保持一致，区别在于：
- **圆角更小**（10px vs 12px）——视觉上区分「分类标签」与「内容徽章」
- **独立颜色体系**——每个徽章有专属颜色，而非统一主色
- **间距稍大**（6px gap vs 4px gap）——徽章少时更宽松

### C. 设计决策记录

| 决策 | 理由 |
|------|------|
| 徽章放在信息区而非封面图上 | 封面已有过多浮动元素（NutriScore / 推荐理由 / 收藏 / 预览 / kebab / 视频指示器），信息区更干净 |
| 不上报点击事件 | 徽章是信息展示，不是操作入口。未来如需筛选，应在页面级实现（search/filter API） |
| 不做徽章计数徽章（如"3项丰富内容"） | 用户更关心**有哪些**内容而非**有多少**，逐个列出更直观 |
| 不关联 qualityScore | qualityScore 已在徽章之外展示，徽章只反映「有无」内容，不做质量评判 |

---

**PRD 结束。下一步：开发实现。**
