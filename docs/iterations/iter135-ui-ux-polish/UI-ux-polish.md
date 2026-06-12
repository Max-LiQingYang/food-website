# 迭代 #135 UI/UX 优化方案

**设计师**: UI Designer Agent
**创建时间**: 2026-06-12
**关联迭代**: #134 用户个人评分历史可视化
**目标模块**: RatingHistoryModule + 关键页面视觉一致性

---

## 1. 现状调研

### 1.1 RatingHistoryModule 9 组件检查

| 检查维度 | 当前状态 | 问题数 | 备注 |
|---|---|---|---|
| **暗色模式覆盖** | 11/15 规则覆盖 | 4 处缺失 | tooltip/隐私开关/空状态CTA/错误按钮 |
| **响应式断点** | 使用 767px/1023px | 1 处不一致 | 项目标准为 768px/480px |
| **微交互动效** | 32 处 hover/transition | 良好 | 使用 CSS 变量 `--duration-*` / `--ease-out-soft` |
| **相邻模块一致性** | 基本对齐 | 4 处细微差异 | 按钮字号/padding、Tabs gap/padding |
| **加载/空状态/错误状态** | 完整实现 | 0 | 骨架屏、5 级空状态、错误重试 |

#### 组件级问题明细

| 组件 | 暗色模式 | 响应式 | 微交互 | 问题描述 |
|---|---|---|---|---|
| RatingHistoryModule (容器) | ✅ | ⚠️ | ✅ | 断点使用 767px 而非 768px |
| RatingDimensionAverages | ✅ | ⚠️ | ✅ | 4 维卡片 hover translateY(-2px) + shadow 已实现 |
| RatingRadar | ❌ | ⚠️ | ✅ | tooltip 缺少暗色背景覆盖 |
| RatingTrendChart | ✅ | ⚠️ | ✅ | range 按钮字号 12px vs StatsCharts 13px |
| RatingDistribution | ✅ | ⚠️ | ✅ | 柱状图 hover brightness(0.85) 已实现 |
| RatingTopList | ✅ | ⚠️ | ✅ | Tabs gap 4px vs StatsCharts 0px |
| RatingHistoryList | ✅ | ⚠️ | ✅ | 列表行 stagger fade-in 动画已实现 |
| RatingPrivacyToggle | ❌ | ⚠️ | ✅ | 开关 knob 暗色模式下白色可能过亮 |
| RatingEmptyState | ❌ | ⚠️ | ✅ |  secondary CTA 边框暗色模式 |

### 1.2 关键页面一致性巡检

| 页面 | 暗色模式规则 | 响应式断点 | 微交互动效 | 状态 |
|---|---|---|---|---|
| HomePage | 10 处 | 4 处 | 23 处 | ✅ 良好 |
| RecipeDetailPage | 65 处 | 22 处 | 126 处 | ✅ 优秀 |
| UserProfilePage | 24 处 | 2 处 | 34 处 | ✅ 良好 |
| FeedPage | 19 处 | 2 处 | 13 处 | ✅ 良好 |
| LoginPage | 3 处 | 1 处 | 8 处 | ⚠️ 基础覆盖 |
| RegisterPage | 3 处 | 1 处 | 8 处 | ⚠️ 基础覆盖 |

### 1.3 与现有设计系统对比

#### 间距系统 ✅ 对齐
- 模块内边距: 24px (桌面) / 16px (<768px) → 与 StatsCharts 一致
- 子区间距: 24px margin-bottom → 与 AchievementsPanel 一致
- 4 维卡片 gap: 12px (桌面) / 16px (平板) / 12px (移动端)

#### 字号系统 ✅ 对齐
- 模块标题: 18px / 600 → 与 StatsCharts/AchievementsPanel 一致
- 子区标题: 15px / 600
- 大数字: 28px / 700 (tabular-nums)
- 元数据: 11-13px

#### 圆角/阴影 ✅ 对齐
- 容器圆角: `--radius-lg` (16px)
- 卡片圆角: `--radius-md` (12px)
- 阴影层级: `--shadow-sm` (默认) → `--shadow-md` (hover)

#### 动画系统 ✅ 对齐
- 骨架屏 shimmer: 1.6s 无限循环 → 与 #131 系统一致
- 过渡时长: `--duration-fast` (0.2s) / `--duration-normal` (0.3s)
- 缓动函数: `--ease-out-soft`

#### 暗色模式 token ✅ 对齐
- 所有新增 CSS 变量在 `global.css` 有 `:root` + `body.dark` 双套定义
- 4 维色卡: taste/difficulty/presentation/value 暗色提亮 20%
- delta 配色: 正差主色，负差中性灰

