# UI 设计规范：UserProfilePage 深度可视化（StatsCharts + AchievementsPanel）

**版本**: v1.0 | **日期**: 2026-06-11 | **作者**: UI 设计专家
**基线文件**: `UserProfilePage.tsx` (753 行) + `UserProfilePage.css` + `global.css`
**对应 PRD**: `PRD-profile-deepening.md`（P0-1, P0-2）
**输出目标**: 提供可直接落地的前端样式规范（CSS 变量 + 完整规则 + Recharts 配色 + 动画时间线）

---

## 0. 设计原则

1. **不破坏现有视觉系统** — 复用 `global.css` 已有的 `--color-*` / `--chart-c*` / `--ease-out-*` / `--duration-*` Token，仅按需新增 `--stats-*` 与 `--achievement-*` 系列。
2. **暗色模式零妥协** — 所有新增变量在 `:root` 与 `body.dark` 同时定义；**禁止使用 `[data-theme="dark"]`**，统一用 `body.dark`。
3. **触屏优先** — 所有可点击元素 ≥ 44px（图表 tooltip / pill / 进度环点击区按 44px 计算 hit area）。
4. **动画克制 + 可降级** — 主入场 stagger 80ms、unlock sparkle 600ms；统一支持 `prefers-reduced-motion: reduce` 降级到瞬时显示。
5. **空态必须有引导** — 任何图表 / 网格无数据时显示图标 + 文案 + CTA，不能"空白 div"。

---

## 1. 范围与模块清单

| 优先级 | 模块 | 子组件 | 涉及文件 |
|---|---|---|---|
| P0-1 | StatsCharts 统计图表面板 | `StatsCharts` / `FavoritesTrendChart` / `CookingFrequencyChart` / `RatingTrendChart` | `components/StatsCharts/{index.tsx, *.css, *.tsx}` |
| P0-2 | AchievementsPanel 成就面板 | `AchievementsPanel` / `AchievementCategoryPills` / `AchievementGrid` / `AchievementProgressRing` / `AchievementUnlockAnimation` | `components/Achievements/{*.tsx, *.css}` |

> P1-3 活动时间线 / P1-4 技能雷达 / P2 暗色全覆盖 / P2 移动端深化 在本规范中**不展开**，仅在 `§7 集成指引` 中给出钩子点。

---

## 2. 全局 CSS 变量扩展

> 追加在 `global.css` 的 `:root` 与 `body.dark` 块内末尾；不覆盖任何已有变量。

### 2.1 Light mode（追加在 `:root` 末尾）

```css
:root {
  /* === Stats Charts Panel === */
  --stats-bg:                var(--color-card, #ffffff);
  --stats-bg-subtle:         var(--color-bg-secondary, #faf6f1);
  --stats-border:            var(--color-border, #e8e0d8);
  --stats-text:              var(--color-text, #2d2d2d);
  --stats-text-secondary:    var(--color-text-secondary, #666666);
  --stats-text-muted:        var(--color-text-muted, #999999);
  --stats-shadow:            var(--shadow-sm, 0 1px 4px rgba(0,0,0,0.06));
  --stats-shadow-hover:      var(--shadow-md, 0 4px 12px rgba(0,0,0,0.08));

  /* Tab 容器 */
  --stats-tab-bg:            var(--color-bg, #fdf8f4);
  --stats-tab-bg-active:     var(--color-card, #ffffff);
  --stats-tab-text:          var(--color-text-secondary, #666666);
  --stats-tab-text-active:   var(--color-primary, #e8663e);
  --stats-tab-indicator:     var(--color-primary, #e8663e);
  --stats-tab-indicator-shadow: 0 1px 4px rgba(232, 102, 62, 0.25);

  /* 图表 Recharts 配色 — 面积/柱状/折线（每张图取不同 chart-c* 避免色冲突） */
  --stats-area-favorites:    var(--chart-c1, #e8663e);   /* 收藏趋势 */
  --stats-area-favorites-soft: rgba(232, 102, 62, 0.18);
  --stats-line-cumulative:   var(--chart-c3, #1890ff);   /* 累计曲线（双 Y 轴）*/
  --stats-line-cumulative-soft: rgba(24, 144, 255, 0.12);
  --stats-bar-cooking:       var(--chart-c2, #52c41a);   /* 烹饪频率柱 */
  --stats-bar-cooking-hover: #73d13d;
  --stats-line-rating:       var(--chart-c4, #faad14);   /* 评分走势 */
  --stats-line-rating-soft:  rgba(250, 173, 20, 0.18);
  --stats-rating-point-fill: #ffffff;

  /* 图例 / 网格 / 轴 */
  --stats-axis:              var(--color-chart-axis, #999999);
  --stats-grid:              var(--color-chart-grid, #f0e8e0);
  --stats-legend-text:       var(--color-text-secondary, #666666);

  /* 摘要区（图表下方数字） */
  --stats-summary-text:      var(--color-text, #2d2d2d);
  --stats-summary-accent:    var(--color-primary, #e8663e);

  /* 时间范围切换器 */
  --stats-range-pill-bg:     var(--color-bg, #fdf8f4);
  --stats-range-pill-bg-active: var(--color-primary, #e8663e);
  --stats-range-pill-text:   var(--color-text-secondary, #666666);
  --stats-range-pill-text-active: #ffffff;

  /* === Achievements Panel === */
  --ach-panel-bg:            var(--color-card, #ffffff);
  --ach-panel-border:        var(--color-border, #e8e0d8);
  --ach-panel-shadow:        var(--shadow-sm, 0 1px 4px rgba(0,0,0,0.06));
  --ach-title:               var(--color-text, #2d2d2d);
  --ach-text-secondary:      var(--color-text-secondary, #666666);
  --ach-text-muted:          var(--color-text-muted, #999999);

  /* 进度环 */
  --ach-ring-track:          var(--color-bg-secondary, #faf6f1);
  --ach-ring-fill:           var(--color-primary, #e8663e);
  --ach-ring-label:          var(--color-text, #2d2d2d);
  --ach-ring-label-secondary: var(--color-text-secondary, #666666);

  /* Pill 筛选 */
  --ach-pill-bg:             var(--color-bg, #fdf8f4);
  --ach-pill-bg-hover:       var(--color-primary-bg, #fff3ed);
  --ach-pill-bg-active:      var(--color-primary, #e8663e);
  --ach-pill-text:           var(--color-text-secondary, #666666);
  --ach-pill-text-hover:     var(--color-primary, #e8663e);
  --ach-pill-text-active:    #ffffff;
  --ach-pill-border:         var(--color-border, #e8e0d8);
  --ach-pill-border-active:  var(--color-primary, #e8663e);
  --ach-pill-count-bg:       rgba(232, 102, 62, 0.10);
  --ach-pill-count-text:     var(--color-primary, #e8663e);
  --ach-pill-count-bg-active: rgba(255, 255, 255, 0.22);
  --ach-pill-count-text-active: #ffffff;

  /* 成就徽章 */
  --ach-badge-bg:            var(--color-card, #ffffff);
  --ach-badge-bg-locked:     var(--color-bg-secondary, #faf6f1);
  --ach-badge-border:        var(--color-border, #e8e0d8);
  --ach-badge-border-locked: var(--color-border, #e8e0d8);
  --ach-badge-icon-locked-opacity: 0.4;
  --ach-badge-name:          var(--color-text, #2d2d2d);
  --ach-badge-name-locked:   var(--color-text-muted, #999999);
  --ach-badge-progress-track: var(--color-bg-secondary, #f0ebe6);
  --ach-badge-progress-fill-locked: #b8b8b8;

  /* 6 分类主色（与 AchievementDetailModal 已有的 CATEGORY_COLORS 保持一致） */
  --ach-cat-publisher:       #e8663e;  /* 暖橙 */
  --ach-cat-collector:       #e84e8a;  /* 玫红 */
  --ach-cat-commenter:       #4a9eff;  /* 天蓝 */
  --ach-cat-cook:            #f5a623;  /* 金黄 */
  --ach-cat-explorer:        #7ed321;  /* 嫩绿 */
  --ach-cat-social:          #bd10e0;  /* 紫罗兰 */

  /* 6 分类浅色背景（用于 Pill 激活前 hover、卡片 chip） */
  --ach-cat-publisher-soft:  rgba(232, 102, 62, 0.10);
  --ach-cat-collector-soft:  rgba(232, 78, 138, 0.10);
  --ach-cat-commenter-soft:  rgba(74, 158, 255, 0.10);
  --ach-cat-cook-soft:       rgba(245, 166, 35, 0.10);
  --ach-cat-explorer-soft:   rgba(126, 211, 33, 0.10);
  --ach-cat-social-soft:     rgba(189, 16, 224, 0.10);

  /* 解锁动画 */
  --ach-sparkle-color:       #ffd54f;
  --ach-unlock-glow:         0 0 0 4px rgba(232, 102, 62, 0.25);

  /* 弹窗（AchievementDetailModal 已在，但统一定义 token 便于覆盖） */
  --ach-modal-overlay:       rgba(0, 0, 0, 0.55);
  --ach-modal-bg:            var(--color-card, #ffffff);
  --ach-modal-radius:        20px;
  --ach-modal-shadow:        0 20px 60px rgba(0, 0, 0, 0.25);
  --ach-modal-max-width:     420px;
  --ach-modal-padding:       28px;

  /* 通用动画 */
  --ease-out-stats:          cubic-bezier(0.21, 1.02, 0.73, 1);
  --ease-spring-back:        cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-stagger-step:   80ms;
  --duration-progress-fill:  900ms;
  --duration-unlock:         600ms;
}
```

