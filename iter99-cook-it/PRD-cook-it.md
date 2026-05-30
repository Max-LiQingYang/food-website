# PRD: 食谱"我做过"标记系统（Cook It）

> **项目**: food-website · **迭代**: iter99 · **日期**: 2026-05-30  
> **技术栈**: React 18 + TypeScript / Express + Sequelize / MariaDB (生产) + SQLite (开发)  
> **部署**: http://39.103.68.205/ · **Git HEAD**: aa02bd7

---

## 1. 背景与目标

### 1.1 现状

项目已具备收藏（Favorite）和烹饪日志（CookingLog）两个功能，但两者之间存在体验断点：

- **收藏 ≠ 做过**：用户收藏食谱往往只是"想做的"，无法表达"已经做过"
- **CookingLog 入口深**：需要主动进入烹饪日志页面创建，与食谱详情页割裂
- **缺少社交信号**：食谱详情页无法展示"多少人做过这道菜"，缺乏社区氛围
- **用户主页维度单一**：UserProfilePage 只有"发布的食谱/收藏/收藏夹/足迹/改编"，缺少"我的烹饪"维度

### 1.2 目标

| # | 目标 | 度量 |
|---|------|------|
| G1 | 一键标记"我做过" | 操作 ≤ 1 次点击 |
| G2 | 累计烹饪次数 | 支持 count 累加（重复做同一道菜） |
| G3 | 食谱社交信号 | 详情页显示"总做过人数" |
| G4 | CookingLog 联动 | 标记后可快捷创建烹饪日志 |
| G5 | 用户主页烹饪维度 | 新增"我的烹饪"标签页 |

---

## 2. 用户故事

### 核心用户故事

| ID | 角色 | 故事 | 验收条件 |
|----|------|------|----------|
| US-1 | 普通用户 | 我想一键标记自己做过某道食谱，方便记录 | 点击按钮即完成标记，再次点击取消 |
| US-2 | 普通用户 | 我重复做同一道菜时，次数自动累加 | 每次点"我做过"，count +1 |
| US-3 | 普通用户 | 我想看到一道菜有多少人做过 | 详情页显示总做过人数 |
| US-4 | 普通用户 | 标记做过之后，我想快速写烹饪日志 | 做过状态下出现"写日志"快捷入口 |
| US-5 | 普通用户 | 我想在个人主页浏览自己做过的所有食谱 | 新增"我的烹饪"标签页，卡片展示 |
| US-6 | 未登录用户 | 我想看到一道菜有多少人做过 | 总做过人数对未登录可见 |

### 边界故事

| ID | 故事 | 处理 |
|----|------|------|
| US-E1 | 未登录用户点"我做过" | Toast 提示"请先登录"，跳转登录页 |
| US-E2 | 用户取消"做过"标记 | 物理删除记录，count 归零 |
| US-E3 | 用户取消后重新标记 | 新记录 count=1，lastCookedAt 更新 |
| US-E4 | CookingLog 创建后自动标记做过 | 不自动标记，两个系统独立（未来可扩展） |

---

## 3. 技术方案

### 3.1 数据模型：UserRecipeAction

```js
// backend/models/userRecipeAction.js
module.exports = (sequelize, DataTypes) => {
  const UserRecipeAction = sequelize.define('UserRecipeAction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '记录唯一标识符'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '用户 ID'
    },
    recipeId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '食谱 ID'
    },
    action: {
      type: DataTypes.ENUM('cooked'),
      allowNull: false,
      defaultValue: 'cooked',
      comment: '动作类型（预留扩展：liked, tried 等）'
    },
    count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '累计烹饪次数'
    },
    lastCookedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '最近一次烹饪时间'
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: '简短备注（预留）'
    }
  }, {
    tableName: 'user_recipe_actions',
    timestamps: false,
    indexes: [
      // 联合唯一约束：同一用户同一食谱同一动作只能有一条记录
      {
        name: 'uniq_userId_recipeId_action',
        unique: true,
        fields: ['userId', 'recipeId', 'action']
      },
      // 按用户查询做过列表
      {
        name: 'idx_userId_lastCookedAt',
        fields: ['userId', { name: 'lastCookedAt', order: 'DESC' }]
      },
      // 按食谱统计做过人数
      {
        name: 'idx_recipeId_action_count',
        fields: ['recipeId', 'action']
      }
    ]
  })

  UserRecipeAction.associate = (db) => {
    UserRecipeAction.belongsTo(db.User, { foreignKey: 'userId', as: 'user' })
    UserRecipeAction.belongsTo(db.Recipe, { foreignKey: 'recipeId', as: 'recipe' })
  }

  return UserRecipeAction
}
```