---

## 2. 优化方案（按优先级）

### P0 必须修改（影响一致性）

#### P0-1: 补充 4 处缺失的暗色模式规则

**文件**: `frontend/src/components/RatingHistoryModule/RatingHistoryModule.css`

```css
/* 1. 雷达图 tooltip 暗色背景 */
body.dark .rhm-radar__tooltip {
  background: var(--color-card, #222);
  border-color: var(--color-border);
}

/* 2. 隐私开关暗色模式 */
body.dark .rhm-privacy__switch {
  background: var(--color-border-dark, #444);
}
body.dark .rhm-privacy__switch-knob {
  background: #f0f0f0; /* 暗色模式下 knob 稍暗 */
}

/* 3. 空状态 secondary CTA */
body.dark .rhm-empty__cta--secondary {
  border-color: var(--color-primary-light, #f0946e);
  color: var(--color-primary-light, #f0946e);
}

/* 4. 错误按钮 */
body.dark .rhm-error__btn {
  background: var(--color-bg-secondary, #2a2520);
}
```

**影响行数**: +15 行 CSS
**涉及组件**: RatingRadar, RatingPrivacyToggle, RatingEmptyState, RatingHistoryModule (error state)

---

#### P0-2: 响应式断点对齐项目标准

**文件**: `frontend/src/components/RatingHistoryModule/RatingHistoryModule.css`

**修改前**:
```css
@media (max-width: 1023px) { ... }
@media (max-width: 767px) { ... }
```

**修改后**:
```css
@media (max-width: 1024px) { ... }  /* 平板断点对齐 */
@media (max-width: 768px) { ... }   /* 移动端断点对齐（项目标准） */
```

**额外补充**: 在 `@media (max-width: 480px)` 内添加：
```css
@media (max-width: 480px) {
  /* 480px 以下紧凑模式 */
  .rhm-module {
    padding: 12px;
    margin-left: -8px;
    margin-right: -8px;
    border-radius: 0;
  }
  .rhm-top__cover,
  .rhm-history__cover {
    width: 48px;
    height: 48px;
  }
  .rhm-dim-avg__value {
    font-size: 24px;
  }
  .rhm-radar__chart {
    height: 200px;
  }
  .rhm-trend__chart {
    height: 180px;
  }
}
```

**影响行数**: 修改 2 行 + 新增 20 行
**一致性**: 与全站 72 处 `480px` / 52 处 `768px` 对齐

---

#### P0-3: 相邻模块视觉一致性微调

**文件**: `frontend/src/components/RatingHistoryModule/RatingHistoryModule.css`

1. **Range 按钮字号/padding 对齐 StatsCharts**:
```css
/* 修改前: font-size: 12px; padding: 4px 10px; */
/* 修改后: */
.rhm-trend__range-btn {
  font-size: 13px;
  padding: 4px 12px;
}
```

2. **Tabs 样式对齐**:
```css
/* 修改前: gap: 4px; padding: 8px 16px; */
/* 修改后: */
.rhm-top__tabs {
  gap: 0;  /* 与 StatsCharts 一致，无间距 */
}
.rhm-top__tab {
  padding: 10px 20px;  /* 与 StatsCharts 一致 */
}
```

**影响行数**: 修改 4 行 CSS
**收益**: UserProfilePage 内 4 个模块（ActivityHeatmap/RatingHistory/AchievementsPanel/StatsCharts）的交互控件视觉统一

---

#### P0-4: 模块插入位置验证（已修复）

**状态**: ✅ 已正确实现
**位置**: `ActivityHeatmap` 之后 → `RatingHistoryModule` → `AchievementsPanel` → `StatsCharts`
**文件**: `frontend/src/pages/UserProfilePage.tsx` (行 583-600)
**无需修改**，与 UI §1.1 规范一致

---

### P1 建议优化（锦上添花）

#### P1-1: 列表行 stagger 动画增强

**当前**: 所有历史列表项使用相同 `rhm-fade-in` 动画，无时间差
**建议**: 添加 `animation-delay` 实现交错效果：

```css
.rhm-history__row:nth-child(1) { animation-delay: 0ms; }
.rhm-history__row:nth-child(2) { animation-delay: 30ms; }
.rhm-history__row:nth-child(3) { animation-delay: 60ms; }
.rhm-history__row:nth-child(4) { animation-delay: 90ms; }
.rhm-history__row:nth-child(5) { animation-delay: 120ms; }
.rhm-history__row:nth-child(n+6) { animation-delay: 150ms; }
```

