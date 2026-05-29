# PRD：每日食谱推荐 + RecommendPage 兼容修复

> 版本: 1.0 | 日期: 2026-05-29 | 基于 Commit: 70447c2 | 技术栈: React 18 + Express + Sequelize + MariaDB

---

## 1. 背景与目标

### 1.1 背景

当前首页（HomePage.tsx）在 HeroSection 轮播与搜索栏之间缺少内容填充，用户进入首页后视线从轮播直接跳到食谱网格，缺少「今天吃什么」的即时引导。同时，RecommendPage.tsx 存在一个 API 响应结构兼容性 Bug，导致推荐数据无法正确渲染。

### 1.2 目标

| 优先级 | 目标 | 价值 |
|--------|------|------|
| **P0** | 修复 RecommendPage API 响应读取路径 | 消除线上 Bug，推荐页恢复可用 |
| **P1** | 新建 `GET /api/recipes/daily-pick` 端点 | 提供基于日期的确定性每日推荐 |
| **P2** | 首页插入「今日推荐」大卡片模块 | 提升首页停留时长与点击率 |
| **P3** | 技术约束与质量保障 | 确保构建 0 WARNING、响应式与暗色模式兼容 |

### 1.3 设计原则

- **确定性推荐**：同一天、同一时区的所有用户看到相同的「今日推荐」（基于日期种子哈希）
- **一键换一道**：用户可主动刷新推荐，获取不同食谱
- **季节感知**：优先推荐当季食谱，增强时令感
- **暗色一致**：暖橙主色 `#e8663e` 在 light/dark 模式下均为主色调

---

## 2. 功能规格

### 2.1 P0 — RecommendPage API 兼容性修复

#### 问题描述

`RecommendPage.tsx` 中 `handleSubmit` 回调从 `recommendRecipes()` 的返回值中读取 `res.list` 和 `res.aiRecipes`：

```tsx
// 当前代码 (RecommendPage.tsx L88-L91)
const res: any = await recommendRecipes(query)
setResults(res.list || [])
setAiRecipes(res.aiRecipes || [])
```

但 Axios 响应拦截器已执行 `response => response.data`，实际返回结构为：

```json
{
  "code": 0,
  "data": {
    "list": [...],
    "aiRecommends": [...],
    "aiGenerated": true
  }
}
```

注意：后端返回的字段名为 `aiRecommends`（不是 `aiRecipes`）。

#### 修复方案

```tsx
// 修正后
const res: any = await recommendRecipes(query)
const data = res.data || res  // 兼容双层嵌套与直接返回
setResults(data.list || [])
setAiRecipes(data.aiRecommends || [])
setAiGenerated(data.aiGenerated || false)
```

同理，`loadPersonalized` 回调中的 `getPersonalizedRecommendations` 和 `getPopularRecommendations` 也需要修正：

```tsx
// 修正后
const personalizedRes: any = await getPersonalizedRecommendations(8)
setPersonalized((personalizedRes.data || personalizedRes).recipes || [])
const popularRes: any = await getPopularRecommendations(8)
setPopular((popularRes.data || popularRes).recipes || [])
```

#### 影响范围

- 文件：`frontend/src/pages/RecommendPage.tsx`
- 仅修改数据读取路径，不涉及 UI 变更
- 无需后端修改

---

### 2.2 P1 — 后端新增每日推荐端点

#### 端点定义

```
GET /api/recipes/daily-pick
GET /api/recipes/daily-pick?random=1
```

#### 推荐算法

```
输入: 日期字符串 (new Date().toDateString())
输出: 单条完整食谱

步骤:
1. 生成日期种子
   seed = hash(new Date().toDateString())  → 正整数
   
2. 获取候选集
   WHERE season = currentSeason  (优先级1: 应季)
   UNION
   WHERE isFeatured = true       (优先级2: 编辑精选)
   UNION
   WHERE qualityScore >= 5       (优先级3: 质量评分)
   排除: 无需排除（当前模型无 isHidden/isDeleted 字段）
   
3. 排序
   ORDER BY:
     - 季节匹配 DESC (season=currentSeason 得 2 分, season='all' 得 1 分, 其他 0 分)
     - isFeatured DESC
     - qualityScore DESC
     - favoriteCount DESC
   
4. 日期确定性选取
   index = seed % candidates.length
   result = candidates[index]
   
5. random=1 模式
   使用 Math.random() 代替日期种子，重新从候选集随机选取
```

#### 季节判断逻辑