### 2.2 Dark mode（追加在 `body.dark` 末尾）

```css
body.dark {
  /* === Stats Charts Panel — Dark === */
  --stats-bg:                var(--color-card-dark, #1e1e32);
  --stats-bg-subtle:         var(--color-bg-dark, #12121e);
  --stats-border:            var(--color-border-dark, #2e2e48);
  --stats-text:              var(--color-text-dark, #e0e0ee);
  --stats-text-secondary:    var(--color-text-secondary-dark, #9898b0);
  --stats-text-muted:        #686880;
  --stats-shadow:            0 1px 4px rgba(0, 0, 0, 0.3);
  --stats-shadow-hover:      0 4px 12px rgba(0, 0, 0, 0.5);

  --stats-tab-bg:            var(--color-bg-dark, #12121e);
  --stats-tab-bg-active:     var(--color-card-dark, #1e1e32);
  --stats-tab-text:          var(--color-text-secondary-dark, #9898b0);
  --stats-tab-text-active:   #ff8c5a;
  --stats-tab-indicator:     #ff8c5a;
  --stats-tab-indicator-shadow: 0 1px 6px rgba(255, 140, 90, 0.35);

  --stats-area-favorites:    #ff8c5a;
  --stats-area-favorites-soft: rgba(255, 140, 90, 0.22);
  --stats-line-cumulative:   #40a9ff;
  --stats-line-cumulative-soft: rgba(64, 169, 255, 0.18);
  --stats-bar-cooking:       #73d13d;
  --stats-bar-cooking-hover: #95de64;
  --stats-line-rating:       #ffc53d;
  --stats-line-rating-soft:  rgba(255, 197, 61, 0.22);
  --stats-rating-point-fill: #1e1e32;

  --stats-axis:              #9898b0;
  --stats-grid:              #2e2e48;
  --stats-legend-text:       #9898b0;

  --stats-summary-text:      #e0e0ee;
  --stats-summary-accent:    #ff8c5a;

  --stats-range-pill-bg:     #1a1a2e;
  --stats-range-pill-bg-active: #ff8c5a;
  --stats-range-pill-text:   #9898b0;
  --stats-range-pill-text-active: #1a1a2e;

  /* === Achievements Panel — Dark === */
  --ach-panel-bg:            var(--color-card-dark, #1e1e32);
  --ach-panel-border:        var(--color-border-dark, #2e2e48);
  --ach-panel-shadow:        0 1px 4px rgba(0, 0, 0, 0.3);
  --ach-title:               #e0e0ee;
  --ach-text-secondary:      #9898b0;
  --ach-text-muted:          #686880;

  --ach-ring-track:          #2a2a3e;
  --ach-ring-fill:           #ff8c5a;
  --ach-ring-label:          #e0e0ee;
  --ach-ring-label-secondary: #9898b0;

  --ach-pill-bg:             #1a1a2e;
  --ach-pill-bg-hover:       rgba(255, 140, 90, 0.12);
  --ach-pill-bg-active:      #ff8c5a;
  --ach-pill-text:           #9898b0;
  --ach-pill-text-hover:     #ff8c5a;
  --ach-pill-text-active:    #12121e;
  --ach-pill-border:         #2e2e48;
  --ach-pill-border-active:  #ff8c5a;
  --ach-pill-count-bg:       rgba(255, 140, 90, 0.18);
  --ach-pill-count-text:     #ff8c5a;
  --ach-pill-count-bg-active: rgba(18, 18, 30, 0.25);
  --ach-pill-count-text-active: #ff8c5a;

  --ach-badge-bg:            #1e1e32;
  --ach-badge-bg-locked:     #1a1a2e;
  --ach-badge-border:        #2e2e48;
  --ach-badge-border-locked: #2e2e48;
  --ach-badge-icon-locked-opacity: 0.35;
  --ach-badge-name:          #e0e0ee;
  --ach-badge-name-locked:   #686880;
  --ach-badge-progress-track: #2a2a3e;
  --ach-badge-progress-fill-locked: #4a4a60;

  /* 暗色下分类色提亮一档 */
  --ach-cat-publisher:       #ff8c5a;
  --ach-cat-collector:       #ff6fa6;
  --ach-cat-commenter:       #6cb5ff;
  --ach-cat-cook:            #ffc044;
  --ach-cat-explorer:        #a0e85c;
  --ach-cat-social:          #d56dff;

  --ach-cat-publisher-soft:  rgba(255, 140, 90, 0.16);
  --ach-cat-collector-soft:  rgba(255, 111, 166, 0.16);
  --ach-cat-commenter-soft:  rgba(108, 181, 255, 0.16);
  --ach-cat-cook-soft:       rgba(255, 192, 68, 0.16);
  --ach-cat-explorer-soft:   rgba(160, 232, 92, 0.16);
  --ach-cat-social-soft:     rgba(213, 109, 255, 0.16);

  --ach-sparkle-color:       #ffe082;
  --ach-unlock-glow:         0 0 0 4px rgba(255, 140, 90, 0.40);

  --ach-modal-overlay:       rgba(0, 0, 0, 0.75);
  --ach-modal-bg:            #1e1e32;
  --ach-modal-shadow:        0 20px 60px rgba(0, 0, 0, 0.6);
}
```