**文件**: `RatingHistoryModule.css`
**影响行数**: +6 行
**收益**: 加载时视觉更有层次，与 RecipeCard 交错加载体验一致

---

#### P1-2: Tab 切换内容过渡动画

**当前**: Tab 切换（高分榜/低分榜）无过渡，直接切换
**建议**: 添加 fade 过渡：

```css
.rhm-top__list {
  transition: opacity 150ms var(--ease-out-soft);
}
.rhm-top__list.is-switching {
  opacity: 0;
}
```

**文件**: `RatingHistoryModule.css` + `RatingTopList.tsx`
**影响行数**: +5 行 CSS + 3 行 TSX
**收益**: 切换体验更平滑，与 StatsCharts Tab 切换一致

---

#### P1-3: LoginPage 暗色模式增强

**当前**: LoginPage 仅 3 处暗色模式规则
**建议**: 补充表单控件的暗色模式：

```css
/* frontend/src/pages/LoginPage.css */
body.dark .login-form__input {
  background: var(--color-bg-secondary, #2a2520);
  border-color: var(--color-border);
  color: var(--color-text);
}
body.dark .login-form__input:focus {
  border-color: var(--color-primary-light, #f0946e);
}
```

**文件**: `LoginPage.css`, `RegisterPage.css`
**影响行数**: +8 行 × 2 文件
**收益**: 登录/注册页暗色模式体验完整

---

#### P1-4: FeedPage 卡片悬停一致性

**当前**: FeedPage 微交互动效仅 13 处，卡片 hover 效果可能与 RecipeCard 不一致
**建议**: 统一卡片 hover 效果：

```css
/* 确保 FeedPage 卡片 hover 与 RecipeCard 一致 */
.feed-item__card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
```

**文件**: `FeedPage.css`
**影响行数**: +3 行
**收益**: 全站卡片悬停体验一致

---

## 3. 设计规范补充

### 3.1 新增 CSS 变量（无）

本次优化**不新增**任何 CSS 变量。所有修改均复用现有变量系统。

### 3.2 间距/字号/圆角统一表（重申）

| 类别 | 值 | 应用场景 |
|---|---|---|
| **间距** | 4px / 8px | 内部元素间隙 |
| | 12px | 列表行 gap、卡片间隙 |
| | 16px | 模块内边距（移动端）、标题下边距 |
| | 20px | 分栏 gap |
| | 24px | 模块内边距（桌面）、子区间距 |
| | 32px | 大区块间距 |
| **字号** | 11px | 元数据、徽章、时间戳 |
| | 12px | 辅助文字、delta 标识 |
| | 13px | 子标题、次要文字 |
| | 14px | 正文、按钮、Tab |
| | 15px | 子区标题 |
| | 17px | 空状态标题 |
| | 18px | 模块主标题 |
| | 28px | 大数字（平均分、统计值） |
| **圆角** | 4px | 柱状图柱顶 |
| | 6px | 小按钮、range 按钮 |
| | 8px | 封面图 |
| | 12px (`--radius-md`) | 卡片、列表行 |
| | 16px (`--radius-lg`) | 模块容器 |
| | 9999px | pill 形（徽章、开关） |

### 3.3 暗色模式 token 完整映射

| 变量 | 浅色 | 暗色 |
|---|---|---|
| `--color-card` | `#fff` | `#222` |
| `--color-bg` | `#f8f5f2` | `#1a1a1a` |
| `--color-bg-secondary` | `#f5f0eb` | `#2a2520` |
| `--color-text` | `#2d2d2d` | `#e0e0e0` |
| `--color-text-secondary` | `#666` | `#aaa` |
| `--color-text-muted` | `#999` | `#888` |
| `--color-border` | `#e0d8d0` | `#444` |
| `--color-border-light` | `#f0e8e0` | `#333` |
| `--color-primary` | `#e8663e` | `#f0946e` |
| `--color-primary-bg` | `#fff3ed` | `#2e1a14` |
| `--color-dim-taste` | `#e8663e` | `#f59e6e` |
| `--color-dim-difficulty` | `#52c41a` | `#7ed957` |
| `--color-dim-presentation` | `#1890ff` | `#5ab0ff` |
| `--color-dim-value` | `#faad14` | `#ffc857` |

### 3.4 微交互动效库

