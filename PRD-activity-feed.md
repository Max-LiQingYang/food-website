# PRD: 首页关注动态 Feed 与社交互动增强

> 项目：food-website | 技术栈：React 18 + Express + Sequelize + MariaDB
> 部署：http://39.103.68.205/ | 基线 commit：0b408b4
> 日期：2026-05-29

---

## 1. 功能价值分析

当前首页缺乏社交维度的信息流，用户登录后只能浏览全站食谱，无法感知关注对象的最新动态。这导致用户间的社交连接薄弱——关注行为没有后续反馈，用户粘性不足。通过引入「关注动态 Feed」，让用户在首页即可看到关注对象的新发食谱、收藏和作品上传，形成「关注→看到动态→互动→再关注」的正向闭环，显著提升留存率和日活。

同时，动态 Feed 将原本分散的社交行为（发食谱、收藏、上传作品）集中呈现，降低信息获取成本。用户无需逐个访问他人主页即可了解美食圈最新动向，社区氛围和参与感随之增强。

---

## 2. Activity 模型设计

### 2.1 现有模型（`activities` 表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER (PK, AUTO_INCREMENT) | 活动唯一标识 |
| userId | UUID (NOT NULL) | 执行活动的用户 ID |
| type | STRING(30) (NOT NULL) | 活动类型 |
| targetId | STRING(36) | 目标对象主键 ID |
| targetType | STRING(20) | 目标类型：recipe / user / comment |
| extra | TEXT | 附加信息（JSON 字符串） |
| createdAt | DATE | 活动时间 |

**已有 type 枚举值**：`create_recipe`、`comment`、`favorite`、`follow`、`review`

**已有索引**：
- `idx_activity_userId` → userId
- `idx_activity_type` → type
- `idx_activity_createdAt` → createdAt
- `idx_activity_user_created` → (userId, createdAt) 复合

**已有关联**：`Activity.belongsTo(User, { foreignKey: 'userId', as: 'user' })`

### 2.2 新增 type 枚举值

| type 值 | 含义 | targetId 指向 | targetType | extra 示例 |
|---------|------|---------------|------------|------------|
| `work` | 上传作品（评论带图） | commentId | `comment` | `{ "imageUrl": "...", "recipeTitle": "..." }` |

> **说明**：`favorite`（收藏食谱）已在现有枚举中，targetId = recipeId，targetType = `recipe`，无需新增。
> `work` 为新增类型，表示用户在某食谱下发表了带图片的评论（即「上传作品」），targetId 指向该评论 ID，targetType = `comment`。

### 2.3 需新增索引

为 Feed 查询（按关注用户列表 + 时间排序）添加复合索引：

```sql
CREATE INDEX idx_activity_users_created ON activities (userId, createdAt DESC);
```

> 现有 `idx_activity_user_created` 已覆盖 (userId, createdAt)，但 Feed 查询需要按 createdAt DESC 排序，Sequelize 查询时显式 `order: [['createdAt', 'DESC']]` 即可走索引。

---

## 3. API 设计

### 3.1 获取关注动态 Feed

```
GET /api/activities/feed?page=1&pageSize=20
```

**鉴权**：必须登录（Bearer Token），从 `req.userId` 提取当前用户 ID。

**处理流程**：

1. 查询当前用户的关注列表：`SELECT followingId FROM follows WHERE followerId = req.userId`
2. 若关注列表为空 → 直接返回空列表
3. 查询这些用户的活动：`SELECT * FROM activities WHERE userId IN (followings) ORDER BY createdAt DESC LIMIT pageSize OFFSET (page-1)*pageSize`
4. JOIN 用户表获取 username、avatar
5. JOIN 食谱表获取 title、coverImage（当 targetType = 'recipe' 时）
6. 组装返回

**请求参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | integer | 否 | 1 | 页码，从 1 开始 |
| pageSize | integer | 否 | 20 | 每页条数，最大 50 |

