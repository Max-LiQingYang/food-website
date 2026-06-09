# PRD: 个性化烹饪仪表板 (Personal Cooking Dashboard)

> 版本: v1.0 | 日期: 2026-06-09 | 状态: Draft
> 项目: food-website | 分支建议: feature/personal-dashboard

---

## 1. 概述

### 1.1 背景

当前系统已有多个功能模块（烹饪日志、营养追踪、收藏管理、食谱推荐、成就系统、购物清单、餐单计划），但缺乏一个统一的**个人烹饪概览页面**。现有的 `/dashboard` 是面向**食谱作者**的统计仪表板（浏览量/收藏/评论/评分分布），关注的是"我的食谱表现如何"；而新仪表板面向**所有用户**，回答"我的烹饪之旅是怎样的"。

### 1.2 目标

为每一位用户提供一个**个性化烹饪仪表板**，整合散布在各模块的数据，以可视化方式呈现烹饪行为、营养摄入、口味偏好、成就进度，并提供智能建议和快捷操作入口。

### 1.3 用户故事

- 作为用户，我想在打开 App 后一眼看到我的烹饪概况（做了多少道菜、连续做了几天、口味偏好是什么）。
- 作为注重健康的用户，我想看到近期的营养摄入是否均衡。
- 作为探索型用户，我想看到"还没试过"的菜系和口味推荐。
- 作为进阶用户，我想了解我的成就解锁进度。

---

## 2. 功能描述

### 2.1 数据聚合概览 (P0)

#### 2.1.1 统计卡片区

四张卡片横向排列（桌面端），移动端 2x2 网格：

| 卡片 | 数据源 | 说明 |
|------|--------|------|
| 🍳 总烹饪次数 | `cooking_logs` COUNT(userId) | 历史累计烹饪次数 |
| ❤️ 总收藏数 | `favorites` COUNT(userId) WHERE isDeleted=false | 当前有效收藏数 |
| 💬 总评论数 | `comments` COUNT(userId) | 发表的评论总数 |
| 📝 总食谱数 | `recipes` COUNT(userId) | 自己发布的食谱数 |

#### 2.1.2 对比指标

- **本周烹饪次数 vs 上周**：通过 `cooking_logs.cookedAt` 聚合本周（周一到周日）和上周数据
- **环比变化**：显示 ↑/↓ 百分比（如 ↑ 25%，绿色箭头；↓ 10%，红色箭头）
- 本周无数据时显示引导文案："这周还没下厨，开始第一道菜吧！"

#### 2.1.3 连续烹饪天数 (Streak)

- 基于 `cooking_logs.cookedAt`，从今天往前计算连续有烹饪记录的天数
- 显示火焰图标 🔥 + streak 数字
- 若 streak = 0，显示今日引导

#### 2.1.4 本周烹饪摘要

- 本周烹饪频次（"本周已做 X 道菜"）
- 本周平均评分

### 2.2 数据可视化 (P0)

#### 2.2.1 烹饪频率折线图

- **图表类型**: 使用 Recharts `<LineChart>`
- **数据来源**: `cooking_logs.cookedAt`，聚合近 30 天每日烹饪次数
- **X 轴**: 日期（格式 MM/DD，约 30 个点）
- **Y 轴**: 烹饪次数
- **视觉**: 渐变色填充区域，hover 显示 tooltip（日期 + 次数）
- **空状态**: 30 天无数据时显示"还没有烹饪记录"

#### 2.2.2 营养摄入雷达图

- **图表类型**: 使用 Recharts `<RadarChart>`
- **数据来源**: `nutrition_logs`（近 7 天聚合），结合 `nutrition_goals` 目标值
- **维度**: 热量(calories)、蛋白质(protein)、脂肪(fat)、碳水(carbs)、纤维(fiber)、钠(sodium)
- **每条数据 = 日均摄入 / 目标值 × 100**（百分比）
- **两条线**: 
  - 实际摄入（实线 + 填充区，主题色）
  - 目标值 100% 参考线（虚线，灰色）
- **空状态**: 无营养日志时显示"记录饮食后可查看营养分布"

#### 2.2.3 口味偏好分布

- **图表类型**: 使用 Recharts `<PieChart>` 或 `<BarChart>`（移动端建议柱状图）
- **数据来源**: 
  - 收藏食谱的 `categoryTags.flavor`（JSON 字段，需在 API 层解析）
  - 烹饪日志关联食谱的 `categoryTags.flavor`
  - 权重：烹饪过的 flavor 加权 ×2（表示更高偏好置信度）
