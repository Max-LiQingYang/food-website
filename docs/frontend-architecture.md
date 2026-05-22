# 前端架构说明

> 本文档描述美食食谱网站前端的整体架构设计，包括目录结构、路由配置、API 调用层、状态管理、构建配置和测试配置。

---

## 一、目录结构

```
frontend/
├── index.html                          # HTML 入口
├── package.json                        # 依赖和脚本
├── tsconfig.json                       # TypeScript 配置
├── tsconfig.node.json                  # Vite 类型配置
├── vite.config.ts                      # Vite 构建配置
│
└── src/
    ├── main.tsx                        # 应用入口（挂载 Router + Provider）
    ├── App.tsx                         # 根组件（引用 Router）
    ├── global.css                      # 全局样式
    ├── vite-env.d.ts                   # Vite 类型声明
    │
    ├── api.ts                          # API 调用层（axios 实例 + 全部接口）
    │
    ├── router/
    │   └── index.tsx                   # 路由配置（React Router v6）
    │
    ├── context/
    │   ├── AuthContext.tsx             # 用户认证上下文
    │   └── ToastContext.tsx            # 全局提示上下文
    │
    ├── components/
    │   ├── Navbar.tsx                  # 全局导航栏
    │   ├── Navbar.css
    │   ├── RecipeCard.tsx              # 食谱卡片
    │   ├── RecipeCard.css
    │   ├── FavoriteButton.tsx          # 收藏按钮
    │   ├── FavoriteButton.css
    │   └── FavoriteButton.test.tsx     # 收藏按钮测试
    │
    ├── pages/
    │   ├── HomePage.tsx                # 首页（列表浏览）
    │   ├── HomePage.css
    │   ├── HomePage.test.tsx
    │   ├── LoginPage.tsx               # 登录/注册
    │   ├── LoginPage.css
    │   ├── RecipeDetailPage.tsx        # 食谱详情
    │   ├── RecipeDetailPage.css
    │   ├── SearchPage.tsx              # 搜索页
    │   ├── SearchPage.css
    │   ├── RecommendPage.tsx           # 食材推荐
    │   ├── RecommendPage.css
    │   ├── FavoriteList.tsx            # 收藏列表
    │   ├── FavoriteList.css
    │   ├── FavoriteList.test.tsx
    │   ├── CreateRecipePage.tsx        # 创建/编辑食谱
    │   ├── CreateRecipePage.css
    │   ├── UserProfilePage.tsx         # 用户主页
    │   └── UserProfilePage.css
    │
    └── test/
        └── setup.ts                    # 测试环境初始化
```

### 目录职责说明

| 目录/文件 | 职责 |
|-----------|------|
| `router/` | 路由配置，定义路径 → 组件映射，支持懒加载 |
| `context/` | React Context 全局状态，提供认证和 Toast 能力 |
| `components/` | 可复用的通用 UI 组件 |
| `pages/` | 页面级组件，每个文件对应一个路由页面 |
| `api.ts` | 单一 API 层，封装全部后端接口调用 |
| `test/setup.ts` | 测试环境的全局 Mock 配置 |

---

## 二、路由配置

**文件：** `src/router/index.tsx`

技术方案：使用 `react-router-dom` v6 的 `createBrowserRouter` API，结合 `React.lazy` 实现页面懒加载。

### 路由表

| 路径 | 组件 | 懒加载 | 说明 |
|------|------|--------|------|
| `/` | `HomePage` | ✅ | 首页（食谱浏览） |
| `/login` | `LoginPage` | ✅ | 登录/注册 |
| `/favorites` | `FavoriteList` | ✅ | 收藏列表 |
| `/recipe/:id` | `RecipeDetailPage` | ✅ | 食谱详情 |
| `/recipe/:id/edit` | `CreateRecipePage` | ✅ | 编辑食谱 |
| `/recipe/new` | `CreateRecipePage` | ✅ | 创建食谱 |
| `/search` | `SearchPage` | ✅ | 搜索页 |
| `/user/:id` | `UserProfilePage` | ✅ | 用户主页 |
| `/recommend` | `RecommendPage` | ✅ | 食材推荐 |

### Layout 结构

所有路由共享同一个 Layout，在 Layout 中渲染 `Navbar` 和 `Suspense` 包裹的页面组件：

```tsx
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

### 懒加载实现

```typescript
import { lazy, Suspense } from 'react'

const HomePage = lazy(() => import('../pages/HomePage'))
const FavoriteList = lazy(() => import('../pages/FavoriteList'))
// ... 其他页面

const Fallback = () => <div style={{ padding: 20, textAlign: 'center' }}>加载中...</div>

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      // ... 其他路由
    ],
  },
])
```

---

## 三、API 调用层

**文件：** `src/api.ts`

### axios 实例配置

```typescript
import axios, { AxiosError } from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',  // 基础路径
  timeout: 10000,                                          // 超时 10s
  headers: {
    'Content-Type': 'application/json',
  },
})
```

### 请求拦截器

自动从 `localStorage` 读取 token，附加到每次请求的 Authorization 头：

```typescript
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

### 响应拦截器

统一的错误处理，自动解包 `response.data`：

```typescript
apiClient.interceptors.response.use(
  response => response.data,  // 自动解包
  (error: AxiosError<{ message?: string }>) => {
    let message: string
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        message = '请求超时，请检查网络后重试'
      } else if (error.code === 'ERR_NETWORK') {
        message = '网络连接失败，请检查网络设置'
      } else {
        message = '网络异常，请稍后重试'
      }
    } else {
      message = error.response?.data?.message || `请求失败 (${error.response.status})`
    }
    return Promise.reject(new Error(message))
  }
)
```

