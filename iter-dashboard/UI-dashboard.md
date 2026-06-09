# UI Design Spec: 个性化烹饪仪表板 (Personal Cooking Dashboard)

> 版本: v1.0 | 日期: 2026-06-09 | 状态: Ready for Implementation
> 配套文档: `PRD-dashboard.md` (v1.0)
> 适用项目: food-website (frontend) | 部署: http://39.103.68.205/

---

## 0. 设计原则

| 原则 | 说明 |
|------|------|
| **温暖·食欲** | 沿用 `--color-primary: #e8663e` 暖橙系 + 米白底色，营造"下厨"氛围而非"数据大屏" |
| **信息层级** | 数字/趋势 > 图表 > 文字说明，空状态文案放在最后 |
| **数据为先** | 核心数字大而醒目，环比/Streak 紧随其后；不要让用户"找"信息 |
| **可扫读** | 4 列卡片对齐网格，图表统一卡片容器，呼吸感 24px gap |
| **可逆** | 空状态/错误状态/加载态都给出"下一步行动"按钮，不让用户卡住 |
| **暗色友好** | 图表配色、明暗阴影、对比度都按 `body.dark` 二次校准 |
| **可访问** | 颜色不是唯一信息载体（↑↓ 箭头+百分比、不只用红色表"差"），`prefers-reduced-motion` 全程支持 |

---

## 1. 设计 Token 扩展

> 新增的 CSS 变量都写进 `frontend/src/global.css` 的 `:root` 与 `body.dark` 中，**不引入新依赖**。

### 1.1 颜色（新增/补全）

```css
:root {
  /* ── 现有（沿用）── */
  --color-primary: #e8663e;
  --color-primary-light: #f0946e;
  --color-primary-dark: #c94f2a;
  --color-primary-bg: #fff3ed;
  --color-accent: #ff8c42;
  --color-card: #ffffff;
  --color-bg: #fdf8f4;
  --color-text: #2d2d2d;
  --color-text-secondary: #666666;
  --color-text-muted: #999999;
  --color-border: #e8e0d8;
  --color-success: #52c41a;
  --color-warning: #faad14;
  --color-error: #ff4d4f;
  --color-info: #1890ff;
  --color-info-dark: #1565c0;

  /* ── 新增：仪表板专用 ── */
  --color-streak: #ff6b35;             /* 火焰橙：Streak 数字与火焰 */
  --color-up: #2e7d32;                 /* 环比上升（绿） */
  --color-down: #c62828;               /* 环比下降（红） */
  --color-flat: #9e9e9e;               /* 环比持平（灰） */
  --color-chart-grid: #f0e8e0;         /* 图表网格线（亮） */
  --color-chart-axis: #999999;         *//* 图表轴文字 */
  --color-chart-tooltip-bg: rgba(45, 45, 45, 0.95);
  --color-chart-tooltip-text: #ffffff;

  /* ── 新增：图表 8 色调色板（饼图/雷达图共享） ── */
  --chart-c1: #e8663e;  /* 暖橙（主） */
  --chart-c2: #52c41a;  /* 鲜绿 */
  --chart-c3: #1890ff;  /* 海蓝 */
  --chart-c4: #faad14;  /* 琥珀 */
  --chart-c5: #722ed1;  /* 紫 */
  --chart-c6: #13c2c2;  /* 青 */
  --chart-c7: #eb2f96;  /* 玫红 */
  --chart-c8: #8c8c8c;  /* 中灰 */
}

body.dark {
  /* ── 图表色提亮（暗色模式对比度补偿） ── */
  --chart-c1: #ff8c5a;
  --chart-c2: #73d13d;
  --chart-c3: #40a9ff;
  --chart-c4: #ffc53d;
  --chart-c5: #b37feb;
  --chart-c6: #36cfc9;
  --chart-c7: #f759ab;
  --chart-c8: #bfbfbf;

  --color-chart-grid: #2e2e48;
  --color-chart-axis: #9898b0;
  --color-chart-tooltip-bg: rgba(232, 232, 240, 0.95);
  --color-chart-tooltip-text: #1a1a2e;

  --color-streak: #ff8c5a;
  --color-up: #73d13d;
  --color-down: #ff7875;
  --color-flat: #686880;
}
```

