# 食谱快速预览与互动增强 PRD

> **项目**: food-website | **迭代**: #117 | **方向**: B/功能增强  
> **技术栈**: React 18 + TypeScript + Vite + Express + Sequelize + MariaDB  
> **暗色模式**: `body.dark` 选择器，CSS 变量 `--color-xxx`  
> **当前 commit**: 74bdafa  
> **文档版本**: v1.0 | **日期**: 2026-06-10

---

## 目录

1. [背景与目标](#1-背景与目标)
2. [功能规格](#2-功能规格)
   - [2.1 食谱卡片快速预览（QuickPreviewModal）](#21-食谱卡片快速预览quickpreviewmodal)
   - [2.2 食谱卡片交互增强](#22-食谱卡片交互增强)
   - [2.3 首页"今日推荐"增强](#23-首页今日推荐增强)
   - [2.4 食谱详情页"相关食谱"算法优化](#24-食谱详情页相关食谱算法优化)
3. [API 设计](#3-api-设计)
4. [组件树](#4-组件树)
5. [数据流](#5-数据流)
6. [验收标准](#6-验收标准)
7. [实施优先级](#7-实施优先级)
8. [附录：现有代码分析](#8-附录现有代码分析)

---

## 1. 背景与目标

### 1.1 当前痛点

- 用户浏览食谱列表时，**每次查看详情都需要跳转**到 `/recipe/:id` 详情页，跳转成本高
- 食谱卡片缺少**快捷操作入口**（加入购物清单、加入餐单计划等），只能进入详情页后操作
- 首页"今日推荐"仅基于**日期种子随机**，未利用用户收藏历史做个性化
- 详情页"相关食谱"已实现基于 `categoryTags` 的五维相似度，但**未加权用户偏好**

### 1.2 目标

| 目标 | 衡量指标 |
|------|----------|
| 减少详情页跳转 | Preview 弹窗打开率 > 卡片 hover 率的 40% |
| 提升快捷操作使用 | 通过卡片菜单操作的占比 > 30% |
| 个性化推荐准确率 | 用户收藏后推荐食谱的 CT 高于基线 20% |
| 相关食谱点击率 | 详情页底部推荐点击率提升 15% |

### 1.3 设计原则

- **不修改现有 API 路由**，只新增必要的端点
- **移动端优先**：模态框全屏展示，菜单底部弹出
- **暗色模式全覆盖**：所有新样式包含 `body.dark` 选择器
- **渐进增强**：未登录用户保持现有逻辑

---

## 2. 功能规格

### 2.1 食谱卡片快速预览（QuickPreviewModal）

#### 2.1.1 触发入口

- 在 `RecipeCard` 封面图区域右下角新增 **"快速预览"按钮**（👁 眼睛图标）
- 按钮在卡片 **hover 时显示**（与现有 `recipe-card__fav` 按钮保持一致）
- 移动端（≤768px）：**始终显示**，图标稍大（44×44 热区）

#### 2.1.2 模态框布局

使用 **React Portal**（`createPortal` → `document.body`），渲染层级 `z-index: 10000`。

**内容结构**（从上到下）：

```
┌─────────────────────────────────┐
│  [× 关闭]                       │  ← 固定顶部关闭按钮
├─────────────────────────────────┤
│                                 │
│       封面大图 (max-h: 40vh)    │
│                                 │
├─────────────────────────────────┤
│  标题 (h2)                      │
│  🟢 简单  ·  ⏱ 25分钟  ·  ★ 4.5 │  ← 标签行
│                                 │
│  简介（description 前 100 字）  │
│                                 │
│  📋 食材清单（前 8 个食材）     │
│  ┌─────────────────────────────┐│
│  │ 鸡肉  300g                   ││
│  │ 土豆  2个                    ││
│  │ ...  +4 种更多食材           ││  ← 超过 8 个时显示
│  └─────────────────────────────┘│
│                                 │
│  📝 步骤概要（前 3 步）         │
│  ┌─────────────────────────────┐│
│  │ 1. 鸡肉切块腌制              ││
│  │ 2. 热油爆香姜蒜              ││
│  │ 3. 加入鸡块翻炒至变色        ││
│  └─────────────────────────────┘│
│                                 │
│  [ 查看详情 → ]                 │  ← 主要 CTA 按钮
└─────────────────────────────────┘
```

#### 2.1.3 交互行为

| 交互 | 行为 |
|------|------|
| 点击 👁 按钮 | 打开模态框，阻止事件冒泡 |
| 按 `Esc` | 关闭模态框 |
| 点击遮罩层（灰色半透明背景） | 关闭模态框 |
| 点击 `×` 关闭按钮 | 关闭模态框 |
| 点击「查看详情」 | 关闭模态框，`navigate(/recipe/:id)` |
| 打开时 | `body` 设置 `overflow: hidden` 防止背景滚动 |
| 关闭时 | 恢复 `body` 滚动，清理事件监听 |

#### 2.1.4 数据来源

模态框数据优先从**当前 RecipeCard 传入的 `recipe` 对象**填充，无需额外 API 请求。但食材和步骤信息需要完整数据：

- **方案 A（推荐）**: 调整 RecipeCard 接收的 Recipe 类型，包含 `ingredients` 和 `steps` 字段（现已在部分场景可用）
- **方案 B（兜底）**: 如果 recipe 对象不含 `ingredients`/`steps`，模态框内部发起 API 请求 `GET /recipes/:id` 获取完整数据

#### 2.1.5 移动端适配

| 断点 | 模态框行为 |
|------|------------|
| >768px | 居中弹出，`max-width: 520px`，`max-height: 90vh`，圆角 `12px` |
| ≤768px | **全屏展示**，`width: 100vw`，`height: 100dvh`，无圆角，从底部滑动入场 |

#### 2.1.6 入场/离场动画

| 动画 | 桌面端 | 移动端 |
|------|--------|--------|
| 入场 | 遮罩 `opacity 0→1`，模态框 `scale 0.95→1` + `opacity 0→1`，300ms ease | 遮罩 `opacity 0→1`，模态框 `translateY(20px)→0`，300ms ease |
| 离场 | 遮罩 `opacity 1→0`，模态框 `scale 1→0.95` + `opacity 1→0`，200ms ease | 遮罩 `opacity 1→0`，模态框 `translateY(0)→20px`，200ms ease |

#### 2.1.7 暗色模式

- 遮罩背景：`rgba(0,0,0,0.6)` → `body.dark` 下 `rgba(0,0,0,0.8)`
- 模态框背景：`var(--color-card, #fff)` → `body.dark` 下 `var(--color-card-dark, #1a1a2e)`
- 文本色：`var(--color-text, #333)` → `body.dark` 下 `var(--color-text-dark, #e0e0e0)`
- 食材/步骤背景：`var(--color-bg-secondary, #f5f0eb)` → `body.dark` 下 `var(--color-bg-secondary-dark, #2a2520)`
- 关闭按钮：`color: #666` → `body.dark` 下 `color: #aaa`
- 分隔线：`var(--color-border, #eee)` → `body.dark` 下 `var(--color-border-dark, #333)`

---

### 2.2 食谱卡片交互增强

#### 2.2.1 更多操作按钮

在 RecipeCard 右上角（收藏按钮下方 4px 或右侧）新增 **"更多操作"按钮**：

- 图标：**三点竖排** `⋮`（kebab menu 图标）
- 与收藏按钮同层级显示（hover 时出现，移动端常显）
- 样式：圆形半透明背景 `rgba(255,255,255,0.85)`，直径 32px

#### 2.2.2 下拉菜单内容

点击"更多操作"按钮弹出下拉菜单（Portal 到 body，z-index: 10001）：

```
┌──────────────────────────┐
│ ❤️  收藏 / 取消收藏       │  ← 根据当前状态切换文案
│ 🛒  加入购物清单          │
│ 📅  加入餐单计划          │  ← 新增功能
│ 📤  分享                 │
│ 📁  添加到收藏夹          │  ← 复用 AddToCollectionDropdown
├──────────────────────────┤
│ ❌  取消                  │  ← 仅移动端
└──────────────────────────┘
```

#### 2.2.3 菜单项行为

| 菜单项 | 行为 | 登录检查 | Toast 反馈 |
|--------|------|----------|-----------|
| 收藏/取消收藏 | 调用 `addFavorite`/`removeFavorite`，切换按钮状态 + 更新计数 | ✅ 需要 | ✅ 收藏成功 / 已取消收藏 |
| 加入购物清单 | 调用 `generateShoppingList([recipeId])` | ✅ 需要 | ✅ 已生成购物清单 |
| 加入餐单计划 | 打开餐单计划日期选择弹窗 → 选择日期 → 调用 `POST /meal-plan/add-recipe` | ✅ 需要 | ✅ 已加入餐单计划 |
| 分享 | 打开 `ShareModal`（复用现有组件） | ❌ 不需要 | — |
| 添加到收藏夹 | 打开 `AddToCollectionDropdown`（复用现有组件） | ✅ 需要 | — |

#### 2.2.4 菜单位置策略

| 端 | 位置策略 |
|----|----------|
| 桌面端 (>768px) | 从按钮位置向右下方弹出，自动调整避免超出视口（`Math.min(x, window.innerWidth - 200)`） |
| 移动端 (≤768px) | **底部弹出**（action sheet 风格），动画从下向上滑入，占底部 40%-60% 高度 |

#### 2.2.5 长按菜单（移动端）

移动端 **长按**（≥500ms）弹出操作菜单，与"更多操作"按钮单击弹出的是**同一个菜单组件**。长按菜单位置固定在底部弹出。

**与现有关键区别**：
- 现有 RecipeCard 已有 `handleLongPress` + `showContextMenu`，需要**扩展**而非替换
- 扩展方案：将现有的上下文菜单项从 3 项扩展为完整的 5 项菜单
- 桌面端 onContextMenu（右键）也使用相同扩展菜单

#### 2.2.6 Toast 反馈规范

所有操作结果通过现有 `ToastContext` 统一反馈：

| 操作 | 类型 | 消息 |
|------|------|------|
| 收藏 | `success` | ❤️ 已收藏「{title}」 |
| 取消收藏 | `info` | 已取消收藏「{title}」 |
| 加入购物清单 | `success` | 🛒 已生成购物清单 |
| 加入购物清单失败 | `error` | 生成购物清单失败：{reason} |
| 加入餐单计划 | `success` | 📅 已加入{日期}餐单 |
| 加入餐单计划失败 | `error` | 加入餐单计划失败：{reason} |
| 分享链接复制 | `success` | 📋 链接已复制到剪贴板 |

---

### 2.3 首页"今日推荐"增强

#### 2.3.1 逻辑分支

```
用户是否登录？
├── 是 → 个性化推荐（基于收藏历史 + 季节加权）
└── 否 → 保持现有逻辑（日期种子随机，每日 1 道）
```

#### 2.3.2 个性化推荐算法（已登录用户）

**输入**：
- 用户收藏历史（`Favorite.findAll({ where: { userId } })`）
- 当前季节（按月份：3-5 春，6-8 夏，9-11 秋，12-2 冬）
- 被收藏食谱的 `categoryTags`

**步骤**：

1. **获取收藏数据**：查询用户收藏的食谱（最多 50 条），提取被收藏食谱的 `categoryTags`
2. **偏好向量构建**：对每个维度（ingredient、method、cuisine、flavor、price），统计所有收藏食谱中出现的标签频率
   ```
   preferenceVector = {
     ingredient: { '鸡肉': 12, '牛肉': 5, ... },  // 标签 → 收藏次数
     method: { '炒': 8, '炖': 3, ... },
     cuisine: { '中餐': 15, '日料': 2, ... },
     flavor: { '咸鲜': 10, '麻辣': 6, ... },
     price: { '家常': 18, '宴客': 3, ... },
   }
   ```
3. **候选食谱筛选**：获取所有非用户已收藏的食谱作为候选
4. **评分计算**：
   ```
   score = Σ(维度的标签匹配分 × 维度权重) + 季节加权分
   
   维度权重: ingredient=0.3, cuisine=0.25, flavor=0.2, method=0.15, price=0.1
   季节加权: season 匹配当前季节 → +0.2, season='all' → +0.1
   ```
5. **排序 Top 3**：按得分降序取前 3 道
6. **多样性控制**：Top 3 中最多 2 道同 category 的食谱
7. **推荐理由生成**：
   - 匹配用户 top 口味偏好 → "与你{口味标签}的口味偏好匹配"
   - 匹配当前季节 → "当季时令推荐"
   - 最高评分 → "为你精选"

#### 2.3.3 展示变化

- 每日推荐从 **1 道** 变为 **3 道**（仅登录用户）
- DailyPickCard 组件支持**水平滚动**展示（或 3 列网格布局）
- 每条推荐显示**推荐理由**标签（复用 `recommendReason` 字段）
- 未登录用户保持现有**单道推荐**样式不变

#### 2.3.4 API 设计要点

- 需要 JWT 认证（auth 中间件）
- 未登录用户走现有 `GET /api/recipes/daily-pick`（不变）
- 登录用户走新增 `GET /api/recipes/daily-pick/personalized`

---

### 2.4 食谱详情页"相关食谱"算法优化

#### 2.4.1 现状回顾

现有 `GET /recipes/:id/similar` 实现了：
- 基于 `categoryTags` 五维 Jaccard 相似度计算
- 覆盖度评分 `coverageScore`
- 多样性控制（同 category 最多 2 条）
- 返回 Top 5

#### 2.4.2 优化目标

1. **Top 6** 相关食谱（从 Top 5 扩展到 Top 6）
2. **用户偏好加权**：有登录用户的收藏食谱 `categoryTags` 权重提升
3. **季节加权**：当前季节匹配的食谱加分

#### 2.4.3 加权算法（优化后）

```
rawSimilarity = 五维 Jaccard 相似度 × 0.7 + 覆盖度 × 0.3
cuisine 额外加成: +0.1

// 新增：用户偏好加权（仅已登录用户）
if (用户已登录) {
  userPreferenceBoost = 对候选食谱各维度标签与用户偏好向量的匹配度计算
  // 候选食谱的 categoryTags 中，用户收藏最多出现的标签 → 加分
  rawSimilarity = rawSimilarity × 0.85 + userPreferenceBoost × 0.15
}

// 新增：季节加权
if (candidate.season === currentSeason) {
  rawSimilarity += 0.05
} else if (candidate.season === 'all') {
  rawSimilarity += 0.03
}

finalScore = clamp(rawSimilarity, 0, 1)
```

#### 2.4.4 用户偏好加权详解

```
userPreferenceBoost = Σ(对 5 个维度，候选标签在用户偏好中的出现次数 ÷ 候选标签总数) / 5

示例：
  候选食谱 categoryTags.ingredient = ['鸡肉', '土豆']
  用户偏好中 '鸡肉' 出现 12 次，'土豆' 出现 3 次
  ingredient boost = (12 + 3) / (totalFavIngredients) 归一化到 [0, 1]
```

#### 2.4.5 与现有实现的关系

- **不新建端点**：增强现有的 `GET /recipes/:id/similar`
- **认证可选**：通过 `auth` 中间件的 `optional` 模式（或手动检查 `req.headers.authorization`）
- **向下兼容**：未登录用户不应用用户偏好加权，其他逻辑不变
- **Top 6**：将 `limit` 从 5 改为 6

---

## 3. API 设计

### 3.1 新增端点

#### 3.1.1 `GET /api/recipes/daily-pick/personalized`

**描述**：获取当前用户的个性化每日推荐

**认证**：需要 JWT

**请求参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| limit | integer | 否 | 3 | 返回数量 |

**响应**：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "picks": [
      {
        "id": "uuid",
        "title": "宫保鸡丁",
        "description": "...",
        "coverImage": "/uploads/xxx.jpg",
        "category": "chinese",
        "difficulty": "medium",
        "cookTime": 25,
        "servings": 3,
        "season": "all",
        "reason": "与你「麻辣」的口味偏好匹配；当季时令推荐",
        "score": 0.85
      }
    ],
    "generatedAt": "2026-06-10T03:00:00Z"
  }
}
```

**算法流程**：

1. `auth` 中间件提取 `userId`
2. `Favorite.findAll({ where: { userId }, include: [Recipe], limit: 50 })`
3. 构建偏好向量（5 维标签频率统计）
4. `Recipe.findAll({ where: { id: { [Op.notIn]: favoritedIds } } })`
5. 对每个候选食谱计算加权得分
6. 多样性过滤 → 排序 → Top N → 生成推荐理由

**缓存策略**：`Cache-Control: private, max-age=300`（5 分钟，个人化不共享缓存）

#### 3.1.2 `POST /api/meal-plan/add-recipe`

**描述**：将食谱添加到指定日期的餐单计划中

**认证**：需要 JWT

**请求体**：

```json
{
  "recipeId": "uuid",
  "date": "2026-06-15",
  "mealType": "lunch"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| recipeId | string (UUID) | ✅ | 食谱 ID |
| date | string (YYYY-MM-DD) | ✅ | 目标日期 |
| mealType | string | ✅ | 餐次：breakfast/lunch/dinner/snack |

**响应**：

```json
{
  "code": 0,
  "message": "已加入餐单计划",
  "data": {
    "mealPlanId": "uuid",
    "recipeId": "uuid",
    "date": "2026-06-15",
    "mealType": "lunch"
  }
}
```

**后端逻辑**：

1. 查询或创建该周餐单（`weekStart = 该周周一`）
2. 将食谱添加到 `meals` JSON 数组中对应日期和餐次
3. 返回更新后的餐单信息

### 3.2 修改端点

#### 3.2.1 `GET /api/recipes/:id/similar`（增强）

**变更**：

| 项目 | 变更前 | 变更后 |
|------|--------|--------|
| 返回数量 | Top 5 | **Top 6** |
| 用户偏好加权 | 无 | 登录用户：`rawSimilarity × 0.85 + userPreferenceBoost × 0.15` |
| 季节加权 | 无 | 季节匹配 +0.05，all +0.03 |
| 认证 | 无 | 可选（从 `req.headers.authorization` 提取 userId） |

**新增参数**：无（自动从 Authorization header 提取用户信息）

**响应新增字段**：

```json
{
  "userPreferenceBoosted": true,     // 是否应用了用户偏好加权
  "preferenceDimensions": ["cuisine", "flavor"]  // 偏好的维度
}
```

#### 3.2.2 `GET /api/recipes`（可选增强）

**变更**：在 list 接口中为登录用户的收藏食谱增加 `isFavorited: true` 标记（若已实现可跳过）。

---

## 4. 组件树

### 4.1 新增组件

```
frontend/src/components/recipe/           ← 新建目录
├── QuickPreviewModal.tsx                  ← 快速预览模态框
├── QuickPreviewModal.css                  ← 模态框样式
├── RecipeActionMenu.tsx                   ← 操作菜单（下拉/底部弹出）
└── RecipeActionMenu.css                   ← 菜单样式
```

### 4.2 修改组件

```
frontend/src/components/
├── RecipeCard.tsx                         ← 添加预览按钮 + 更多操作按钮 + 扩展长按菜单
├── RecipeCard.css                         ← 新按钮样式 + 暗色模式
├── DailyPickCard.tsx                      ← 支持多道推荐展示
├── DailyPickCard.css                      ← 多列布局 + 滚动容器
└── SimilarRecipes.tsx                     ← 显示偏好的维度标签（小改动）
```

```
frontend/src/pages/
└── HomePage.tsx                           ← 个性化推荐数据获取逻辑
```

### 4.3 组件依赖关系

```
HomePage
├── DailyPickCard (多道推荐, props: { picks: PersonalizedPick[] })
│   └── 每个 pick → 点击 → QuickPreviewModal 或 跳转详情
│
RecipeCard
├── 👁 QuickPreview 按钮 → QuickPreviewModal (Portal)
├── ⋮ 更多操作按钮 → RecipeActionMenu (Portal)
│   ├── 收藏/取消收藏 → FavoriteButton (现有)
│   ├── 加入购物清单 → AddToShoppingListButton (现有, 内联调用)
│   ├── 加入餐单计划 → MealPlanDatePicker (新, 日期选择子组件)
│   ├── 分享 → ShareModal (现有)
│   └── 添加到收藏夹 → AddToCollectionDropdown (现有)
│
RecipeDetailPage
├── SimilarRecipes (增强, 显示偏好维度标签)
│
QuickPreviewModal (Portal to document.body)
├── 封面图
├── 标题 + 标签
├── 简介
├── 食材清单 (前 8)
├── 步骤概要 (前 3)
└── 查看详情按钮
```

---

## 5. 数据流

### 5.1 快速预览数据流

```
用户点击 👁 按钮
  → RecipeCard.props.recipe 对象传入 QuickPreviewModal
  → QuickPreviewModal 检查 recipe.steps 和 recipe.ingredients
     ├── 存在 → 直接渲染
     └── 不存在 → useEffect 内请求 GET /recipes/:id (abort-controller)
  → 渲染模态框内容
  → 用户点击「查看详情」
     → navigate(/recipe/:id) + 关闭模态框
```

### 5.2 操作菜单数据流

```
用户点击 ⋮ 或长按
  → RecipeActionMenu 弹出
  → 用户选择操作
     ├── 收藏 → POST/DELETE /api/favorites → Toast 反馈 → 更新 isFavorited 状态
     ├── 购物清单 → POST /api/shopping-list/generate → Toast 反馈
     ├── 餐单计划 → MealPlanDatePicker → POST /api/meal-plan/add-recipe → Toast 反馈
     ├── 分享 → 打开 ShareModal → navigator.share / clipboard
     └── 收藏夹 → AddToCollectionDropdown → POST /api/collections/:id/recipes
  → 关闭菜单
```

### 5.3 个性化推荐数据流

```
HomePage 加载
  → 检查 isAuthenticated
     ├── 是 → GET /api/recipes/daily-pick/personalized
     │       → 后端分析用户收藏 → 偏好向量 → 加权评分 → Top 3
     │       → 返回 { picks: [{ recipe, reason, score }] }
     │       → DailyPickCard 渲染 3 道推荐
     │
     └── 否 → GET /api/recipes/daily-pick（现有逻辑）
             → 日期种子随机 → 返回 1 道
             → DailyPickCard 渲染 1 道推荐（样式不变）
```

### 5.4 相关食谱推荐数据流

```
RecipeDetailPage 加载
  → GET /recipes/:id/similar (headers: Authorization if logged in)
  → 后端
     ├── 查找 source recipe
     ├── 获取 candidates (80 条)
     ├── 五维 Jaccard 相似度计算
     ├── [NEW] 如果有 userId → 查询用户收藏 → 构建偏好向量 → 加权
     ├── [NEW] 季节加权
     ├── 多样性控制 + 排序 → Top 6
     └── 返回 { list: [{ recipe, similarity, userPreferenceBoosted, ... }] }
  → SimilarRecipes 渲染 6 张迷你卡片
  → 显示相似度百分比 + 偏好维度标签
```

---

## 6. 验收标准

### 6.1 QuickPreviewModal

| # | 验收项 | 条件 |
|---|--------|------|
| 1 | 👁 按钮显示 | 桌面端 card hover 时显示；移动端常显 |
| 2 | 模态框打开 | 点击 👁 按钮，Portal 到 body，`overflow: hidden` |
| 3 | 内容完整性 | 封面图 + 标题 + 难度/时间/评分 + 简介 ≤100字 + 食材 ≤8个 + 步骤 ≤3步 |
| 4 | Esc 关闭 | 按 Esc 键关闭模态框，恢复 body 滚动 |
| 5 | 遮罩关闭 | 点击模态框外部遮罩区域关闭 |
| 6 | 查看详情跳转 | 点击「查看详情」关闭模态框并跳转到 `/recipe/:id` |
| 7 | 移动端全屏 | ≤768px 全屏展示，底部滑入动画 |
| 8 | 暗色模式 | `body.dark` 下所有元素正常显示，颜色适配 |
| 9 | 数据兜底 | recipe 不含 steps/ingredients 时，模态框自动请求完整数据 |
| 10 | 无障碍 | 焦点管理：打开时 focus 到模态框，关闭时 focus 回触发按钮 |

### 6.2 RecipeActionMenu

| # | 验收项 | 条件 |
|---|--------|------|
| 11 | ⋮ 按钮显示 | 与收藏按钮同层级，hover 显示（移动端常显） |
| 12 | 下拉菜单弹出 | 点击 ⋮ 弹出 5 项菜单（收藏/购物清单/餐单计划/分享/收藏夹） |
| 13 | 收藏切换 | 收藏/取消收藏正确切换，按钮状态同步更新 |
| 14 | 购物清单 | 调用 generateShoppingList，成功/失败 Toast |
| 15 | 餐单计划 | 日期选择后调用 add-recipe API，Toast 反馈 |
| 16 | 分享 | 打开 ShareModal 或调用 navigator.share |
| 17 | 长按菜单（移动端） | 长按 ≥500ms 底部弹出同名菜单 |
| 18 | 点击外部关闭 | 菜单外部点击/滚动关闭 |
| 19 | 暗色模式 | `body.dark` 下菜单颜色适配 |
| 20 | 登录拦截 | 需要登录的操作（收藏/清单/餐单/收藏夹），未登录时引导到 /login |

### 6.3 个性化今日推荐

| # | 验收项 | 条件 |
|---|--------|------|
| 21 | 登录用户推荐 | 显示 3 道推荐，每道有推荐理由 |
| 22 | 推荐基于收藏 | 推荐食谱的 categoryTags 与用户收藏史有相关性 |
| 23 | 季节加权 | 当季食谱排名更靠前 |
| 24 | 未登录保持 | 未登录用户保持现有单道随机推荐 |
| 25 | 多样性 | Top 3 最多 2 道同 category |
| 26 | 刷新功能 | 「换一道」支持整体刷新（重新计算） |

### 6.4 相关食谱优化

| # | 验收项 | 条件 |
|---|--------|------|
| 27 | Top 6 | 返回 6 条相关食谱 |
| 28 | 登录加权 | 登录用户收藏过的 category 食谱排名提升 |
| 29 | 季节加权 | 当季食谱有小幅度加分 |
| 30 | 向下兼容 | 未登录用户行为不变（不应用偏好加权） |
| 31 | 排除自身 | 不包含当前食谱 |
| 32 | 相似度显示 | 显示百分比相似度（≥30% 时） |

### 6.5 跨功能

| # | 验收项 | 条件 |
|---|--------|------|
| 33 | 不修改现有 API | 除 similar 增强外，只新增端点，现有路由签名不变 |
| 34 | Toast 一致性 | 所有操作使用现有 ToastContext 反馈 |
| 35 | 移动端友好 | 所有交互在 ≤768px 下可用且体验良好 |
| 36 | 暗色模式全覆盖 | 所有新组件、新样式包含 `body.dark` 选择器 |
| 37 | TypeScript 类型安全 | 所有新组件/函数完整类型定义 |

---

## 7. 实施优先级

### P0 — 核心功能，本迭代必须完成

| 序号 | 功能 | 工作内容 | 预估工时 |
|------|------|----------|----------|
| P0-1 | **QuickPreviewModal** | 创建 QuickPreviewModal 组件 + CSS + RecipeCard 集成 | 6h |
| P0-2 | **RecipeActionMenu（基础）** | 创建 RecipeActionMenu 组件 + CSS（收藏/分享/购物清单 3 项） | 4h |
| P0-3 | **RecipeCard 按钮集成** | 添加 👁 和 ⋮ 按钮 + hover 样式 | 2h |

### P1 — 高优先级，本迭代尽力完成

| 序号 | 功能 | 工作内容 | 预估工时 |
|------|------|----------|----------|
| P1-1 | **个性化今日推荐** | 后端偏好分析算法 + 新端点 + DailyPickCard 多道展示 | 6h |
| P1-2 | **RecipeActionMenu（完整）** | 餐单计划日期选择 + 收藏夹选项 | 3h |
| P1-3 | **相关食谱优化** | similar 端点增强（偏好加权 + 季节加权 + Top 6） | 3h |
| P1-4 | **长按菜单扩展** | RecipeCard 现有长按菜单扩展为 5 项 | 1.5h |

### P2 — 锦上添花，可延后

| 序号 | 功能 | 工作内容 | 预估工时 |
|------|------|----------|----------|
| P2-1 | **推荐理由精细化** | 推荐算法输出更人性化的推荐理由文案 | 2h |
| P2-2 | **每日推荐缓存优化** | 个性化推荐结果缓存到 Redis/内存 | 2h |
| P2-3 | **预览动画打磨** | 入场/离场动画微调，骨架屏加载态 | 1.5h |
| P2-4 | **无障碍增强** | 焦点陷阱、ARIA 标签、键盘导航 | 1h |

**总预估工时**：P0 12h + P1 13.5h = 25.5h（约 3-4 个工作日）

---

## 8. 附录：现有代码分析

### 8.1 可复用的现有组件/模式

| 现有组件 | 位置 | 复用方式 |
|----------|------|----------|
| `FavoriteButton` | `frontend/src/components/FavoriteButton.tsx` | RecipeActionMenu 中内联调用 |
| `AddToShoppingListButton` | `frontend/src/components/AddToShoppingListButton.tsx` | RecipeActionMenu 中内联调用其 handleClick |
| `AddToCollectionDropdown` | `frontend/src/components/AddToCollectionDropdown.tsx` | RecipeActionMenu 中作为子选项渲染 |
| `ShareModal` | `frontend/src/components/ShareModal.tsx` | RecipeActionMenu 中触发打开 |
| `ToastContext` | `frontend/src/context/ToastContext.tsx` | 所有操作反馈 |
| `useLongPress` | `frontend/src/hooks/useLongPress.ts` | RecipeCard 现有长按逻辑扩展 |
| `ImagePlaceholder` | `frontend/src/components/ImagePlaceholder.tsx` | QuickPreviewModal 中封面图兜底 |
| `useDeferredMount` | `frontend/src/hooks/useDeferredMount.ts` | 如需要可优化 DailyPickCard 挂载 |

### 8.2 关键数据字段

**Recipe.categoryTags 格式**（JSON 字符串，getter 自动解析）：

```json
{
  "ingredient": ["鸡肉", "花生", "辣椒"],
  "method": ["炒", "炸"],
  "cuisine": ["中式", "川菜"],
  "flavor": ["麻辣", "咸鲜"],
  "price": ["家常"]
}
```

**Recipe.season 字段**：`spring` | `summer` | `autumn` | `winter` | `all`

### 8.3 现有相似度计算逻辑位置

- 文件：`backend/routes/recipes.js`，路由 `GET /:id/similar`（约 line 1398-1575）
- 核心：五维 Jaccard 相似度 + 覆盖度评分 + 多样性控制
- 需要在此处增加用户偏好加权和季节加权逻辑

### 8.4 RecipeCard 现有交互

- `hover`：显示收藏按钮、hover overlay（描述预览）
- `onClick`：跳转到 `/recipe/:id`
- `longPress (≥500ms)`：弹出上下文菜单（收藏/购物清单/分享 3 项）
- `onContextMenu`：右键弹出菜单（桌面端）
- 现有上下文菜单位置：`position: fixed`，自动避免视口溢出

---

## 变更记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-06-10 | 初始版本 |