- **口味维度**: 麻辣、酸甜、咸鲜、甜、甜辣、清淡、香辣 等
- **交互**: hover 显示口味名称 + 数量
- **空状态**: "收藏或烹饪食谱后即可看到口味偏好"

#### 2.2.4 菜系分布

- **图表类型**: 使用 Recharts `<PieChart>`（含 label）
- **数据来源**: 
  - 收藏食谱的 `categoryTags.cuisine` + `category` 字段
  - 烹饪日志的 `recipeCategory` 字段
- **权重**: 烹饪过的 cuisine 加权 ×2
- **菜系维度**: 川菜、粤菜、湘菜、鲁菜、日料、韩料、西餐、家常菜 等
- **空状态**: 同上

### 2.3 个性化建议 (P1)

#### 2.3.1 未尝试菜系/口味推荐

- **逻辑**: 对比用户已烹饪/收藏的菜系集合与全站菜系集合，取差集
- **展示**: 3-5 个推荐标签（如"你还没试过泰国料理 🌴"），点击跳转对应分类页
- **排序**: 按全站热门度排序（该菜系食谱数）
- **空状态**: 尝试过所有菜系时显示"你已经是全能大厨了！"

#### 2.3.2 营养缺口补充推荐

- **逻辑**: 
  1. 计算近 7 天营养摄入日均值（来自 `nutrition_logs`）
  2. 对比 `nutrition_goals` 目标值
  3. 找出缺口最大的 2 项营养素
  4. 推荐富含该营养素的食谱（通过食谱 `nutrition` 字段排序）
- **展示**: 如"🥩 蛋白质摄入偏低，推荐试试「红烧牛腩」"
- **兜底**: 无缺口时随机推荐一道高评分食谱

#### 2.3.3 "你还没做过"推荐

- **逻辑**: 查询用户收藏但未烹饪的食谱（`favorites` JOIN `cooking_logs` LEFT JOIN，WHERE cooking_logs.id IS NULL）
- **展示**: 横向滚动卡片（桌面端 3 列，移动端 1.5 列 peek）
- **数量**: 最多 6 道
- **空状态**: "收藏的食谱都做过了，继续探索新食谱吧！"

### 2.4 快速操作入口 (P1)

4 个操作按钮，桌面端横向排列，移动端 2x2 网格：

| 操作 | 图标 | 跳转 | 说明 |
|------|------|------|------|
| 写烹饪日志 | ✍️ | `/cooking-journal` | 打开烹饪日志页（可预填充最近浏览的食谱） |
| 查看收藏 | ❤️ | `/favorites` | 打开收藏列表 |
| 开始烹饪 | 🍳 | 触发随机推荐 | 从收藏/推荐中随机选一道食谱，跳转烹饪模式 |
| 查看餐单计划 | 📅 | `/meal-planner` | 打开本周餐单 |

### 2.5 成就进度概览 (P2)

#### 2.5.1 最近解锁成就

- **数据来源**: `achievements` WHERE userId, ORDER BY unlockedAt DESC
- **展示**: 最近解锁的 3 个成就（图标 + 名称 + 解锁日期）
- **点击**: 跳转 `/achievements` 页面
- **空状态**: "还没有解锁成就，开始你的烹饪之旅吧！"

#### 2.5.2 下一个可解锁成就

- **逻辑**: 
  1. 调用 `getAllAchievementsWithProgress(userId)`（已有工具函数）
  2. 筛选 `unlocked === false` 且 `progress > 0`
  3. 按 `progress / maxProgress` 降序排列，取第 1 个
- **展示**: 成就图标 + 标题 + 进度条（百分比 + 数值，如 3/10）
- 进度 > 0 但无近期活动（7 天内无 cooking_log）：不显示此区块
- **空状态**: 所有成就已解锁时显示"🎉 全部成就已解锁！"

---

## 3. 后端 API 设计

### 3.1 概述

**重构**现有 `GET /api/dashboard` 端点，将其从"作者统计仪表板"升级为"个人烹饪仪表板"。原有作者统计数据作为 `authorStats` 子对象保留（向后兼容），新增的烹饪数据作为新字段添加。

