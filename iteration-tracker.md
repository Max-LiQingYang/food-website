
## 迭代 #24 — UI/UX 健壮性与导航体验增强 ✅
**Commit**: `c696757` (2026-05-24 05:08)
**测试**: 30/30 新增 + 已有 273 = 303 总计（全绿前端）
**部署**: http://39.103.68.205/

### 功能
- **ErrorBoundary**: 双层包裹（App 层 + 路由层），优雅降级 UI，重试 + 返回首页，可上报后端
- **Toast**: error 5s 自动消失补全，暗色模式适配，替换 alert() 调用
- **Breadcrumb**: 自动路由面包屑，响应式收缩，暗色模式
- **Print View**: `@media print` 隐藏非核心元素，保留食材/步骤/营养，详情页打印按钮

### 文件操作
| 文件 | 操作 |
|------|------|
| `frontend/src/components/ErrorBoundary.tsx` + `.css` + `.test.tsx` | 新建 |
| `frontend/src/components/Breadcrumb.tsx` + `.css` + `.test.tsx` | 新建 |
| `frontend/src/components/PrintView.css` | 新建 |
| `frontend/src/context/ToastContext.test.tsx` | 新建 |
| `frontend/src/context/ToastContext.tsx` | 修改（error 5s） |
| `frontend/src/global.css` | 修改（Toast 暗色模式） |
| `frontend/src/router/index.tsx` | 修改（+ErrorBoundary +Breadcrumb） |
| `frontend/src/pages/RecipeDetailPage.tsx` | 修改（+打印按钮 + 导入PrintView） |
| `frontend/src/pages/RecommendPage.tsx` | 修改（alert → toast.warning） |

---

## 迭代 #25 — B/功能：食谱对比+购物清单+用户偏好 ✅
**Commit**: `5583f3d` (2026-05-24)
**部署**: http://39.103.68.205/

### 功能
- 食谱对比功能（/recipes/compare + 多维度对比表格）
- 购物清单增强（多清单管理 + 食材一键添加 + 勾选/分类）
- 用户偏好设置（饮食偏好 + 基于偏好筛选推荐）

---

## 迭代 #26 — C/内容质量：相似推荐+季节推荐+NutriScore ✅
**Commit**: `a86a08c` (2026-05-24)
**部署**: http://39.103.68.205/

### 功能
- 相似食谱推荐（Jaccard 相似度 + 五维 categoryTags + /recipes/:id/similar）
- 季节性推荐（/recipes/seasonal + 自动推断月份 + 中文标签）
- NutriScore 营养评分（营养等级徽章 + smartDifficulty 标签）

---

## 迭代 #27 — A/UI/UX：PWA+灯箱+计时器+无障碍 ✅
**Commit**: `72ed09b` (2026-05-24)
**部署**: http://39.103.68.205/

### 功能
- PWA 渐进式 Web 应用（manifest.json + Service Worker + 安装提示）
- 图片灯箱组件（全屏查看 + 左右滑动 + 缩放手势 + 键盘导航）
- 食谱步骤计时器（倒计时 + 暂停/重置 + 提示音）
- 无障碍增强（ARIA 标签 + 键盘导航 + 焦点管理）

---

## 迭代 #28 — B/功能：餐单计划+社交分享+烹饪日志 ✅
**Commit**: `2b82b2d` (2026-05-24)
**部署**: http://39.103.68.205/

### 功能
- 每周餐单计划（MealPlan 模型 + 7天×3餐网格 + 一键生成购物清单）
- 食谱社交分享（ShareModal + 微信/微博/复制链接）
- 烹饪日志（CookingLog 模型 + 用户主页标签 + 统计图表）

---

## 迭代 #29-#30 — C+A：内容发现+UI增强 ✅
**Commit**: `2b82b2d` (2026-05-24)
**部署**: http://39.103.68.205/

### 功能
- 内容发现：热门/新手推荐、质量检查
- UI 增强：悬浮预览、卡片动画、搜索防抖高亮、页面过渡、个性化推荐

---

## 迭代 #31 — B/功能：通知+成就+收藏发现 ✅
**Commit**: `e1c45fd` (2026-05-24)
**部署**: http://39.103.68.205/

### 功能
- 通知系统（Notification 模型 + 未读计数 + 铃铛组件 + 通知面板）
- 用户成就系统（Achievement 模型 + 解锁条件 + 徽章展示）
- 收藏夹发现（Collection isPublic + 公开浏览 + 订阅功能）

---

## 迭代 #32 — C/内容质量：评论回复+评分趋势+举报+质检 ✅
**Commit**: `1c158b4` (2026-05-24)
**部署**: http://39.103.68.205/

### 功能
- 评论回复系统（嵌套回复 + 回复计数）
- 评分趋势分析（评分分布 + 时间趋势）
- 用户举报系统（举报模型 + 审核流程）
- 食谱质量自动检查增强

---

## 迭代 #33 — A/UI/UX：详情页重设计+移动端+搜索增强 ✅
**Commit**: `b9f4f52` (2026-05-24)
**部署**: http://39.103.68.205/

