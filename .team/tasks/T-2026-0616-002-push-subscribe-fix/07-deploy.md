# 07-deploy — T-2026-0616-002-push-subscribe-fix

## 部署完成 — P0 修复落地

### 部署方式
**Option A：本地构建 → docker cp**（推荐，最快）

### 部署前后对比

| 指标 | 部署前（prod） | 部署后（prod） | 本地（参考） |
|------|---------------|---------------|-------------|
| assets 数量 | 28 | **109** | 109 |
| 主 bundle | index-DZXWh4H0.js | **index-r7bUapX8.js** | index-r7bUapX8.js |
| 主 bundle 大小 | 263KB（推测旧） | 40KB | 40KB |
| SettingsPage chunk | ❌ | **✅ SettingsPage-BP5F03o8.js** | ✅ |
| PushSubscriptionPrompt | ❌ | ✅（在 SettingsPage chunk 内） | ✅ |
| Service Worker (sw.js) | ❌ | ✅ | ✅ |
| manifest.json | ❌ | ✅ | ✅ |
| icon.svg | ❌ | ✅ | ✅ |
| /api/push/* 前端调用 | ❌ | ✅（home-cards chunk 内） | ✅ |
| VAPID 字符串 | ❌ | ✅ | ✅ |

### 5 关验证（CI/CD 强制）

1. ✅ **本地代码 grep**：109 assets，SettingsPage/PushSubscriptionPrompt/home-cards 等关键 chunk 齐全
2. ✅ **容器内 grep**：`docker exec food-frontend ls /usr/share/nginx/html/assets/` = 109，SettingsPage/Notifications 等齐
3. ✅ **公网 API 验**：`/api/vapid-public-key` → 200
4. ✅ **公网 chunk 验**：`/settings` → 200，home-cards chunk 含 `post("/push/subscription",e)` / `get("/push/subscription/my",...)` / `delete("/push/subscription/"+e,...)` / `get("/vapid-public-key",...)`
5. ⚠️ **gateway status**：QClaw 本地 gateway 探针失败（与本次部署无关，本地 QClaw 服务问题）

### 端到端 push 流程实测（prod）

| 步骤 | HTTP | 结果 |
|------|------|------|
| POST /api/push/subscription（带 auth） | **201** | ✅ 创建成功，返 id |
| GET /api/push/subscription/my | **200** | ✅ 数组含刚创建的订阅 |
| DELETE /api/push/subscription/:id | **200** | ✅ 清理完成 |
| POST 无 auth | **401** | ✅ auth 中间件正确 |
| GET /api/vapid-public-key | **200** | ✅ VAPID 公钥可读 |
| GET /settings（SPA 路由） | **200** | ✅ 页面入口可访问 |

### 部署期间踩到的坑

1. **macOS tar xattr 阻断** → 已在 Option A 脚本用 `COPYFILE_DISABLE=1 tar --no-xattrs` 规避
2. **Alpine busybox sh 不支持 brace expansion** → 现场用 `for f in ...; do ...; done` 替代 `rm -rf {a,b,c}`
3. **nginx 用户文件权限** → 容器内 dist 仍 root 拥有，nginx 配置 `user` 指令已授权读取，无访问问题

### 复盘 / 教训（→ 写 iteration-lessons）

- **API 验通 ≠ 端到端 OK**：fullstack 第一轮 not-a-bug 是错的，因为只验了后端 API，没扫 prod frontend bundle
- **静态资源扫描是 E2E 必要步骤**：tester 应该 `docker exec` + grep 关键字符串（如 `/push/subscription`、VAPID、`/settings` 路由）作为 AC5 验证
- **假完成三层防御 1（时长）仍需保持**：本次 devops 1m48s 较 90s 阈值偏低，main 独立 ssh + curl 验证 5 关全跑才确认真完成
- **巡检误报是双重的**：
  - 路径错（`/api/push/subscribe` 应是 `/api/push/subscription`）
  - 方法错（GET 探 POST 端点）
  - **而且**巡检没有检查 frontend bundle 是否包含 UI
- **下次巡检改进建议**：从 `frontend/src/api.ts` 提取实际 endpoint 清单（GET/POST/PUT/DELETE），避免凭空构造路径

### 下一步

- 状态置为 done
- 写 iteration-lessons.md（"API PASS ≠ 端到端 PASS"、"prod bundle 静态扫描"）
- 写 metrics.jsonl 一行（task: T-2026-0616-002, severity: P0, type: deploy-drift, cost: 1.5h）
- 回调 WorkBuddy（dev-pipeline skill §9）
