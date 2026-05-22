# 组件文档

> 本文档涵盖前端所有业务组件和页面组件的接口定义、使用示例和内部状态说明。
> 技术栈：React 18 + TypeScript + React Router 6

---

## 通用类型定义

以下类型在 `src/api.ts` 中统一定义，各组件共享：

```typescript
// 食谱列表项
interface Recipe {
  id: string
  title: string
  coverImage?: string
  author?: string
  cookTime?: number
  description?: string
  category?: string
  difficulty?: string
  servings?: number
}

// 食谱详情（含食材和步骤）
interface RecipeDetail extends Recipe {
  ingredients?: Array<{ name: string; amount: number; unit: string }>
  steps?: Array<{ stepNumber: number; content: string; image?: string }>
}

// 收藏项
interface FavoriteItem {
  id: number
  userId: string
  recipeId: string
  createdAt: string
  recipe?: Recipe | null
}

// 食材推荐结果
interface RecommendRecipe {
  id: string
  title: string
  coverImage?: string
  author?: string
  cookTime?: number
  description?: string
  category?: string
  difficulty?: string
  servings?: number
  matchScore: number
  matchedIngredients: string[]
  totalIngredients: number
}
```

---

## 公共组件

### 1. Navbar

**文件：** `src/components/Navbar.tsx`

**用途：** 全局导航栏，含 Logo、导航链接、用户认证状态切换、移动端汉堡菜单。

**Props：** 无（无父组件传入的 props，数据全部通过 Context 获取）

**内部状态：**

| 状态 | 类型 | 说明 |
|------|------|------|
| `menuOpen` | `boolean` | 控制移动端菜单展开/收起 |

**依赖：**

- `AuthContext`（`useAuth`）— 获取用户信息和认证状态
- `Navbar.css` — 导航栏样式
- `react-router-dom` — 导航跳转

**内部逻辑：**

- 登录状态 → 显示用户名（优先 nickname）和退出按钮
- 未登录 → 显示「登录/注册」按钮
- 登录用户额外显示「发布食谱」链接
- 点击导航链接或点击遮罩层时关闭汉堡菜单

**使用示例：**

```tsx
// 在 router 的 Layout 组件中使用
import Navbar from '../components/Navbar'

function Layout() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<Fallback />}>
        <Outlet />
      </Suspense>
    </>
  )
}
```

---

### 2. RecipeCard

**文件：** `src/components/RecipeCard.tsx`

**用途：** 食谱卡片，展示封面图、标题、作者、分类、烹饪时间，点击跳转详情页。

**Props 接口：**

```typescript
interface RecipeCardProps {
  recipe: Recipe
}
```

**内部状态：** 无（纯展示组件 + 路由跳转）

**依赖：**

- `RecipeCard.css`
- `react-router-dom` — 点击导航到 `/recipe/:id`

**使用示例：**

```tsx
import RecipeCard from '../components/RecipeCard'
import type { Recipe } from '../api'

// 在列表渲染中使用
<RecipeCard key={recipe.id} recipe={recipe} />

// 自定义渲染覆盖
<RecipeCard recipe={{
  id: '123',
  title: '番茄炒蛋',
  coverImage: 'https://example.com/image.jpg',
  cookTime: 15,
  author: '美食家',
  category: '中餐',
}} />
```

**关键逻辑：**

- `coverImage` 不存在时显示占位符 🍽️
- `cookTime` 不存在时不显示时间标签

---

### 3. FavoriteButton

**文件：** `src/components/FavoriteButton.tsx`

**用途：** 收藏/取消收藏按钮，带有登录拦截和加载状态。

**Props 接口：**

```typescript
interface FavoriteButtonProps {
  recipeId: string
  isFavorited: boolean
  onToggle?: () => void
}
```

**内部状态：**

| 状态 | 类型 | 说明 |
|------|------|------|
| `loading` | `boolean` | 请求进行中时禁用按钮 |

**依赖：**

- `api.ts` — `addFavorite` / `removeFavorite`
- `FavoriteButton.css`

**使用示例：**

