# 数据库设计文档

> 美食食谱网站数据库设计。支持多方言切换：开发用 SQLite，生产用 MySQL。
> ORM 框架：**Sequelize**，通过 `DB_DIALECT` 环境变量切换。

---

## 多数据库支持

| 环境 | DB_DIALECT | 说明 |
|------|-----------|------|
| 本地开发 | `sqlite` | 使用 `database.sqlite` 文件，零配置 |
| 生产 | `mysql` | 阿里云 ECS 上的 MariaDB |
| 备选 | `postgres` | 支持 PostgreSQL |

### 配置示例

```bash
# 本地开发（SQLite）
DB_DIALECT=sqlite
DB_PATH=./database.sqlite

# 生产（MySQL）
DB_DIALECT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=food_website
DB_USER=food_user
DB_PASS=food_password
```

---

## 模型关系图

```
┌───────────┐       ┌─────────────┐       ┌────────────┐
│   User    │──1:N──│   Recipe    │──1:N──│  Favorite  │
│           │       │             │       │            │
│  id (PK)  │       │  id (PK)    │       │  id (PK)   │
│  username │       │  userId(FK) │       │  userId    │
│  email    │       │  title      │       │  recipeId  │
│  password │       │  category   │       │  isDeleted │
│  nickname │       │  ...        │       │  createdAt │
│  role     │       └─────────────┘       └────────────┘
└───────────┘
```

**关联说明：**
- User → Recipe：一对多。一个用户可创建多个食谱。
- Recipe → Favorite：一对多。一个食谱可被多个用户收藏。
- User → Favorite：一对多。一个用户可收藏多个食谱。
- 收藏功能未使用显式外键约束，由业务层保证数据一致性。

---

## User 模型

**表名：** `users`

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | UUID | PK | UUIDV4 | 用户唯一标识符 |
| `username` | STRING | NOT NULL, UNIQUE | — | 用户名 |
| `email` | STRING | UNIQUE, nullable | null | 邮箱地址 |
| `password` | STRING | nullable | null | bcrypt 哈希后的密码 |
| `nickname` | STRING | nullable | null | 显示昵称 |
| `role` | STRING | — | `'user'` | 角色：`user` / `admin` |
| `createdAt` | DATE | — | NOW | 注册时间 |

**索引：**
- `idx_user_username` (UNIQUE) — `username` 字段
- `idx_user_email` (UNIQUE) — `email` 字段

**关联：**
- `hasMany(models.Recipe, { foreignKey: 'userId', as: 'recipes' })`

---

## Recipe 模型

**表名：** `recipes`

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | UUID | PK | UUIDV4 | 食谱唯一标识符 |
| `title` | STRING | NOT NULL | — | 食谱标题 |
| `coverImage` | STRING | nullable | null | 封面图片 URL |
| `author` | STRING | nullable | null | 作者显示名（冗余字段） |
| `cookTime` | INTEGER | nullable | null | 烹饪时长（分钟） |
| `description` | TEXT | nullable | null | 食谱简介 |
| `category` | STRING | nullable | null | 分类：`chinese`, `western`, `dessert`, `japanese`, `korean`, `other` |
| `ingredients` | TEXT | nullable | null | 食材 JSON 数组：`[{name, amount, unit}]` |
| `steps` | TEXT | nullable | null | 步骤 JSON 数组：`[{stepNumber, content, image?}]` |
| `servings` | INTEGER | nullable | null | 份数 |
| `difficulty` | STRING | nullable | null | 难度：`easy`, `medium`, `hard` |
| `userId` | STRING | nullable, FK → users.id | null | 创建者用户 ID |
| `createdAt` | DATE | — | NOW | 创建时间 |
| `updatedAt` | DATE | nullable | null | 更新时间 |

**索引：**
- `idx_recipe_title` — `title` 字段（加速搜索）
- `idx_recipe_category` — `category` 字段（加速分类筛选）
- `idx_recipe_userId` — `userId` 字段（加速按用户查询）

**关联：**
- `belongsTo(models.User, { foreignKey: 'userId', as: 'user' })`

**关于 JSON 字段：**
`ingredients` 和 `steps` 本质是 TEXT 字段，存储 JSON 字符串。读取后手动 `JSON.parse()`：

