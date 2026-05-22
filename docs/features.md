# 功能说明文档

> 本文档详细描述美食食谱网站前端的每个功能模块，涵盖业务流程、API 交互、UI 状态变化和关键实现细节。

---

## 一、用户认证（注册/登录）

### 1.1 注册流程

```
用户填写表单 → 前端验证 → POST /api/auth/register → 切换登录模式
```

**流程图：**

```
[用户名] [密码] [昵称(可选)] [邮箱(可选)]
          ↓
    前端验证规则：
    · 用户名不能为空
    · 密码至少 6 位
          ↓
    POST /api/auth/register
    {
      username: string,
      password: string,
      email?: string,
      nickname?: string
    }
          ↓
    成功 → Toast.success('注册成功，请登录') → 切换到登录模式
    失败 → Toast.error(错误消息)
```

**关键代码：**

```typescript
const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!username.trim() || !password.trim()) {
    toast.warning('用户名和密码不能为空')
    return
  }
  if (password.length < 6) {
    toast.warning('密码至少 6 位')
    return
  }
  setLoading(true)
  try {
    await registerApi({ username: username.trim(), password, email: email.trim() || undefined, nickname: nickname.trim() || undefined })
    toast.success('注册成功，请登录')
    setMode('login') // 切换到登录模式
    setEmail('')
    setNickname('')
  } catch (err: any) {
    toast.error(err?.message || '注册失败')
  } finally {
    setLoading(false)
  }
}
```

### 1.2 登录流程

```
用户填写表单 → POST /api/auth/login → JWT 存储 → 跳转首页
```

**流程图：**

```
[用户名/邮箱] [密码]
        ↓
    POST /api/auth/login
    { username: string, password: string }
        ↓
    成功响应 → { token: string, user: { id, username, nickname } }
        ↓
    1. localStorage.setItem('token', token)
    2. AuthContext.login(token, user) → 更新全局状态
    3. navigate('/') → 跳转首页
        ↓
    失败 → Toast.error(错误消息)
```

**关键代码：**

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!username.trim() || !password.trim()) {
    toast.warning('请输入用户名和密码')
    return
  }
  setLoading(true)
  try {
    const res: any = await loginApi({ username: username.trim(), password })
    // 兼容两种响应格式
    const token = res.data?.token || res.token
    const user = res.data?.user || res.user || res
    login(token, { id: user?.id, username: user?.username, nickname: user?.nickname })
    toast.success('登录成功')
    navigate('/')
  } catch (err: any) {
    toast.error(err?.message || '登录失败')
  } finally {
    setLoading(false)
  }
}
```

### 1.3 JWT Token 管理

| 项目 | 说明 |
|------|------|
| 存储位置 | `localStorage`（键名 `token`） |
| 有效期 | 7 天（服务端设定） |
| 自动附加 | 请求拦截器自动添加 `Authorization: Bearer <token>` |
| 验证时机 | AuthProvider 初始化时自动调用 `getMe()` 验证 |
| 清除时机 | 用户退出登录、token 验证失败 |

### 1.4 导航栏状态切换

| 状态 | 显示内容 |
|------|----------|
| 未登录 | Logo + 首页 / 食材推荐 / 我的收藏 + **登录/注册按钮** |
| 已登录 | Logo + 首页 / 食材推荐 / 我的收藏 / **发布食谱** + 用户名 + **退出按钮** |

**实现代码：**

```tsx
<div className="navbar__auth">
  {isAuthenticated ? (
    <div className="navbar__user">
      <Link to={`/user/${user?.id}`} className="navbar__username">
        {displayName}
      </Link>
      <button className="navbar__logout-btn" onClick={logout}>
        退出
      </button>
    </div>
  ) : (
    <button className="navbar__login-btn" onClick={() => navigate('/login')}>
      登录/注册
    </button>
  )}