```tsx
import FavoriteButton from '../components/FavoriteButton'
import { useState, useEffect } from 'react'
import { getFavoriteStatus } from '../api'

function RecipeCard({ recipeId }: { recipeId: string }) {
  const [isFav, setIsFav] = useState(false)

  useEffect(() => {
    getFavoriteStatus(recipeId).then(res => setIsFav(res.isFavorited))
  }, [recipeId])

  return (
    <FavoriteButton
      recipeId={recipeId}
      isFavorited={isFav}
      onToggle={() => setIsFav(!isFav)}
    />
  )
}
```

**关键逻辑：**

- 未登录时弹出 alert 并跳转 `/login`
- 请求期间 `loading` 为 `true`，按钮被禁用
- `onToggle` 回调在操作成功后被调用，供父组件刷新状态

---

## 页面组件

### 4. LoginPage

**文件：** `src/pages/LoginPage.tsx`

**用途：** 登录/注册双模式页面，支持表单验证和 Toast 反馈。

**Props：** 无

**内部状态：**

| 状态 | 类型 | 说明 |
|------|------|------|
| `mode` | `'login' \| 'register'` | 切换登录/注册模式 |
| `username` | `string` | 用户名 |
| `password` | `string` | 密码 |
| `nickname` | `string` | 昵称（注册模式） |
| `email` | `string` | 邮箱（注册模式） |
| `loading` | `boolean` | 提交中禁用按钮 |

**依赖：**

- `api.ts` — `login` / `register`
- `AuthContext` — `login` 方法（将 token 和 user 写入 localStorage）
- `ToastContext` — 成功/失败提示
- `LoginPage.css`

**使用示例（路由配置）：**

```tsx
// router/index.tsx 中自动配置
{ path: '/login', element: <LoginPage /> }
```

**流程说明：**

1. **登录流程：** 表单提交 → 调用 `loginApi()` → 服务器返回 `{ token, user }` → 调用 `login(token, user)` 写入 localStorage → 跳转首页 `/`
2. **注册流程：** 表单提交 → 调用 `registerApi()` → 注册成功提示 → 自动切换到登录模式
3. **验证规则：** 用户名密码不能为空；密码至少 6 位
4. **模式切换：** 切换时清空相关字段（注册→登录清空 email/nickname；登录→注册清空 password）

---

### 5. HomePage

**文件：** `src/pages/HomePage.tsx`

**用途：** 首页，包含搜索栏、分类筛选、食谱卡片网格、分页加载。

**Props：** 无

**内部状态：**

| 状态 | 类型 | 说明 |
|------|------|------|
| `category` | `string` | 当前选中分类，默认 `'全部'` |
| `page` | `number` | 当前页码 |
| `recipes` | `Recipe[]` | 食谱列表 |
| `total` | `number` | 总记录数 |
| `loading` | `boolean` | 加载中骨架屏 |
| `searchInput` | `string` | 搜索框输入值 |

**常量：**

```typescript
const CATEGORIES = ['全部', '中餐', '西餐', '甜点', '日韩', '其他'] as const
const PAGE_SIZE = 12
```

**依赖：**

- `api.ts` — `getRecipes`
- `RecipeCard` 组件
- `HomePage.css`

**使用示例（路由配置）：**

```tsx
{ path: '/', element: <HomePage /> }
```

**关键逻辑：**

- `category` 或 `page` 变化时重新请求 `getRecipes()`
- 分类选中项有 `.active` 高亮 class
- 切换分类时重置页码为 1
- 分页超过 1 页才渲染分页组件

---

### 6. RecipeDetailPage

**文件：** `src/pages/RecipeDetailPage.tsx`

**用途：** 食谱详情页，展示封面、元信息、食材列表、制作步骤、收藏按钮、作者操作。

**Props：** 无（通过路由参数获取 id）

**内部状态：**

| 状态 | 类型 | 说明 |
|------|------|------|
| `recipe` | `RecipeDetail \| null` | 食谱详情 |
| `loading` | `boolean` | 加载中骨架屏 |
| `notFound` | `boolean` | 404 状态 |
| `isFavorited` | `boolean` | 收藏状态 |
| `favLoading` | `boolean` | 收藏操作中 |
| `deleting` | `boolean` | 删除操作中 |

**依赖：**

- `api.ts` — `getRecipeById`, `deleteRecipe`, `addFavorite`, `removeFavorite`, `getFavoriteStatus`
- `AuthContext` — 判断作者身份
- `ToastContext` — 操作反馈
- `RecipeDetailPage.css`

**使用示例（路由配置）：**