**设计说明**：

1. **`action` 字段用 ENUM('cooked')**：预留扩展性（'liked'、'tried' 等），但当前只支持 'cooked'
2. **联合唯一约束** `userId + recipeId + action`：保证幂等性，同一用户对同一食谱的同一动作只有一条记录
3. **`count` 字段**：重复做同一道菜时 count++，而非插入新行
4. **物理删除而非软删除**：取消标记直接 DELETE，简化逻辑；与 Favorite 的软删除不同，因为"做过"是计数型行为，取消 = 归零，重新做 = 重新计数
5. **`note` 字段**：预留简短备注（如"第三次做，终于成功了"），当前版本前端不暴露编辑入口

### 3.2 后端 API

#### 3.2.1 路由注册

在 `backend/routes/index.js` 中新增：

```js
// 食谱"做过"标记（需认证）
const cookItRoutes = require('./cookIt')
router.use('/recipes', auth, cookItRoutes)  // 挂载到 /api/recipes 下

// 用户做过的食谱列表（部分需认证）
router.use('/users', require('./userCooked'))
```

#### 3.2.2 API 端点

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/recipes/:id/cook` | ✅ | 标记做过（幂等：首次插入，后续 count++） |
| DELETE | `/api/recipes/:id/cook` | ✅ | 取消标记 |
| GET | `/api/recipes/:id/cook-status` | ✅ | 当前用户做过状态 + 总做过人数 |
| GET | `/api/users/:id/cooked-recipes` | ❌ | 用户做过的食谱列表（分页） |

#### 3.2.3 API 详细设计

**POST /api/recipes/:id/cook** — 标记做过

```js
// 请求
POST /api/recipes/:recipeId/cook
Authorization: Bearer <token>
Content-Type: application/json

// 响应 200（首次标记）
{
  "code": 0,
  "message": "标记成功",
  "data": {
    "id": "uuid",
    "count": 1,
    "lastCookedAt": "2026-05-30T15:00:00.000Z",
    "isNewRecord": true
  }
}

// 响应 200（重复标记 → count++）
{
  "code": 0,
  "message": "标记成功",
  "data": {
    "id": "uuid",
    "count": 3,
    "lastCookedAt": "2026-05-30T15:00:00.000Z",
    "isNewRecord": false
  }
}
```

实现逻辑：
```js
async function cookRecipe(req, res) {
  const userId = req.userId
  const recipeId = req.params.id

  // 1. 验证食谱存在
  const recipe = await Recipe.findByPk(recipeId)
  if (!recipe) return res.status(404).json(resJSON(404, '食谱不存在', null))

  // 2. 幂等 upsert：存在则 count++ + 更新 lastCookedAt，不存在则插入
  const [action, created] = await UserRecipeAction.findOrCreate({
    where: { userId, recipeId, action: 'cooked' },
    defaults: { count: 1, lastCookedAt: new Date() }
  })

  if (!created) {
    action.count += 1
    action.lastCookedAt = new Date()
    await action.save()
  }

  // 3. 成就检测（可选）
  await checkAllAchievements(userId).catch(() => {})

  res.json(resJSON(0, '标记成功', {
    id: action.id,
    count: action.count,
    lastCookedAt: action.lastCookedAt,
    isNewRecord: created
  }))
}
```

**DELETE /api/recipes/:id/cook** — 取消标记

```js
// 请求
DELETE /api/recipes/:recipeId/cook
Authorization: Bearer <token>

// 响应 200
{ "code": 0, "message": "已取消标记", "data": null }

// 响应 404（未标记过）
{ "code": 404, "message": "未标记过该食谱", "data": null }
```

**GET /api/recipes/:id/cook-status** — 查询做过状态

```js
// 请求
GET /api/recipes/:recipeId/cook-status
Authorization: Bearer <token>

