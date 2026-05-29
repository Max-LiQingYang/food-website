# PRD: 食谱收藏备注功能

> **项目**: food-website (React 18 + Express + Sequelize + MariaDB)
> **基线 Commit**: e4bdc05
> **作者**: AI Product Agent
> **日期**: 2026-05-30
> **状态**: Draft

---

## 1. 需求评估

### 1.1 价值分析

| 维度 | 评分 | 说明 |
|------|------|------|
| 用户价值 | ⭐⭐⭐⭐ | 收藏备注帮助用户记录「为什么收藏」「我做了哪些改动」，解决"收藏即遗忘"的痛点 |
| 差异化 | ⭐⭐⭐ | 主流食谱 App（下厨房、美食杰）收藏无备注能力，属于增量创新 |
| 完成度 | ⭐⭐⭐⭐⭐ | 改动范围可控：1 个模型字段 + 1 个 API + 3 个前端组件点 |
| 复用性 | ⭐⭐⭐⭐ | 备注数据可复用于推荐理由展示、搜索排序优化（未来） |

### 1.2 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 数据库迁移失败 | 低 | 高 | `note` 字段可选 + 默认 NULL，ALTER TABLE 是 ADD COLUMN，不破坏现有数据 |
| 500 字限制争议 | 中 | 低 | 首期 500 字足够记录烹饪笔记；后续可按需扩展或改为 Markdown |
| XSS 注入 | 中 | 中 | 后端对 `note` 做 HTML 转义；前端 React 默认转义，双重保障 |
| 缓存一致性 | 低 | 中 | 更新备注后清除 favoriteService 内存缓存（复用已有 `clearCache()`） |
| 收藏弹窗交互复杂化 | 中 | 低 | 备注输入区默认折叠，点击展开；不干扰原有收藏/取消流程 |

### 1.3 工作量估算

| 模块 | 任务 | 预估工时 |
|------|------|----------|
| **后端** | Favorite 模型新增 `note` 字段 + 迁移脚本 | 0.5h |
| **后端** | `PUT /api/favorites/:recipeId/note` API | 1h |
| **后端** | `GET /api/favorites` 返回 note 字段 | 0.5h |
| **后端** | `GET /api/favorites/:recipeId/status` 返回 note | 0.5h |
| **后端** | 单元测试 | 1h |
| **前端** | api.ts 新增类型与调用函数 | 0.5h |
| **前端** | FavoriteList 卡片备注展示 | 1h |
| **前端** | FavoriteNoteModal 组件（备注弹窗） | 2h |
| **前端** | RecipeDetailPage 收藏按钮集成备注 | 1.5h |
| **前端** | UserProfilePage 收藏标签页备注展示 | 1.5h |
| **前端** | 暗色模式适配 + 响应式 | 1h |
| **前端** | 单元测试 | 1h |
| **总计** | | **约 12h** |

---

## 2. 用户故事

### US-1: 收藏时添加备注

> 作为一名用户，我在收藏食谱时，希望能同时写下备注（如"妈爱吃这道菜""减脂期适合"），以便日后回忆收藏原因。

**优先级**: P0
**验收**: 收藏操作弹窗中包含备注输入区；提交后备注与收藏记录关联存储。

### US-2: 收藏后编辑备注

> 作为一名用户，我想在已收藏的食谱上追加或修改备注（如做完后写下"少放盐更好吃"），以便记录烹饪心得。

**优先级**: P0
**验收**: 已收藏的食谱详情页可打开备注编辑弹窗；修改即时保存。

### US-3: 收藏列表查看备注

> 作为一名用户，我在收藏列表中希望能直接看到备注摘要，以便快速找到带特定备注的食谱。

**优先级**: P0
**验收**: 收藏卡片在有备注时显示最多 2 行截断文本；无备注时不占位。

### US-4: 个人主页查看备注

> 作为一名用户，我在个人主页的「收藏」标签页中也能看到和编辑备注。

**优先级**: P1
**验收**: UserProfilePage 收藏 Tab 的 RecipeCard 下方展示备注；支持点击编辑。

### US-5: 删除备注

