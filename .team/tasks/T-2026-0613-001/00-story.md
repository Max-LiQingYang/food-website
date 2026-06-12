# T-2026-0613-001: 挑战赛页面显示"暂无挑战活动" Bug

## 结论
**bug-confirmed**

---

## ⚠ Main 勘误与补充（2026-06-13 04:34 GMT+8）

**勘误 #1（F1 漏判）**：原 story 文档未处理 F1 `/api/users/me` 404。补充决策：
- 现状：后端 routes/users.js 无 `/me`；前端 `getMe()` 调 `/api/auth/me`（auth.js:151 完整）；`/api/users/me` 无人调
- **决策：不修**。将 99-status.yaml 标记 F1 为"已知未挂载、无人调用、保留 404 状态"。在 `backend/routes/users.js` 顶部加注释说明"个人资料请用 /api/auth/me"，避免未来混淆
- AC-9：访问 `GET /api/users/me` 仍返回 404（不变）；`backend/routes/users.js` 顶部包含 `/me-alias 指引注释`
- 这是 main（管家）补的产品判断，产品专家原范围未覆盖 F1

---

**勘误 #2（pipeline 阶段补充）**：
- 原 pipeline 只到 qa；F1 不修 → 无需 impl 后端路由；但 F1 加注释属于前端可读的代码改动 → 仍走 minimal impl
- Pipeline：00-story ✓ → 03-impl (ui-designer 改 ChallengesPage.tsx + users.js 注释) → 05-qa (data-validator 跑 Playwright + curl) → 07-deploy (devops) → done
- 跳过 01-design / 02-plan-review / 04-code-review / 06-security —— 单文件 1-2 行改动不构成 design 评审门

---



---

## 用户故事

用户访问 `/challenges` 页面时，看到"暂无挑战活动"的空状态提示，但实际上 API 返回了 5 个 active 状态的挑战数据。这导致用户无法看到和参与现有的挑战赛活动，严重影响挑战赛功能的可用性。

---

## 验收标准

1. ✅ 访问 `/challenges` 页面时，正确渲染 5 个挑战卡片（而非空状态）
2. ✅ 按状态筛选（全部/进行中/投票中/已结束）均能正确显示对应列表
3. ✅ 挑战卡片显示正确的标题、主题、描述、投稿数、投票数
4. ✅ 挑战状态徽章（active/voting/closed）能正确显示
5. ✅ 点击挑战卡片能正确跳转到详情页
6. ✅ Loading 状态正常显示（骨架屏）
7. ✅ 无数据时仍能正确显示"暂无挑战活动"空状态
8. ✅ 浏览器 Console 无 JavaScript 错误

---

## 影响范围

**前端文件：**
- `/Users/max_yang/Projects/food-website/frontend/src/pages/ChallengesPage.tsx`
  - 第 16 行：`getChallenges({ status: filter || undefined }).then(r => setChallenges(r.list))`

**API 层（类型定义）：**
- `/Users/max_yang/Projects/food-website/frontend/src/api.ts`
  - `getChallenges` 函数的返回类型与实际响应结构不匹配

---

## Bug 根因分析

**数据路径不匹配：**

1. **后端返回结构：**
   ```json
   {
     "code": 0,
     "data": {
       "list": [...],
       "total": 5,
       "page": 1,
       "pageSize": 12
     }
   }
   ```

2. **Axios 拦截器处理：**
   ```typescript
   apiClient.interceptors.response.use(
     response => response.data,  // 返回整个后端响应体
     ...
   )
   ```

3. **前端调用代码（错误）：**
   ```typescript
   getChallenges(...).then(r => setChallenges(r.list))
   // ❌ r.list 是 undefined，实际应该是 r.data.list
   // ✅ r = { code: 0, data: { list: [...], total: 5, ... } }
   ```

4. **结果：** `challenges = []`，触发空状态渲染

**类型不匹配隐患：**
`api.ts` 中 `getChallenges` 返回类型声明为 `Promise<{ list: Challenge[]; total: number }>`，
但实际返回为 `{ code: number, data: { list: ..., total: ..., page: ..., pageSize: ... } }`。

---

## 建议修复方向

**方案 A（推荐）：修复调用点**
- 修改 `ChallengesPage.tsx` 第 16 行：
  ```typescript
  // 修复前：.then(r => setChallenges(r.list))
  // 修复后：.then(r => setChallenges(r.data.list))
  ```

**方案 B（推荐同时做）：统一 API 响应处理**
- 检查并修复所有类似的 API 调用（`getChallengeSubmissions`、`getChallengeRanking`、`getMySubmissions` 等可能有同样问题）
- 更新 TypeScript 类型定义以匹配实际响应结构

**方案 C（长期改进）：统一响应拦截器**
- 在 axios 拦截器中统一剥离外层 `{ code, data, message }` 包装，直接返回 `data` 内容
- 这样可以保持 `r.list` 的调用方式，简化前端代码
- 但需要全量验证所有 API 调用是否兼容此变更

---

## 巡检误报根因说明

**此 Bug 非误报，是真实存在的前端 Bug。**

巡检报告正确识别了问题：前端页面显示"暂无挑战活动"，但实际有数据。
巡检使用的简单 HTML 文本匹配（grep "暂无挑战活动"）恰好落在了 React SPA 的空状态模板中，
但未能区分这是"条件渲染的空状态分支"还是"实际渲染后的 DOM 文本"。

本次诊断通过代码分析确认了 Bug 确实存在——由于前端访问了错误的响应数据路径，
导致空状态分支被触发而非列表渲染。