// 响应 200（已做过）
{
  "code": 0,
  "message": "success",
  "data": {
    "isCooked": true,
    "count": 3,
    "lastCookedAt": "2026-05-30T15:00:00.000Z",
    "totalCookedCount": 42   // 该食谱总做过人数（count > 0 的不同用户数）
  }
}

// 响应 200（未做过）
{
  "code": 0,
  "message": "success",
  "data": {
    "isCooked": false,
    "count": 0,
    "lastCookedAt": null,
    "totalCookedCount": 42
  }
}
```

总做过人数查询：
```sql
SELECT COUNT(DISTINCT userId) AS totalCookedCount
FROM user_recipe_actions
WHERE recipeId = ? AND action = 'cooked'
```

**GET /api/users/:id/cooked-recipes** — 用户做过的食谱列表

```js
// 请求
GET /api/users/:userId/cooked-recipes?page=1&pageSize=20
// 无需认证（公开），但只有自己的列表才显示全部信息

// 响应 200
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "recipeId": "uuid",
        "title": "番茄炒蛋",
        "coverImage": "/uploads/xxx.jpg",
        "category": "家常菜",
        "cookCount": 3,
        "lastCookedAt": "2026-05-30T15:00:00.000Z"
      }
    ],
    "total": 15,
    "page": 1,
    "pageSize": 20
  }
}
```

实现：JOIN Recipe 表获取食谱基本信息，按 lastCookedAt DESC 排序。

### 3.3 后端文件结构

```
backend/
├── models/
│   └── userRecipeAction.js          # 新增模型
├── routes/
│   ├── cookIt.js                    # 新增：POST/DELETE /:id/cook, GET /:id/cook-status
│   └── userCooked.js                # 新增：GET /:id/cooked-recipes
└── services/
    └── cookItService.js             # 新增：业务逻辑封装（可选，与路由内联亦可）
```

**路由文件 `cookIt.js`** 挂载方式：

```js
// backend/routes/cookIt.js
const express = require('express')
const router = express.Router()
const { UserRecipeAction, Recipe, Sequelize } = require('../models')

router.post('/:id/cook', cookRecipe)
router.delete('/:id/cook', uncookRecipe)
router.get('/:id/cook-status', getCookStatus)

module.exports = router
```

注册到 `routes/index.js`：
```js
// 在 recipeRoutes 之前注册，避免 /:id 拦截
router.use('/recipes', auth, cookItRoutes)  // 注意：需要放在 recipeRoutes 之前
// 但 :id/cook 和 :id/cook-status 是具体路径，不会被 recipes/:id 拦截
// 实际可放在 recipeRoutes 之后，因为 Express 按注册顺序匹配
```

**重要**：`/:id/cook` 和 `/:id/cook-status` 是具体路径，不会与 `recipes/:id` 冲突（Express 路由匹配时具体路径优先）。但为了安全，建议在 `routes/index.js` 中将 cookIt 路由放在 recipeRoutes 之前或使用独立前缀。

**推荐方案**：将 cook 路由集成到 `routes/recipes.js` 内部，避免额外注册：

```js
// backend/routes/recipes.js 追加
router.post('/:id/cook', auth, cookRecipe)
router.delete('/:id/cook', auth, uncookRecipe)
router.get('/:id/cook-status', auth, getCookStatus)
```

同理 `userCooked` 可集成到 `routes/users.js`：
```js
// backend/routes/users.js 追加
router.get('/:id/cooked-recipes', getCookedRecipes)
```

这样最小化路由注册变更，遵循项目现有模式。

### 3.4 前端 API 封装

在 `frontend/src/api.ts` 中追加：

```typescript
// ─────────────────────────────────────────────────────────────────
// "我做过"标记 (Cook It)
// ─────────────────────────────────────────────────────────────────

export interface CookStatus {
  isCooked: boolean
  count: number
  lastCookedAt: string | null
  totalCookedCount: number
}

export interface CookActionResponse {
  id: string
  count: number
  lastCookedAt: string
  isNewRecord: boolean
}

export interface CookedRecipeItem {
  recipeId: string
  title: string
  coverImage: string | null
  category: string | null
  cookCount: number
  lastCookedAt: string
}