> **调色板使用规则**：饼图按 `c1→c8` 顺序分配，超出 8 项时取模复用。雷达图主色固定 `c1`，目标参考线用 `chart-c8`。

### 1.2 间距/圆角/阴影（沿用现有 Token）

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-md` | 10px | 卡片/输入框 |
| `--radius-lg` | 14px | 仪表板容器/图表卡片 |
| `--radius-xl` (新增) | 16px | OverviewCards 容器 |
| `--shadow-sm` | `0 1px 4px rgba(0,0,0,0.06)` | 卡片默认 |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` | 卡片 hover |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | Modal/Popover |
| `--ease-out-soft` | `cubic-bezier(0.21, 1.02, 0.73, 1)` | 动效曲线（沿用） |
| `--duration-fast` | 0.2s | 卡片 hover |
| `--duration-normal` | 0.3s | 入场动画 |

---

## 2. 全局布局

### 2.1 页面骨架

```
.dashboard-page
├── .dashboard-page__header        (欢迎语 + 当前日期)
├── .dashboard-page__container      (max-width: 1200px, padding: 24px)
│   ├── .overview-cards             (P0: 4 张统计卡片)
│   ├── .week-comparison            (P0: 本周 vs 上周 + Streak)
│   ├── .cooking-trend-chart        (P0: 折线图)
│   ├── .chart-grid                 (P0: 雷达图 + 口味/菜系 饼图)
│   ├── .suggestions                (P1: 推荐区)
│   ├── .quick-actions              (P1: 快捷操作)
│   ├── .achievement-overview       (P2: 成就概览)
│   └── .author-stats-section       (P2: 仅发布过食谱的用户显示)
```

### 2.2 响应式断点

| 断点 | 容器宽度 | 网格变化 |
|------|---------|---------|
| **Desktop ≥1024px** | `max-width: 1200px` | 统计 4 列 / 图表 2 列 / 建议 2 列 / 快捷 4 列 |
| **Tablet 768-1023px** | `max-width: 100%; padding: 16px` | 统计 2x2 / 图表 1 列堆叠 / 建议 1 列 / 快捷 2x2 |
| **Mobile <768px** | `max-width: 100%; padding: 12px` | 全部单列堆叠 / 折线图 X 轴每 4 天一标签 / 饼图→柱状图 |

### 2.3 整体节奏

- **栅格 gap**: 桌面 24px / 平板 20px / 手机 16px
- **section 间距**: 桌面 32px / 手机 24px
- **卡片内 padding**: 桌面 20px / 手机 16px
- **入场动画**: 整体页面 `pageEnter 0.35s`（沿用 global.css），子模块使用 `list-stagger` 错峰入场

---

## 3. 模块设计

### 3.1 页面 Header

**结构**：

```
┌────────────────────────────────────────────────────────────┐
│  👋 你好，{nickname}                       {YYYY年M月D日 周X}  │
│  欢迎回到你的烹饪之旅                                       │
└────────────────────────────────────────────────────────────┘
```

**设计要点**：
- 标题 22px / 600 weight / `var(--color-text)`
- 副标题 14px / `var(--color-text-secondary)`，空态时副标题改为引导文案
- 桌面右对齐日期；手机左对齐，隐藏日期
- 不使用渐变背景，与下方内容区保持呼吸

**暗色模式**：标题/副标题颜色随 `--color-text` 自动反转。

---

### 3.2 OverviewCards（统计卡片区 · P0）

**桌面端布局（≥1024px）**：

