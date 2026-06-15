# T-2026-0616-002 Web Push 订阅注册 404 修复

## 元信息

| 字段 | 值 |
|------|-----|
| 任务ID | T-2026-0616-002-push-subscribe-fix |
| 优先级 | P1 |
| 发现时间 | 2026-06-16 01:46 |
| 缺陷 | prod `/api/push/subscription` 返回 404，Web Push 端到端未打通 |
| 指派 | fullstack |
| 状态 | 待认领 |

---

## 用户故事

作为已登录用户，我希望在设置页能订阅 Web Push 通知，以便及时收到系统通知。

---

## 已查证事实

1. **前端有完整 Web Push UI**（已通过 grep 确认）：
   - `frontend/src/pages/SettingsPage.tsx:252` 渲染 `<PushSubscriptionPrompt />`
   - `frontend/src/hooks/usePushSubscription.ts` 调用 `getPushSubscriptions` / `registerPushSubscription` / `unregisterPushSubscription`
   - `frontend/src/api.ts:2379-2393` 三个 API 调用 endpoint：
     - GET `/push/subscription/my`
     - POST `/push/subscription`
     - DELETE `/push/subscription/:id`
   - **前端实际调用的 path 是 `/push/subscription`**，不是巡检报告里写的 `/push/subscribe`

2. **后端已有路由文件** `backend/routes/pushSubscription.js`，定义了：
   - POST `/` (mounted as POST `/api/push/subscription`)
   - GET `/my`
   - PUT `/:id`
   - DELETE `/:id`

3. **后端 routes/index.js:99** 已挂载：`router.use('/push/subscription', require('./pushSubscription'))`

4. **但线上 `/api/push/subscription` 也返回 404** → 说明**当前部署的 prod 镜像不包含 pushSubscription 路由文件**（image 是 baked-in 代码）

5. **VAPID 公钥端点 200** → `/api/vapid-public-key` 在 prod 中，说明 part of push code 是新加的，但 `/push/subscription` 路由要么没部署要么部署时序有问题

6. **VAPID 私钥未配置** → `notificationHelper.js:38` 会静默跳过真实推送发送，但**订阅注册本身应正常 200**

---

## 验收标准 (AC) — 必须可验证

### AC1 — POST 订阅注册返回 200/201
prod 执行：
```bash
curl -X POST http://39.103.68.205/api/push/subscription \
  -H "Authorization: Bearer <登录token>" \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"https://fcm.googleapis.com/fcm/send/test","keys":{"p256dh":"test","auth":"test"}}'
```
**期望**：返回 200 或 201，响应体 `{code:0, message:"ok"}`

### AC2 — 未授权访问返回 401
prod 执行（**不带** `Authorization` header）：
```bash
curl -X POST http://39.103.68.205/api/push/subscription \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"https://fcm.googleapis.com/fcm/send/test","keys":{"p256dh":"test","auth":"test"}}'
```
**期望**：返回 401

### AC3 — 查询我的订阅返回数组
prod 执行：
```bash
curl http://39.103.68.205/api/push/subscription/my \
  -H "Authorization: Bearer <token>"
```
**期望**：返回 200，响应体为数组结构（即使为空数组 `[]`）

### AC4 — VAPID 公钥端点保持可用
prod 执行：
```bash
curl http://39.103.68.205/api/vapid-public-key
```
**期望**：返回 200，响应体包含 `publicKey` 字段

### AC5 — 前端页面无异常
- devops 部署后，前端 `/settings` 页面打开无 console error
- `<PushSubscriptionPrompt />` 渲染正常（curl + grep 静态资源确认组件代码已打入 dist）

### AC6 — 边界约束
- **不**重构推送整体架构
- **不**修改 `notificationHelper.js` 的 VAPID 跳过逻辑
- **不**引入 web-push npm 包配置
- 修复范围仅限让 `/api/push/subscription` 路由在 prod 可用

### AC7 — 黑板产出
- `03-impl.diff` — 实现 diff
- `04-code-review-r1.json` — 代码审查
- `05-qa-report.md` — QA 报告
- `06-security-audit.json` — 安全审计（低风险标记 PASS）
- 部署记录

---

## Out of Scope（明确边界）

- 不实现真实推送发送（VAPID 私钥缺失，当前环境未配置）
- 不修改前端任何文件（前端已经写好且功能完整）
- 不动 `notificationHelper.js`（其 VAPID 跳过逻辑保持现状）
- 不配置 VAPID 环境变量（由后续独立任务处理）
- 不修复其他无关问题

---

## 已知风险与假设

| 风险 | 缓解措施 |
|------|---------|
| prod 镜像 baked-in，路由文件缺失可能因构建时未包含 | 确认 `pushSubscription.js` 在构建产物中；若缺失，检查 `.dockerignore` / 构建脚本 |
| 部署后旧容器仍在服务流量 | devops 部署后验证滚动更新完成 |
| 数据库表 `PushSubscription` 可能未创建 | 若 ORM 自动迁移未执行，需手动确认表结构 |

---

## 黑板路径

```
~/Projects/food-website/.team/tasks/T-2026-0616-002-push-subscribe-fix/
├── 00-story.md              ← 本文档
├── 01-investigation.md      ← 调查结果（已有）
├── 02-design.md             ← 设计文档（如需要）
├── 03-impl.diff             ← 实现 diff
├── 04-code-review-r1.json   ← 代码审查
├── 05-qa-report.md          ← QA 报告
├── 06-security-audit.json   ← 安全审计
└── 07-deploy.md             ← 部署记录
```

---

## 历史经验注入

### fullstack lessons (episodic)
- [T-2026-0612-001] fullstack 主动跑 `git diff` 实证 3 禁动文件为空 + 静态扫描 8 文件全到位 + 主动跑 Lighthouse（环境允许时）+ 主动发现 5 out-of-scope follow-up

### product lessons (episodic)
- [T-2026-0612-001] product 输出 Story + AC 模板清晰、字段明确