```javascript
function getCurrentSeason() {
  const month = new Date().getMonth()  // 0-11
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}
```

#### 日期哈希函数

```javascript
function dateSeed(dateStr) {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i)
    hash |= 0  // 转为 32 位整数
  }
  return Math.abs(hash)
}
```

#### 返回字段

返回完整食谱信息，包含：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 食谱 ID |
| title | string | 标题 |
| description | string | 简介一句话 |
| coverImage | string | 封面图 URL |
| cookTime | number | 烹饪时长（分钟） |
| category | string | 分类 |
| difficulty | string | 难度 |
| servings | number | 份数 |
| season | string | 季节标签 |
| story | string | 烹饪故事 |
| culturalBackground | string | 文化背景 |
| tips | string | 烹饪小贴士 |
| favoriteCount | number | 收藏数 |
| viewCount | number | 浏览量 |
| categoryTags | string (JSON) | 多维分类标签 |
| nutrition | string (JSON) | 营养信息 |
| isFeatured | boolean | 编辑精选 |
| recommendReason | string | 推荐理由（如「🌟 今日推荐 · 应季美食」） |

#### 路由挂载

在 `backend/routes/index.js` 中，**必须在 `router.use('/recipes', recipeRoutes)` 之前**注册，避免 `/:id` 路径参数拦截：

```javascript
// 在 recipes 路由之前
router.use('/recipes/daily-pick', require('./dailyPick'))
```

---

### 2.3 P2 — 前端首页「今日推荐」区块

#### 插入位置

在 `HomePage.tsx` 的 `HeroSection` 和搜索栏之间：

```tsx
{/* ── 精选轮播 ── */}
{showFullLayout && <HeroSection recipes={heroRecipes} />}

{/* ── 今日推荐 ── (新增) */}
{showFullLayout && <DailyPickCard />}

{/* ── 搜索栏 ── */}
<form className="home-search" ...>
```

仅在 `showFullLayout`（category === '全部' 且无筛选条件）时显示。

#### 组件设计

**DailyPickCard** 组件（`frontend/src/components/DailyPickCard.tsx`）：

```tsx
interface DailyPickCardProps {
  // 无需外部 props，组件内部自行获取数据
}

interface DailyPickState {
  recipe: Recipe | null
  loading: boolean
  error: string | null
  isShuffling: boolean  // 「换一道」动画状态
}
```

#### 交互流程

1. 组件挂载 → 调用 `GET /api/recipes/daily-pick` → 渲染大卡片
2. 用户点击「换一道」→ 调用 `GET /api/recipes/daily-pick?random=1` → 卡片内容切换（带淡入动画）
3. 用户点击卡片 → 跳转 `/recipe/:id` 详情页
4. 加载中 → 显示骨架屏
5. 加载失败 → 不显示该区块（静默降级，不影响页面其他部分）

---

## 3. API 设计

### 3.1 每日推荐端点

**请求**

```
GET /api/recipes/daily-pick
GET /api/recipes/daily-pick?random=1
GET /api/recipes/daily-pick?t=1748524800000
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| random | number | 否 | 传 `1` 时使用随机种子代替日期种子 |
| t | number | 否 | 时间戳参数，效果同 random=1（用于 bust 缓存） |

**响应 — 成功 (200)**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "西红柿炒鸡蛋",
    "description": "经典家常菜，酸甜可口，新手零失败",
    "coverImage": "https://example.com/images/tomato-egg.jpg",
    "cookTime": 15,
    "category": "中餐",
    "difficulty": "easy",
    "servings": 2,
    "season": "summer",
    "story": "这道菜是中国家庭餐桌上出现频率最高的菜肴之一……",
    "culturalBackground": "西红柿炒鸡蛋是中国菜中最具代表性的家常菜……",
    "tips": "鸡蛋先炒至七分熟盛出，最后回锅，口感更嫩滑",
    "favoriteCount": 128,
    "viewCount": 3456,
    "categoryTags": "{\"ingredient\":\"蛋类\",\"method\":\"炒\",\"cuisine\":\"家常菜\",\"flavor\":\"酸甜\",\"price\":\"经济\"}",
    "nutrition": "{\"calories\":180,\"protein\":12,\"fat\":10,\"carbs\":8}",
    "isFeatured": true,
    "recommendReason": "🌟 今日推荐 · 应季美食"
  }
}
```

**响应 — 无可用食谱 (200)**