```
┌──────────┬──────────┬──────────┬──────────┐
│   🍳     │   ❤️     │   💬     │   📝     │
│  总烹饪   │  总收藏   │  总评论   │  总食谱   │
│   42     │   15     │    8     │    3     │
│  ↑25%   │  —      │  ↑12%   │  → 持平  │
└──────────┴──────────┴──────────┴──────────┘
```

#### 3.2.1 StatCard 组件

**结构**（从左到右）：

```
┌─────────────────────────────────┐
│  [icon]  [value]      [Δ]      │  ← 头部行
│  ────────────────────────────   │
│  总烹饪次数                      │  ← 标签
│  较上周 +10 次（↑25%）            │  ← 副信息（仅总烹饪卡显示）
└─────────────────────────────────┘
```

**视觉规范**：

| 属性 | 值 |
|------|-----|
| 背景 | `var(--color-card)` |
| 圆角 | `var(--radius-md)` 10px |
| 阴影 | `var(--shadow-sm)` 默认，hover → `var(--shadow-md)` |
| 内 padding | 16px（桌面）/ 14px（手机） |
| 边框 | 1px `var(--color-border)`（极浅，仅在 hover 时强化） |
| 高度 | 桌面 120px / 平板 110px / 手机自适应 |
| hover 动效 | `translateY(-2px)` + `box-shadow: var(--shadow-md)`，0.2s `var(--ease-out-soft)` |

**文字层级**：

| 元素 | 字号 | 字重 | 颜色 |
|------|------|------|------|
| Icon | 24px | — | — |
| Value | 28px（桌面）/ 24px（手机） | 700 | `var(--color-text)` |
| Label | 13px | 400 | `var(--color-text-secondary)` |
| Delta | 12px | 600 | `var(--color-up)/--color-down/--color-flat` |

**环比箭头设计**：

- **上升**：↑ 绿色 `var(--color-up)` + 百分比（如 `↑ 25%`）
- **下降**：↓ 红色 `var(--color-down)` + 百分比（如 `↓ 10%`）
- **持平**：→ 灰色 `var(--color-flat)` + "持平"
- **无对比数据（上周为 0）**：显示 "首次记录 🎉"（绿色）
- **箭头 Unicode**：`↑` `↓` `→`（不使用 SVG，保持轻量）

> ⚠️ **可访问性**：箭头方向同时用颜色和符号表达，不仅依赖颜色辨识。

#### 3.2.2 WeekComparison 区块（紧随 OverviewCards）

```
┌──────────────────────────────────────────────────────┐
│  本周已做 4 道菜  ·  平均评分 4.2 ⭐                  │
│  较上周 +2 道（↑100%）                              │
│                                                      │
│  🔥 连续烹饪 5 天                                    │
│  💡 再坚持 2 天就能解锁"家常便饭"成就                 │
└──────────────────────────────────────────────────────┘
```

**视觉规范**：
- 单卡片容器，紧贴 OverviewCards 下方（间距 16px）
- 桌面端横排：左侧本周摘要，右侧 Streak（用 1px `var(--color-border)` 分隔）
- 手机端竖排堆叠
- Streak 数字 36px / 800 weight / `var(--color-streak)`
- Streak = 0 时：火焰变灰 `var(--color-text-muted)`，文字改为"今天还没下厨，从第一道菜开始吧 →"

**空状态文案**：
- 本周无数据：`这周还没下厨，开始第一道菜吧！🍳`
- 无 streak：`开始你的连续烹饪挑战吧！`

---

### 3.3 CookingTrendChart（烹饪频率折线图 · P0）

#### 3.3.1 容器

```
┌─────────────────────────────────────────┐
│  📈 近 30 天烹饪频率                     │  ← 标题 17px / 600
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  图表区域                          │  │
│  │   height: 240px (desktop)         │  │
│  │   height: 200px (mobile)          │  │
│  └───────────────────────────────────┘  │
│                                         │
│  共做 X 道菜  ·  日均 Y 道               │  ← 底部摘要 13px
└─────────────────────────────────────────┘
```