export interface CookedRecipesResponse {
  list: CookedRecipeItem[]
  total: number
  page: number
  pageSize: number
}

/** 标记做过 */
export function cookRecipe(recipeId: string): Promise<CookActionResponse> {
  return apiClient.post(`/recipes/${recipeId}/cook`).then(r => r.data?.data || r.data)
}

/** 取消标记 */
export function uncookRecipe(recipeId: string): Promise<void> {
  return apiClient.delete(`/recipes/${recipeId}/cook`).then(() => {})
}

/** 查询做过状态 */
export function getCookStatus(recipeId: string): Promise<CookStatus> {
  return apiClient.get(`/recipes/${recipeId}/cook-status`).then(r => r.data?.data || { isCooked: false, count: 0, lastCookedAt: null, totalCookedCount: 0 })
}

/** 获取用户做过的食谱列表 */
export function getCookedRecipes(userId: string, params: { page?: number; pageSize?: number } = {}): Promise<CookedRecipesResponse> {
  return apiClient.get(`/users/${userId}/cooked-recipes`, { params }).then(r => r.data?.data || { list: [], total: 0, page: 1, pageSize: 20 })
}
```

### 3.5 前端组件变更

#### 3.5.1 RecipeDetailPage — 新增"我做过"按钮

**位置**：与"收藏"按钮并排，位于 `detail-cover-actions` 区域 + 移动端 `floating-action-bar`

**交互设计**：

```
┌──────────────────────────────────────┐
│  🤍 收藏   📁 收藏到   👨‍🍳 我做过(42) │  ← 桌面端
└──────────────────────────────────────┘

未做过状态：👨‍🍳 我做过(42)     — 灰色按钮，42 为总做过人数
已做过状态：👨‍🍳 已做过(3次)(42) — 绿色按钮，3 为当前用户做过的次数，42 为总人数

点击未做过 → 调用 POST /cook → 按钮变绿 + Toast "已标记为做过"
点击已做过 → 调用 DELETE /cook → 按钮变灰 + Toast "已取消标记"
```

**状态管理**（参考现有 Favorite 实现）：

```typescript
// 新增 state
const [isCooked, setIsCooked] = useState(false)
const [cookCount, setCookCount] = useState(0)
const [totalCookedCount, setTotalCookedCount] = useState(0)
const [cookLoading, setCookLoading] = useState(false)

// 初始化加载（与 getFavoriteStatus 并行）
// 在 useEffect 中：
const cookStatus = await getCookStatus(id).catch(() => ({
  isCooked: false, count: 0, lastCookedAt: null, totalCookedCount: 0
}))
setIsCooked(cookStatus.isCooked)
setCookCount(cookStatus.count)
setTotalCookedCount(cookStatus.totalCookedCount)

// 切换处理
const handleCookToggle = async () => {
  if (!isAuthenticated) {
    toast.info('请先登录')
    navigate('/login')
    return
  }
  setCookLoading(true)
  const prevState = isCooked
  const prevCount = cookCount
  // Optimistic UI
  try {
    if (prevState) {
      setIsCooked(false)
      setCookCount(0)
      setTotalCookedCount(prev => prev - 1)
      await uncookRecipe(id)
      toast.success('已取消标记')
    } else {
      setIsCooked(true)
      setCookCount(1)
      setTotalCookedCount(prev => prev + 1)
      const res = await cookRecipe(id)
      setCookCount(res.count)
      toast.success('已标记为做过')
    }
  } catch {
    setIsCooked(prevState)
    setCookCount(prevCount)
    toast.error('操作失败，请重试')
  } finally {
    setCookLoading(false)
  }
}
```

**桌面端按钮 JSX**（放在收藏按钮后面）：

```tsx
<button
  className={`detail-cook-btn ${isCooked ? 'is-cooked' : ''}`}
  onClick={handleCookToggle}
  disabled={cookLoading}
  title={isCooked ? '取消标记' : '我做过'}
>
  <span className="cook-icon">{cookLoading ? '⋯' : isCooked ? '👨‍🍳' : '🍳'}</span>
  <span className="cook-text">
    {isCooked
      ? `已做过${cookCount > 1 ? `(${cookCount}次)` : ''}`
      : '我做过'}
    {totalCookedCount > 0 && (
      <span className="cook-count">({totalCookedCount})</span>
    )}
  </span>