```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

**响应 — 服务器错误 (500)**

```json
{
  "code": 500,
  "message": "服务器内部错误",
  "data": null
}
```

### 3.2 前端 API 函数

在 `frontend/src/api.ts` 新增：

```typescript
/**
 * 获取每日推荐食谱
 * GET /api/recipes/daily-pick
 */
export interface DailyPickRecipe extends Recipe {
  recommendReason: string
}

export function getDailyPick(random?: boolean): Promise<DailyPickRecipe | null> {
  const params: Record<string, string> = {}
  if (random) params.random = '1'
  return apiClient.get('/recipes/daily-pick', { params })
    .then((r: any) => r.data?.data || r.data || null)
}
```

---

## 4. 前端组件设计

### 4.1 组件树

```
HomePage
├── HeroSection (已有)
├── DailyPickCard (新增) ← 插入点
│   ├── .daily-pick-card
│   │   ├── .daily-pick-card__cover (封面图)
│   │   │   └── .daily-pick-card__tag (推荐理由标签)
│   │   └── .daily-pick-card__content (内容区)
│   │       ├── .daily-pick-card__header
│   │       │   ├── .daily-pick-card__title (标题)
│   │       │   └── .daily-pick-card__shuffle-btn (「换一道」按钮)
│   │       ├── .daily-pick-card__desc (一句话描述)
│   │       └── .daily-pick-card__meta (烹饪时间 + 难度 + 分类)
│   └── .daily-pick-card--skeleton (骨架屏)
├── SearchAutocomplete (已有)
└── ... (其余已有组件)
```

### 4.2 组件 Props

**DailyPickCard** — 无外部 Props，内部管理状态：

```typescript
// 内部状态
const [recipe, setRecipe] = useState<DailyPickRecipe | null>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
const [isShuffling, setIsShuffling] = useState(false)
```

### 4.3 状态机

```
[初始] → loading=true → API 调用
  ├→ 成功 → loading=false, recipe=data, error=null
  ├→ 失败 → loading=false, recipe=null, error=msg (静默不显示区块)
  └→ 空数据 → loading=false, recipe=null (静默不显示区块)

[用户点击「换一道」] → isShuffling=true → API 调用 (random=1)
  ├→ 成功 → 淡入动画 → isShuffling=false, recipe=newData
  └→ 失败 → isShuffling=false (保持当前食谱)
