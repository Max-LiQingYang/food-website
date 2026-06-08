# PRD: 站内消息通知系统 + Web Push 浏览器推送

> **版本**: v2.0 | **最后更新**: 2026-06-08 | **状态**: 评审完成，待实现

## 一、概述
为美食食谱社区平台完善站内通知系统，覆盖所有用户交互场景（关注、评论、回复、收藏、成就、系统通知），并增加 Web Push 浏览器推送能力，利用已有 PWA Service Worker 实现离线推送。

## 二、当前存量（代码已实现部分）

### 2.1 后端 ✅ 已完成
- **Notification 模型**: id(UUID), userId, actorId, type(ENUM: follow/comment/reply/favorite/collection_add/meal_plan_reminder/cooking_log_reminder/achievement_unlock/challenge_update/system), message(500), link, targetId, targetType, isRead, createdAt
- **PushSubscription 模型**: id(UUID), userId, endpoint, p256dh, auth, userAgent, createdAt
- **Notification 路由**: GET /, GET /unread-count, PUT /:id/read, PUT /read-all, DELETE /:id
- **PushSubscription 路由**: POST /, GET /my, PUT /:id, DELETE /:id
- **notificationHelper.js**: `createNotification()` 已实现（含 Web Push 发送逻辑、用户偏好检查、过期订阅清理）
- **已注入通知的路由**: follows.js, comments.js, favorites.js, challenges.js

### 2.2 前端 ✅ 已完成
- **NotificationBell.tsx**: 导航栏铃铛 + 下拉面板 + 未读计数轮询（30s）
- **NotificationsPage.tsx**: 通知列表页（分页、筛选、标记已读、删除）
- **SettingsPage.tsx**: 已有"通知设置"Tab（但为旧版 4 项布尔开关，需重构）
- **api.ts**: 通知 CRUD、推送订阅、通知偏好 API 函数已定义
- **main.tsx**: Service Worker 注册已实现

### 2.3 ⚠️ 待实现
- **sw.js**: 无 `push` 事件处理（需新增）
- **VAPID 密钥**: 未生成/配置（需生成并写入 .env）
- **`web-push` npm 包**: 已在 package.json 中声明但需确认安装
- **前端推送订阅 UI**: 无触发订阅流程的 UI 组件
- **SettingsPage 通知偏好**: 旧版 4 项布尔开关，未对齐 PRD 的 6 类型 per-channel 模型
- **通知偏好后端路由**: GET/PUT /api/notification-preferences 未实现
- **achievement.js**: 未注入 createNotification
- **collection_add / meal_plan_reminder / cooking_log_reminder**: 类型已定义但无路由创建此类通知

## 三、数据库设计

### 3.1 Notification 模型（扩展）
- type ENUM 扩展: follow, comment, reply, favorite, collection_add, meal_plan_reminder, cooking_log_reminder, achievement_unlock, system
- 新增: `actorId` (UUID, 触发者用户ID, nullable), `targetId` (STRING, 关联对象ID), `targetType` (STRING, 关联对象类型: recipe/comment/user/collection)

### 3.2 PushSubscription 模型（新增）
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  userAgent STRING,
  createdAt DATETIME
);
```

### 3.3 通知偏好
- 使用 User.preferences JSON 字段存储，key: `notificationPreferences`
```json
{
  "notificationPreferences": {
    "follow": {"inApp": true, "push": true},
    "comment": {"inApp": true, "push": true},
    "reply": {"inApp": true, "push": true},
    "favorite": {"inApp": true, "push": true},
    "achievement_unlock": {"inApp": true, "push": false},
    "system": {"inApp": true, "push": true}
  }
}
```

## 四、后端 API（增量）

### 4.1 Web Push 路由 POST/PUT/DELETE /api/push/subscription
- POST — 注册推送订阅（endpoint, p256dh, auth）
- PUT — 更新订阅（endpoint 变更）
- DELETE — 取消订阅
- 推送发送: 在 createNotification 内部，检查用户偏好后通过 web-push 发送

### 4.2 通知偏好 GET/PUT /api/notification-preferences
- GET — 获取当前用户通知偏好
- PUT — 更新通知偏好

### 4.3 现有路由注入通知
| Route | 事件 | 通知类型 |
|-------|------|----------|
| follows.js POST /:id/follow | 关注 | follow |
| comments.js POST / | 评论食谱 | comment |
| comments.js POST /:id/reply | 回复评论 | reply |
| favorites.js POST / (单条) | 收藏食谱 | favorite |
| favorites.js POST /batch | 批量收藏 | favorite |
| achievement.js (checkUnlocked) | 成就解锁 | achievement_unlock |

## 五、前端功能

### 5.1 导航栏铃铛图标（Navbar 增强）
- 铃铛图标 + 未读数字气泡（红色圆形）
- 点击铃铛 → 下拉面板（5条最近通知 + "查看全部"链接）
- 下拉面板中每条可点击跳转，可标记已读
- 自动轮询未读计数（每 30 秒）

### 5.2 通知列表页 /notifications
- 分页列表，时间倒序
- 通知类型图标：👤关注 / 💬评论 / ↩️回复 / ❤️收藏 / 🏆成就 / 🔔系统
- 每项显示：图标 + 消息 + 时间 + 已读/未读状态
- 全部已读按钮
- 单条删除
- 顶部标签筛选：全部 / 未读

### 5.3 Web Push 流程
1. 页面加载 → 检查 `Notification.permission` 和已有订阅
2. 用户首次进入通知设置页 → 提示订阅浏览器推送
3. 用户同意 → `registration.pushManager.subscribe()` → 发送 endpoint 到后端
4. 后端收到新通知 → 遍历用户订阅 → web-push 发送
5. Service Worker `push` 事件 → 显示系统通知
6. 用户点击系统通知 → 前端页面跳转对应链接

### 5.4 通知设置
- SettingsPage 新增"通知" Tab
- 每个通知类型：站内通知开关 + 推送通知开关
- Web Push 订阅/取消订阅按钮
- 当前浏览器权限状态显示

## 六、实现优先级

| 优先级 | 内容 | 工作量 |
|--------|------|--------|
| **P0** | Notification 模型扩展 + createNotification 修复 + 通知路由完善 | 1h |
| **P0** | 前端铃铛图标 + 下拉面板 + 未读计数轮询 | 1.5h |
| **P0** | 前端通知列表页 /notifications | 1h |
| **P1** | Web Push 路由 + pushSubscription 模型 | 1h |
| **P1** | Service Worker push 事件 + 前端订阅流程 | 1h |
| **P1** | 通知偏好设置 (SettingsPage Tab) | 0.5h |
| **P2** | 各路由完整通知覆盖 + 测试 | 1h |

**总计**: ~7h (P0: ~3.5h, P1: ~2.5h, P2: ~1h)

## 七、设计约束

1. **非阻塞**: 通知创建使用 `setImmediate`，不延迟主响应
2. **去重**: 批量操作（如 batchFavorite）对同一目标不重复通知
3. **兼容性**: 通知模型扩展需向后兼容旧数据（新字段 nullable）
4. **隐私**: 用户可完全关闭通知和推送
5. **失败安全**: Web Push 发送失败不打断正常流程，仅 log error