**视觉规范**：
- 卡片 padding 20px，圆角 12px，背景 `var(--color-card)`，阴影 `--shadow-sm`
- 图表高度：桌面 240px / 平板 200px / 手机 180px
- 使用 Recharts `<LineChart>` + `<ResponsiveContainer>`

#### 3.3.2 Recharts 配置

| 元素 | 配置 |
|------|------|
| **Line** | `stroke="var(--chart-c1)"` 2.5px 圆滑（`type="monotone"`） |
| **填充区域** | `<linearGradient id="trendGradient">` 从 `var(--chart-c1)` 0.35 透明度 → 0 透明度 |
| **数据点** | `r: 3`，hover 时 `r: 5`，外加 1px 白色描边 |
| **X 轴** | 格式 `MM/DD`，移动端每 4 天一个标签（`interval={Math.floor(data.length / 6)}`） |
| **Y 轴** | 整数，0 起步（`allowDecimals={false}`），轴线 `var(--color-chart-grid)`，文字 `var(--color-chart-axis)` 12px |
| **网格** | 横向虚线 `strokeDasharray="3 3"` `var(--color-chart-grid)`，纵向无 |
| **Tooltip** | 卡片样式：`var(--color-chart-tooltip-bg)` 背景 + 圆角 8px + 文字 13px / `var(--color-chart-tooltip-text)`，显示 `MM月DD日 · X 次` |
| **animation** | `animationDuration={600}` |

#### 3.3.3 空状态

- 30 天无数据：图表区域显示 `<EmptyState variant="compact" icon="📅" title="还没有烹饪记录" ctaText="记第一道菜" ctaLink="/cooking-journal" />`

---

### 3.4 ChartGrid（图表网格 · P0）

桌面端 2 列网格（`grid-template-columns: 1fr 1fr`），平板/手机 1 列。

```
┌──────────────────┐  ┌──────────────────┐
│  NutritionRadar  │  │  FlavorPieChart  │
└──────────────────┘  └──────────────────┘
┌──────────────────┐  ┌──────────────────┐
│ CuisinePieChart  │  │ (Achievement     │  ← 桌面预留位
└──────────────────┘  │  Overview 摘要)  │
                       └──────────────────┘
```

> 4 张图表卡，桌面 2x2；手机单列堆叠。

#### 3.4.1 NutritionRadarChart（营养摄入雷达图）

```
┌─────────────────────────────────────┐
│  🥗 近 7 天营养摄入                  │
│  ┌───────────────────────────────┐  │
│  │   Recharts <RadarChart>      │  │
│  │   6 维：热量/蛋白质/脂肪/碳水  │  │
│  │   /纤维/钠                   │  │
│  │                               │  │
│  │   实线 = 实际摄入（主题色）    │  │
│  │   虚线 = 目标 100% 参考线     │  │
│  └───────────────────────────────┘  │
│  💡 蛋白质偏低，建议增加肉类/豆制品  │
└─────────────────────────────────────┘
```

**Recharts 配置**：

| 元素 | 配置 |
|------|------|
| **实际摄入** | `<PolarAngleAxis dataKey="dim">` + `<Radar dataKey="actual" stroke="var(--chart-c1)" fill="var(--chart-c1)" fillOpacity={0.35} />` |
| **目标线** | `<Radar dataKey="goal" stroke="var(--chart-c8)" strokeDasharray="4 4" fill="none" />` |
| **PolarGrid** | `stroke="var(--color-chart-grid)"` |
| **轴文字** | 12px `var(--color-text-secondary)` |
| **Tooltip** | 卡片样式同折线图，格式：`热量 78%` |
| **图例** | 底部居中，圆点 8px |