```

---

## 5. 视觉规范

### 5.1 配色

| 元素 | Light 模式 | Dark 模式 |
|------|-----------|-----------|
| 卡片背景 | `var(--color-card, #fff)` | `var(--color-card-dark, #1e1e1e)` |
| 卡片边框 | `var(--color-border, #e8e0d8)` | `var(--color-border-dark, #333)` |
| 推荐理由标签背景 | `rgba(232, 102, 62, 0.12)` | `rgba(232, 102, 62, 0.2)` |
| 推荐理由标签文字 | `var(--color-primary, #e8663e)` | `#f08c6e` |
| 标题 | `var(--color-text, #1a1a1a)` | `var(--color-text-dark, #e8e0d8)` |
| 描述 | `var(--color-text-muted, #888)` | `var(--color-text-muted-dark, #999)` |
| 元信息 | `var(--color-text-muted, #888)` | `var(--color-text-muted-dark, #999)` |
| 「换一道」按钮 | `var(--color-primary, #e8663e)` | `#f08c6e` |
| 「换一道」按钮 hover | `#d45a35` | `#e8663e` |
| 卡片阴影 | `var(--shadow-md, 0 4px 16px rgba(0,0,0,0.1))` | `0 4px 16px rgba(0,0,0,0.3)` |

### 5.2 间距与圆角

| 属性 | 值 | 来源 |
|------|-----|------|
| 卡片圆角 | `var(--radius-lg, 16px)` | 与 HeroSection 一致 |
| 卡片内边距 | `24px` | 内容区左右内边距 |
| 封面图圆角（桌面） | `var(--radius-md, 12px)` | 左侧封面图 |
| 标签圆角 | `var(--radius-sm, 8px)` | 推荐理由标签 |
| 标题字号 | `20px` | font-weight: 700 |
| 描述字号 | `14px` | line-height: 1.6 |
| 元信息字号 | `13px` | |
| 卡片上下 margin | `16px` | 与搜索栏间距一致 |
| 封面与内容间距（桌面） | `24px` | gap |

### 5.3 暗色模式

使用 `body.dark` 选择器覆写（与项目现有暗色模式方案一致）：

```css
/* Light 模式 */
.daily-pick-card {
  background: var(--color-card, #fff);
  border: 1px solid var(--color-border, #e8e0d8);
  box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.1));
}

/* Dark 模式 */
body.dark .daily-pick-card {
  background: var(--color-card-dark, #1e1e1e);
  border-color: var(--color-border-dark, #333);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}
```

### 5.4 动画

| 交互 | 动画 | 时长 |
|------|------|------|
| 卡片初始加载 | `fadeIn 0.35s ease` | 350ms |
| 「换一道」内容切换 | `fadeOut → fadeIn` | 各 200ms |
| 「换一道」按钮旋转图标 | `rotate(360deg)` | 400ms |
| 卡片 hover | `translateY(-2px)` | 200ms |

---

## 6. 响应式断点

### 6.1 桌面（> 768px）

```
┌────────────────────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌───────────────────────────────────────────┐  │
│  │              │  │ 🌟 今日推荐 · 应季美食                     │  │
│  │   封面图      │  │                                           │  │
│  │  16:9 比例    │  │ 西红柿炒鸡蛋                    [换一道] │  │
│  │  max-width   │  │ 经典家常菜，酸甜可口，新手零失败            │  │
│  │  320px       │  │ ⏱ 15分钟 · 简单 · 中餐                    │  │
│  │              │  │                                           │  │
│  └──────────────┘  └───────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

布局：`flex-direction: row`，封面占 `40%`，内容占 `60%`，gap `24px`

### 6.2 移动（≤ 768px）

```
┌────────────────────────────┐
│ 🌟 今日推荐 · 应季美食      │
│                            │
│  ┌──────────────────────┐  │
│  │      封面图            │  │
│  │     16:9 比例          │  │
│  └──────────────────────┘  │
│                            │
│ 西红柿炒鸡蛋      [换一道] │
│ 经典家常菜，酸甜可口       │
│ ⏱ 15分钟 · 简单 · 中餐     │
└────────────────────────────┘
```

布局：`flex-direction: column`，封面全宽，内容紧接下方

### 6.3 关键断点

| 断点 | 布局变更 |
|------|---------|
| > 768px | 左右布局，封面 40% / 内容 60% |
| ≤ 768px | 上下布局，封面全宽，内容区 padding 缩至 16px |
| ≤ 480px | 标题字号缩至 18px，描述缩至 13px，标签字号缩至 12px |

---

## 7. 测试用例

### 7.1 P0 — RecommendPage 兼容性修复

| ID | 场景 | 预期结果 |
|----|------|---------|
| T0-1 | 搜索食材后，API 返回 `{code:0, data:{list:[...], aiRecommends:[...]}}` | `results` 正确读取 `data.list`，`aiRecipes` 正确读取 `data.aiRecommends` |
| T0-2 | API 返回空 `data.list` | `results` 为空数组 `[]`，不报错 |
| T0-3 | API 返回 `{list:[...]}` 无外层 data | 兼容直接返回，`results` 正确读取 `list` |
| T0-4 | 个性化推荐 API 返回 `{code:0, data:{recipes:[...]}}` | `personalized` 正确读取 |
| T0-5 | 热门推荐 API 返回 `{code:0, data:{recipes:[...]}}` | `popular` 正确读取 |

### 7.2 P1 — 每日推荐端点

| ID | 场景 | 预期结果 |
|----|------|---------|
| T1-1 | 同一天多次调用 `GET /api/recipes/daily-pick` | 返回相同食谱（确定性） |
| T1-2 | 不同天调用 `GET /api/recipes/daily-pick` | 可能返回不同食谱 |
| T1-3 | 调用 `GET /api/recipes/daily-pick?random=1` | 返回随机食谱，与日期种子无关 |
| T1-4 | 调用 `GET /api/recipes/daily-pick?t=1748524800000` | 效果同 random=1 |
| T1-5 | 数据库无食谱 | 返回 `{code:0, data:null}` |
| T1-6 | 存在应季食谱（season=currentSeason） | 应季食谱优先级高于非应季 |
| T1-7 | 存在编辑精选食谱（isFeatured=true） | 精选食谱优先级高于普通食谱 |
| T1-8 | 候选集按 qualityScore DESC → favoriteCount DESC 排序 | 高质量、高收藏的食谱排在前面 |
| T1-9 | 返回字段包含 story, culturalBackground, tips | 完整食谱信息 |
| T1-10 | 返回 recommendReason 字段 | 格式如 `🌟 今日推荐 · 应季美食` |

### 7.3 P2 — 前端今日推荐模块

| ID | 场景 | 预期结果 |
|----|------|---------|
| T2-1 | 首页加载，category='全部'，无筛选 | 今日推荐卡片显示 |
| T2-2 | 首页加载，category='中餐' | 今日推荐卡片不显示 |
| T2-3 | API 返回食谱数据 | 卡片显示封面、标题、描述、烹饪时间、推荐理由 |
| T2-4 | 点击卡片 | 跳转至 `/recipe/:id` |
| T2-5 | 点击「换一道」 | 调用 `?random=1` API，内容切换带淡入动画 |
| T2-6 | API 加载中 | 显示骨架屏 |
| T2-7 | API 返回 null | 不显示今日推荐区块 |
| T2-8 | API 失败 | 静默降级，不显示区块，不影响页面其他部分 |
| T2-9 | 桌面端 (>768px) | 左右布局，封面 40% + 内容 60% |
| T2-10 | 移动端 (≤768px) | 上下布局，封面全宽 |
| T2-11 | 暗色模式 | 配色正确切换，暖橙主色保持 |
| T2-12 | 「换一道」连续点击 | 防抖处理，避免重复请求 |
| T2-13 | `showFullLayout=false` | 今日推荐区块不显示 |

---

## 8. 验收标准

### 8.1 P0 验收（RecommendPage 修复）

- [ ] RecommendPage 搜索食材后，数据库匹配结果正确渲染
- [ ] AI 推荐结果正确渲染（字段名 `aiRecommends`）
- [ ] 个性化推荐和热门推荐 Tab 数据正确加载
- [ ] 无控制台报错（undefined 读取）

### 8.2 P1 验收（每日推荐端点）

- [ ] `GET /api/recipes/daily-pick` 返回 200 + 单条食谱
- [ ] 同一天多次调用返回相同食谱
- [ ] `?random=1` 返回不同食谱
- [ ] 推荐优先级：应季 > 编辑精选 > 质量评分 > 收藏数
- [ ] 返回 `recommendReason` 字段
- [ ] 无食谱时返回 `data: null`，不返回 500
- [ ] 不引入新的 npm 依赖
- [ ] 路由注册在 `/:id` 之前，不被路径参数拦截

### 8.3 P2 验收（前端今日推荐模块）

- [ ] 首页 HeroSection 下方显示今日推荐大卡片
- [ ] 点击卡片跳转食谱详情页
- [ ] 「换一道」按钮功能正常，带动画
- [ ] 桌面端左右布局，移动端上下布局
- [ ] 暗色模式配色正确
- [ ] 骨架屏加载状态正常
- [ ] API 失败时静默降级

### 8.4 P3 验收（技术约束）

- [ ] `npm run build` 0 WARNING、0 ERROR
- [ ] 后端仅使用 Sequelize 查询，无新依赖
- [ ] 前端使用现有 `api.ts` 中的 `apiClient`
- [ ] 所有新增 CSS 类使用 `var(--xxx)` 变量，不硬编码色值
- [ ] 响应式断点覆盖 >768px / ≤768px / ≤480px
- [ ] 暗色模式使用 `body.dark` 选择器

---

## 附录 A：文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/src/pages/RecommendPage.tsx` | 修改 | 修正 API 响应读取路径 |
| `frontend/src/api.ts` | 修改 | 新增 `getDailyPick()` 函数和 `DailyPickRecipe` 类型 |
| `frontend/src/components/DailyPickCard.tsx` | 新增 | 今日推荐卡片组件 |
| `frontend/src/components/DailyPickCard.css` | 新增 | 卡片样式（含暗色模式） |
| `frontend/src/pages/HomePage.tsx` | 修改 | 插入 `<DailyPickCard />` |
| `frontend/src/pages/HomePage.css` | 修改 | 新增少量间距调整 |
| `backend/routes/dailyPick.js` | 新增 | 每日推荐端点路由 |
| `backend/routes/index.js` | 修改 | 注册 `/recipes/daily-pick` 路由 |

## 附录 B：推荐理由文案规则

| 条件 | 文案 |
|------|------|
| season 匹配当前季节 | `🌟 今日推荐 · 应季美食` |
| isFeatured = true | `🌟 今日推荐 · 编辑精选` |
| qualityScore ≥ 8 | `🌟 今日推荐 · 高品质食谱` |
| 其他 | `🌟 今日推荐` |

按条件优先级取第一个匹配项。