**响应（成功）**：

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 42,
        "type": "create_recipe",
        "targetId": "recipe-uuid-001",
        "targetType": "recipe",
        "extra": null,
        "createdAt": "2026-05-29T12:30:00.000Z",
        "user": {
          "id": "user-uuid-001",
          "username": "美食达人小王",
          "avatar": "/uploads/avatars/001.jpg"
        },
        "recipe": {
          "id": "recipe-uuid-001",
          "title": "红烧排骨",
          "coverImage": "/uploads/recipes/cover-001.jpg"
        }
      },
      {
        "id": 41,
        "type": "favorite",
        "targetId": "recipe-uuid-002",
        "targetType": "recipe",
        "extra": null,
        "createdAt": "2026-05-29T11:00:00.000Z",
        "user": {
          "id": "user-uuid-002",
          "username": "吃货小李",
          "avatar": "/uploads/avatars/002.jpg"
        },
        "recipe": {
          "id": "recipe-uuid-002",
          "title": "番茄炒蛋",
          "coverImage": "/uploads/recipes/cover-002.jpg"
        }
      },
      {
        "id": 40,
        "type": "work",
        "targetId": "comment-uuid-003",
        "targetType": "comment",
        "extra": "{\"imageUrl\":\"/uploads/works/003.jpg\",\"recipeTitle\":\"蛋炒饭\"}",
        "createdAt": "2026-05-29T10:00:00.000Z",
        "user": {
          "id": "user-uuid-003",
          "username": "厨娘小张",
          "avatar": "/uploads/avatars/003.jpg"
        },
        "recipe": null,
        "workImage": "/uploads/works/003.jpg"
      }
    ],
    "total": 58,
    "page": 1,
    "pageSize": 20
  }
}
```

**响应（关注列表为空 / 无活动）**：

```json
{
  "code": 0,
  "data": {
    "list": [],
    "total": 0,
    "page": 1,
    "pageSize": 20
  }
}
```

**错误响应**：

| code | 说明 |
|------|------|
| 401 | 未登录 |
| 500 | 服务端错误 |

### 3.2 后端实现要点

```javascript
// routes/activities.js
router.get('/feed', auth, async (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  const limit = Math.min(parseInt(pageSize), 50);
  const offset = (parseInt(page) - 1) * limit;

  // 1. 获取关注列表
  const follows = await Follow.findAll({
    where: { followerId: req.userId },
    attributes: ['followingId']
  });
  const followingIds = follows.map(f => f.followingId);

  if (followingIds.length === 0) {
    return res.json({ code: 0, data: { list: [], total: 0, page: +page, pageSize: limit } });
  }

  // 2. 查询活动（排除 follow 类型，feed 中不需要显示）
  const { count, rows } = await Activity.findAndCountAll({
    where: {
      userId: { [Op.in]: followingIds },
      type: { [Op.in]: ['create_recipe', 'comment', 'favorite', 'review', 'work'] }
    },
    include: [
      { model: User, as: 'user', attributes: ['id', 'username', 'avatar'] }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    distinct: true
  });

  // 3. 补充食谱信息
  const recipeIds = rows
    .filter(a => a.targetType === 'recipe')
    .map(a => a.targetId);
  let recipeMap = {};
  if (recipeIds.length) {
    const recipes = await Recipe.findAll({
      where: { id: { [Op.in]: recipeIds } },
      attributes: ['id', 'title', 'coverImage']
    });
    recipeMap = Object.fromEntries(recipes.map(r => [r.id, r]));
  }

  // 4. 组装
  const list = rows.map(a => ({
    id: a.id,
    type: a.type,
    targetId: a.targetId,
    targetType: a.targetType,
    extra: a.extra ? JSON.parse(a.extra) : null,
    createdAt: a.createdAt,
    user: a.user,
    recipe: recipeMap[a.targetId] || null,
    workImage: a.type === 'work' && a.extra ? JSON.parse(a.extra).imageUrl : null
  }));

  res.json({ code: 0, data: { list, total: count, page: +page, pageSize: limit } });
});
```

---

## 4. 前端组件设计

### 4.1 组件树

```
HomePage
└── ActivityFeed          // 动态流容器
    ├── EmptyState        // 无关注 / 无动态时的空态
    └── ActivityCard[]    // 单条动态卡片
```

### 4.2 ActivityFeed 组件

**职责**：请求动态数据、渲染列表、处理分页和空态

**Props**：无（自行请求）

**State**：
- `activities`: Array — 动态列表
- `loading`: Boolean
- `page`: Number
- `total`: Number
- `hasFollowings`: Boolean — 是否有关注用户

**逻辑**：
1. `useEffect` 调用 `GET /api/activities/feed`
2. 若返回 `total === 0` 且 `list === []`：
   - 调用 `GET /api/follows` 判断是否有关注用户
   - 有关注但无动态 → 显示「暂无动态，稍后再来看看」
   - 无关注 → 显示 EmptyState
3. 滚动到底部加载下一页（或使用分页按钮）

### 4.3 ActivityCard 组件

**职责**：渲染单条动态

**Props**：
```typescript
interface ActivityCardProps {
  id: number;
  type: 'create_recipe' | 'favorite' | 'work' | 'comment' | 'review';
  targetId: string;
  targetType: string;
  user: { id: string; username: string; avatar: string };
  recipe?: { id: string; title: string; coverImage: string } | null;
  workImage?: string | null;
  extra?: Record<string, any> | null;
  createdAt: string;
}
```

**布局**（水平排列）：

```
┌─────────────────────────────────────────────────┐
│ [头像40px] [类型badge] 用户名 · 动作描述   [食谱封面60px] │
│                               2小时前                    │
└─────────────────────────────────────────────────┘
```

**类型 badge 与动作描述映射**：

| type | badge 图标 | 动作描述 | 点击跳转 |
|------|-----------|---------|---------|
| create_recipe | 🍳 发布了食谱 | 「发布了食谱《红烧排骨》」 | `/recipe/:targetId` |
| favorite | ❤️ 收藏了食谱 | 「收藏了食谱《番茄炒蛋》」 | `/recipe/:targetId` |
| work | 📸 上传了作品 | 「上传了作品」 | `/recipe/:recipeId`（extra 中取） |
| comment | 💬 评论了食谱 | 「评论了食谱《...》」 | `/recipe/:targetId` |
| review | ⭐ 评价了食谱 | 「评价了食谱《...》」 | `/recipe/:targetId` |

> **work 类型的跳转**：targetId 是 commentId，需要从 extra 中提取 recipeId 或 recipeTitle，跳转到对应食谱页。若 extra 无 recipeId，则跳转到 `/recipe/${targetId}` 兜底（comment 路由可解析）。

### 4.4 EmptyState 组件

**展示条件**：用户无任何关注

**UI**：
```
┌─────────────────────┐
│     🔍              │
│  还没有关注任何人    │
│  去发现美食达人吧！  │
│  [发现达人] 按钮     │
└─────────────────────┘
```

点击「发现达人」跳转到 `/explore` 或推荐用户页面。

### 4.5 样式要点

- ActivityCard 之间用细分隔线（1px #f0f0f0）
- 卡片内 padding: 16px 20px
- 用户头像圆角 50%，40×40px
- 食谱封面圆角 8px，60×60px，object-fit: cover
- 类型 badge 20×20px，与用户名同行
- 相对时间格式：刚刚 / x分钟前 / x小时前 / 昨天 / x天前
- 整体最大宽度跟随首页容器

---

## 5. 数据流

```
HomePage (mount)
  │
  ├─ useState: activities = [], loading = true, page = 1
  │
  ├─ useEffect([]):
  │     │
  │     ├─ fetchActivities(page, pageSize)
  │     │     │
  │     │     └─ GET /api/activities/feed?page=1&pageSize=20
  │     │           │
  │     │           └─ Response → setActivities(list), setTotal(count)
  │     │
  │     └─ setLoading(false)
  │
  ├─ 渲染: loading ? <Spinner /> : <ActivityFeed activities={activities} />
  │
  └─ 滚动/翻页:
        │
        ├─ fetchActivities(page + 1, pageSize)
        │
        └─ setActivities(prev => [...prev, ...newList])
```

**关键 API 调用函数**：

```javascript
const fetchActivities = async (page = 1, pageSize = 20) => {
  const res = await fetch(`/api/activities/feed?page=${page}&pageSize=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json();
  if (json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '获取动态失败');
};
```

---

## 6. 验收标准

| # | 验收项 | 预期结果 |
|---|--------|---------|
| 1 | 有关注用户 + 有动态 | 首页显示动态流，默认 20 条/页，按时间倒序 |
| 2 | 无关注用户 | 显示 EmptyState「去发现美食达人」，含跳转按钮 |
| 3 | 有关注但无动态 | 显示「暂无动态，稍后再来看看」 |
| 4 | 新发食谱产生动态 | 刷新首页后，create_recipe 类型动态出现在 Feed 顶部 |
| 5 | 收藏食谱产生动态 | 刷新后，favorite 类型动态出现，targetId 指向食谱 |
| 6 | 上传作品（评论带图）产生动态 | 刷新后，work 类型动态出现，展示作品缩略图 |
| 7 | 点击 create_recipe 卡片 | 跳转到 `/recipe/:targetId` |
| 8 | 点击 favorite 卡片 | 跳转到 `/recipe/:targetId` |
| 9 | 点击 work 卡片 | 跳转到对应食谱详情页 |
| 10 | 分页/滚动加载 | 超过 20 条时加载第二页，数据追加不重复 |
| 11 | 未登录访问 | 返回 401，前端跳转登录页 |
| 12 | 网络异常 | 显示错误提示，支持重试 |

---

## 附录：实现优先级

| 优先级 | 内容 | 预估工时 |
|--------|------|---------|
| P0 | Activity 模型新增 work type + Feed API | 4h |
| P0 | ActivityFeed + ActivityCard 前端组件 | 4h |
| P1 | EmptyState + 关注检查逻辑 | 2h |
| P1 | 分页/无限滚动 | 2h |
| P2 | 类型 badge 图标美化 | 1h |
| P2 | 下拉刷新 + 新动态提示 | 2h |