```tsx
{ path: '/recipe/:id', element: <RecipeDetailPage /> }
```

**关键逻辑：**

1. **数据加载：** 同时请求 `getRecipeById(id)` 和 `getFavoriteStatus(id)`
2. **作者身份判断：** `recipe.userId === user.id` 时显示编辑/删除按钮
3. **收藏操作：** 未登录时拦截并跳转 `/login`
4. **删除操作：** 弹窗确认 → 调用 `deleteRecipe` → 跳转首页
5. **404 处理：** 请求失败时显示「食谱不存在」提示页

---

### 7. SearchPage

**文件：** `src/pages/SearchPage.tsx`

**用途：** 搜索结果页，支持分页搜索，状态通过 URL 参数保持。

**Props：** 无（通过 `useSearchParams` 获取 q 和 page）

**内部状态：**

| 状态 | 类型 | 说明 |
|------|------|------|
| `inputValue` | `string` | 搜索框输入值 |
| `results` | `Recipe[]` | 搜索结果列表 |
| `total` | `number` | 总结果数 |
| `loading` | `boolean` | 加载中状态 |

**常量：**

```typescript
const PAGE_SIZE = 12
```

**依赖：**

- `api.ts` — `searchRecipes`
- `RecipeCard` 组件
- `SearchPage.css`

**使用示例（路由配置）：**

```tsx
{ path: '/search', element: <SearchPage /> }
```

**关键逻辑：**

- URL 参数控制搜索状态：`/search?q=番茄&page=1`
- `searchParams` 变化时自动触发搜索请求
- 空搜索时不请求 API

---

### 8. RecommendPage

**文件：** `src/pages/RecommendPage.tsx`

**用途：** 食材推荐菜谱页，输入食材获取匹配食谱 + AI 智能推荐。

**Props：** 无

**内部状态：**

| 状态 | 类型 | 说明 |
|------|------|------|
| `input` | `string` | 食材输入 |
| `results` | `RecommendRecipe[]` | 数据库匹配结果 |
| `aiRecipes` | `array` | AI 推荐食谱 |
| `aiGenerated` | `boolean` | 是否有 AI 推荐 |
| `loading` | `boolean` | 加载中 |
| `searched` | `boolean` | 是否已提交过搜索 |
| `history` | `string[]` | 搜索历史 |
| `favorites` | `Record<string, boolean>` | 各卡片收藏状态 |

**常量：**

```typescript
const HISTORY_KEY = 'recommend_history'
const MAX_HISTORY = 10
const POPULAR_TAGS = [
  { text: '鸡蛋、番茄', icon: '🍅' },
  { text: '鸡肉、土豆', icon: '🥔' },
  { text: '豆腐、青菜', icon: '🥬' },
  { text: '牛肉、洋葱', icon: '🧅' },
  { text: '猪肉、青椒', icon: '🫑' },
  { text: '虾仁、鸡蛋', icon: '🦐' },
]
```

**依赖：**

- `api.ts` — `recommendRecipes`, `addFavorite`, `removeFavorite`, `getFavoriteStatus`
- `RecommendPage.css`

**使用示例（路由配置）：**

```tsx
{ path: '/recommend', element: <RecommendPage /> }
```

**关键逻辑：**

1. **搜索流程：** 输入食材 → `GET /api/recipes/recommend?ingredients=xxx`
2. **匹配度展示：** `matchScore` 分高/中/低三档，用颜色区分
3. **匹配食材标签：** 高亮显示命中的食材名称
4. **AI 降级：** 数据库无匹配时 `aiGenerated` 为 true，展示 AI 生成菜谱
5. **搜索历史：** localStorage 持久化，最多 10 条，可清除
6. **收藏功能：** 嵌入式收藏按钮，不跳转详情页也可收藏

---

### 9. FavoriteList

**文件：** `src/pages/FavoriteList.tsx`

**用途：** 收藏列表页，分页展示收藏的食谱，支持取消收藏。

**Props：** 无

**内部状态：**

| 状态 | 类型 | 说明 |
|------|------|------|
| `loading` | `boolean` | 加载中 |
| `list` | `FavoriteItem[]` | 收藏列表（含 `removing` 标记） |
| `pagination` | `Pagination` | 分页信息 |

**本地类型：**

```typescript
interface Pagination {
  page: number
  pageSize: number
  total: number
}
```

**依赖：**