### 2.3 6 分类调色板对照（设计参考）

| key | 中文 | Light Hex | Dark Hex | Light Soft | 用途 |
|---|---|---|---|---|---|
| `publisher` | 发布者 | `#e8663e` | `#ff8c5a` | `rgba(232,102,62,.10)` | Pill 激活/边框/进度环 |
| `collector` | 收藏家 | `#e84e8a` | `#ff6fa6` | `rgba(232,78,138,.10)` | 同上 |
| `commenter` | 评论家 | `#4a9eff` | `#6cb5ff` | `rgba(74,158,255,.10)` | 同上 |
| `cook` | 厨神 | `#f5a623` | `#ffc044` | `rgba(245,166,35,.10)` | 同上 |
| `explorer` | 探索家 | `#7ed321` | `#a0e85c` | `rgba(126,211,33,.10)` | 同上 |
| `social` | 社交达人 | `#bd10e0` | `#d56dff` | `rgba(189,16,224,.10)` | 同上 |

> 全部色值在 light/dark 两套变量中已定义；前端组件**严禁**直接写 hex，必须 `var(--ach-cat-*)`。

---

## 3. P0-1 StatsCharts 统计图表面板

### 3.1 布局结构（桌面 / ≥1024px）

```
┌────────────────────────────────────────────────────┐
│  📊 数据趋势                              [收起 ▾]  │  ← panel header
├────────────────────────────────────────────────────┤
│  [收藏增长] [烹饪频率] [评分变化]    [近30天|90天|365天]│  ← tab + range
├────────────────────────────────────────────────────┤
│                                                     │
│           <ResponsiveContainer 320px>              │
│           <AreaChart / BarChart / LineChart>       │  ← chart area
│                                                     │
├────────────────────────────────────────────────────┤
│  摘要：日均收藏 1.2 · 峰值 5 · 累计 36            │  ← summary line
└────────────────────────────────────────────────────┘
```

**HTML 骨架**：

```html
<section class="stats-charts" aria-label="数据趋势">
  <header class="stats-charts__header">
    <h3 class="stats-charts__title">📊 数据趋势</h3>
    <button class="stats-charts__collapse" aria-expanded="true">收起 ▾</button>
  </header>

  <div class="stats-charts__toolbar">
    <div class="stats-charts__tabs" role="tablist">
      <button class="stats-tab stats-tab--active" role="tab" aria-selected="true" data-pane="favorites">收藏增长</button>
      <button class="stats-tab" role="tab" data-pane="cooking">烹饪频率</button>
      <button class="stats-tab" role="tab" data-pane="rating">评分变化</button>
    </div>
    <div class="stats-charts__range">
      <button class="stats-range-pill stats-range-pill--active">近 30 天</button>
      <button class="stats-range-pill">近 90 天</button>
      <button class="stats-range-pill">近 365 天</button>
    </div>
  </div>

  <div class="stats-charts__pane" data-pane="favorites">
    <FavoritesTrendChart days={30} />
  </div>
</section>
```

**桌面 grid / 位置**：插入位置 = 现有 `profile-stats` 与 `profile-level` 之间；与两侧卡片等宽（`max-width: 960px`，继承 `.profile-page`）。

### 3.2 移动端布局（≤480px）

- Tab 改为**横向滚动**容器（继承 `profile-tabs` 的滚动隐藏模式）。
- Range 切换器**下移一行**到 toolbar 底部，3 个 pill 等宽。
- chart 高度：`320px → 240px`；左侧 Y 轴 margin 收紧（`-20px → -28px`）；X 轴标签 `interval` 动态计算（见 `§3.7`）。
- 摘要行：单行 + 文字 12px；超出截断 `text-overflow: ellipsis`。

### 3.3 CSS 完整规则

