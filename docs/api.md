# API 接口文档

> 美食食谱网站后端 API 完整参考。所有接口返回统一的 JSON 格式：`{ code, message, data }`。
>
> **基础路径**：`/api`
> **生产地址**：`http://39.103.68.205/api`
> **本地开发**：`http://localhost:3001/api`

---

## 响应格式规范

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | int | 业务码：`0` 成功，非 `0` 表示错误（见错误码表） |
| `message` | string | 可读提示信息 |
| `data` | object/null | 业务数据负载 |

### 错误码

| code | HTTP 状态码 | 说明 |
|------|-------------|------|
| 0 | 200 | 成功 |
| 400 | 400 | 请求参数错误 |
| 401 | 401 | 未授权（无 token 或 token 无效） |
| 403 | 403 | 无权限（不是本人） |
| 404 | 404 | 资源不存在 |
| 409 | 409 | 资源冲突（用户名/邮箱已存在） |
| 429 | 429 | 请求频率超限 |
| 500 | 500 | 服务器内部错误 |
| 4001 | 409 | 用户名已存在 |
| 4002 | 401 | 用户名或密码错误 |
| 4003 | 409 | 邮箱已被注册 |

---

## 认证

### POST /api/auth/register — 用户注册

**无需认证**

**请求体：**

```json
{
  "username": "zhangsan",
  "password": "abc123456",
  "email": "zhangsan@example.com",
  "nickname": "张三"
}
```

- `username`（必填）— 用户名，唯一
- `password`（必填）— 明文密码，后端用 bcrypt 哈希存储
- `email`（可选）— 邮箱，唯一
- `nickname`（可选）— 昵称，若为空则无显示名

**响应（201 Created）：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid-v4",
      "username": "zhangsan",
      "email": "zhangsan@example.com",
      "nickname": "张三",
      "role": "user",
      "createdAt": "2026-05-22T12:00:00.000Z"
    }
  }
}
```

**错误示例（用户名重复）：**

```json
{ "code": 4001, "message": "用户名已存在", "data": null }
```

---

### POST /api/auth/login — 用户登录

**无需认证**

**请求体：**

```json
{
  "username": "test@test.com",
  "password": "123456"
}
```

- `username`（必填）— 用户名或邮箱。后端自动检测：含 `@` 则按邮箱查询，否则按用户名查询。
- `password`（必填）— 明文密码

**响应（200 OK）：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid-v4",
      "username": "test",
      "email": "test@test.com",
      "nickname": "管理员",
      "role": "admin",
      "createdAt": "2026-05-22T00:00:00.000Z"
    }
  }
}
```

**错误示例：**

```json
{ "code": 4002, "message": "用户名或密码错误", "data": null }
```

---

### GET /api/auth/me — 获取当前用户信息

**需认证**（Header: `Authorization: Bearer <token>`）

**响应（200 OK）：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "uuid-v4",
    "username": "test",
    "email": "test@test.com",
    "nickname": "管理员",
    "role": "admin",
    "createdAt": "2026-05-22T00:00:00.000Z"
  }
}
```

---

## 菜谱

### GET /api/recipes — 食谱列表

**无需认证**

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | int | 1 | 页码，从 1 开始 |
| `pageSize` | int | 20 | 每页条数，上限 100 |
| `category` | string | — | 分类筛选。值：`chinese`, `western`, `dessert`, `japanese`, `korean`, `other` |
| `userId` | string | — | 按用户 ID 筛选 |

**注意**：列表接口返回**不含** `ingredients` 和 `steps` 字段以减少 Payload。请通过详情接口获取完整信息。

**响应（200 OK）：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": "uuid-v4",
        "title": "麻婆豆腐",
        "coverImage": null,
        "author": "美食达人",
        "cookTime": 30,
        "description": "经典川菜，麻辣鲜香...",
        "category": "chinese",
        "servings": 3,
        "difficulty": "medium",
        "userId": null,
        "createdAt": "2026-05-22T00:00:00.000Z",
        "updatedAt": null
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### GET /api/recipes/search — 搜索食谱

**无需认证**

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `q` | string | 必填 | 搜索关键词。匹配标题（LIKE）和食材字段（LIKE JSON raw text） |
| `page` | int | 1 | 页码 |
| `pageSize` | int | 20 | 每页条数，上限 100 |

**示例请求：**

```
GET /api/recipes/search?q=鸡蛋&page=1&pageSize=10
```

**响应格式同列表接口。**

---

### GET /api/recipes/recommend — 食材推荐

**无需认证**

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `ingredients` | string | 必填 | 食材名称，多个用逗号/中文逗号/空格分隔 |

**匹配逻辑：**
1. 使用 SQL `LIKE` 对所有输入的食材进行**AND 匹配**（必须同时包含所有食材才命中）
2. 对命中的食谱逐一 JSON 解析 `ingredients` 字段，精确匹配食材名称
3. 计算匹配度 `matchScore = Math.round((matchedCount / inputList.length) * 100)`
4. 按匹配度降序排列
5. 若数据库无匹配且配置了 `AI_API_KEY`，调用 DeepSeek API 生成推荐

**响应（200 OK）：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "input": ["鸡蛋", "番茄"],
    "list": [
      {
        "id": "uuid",
        "title": "番茄炒蛋",
        "description": "...",
        "matchScore": 66,
        "matchedIngredients": ["鸡蛋"],
        "totalIngredients": 8
      }
    ],
    "aiGenerated": false,
    "aiRecipes": []
  }
}
```