> **路径冲突处理**: 当前 `/api/dashboard` 已被占用。本需求**直接改造**现有端点，因为：
> 1. 现有 dashboard 是作者统计，新 dashboard 是烹饪概览——可共存
> 2. 前端 `/dashboard` 路由直接重写 DashboardPage.tsx
> 3. 旧版前端组件已完成使命，可安全替换

### 3.2 端点

```
GET /api/dashboard
```

**认证**: 需要 Bearer Token（`auth` 中间件）  
**参数**: 无  
**方法**: GET  

### 3.3 响应格式

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "overview": {
      "totalCooks": 42,
      "totalFavorites": 15,
      "totalComments": 8,
      "totalRecipes": 3,
      "streak": 5,
      "weekCookCount": 4,
      "lastWeekCookCount": 2,
      "weekChangePct": 100.0,
      "weekAvgRating": 4.2
    },
    "cookingTrend": [
      { "date": "2026-05-10", "count": 2 },
      { "date": "2026-05-11", "count": 0 }
    ],
    "nutritionRadar": {
      "actual": {
        "calories": 78.5, "protein": 62.3, "fat": 90.1,
        "carbs": 85.0, "fiber": 45.2, "sodium": 110.5
      },
      "goal": {
        "calories": 100, "protein": 100, "fat": 100,
        "carbs": 100, "fiber": 100, "sodium": 100
      }
    },
    "flavorDistribution": [
      { "name": "麻辣", "value": 8 },
      { "name": "咸鲜", "value": 5 }
    ],
    "cuisineDistribution": [
      { "name": "川菜", "value": 10 },
      { "name": "粤菜", "value": 3 }
    ],
    "suggestions": {
      "untriedCuisines": [
        { "name": "泰国料理", "recipeCount": 12, "link": "/category/thai" }
      ],
      "nutrientGap": {
        "nutrient": "protein",
        "nutrientLabel": "蛋白质",
        "currentPct": 62.3,
        "recommendedRecipe": {
          "id": "uuid", "title": "红烧牛腩", "coverImage": "url",
          "nutrition": { "protein": 35.2 }
        }
      },
      "notCookedFavorites": [
        { "id": "uuid", "title": "...", "coverImage": "url", "category": "..." }
      ]
    },
    "quickActions": [
      { "key": "journal", "label": "写烹饪日志", "icon": "✍️", "link": "/cooking-journal" }
    ],
    "achievements": {
      "recent": [
        { "type": "cook-10", "title": "家常便饭", "icon": "🍜", "unlockedAt": "2026-06-05" }
      ],
      "nextMilestone": {
        "type": "cook-50",
        "title": "厨房常客",
        "icon": "🍲",
        "description": "记录50次烹饪日志",
        "progress": 42,
        "maxProgress": 50
      }
    },
    "authorStats": {
      "totalRecipes": 3,
      "totalViews": 250,
      "totalFavorites": 38,
      "totalComments": 12,
      "totalPoints": 150,
      "viewTrend": [...],
      "favTrend": [...],
      "ratingDistribution": { "1": 0, "2": 1, "3": 2, "4": 5, "5": 8 },
      "wordCloud": [...],
      "topRecipes": [...]
    }
  }
}
```

### 3.4 数据处理逻辑

#### cookingTrend

```sql
SELECT cookedAt, COUNT(*) as count
FROM cooking_logs
WHERE userId = :userId AND cookedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY cookedAt
ORDER BY cookedAt ASC
```

#### nutritionRadar

```sql
-- 近 7 天营养日均摄入
SELECT
  AVG(calories) * 100 / :goalCalories  AS calories,
  AVG(protein)  * 100 / :goalProtein   AS protein,
  AVG(fat)      * 100 / :goalFat       AS fat,
  AVG(carbs)    * 100 / :goalCarbs     AS carbs,
  AVG(fiber)    * 100 / :goalFiber     AS fiber,
  AVG(sodium)   * 100 / 2000           AS sodium
