# PRD: 美食食谱网站 — 基础功能建设

## 概览

在现有收藏功能基础上，建设用户认证、食谱浏览、搜索、分类和收藏交互等 6 个基础功能。

---

## 1. 功能列表与优先级

| 优先级 | 功能 | 后端工作量 | 前端工作量 |
|--------|------|-----------|-----------|
| P0 | 用户注册/登录 (JWT) | ★★★ | ★★★ |
| P0 | 食谱列表首页（分页卡片） | ★★ | ★★★ |
| P0 | 食谱详情页（食材/步骤） | ★★ | ★★★ |
| P1 | 食谱搜索 | ★★ | ★★ |
| P1 | 食谱分类筛选 | ★★ | ★★ |
| P2 | 收藏功能完善（详情页按钮） | ☆（已有API） | ★★ |

---

## 2. 数据模型变更

### 2.1 Recipe 模型扩展

当前 Recipe 仅有：id, title, coverImage, author, cookTime, createdAt

新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| description | TEXT | 食谱简介/描述 |
| category | ENUM('chinese','western','dessert','japanese','korean','other') | 分类 |
| ingredients | JSON/TEXT | 食材列表 `[{name, amount, unit}]` |
| steps | JSON/TEXT | 步骤 `[{stepNumber, content, image?}]` |
| servings | INTEGER | 份数 |
| difficulty | ENUM('easy','medium','hard') | 难度 |

### 2.2 User 模型

当前字段完备，无需变更。password 字段需支持 bcrypt 哈希。

---

## 3. API 设计

### 3.1 认证 API

**POST /api/auth/register**

请求：
```json
{
  "username": "foodie",
  "password": "secure123",
  "email": "foodie@example.com"
}
```
响应 (201)：
```json
{
  "code": 0,
  "message": "注册成功",
  "data": { "token": "jwt...", "user": { "id": "...", "username": "foodie" } }
}
```

**POST /api/auth/login**

请求：
```json
{ "username": "foodie", "password": "secure123" }
```
响应 (200)：
```json
{
  "code": 0,
  "data": { "token": "jwt...", "user": { "id": "...", "username": "foodie" } }
}
```

**GET /api/auth/me** (需 Bearer token)

响应：
```json
{
  "code": 0,
  "data": { "id": "...", "username": "foodie", "email": "foodie@example.com", "createdAt": "..." }
}
```

### 3.2 食谱 API

**GET /api/recipes** — 列表（分页 + 可选分类筛选）

参数：`?page=1&pageSize=20&category=chinese`

响应：
```json
{
  "code": 0,
  "data": {
    "list": [{ "id": "...", "title": "...", "coverImage": "...", "author": "...", "cookTime": 30, "category": "chinese", "difficulty": "easy" }],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

**GET /api/recipes/:id** — 详情

响应：
```json
{
  "code": 0,
  "data": {
    "id": "...", "title": "...", "coverImage": "...", "author": "...",
    "cookTime": 30, "category": "chinese", "description": "...",
    "difficulty": "easy", "servings": 3,
    "ingredients": [{ "name": "鸡肉", "amount": 300, "unit": "g" }],
    "steps": [{ "stepNumber": 1, "content": "切鸡肉", "image": null }]
  }
}
```

**GET /api/recipes/search** — 搜索

参数：`?q=鸡&page=1&pageSize=20`

在 title 和 ingredients 中搜索。响应格式同列表。

### 3.3 收藏 API（已有，保持兼容）

- `GET /api/favorites?page=1&pageSize=20`
- `POST /api/favorites` body: `{ recipeId }`
- `DELETE /api/favorites/:recipeId`
- `GET /api/favorites/:recipeId/status`

> 注意：收藏路由已全部套用 auth 中间件，需要认证。

---

## 4. 前端页面/组件设计

### 4.1 路由结构

```
/              → HomePage（食谱卡片网格）
/login         → LoginPage（注册/登录）
/recipe/:id    → RecipeDetailPage
/favorites     → FavoriteList（已有，保持）
/search?q=     → SearchPage（搜索结果）
```

### 4.2 页面设计

**LoginPage** (`/login`)
- Tab 切换：登录 / 注册
- 表单字段：用户名、密码（+ 可选邮箱）
- 注册成功后自动登录并跳转首页
- 登录成功后跳转回来源页

**HomePage** (`/`)
- 顶部：搜索框 + 分类标签页 (全部/中餐/西餐/甜点/日韩)
- 主体：食谱卡片网格 (2-3列响应式)
- 每张卡片：封面图、标题、作者、烹饪时长、分类标签、收藏按钮
- 底部：分页组件
- 骨架屏加载态

**RecipeDetailPage** (`/recipe/:id`)
- 顶部：大封面图 + 标题 + 作者 + 烹饪信息
- 简介段
- 食材列表（有序展示）
- 步骤列表（带编号）
- 收藏按钮（右上角）
- 返回按钮

**SearchPage** (`/search?q=`)
- 与首页相同的卡片网格布局
- 顶部显示搜索结果数量
- 无结果时显示空状态提示

### 4.3 全局组件

- **Navbar**: Logo + 导航链接(首页/收藏) + 用户状态(登录/注册 or 用户名+登出)
- **RecipeCard**: 可复用的食谱卡片组件
- **Pagination**: 可复用的分页组件
- **CategoryTabs**: 分类标签切换
- **FavoriteButton**: 收藏按钮（已在项目中存在）

### 4.4 前端 api.ts 扩展

增加 auth 和 recipe 相关 API 方法：

```typescript
// Auth
export function register(data: {username: string, password: string, email?: string})
export function login(data: {username: string, password: string})
export function getMe()

// Recipes
export function getRecipes(params: {page?: number, pageSize?: number, category?: string})
export function getRecipeById(id: string)
export function searchRecipes(params: {q: string, page?: number, pageSize?: number})
```

---

## 5. 用户故事

1. 作为访客，我想注册/登录账号，以便收藏我喜欢的食谱
2. 作为访客，我想浏览食谱首页，看到最新的食谱卡片
3. 作为访客，我想按分类浏览，快速找到感兴趣类型的食谱
4. 作为访客，我想搜索食谱，通过关键词找到想要的菜
5. 作为访客，我想查看食谱详情，了解食材和步骤
6. 作为已登录用户，我想在详情页收藏/取消收藏食谱

---

## 6. 验收标准

### P0 — 必须通过

- [x] `POST /api/auth/register` 返回 token + user
- [x] `POST /api/auth/login` 凭正确凭证返回 token
- [x] `GET /api/auth/me` 带有效 token 返回用户信息
- [x] 注册时用户名重复返回适当错误
- [x] 登录时凭证错误返回适当错误
- [x] `GET /api/recipes` 返回分页数据
- [x] `GET /api/recipes/:id` 返回完整详情（含 ingredients/steps）
- [x] 首页渲染食谱卡片网格
- [x] 首页支持分页
- [x] 详情页渲染食材+步骤
- [x] 登录/注册表单可用

### P1

- [x] `GET /api/recipes?category=xxx` 按分类筛选
- [x] `GET /api/recipes/search?q=xxx` 按关键词搜索
- [x] 搜索页渲染搜索结果
- [x] 分类 Tab 切换触发筛选
- [x] 所有前端页面有加载态

### P2

- [x] 详情页收藏按钮调用已有 API
- [x] 收藏/取消收藏后状态即时更新
- [x] 未登录点击收藏提示登录