```css
/* ============================================================
   P0-1 StatsCharts
   ============================================================ */

.stats-charts {
  background: var(--stats-bg);
  border: 1px solid var(--stats-border);
  border-radius: var(--radius-lg, 14px);
  box-shadow: var(--stats-shadow);
  margin: 0 0 20px;
  overflow: hidden;
  animation: fadeIn 0.35s var(--ease-out-stats);
}

.stats-charts__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--stats-border);
}

.stats-charts__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--stats-text);
  margin: 0;
}

.stats-charts__collapse {
  min-height: 44px;
  min-width: 44px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--stats-text-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  transition: background var(--duration-fast, 0.2s) var(--ease-out-stats),
              color var(--duration-fast, 0.2s) var(--ease-out-stats);
}
.stats-charts__collapse:hover {
  background: var(--stats-bg-subtle);
  color: var(--stats-summary-accent);
}

/* ── Toolbar：Tabs + Range ── */
.stats-charts__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 20px;
  border-bottom: 1px solid var(--stats-border);
  background: var(--stats-tab-bg);
  flex-wrap: wrap;
}

.stats-charts__tabs {
  display: flex;
  gap: 0;
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.stats-charts__tabs::-webkit-scrollbar { display: none; }

.stats-charts__range {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  padding: 8px 0;
}

/* ── Tab 按钮（与 .profile-tab 风格一致，但使用 stats-* token） ── */
.stats-tab {
  position: relative;
  min-height: 44px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--stats-tab-text);
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--duration-fast, 0.2s) var(--ease-out-stats);
}
.stats-tab:hover { color: var(--stats-tab-text-active); }
.stats-tab--active {
  color: var(--stats-tab-text-active);
  font-weight: 600;
}
.stats-tab--active::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 0;
  height: 2px;
  background: var(--stats-tab-indicator);
  border-radius: 2px 2px 0 0;
  box-shadow: var(--stats-tab-indicator-shadow);
  animation: tabIndicatorIn 0.25s var(--ease-out-stats);
}
@keyframes tabIndicatorIn {
  from { transform: scaleX(0); opacity: 0; }
  to   { transform: scaleX(1); opacity: 1; }
}

/* ── Range Pill ── */
.stats-range-pill {
  min-height: 32px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--stats-range-pill-text);
  background: var(--stats-range-pill-bg);
  border: 1px solid var(--stats-border);
  border-radius: 999px;
  cursor: pointer;
  transition: all var(--duration-fast, 0.2s) var(--ease-out-stats);
}
.stats-range-pill:hover {
  color: var(--stats-tab-text-active);
  border-color: var(--stats-summary-accent);
}
.stats-range-pill--active,
.stats-range-pill--active:hover {
  background: var(--stats-range-pill-bg-active);
  border-color: var(--stats-range-pill-bg-active);
  color: var(--stats-range-pill-text-active);
}

/* ── Pane 容器 ── */
.stats-charts__pane {
  padding: 16px 20px 20px;
  min-height: 320px;
  position: relative;
}
.stats-charts__pane[hidden] { display: none; }

/* ── 摘要行 ── */
.stats-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 12px 20px;
  font-size: 12px;
  color: var(--stats-text-secondary);
  border-top: 1px dashed var(--stats-border);
  background: var(--stats-bg-subtle);
}
.stats-summary__item strong {
  color: var(--stats-summary-accent);
  font-weight: 700;
  font-size: 13px;
  margin-right: 4px;
}

/* ============================================================
   P0-1.1 FavoritesTrendChart（面积图 + 双 Y 轴累计线）
   ============================================================ */
.favorites-trend {
  width: 100%;
  height: 320px;
}
.favorites-trend__container {
  width: 100%;
  height: 100%;
  touch-action: pan-y;     /* 防止触摸冲突页面滚动 */
}
.favorites-trend__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  color: var(--stats-text-muted);
}
.favorites-trend__empty-icon { font-size: 36px; }
.favorites-trend__empty-text { font-size: 14px; margin: 0; }
.favorites-trend__empty-cta {
  display: inline-block;
  margin-top: 4px;
  padding: 8px 20px;
  background: var(--color-primary);
  color: #fff;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  min-height: 44px;
  line-height: 28px;
  transition: background var(--duration-fast, 0.2s) var(--ease-out-stats);
}
.favorites-trend__empty-cta:hover { background: var(--color-primary-dark); }

/* Recharts tooltip 继承全局 .chart-tooltip */

/* ============================================================
   P0-1.2 CookingFrequencyChart（柱状图）
   ============================================================ */
.cooking-frequency {
  width: 100%;
  height: 320px;
}
.cooking-frequency__container {
  width: 100%;
  height: 100%;
  touch-action: pan-y;
}
/* 柱状图 hover 高亮由 Recharts 内置；这里仅给 fallback 状态 */
.cooking-frequency__bar-empty { fill: var(--stats-grid); }

/* ============================================================
   P0-1.3 RatingTrendChart（折线图 + 散点）
   ============================================================ */
.rating-trend {
  width: 100%;
  height: 320px;
}
.rating-trend__container {
  width: 100%;
  height: 100%;
  touch-action: pan-y;
}
```

### 3.4 响应式规则

```css
/* ── 1024px：图表容器允许占满 ── */
@media (max-width: 1024px) {
  .stats-charts__pane { padding: 16px 16px 20px; }
}

/* ── 768px：tab 字号缩小、工具栏允许换行 ── */
@media (max-width: 768px) {
  .stats-charts__toolbar { padding: 0 12px; }
  .stats-tab { padding: 12px 12px; font-size: 13px; }
  .stats-range-pill { font-size: 11px; padding: 4px 10px; }
  .favorites-trend,
  .cooking-frequency,
  .rating-trend { height: 280px; }
}

/* ── 480px：移动端主断点 ── */
@media (max-width: 480px) {
  .stats-charts__header { padding: 14px 12px 10px; }
  .stats-charts__title  { font-size: 15px; }
  .stats-charts__toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
  }
  .stats-charts__tabs { padding: 0; }
  .stats-charts__range {
    padding: 8px 12px;
    border-top: 1px solid var(--stats-border);
    justify-content: space-between;
  }
  .stats-range-pill { flex: 1; min-height: 36px; }

  .stats-charts__pane { padding: 12px 8px 16px; }
  .favorites-trend,
  .cooking-frequency,
  .rating-trend { height: 240px; }

  .stats-summary { font-size: 11px; padding: 10px 12px; }
  .stats-summary__item strong { font-size: 12px; }
}

/* ── 360px：超小屏压缩 ── */
@media (max-width: 360px) {
  .stats-charts__pane { padding: 10px 4px 14px; }
  .favorites-trend,
  .cooking-frequency,
  .rating-trend { height: 200px; }
  .stats-range-pill { font-size: 10px; padding: 3px 8px; }
}
```

### 3.5 Recharts 图表配置规范

#### 3.5.1 FavoritesTrendChart（面积图 + 累计折线，双 Y 轴）