FROM nutrition_logs
WHERE userId = :userId AND date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
```

#### flavorDistribution

1. 查询所有 `favorites` 关联的 `recipes`，提取 `categoryTags.flavor`
2. 查询所有 `cooking_logs` 关联的 `recipes`，提取 `categoryTags.flavor`（权重 ×2）
3. 合并、去重、聚合

#### untriedCuisines

1. 收集当前用户已烹饪/收藏的 cuisine 集合：`favorites.recipe.categoryTags.cuisine` ∪ `cooking_logs.recipeCategory`
2. 查询全站 `recipes.categoryTags.cuisine` 的去重集合
3. 取差集 + 按该 cuisine 的食谱数量排序

#### streak

```js
// 伪代码
const dates = await CookingLog.findAll({
  where: { userId },
  attributes: [[sequelize.fn('DISTINCT', sequelize.col('cookedAt')), 'date']],
  order: [['cookedAt', 'DESC']],
  raw: true
})
let streak = 0
const today = new Date().toISOString().slice(0, 10)
// 从今天往回遍历，检查是否有连续记录
for (let i = 0; i < dates.length; i++) {
  const expectedDate = /* today - i days */
  if (dates[i].date === expectedDate) streak++
  else break
}
```

### 3.5 性能考虑

- **单次查询聚合**: 所有 cooking_logs 聚合在一次查询中完成（按日 GROUP BY + 计总 COUNT）
- **成就进度复用**: 已有 `getAllAchievementsWithProgress()` 工具函数，直接调用
- **营养雷达依赖 nutrition_goals**: 如用户未设置目标，使用 `NutritionGoal.getRecommended()` 默认值
- **响应缓存**: 建议在 API 层加 60 秒 short-lived cache（用户刷新仪表板频率低）

---

## 4. 前端组件树

```
DashboardPage (pages/DashboardPage.tsx)
├── OverviewCards (components/dashboard/OverviewCards.tsx)
│   ├── StatCard ×4 (总烹饪/总收藏/总评论/总食谱)
│   └── WeekComparison (本周 vs 上周 + streak)
├── CookingTrendChart (components/dashboard/CookingTrendChart.tsx)
│   └── Recharts <LineChart>
├── ChartGrid (components/dashboard/ChartGrid.tsx)
│   ├── NutritionRadarChart (components/dashboard/NutritionRadarChart.tsx)
│   │   └── Recharts <RadarChart>
│   ├── FlavorDistributionChart (components/dashboard/FlavorDistributionChart.tsx)
│   │   └── Recharts <PieChart> / <BarChart>
│   └── CuisineDistributionChart (components/dashboard/CuisineDistributionChart.tsx)
│       └── Recharts <PieChart>
├── Suggestions (components/dashboard/Suggestions.tsx)
│   ├── UntriedCuisines (标签组 + 跳转)
│   ├── NutrientGapCard (营养推荐卡片)
│   └── NotCookedFavorites (横向滚动食谱卡片)
├── QuickActions (components/dashboard/QuickActions.tsx)
│   └── ActionButton ×4
├── AchievementOverview (components/dashboard/AchievementOverview.tsx)
│   ├── RecentBadge ×3
│   └── NextMilestone (进度条)
└── AuthorStatsSection (components/dashboard/AuthorStatsSection.tsx) [条件渲染]
    └── 复用现有 dashboard 组件或内联渲染