**设计要点**：
- 雷达图尺寸：桌面 280x280、平板 240x240、手机 200x200
- 维度轴标签 6 个等分（60°），标签 11px `var(--color-text-secondary)`
- 数据范围 0-120%，留 20% 余量防止顶部溢出

**空状态**：
- 无营养日志：`<EmptyState variant="compact" icon="🥗" title="记录饮食后可查看营养分布" ctaText="记今天的第一餐" ctaLink="/cooking-journal" />`

#### 3.4.2 FlavorDistributionChart（口味偏好分布）

**桌面端**：Recharts `<PieChart>`（环形 + 中心总数）

**移动端**：Recharts `<BarChart>`（水平柱状图，纵向口味名）

```
桌面端（PieChart）：
┌─────────────────────────────────────┐
│  🌶️ 口味偏好                         │
│  ┌───────────────────────────────┐  │
│  │      ╱─麻辣─╲                │  │
│  │     │  共 25  │                │  │  ← 中心显示总数
│  │      ╲─咸鲜─╱                │  │
│  └───────────────────────────────┘  │
│  ▣ 麻辣 8  ▣ 咸鲜 5  ▣ 酸甜 4 ...   │  ← 底部图例
└─────────────────────────────────────┘
```

**Recharts 配置**：

| 元素 | 配置 |
|------|------|
| **Pie** | `innerRadius={60} outerRadius={90}`（环形），`paddingAngle={2}` |
| **配色** | 按 `c1→c8` 循环，超出取模 |
| **Label** | 关闭内 label（避免重叠），底部图例替代 |
| **中心文字** | 自定义 `<text>` 元素：总数 24px / 700 + "次" 12px secondary |
| **Tooltip** | `口味：麻辣 / 数量：8 次 / 占比 32%` |
| **animation** | `animationDuration={800}`，错峰入场（`animationBegin={i * 100}`） |

**空状态**：
- 无数据：`<EmptyState variant="compact" icon="🌶️" title="收藏或烹饪食谱后即可看到口味偏好" ctaText="去发现食谱" ctaLink="/" />`

#### 3.4.3 CuisineDistributionChart（菜系分布）

**桌面端**：Recharts `<PieChart>`（实心，含 label）

```
┌─────────────────────────────────────┐
│  🥢 菜系分布                          │
│  ┌───────────────────────────────┐  │
│  │      ╱─川菜 40%─╲            │  │
│  │     │  粤菜 12%  │             │  │
│  │      ╲─湘菜 8%──╱            │  │
│  └───────────────────────────────┘  │
│  🍜 烹饪最常做：川菜                  │  ← 顶部冠军
└─────────────────────────────────────┘
```

**与口味图差异**：
- 启用 `<Pie label>`：`formatter={({ name, percent }) => \`${name} ${(percent*100).toFixed(0)}%\`}`
- label 位置：`position="outside"`，字号 11px `var(--color-text-secondary)`
- 顶部分别：冠军菜系 emoji + 名称（22px / 600）

**移动端**：同口味图改用 BarChart（横向柱状图），label 在条形右侧。

**空状态**：同口味图。

---

### 3.5 Suggestions（个性化建议区 · P1）

桌面 2 列：左侧"未尝试菜系 + 营养缺口"，右侧"未烹饪收藏"横滚；手机单列堆叠。