---

### GET /api/recipes/:id — 食谱详情

**无需认证**

**路径参数：** `id` — 食谱 UUID

**响应（200 OK）：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "uuid",
    "title": "麻婆豆腐",
    "ingredients": [
      { "name": "嫩豆腐", "amount": 1, "unit": "块" },
      { "name": "猪肉末", "amount": 100, "unit": "g" }
    ],
    "steps": [
      { "stepNumber": 1, "content": "豆腐切块焯水" },
      { "stepNumber": 2, "content": "锅中倒油，煸炒肉末" }
    ],
    "...": "..."
  }
}
```

`ingredients` 和 `steps` 会自动从 JSON 字符串解析为数组。

---

### POST /api/recipes — 创建食谱

**需认证**

**请求体：**

```json
{
  "title": "鱼香肉丝",
  "description": "经典川菜，超级下饭",
  "category": "chinese",
  "ingredients": [
    { "name": "猪肉", "amount": 200, "unit": "g" },
    { "name": "木耳", "amount": 50, "unit": "g" }
  ],
  "steps": [
    { "stepNumber": 1, "content": "猪肉切丝腌制" },
    { "stepNumber": 2, "content": "调鱼香汁" }
  ],
  "coverImage": null,
  "servings": 2,
  "difficulty": "medium",
  "cookTime": 20
}
```

**响应（201 Created）：**

```json
{
  "code": 0,
  "message": "ok",
  "data": { "...": "新创建的完整食谱对象" }
}
```

`author` 自动设为当前用户的昵称或用户名。

---

### PUT /api/recipes/:id — 编辑食谱

**需认证 + 必须是食谱作者本人**

**请求体：** 与创建相同，所有字段可选，只传需要修改的字段。

**响应（200 OK）：** 返回更新后的完整食谱对象。

---

### DELETE /api/recipes/:id — 删除食谱

**需认证 + 必须是食谱作者本人**

**响应（200 OK）：**

```json
{ "code": 0, "message": "ok", "data": null }
```

---

## 收藏

> 收藏功能必须认证（Header 中携带 JWT 令牌）。

### POST /api/favorites — 添加收藏

**需认证**

**请求体：**

```json
{
  "recipeId": "uuid-v4"
}
```

**幂等**：重复添加返回 `{ code: 0, message: "已收藏", data: null }`，不会报错。

**响应（201 Created）：**

```json
{
  "code": 0,
  "message": "收藏成功",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "recipeId": "uuid",
    "createdAt": "2026-05-22T12:00:00.000Z"
  }
}
```

---

### DELETE /api/favorites/:recipeId — 取消收藏

**需认证**

**路径参数：** `recipeId` — 食谱 UUID

**幂等**：若未收藏，返回 `{ code: 0, message: "未收藏，无需取消", data: null }`。

---

### GET /api/favorites — 收藏列表

**需认证**

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | int | 1 | 页码 |
| `pageSize` | int | 20 | 每页条数 |

**响应（200 OK）：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 5,
    "page": 1,
    "pageSize": 20,
    "list": [
      {
        "id": "uuid",
        "userId": "uuid",
        "recipeId": "uuid",
        "createdAt": "2026-05-22T12:00:00.000Z",
        "recipe": {
          "id": "uuid",
          "title": "番茄意面",
          "coverImage": null,
          "author": "美食达人",
          "cookTime": 25
        }
      }
    ]
  }
}
```

LEFT JOIN `recipes` 表，即使食谱被删除也返回收藏记录（`recipe: null`）。

---

### GET /api/favorites/:recipeId/status — 收藏状态查询

**需认证**

**路径参数：** `recipeId` — 食谱 UUID

**响应（200 OK）：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "isFavorited": true,
    "favoriteId": "uuid"
  }
}
```

---

### GET /api/favorites/:recipeId/count — 收藏总数

**需认证**

**路径参数：** `recipeId` — 食谱 UUID

**响应（200 OK）：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "recipeId": "uuid",
    "count": 42
  }
}
```

---

## 用户

> 用户相关接口暂为公开（无需认证）。

### GET /api/users/:id/profile — 用户信息

**响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "uuid",
    "username": "zhangsan",
    "nickname": "张三",
    "createdAt": "2026-05-22T00:00:00.000Z"
  }
}
```

### GET /api/users/:id/recipes — 用户发布的食谱

分页参数同 `GET /api/recipes`。

---

## 健康检查

### GET /health

**无需认证**

```json
{ "status": "ok" }
```

### GET /api/health

**无需认证**

```json
{ "status": "ok" }
```