| 动效 | 参数 | 应用场景 |
|---|---|---|
| **Card Hover** | `translateY(-2px)` + `box-shadow: var(--shadow-md)` | 卡片、列表行 |
| **Row Hover** | `translateX(4px)` + `background: var(--color-primary-bg)` | 可点击列表行（TOP榜、历史） |
| **Button Hover** | `background` 色值变化 + `border-color` 变化 | 按钮、可点击元素 |
| **Fade In** | `opacity: 0 → 1` + `translateY(8px) → 0` (200ms) | 列表项加载 |
| **Shimmer** | 背景位移动画 1.6s 无限循环 | 骨架屏加载态 |
| **Stagger Delay** | 每行 +30ms delay | 列表交错加载 |
| **Tab Switch** | `opacity: 1 → 0 → 1` (150ms × 2) | Tab 切换内容过渡 |

---

## 4. 验收标准

### 4.1 暗色模式
- [ ] `RatingHistoryModule.css` 中 `body.dark` 规则 ≥ 15 处（当前 11 处）
- [ ] 雷达图 tooltip 在暗色模式下背景/文字对比度合格
- [ ] 隐私开关在暗色模式下视觉协调
- [ ] 空状态 secondary CTA 暗色模式边框/文字可见
- [ ] `grep "body.dark" frontend/src/components/RatingHistoryModule/RatingHistoryModule.css | wc -l` → 输出 ≥ 15

### 4.2 响应式
- [ ] 使用 `768px` / `480px` 断点（而非 767px/1023px）
- [ ] 480px 以下紧凑模式正常工作
- [ ] 各断点下布局无溢出、文字不重叠
- [ ] `grep "@media.*768px\|@media.*480px" frontend/src/components/RatingHistoryModule/RatingHistoryModule.css | wc -l` → 输出 ≥ 2

### 4.3 视觉一致性
- [ ] Range 按钮字号 13px、padding 4px 12px（与 StatsCharts 一致）
- [ ] Tabs gap 0px、padding 10px 20px（与 StatsCharts 一致）
- [ ] UserProfilePage 内 4 个模块的控件视觉统一

### 4.4 构建验证
- [ ] `npm run build` 0 warning
- [ ] `npm run build` 后 `grep "rhm-" dist/assets/*.css` 所有类名都存在
- [ ] dev server 访问 `http://localhost:5173/profile/<user-id>` 200 OK

---

## 5. 风险与依赖

### 5.1 低风险
- **P0-1 暗色模式补充**: 纯 CSS 追加，不影响现有逻辑，回滚成本低
- **P0-2 断点修改**: 767px → 768px 仅 1px 差异，视觉影响可忽略
- **P0-3 一致性微调**: 仅调整字号/padding，用户感知轻微

### 5.2 无外部依赖
- 所有修改均为 CSS 层面，不涉及 API、数据结构、组件逻辑变更
- 不依赖后端任何改动

### 5.3 兼容性
- 所有 CSS 属性均为项目已使用属性，无新特性引入
- `prefers-reduced-motion` 已在 RatingHistoryModule 实现，符合无障碍标准

---

## 6. 工作量估算

| 优先级 | 改动项 | CSS 行数 | TSX 行数 | 预计工时 |
|---|---|---|---|---|
| P0-1 | 暗色模式补充 | +15 | 0 | 5 分钟 |
| P0-2 | 断点对齐 | 修改 2 行 + 新增 20 行 | 0 | 10 分钟 |
| P0-3 | 视觉一致性微调 | 修改 4 行 | 0 | 5 分钟 |
| P1-1 | stagger 动画 | +6 | 0 | 3 分钟 |
| P1-2 | Tab 过渡动画 | +5 | +3 | 8 分钟 |
| P1-3 | LoginPage 暗色增强 | +16 | 0 | 5 分钟 |
| P1-4 | FeedPage 卡片一致性 | +3 | 0 | 2 分钟 |
| **总计（P0）** | | **修改 6 行 + 新增 35 行** | **0** | **20 分钟** |
| **总计（全量）** | | **修改 6 行 + 新增 65 行** | **+3** | **38 分钟** |

---

## 7. 修改文件清单

| 文件 | 修改类型 | 优先级 |
|---|---|---|
| `frontend/src/components/RatingHistoryModule/RatingHistoryModule.css` | 大量修改 | P0 |
| `frontend/src/pages/LoginPage.css` | 追加 | P1 |
| `frontend/src/pages/RegisterPage.css` | 追加 | P1 |
| `frontend/src/pages/FeedPage.css` | 追加 | P1 |
| `frontend/src/components/RatingHistoryModule/RatingTopList.tsx` | 微量修改 | P1 |

---

*文档结束*