### 功能
- 食谱详情页：步骤卡片化 + 浮动操作栏 + 营养图表优化
- 移动端：固定底部 TabBar（首页/搜索/创建/收藏/我的）
- 搜索：标签式筛选器 + 搜索历史 + 热门趋势 + 空结果优化
- 测试修复（210/210 全绿）

---

## 迭代 #34 — B/功能：视频教程+挑战赛+食材搜索+工具清单 ✅
**Commit**: `59d3e47` (2026-05-24)
**测试**: 161 后端 + 251 前端 全绿
**部署**: http://39.103.68.205/

### 功能
- 食谱视频教程支持（VideoEmbed 模型 + 视频URL嵌入 + 详情页播放器）
- 食谱挑战赛系统（Challenge 模型 + 挑战主题 + 用户投稿 + 投票评选）
- 智能食材搜索增强（POST /api/recipes/by-ingredients + 匹配推荐）
- 厨房工具清单（KitchenTool 模型 + 工具与食谱关联 + 用户工具库）

---

## 迭代 #35 — C/内容质量：标签+质量评分+浏览历史+导出 ✅
**Commit**: `fed00b7` (2026-05-25)
**部署**: http://39.103.68.205/

### 功能
- 食谱标签智能优化（标签探索页 + 热门标签统计 + 标签云展示）
- 食谱质量评分增强（多维度质量评分 + 详情页展示）
- 用户行为分析追踪（浏览历史记录 + 行为追踪）
- 食谱数据导出（导出菜单 + 打印优化）
- 列表/网格视图切换

---

## 迭代 #36 — A/UI/UX：新手引导+快捷键+首页刷新 ✅
**Commit**: `1827d10` (2026-05-25)
**测试**: 251/251 全绿
**部署**: http://39.103.68.205/

### 功能
- 首页 UI 刷新（季节性渐变 Hero slogan + 热门标签快捷入口）
- 全局快捷键系统（Ctrl+K 搜索、Ctrl+N 创建、Esc 关闭、? 帮助面板）
- 新手引导系统（WelcomeTour 6 步引导 + overlay + localStorage 持久化）
- 渐进式图片加载（ProgressiveImage 组件 + hash 色块占位 → 渐入过渡）
- 乐观 UI 更新（收藏操作先更新 UI → 失败回滚）

---

## 迭代 #37 — B/功能：收藏集增强+食材库存+营养追踪 ✅
**Commit**: `9dcfd05` (2026-05-25)
**部署**: http://39.103.68.205/

### 功能
- 收藏集增强（封面自动生成 + 公开浏览 + 排序筛选 + 评论互动）
- 食材库存管理（Pantry 模型 + CRUD + 批量操作 + 过期告警）
- 营养追踪仪表板（每日营养记录 + 统计 + 目标设置 + 饮食建议）

---

## 迭代 #38 — C/内容质量：SEO+管理后台+搜索优化 ✅
**Commit**: `3a182eb` (2026-05-25)
**部署**: http://39.103.68.205/

### 功能
- SEO 站点地图（sitemap.xml + robots.txt 动态生成）
- 管理后台质量报告 API
- 搜索质量优化（加权排序 + 描述匹配 + 拼写纠错）
- 用户活跃热力图（GET /api/users/:id/activity-heatmap + GitHub 风格组件）

---

## 迭代 #39 — A/UI/UX：RecipeCard升级+热力图+夏季主题 ✅
**Commit**: `43ad475` (2026-05-25)
**部署**: http://39.103.68.205/

### 功能
- RecipeCard 视觉升级（hover 微交互 + 收藏心跳动画 + 标签重排）
- 用户主页美化（热力图 + CountUp 数字滚动 + 成就徽章发光）
- 首页夏季主题（夏季渐变色调 + 时令食材推荐区）

---

## 迭代 #40 — B/功能：版本对比+烹饪分析+食材替换+购物优化 ✅
**Commit**: `65bdc19` (2026-05-25)
**测试**: 238/238 后端全绿
**部署**: http://39.103.68.205/

### 功能
- **食谱版本对比视图** — RecipeDiffPage：左右对比两个版本，变更字段高亮，从详情页历史入口跳转
- **烹饪数据分析仪表板** — CookingAnalyticsPage：频率折线图、最常做菜TOP10、食材使用频率、口味偏好雷达图、月度统计
- **智能食材替换引擎** — SubstitutionPanel：POST /api/recipes/:id/substitutions，支持过敏原/素食/低碳水筛选，详情页内嵌替换面板
- **购物清单优化** — 跨食谱食材智能合并，按类别分组，一键复制到剪贴板，价格估算