```tsx
<ResponsiveContainer width="100%" height="100%">
  <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
    <defs>
      {/* 每日新增 — 暖橙渐变 */}
      <linearGradient id="grad-favorites-daily" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="var(--stats-area-favorites)" stopOpacity={0.45} />
        <stop offset="100%" stopColor="var(--stats-area-favorites)" stopOpacity={0.02} />
      </linearGradient>
      {/* 累计 — 蓝色渐变（仅在双 Y 轴模式下使用） */}
      <linearGradient id="grad-favorites-cumulative" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="var(--stats-line-cumulative)" stopOpacity={0.20} />
        <stop offset="100%" stopColor="var(--stats-line-cumulative)" stopOpacity={0} />
      </linearGradient>
    </defs>

    <CartesianGrid strokeDasharray="3 3" stroke="var(--stats-grid)" vertical={false} />

    {/* 左侧 Y 轴：每日新增 */}
    <YAxis
      yAxisId="left"
      allowDecimals={false}
      tick={{ fontSize: 11, fill: 'var(--stats-axis)' }}
      axisLine={false}
      tickLine={false}
      width={32}
    />
    {/* 右侧 Y 轴：累计 */}
    <YAxis
      yAxisId="right"
      orientation="right"
      allowDecimals={false}
      tick={{ fontSize: 11, fill: 'var(--stats-axis)' }}
      axisLine={false}
      tickLine={false}
      width={32}
    />

    <XAxis
      dataKey="date"
      tickFormatter={formatXAxis}
      tick={{ fontSize: 11, fill: 'var(--stats-axis)' }}
      axisLine={{ stroke: 'var(--stats-grid)' }}
      tickLine={false}
      interval={xAxisInterval}  /* 见 §3.7 */
    />

    <Tooltip content={<FavoritesTooltip />} />

    {/* 面积：每日新增 */}
    <Area
      yAxisId="left"
      type="monotone"
      dataKey="dailyNew"
      name="每日新增"
      stroke="var(--stats-area-favorites)"
      strokeWidth={2}
      fill="url(#grad-favorites-daily)"
      animationDuration={600}
      animationEasing="ease-out"
    />
    {/* 折线：累计 */}
    <Area
      yAxisId="right"
      type="monotone"
      dataKey="cumulative"
      name="累计收藏"
      stroke="var(--stats-line-cumulative)"
      strokeWidth={2}
      strokeDasharray="4 3"
      fill="url(#grad-favorites-cumulative)"
      animationDuration={700}
      animationEasing="ease-out"
    />

    <Legend
      wrapperStyle={{ fontSize: 12, color: 'var(--stats-legend-text)', paddingTop: 4 }}
      iconType="circle"
      iconSize={8}
    />
  </AreaChart>
</ResponsiveContainer>
```

**Custom Tooltip**：

```
tsx
const FavoritesTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const daily = payload.find((p: any) => p.dataKey === 'dailyNew')?.value ?? 0
  const cum   = payload.find((p: any) => p.dataKey === 'cumulative')?.value ?? 0
  const [y, m, d] = label.split('-')
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__date">{y}年{m}月{d}日</div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__dot" style={{ background: 'var(--stats-area-favorites)' }} />
        每日新增：<strong>{daily}</strong>
      </div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__dot" style={{ background: 'var(--stats-line-cumulative)' }} />
        累计收藏：<strong>{cum}</strong>
      </div>
    </div>
  )
}
```

#### 3.5.2 CookingFrequencyChart（柱状图）

```tsx
<ResponsiveContainer width="100%" height="100%">
  <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }} barCategoryGap="22%">
    <defs>
      <linearGradient id="grad-cooking" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="var(--stats-bar-cooking-hover)" stopOpacity={1} />
        <stop offset="100%" stopColor="var(--stats-bar-cooking)"       stopOpacity={0.85} />
      </linearGradient>
    </defs>

    <CartesianGrid strokeDasharray="3 3" stroke="var(--stats-grid)" vertical={false} />

    <XAxis
      dataKey="date"
      tickFormatter={formatXAxis}
      tick={{ fontSize: 11, fill: 'var(--stats-axis)' }}
      axisLine={{ stroke: 'var(--stats-grid)' }}
      tickLine={false}
      interval={xAxisInterval}
    />
    <YAxis
      allowDecimals={false}
      tick={{ fontSize: 11, fill: 'var(--stats-axis)' }}
      axisLine={false}
      tickLine={false}
      width={32}
    />

    <Tooltip content={<CookingTooltip />} cursor={{ fill: 'var(--stats-area-favorites-soft)' }} />

    <Bar
      dataKey="count"
      name="烹饪次数"
      radius={[6, 6, 0, 0]}
      maxBarSize={28}
      fill="url(#grad-cooking)"
      animationDuration={500}
      animationEasing="ease-out"
    >
      {/* 0 值的柱用低饱和灰显式标记，避免幽灵柱 */}
      {data.map((d, i) => (
        <Cell key={i} fill={d.count === 0 ? 'var(--stats-grid)' : 'url(#grad-cooking)'} />
      ))}
    </Bar>

    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--stats-legend-text)' }} iconType="circle" iconSize={8} />
  </BarChart>
</ResponsiveContainer>
```

**Custom Tooltip**：

```tsx
const CookingTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const [y, m, d] = label.split('-')
  const { count, avgRating } = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__date">{y}年{m}月{d}日</div>
      <div className="chart-tooltip__row">🍳 烹饪 <strong>{count}</strong> 次</div>
      {avgRating != null && (
        <div className="chart-tooltip__row">⭐ 平均 <strong>{avgRating.toFixed(1)}</strong> 分</div>
      )}
    </div>
  )
}
```

#### 3.5.3 RatingTrendChart（折线图 + 散点）

```tsx
<ResponsiveContainer width="100%" height="100%">
  <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
    <defs>
      <linearGradient id="grad-rating" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="var(--stats-line-rating)" stopOpacity={0.20} />
        <stop offset="100%" stopColor="var(--stats-line-rating)" stopOpacity={0} />
      </linearGradient>
    </defs>

    <CartesianGrid strokeDasharray="3 3" stroke="var(--stats-grid)" vertical={false} />

    <XAxis
      dataKey="date"
      tickFormatter={formatXAxis}
      tick={{ fontSize: 11, fill: 'var(--stats-axis)' }}
      axisLine={{ stroke: 'var(--stats-grid)' }}
      tickLine={false}
      interval={xAxisInterval}
    />
    <YAxis
      domain={[0, 5]}
      ticks={[0, 1, 2, 3, 4, 5]}
      tick={{ fontSize: 11, fill: 'var(--stats-axis)' }}
      axisLine={false}
      tickLine={false}
      width={32}
    />

    <Tooltip content={<RatingTooltip />} />

    {/* 渐变填充底层（可选，rating 走势通常用纯折线更干净） */}
    <Area
      type="monotone"
      dataKey="rating"
      stroke="none"
      fill="url(#grad-rating)"
      legendType="none"
      isAnimationActive={false}
    />

    <Line
      type="monotone"
      dataKey="rating"
      name="单次评分"
      stroke="var(--stats-line-rating)"
      strokeWidth={2.5}
      dot={{ r: 4, fill: 'var(--stats-line-rating)', stroke: 'var(--stats-rating-point-fill)', strokeWidth: 2 }}
      activeDot={{ r: 6, fill: 'var(--stats-line-rating)', stroke: '#fff', strokeWidth: 2 }}
      connectNulls
      animationDuration={600}
      animationEasing="ease-out"
    />

    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--stats-legend-text)' }} iconType="circle" iconSize={8} />
  </LineChart>
</ResponsiveContainer>
```

**Custom Tooltip**：

```tsx
const RatingTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const [y, m, d] = label.split('-')
  const r = payload[0].value
  const stars = '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r))
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__date">{y}年{m}月{d}日</div>
      <div className="chart-tooltip__row">评分 <strong>{r.toFixed(1)}</strong></div>
      <div className="chart-tooltip__stars" style={{ color: 'var(--stats-line-rating)' }}>{stars}</div>
    </div>
  )
}
```

