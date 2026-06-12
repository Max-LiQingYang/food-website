# T-2026-0613-001 - 实现总结

## Bug 根因
后端所有挑战赛路由返回统一包装 `{ code: 0, data: { list: [...], total, page, pageSize } }`，前端 axios 拦截器返回 `response.data`（整个响应体），但前端调用代码全部使用 `r.list` → `undefined`，触发"暂无挑战活动"空状态。

## 修改清单

### 1. frontend/src/pages/ChallengesPage.tsx:15
- **Before**: `.then(r => setChallenges(r.list))`
- **After**: `.then(r => setChallenges(r.data.list))`

### 2. frontend/src/components/ChallengeHomeCards.tsx:19
- **Before**: `.then(r => setChallenges(r.list))`
- **After**: `.then(r => setChallenges(r.data.list))`

### 3. frontend/src/pages/ChallengeDetailPage.tsx:22-23
- **Before**: `setSubmissions(subs.list)` / `setRankings(rank.list)`
- **After**: `setSubmissions(subs.data.list)` / `setRankings(rank.data.list)`

### 4. frontend/src/pages/ChallengeDetailPage.tsx:37-38
- **Before**: `setSubmissions(subs.list)` / `setRankings(rank.list)`
- **After**: `setSubmissions(subs.data.list)` / `setRankings(rank.data.list)`

### 5. frontend/src/api.ts:1363-1422
- 新增通用类型 `ApiResponse<T>` 包装 API 响应
- 修改 4 个 API 函数返回类型：
  - `getChallenges()`: 返回 `ApiResponse<{ list: Challenge[]; total: number; page: number; pageSize: number }>`
  - `getChallengeSubmissions()`: 同上
  - `getChallengeRanking()`: 同上
  - `getMySubmissions()`: 同上
- 移除错误的 `.then(r => r.data?.data || ...)` 双重解构逻辑

### 6. frontend/src/pages/ChallengeDetailPage.test.tsx:21-117
- 更新 mockSubmissions 和 mockRanking 的 mock 数据结构，增加 `{ code: 0, data: { ... } }` 包装
- 更新 voteChallenge mock 返回值为 `{ code: 0, data: { message: '投票成功' } }`

## 自测结果

### Build
- ✅ `npm run build`: 0 errors, 0 warnings

### Tests
- ✅ `npm test -- --run ChallengeDetailPage`: 6 tests passed
  - 显示挑战详情 ✅
  - 显示投稿列表 ✅
  - 显示规则 ✅
  - 切换到排行榜 ✅
  - 投票按钮可点击 ✅
  - 不存在的挑战显示提示 ✅

## 回退说明
- 无需回退，修复完整且向后兼容（返回类型更精确，调用方正确访问数据层级）
- 所有修改局限于挑战赛相关代码，不影响其他功能模块