### 文件操作（17 文件，+2318/-21）
| 文件 | 操作 |
|------|------|
| `backend/routes/recipeversion.js` | 新建 |
| `backend/routes/cookingLog.js` | 大幅扩展（+148 行分析 API） |
| `backend/routes/recipes.js` | 修改（+66 行替换 API） |
| `backend/routes/shoppingList.js` | 大幅扩展（+184 行合并/分组 API） |
| `backend/routes/index.js` | 修改（注册新路由） |
| `frontend/src/components/SubstitutionPanel.tsx` + `.css` | 新建 |
| `frontend/src/pages/RecipeDiffPage.tsx` + `.css` | 新建 |
| `frontend/src/pages/CookingAnalyticsPage.tsx` + `.css` | 新建 |
| `frontend/src/pages/ShoppingListPage.tsx` + `.css` | 修改 |
| `frontend/src/pages/RecipeDetailPage.tsx` + `.css` | 修改（+替换面板入口） |
| `frontend/src/router/index.tsx` | 修改（+新路由） |
| `frontend/src/api.ts` | 修改（+45 行 API 函数） |

**下一个方向**: A (UI/UX)

---

## 迭代 #41 — A/UI/UX 全面体验优化 ✅
**Commit**: `0b28dc2` (2026-05-25)
**测试**: 前端构建成功
**部署**: http://39.103.68.205/

### 功能
- **暗色模式全面覆盖** — 16个CSS文件添加body.dark覆盖，涵盖HeroSection/ImageLightbox/StepTimer/ChallengesPage/ChallengeDetailPage/IngredientSearchPage/KitchenToolsPage/MyToolsPage/TagsPage/BrowsingHistory/ExportMenu/PWAInstallPrompt/SeasonalRecommendations/SimilarRecipes/SkipLink/VideoPlayer
- **骨架屏增强** — CookingAnalyticsPage/ChallengesPage/MealPlannerPage/CookingJournalPage 添加匹配页面结构的骨架加载状态
- **多步向导表单** — CreateRecipePage重构为4步向导（基本信息→食材清单→制作步骤→更多设置），实时验证+内联错误提示+草稿自动保存(localStorage,10s防抖)
- **移动端交互优化** — usePullToRefresh下拉刷新hook、搜索/步骤移动端CSS优化

### 文件操作（26文件，+1147/-202）
| 文件 | 操作 |
|------|------|
| `frontend/src/components/HeroSection.css` | 修改（暗色模式）|
| `frontend/src/components/ImageLightbox.css` | 重写（暗色模式+完整样式）|
| `frontend/src/components/PageTransition.css` | 修改 |
| `frontend/src/components/MobileBottomNav.css` | 修改 |
| `frontend/src/components/BrowsingHistory.css` | 修改 |
| `frontend/src/components/ExportMenu.css` | 修改 |
| `frontend/src/components/PWAInstallPrompt.css` | 修改 |
| `frontend/src/components/SeasonalRecommendations.css` | 修改 |
| `frontend/src/components/SimilarRecipes.css` | 修改 |
| `frontend/src/components/SkipLink.css` | 修改 |
| `frontend/src/components/StepTimer.css` | 修改 |
| `frontend/src/components/VideoPlayer.css` | 修改 |
| `frontend/src/pages/ChallengesPage.css` | 修改 |
| `frontend/src/pages/ChallengeDetailPage.css` | 修改 |
| `frontend/src/pages/IngredientSearchPage.css` | 修改 |
| `frontend/src/pages/KitchenToolsPage.css` | 修改 |
| `frontend/src/pages/MyToolsPage.css` | 修改 |
| `frontend/src/pages/TagsPage.css` | 修改 |
| `frontend/src/pages/ChallengesPage.tsx` | 修改（骨架屏）|
| `frontend/src/pages/CookingAnalyticsPage.tsx` | 修改（骨架屏）|
| `frontend/src/pages/MealPlannerPage.tsx` | 修改（骨架屏）|
| `frontend/src/pages/CookingJournalPage.tsx` | 修改（骨架屏）|
| `frontend/src/pages/CreateRecipePage.tsx` | 重构（多步向导+验证+草稿）|
| `frontend/src/pages/CreateRecipePage.css` | 修改（向导样式）|
| `frontend/src/hooks/usePullToRefresh.ts` | 新建 |
| `frontend/src/global.css` | 修改（移动端CSS）|

**下一个方向**: B（功能增强）

---

## 迭代 #42 — B/功能增强：批量操作+设置页+智能推荐+日志增强
**状态**: ⏳ QClaw 后台执行中 (Task ID: V7HRC2)
**派发时间**: 2026-05-25 10:07

### 功能
- **食谱批量操作增强** — 批量收藏/取消收藏 + 批量添加购物清单 + 批量导出
- **用户个人设置页面** — 分组卡片式布局（个人信息/饮食偏好/通知/隐私/安全）+ 数据导出
- **食谱收藏智能推荐** — 基于收藏历史个性化推荐 + 推荐理由 + 个性化 tab
- **烹饪日志增强** — 详情页时间线 + 搜索筛选 + 统计可视化增强

### 前置任务
- 部署闭环：推送 #41（0b28dc2）到服务器（当前停在 65bdc19）

**下一个方向**: C（内容质量）