### 3.6 Chart Tooltip 通用样式（追加到 `global.css`）

```css
/* ── StatsCharts Tooltip 增强 ── */
.chart-tooltip__date {
  font-size: 11px;
  color: var(--color-chart-tooltip-text);
  opacity: 0.7;
  margin-bottom: 4px;
}
.chart-tooltip__row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-chart-tooltip-text);
  line-height: 1.6;
}
.chart-tooltip__row strong {
  font-weight: 700;
  font-size: 13px;
  margin-left: 2px;
}
.chart-tooltip__dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.chart-tooltip__stars {
  font-size: 11px;
  letter-spacing: 1px;
  margin-top: 2px;
}

body.dark .chart-tooltip {
  background: var(--color-chart-tooltip-bg);
  color: var(--color-chart-tooltip-text);
}
```

### 3.7 X 轴 label 防拥挤动态间隔

```tsx
// 桌面 30 天 → 7 个 label；90 天 → 10 个；365 天 → 12 个
// 移动端（≤480px）所有档位 → 5 个
function getXAxisInterval(dataLength: number, isMobile: boolean): number {
  if (isMobile) return Math.max(0, Math.floor(dataLength / 5) - 1)
  return Math.max(0, Math.floor(dataLength / 8) - 1)
}
```

### 3.8 动画时间线

| 元素 | 起始 → 终止 | 缓动 | 时长 |
|---|---|---|---|
| Panel 容器 fadeIn | 入场 0 → 1 | `var(--ease-out-stats)` | 0.35s |
| Tab indicator 切换 | scaleX(0) → 1 | `var(--ease-out-stats)` | 0.25s |
| Recharts 面积/折线 | mount | `ease-out` | 0.6s |
| Recharts 柱状 | mount | `ease-out` | 0.5s |
| Summary 数字 | mount | `var(--ease-out-soft)` | 0.4s（与 panel 同步）|
| Range pill 切换 | hover/active | `var(--ease-out-stats)` | 0.2s |

```css
/* prefers-reduced-motion 降级 */
@media (prefers-reduced-motion: reduce) {
  .stats-charts,
  .stats-tab--active::after,
  .stats-range-pill,
  .stats-summary { animation: none !important; transition: none !important; }
  .recharts-layer,
  .recharts-line-curve,
  .recharts-area,
  .recharts-rectangle { animation-duration: 0s !important; }
}
```

### 3.9 空状态 / 无数据

| 场景 | 触发条件 | UI |
|---|---|---|
| 收藏趋势无数据 | `favorites.length === 0 \|\| 所有 dailyNew === 0` | 图标 📈 + 「还没有收藏数据」+ CTA「去发现食谱」 |
| 烹饪频率无数据 | `cooking.length === 0 \|\| 所有 count === 0` | 图标 🍳 + 「记录第一次烹饪，开始追踪吧」+ CTA「记第一道菜」 |
| 评分走势无数据 | `rating.length === 0 \|\| 所有 rating === null` | 图标 ⭐ + 「完成烹饪并打分后将看到评分趋势」+ CTA「去记录」 |
| 加载中 | API pending | 复用 `.skeleton-box` 280px×100% 区块，2 个 |

空态组件统一在 `components/StatsCharts/ChartEmpty.tsx`，复用 `class="chart-empty"` 体系（与 `dashboard` 保持一致）。

### 3.10 与现有 UserProfilePage 集成

插入位置（`UserProfilePage.tsx` 修改）：

```tsx
{/* StatsCards 之后，AuthorLevelBadge 之前 */}
{stats && <StatsCharts userId={id} />}

{/* 作者等级 */}
{authorLevel && (<div className="profile-level">...</div>)}
```

API 调用（沿用 PRD A1）：
```ts
const res = await api.get(`/users/${userId}/stats-trends?days=${days}`)
const { favorites, cooking } = res.data
```

---

## 4. P0-2 AchievementsPanel 成就面板

### 4.1 布局结构（桌面 / ≥1024px）

```
┌──────────────────────────────────────────────────────────────┐
│  🏅 成就  [ProgressRing 64px] 已解锁 8 / 30        查看全部 › │  ← panel header
├──────────────────────────────────────────────────────────────┤
│  [全部 30] [发布者 2/5] [收藏家 3/4] [评论家 1/3] [...]     │  ← pills 横向滚动
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │  🎖️  │ │  ❤️  │ │  💬  │ │  🔪  │ │  🌟  │ │  📚  │      │  ← grid 6 列
│  │ 名字  │ │ 名字  │ │ 名字  │ │ 名字  │ │ 名字  │ │ 名字  │      │
│  │ ▓▓▓░ │ │ ▓▓▓▓ │ │ ░░░░ │ │ ▓▓░░ │ │ ░░░░ │ │ ░░░░ │      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │
│  ┌──────┐ ┌──────┐ ... (30 个 / 6 列)                          │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 移动端布局（≤480px）

- Pills 横向滚动，snap-x。
- 网格 4 列（≥360px 3 列）。
- 进度环缩小到 48px，标题字号 14px。
- 摘要文字「已解锁 X / Y」与「查看全部」换行（flex-wrap）。

### 4.3 CSS 完整规则

```css
/* ============================================================
   P0-2 AchievementsPanel
   ============================================================ */

.achievements-panel {
  background: var(--ach-panel-bg);
  border: 1px solid var(--ach-panel-border);
  border-radius: var(--radius-lg, 14px);
  box-shadow: var(--ach-panel-shadow);
  margin: 0 0 20px;
  padding: 18px 20px 22px;
  animation: fadeIn 0.35s var(--ease-out-stats);
}

/* ── Header（标题 + 进度环 + 查看全部） ── */
.achievements-panel__header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.achievements-panel__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ach-title);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.achievements-panel__view-all {
  margin-left: auto;
  font-size: 13px;
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border-radius: var(--radius-sm, 6px);
  transition: background var(--duration-fast, 0.2s) var(--ease-out-stats);
}
.achievements-panel__view-all:hover {
  background: var(--ach-pill-bg-hover);
  text-decoration: underline;
}

/* ============================================================
   P0-2.1 AchievementProgressRing
   ============================================================ */
.ach-progress-ring {
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
}
.ach-progress-ring__svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.ach-progress-ring__track {
  fill: none;
  stroke: var(--ach-ring-track);
  stroke-width: 6;
}
.ach-progress-ring__fill {
  fill: none;
  stroke: var(--ach-ring-fill);
  stroke-width: 6;
  stroke-linecap: round;
  /* 关键：动画 dashoffset 完成"环"填充 */
  transition: stroke-dashoffset var(--duration-progress-fill) var(--ease-out-stats);
}
.ach-progress-ring__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 1.1;
}
.ach-progress-ring__pct {
  font-size: 16px;
  font-weight: 700;
  color: var(--ach-ring-label);
}
.ach-progress-ring__count {
  font-size: 10px;
  color: var(--ach-ring-label-secondary);
  margin-top: 1px;
}