```

### 组件说明

| 组件 | 职责 | 状态处理 |
|------|------|---------|
| `DashboardPage` | 主页面，调用 API，数据分发 | loading 显示骨架屏；error 显示 ErrorEmptyState |
| `OverviewCards` | 渲染统计卡片 + 环比 + streak | 无数据时显示 0 + 引导文案 |
| `CookingTrendChart` | 折线图渲染 | 全部为 0 时显示空状态 |
| `NutritionRadarChart` | 雷达图渲染 | 无营养日志显示空状态 |
| `FlavorDistributionChart` | 口味饼图/柱状图 | 无数据显示空状态 |
| `CuisineDistributionChart` | 菜系饼图 | 无数据显示空状态 |
| `Suggestions` | 个性化推荐区 | 无推荐内容时隐藏某区块 |
| `QuickActions` | 操作按钮组 | 始终渲染 |
| `AchievementOverview` | 成就概览 | 无成就时显示引导 |
| `AuthorStatsSection` | 作者统计（仅发布过食谱的用户显示） | totalRecipes === 0 时隐藏 |

### 响应式断点

| 断点 | 布局 |
|------|------|
| ≥1024px (Desktop) | 图表 2 列网格；统计卡片 4 列；建议 2 列 |
| 768-1023px (Tablet) | 图表 1 列堆叠；统计卡片 2x2 |
| <768px (Mobile) | 全部单列堆叠；折线图 X 轴标签每 3-5 天一个；饼图缩小 |

---

## 5. 数据模型依赖

### 5.1 读取的表和字段

| 表名 | 使用字段 | 用途 |
|------|---------|------|
| `cooking_logs` | `id, userId, recipeId, cookedAt, rating` | 烹饪次数/streak/频率趋势/总评分 |
| `favorites` | `id, userId, recipeId, createdAt, isDeleted` | 总收藏数/收藏但未烹饪比对 |
| `comments` | `id, userId, createdAt` | 总评论数 |
| `recipes` | `id, title, coverImage, category, categoryTags, nutrition, userId` | 食谱数/categoryTags解析/营养 |
| `nutrition_logs` | `userId, date, calories, protein, fat, carbs, fiber, sodium` | 雷达图 |
| `nutrition_goals` | `userId, calories, protein, fat, carbs, fiber` | 雷达图目标参考线 |
| `achievements` | `userId, type, title, icon, unlockedAt` | 成就概览 |

### 5.2 `categoryTags` JSON 结构

```json
{
  "ingredient": "肉类",
  "method": "炒",
  "cuisine": "川菜",
  "flavor": "麻辣",
  "price": "普通家常"
}
```

- `cuisine`: 用于菜系分布图
- `flavor`: 用于口味偏好图

### 5.3 需要注意的 NULL 处理

- `cooking_logs.recipeId` 可能为 NULL（已删除的食谱）——在 JOIN 时用 LEFT JOIN
- `recipes.categoryTags` 可能为 NULL 或无效 JSON —— 解析前检查
- `nutrition_goals` 可能不存在 —— 使用推荐默认值
- `nutrition_logs` 可能为空 —— 雷达图返回 zeros
- `achievements` 可能为空 —— 显示引导文案

---

## 6. 验收标准

### 6.1 功能验收

- [ ] **AC-1**: 统计卡片正确显示总烹饪次数、总收藏数、总评论数、总食谱数
- [ ] **AC-2**: 本周 vs 上周烹饪次数对比正确，环比变化箭头方向正确
- [ ] **AC-3**: 连续烹饪天数（streak）计算正确（从今天往回数）
- [ ] **AC-4**: 烹饪频率折线图显示近 30 天数据，hover tooltip 正常
- [ ] **AC-5**: 营养雷达图显示 6 维实际值 + 目标参考线
- [ ] **AC-6**: 口味偏好分布图基于收藏+烹饪数据正确聚合
- [ ] **AC-7**: 菜系分布饼图正确显示
- [ ] **AC-8**: 未尝试菜系推荐 = 全站菜系 - 用户已接触菜系
- [ ] **AC-9**: 营养缺口推荐正确识别最大缺口营养素
- [ ] **AC-10**: "你还没做过"推荐 = 收藏 ∩ ¬烹饪，最多 6 条
- [ ] **AC-11**: 4 个快速操作按钮跳转正确
- [ ] **AC-12**: 最近解锁成就（最多 3 个）正确显示
- [ ] **AC-13**: 下一个成就进度条（progress/maxProgress）正确

### 6.2 非功能验收

- [ ] **AC-14**: 暗色模式 `body.dark` 下所有图表颜色适配
- [ ] **AC-15**: 响应式布局：桌面(≥1024px)、平板(768-1023)、手机(<768)
- [ ] **AC-16**: 页面首屏加载时间 < 2s（API 响应 < 500ms）
- [ ] **AC-17**: 所有空状态有友好引导文案
- [ ] **AC-18**: 加载中显示骨架屏（复用 `PageSkeleton` 或新建 dashboard 专用骨架）
- [ ] **AC-19**: API 返回 500 时显示错误提示 + 重试按钮
- [ ] **AC-20**: Recharts 图表在 resize 时自适应（使用 `ResponsiveContainer`）

### 6.3 向后兼容

- [ ] **AC-21**: 原 DashboardPage 的 `DashboardData` TypeScript 接口扩展（不破坏现有引用）
- [ ] **AC-22**: 旧 `/api/dashboard` 调用者的字段（authorStats 子对象）继续可用

---

## 7. 优先级划分

### P0 — 核心功能（必须交付）

| 功能 | 说明 |
|------|------|
| 数据聚合概览 | 4 张统计卡片 + 本周对比 + streak |
| 烹饪频率折线图 | 近 30 天每日烹饪次数 |
| 营养摄入雷达图 | 6 维 + 目标参考线 |
| 口味偏好分布 | 饼图/柱状图 |
| 菜系分布 | 饼图 |
| API `/api/dashboard` 重构 | 聚合所有数据的后端端点 |

### P1 — 高价值功能

| 功能 | 说明 |
|------|------|
| 个性化建议 | 未尝试菜系/营养缺口/未做收藏 3 个推荐区块 |
| 快速操作入口 | 4 个快捷按钮 |
| 暗色模式适配 | 图表颜色 + 卡片背景 |
| 响应式布局 | 桌面/平板/手机三档 |
| 空状态处理 | 所有图表/卡片的空状态 |

### P2 — 增强体验

| 功能 | 说明 |
|------|------|
| 成就进度概览 | 最近解锁 + 下一个进度 |
| 骨架屏加载态 | 专用的 dashboard 骨架屏 |
| 作者统计区块 | 对发布过食谱的用户显示旧版 author stats |
| 图表动画 | Recharts 入场动画 |
| 移动端饼图改柱状图 | 提升小屏可读性 |

---

## 8. 技术约束与风险

### 8.1 依赖

- **Recharts**: 项目中未安装，需执行 `npm install recharts`（frontend 目录）
- 无其他新依赖

### 8.2 风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| `categoryTags` JSON 解析失败 | 口味/菜系图表为空 | 所有 JSON 解析加 try-catch，字段缺失返回默认值 |
| nutrition_goals 不存在 | 雷达图目标线无法计算 | 使用 NutritionGoal.getRecommended() 生成默认值 |
| cooking_logs.recipeId 指向已删除食谱 | JOIN 丢数据 | 全部使用 LEFT JOIN |
| 大量 cooking_logs 导致 API 慢 | 超时/体验差 | 聚合查询 + 索引已存在（idx_cooking_log_userId） |

### 8.3 路径冲突

- **路由**: `/dashboard` 已有 DashboardPage.tsx —— **直接重写**
- **API**: `/api/dashboard` 已有 GET 端点 —— **重构扩展**
- **CSS**: `DashboardPage.css` 已有 —— **重写**

---

## 9. 实施计划建议

| 阶段 | 内容 | 预估工时 |
|------|------|---------|
| Phase 1 | 后端 API 重构（/api/dashboard）+ 测试 | 4h |
| Phase 2 | 安装 Recharts + OverviewCards + 折线图 | 3h |
| Phase 3 | 雷达图 + 饼图（营养/口味/菜系） | 3h |
| Phase 4 | 个性化建议 + 快捷操作 | 2h |
| Phase 5 | 成就进度概览 | 1.5h |
| Phase 6 | 暗色模式 + 响应式 + 骨架屏 | 2h |
| Phase 7 | 空状态 + 异常处理 + 测试 | 1.5h |

**总计**: 约 17 工时

---

## 10. 附录

### A. 现有成就类型与阈值

来自 `backend/utils/achievementChecker.js` 的 `ACHIEVEMENT_DEFS`：

| 类别 | 成就 | 阈值 |
|------|------|------|
| 发布者 | 初出茅庐 / 小有成就 / 食谱达人 / 高产作者 / 厨神 | 1/10/50/100/200 |
| 收藏家 | 美食猎人 / 收藏达人 / 收藏大师 / 收藏狂人 | 10/50/100/500 |
| 评论家 | 畅所欲言 / 评论之星 / 评论达人 / 评论大师 | 1/10/50/100 |
| 厨神 | 初次下厨 / 家常便饭 / 厨房常客 / 烹饪高手 | 1/10/50/100 |
| 探索家 | 走马观花 / 博览群食 / 资深食客 | 100/500/1000 |
| 社交 | 小有人气 / 人气渐旺 / 社区红人 / 人气食谱 / 社交达人 | 10/50/100/50fav/20 |

### B. categoryTags 枚举值（从 seed 数据分析）

| 维度 | 常见值 |
|------|--------|
| cuisine | 川菜、粤菜、湘菜、鲁菜、家常菜、日料、韩料、西餐 |
| flavor | 麻辣、酸甜、咸鲜、甜、甜辣、清淡、香辣 |
| ingredient | 肉类、海鲜类、蔬菜类、豆制品、蛋奶类、主食类 |
| method | 炒、炖、煮、蒸、烤、炸、拌、煎 |
| price | 经济实惠、普通家常、中档、高档 |

---

> **文档状态**: 待评审 | **作者**: AI Agent (product subagent) | **审核**: 待指定