```javascript
// 食材 JSON 结构
[
  { "name": "嫩豆腐", "amount": 1, "unit": "块" },
  { "name": "猪肉末", "amount": 100, "unit": "g" }
]

// 步骤 JSON 结构
[
  { "stepNumber": 1, "content": "豆腐切块焯水" },
  { "stepNumber": 2, "content": "锅中倒油，煸炒肉末" }
]
```

---

## Favorite 模型

**表名：** `favorites`

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | UUID | PK | UUIDV4 | 收藏记录唯一标识符 |
| `userId` | UUID | NOT NULL | — | 收藏者用户 ID |
| `recipeId` | UUID | NOT NULL | — | 被收藏的食谱 ID |
| `createdAt` | DATE | — | NOW | 收藏时间 |
| `isDeleted` | BOOLEAN | — | false | 软删除标记 |

**索引：**
- `idx_userId_createdAt` — `(userId, createdAt)`（加速用户收藏列表查询）
- `uniq_userId_recipeId_active` — UNIQUE, `(userId, recipeId)` WHERE `isDeleted=false`（同用户同食谱只能有一条有效记录）

**INCLUDE 关联：**

```javascript
Favorite.belongsTo(models.Recipe, {
  foreignKey: 'recipeId',
  as: 'recipe',
  constraints: false  // 不建外键约束
})
```

**软删除策略：**
- 取消收藏不物理删除，设置 `isDeleted = true`
- 重新收藏：恢复 `isDeleted = false` 并更新 `createdAt`
- 复合唯一索引确保同一用户同一食谱最多一条未删记录

---

## 种子数据

初始化脚本 `backend/seeds/seed.js`，含 **10 条食谱 + 1 个管理员用户**。

### 管理员账户

| 用户名 | 邮箱 | 密码 | 角色 |
|--------|------|------|------|
| `test` | `test@test.com` | `123456` | `admin` |

### 食谱分布

| 分类 | 英文 slug | 数量 | 示例食谱 |
|------|-----------|------|----------|
| 中餐 | `chinese` | 3 | 麻婆豆腐、红烧肉、宫保鸡丁 |
| 西餐 | `western` | 2 | 番茄意面、法式焗蜗牛 |
| 甜点 | `dessert` | 2 | 抹茶千层蛋糕、提拉米苏 |
| 日料 | `japanese` | 2 | 寿司拼盘、味噌拉面 |
| 韩料 | `korean` | 1 | 韩式拌饭 |

### 执行方法

```bash
# 开发环境（自动执行：server.js 中调用 seed 函数）
node backend/server.js

# 手动执行
node backend/seeds/seed.js
```

---

## MySQL 创建表 SQL（生产部署）

```sql
CREATE TABLE `users` (
  `id`          CHAR(36)      NOT NULL,
  `username`    VARCHAR(255)  NOT NULL,
  `email`       VARCHAR(255)  DEFAULT NULL,
  `password`    VARCHAR(255)  DEFAULT NULL,
  `nickname`    VARCHAR(255)  DEFAULT NULL,
  `role`        VARCHAR(255)  DEFAULT 'user',
  `createdAt`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `recipes` (
  `id`          CHAR(36)      NOT NULL,
  `title`       VARCHAR(255)  NOT NULL,
  `coverImage`  VARCHAR(255)  DEFAULT NULL,
  `author`      VARCHAR(255)  DEFAULT NULL,
  `cookTime`    INT           DEFAULT NULL,
  `description` TEXT,
  `category`    VARCHAR(255)  DEFAULT NULL,
  `ingredients` TEXT,
  `steps`       TEXT,
  `servings`    INT           DEFAULT NULL,
  `difficulty`  VARCHAR(255)  DEFAULT NULL,
  `userId`      VARCHAR(255)  DEFAULT NULL,
  `createdAt`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`   DATETIME      DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `category` (`category`),
  KEY `userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `favorites` (
  `id`          CHAR(36)      NOT NULL,
  `userId`      CHAR(36)      NOT NULL,
  `recipeId`    CHAR(36)      NOT NULL,
  `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `isDeleted`   TINYINT(1)    NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_active` (`userId`, `recipeId`, `isDeleted`),
  KEY `userId_createdAt` (`userId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