> 作为一名用户，我想清除某条收藏的备注（保留收藏关系），以便保持备注的准确性。

**优先级**: P1
**验收**: 备注编辑弹窗可清空内容并保存，等价于删除备注。

---

## 3. 验收标准

### AC-1: 后端模型

- [ ] Favorite 模型包含 `note TEXT` 字段，允许 NULL，默认 NULL
- [ ] `note` 字段最大长度 500 字符，超出时后端返回 400 错误
- [ ] 数据库迁移脚本可正确在现有 `favorites` 表上 ADD COLUMN

### AC-2: API — 更新备注

- [ ] `PUT /api/favorites/:recipeId/note` 请求体 `{ note: string }` 可更新备注
- [ ] 传入空字符串 `""` 等价于删除备注（存储 NULL）
- [ ] 未收藏的食谱调用此 API 返回 404
- [ ] 未认证请求返回 401
- [ ] 更新成功后返回完整收藏记录（含 note 字段）
- [ ] 更新成功后缓存被清除

### AC-3: API — 查询包含 note

- [ ] `GET /api/favorites` 响应中每条记录包含 `note` 字段（可能为 null）
- [ ] `GET /api/favorites/:recipeId/status` 响应包含 `note` 字段

### AC-4: 前端 — FavoriteList 页面

- [ ] 收藏卡片在有备注时显示备注文本，最多 2 行，超出部分省略号截断
- [ ] 无备注时卡片布局不变，不显示空占位
- [ ] 点击备注区域可打开编辑弹窗

### AC-5: 前端 — RecipeDetailPage 收藏按钮

- [ ] 收藏时（点击❤️），如果之前无备注，弹窗出现备注输入区
- [ ] 已收藏状态下，收藏按钮旁出现📝图标，点击打开备注编辑弹窗
- [ ] 弹窗包含 textarea（placeholder：「记录你的烹饪笔记…」）、字数统计、保存/取消按钮
- [ ] 保存后即时更新页面上的备注显示（如有）

### AC-6: 前端 — UserProfilePage 收藏标签页

- [ ] 收藏 Tab 中的 RecipeCard 展示备注（同 FavoriteList 的截断规则）
- [ ] 支持点击备注进入编辑

### AC-7: 暗色模式 & 响应式

- [ ] 备注文本在暗色模式下颜色使用 CSS 变量，无硬编码颜色
- [ ] 移动端（<768px）备注编辑弹窗全屏展示
- [ ] 桌面端弹窗居中模态框（max-width: 480px）

### AC-8: 安全

- [ ] `note` 字段内容经 HTML 实体转义后存储/返回
- [ ] 长度超 500 字符时返回 400 + 明确错误消息

---

## 4. 字段规格

### 4.1 Favorite 模型 — 新增字段

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `note` | `TEXT` | 可选, NULL | `NULL` | 收藏备注/烹饪笔记，最多 500 字符 |

### 4.2 数据库迁移 SQL（MariaDB/MySQL）

```sql
ALTER TABLE `favorites`
  ADD COLUMN `note` TEXT DEFAULT NULL
  COMMENT '收藏备注/烹饪笔记，最多500字'
  AFTER `isDeleted`;
```

### 4.3 Sequelize 模型变更

```js
// backend/models/favorite.js — 新增字段定义
note: {
  type: DataTypes.TEXT,
  allowNull: true,
  defaultValue: null,
  validate: {
    len: {
      args: [0, 500],
      msg: '备注最多 500 字'
    }
  },
  comment: '收藏备注/烹饪笔记，最多500字'
}
```

---

## 5. API 设计

### 5.1 新增接口

#### PUT /api/favorites/:recipeId/note

更新（或删除）指定食谱的收藏备注。

| 项目 | 说明 |
|------|------|
| **Method** | `PUT` |
| **Path** | `/api/favorites/:recipeId` |
| **Auth** | 需要（Bearer Token） |
| **Content-Type** | `application/json` |

**请求体:**