- `api.ts` — `getFavoriteList`, `removeFavorite`
- `FavoriteList.css`

**使用示例（路由配置）：**

```tsx
{ path: '/favorites', element: <FavoriteList /> }
```

**关键逻辑：**

1. **取消收藏：** 乐观更新——设置 `removing: true` → 调用 API → 删除成功则从列表移除
2. **已删除食谱：** `recipe` 为 null 时显示「食谱已不存在」占位卡片
3. **翻页加载遮罩：** 翻页时显示加载遮罩防止重复点击
4. **空状态：** 未收藏时引导用户去首页探索

---

### 10. CreateRecipePage

**文件：** `src/pages/CreateRecipePage.tsx`

**用途：** 创建/编辑食谱表单页面，支持食材和步骤的动态添加/删除。

**Props：** 无（通过路由参数 id 判断是创建还是编辑）

**内部状态：**

| 状态 | 类型 | 说明 |
|------|------|------|
| `title` | `string` | 食谱标题 |
| `description` | `string` | 简介 |
| `category` | `string` | 分类 |
| `coverImage` | `string` | 封面图 URL |
| `servings` | `number` | 份数 |
| `difficulty` | `string` | 难度 |
| `cookTime` | `number` | 烹饪时间 |
| `ingredients` | `array` | 食材列表（可动态增删） |
| `steps` | `array` | 步骤列表（可动态增删） |
| `submitting` | `boolean` | 提交中 |
| `loading` | `boolean` | 编辑模式加载中 |

**常量和空值模板：**

```typescript
const CATEGORIES = [
  { value: 'chinese', label: '中餐' },
  { value: 'western', label: '西餐' },
  { value: 'japanese', label: '日料' },
  { value: 'korean', label: '韩餐' },
  { value: 'dessert', label: '甜品' },
  { value: 'other', label: '其他' },
]

const DIFFICULTIES = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
]

const EMPTY_INGREDIENT = { name: '', amount: 0, unit: 'g' }
const EMPTY_STEP = { stepNumber: 1, content: '' }
```

**依赖：**

- `api.ts` — `createRecipe`, `updateRecipe`, `getRecipeById`
- `AuthContext` — 未登录跳转
- `ToastContext` — 操作反馈
- `CreateRecipePage.css`

**特殊路由映射：**

```tsx
{ path: '/recipe/new', element: <CreateRecipePage /> }       // 创建模式
{ path: '/recipe/:id/edit', element: <CreateRecipePage /> }  // 编辑模式
```

**关键逻辑：**

1. **模式判断：** 路由参数 `id` 存在则为编辑模式
2. **编辑模式：** 加载时请求 `getRecipeById(id)` 预填表单
3. **食材操作：** `addIngredient()` 追加空行；`removeIngredient()` 删除并保留至少一行
4. **步骤操作：** 删除后自动重编号（`stepNumber` 重新排序）
5. **表单提交：** 过滤空值字段 → `createRecipe()` 或 `updateRecipe()` → 跳转
6. **登录拦截：** 未登录用户自动跳转登录页

---

### 11. UserProfilePage

**文件：** `src/pages/UserProfilePage.tsx`

**用途：** 用户个人主页，展示用户信息和发布的食谱列表。

**Props：** 无（通过路由参数 id 获取用户）

**内部状态：**

| 状态 | 类型 | 说明 |
|------|------|------|
| `profile` | `any` | 用户信息 |
| `recipes` | `Recipe[]` | 用户发布的食谱 |
| `total` | `number` | 食谱总数 |
| `page` | `number` | 当前页码 |
| `loading` | `boolean` | 个人信息加载中 |
| `notFound` | `boolean` | 用户不存在 |
| `recipesLoading` | `boolean` | 食谱列表加载中 |

**依赖：**

- `api.ts` — `getUserProfile`, `getUserRecipes`
- `RecipeCard` 组件
- `UserProfilePage.css`

**使用示例（路由配置）：**

```tsx
{ path: '/user/:id', element: <UserProfilePage /> }
```

**关键逻辑：**

1. **并行加载：** 用户信息和食谱列表分两个 `useEffect` 独立加载
2. **用户信息展示：** 头像取昵称首字母，显示加入日期
3. **列表分页：** 使用 `pageSize = 12`，支持分页切换
4. **404 处理：** 用户不存在时显示错误页