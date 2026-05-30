| #84 | 05-28 | 🟡 ui-optimization | 无特殊故障。SearchPage 多选分类需同步 URL params ↔ 本地状态 | 共享常量文件减少多组件硬编码；后端 Op.in 兼容数组参数；路由顺序需注意 |
| #86 | 05-28 | 🟢 feature | 13道国际食谱无评分；docker cp tar 含 Apple metadata 扩展属性 | fill_ratings.js 需国际专属评论映射（taggedComments）；tar 打包加了--no-xattrs 选项 |

| 迭代 | 日期 | 方向 | 核心根因 | 关键自优化建议 |
|------|------|------|----------|--------------|
| #59 | 05-25 | 🟢 feature | `req.user` 不存在（应为 `req.userId`），challenges.js 预存 Bug | md5sum 验证容器文件；docker cp 前先 rm clean；auth 中间件统一用 `req.userId` |
| #55 | 05-25 | 🔴 bugfix | 服务器 dist 未及时同步到容器 | 部署验证包含资源文件 HTTP 200 检查；docker cp 后双向验证 |
| #56 | 05-26 | 🟢 feature | Bilibili 搜索页面反爬 | BV 号周期性验证；fill_videos.js 设计成可扩展模式 |
| #57 | 05-26 | 🟢 feature | db 结构调研不足；docker cp 静默失败 | pipe 注入替代 docker cp；写脚本前先查 DB 确认数据量级 |
| #58 | 05-26 | 🎨 ui-opt | 容器用户权限不足；时区陷阱（UTC vs CST） | docker cp 优先于 pipe 注入；涉"当天"逻辑注意容器时区 |
| #60 | 05-26 | 🟢 content | Bilibili 412 反爬拦截 | 批量 Kimi WebBridge 搜索；缓存 BV 数据库为 JSON 配置 |
| #61 | 05-26 | 🎨 ui-opt | 历史代码债务；组件空状态缺失 | 空状态是体验基线；API 参数首次设计即规范化 |
| #62 | 05-26 | 🔴 bugfix | Unsplash 链接失效；SPA 缺少 scroll restoration | 用户反馈优先于新功能；所有路由切换考虑 scrollTo(0,0)；移动端检查按钮重叠 |


| 迭代 | 日期 | 方向 | 核心根因 | 关键自优化建议 |
|------|------|------|----------|--------------|
| #63 | 05-26 | 🟢 feature | 路由顺序：fork 路由需在 recipes 通配符前注册 | 路由顺序检查清单；端口映射确认 |
| #64 | 05-26 | 🟢 content | SQL 直更 vs seed 重跑；title 匹配精度 | DB 有数据时用 UPDATE；脚本匹配范围验证 |
| #65 | 05-26 | 🟡 ui-opt | 样式检查报告 | 自动化样式检查集成 CI |
| #67 | 05-26 | 🟢 content | Bilibili 反爬；video_embeds 无 updatedAt | Python+WebBridge；INSERT 只给 createdAt |
| #69 | 05-26 | 🔴 bugfix | Unsplash 链接失效；SPA scroll restoration | 用户反馈优先；路由切换 scrollTo(0,0) |
| #70 | 05-26 | 🟢 feature | docker cp vs pipe-inject 权限；内存搜索频率 | docker cp 优于 pipe-inject；小站内存 Map 即可 |
| #76 | 05-27 | 🔴 bugfix | 视频端点"假故障"：无数据≠Bug | 巡检选有数据样本；前端错误可视化 |
| #77 | 05-27 | 🟢 content | 聚合不一致可能是数据缺失非代码 Bug | 先验证数据再修代码；内容缺口 WebBridge 批量补 |
| #78 | 05-28 | 🔴 bugfix | mojibake 存储层问题；测试数据清理 | URL 参数统一入口处理；测试数据带 isTest 标记 |
| #79 | 05-28 | 🟢 feature | docker cp 时间戳不可靠；QClaw 编号混淆 | 部署验证内容级（grep bundle）；迭代编号显式声明 |
| #80 | 05-28 | 🟢 feature | 推荐缺少多样性；Jaccard 维度单一 | 多样性配额控制；多维度加权；推荐理由统一展示 |


---

## 遗留问题

- [ ] VAPID 密钥未配置，Web Push 推送静默跳过

## iter#81 — 移动端交互细节与触摸反馈优化 (2026-05-28)