```
┌─────────────────────────────────────────────────────────────┐
│  ✨ 为你推荐                                                  │
│  ┌──────────────────────────┐  ┌────────────────────────┐   │
│  │ 未尝试菜系                  │  │ 你收藏但还没做过的       │   │
│  │  [泰国料理 🌴] [希腊菜 🥗] │  │ ┌──┐┌──┐┌──┐ →        │   │
│  │  [墨西哥菜 🌮] [越南菜 🍜] │  │ │卡││宫││麻│          │   │
│  │  💡 营养缺口                │  │ │片││保││婆│          │   │
│  │  🥩 蛋白质偏低 +37%         │  │ └──┘└──┘└──┘          │   │
│  │  推荐：红烧牛腩 [查看]      │  └────────────────────────┘   │
│  └──────────────────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

#### 3.5.1 UntriedCuisines（未尝试菜系标签组）

- 容器：标签流式布局 `flex-wrap: wrap; gap: 8px`
- 单个标签：padding 6px 14px，圆角 20px，背景 `var(--color-primary-bg)`，文字 `var(--color-primary)`，字号 13px
- hover：背景 `var(--color-primary)`，文字白，0.2s 过渡
- 点击：跳 `/category/{slug}`
- 数量上限：5 个
- 标题：13px / 600 / `var(--color-text-secondary)` + "💡 试试这些" 副标题

**空状态**：
- 已尝试所有菜系：`🎉 你已经是全能大厨了！`

#### 3.5.2 NutrientGapCard（营养缺口卡片）

- 容器：单卡片，padding 16px，圆角 12px
- 边框：1px `var(--color-warning)`（柔化：`rgba(250, 173, 20, 0.3)`）
- 背景：`var(--color-primary-bg)`（淡橙）
- 结构：
  ```
  🥩 蛋白质摄入偏低
  ───────────────
  当前 62% / 目标 100%
  差距 38%
  ───────────────
  推荐：红烧牛腩 [查看食谱]
  [缩略图 64x64] [标题 14px 600]
  ```
- 推荐食谱缩略图 64x64 圆角 8px
- "查看食谱"按钮：`<a>` 链 `/recipe/{id}`，样式 `btn btn--secondary btn--sm`

**空状态**：
- 无缺口：随机推荐一道高评分食谱（卡片样式相同，标题改为"🌟 今日推荐"）

#### 3.5.3 NotCookedFavorites（未烹饪收藏横滚）

- 容器：`overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch`
- 桌面：3 列 peek（一屏 3 个 + 半张）
- 手机：1.5 列 peek
- 间距：gap 12px
- 单卡：复用 `RecipeCard` 组件，宽度 180px（桌面）/ 160px（手机）
- 滚动条：隐藏（`scrollbar-width: none`）
- 左右渐隐遮罩（仅桌面）：`mask-image: linear-gradient(90deg, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)`

**空状态**：
- 都做过了：`收藏的食谱都做过了，继续探索新食谱吧！` + 按钮 "去发现新食谱"

---

### 3.6 QuickActions（快捷操作 · P1）

**桌面 4 列网格**：

```
┌──────────┬──────────┬──────────┬──────────┐
│   ✍️     │   ❤️     │   🍳     │   📅     │
│  写烹饪日志│  查看收藏 │  开始烹饪 │  查看餐单 │
└──────────┴──────────┴──────────┴──────────┘
```

**视觉规范**：

| 属性 | 值 |
|------|-----|
| 容器 | 4 列网格 / 平板 2x2 / 手机 2x2 |
| 单按钮 | padding 16px，圆角 12px，背景 `var(--color-card)`，阴影 `--shadow-sm` |
| hover | `translateY(-2px)` + 阴影 `--shadow-md` + 背景 `var(--color-primary-bg)`（10% 透明度） |
| Icon | 32px（桌面）/ 28px（手机），emoji 即可 |
| Label | 14px / 600 / `var(--color-text)` |
| 间距 | 桌面 12px / 手机 10px |
| 文字对齐 | 居中 |

**"开始烹饪"按钮特殊处理**：
- 点击触发随机推荐：调用 `getRandomCookableRecipe()` → 跳转 `/cooking-mode/{id}`
- Loading 态：图标旋转 360°（`animation: btn-spin 0.7s linear infinite`）

---

### 3.7 AchievementOverview（成就概览 · P2）

```
┌─────────────────────────────────────────────────────┐
│  🏆 成就进度                                         │
│                                                     │
│  最近解锁                                           │
│  ┌─────┐ ┌─────┐ ┌─────┐                           │
│  │ 🍜  │ │ 🔥  │ │ 💯  │                           │
│  │家常 │ │初次 │ │首批 │                           │
│  │便饭 │ │下厨 │ │评论 │                           │
│  │5/25 │ │5/20 │ │5/15 │                           │
│  └─────┘ └─────┘ └─────┘                           │
│                                                     │
│  下一个目标                                         │
│  🍲 厨房常客                       ▰▰▰▰▰▱▱▱ 58%   │
│  已记录 29/50 次烹饪日志                            │
│  再记录 21 次即可解锁                                │
└─────────────────────────────────────────────────────┘
```

#### 3.7.1 RecentBadge（最近成就）

- 单 badge：方形 80x80（桌面）/ 70x70（手机），圆角 12px
- 背景：`var(--color-primary-bg)`，emoji 居中 36px
- 名称：12px / 600 / 1 行省略
- 日期：11px / `var(--color-text-muted)`
- 间距：gap 12px
- hover：scale(1.05) + 阴影增强
- 点击：跳 `/achievements`

**空状态**：
- 无成就：`<EmptyState variant="compact" icon="🏆" title="还没有解锁成就" description="开始你的烹饪之旅吧" ctaText="看看我能解锁什么" ctaLink="/achievements" />`

#### 3.7.2 NextMilestone（下一成就进度条）

- 容器：单卡片 padding 16px
- 顶部：图标 + 标题（16px / 600）
- 进度条：
  - 高度 8px，圆角 4px，背景 `var(--color-border)`
  - 填充：`var(--color-primary)` 渐变到 `var(--color-accent)`，宽度按百分比
  - 填充动画：`transition: width 0.6s var(--ease-out-soft)`
- 文字：13px `var(--color-text-secondary)`，`{current}/{max} · {pct}%`
- 副文案：11px `var(--color-text-muted)`，激励文案

**空状态**：
- 全部已解锁：`🎉 全部成就已解锁！` 居中展示

---

### 3.8 AuthorStatsSection（作者统计 · P2 · 条件渲染）

- **触发条件**：`authorStats.totalRecipes > 0`
- **位置**：页面最底部，与成就区之间用 1px `var(--color-border)` 分隔
- **设计**：复用旧 `DashboardPage` 的作者统计 CSS（保持兼容）
- 折线图改用 Recharts `<LineChart>`，但视觉上淡化为 `--color-text-muted` 调色（让用户感知"这是次要信息"）

---

## 4. 加载与状态

### 4.1 加载态

复用 `PageSkeleton`，新增 `type="dashboard"`：

```
.ps-dashboard__overview (4 列卡片骨架)
.ps-dashboard__trend    (折线图骨架：240x80 高度矩形)
.ps-dashboard__grid     (2 列图表骨架：每格 240x200)
.ps-dashboard__actions  (4 列快捷按钮骨架)
```

**视觉**：所有骨架块使用 `.skeleton-box` 基础动画（`shimmer 1.4s`），暗色模式自动适配。

### 4.2 错误态

**全局错误**（API 500）：

```jsx
<EmptyState
  variant="default"
  icon="😵"
  title="数据加载失败"
  description="网络可能有点问题，请稍后再试"
  ctaText="重新加载"
  ctaOnClick={refetch}