```json
{
  "note": "少放盐更好吃，下次试试加蚝油"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `note` | `string` | 是 | 备注内容；空字符串 `""` 等价于删除备注 |

**成功响应 (200):**

```json
{
  "code": 0,
  "message": "备注更新成功",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "recipeId": "uuid",
    "note": "少放盐更好吃，下次试试加蚝油",
    "createdAt": "2026-05-30T00:00:00.000Z"
  }
}
```

**错误响应:**

| 状态码 | 场景 | 响应体 |
|--------|------|--------|
| 400 | note 超过 500 字 | `{ code: 400, message: "备注最多 500 字", data: null }` |
| 401 | 未认证 | `{ code: 401, message: "请先登录", data: null }` |
| 404 | 未收藏该食谱 | `{ code: 404, message: "未收藏该食谱", data: null }` |
| 500 | 服务异常 | `{ code: 500, message: "服务器内部错误", data: null }` |

### 5.2 修改现有接口

#### GET /api/favorites — 响应变更

每条 `list` 元素新增 `note` 字段：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 10,
    "page": 1,
    "pageSize": 20,
    "list": [
      {
        "id": "uuid",
        "userId": "uuid",
        "recipeId": "uuid",
        "note": "减脂期最爱",  // ← 新增
        "createdAt": "...",
        "recipe": { ... }
      }
    ]
  }
}
```

#### GET /api/favorites/:recipeId/status — 响应变更

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "isFavorited": true,
    "favoriteId": "uuid",
    "note": "少放盐更好吃"  // ← 新增
  }
}
```

---

## 6. 前端组件树

### 6.1 新增组件

```
FavoriteNoteModal
├── ModalOverlay
│   └── ModalContent
│       ├── 标题 "收藏备注"
│       ├── Textarea (max 500 chars, placeholder)
│       ├── 字数统计 (n/500)
│       ├── 保存按钮
│       └── 取消按钮
```

### 6.2 修改的组件

#### FavoriteList.tsx

```
FavoriteList (页面)
├── FavoriteListHeader
├── FavoriteListGrid
│   └── RecipeCard (现有，新增备注展示)
│       ├── CoverImage
│       ├── Info
│       │   ├── Title
│       │   ├── Author
│       │   ├── Date
│       │   └── NotePreview ← 新增：2行截断备注 + 点击编辑
│       └── UnfavoriteButton
└── Pagination
```

#### RecipeDetailPage.tsx

```
RecipeDetailPage
├── DetailCover
│   └── DetailCoverActions
│       ├── FavButton (现有收藏按钮)
│       ├── NoteButton ← 新增：📝 图标，已收藏时可见
│       └── AddToCollectionDropdown
├── FloatingActionBar (移动端)
│   ├── FabFavorite
│   ├── FabNote ← 新增：📝 已收藏时可见
│   └── ...
├── FavoriteNoteModal ← 新增：备注编辑弹窗
└── ...
```

#### UserProfilePage.tsx

```
UserProfilePage
├── ProfileTabs
│   └── FavoritesTab
│       └── RecipeCard (现有)
│           └── NotePreview ← 新增：同 FavoriteList 的备注展示
├── FavoriteNoteModal ← 新增：复用同一组件
└── ...
```

#### api.ts — 新增

```typescript
// 更新收藏备注
export function updateFavoriteNote(recipeId: string, note: string): Promise<UpdateFavoriteNoteResponse> {
  return apiClient.put(`/favorites/${recipeId}/note`, { note })
}

// 类型更新
export interface FavoriteItem {
  id: number
  userId: string
  recipeId: string
  note: string | null  // ← 新增
  createdAt: string
  recipe?: Recipe | null
}

export interface FavoriteStatusResponse {
  isFavorited: boolean
  favoriteId: string
  note: string | null  // ← 新增
}
```

### 6.3 CSS 新增

```
FavoriteList.css
├── .recipe-card__note          ← 备注文本区
├── .recipe-card__note--empty   ← 空备注（不显示）
└── .recipe-card__note--truncated ← 2行截断样式