### 关键陷阱
- **触摸事件与鼠标事件冲突**：长按菜单同时触发 click 事件，导致菜单闪现后立即跳转。需要在 long press 触发后阻止后续的 click 事件传播
- **CSS :active 在 iOS 上默认不生效**：iOS Safari 对非链接元素的 :active 样式需要额外设置 `-webkit-tap-highlight-color` 和 `touch-action: manipulation`
- **haptic feedback 兼容性**：navigator.vibrate 在 iOS 上不支持（静音模式），需要静默降级避免报错
- **下拉刷新与页面滚动冲突**：下拉手势可能误触发页面滚动，需要在 touchstart 时记录初始位置，在 touchmove 中判断是下拉还是页面滚动

### 修复方法
- **长按事件隔离**：useLongPress hook 中设置 `isLongPressed` 标志，在 click 事件中检测该标志，若为 true 则 `preventDefault()` 并阻止冒泡
- **iOS :active 兼容**：全局 CSS 添加 `-webkit-tap-highlight-color: transparent` + `touch-action: manipulation`，并为按钮/卡片显式添加 `:active` 伪类样式
- **haptic 静默降级**：hapticFeedback.ts 中先检测 `'vibrate' in navigator`，不支持时直接 return，不抛异常
- **下拉手势识别**：usePullToRefresh 中计算 `deltaY > 0 && scrollTop === 0`，仅在页面顶部且向下滑动时触发动画

### 自优化建议
- **交互模式沉淀**：将 useLongPress + tapFeedback + hapticFeedback 组合封装为统一的可复用交互工具包
- **设备能力检测前置**：在应用启动时检测 touch/vibration/keyboard 能力，写入 context 避免运行时重复检测
- **动画性能**：下拉刷新和按钮反馈动画统一使用 transform + opacity（GPU 加速），避免触发布局重排

### 遗留问题
- 无 🔴 待修复

---

## iter#83 — 食谱库多样性扩充（2026-05-28）

### 关键陷阱
- **seed.js 标题重复**：旧批次 seed 数据可能遗留同名食谱（如"印度烤饼"/"希腊沙拉"），新增后导致列表重复展示
- **pipe-inject EACCES**：大批量文件注入后未改权限，容器读取时崩溃进入 crash loop
- **UUID 冲突风险**：批量插入新食谱时手动指定 UUID 可能与现有记录冲突

### 修复方法
- **标题去重**：新增前 grep 检查 seed.js 是否已有同名 title，有则删除旧版保留新版
- **权限修复**：pipe-inject 后执行 `chmod a+r` 确保容器可读
- **UUID 生成**：新食谱使用 `DataTypes.UUIDV4` 自动生成，避免冲突

### 自优化建议
- **内容质量基线**：每道新食谱必须含 story/culturalBackground/tips/video，否则不发布
- **分类平衡监控**：建立分类分布检查脚本，当某分类占比 >50% 或 <2 道时自动告警
- **批量插入验证**：插入后立即 curl 验证 total 数、分类分布、videoCount

### 遗留问题
- 无 🔴 待修复

## #82 — 成就系统增强（2026-05-28）

| 方向 | 核心根因 | 关键自优化建议 |
|------|----------|--------------|
| 🟢 feature | 容器 pipe 注入的 EACCES 权限炸弹（`/app/routes/favorites.js` 因权限不可读导致容器 crash loop） | 1) 所有 pipe 注入必须后跟 `chmod a+r`；2) 容灾恢复：先 `docker stop` + `chmod -R a+r /app/` + `docker start` 修复 crash loop；3) 不可同时 pipe inject 大量文件再 restart，应逐个 inject+验证 |
| 🟢 feature | 成就进度需 API 返回未解锁状态+进度，前端无法仅从已解锁记录推断 | `getAllAchievementsWithProgress()` 返回所有成就定义的完整清单（含 unlocked/unlockedAt/progress/maxProgress），前端无需重复定义成就列表 |
| 🟢 feature | 成就检测引擎只有 hook 触发，无 retroactive scan | 成就仅对新行为起作用，已有数据不会回溯解锁（设计如此：event-driven 非 state-scanning） |

---

## 2026-05-28 🔴 紧急修复: RecipeDetailPage null guard (crash fix)

### 方向
- 🔴 bugfix（生产崩溃）

### 核心根因
- RecipeDetailPage.tsx 中 3 处  未使用 optional chaining 前置保护
-  在首次渲染时仍为 null（API 数据加载中）， 直接抛 TypeError
- 目标行: line 117 (), line 186 (), line 809 ()
- line 110 因已写为  逃过崩溃但仍需确认