.ach-progress-ring--sm { width: 48px; height: 48px; }
.ach-progress-ring--sm .ach-progress-ring__pct { font-size: 13px; }
.ach-progress-ring--sm .ach-progress-ring__count { font-size: 9px; }

/* ============================================================
   P0-2.2 AchievementCategoryPills
   ============================================================ */
.achievement-category-pills {
  display: flex;
  gap: 8px;
  margin: 0 0 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  scroll-snap-type: x mandatory;
  padding: 2px 0 4px;       /* 给 scrollbar 留位避免截断 */
}
.achievement-category-pills::-webkit-scrollbar { display: none; }

.ach-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ach-pill-text);
  background: var(--ach-pill-bg);
  border: 1px solid var(--ach-pill-border);
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  scroll-snap-align: start;
  transition: all var(--duration-fast, 0.2s) var(--ease-out-stats);
  flex-shrink: 0;
}
.ach-pill:hover {
  background: var(--ach-pill-bg-hover);
  color: var(--ach-pill-text-hover);
  border-color: var(--ach-pill-border-active);
}
.ach-pill--active,
.ach-pill--active:hover {
  background: var(--ach-pill-bg-active);
  color: var(--ach-pill-text-active);
  border-color: var(--ach-pill-border-active);
  font-weight: 600;
}
.ach-pill__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 18px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  background: var(--ach-pill-count-bg);
  color: var(--ach-pill-count-text);
  border-radius: 999px;
  line-height: 1;
}
.ach-pill--active .ach-pill__count {
  background: var(--ach-pill-count-bg-active);
  color: var(--ach-pill-count-text-active);
}

/* 分类色 dot */
.ach-pill__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ach-pill-color, var(--ach-cat-publisher));
  flex-shrink: 0;
}
.ach-pill--active .ach-pill__dot {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.4);
}

/* 6 分类 dot 颜色注入（用 inline style 或 :nth-child） */
.ach-pill[data-cat="publisher"]  { --ach-pill-color: var(--ach-cat-publisher); }
.ach-pill[data-cat="collector"]  { --ach-pill-color: var(--ach-cat-collector); }
.ach-pill[data-cat="commenter"]  { --ach-pill-color: var(--ach-cat-commenter); }
.ach-pill[data-cat="cook"]       { --ach-pill-color: var(--ach-cat-cook); }
.ach-pill[data-cat="explorer"]   { --ach-pill-color: var(--ach-cat-explorer); }
.ach-pill[data-cat="social"]     { --ach-pill-color: var(--ach-cat-social); }

/* ============================================================
   P0-2.3 AchievementGrid
   ============================================================ */
.achievement-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px;
  /* 入场动画由 AchievementUnlockAnimation 容器控制 */
}

.achievement-grid--empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px;
  text-align: center;
  color: var(--ach-text-muted);
  grid-template-columns: 1fr;
}
.achievement-grid--empty__icon { font-size: 36px; margin-bottom: 8px; }
.achievement-grid--empty__text { font-size: 14px; margin: 0 0 12px; }
.achievement-grid--empty__cta {
  display: inline-block;
  min-height: 44px;
  line-height: 28px;
  padding: 8px 20px;
  background: var(--color-primary);
  color: #fff;
  border-radius: 999px;
  font-size: 13px;
  text-decoration: none;
  font-weight: 500;
}
.achievement-grid--empty__cta:hover { background: var(--color-primary-dark); }

/* ============================================================
   P0-2.4 AchievementBadge（增强：支持分类色 + unlock 动画 + 进度条）
   ============================================================ */
.achievement-badge {
  /* 继承现有 .achievement-badge 规则，并补充以下增强 */
  --badge-color: var(--ach-cat-publisher);  /* 默认分类色 */
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px 10px;
  background: var(--ach-badge-bg);
  border: 1px solid var(--ach-badge-border);
  border-radius: var(--radius-md, 10px);
  min-width: 88px;
  min-height: 116px;
  cursor: pointer;
  overflow: hidden;
  transition: transform var(--duration-fast, 0.2s) var(--ease-out-stats),
              box-shadow var(--duration-fast, 0.2s) var(--ease-out-stats),
              border-color var(--duration-fast, 0.2s) var(--ease-out-stats);
}
/* 6 分类色注入 */
.achievement-badge[data-cat="publisher"]  { --badge-color: var(--ach-cat-publisher); }
.achievement-badge[data-cat="collector"]  { --badge-color: var(--ach-cat-collector); }
.achievement-badge[data-cat="commenter"]  { --badge-color: var(--ach-cat-commenter); }
.achievement-badge[data-cat="cook"]       { --badge-color: var(--ach-cat-cook); }
.achievement-badge[data-cat="explorer"]   { --badge-color: var(--ach-cat-explorer); }
.achievement-badge[data-cat="social"]     { --badge-color: var(--ach-cat-social); }

.achievement-badge::before {
  /* 顶部一道分类色横线，作为分类视觉锚点 */
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--badge-color);
  opacity: 0;
  transition: opacity var(--duration-fast, 0.2s) var(--ease-out-stats);
}
.achievement-badge:hover::before { opacity: 1; }
.achievement-badge--locked::before { opacity: 0.3; }

.achievement-badge:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--badge-color) 25%, transparent);
  border-color: var(--badge-color);
}
.achievement-badge--locked {
  background: var(--ach-badge-bg-locked);
  border-color: var(--ach-badge-border-locked);
  opacity: 0.85;
}
.achievement-badge--locked:hover {
  opacity: 1;
  border-color: var(--ach-badge-border);
}

.achievement-badge__glow {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--badge-color) 22%, transparent), transparent 70%);
  position: relative;
  animation: achievementGlow 2.4s ease-in-out infinite;
}
.achievement-badge--locked .achievement-badge__glow {
  animation: none;
  background: radial-gradient(circle at 30% 30%, rgba(0,0,0,0.06), transparent 70%);
}
body.dark .achievement-badge--locked .achievement-badge__glow {
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.05), transparent 70%);
}

@keyframes achievementGlow {
  0%, 100% { box-shadow: 0 0 4px color-mix(in srgb, var(--badge-color) 30%, transparent); }
  50%      { box-shadow: 0 0 14px color-mix(in srgb, var(--badge-color) 55%, transparent); }
}

.achievement-badge__icon {
  font-size: 26px;
  line-height: 1;
}
.achievement-badge--locked .achievement-badge__icon {
  filter: grayscale(0.7);
  opacity: var(--ach-badge-icon-locked-opacity);
}

