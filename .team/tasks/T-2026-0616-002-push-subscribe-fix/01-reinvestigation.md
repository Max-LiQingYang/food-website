# 01-reinvestigation — T-2026-0616-002-push-subscribe-fix

## 复核发现（升级为 P0）

> 此文件覆盖原 00-story.md 假设 — fullstack 的 not-a-bug 结论只对了一半。

### 复核时间
2026-06-16 02:18 CST（reviewer PASS 后 5 分钟）

### 触发原因
reviewer 在 PASS（8.2/10，0 blockers）但 evidence_completeness=7 标 AC5 未验证。
tester 写 05-qa-report 时按 main 指令简化为 `/settings HTTP 200`，未做 prod bundle 静态扫描。
main 独立扫 prod bundle 触发新发现。

### 关键证据（prod 容器内 vs 本地 dist）

| 指标 | prod (food-frontend) | 本地 (frontend/dist) | 差异 |
|------|---------------------|---------------------|------|
| index.html 行数 | 13 | 37 | 缺 PWA meta/dns-prefetch/SW |
| assets 数量 | 28 | 109 | 缺 ~80 个 chunk |
| SettingsPage chunk | ❌ | ✅ SettingsPage-*.js | **Web Push UI 缺失** |
| PushSubscriptionPrompt | ❌ | ✅ | **核心组件缺失** |
| manifest.json | ❌ | ✅ | PWA 不可用 |
| sw.js (Service Worker) | ❌ | ✅ | 推送注册前提缺失 |
| icon.svg | ❌ | ✅ | 浏览器 tab 无图标 |
| API URL `/api/push/subscription` | ❌ | ✅ | **前端代码无任何 push 调用** |
| VAPID / pushSubscription 字符串 | ❌ | ✅ | **前端零 push 引用** |
| 路由表 | 无 /settings | 有 /settings | **/settings 路由未注册** |

### 核心结论

**fullstack 的 not-a-bug 结论是错误的。**

- **后端** pushSubscription 路由**确实正常**（POST/GET/DELETE 全部 200/201/401 PASS）— 这一段 fullstack 诊断对
- **前端** Web Push UI 整段**在 prod 中根本不存在** — 这一段 fullstack 漏诊

prod 实际是**部署漂移**：
1. frontend 容器是过老镜像（28 个 assets vs 本地 109 个）
2. 后端 pushSubscription.js 在容器中（curl 实证 ORM 写入成功）
3. 但前端没有调用代码 → 用户打开 /settings 看不到 PushSubscriptionPrompt
4. **用户感知**：Web Push 端到端不可用

### 正确处置

**升级为 P0 部署漂移**。需要 devops 重新部署前端。

### 复盘根因

1. **巡检路径错**（`/api/push/subscribe` 而非 `/api/push/subscription`）→ 后端 404 误报
2. **巡检用 GET 探 POST 端点** → 404 误报
3. **fullstack 调查时只验后端 curl**，未扫 prod frontend bundle 静态资源
4. **tester 按 main 指令简化 AC5 为"HTTP 200"**，未做静态扫描
5. **reviewer 基于上述两个报告 PASS**，未独立验证 frontend 资源

### 教训

- **bugfix 调查必须前后端 100% 端到端**：只验 API 不验前端 = 假完成
- **"无源码改动"的结论需静态资源 grep 证据**：tester 必须在 prod dist 中 grep 关键字符串
- **/settings HTTP 200 不足以证明页面工作**：SPA 路由表才是关键
- **devops 部署后必须 `docker exec <cid> ls ... | grep <key>` 验证**：不能只看 index.html 引用

### 下一步

- spawn devops 重建 frontend 镜像或 docker cp 最新 dist 进容器
- 重新端到端验证：/settings 页面 + PushSubscriptionPrompt 渲染 + 浏览器订阅
- 升级为 P0
- 写 iteration-lessons.md 新条目（"API PASS ≠ 端到端 OK"）