### 修复方法
- 所有  访问前增加  至  级别:  → 
-  → 
-  → 

### 核心自优化建议
- **Optional chaining 是 React 18 开发的标准模式**: 任何从 API 异步加载的对象，在 JSX 中访问属性时必须使用  前置保护
- **classify 属性风险**: 在 useEffect 数据加载中设置状态前，渲染函数可能已在数据为 null 时执行
- **ESLint 规则**: 建议添加  规则，但较激进；更折中的做法是自定义 lint rule 检测  模式
- **Code Review checklist**: 对于每个新页面组件，检查所有从 API 响应解构的对象属性访问是否都有  保护
- **防御性模式**: 在靠近 API 调用的地方，将 null/undefined 状态统一转为空数组/空对象默认值，减少下游 guard 负担



---

## iter#85 — 评论图片上传与用户作品墙（2026-05-28）

### 关键陷阱
- **multipart 上传与 JSON body 混合**：POST /comments 原只接受 JSON，新增图片上传需支持 multipart/form-data，前端 axios 需切换 `Content-Type: multipart/form-data` 并去掉 `Content-Type` header 让浏览器自动设置 boundary
- **Multer 配置复用风险**：复用 avatar 上传配置可能导致文件大小/数量限制不合适（avatar 1 张 vs comment 最多 3 张）

### 修复方法
- **后端**：`upload.array('images', 3)` + `comment.imageUrls = JSON.stringify(req.files.map(...))`
- **前端**：`new FormData()` + `append('images', file)` + `append('content', ...)`，不手动设置 Content-Type
- **Lightbox 复用**：复用现有 ImageLightbox 组件展示评论图片，支持全屏查看和手势滑动

### 自优化建议
- **文件上传统一封装**：将 Multer 配置、文件过滤、大小检查封装为可复用中间件工厂，支持不同场景（avatar/comment/recipe cover）的差异化配置
- **图片 CDN/压缩**：当前存储在本地 uploads/ 目录，后续可接入云存储 + 自动压缩缩略图
- **用户作品墙数据聚合**：当前从 Comment 表筛选 imageUrls 非空记录，后续可独立 UserWork 模型 + 瀑布流布局

### 遗留问题
- 无 🔴 待修复

---

## 2026-05-29 迭代#89-#92 — 关注动态+排行榜重写+首页简化

### 关键陷阱
- **feed.js JOIN 查询性能**：Activity + Recipe + User 三表 JOIN，未加索引时大数据量可能慢；当前 LIMIT 20 安全
- **RankingsPage 浮点精度**：JavaScript 浮点计算 `#→数字` 显示异常，需 `toFixed(1)` 格式化
- **TDZ 崩溃根因**：循环依赖或变量提升问题，构建时不报错但运行时偶发；需检查 import 顺序和 const/let 使用
- **步骤图片 cover→contain**：`object-fit: cover` 会裁剪图片，`contain` 保证完整显示但可能留白，需配合 `background` 色过渡
- **HomePage 冗余 section**：迭代积累导致首页 section 过多，用户滚动疲劳；定期审视页面信息架构必要

### 修复方法
- **feed.js**：JOIN 查询 + 按时间倒序 + LIMIT 20，过滤当前用户自己活动
- **RankingsPage**：`Number(score).toFixed(1)` + 空值兜底 `|| 0`
- **TDZ**：检查循环依赖链，用动态 import 或调整模块加载顺序
- **Pagination 组件**：props 接收 currentPage/totalPages/onPageChange，7页面统一替换

### 遗留问题
- 无 🔴 待修复

---

## iter#95 — 暗色模式遗漏补全（2026-05-29）

### 关键陷阱
- **选择器约定冲突**：任务需求要求使用 `[data-theme="dark"]` 选择器，但实际代码使用 `body.dark` class。ThemeContext.tsx 执行 `body.classList.toggle('dark')`，不存在 data 属性。最终统一使用 `body.dark` 与现有代码一致
- **旧 .dark 选择器遗留**：TagCloud.css 和 QualityScoreModal.css 中有提交者早期试用 `[data-theme]` 模式时遗留的 `.dark .tag-xxx` 规则，约 15 条规则使用了废弃选择器。这些规则在 `body.dark` 模式下完全不生效
- **PRD vs 实际代码差异**：PRD 中部分选择器（如 `.recommend-card__fav`）的实际 class 名称可能与最新代码不同，需构建验证