</button>
```

**移动端浮动操作栏**（在收藏按钮后面追加）：

```tsx
<button
  className={`fab-btn ${isCooked ? 'fab-btn--cooked' : ''}`}
  onClick={handleCookToggle}
  disabled={cookLoading}
  title={isCooked ? '取消标记' : '我做过'}
>
  <span className="fab-btn__icon">
    {cookLoading ? '⋯' : isCooked ? '👨‍🍳' : '🍳'}
  </span>
  <span>{isCooked ? `已做过${cookCount > 1 ? cookCount + '次' : ''}` : '我做过'}</span>
</button>

{/* 做过状态下 → 快捷创建烹饪日志 */}
{isCooked && (
  <Link to={`/cooking-journal?recipeId=${id}`} className="fab-btn" title="写烹饪日志">
    <span className="fab-btn__icon">📝</span>
    <span>写日志</span>
  </Link>
)}
```

**与 CookingLog 联动**：

- 已做过状态下，在浮动操作栏显示"📝 写日志"按钮
- 点击跳转到 `/cooking-journal?recipeId=${id}`，CookingJournalPage 读取 URL 参数预填 recipeId
- 如果 CookingJournalPage 尚未支持 URL 参数预填，需小幅修改其初始化逻辑

#### 3.5.2 UserProfilePage — 新增"我的烹饪"标签页

**Tab 类型扩展**：

```typescript
type TabType = 'recipes' | 'favorites' | 'collections' | 'cooked'
type TabTypeWithHistory = TabType | 'history' | 'forks'
```

**新增 Tab 按钮**（在"收藏的食谱"后面）：

```tsx
<button
  className={`profile-tab ${activeTab === 'cooked' ? 'profile-tab--active' : ''}`}
  onClick={() => setActiveTab('cooked')}
>
  🍳 我的烹饪
  {cookedTotal > 0 && <span className="profile-tab__count">({cookedTotal})</span>}