.achievement-badge__name {
  font-size: 12px;
  font-weight: 500;
  color: var(--ach-badge-name);
  text-align: center;
  line-height: 1.25;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.achievement-badge--locked .achievement-badge__name {
  color: var(--ach-badge-name-locked);
}

.achievement-badge__progress {
  width: 100%;
  height: 4px;
  background: var(--ach-badge-progress-track);
  border-radius: 2px;
  overflow: hidden;
  margin-top: auto;
}
.achievement-badge__progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--badge-color), color-mix(in srgb, var(--badge-color) 70%, #ffffff));
  border-radius: 2px;
  transition: width var(--duration-progress-fill) var(--ease-out-stats);
}
.achievement-badge--locked .achievement-badge__progress-fill {
  background: var(--ach-badge-progress-fill-locked);
}
.achievement-badge--unlocked .achievement-badge__progress-fill {
  /* 已解锁时填满 100% 并加微光 */
  box-shadow: 0 0 6px color-mix(in srgb, var(--badge-color) 50%, transparent);
}

/* ============================================================
   P0-2.5 AchievementDetailModal（增强：与新 Badge 配色对齐）
   ============================================================ */
.achievement-detail-modal {
  position: relative;
  background: var(--ach-modal-bg);
  border-radius: var(--ach-modal-radius);
  padding: var(--ach-modal-padding);
  width: 90%;
  max-width: var(--ach-modal-max-width);
  box-shadow: var(--ach-modal-shadow);
  text-align: center;
  animation: modalSpringIn 0.35s var(--ease-spring-back);
}
@keyframes modalSpringIn {
  from { opacity: 0; transform: scale(0.88) translateY(8px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}

.achievement-detail-modal__close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  font-size: 20px;
  color: var(--ach-text-secondary);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--duration-fast, 0.2s) var(--ease-out-stats);
}
.achievement-detail-modal__close:hover { background: var(--ach-pill-bg-hover); }

.achievement-detail-modal__icon-wrapper {
  --accent-color: var(--ach-cat-publisher);
  margin: 8px auto 16px;
  width: 96px;
  height: 96px;
  position: relative;
}
.achievement-detail-modal__glow {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--accent-color) 30%, transparent), transparent 70%);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: achievementGlow 2.4s ease-in-out infinite;
}
.achievement-detail-modal__glow--unlocked {
  box-shadow: var(--ach-unlock-glow);
}
.achievement-detail-modal__icon {
  font-size: 56px;
  line-height: 1;
}

.achievement-detail-modal__title {
  font-size: 20px;
  font-weight: 700;
  color: var(--ach-title);
  margin: 0 0 8px;
}
.achievement-detail-modal__category {
  display: inline-block;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  border-radius: 999px;
  margin-bottom: 12px;
}
.achievement-detail-modal__desc {
  font-size: 14px;
  color: var(--ach-text-secondary);
  line-height: 1.6;
  margin: 0 0 8px;
}
.achievement-detail-modal__hint {
  font-size: 12px;
  color: var(--ach-text-muted);
  margin: 0 0 16px;
}

.achievement-detail-modal__progress-section {
  margin: 16px 0 8px;
}
.achievement-detail-modal__progress-bar {
  width: 100%;
  height: 8px;
  background: var(--ach-badge-progress-track);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}
.achievement-detail-modal__progress-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--badge-color, var(--ach-cat-publisher)), color-mix(in srgb, var(--badge-color, var(--ach-cat-publisher)) 65%, #fff));
  transition: width var(--duration-progress-fill) var(--ease-out-stats);
}
.achievement-detail-modal__progress-text {
  font-size: 12px;
  color: var(--ach-text-secondary);
}

.achievement-detail-modal__date {
  font-size: 12px;
  color: var(--ach-text-muted);
  margin: 8px 0 16px;
}

.achievement-detail-modal__share {
  width: 100%;
  margin-top: 8px;
  min-height: 44px;
}

/* 模态遮罩 */
.ach-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--ach-modal-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s var(--ease-out-stats);
  padding: 16px;
}
```

### 4.4 响应式规则

```css
/* ── 1024px ── */
@media (max-width: 1024px) {
  .achievement-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
}

/* ── 768px ── */
@media (max-width: 768px) {
  .achievements-panel { padding: 16px 16px 18px; }
  .achievement-grid   { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
  .achievement-badge  { min-width: 80px; min-height: 108px; padding: 10px 6px 8px; }
  .achievement-badge__glow { width: 42px; height: 42px; }
  .achievement-badge__icon { font-size: 22px; }
}

/* ── 480px 移动端主断点 ── */
@media (max-width: 480px) {
  .achievements-panel { padding: 14px 12px 16px; }
  .achievements-panel__header { gap: 10px; margin-bottom: 12px; }
  .achievements-panel__title  { font-size: 15px; }
  .ach-progress-ring          { width: 48px; height: 48px; }
  .ach-progress-ring__pct     { font-size: 13px; }
  .ach-progress-ring__count   { font-size: 9px; }

  .achievement-category-pills { margin-bottom: 12px; gap: 6px; }
  .ach-pill {
    min-height: 32px;
    padding: 5px 12px;
    font-size: 12px;
  }
  .ach-pill__count { min-width: 22px; height: 16px; font-size: 10px; }

  .achievement-grid { grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .achievement-badge {
    min-width: 0; min-height: 96px;
    padding: 8px 4px 6px;
    border-radius: 8px;
  }
  .achievement-badge__glow { width: 36px; height: 36px; }
  .achievement-badge__icon { font-size: 20px; }
  .achievement-badge__name { font-size: 11px; }
  .achievement-badge__progress { height: 3px; }
}

/* ── 360px 超小屏：3 列 ── */
@media (max-width: 360px) {
  .achievement-grid { grid-template-columns: repeat(3, 1fr); }
  .achievement-badge { min-height: 88px; }
  .achievement-badge__name { font-size: 10px; }
}
```

### 4.5 进度环（ProgressRing）实现

**SVG 计算公式**（半径 r=26，stroke-width=6，周长 C=2πr≈163.36）：

```tsx
interface ProgressRingProps {
  /** 0-100 */
  percent: number
  /** 已解锁数 */
  unlocked: number
  /** 总数 */
  total: number
  /** 60 | 48 (mobile) */
  size?: number
  /** 触屏目标外层 44px 透明 hit area */
  ariaLabel?: string
}

export function AchievementProgressRing({
  percent, unlocked, total, size = 64, ariaLabel,
}: ProgressRingProps) {
  const r = (size - 6) / 2                       // 留出 stroke 宽度
  const c = 2 * Math.PI * r
  const offset = c - (percent / 100) * c

  return (
    <div