</div>
```

### 1.5 权限控制

未登录用户访问需要登录的页面时：

| 场景 | 行为 |
|------|------|
| 点击收藏按钮 | alert + 跳转 `/login` |
| 访问 `/favorites` | 路由无拦截 → API 请求返回 401 → 错误静默处理 |
| 访问 `/recipe/new` | 组件内 `useEffect` 检查 `isAuthenticated` → Toast + 跳转 `/login` |

---

## 二、菜谱浏览（首页）

### 2.1 页码加载

**API 调用：**

```typescript
GET /api/recipes?page=1&pageSize=12&category=中餐
```

**参数说明：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 当前页码 |
| `pageSize` | number | 12 | 每页条数 |
| `category` | string | — | 分类筛选，不传表示全部 |

**分页组件逻辑：**

```typescript
// 只有总数超过 pageSize 时才渲染分页组件
{total > PAGE_SIZE && (
  <div className="home-pagination">
    <button onClick={() => goPage(page - 1)} disabled={page <= 1}>
      ← 上一页
    </button>
    <span>第 {page} / {totalPages} 页</span>
    <button onClick={() => goPage(page + 1)} disabled={page >= totalPages}>
      下一页 →
    </button>
  </div>
)}
```

### 2.2 分类筛选

**分类选项：**

```typescript
const CATEGORIES = ['全部', '中餐', '西餐', '甜点', '日韩', '其他'] as const
```

**交互逻辑：**

- 点击分类按钮 → `category` 更新 → `page` 重置为 1 → 重新请求 API
- 选中分类的按钮添加 `.active` class（CSS 高亮）
- 选中「全部」时，API 请求不传 `category` 参数

**实现代码：**

```typescript
const handleCategoryChange = (cat: string) => {
  if (cat === category) return    // 点击已选中分类不操作
  setCategory(cat)
  setPage(1)                      // 切换分类重置页码
}
```

### 2.3 分类选中高亮

```tsx
<button
  className={`home-category ${category === cat ? 'active' : ''}`}
  onClick={() => handleCategoryChange(cat)}
>
  {cat}
</button>
```

### 2.4 骨架屏加载态

加载过程中展示占位骨架屏（skeleton），6 个灰色块排列在网格中：

```tsx
{loading && (
  <div className="home-grid">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="home-card-skeleton">
        <div className="skeleton-box skeleton-cover" />
        <div className="skeleton-body">
          <div className="skeleton-box skeleton-title" />
          <div className="skeleton-box skeleton-meta" />
        </div>
      </div>
    ))}
  </div>
)}
```

---

## 三、菜谱详情

### 3.1 路由参数与数据加载

```typescript
const { id } = useParams<{ id: string }>()

// 同时加载食谱详情和收藏状态
Promise.all([
  getRecipeById(id),
  getFavoriteStatus(id).catch(() => ({ isFavorited: false, favoriteId: '' })),
])
```

### 3.2 食材展示

食材数据以 JSON 数组形式保存在数据库中，前端渲染为列表：

```typescript
// 数据结构
interface Ingredient {
  name: string     // 食材名称（如「鸡蛋」）
  amount: number   // 数量（如 2）
  unit: string     // 单位（如「个」）
}

// 渲染
{recipe.ingredients?.map((ing, i) => (
  <li key={i} className="detail-ingredient">
    <span className="ingredient-name">{ing.name}</span>
    <span className="ingredient-divider" />
    <span className="ingredient-amount">
      {ing.amount} {ing.unit}
    </span>
  </li>
))}
```

**展示效果：**

```
食材
─────────────────────
鸡蛋 ─────────────── 2 个
番茄 ─────────────── 3 个
盐   ─────────────── 5 g
```

### 3.3 步骤展示

```typescript
// 数据结构
interface Step {
  stepNumber: number    // 步骤序号
  content: string       // 步骤描述
  image?: string        // 步骤图片（可选）
}

// 渲染
<ol className="detail-steps">
  {recipe.steps?.map((step, i) => (
    <li key={i} className="detail-step">
      <div className="step-number">{step.stepNumber}</div>
      <p className="step-content">{step.content}</p>
      {step.image && <img src={step.image} alt={`步骤 ${step.stepNumber}`} />}
    </li>
  ))}