/>
```

**单图表错误**：

```jsx
<EmptyState
  variant="compact"
  icon="⚠️"
  title="图表加载失败"
  ctaText="重试"
  ctaOnClick={refetchChart}
/>
```

### 4.3 空状态汇总

| 区块 | Icon | 标题 | CTA |
|------|------|------|-----|
| 烹饪趋势 | 📅 | 还没有烹饪记录 | 记第一道菜 → `/cooking-journal` |
| 营养雷达 | 🥗 | 记录饮食后可查看营养分布 | 记今天的第一餐 → `/cooking-journal` |
| 口味偏好 | 🌶️ | 收藏或烹饪食谱后即可看到口味偏好 | 去发现食谱 → `/` |
| 菜系分布 | 🥢 | 收藏或烹饪食谱后即可看到菜系分布 | 去发现食谱 → `/` |
| 未尝试菜系 | 🌟 | 你已经是全能大厨了！ | （无 CTA） |
| 未烹饪收藏 | 🔍 | 收藏的食谱都做过了 | 去发现新食谱 → `/` |
| 成就 | 🏆 | 还没有解锁成就 | 看看我能解锁什么 → `/achievements` |
| 全部成就 | 🎉 | 全部成就已解锁！ | （无 CTA） |

> **空状态卡片位置**：当某区块数据为空时，该卡片**仍占位**渲染空状态（不收起），保持页面节奏稳定。

---

## 5. 暗色模式适配

### 5.1 全局规则

- 全部颜色自动通过 CSS 变量反转（已在 §1.1 定义）
- 卡片背景：`--color-card` 从 `#ffffff` → `#1e1e32`
- 文字：`--color-text` 从 `#2d2d2d` → `#e0e0ee`
- 边框：`--color-border` 从 `#e8e0d8` → `#2e2e48`
- 阴影增强：`rgba(0, 0, 0, 0.5)`（沿用 global.css 已有暗色阴影）