### 修复方法
- **选择器迁移**：`.dark .xxx` → `body.dark .xxx`（保留旧选择器不动 + 追加新选择器是更安全的策略，但该仓库无其他 `.dark` 引用，直接原地替换即可）
- **CSS 变量优先**：所有硬编码颜色映射为 `--color-xxx` 变量，必要时使用 PRD 建议暗色深色值（如 `rgba(0,0,0,0.5)` → `rgba(0,0,0,0.7)`）
- **纵向追加**：不在文件中间插入 body.dark 块，统一追加在文件末尾，避免影响现有规则优先级

### 自优化建议
- **暗色模式覆盖率基线**：本次补全后覆盖率从约 75% 提升至约 86%，建议建立定期 CS-checklist
- **CSS 变量审计**：global.css 的 body.dark 块中的 `--color-bg-secondary` 是新增变量，确认没有组件在使用非标准变量名（如 `--text-primary`、`--accent-color`）
- **新文件暗色检查**：每次新增 CSS 文件时，应默认包含 body.dark 覆写块（模板化）

### 遗留问题
- 无 🔴 待修复

### 用户价值
- 暗色模式下高频页面不再有浅色区域刺眼
- 完整的暗色主题体验，夜间使用舒适度提升

### 关键陷阱
- **API 响应结构不一致**：前端 `recommendRecipes` 使用 `res.list`，但拦截器包装后实际为 `res.data.list`，导致食材推荐结果无法展示。根因是早期 API 未统一响应格式，部分端点直接返回数组，部分返回 `{code, data}` 包装
- **日期哈希算法选择**：每日推荐需要「同一天对所有用户返回同一道食谱，但每天不同」。简单 `date.getDate() % total` 在食谱数量变化时会导致同一天推荐突变。采用 `cyrb53` 哈希算法（基于日期字符串种子）保证稳定性
- **子专家超时加剧**：UI-designer 连续超时（5分钟限制），复杂多文件任务（后端路由+前端组件+页面集成）难以在限时内完成

### 修复方法
- **API 兼容性修复**：RecommendPage.tsx 中 `res.list` → `res.data?.list`，同时保留降级 `|| res.list` 兼容旧格式
- **日期哈希稳定算法**：`cyrb53(dateSeed) % candidates.length` 保证同一日期哈希值稳定，候选池变化时通过预排序降低跳变概率
- **管家任务拆分**：复杂功能拆分为独立子任务（CSS-only 2分钟搞定）或设置更长 timeout

### 自优化建议
- **API 响应格式统一审计**：定期 grep 所有 API 调用点，检查是否混用 `res.data.xxx` 和 `res.xxx` 两种模式
- **日期驱动功能测试**：涉及「每日/每周」切换的功能，测试时用固定日期 mock，避免时间敏感 bug
- **超时阈值分层**：UI 设计任务 5 分钟，全栈实现任务 10 分钟，复杂跨端功能 15 分钟

### 遗留问题
- 无 🔴 待修复

---

## 2026-05-30 迭代#96 — 食谱收藏备注功能

### 关键陷阱
- **TypeScript state 声明遗漏**：RecipeDetailPage 新增 `isNoteModalOpen`/`noteRecipeId` state 但未在组件顶部声明类型，导致构建报错。根因是修改现有组件时只添加了 JSX 中的使用，忘记在 state 初始化区声明
- **Modal 层级冲突**：FavoriteNoteModal 默认渲染在父组件内部，z-index 被父级 overflow:hidden 裁剪。根因是未使用 portal 挂载到 body
- **API 路径与前端调用不一致**：后端路由为 `PUT /api/favorites/:recipeId/note`，但前端 api.ts 中写成了 `/favorites/note/:recipeId`，导致 404

### 修复方法
- **state 声明补全**：在 RecipeDetailPage 组件顶部补充 `const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)` 和 `const [noteRecipeId, setNoteRecipeId] = useState<string | null>(null)`
- **Portal 挂载**：使用 `ReactDOM.createPortal` 将 Modal 挂载到 `document.body`，脱离父级层叠上下文
- **API 路径对齐**：统一为 `/favorites/:recipeId/note`，前后端保持一致

### 遗留问题
- 无 🔴 待修复

### 自优化建议
- **新增 state 检查清单**：修改现有组件添加新功能时，grep 检查 `useState` 声明区和 JSX 使用区是否匹配
- **Modal 组件模板化**：所有弹窗组件统一使用 Portal + body 挂载，避免层级问题
- **API 契约先行**：前后端同时开发时，先定义 api.ts 中的接口签名，再分别实现

