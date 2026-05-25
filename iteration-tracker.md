
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

---

## 迭代 #42 — B/功能增强：批量操作+设置页+智能推荐+日志增强 ✅
**Commit**: `3778234` (2026-05-25)
**测试**: 后端 + 前端构建通过
**部署**: http://39.103.68.205/

### 功能
- **食谱批量操作增强** — 批量收藏/取消收藏 + 批量添加购物清单 + 批量导出
- **用户个人设置页面** — 分组卡片式布局（个人信息/饮食偏好/通知/隐私/安全）+ 数据导出
- **食谱收藏智能推荐** — 基于收藏历史个性化推荐 + 推荐理由 + 个性化 tab
- **烹饪日志增强** — 详情页时间线 + 搜索筛选 + 统计可视化增强

**下一个方向**: C（内容质量）

---

## 迭代 #43 — C/内容质量：草稿系统+作者仪表板+审核队列 ✅
**Commit**: `ec7e24b` + `598c87b` (hotfix) + `48365ab` (fix) (2026-05-25)
**测试**: 28个新测试通过，后端266/266全绿
**部署**: ⏳ 待部署（服务器停在3778234，本地领先3个commit）

### 功能
- **草稿系统** — Draft模型 + 草稿CRUD + 定时发布 + 草稿列表页
- **作者仪表板** — 统计仪表板（5指标/30天趋势/评分分布/词云/热门排行）
- **审核队列** — 审核面板（批量操作/历史记录/评论精华/热门排行榜）
- **评论增强** — 评论图片支持 + 精华标记
- **管理员认证** — adminAuth中间件

**下一个方向**: A（UI/UX）

---

## 迭代 #44 — A/UI/UX：微交互+组件增强 ✅
**Commit**: `15e5ac9` + `2d2865d` (hotfix TDZ) (2026-05-25)
**测试**: 前端9/9 UX测试全绿

### 功能
- **Footer 组件** — 四栏响应式、暗色适配、社交链接
- **EmptyState 组件** — 弹入动画、紧凑模式、CTA按钮
- **全局微交互** — focus-visible 静默鼠标、btn 三变体 active scale(0.97)、输入框光晕、自定义滚动条、卡片 stagger 入场、Toast 堆叠
- **HomePage 集成** — 卡片渐入 + EmptyState 替换内联空状态
- **修复关键生产Bug** — api.ts `updateProfile` 重复声明导致 Rollup TDZ，主chunk从517KB→293KB，38 JS chunks 全部无TDZ

---

## 迭代 #45 — B/功能：通知系统 ✅
**Commit**: `23ba483` (2026-05-25)
**测试**: 后端 266/266 全绿
**部署**: commit推送 + scp dist + docker cp frontend + nginx reload

### 功能
- **Notification 模型重写** — actorId/targetId/targetType, type ENUM扩展为9类
- **PushSubscription 模型** — Web Push 端点到订阅映射
- **通知Helper重构** — 兼容新旧调用方式 + 非阻塞 Web Push
- **NotificationBell** — 铃铛+红色气泡(99+) + 下拉面板(5条+标记已读)
- **NotificationsPage** — 分页列表+类型筛选+已读切换+删除
- **Navbar集成** — 铃铛组件嵌入，路由注册/notifications

### 修复
- `favorites.js` line 200 位置参数→对象参数调用修复
- 容器名 **food-frontend/food-backend**（非 docker-compose 默认名）

---

## 迭代 #46 — C/内容质量：故事+文化背景+作者等级 ✅
**Commit**: `4ae5168` (2026-05-25)
**测试**: 后端266/266 ✅, 前端252/260 ✅ (8项预存失败)

### 功能
- **AuthorLevelBadge 组件** — 5级制等级(5积分公式子项)，支持compact/标准模式
- **RecipeDetailPage** — story/culturalBackground 可折叠区（accordion+键盘支持）
- **CreateRecipePage** — story/culturalBackground 输入区 + 草稿保存/恢复
- **RecipeCard** — 作者等级徽章(作者名旁)
- **UserProfilePage** — 等级展示+进度条+得分/下一等级
- **后端** — authorLevel.js 等级公式 + /api/users/:id/author-info 端点

### 修复
- AuthorLevelBadge props 解构修复（33项RecipeCard测试由FAIL→1项预存）