### API 方法总览

| 函数 | 方法 | 路径 | 说明 |
|------|------|------|------|
| `register()` | POST | `/api/auth/register` | 用户注册 |
| `login()` | POST | `/api/auth/login` | 用户登录 |
| `getMe()` | GET | `/api/auth/me` | 获取当前用户信息 |
| `getRecipes()` | GET | `/api/recipes` | 获取食谱列表（分页+分类） |
| `getRecipeById()` | GET | `/api/recipes/:id` | 食谱详情 |
| `searchRecipes()` | GET | `/api/recipes/search` | 搜索食谱 |
| `recommendRecipes()` | GET | `/api/recipes/recommend` | 食材推荐 |
| `createRecipe()` | POST | `/api/recipes` | 创建食谱 |
| `updateRecipe()` | PUT | `/api/recipes/:id` | 更新食谱 |
| `deleteRecipe()` | DELETE | `/api/recipes/:id` | 删除食谱 |
| `addFavorite()` | POST | `/api/favorites` | 添加收藏 |
| `removeFavorite()` | DELETE | `/api/favorites/:recipeId` | 取消收藏 |
| `getFavoriteList()` | GET | `/api/favorites` | 收藏列表（分页） |
| `getFavoriteStatus()` | GET | `/api/favorites/:recipeId/status` | 查询收藏状态 |
| `getUserProfile()` | GET | `/api/users/:id/profile` | 用户信息 |
| `getUserRecipes()` | GET | `/api/users/:id/recipes` | 用户发布的食谱 |

### API `baseURL` 配置优先级

```
import.meta.env.VITE_API_BASE_URL → 环境变量
↓ 未设置时使用默认值
'/api'
```

部署时通过 `VITE_API_BASE_URL=http://39.103.68.205/api` 覆盖。

---

## 四、状态管理

本项目的状态管理采用 **轻量级方案**，不使用 Redux 等重型框架：

### 4.1 React Context（全局状态）

#### AuthContext（`src/context/AuthContext.tsx`）

管理用户认证状态，初始化时自动从 `localStorage` 恢复 token 并验证有效性。

**提供的能力：**

```typescript
interface AuthContextValue {
  user: User | null          // 当前用户信息
  token: string | null       // JWT token
  isAuthenticated: boolean   // 是否已认证
  login: (token: string, user: User) => void   // 登录写入
  logout: () => void         // 登出清除
}
```

**初始化流程：**

1. 从 `localStorage` 读取 `token`
2. 如果存在 token，调用 `getMe()` 验证
3. 验证成功 → 设置 user；失败 → 清除 token

#### ToastContext（`src/context/ToastContext.tsx`）

全局轻提示，2.5 秒自动消失。

**提供的能力：**

```typescript
interface ToastContextValue {
  success: (msg: string) => void   // 成功提示
  error: (msg: string) => void     // 错误提示
  warning: (msg: string) => void   // 警告提示
  info: (msg: string) => void      // 信息提示
}
```

### 4.2 localStorage（持久化存储）

| 键 | 用途 | 写入时机 |
|----|------|----------|
| `token` | JWT 认证令牌 | 登录/注册成功后 |
| `recommend_history` | 食材推荐搜索历史 | 每次推荐搜索后 |

### 4.3 URL 参数（搜索状态）

搜索页使用 URL 参数保持搜索状态，支持浏览器的前进/后退：

```
/search?q=番茄&page=1
```

### 4.4 组件本地状态（`useState`）

每个页面组件内的 UI 状态（加载、表单输入、分页页码等）使用 `useState` 管理，不提升到全局。

### 状态管理总结

| 层级 | 方案 | 适用场景 |
|------|------|----------|
| 全局认证 | React Context | 用户、token、登录/登出 |
| 全局提示 | React Context | 轻量级 Toast 通知 |
| 持久化 | localStorage | token、搜索历史 |
| URL 参数 | `useSearchParams` | 搜索状态、分页页码 |
| 本地状态 | `useState` | 表单、加载、UI 交互 |

---

## 五、构建配置

**文件：** `frontend/vite.config.ts`

### Vite 配置

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))  // @ → src/
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',  // 开发代理
        changeOrigin: true
      }
    }
  }
})
```

### 路径别名

```typescript
// 使用 @ 别名
import { getRecipes } from '@/api'         // → src/api.ts
import RecipeCard from '@/components/RecipeCard'  // → src/components/RecipeCard.tsx
```

### 开发代理

开发环境下，`/api` 请求代理到 `http://localhost:3001`，避免跨域问题。

### 构建命令

```bash
npm run dev      # 开发模式 → vite
npm run build    # 生产构建 → vite build
npm run preview  # 预览构建产物 → vite preview
```

### TypeScript 配置要点

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 六、测试配置

**框架：** Vitest + Testing Library

**配置文件：** `package.json` 中 `scripts.test: "vitest"`

**测试环境初始化：** `src/test/setup.ts`

```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn()
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('localStorage', localStorageMock)

// Mock window.location
Object.defineProperty(window, 'location', {
  writable: true,
  value: { pathname: '/', search: '', hash: '' }
})
```

### 测试文件

| 文件 | 测试内容 |
|------|----------|
| `FavoriteButton.test.tsx` | 收藏按钮组件测试 |
| `FavoriteList.test.tsx` | 收藏列表页测试 |
| `HomePage.test.tsx` | 首页组件测试 |

### 运行测试

```bash
npm test        # 单次运行
npm test -- --watch    # 监听模式
npm test -- --coverage # 覆盖率
```