</ol>
```

---

## 四、菜谱搜索

### 4.1 搜索触发方式

两种入口：

1. **首页搜索栏：** 输入 → 回车 → 跳转 `/search?q=关键词`
2. **搜索页搜索栏：** 输入 → 回车 → 更新 URL `searchParams`

### 4.2 API 接口

```typescript
GET /api/recipes/search?q=番茄&page=1&pageSize=12
```

### 4.3 搜索逻辑

**首页跳转：**

```typescript
const handleSearch = (e: React.FormEvent) => {
  e.preventDefault()
  if (!searchInput.trim()) return
  navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`)
}
```

**搜索页：**

```typescript
// URL 参数驱动搜索
const [searchParams, setSearchParams] = useSearchParams()
const q = searchParams.get('q') || ''
const page = Number(searchParams.get('page')) || 1

useEffect(() => {
  if (!q.trim()) {
    setResults([])
    return
  }
  searchRecipes({ q: q.trim(), page, pageSize: 12 })
    .then(res => setResults(res.data?.list || []))
}, [q, page])
```

### 4.4 模糊匹配

搜索接口在后端实现了 **标题 + 食材** 的模糊匹配（LIKE 查询），前端不参与匹配逻辑。

---

## 五、食材推荐

### 5.1 核心流程

```
用户输入食材 → 提交 → GET /api/recipes/recommend?ingredients=xxx
     ├─ 数据库匹配成功 → 展示匹配结果（含匹配度）
     └─ 数据库无匹配 → aiGenerated=true → 降级展示 AI 推荐
```

### 5.2 匹配度计算

匹配度 `matchScore` 由服务端计算并返回，前端仅展示：

```tsx
// 匹配度三档颜色
<span className={`recommend-badge recommend-badge--${
  recipe.matchScore >= 80 ? 'high' :       // 高匹配（绿色）
  recipe.matchScore >= 50 ? 'mid' :        // 中匹配（黄色）
  'low'                                    // 低匹配（红色）
}`}>
  {recipe.matchScore}% 匹配
</span>
```

### 5.3 匹配食材标签

高亮展示命中的食材名称：

```tsx
{recipe.matchedIngredients.length > 0 && (
  <div className="recommend-card__tags">
    {recipe.matchedIngredients.map(tag => (
      <span key={tag} className="recommend-tag">✅ {tag}</span>
    ))}
  </div>
)}
```

### 5.4 AI 推荐（降级策略）

当数据库中没有完全匹配的食谱时，服务端返回 `aiGenerated: true` 并附带 AI 生成的菜谱：

```tsx
{!loading && aiGenerated && aiRecipes.length > 0 && (
  <>
    <h2>🤖 AI 智能推荐菜谱</h2>
    <p>数据库中没有完全匹配的食谱，以下由 AI 根据你的食材智能生成</p>
    {/* AI 菜谱卡片列表 */}
  </>
)}
```

**AI 菜谱数据结构：**

```typescript
interface AIRecipe {
  title: string
  description: string
  ingredients: Array<{ name: string; amount: number; unit: string }>
  cookTime: number
  difficulty: string
  servings: number
}
```

### 5.5 搜索历史

**存储：** localStorage，键名 `recommend_history`

**逻辑：**

```typescript
const HISTORY_KEY = 'recommend_history'
const MAX_HISTORY = 10

function loadHistory(): string[] {
  return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
}

function saveHistory(text: string) {
  const raw = loadHistory()
  const deduped = [text, ...raw.filter(t => t !== text)]  // 去重，新搜索置顶
  localStorage.setItem(HISTORY_KEY, JSON.stringify(deduped.slice(0, MAX_HISTORY)))
}
```

**UI 展示：**

- 搜索框下方显示历史标签
- 点击历史标签快速重新搜索
- 提供「清除」按钮一键清空

### 5.6 热门食材快捷入口

内置 6 组热门食材组合，一键搜索：

```typescript
const POPULAR_TAGS = [
  { text: '鸡蛋、番茄', icon: '🍅' },
  { text: '鸡肉、土豆', icon: '🥔' },
  { text: '豆腐、青菜', icon: '🥬' },
  { text: '牛肉、洋葱', icon: '🧅' },
  { text: '猪肉、青椒', icon: '🫑' },
  { text: '虾仁、鸡蛋', icon: '🦐' },
]
```

### 5.7 收藏功能嵌入

推荐结果卡片内置收藏按钮，无需跳转详情页即可收藏：

```tsx
<button
  className={`recommend-card__fav ${isFav ? 'recommend-card__fav--active' : ''}`}
  onClick={e => toggleFavorite(e, recipe.id, isFav)}
>
  {isFav ? '❤️' : '🤍'}
</button>
```

---

## 六、收藏功能

### 6.1 API 接口

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 添加收藏 | POST | `/api/favorites` | body: `{ recipeId: string }` |
| 取消收藏 | DELETE | `/api/favorites/:recipeId` | — |
| 收藏列表 | GET | `/api/favorites?page=1&pageSize=12` | 分页查询 |
| 查询状态 | GET | `/api/favorites/:recipeId/status` | 返回 `{ isFavorited, favoriteId }` |

### 6.2 添加/取消收藏

**FavoriteButton 组件核心逻辑：**

```typescript
const handleClick = async () => {
  if (loading) return
  // 登录拦截
  const token = localStorage.getItem('token')
  if (!token) {
    alert('请先登录')
    navigate('/login')
    return
  }

  setLoading(true)
  try {
    if (isFavorited) {
      await removeFavorite(recipeId)
    } else {
      await addFavorite(recipeId)
    }
    onToggle?.()  // 通知父组件刷新状态
  } finally {
    setLoading(false)
  }
}
```

### 6.3 收藏列表

**FavoriteList 页面核心逻辑：**

```typescript
async function unfavorite(item: FavoriteItem) {
  if (item.removing || !item.recipe) return
  // 乐观更新：先标记 removing
  setList(prev => prev.map(i => (i.id === item.id ? { ...i, removing: true } : i)))
  try {
    await removeFavorite(item.recipe.id)
    // 成功 → 从列表移除
    setList(prev => prev.filter(i => i.id !== item.id))
  } catch {
    // 失败 → 恢复 removing 标记
    setList(prev => prev.map(i => (i.id === item.id ? { ...i, removing: false } : i)))
  }
}
```

### 6.4 幂等性

**前端幂等设计：**

- 重复点击收藏按钮 → `loading` 状态阻止并发请求
- `removeFavorite` 在取消收藏时使用 `recipeId` 路径参数，重复调用返回 200 不会报错
- 收藏列表的「取消收藏」使用乐观更新，UI 立即响应

### 6.5 登录拦截

收藏功能涉及的用户鉴权有三种拦截方式：

| 位置 | 拦截方式 |
|------|----------|
| `FavoriteButton` 组件 | 检查 localStorage token → alert + 跳转 `/login` |
| `RecipeDetailPage` 详情页收藏按钮 | 检查 localStorage token → Toast + 跳转 `/login` |
| `RecommendPage` 推荐页收藏按钮 | 检查 localStorage token → alert + 跳转 `/login` |

---

## 七、创建菜谱（管理后台）

### 7.1 表单字段

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| 标题 | text | ✅ | — | 最大 100 字符 |
| 简介 | textarea | — | — | 简单描述 |
| 分类 | select | — | — | 中餐/西餐/日料/韩餐/甜品/其他 |
| 难度 | select | — | easy | 简单/中等/困难 |
| 份数 | number | — | 2 | 1–99 |
| 烹饪时间 | number | — | 30 | 分钟，1–999 |
| 封面图 | url | — | — | 图片链接 |
| 食材 | 动态列表 | — | 1 行空行 | 名称+数量+单位 |
| 步骤 | 动态列表 | — | 1 行空行 | stepNumber + content |

### 7.2 食材动态添加/删除

**添加食材：** 在列表末尾追加一个空行：

```typescript
const addIngredient = () => {
  setIngredients([...ingredients, { name: '', amount: 0, unit: 'g' }])
}
```

**删除食材：** 删除指定行，至少保留一行：

```typescript
const removeIngredient = (index: number) => {
  if (ingredients.length <= 1) return
  setIngredients(ingredients.filter((_, i) => i !== index))
}
```

**布局：**

```
食材
┌──────────────┬──────┬──────┬──┐
│ 食材名称     │ 数量  │ g   │ ✕ │
│ 番茄         │ 3    │ 个   │ ✕ │
│ 鸡蛋         │ 2    │ 个   │ ✕ │
└──────────────┴──────┴──────┴──┘
         [+ 添加食材]
```

### 7.3 步骤动态添加/删除

**添加步骤：** 追加空行，stepNumber 自动递增：

```typescript
const addStep = () => {
  setSteps([...steps, { stepNumber: steps.length + 1, content: '' }])
}
```

**删除步骤：** 删除后自动重编号：

```typescript
const removeStep = (index: number) => {
  if (steps.length <= 1) return
  const filtered = steps.filter((_, i) => i !== index)
  setSteps(filtered.map((s, i) => ({ ...s, stepNumber: i + 1 })))
}
```

### 7.4 表单提交

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!title.trim()) {
    toast.warning('请输入食谱标题')
    return
  }
  setSubmitting(true)
  try {
    const data: CreateRecipeData = {
      title: title.trim(),
      description: description.trim() || undefined,
      category: category || undefined,
      coverImage: coverImage.trim() || undefined,
      servings: servings || undefined,
      difficulty: difficulty || undefined,
      cookTime: cookTime || undefined,
      ingredients: ingredients.filter(i => i.name.trim()),    // 过滤空食材
      steps: steps.filter(s => s.content.trim()).map((s, i) => ({
        ...s,
        stepNumber: i + 1,                                     // 重新编号
        content: s.content.trim()
      })),
    }
    if (isEdit && id) {
      await updateRecipe(id, data)
      toast.success('食谱已更新')
      navigate(`/recipe/${id}`)
    } else {
      const result: any = await createRecipe(data)
      toast.success('食谱创建成功')
      navigate(`/recipe/${result.id}`)
    }
  } catch (err: any) {
    toast.error(err?.message || '提交失败')
  } finally {
    setSubmitting(false)
  }
}
```