---

## 迭代 #47 — A/UI/UX：移动端体验增强 ✅
**Commit**: `de1b794` (2026-05-25 16:55)
**部署**: 生产双端200 ✅
**测试**: 前端252/260 ✅ (8项预存)

### 功能
- **MobileBottomNav 滚动隐藏/显示** — 下滚>100px隐藏导航，上滚恢复，`translateY(100%)`动画
- **手势导航修复** — `window.location.href`→`useNavigate()`，消除全页刷新
- **步骤滑动+箭头导航** — 触摸左/右滑切换食谱步骤 + 底部←/→按钮 + 步骤计数 + 自动滚入视图
- **搜索筛选移动端** — <480px水平滚动+sticky分类标签+32px触摸目标

**下一个方向**: B（功能增强）

---

## 迭代 #48 — B/功能增强：智能烹饪助手 ✅
**Commit**: `38cb1c5` (2026-05-25)
**测试**: 线上双端200验证通过

### 功能
- **useSpeechSynthesis hook** — Web Speech Synthesis API 封装，支持 speak/pause/resume/stop，自动检测浏览器支持
- **CookingModeOverlay（烹饪模式）** — 全屏专注烹饪视图
  - 大字体显示当前步骤 + 步骤编号徽章
  - 大 prev/next 圆形触摸按钮（≥48px）+ 手势左右滑动切换步骤
  - 步骤圆点指示器（可点击跳转）+ 进度条
  - 集成 StepTimer 计时器
  - 语音联动：进入模式自动朗读 → 播完自动进下一步
  - 暗色适配 + safe-area-inset
- **步骤语音朗读** — 非烹饪模式下每步独立"朗读"/"停止"按钮
- **RecipeDetailPage 集成** — "🍳 烹饪模式"启动按钮（渐变背景+阴影）

**下一个方向**: A（UI/UX 移动端体验深化）

---

## 迭代 #49 — A/UI/UX：样式修复+体验优化 ✅
**Commit**: `80cdcdc` (2026-05-25)
**部署**: 生产双端200 + 老chunk清理

### 修复
- **Footer 缺失** — 导入 Layout 函数，集成到路由布局中（之前组件存在但未渲染）
- **营养信息标题重复** — NutritionCard 自身 h2 与 RecipeDetailPage 外层 h2 重复，全部移除后仅 NutritionCard 内部渲染一次
- **导航栏移动端拥挤** — 将 7 个二级菜单项（挑战赛/工具库/标签/餐单计划/烹饪日志/对比/偏好）合并到"更多"下拉菜单（桌面端），移动端汉堡菜单内"更多功能"分隔区显示
- **RecipeCard 图片加载** — 添加 onError 回调，标记加载失败后显示 🍽️ 占位符

---

## #50 — 搜索与发现体验增强 ✅

| 类型 | 状态 | 时间 |
|------|------|------|
| 后端 | ✅ | 05-25 11:05 |
| 前端 | ✅ | 05-25 11:05 |
| 测试 | ✅ 10/10 | 05-25 11:05 |
| 部署 | ✅ | 05-25 11:10 |
| 验证 | ✅ 双端200 | 05-25 11:10 |

**后端改动**：
- 搜索范围扩展：categoryTags / tips / story / culturalBackground 字段加入 `[Op.or]`
- 搜索结果默认按相关性 CASE 权重排序（标题100 > 描述40 > 标签30 > 食材20 > tips/故事 > 背景10）
- 新增 `GET /api/recipes/suggestions` 轻量端点（title+description 匹配，6条上限，favoriteCount 排序）

**前端改动**：
- `api.ts`：新增 `getSuggestions(q)` 函数
- `SearchAutocomplete`：从 `searchRecipes` 改为 `getSuggestions`（更轻量，专用端点）
- RecipeCard highlightText 渲染保持不动（已存在）

**新测试**：`search_enhance.test.js`（10个用例，全绿）

**部署**：commit `ec5c1d7` → git push → 服务器 git pull → docker cp + backend restart

**注意事项**：
- routes/recipes.js 中 `/suggestions` 在 `/:id` 之前注册（Express 路由顺序）
- 服务器必须 git pull 到最新 commit 后 docker cp，否则容器文件未更新