</button>
```

**"我的烹饪"内容区**：

```tsx
{activeTab === 'cooked' && (
  <>
    {cookedLoading ? (
      <div className="profile-grid">
        {[1,2,3].map(i => (
          <div key={i} className="profile-card-skeleton">
            <div className="skeleton-box skeleton-cover" />
            <div className="skeleton-box skeleton-line" style={{ margin: '12px 14px' }} />
          </div>
        ))}
      </div>
    ) : cookedRecipes.length === 0 ? (
      <EmptyState
        icon="🍳"
        title="还没有做过任何食谱"
        variant="compact"
        ctaText="去探索食谱"
        ctaLink="/"
      />
    ) : (
      <>
        <div className="profile-grid">
          {cookedRecipes.map(item => (
            <div key={item.recipeId} className="profile-recipe-wrapper">
              <RecipeCard recipe={{
                id: item.recipeId,
                title: item.title,
                coverImage: item.coverImage,
                category: item.category,
              }} />
              <div className="cooked-meta">
                <span className="cooked-count">👨‍🍳 做过 {item.cookCount} 次</span>
                <span className="cooked-date">
                  上次: {new Date(item.lastCookedAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
          ))}
        </div>
        <Pagination
          current={cookedPage}
          total={cookedTotal}
          pageSize={cookedPageSize}
          onChange={setCookedPage}
        />
      </>
    )}
  </>
)}
```

**新增 state**：

```typescript
const [cookedRecipes, setCookedRecipes] = useState<CookedRecipeItem[]>([])
const [cookedTotal, setCookedTotal] = useState(0)
const [cookedLoading, setCookedLoading] = useState(false)
const [cookedPage, setCookedPage] = useState(1)
const cookedPageSize = 20

// useEffect
useEffect(() => {
  if (!id || activeTab !== 'cooked') return
  setCookedLoading(true)
  getCookedRecipes(id, { page: cookedPage, pageSize: cookedPageSize })
    .then(res => {
      setCookedRecipes(res.list)
      setCookedTotal(res.total)
    })
    .catch(() => {
      setCookedRecipes([])
      setCookedTotal(0)
    })
    .finally(() => setCookedLoading(false))
}, [id, activeTab, cookedPage])
```

### 3.6 CSS 样式

#### RecipeDetailPage.css 追加

```css
/* "我做过"按钮 — 桌面端 */
.detail-cook-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 20px;
  background: var(--bg-secondary, #f5f5f5);
  color: var(--text-secondary, #666);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.detail-cook-btn:hover {
  border-color: #4caf50;
  color: #4caf50;
}

.detail-cook-btn.is-cooked {
  background: #e8f5e9;
  border-color: #4caf50;
  color: #2e7d32;
}

.detail-cook-btn .cook-count {
  font-size: 12px;
  opacity: 0.7;
  margin-left: 2px;
}

/* 移动端浮动操作栏 — cooked 状态 */
.fab-btn--cooked {
  background: #e8f5e9;
  color: #2e7d32;
}

/* 做过元信息（用户主页卡片下方） */
.cooked-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 14px 10px;
  font-size: 12px;
  color: var(--text-secondary, #888);
}

.cooked-count {
  color: #4caf50;
  font-weight: 500;
}

.cooked-date {
  font-size: 11px;
}
```

#### 暗色模式适配

```css
[data-theme="dark"] .detail-cook-btn {
  background: var(--bg-secondary, #2a2a2a);
  border-color: var(--border-color, #444);
  color: var(--text-secondary, #aaa);
}

[data-theme="dark"] .detail-cook-btn.is-cooked {
  background: #1b3a1b;
  border-color: #4caf50;
  color: #81c784;
}

[data-theme="dark"] .fab-btn--cooked {
  background: #1b3a1b;
  color: #81c784;
}
```

---

## 4. 数据库同步策略

项目使用 `sequelize.sync({ alter: true })` (开发环境) / `sequelize.sync({})` (生产环境)。

- **开发环境**：新增 `userRecipeAction.js` 模型后，`sync({ alter: true })` 会自动创建 `user_recipe_actions` 表及索引
- **生产环境**：需手动执行 DDL 或使用 migration 脚本

**生产环境 Migration SQL**：

```sql
CREATE TABLE IF NOT EXISTS `user_recipe_actions` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `recipeId` CHAR(36) NOT NULL,
  `action` ENUM('cooked') NOT NULL DEFAULT 'cooked',
  `count` INT NOT NULL DEFAULT 1,
  `lastCookedAt` DATETIME NOT NULL,
  `note` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uniq_userId_recipeId_action` (`userId`, `recipeId`, `action`),
  INDEX `idx_userId_lastCookedAt` (`userId`, `lastCookedAt` DESC),
  INDEX `idx_recipeId_action_count` (`recipeId`, `action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 5. 与现有系统的关系

### 5.1 vs Favorite（收藏）

| 维度 | Favorite | Cook It |
|------|----------|---------|
| 语义 | "想吃" / "喜欢" | "做过" |
| 数据结构 | 软删除 (isDeleted) | 物理删除 |
| 计数 | 0 或 1 | count 累加 |
| 独立索引 | userId+recipeId WHERE isDeleted=false | userId+recipeId+action |
| UI 位置 | ❤️ 收藏按钮 | 👨‍🍳 我做过按钮 |
| 关联 | 收藏夹、备注 | 烹饪日志 |

### 5.2 vs CookingLog（烹饪日志）

| 维度 | CookingLog | Cook It |
|------|------------|---------|
| 语义 | 烹饪详细记录 | 快捷标记 |
| 必填字段 | rating (1-5) | 无 |
| 粒度 | 每次烹饪一条记录 | 一道食谱一条记录 (count++) |
| 关联 | 独立日志系统 | 快捷入口 → 跳转创建日志 |

**联动方式**：Cook It 标记后提供"写日志"快捷入口（Link 跳转，预填 recipeId），但不自动创建 CookingLog 记录。两个系统数据独立，避免强制绑定。

---

## 6. 验收标准

### 6.1 功能验收

| # | 验收项 | 优先级 |
|---|--------|--------|
| AC-1 | 食谱详情页显示"我做过"按钮，显示总做过人数 | P0 |
| AC-2 | 点击"我做过"→ 按钮变绿，Toast 提示"已标记为做过" | P0 |
| AC-3 | 再次点击 → 按钮变灰，Toast 提示"已取消标记" | P0 |
| AC-4 | 重复做同一道菜，count 自动 +1，按钮显示次数 | P0 |
| AC-5 | 做过状态下，移动端浮动栏出现"写日志"入口 | P1 |
| AC-6 | 用户主页"我的烹饪"标签页正确展示做过的食谱 | P0 |
| AC-7 | "我的烹饪"空状态显示提示文案 | P1 |
| AC-8 | 未登录用户点击"我做过"→ 提示登录 | P0 |
| AC-9 | 总做过人数对未登录用户可见 | P2 |
| AC-10 | API 幂等：多次 POST /cook 不报错，count 累加 | P0 |

### 6.2 非功能验收

| # | 验收项 | 标准 |
|---|--------|------|
| NFR-1 | 数据库同步 | 新增模型后 `npm run dev` 无报错，表自动创建 |
| NFR-2 | 构建零警告 | `npm run build` 无新增 warning |
| NFR-3 | API 响应时间 | P95 < 200ms |
| NFR-4 | 暗色模式 | 按钮和卡片在暗色模式下正常显示 |
| NFR-5 | 移动端适配 | 浮动操作栏正确显示"我做过"和"写日志" |

---

## 7. 工作量估算

| 模块 | 任务 | 估时 | 备注 |
|------|------|------|------|
| **后端模型** | 新建 `userRecipeAction.js` + associate | 0.5h | 参照 `favorite.js` 模式 |
| **后端 API** | POST/DELETE /:id/cook + GET /:id/cook-status | 1.5h | 含幂等逻辑、参数校验 |
| **后端 API** | GET /:id/cooked-recipes（分页+JOIN） | 1h | 参照 favorites 列表 |
| **后端路由** | 注册到 routes/recipes.js 和 routes/users.js | 0.5h | 最小化变更 |
| **前端 API** | api.ts 新增类型和函数 | 0.5h | 4 个函数 |
| **前端 RecipeDetailPage** | "我做过"按钮 + 状态管理 + Toast | 2h | 桌面端+移动端 |
| **前端 RecipeDetailPage** | "写日志"快捷入口 | 0.5h | Link 跳转 |
| **前端 UserProfilePage** | "我的烹饪"标签页 | 1.5h | 含空状态、分页 |
| **CSS** | 按钮样式 + 暗色模式适配 | 1h | |
| **测试** | 手工测试全流程 | 1h | |
| **总计** | | **10h** | 约 1.5 个工作日 |

---

## 8. 里程碑

| 阶段 | 内容 | 交付物 |
|------|------|--------|
| M1 | 后端模型 + API 完成 | 可通过 curl/Postman 验证全部 4 个端点 |
| M2 | 前端 RecipeDetailPage 完成 | 详情页可点击"我做过"按钮 |
| M3 | 前端 UserProfilePage 完成 | 用户主页"我的烹饪"标签页可用 |
| M4 | 联调 + 暗色模式 + 验收 | 全流程通过 |

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| `action` ENUM 在 SQLite 下不支持 | 开发环境报错 | SQLite 忽略 ENUM，存储为 TEXT；生产 MariaDB 正常支持 |
| cook-status 端点需认证 → 未登录看不到人数 | 违反 US-6 | 降级方案：详情页初始加载时通过食谱列表 API 返回 totalCookedCount（冗余字段），或在 cook-status 端点中跳过用户维度只返回总人数 |
| 多次快速点击"我做过" | count 异常累加 | 前端 disabled + 防抖；后端事务保证原子性 |
| 生产环境需手动建表 | 首次部署遗漏 | 提供完整 DDL，并在部署文档中标注 |

---

## 10. 未来扩展

1. **action 枚举扩展**：增加 'want_to_cook'（想做）、'liked'（点赞）等动作类型
2. **Cook It 通知**：食谱作者收到"有人做了你的菜"通知
3. **Cook It 成就**：累计做过 N 道食谱 → 解锁成就
4. **CookingLog 自动关联**：创建 CookingLog 时自动标记 Cook It（可配置）
5. **做过时间线**：用户主页展示烹饪时间线（按 lastCookedAt 排序的可视化）
6. **食谱搜索筛选**：支持按做过/未做过筛选