FavoriteNoteModal.css (新文件)
├── .fav-note-modal             ← 弹窗容器
├── .fav-note-modal__textarea   ← 文本输入
├── .fav-note-modal__counter    ← 字数统计
└── body.dark 覆写规则
```

---

## 7. 后端实现要点

### 7.1 routes/index.js — 新增路由

```js
router.put('/favorites/:recipeId/note', favoriteRoutes.updateNote)
```

### 7.2 routes/favorites.js — 新增控制器

```js
async function updateNote(req, res) {
  const userId = req.userId
  const { recipeId } = req.params
  const { note } = req.body

  // 校验 note 字段
  if (typeof note !== 'string') {
    return res.status(400).json(resJSON(400, 'note 必须为字符串', null))
  }
  if (note.length > 500) {
    return res.status(400).json(resJSON(400, '备注最多 500 字', null))
  }

  // HTML 转义
  const sanitizedNote = note.trim() === '' ? null : escapeHtml(note.trim())

  // 查找收藏记录
  const fav = await Favorite.findOne({
    where: { userId, recipeId, isDeleted: false }
  })
  if (!fav) {
    return res.status(404).json(resJSON(404, '未收藏该食谱', null))
  }

  await fav.update({ note: sanitizedNote })
  favoriteService.clearCache()

  return res.status(200).json(resJSON(0, '备注更新成功', {
    id: fav.id,
    userId: fav.userId,
    recipeId: fav.recipeId,
    note: fav.note,
    createdAt: fav.createdAt
  }))
}
```

### 7.3 favoriteService.js — 修改

- `getFavoritesByUser()`: `attributes` 数组新增 `'note'`；返回的 `list` 对象新增 `note` 字段
- `getFavoriteStatus()`: `attributes` 数组新增 `'note'`；返回对象新增 `note` 字段

---

## 8. 不做的范围（明确排除项）

| 排除项 | 原因 |
|--------|------|
| **Markdown / 富文本备注** | 首期纯文本足够；富文本增加 XSS 风险和渲染复杂度，留作 V2 |
| **备注搜索/筛选** | 当前收藏列表无全文检索，备注搜索依赖后端 LIKE 查询性能差，留作 V2 |
| **备注分享** | 备注为私人笔记，不在食谱公开页展示 |
| **备注附件（图片/语音）** | 需要文件存储，大幅增加复杂度，留作 V2 |
| **批量编辑备注** | 场景罕见，收益低 |
| **备注历史版本** | 类似 Git diff 功能，过度设计 |
| **其他用户的收藏备注可见** | 备注为纯私有数据，仅在当前用户自己的收藏列表/个人主页可见 |
| **备注导出** | 现有 ExportMenu 不含收藏备注，本次不扩展 |
| **收藏分组/标签** | 独立需求，与备注正交，应单独立项 |

---

## 9. 技术决策记录

| # | 决策 | 备选方案 | 选择理由 |
|---|------|----------|----------|
| 1 | note 字段使用 `TEXT` 而非 `VARCHAR(500)` | VARCHAR(500) | MariaDB TEXT 无需指定长度，Sequelize `len` validate 已约束 500 字符；TEXT 存储无行溢出问题 |
| 2 | 空备注存 NULL 而非空字符串 | 空字符串 | NULL 语义更清晰（"没有备注" vs "备注为空"）；前端判断更简洁 `if (note)` |
| 3 | 独立 PUT 端点而非 PATCH 全量更新 | PATCH /api/favorites/:id | 遵循 RESTful 细粒度原则；避免暴露/误改 isDeleted 等内部字段 |
| 4 | 后端 HTML 转义 + 前端 React 自动转义 | 仅前端转义 | 纵深防御：即使前端绕过，后端也保证存储安全 |
| 5 | 新增 FavoriteNoteModal 独立组件 | 内联到 FavoriteButton | 解耦关注点；弹窗可复用于 FavoriteList、UserProfilePage、RecipeDetailPage 三处 |

---

## 10. 实施顺序

1. **后端**: 模型 + 迁移 → API → 测试
2. **前端**: api.ts 类型 → FavoriteNoteModal 组件 → FavoriteList 集成 → RecipeDetailPage 集成 → UserProfilePage 集成
3. **样式**: CSS 变量 + 暗色模式 → 响应式
4. **测试**: 后端 API 测试 → 前端组件测试 → E2E 验收