### 5.2 Recharts 暗色模式

- 通过 `useEffect` 监听 `body.classList` 变化，强制 `<LineChart>`、`<RadarChart>`、`<PieChart>`、`<BarChart>` 重渲染
- 实现方式：
  ```jsx
  const isDark = document.body.classList.contains('dark')
  // 用 state 触发重渲染
  const [, force] = useReducer(x => x + 1, 0)
  useEffect(() => {
    const obs = new MutationObserver(force)
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  ```
- 或者：所有图表颜色直接读取 CSS 变量，Recharts SVG 会跟随主题自动更新（推荐此方案）

### 5.3 渐变色填充

折线图 `<linearGradient>` 必须在组件内通过 `<defs>` 定义，颜色用 CSS 变量：

```jsx
<linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stopColor="var(--chart-c1)" stopOpacity={0.35} />
  <stop offset="100%" stopColor="var(--chart-c1)" stopOpacity={0} />
</linearGradient>
```

---

## 6. 响应式细节

### 6.1 断点 CSS 规范

```css
/* 桌面端（默认） */
.dashboard-page__container { max-width: 1200px; padding: 24px; }
.overview-cards { grid-template-columns: repeat(4, 1fr); }
.chart-grid { grid-template-columns: 1fr 1fr; gap: 24px; }
.suggestions { grid-template-columns: 1fr 1fr; gap: 24px; }
.quick-actions { grid-template-columns: repeat(4, 1fr); }

/* 平板：768-1023px */
@media (max-width: 1023px) {
  .dashboard-page__container { padding: 16px; }
  .overview-cards { grid-template-columns: repeat(2, 1fr); }
  .chart-grid { grid-template-columns: 1fr; gap: 20px; }
  .suggestions { grid-template-columns: 1fr; gap: 20px; }
  .quick-actions { grid-template-columns: repeat(2, 1fr); }
  .week-comparison { flex-direction: column; gap: 16px; }
}

/* 手机：<768px */
@media (max-width: 767px) {
  .dashboard-page__container { padding: 12px; }
  .overview-cards { grid-template-columns: 1fr 1fr; gap: 12px; }
  .chart-grid { grid-template-columns: 1fr; gap: 16px; }
  .quick-actions { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .stat-card__value { font-size: 24px; }
  .cooking-trend-chart__container { height: 180px; }
  .quick-action__icon { font-size: 28px; }

  /* 图表特殊处理 */
  .recharts-xAxis text { font-size: 10px; }  /* X 轴