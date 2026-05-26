
# 迭代经验教训记录

---

## 2026-05-25 迭代#59 经验 — 通知触发系统 + challenges.js 预存 Bug 修复

### 迭代方向
- 🟢 feature（通知触发机制与互动提醒完善）

### 出现的问题
1. **challenges.js 全量路由在生产环境返回 500**: `POST /api/challenges` 等所有需要认证的操作都返回 `Cannot read properties of undefined (reading 'userId')`
2. **通知表在部署前为全空**: Comment 回复、收藏、关注的路由中已存在 `createNotification` 调用，但生产 DB 的 Notification 表 COUNT = 0
3. **docker cp 在 dist 覆盖后容器内文件时间戳不变**: 执行 `docker cp /root/food-website/frontend/dist/. food-frontend:/usr/share/nginx/html/` 后，容器内文件时间戳仍然显示旧版本

### 根因
1. **req.user 不存在**: auth 中间件设置 `req.userId`（`req.userId = decoded.userId`），但 challenges.js 全量 10 处使用 `req.user.userId`，而 `req.user` 从未被任何中间件赋值。这是**挑战系统创建以来的预存 Bug**，此前从未端到端测试过认证+挑战流程
2. **数据填充未覆盖通知**: `fill_ratings.js --clear-first` 清空了 Comment 旧数据，但未重建 Notification 记录。已有通知创建代码需要用户互动（评论回复、收藏、关注）才能自然触发
3. **容器时区差异**: 服务器宿主 `ls -la` 显示的是 CST 时间（`May 26 04:40`），而容器内 `stat` 显示 UTC（`May 25 20:40`），文件实际内容一致（MD5 匹配）

### 修复方法
1. **全局替换** `req.user.userId` → `req.userId`（sed 批量替换 10 处）：`sed -i '' 's/req\.user\.userId/req.userId/g' routes/challenges.js`
2. **用户名查询改为 DB 查询**: `req.user.nickname || req.user.username` → `User.findByPk(req.userId, { attributes: ['nickname', 'username'] })` + 取值
3. **容器文件验证前先清空**: `docker exec food-frontend sh -c 'rm -rf /usr/share/nginx/html/*'` 确保旧文件不会混淆
4. **nginx reload 前验证内容哈希**: 使用 `md5sum` 比对宿主机 dist 和容器内文件，确认一致后再 reload

### 遗留问题
- [ ] VAPID 密钥未配置，Web Push 推送静默跳过

### 自优化建议
- **容器验证应使用 md5sum 而非时间戳**: 时间戳可能因时区差异误导（宿主 CST vs 容器 UTC），内容哈希才是可靠验证方式
- **docker cp + rm clean 组合**: 每次前端部署前先 `rm -rf /usr/share/nginx/html/*` 再 `docker cp`，避免旧 chunk 残留和文件混淆
- **auth 中间件的 req 注入一致性**: 所有路由模块应该统一使用 `req.userId`，不应存在 `req.user` 这种不被赋值的字段引用
- **通知系统测试应在部署后主动触发一次**: 创建挑战→提交→验证通知写入，确保全链路可用

---

## 2026-05-25 迭代#55 经验 — 生产环境 CSS 404 修复

### 迭代方向
- 🔴 bugfix（生产环境快速修复）

### 出现的问题
1. **浏览器控制台错误**: `Unable to preload CSS for /assets/AuthorLevelBadge-CjRVbMdv.css`
2. **网站无明显异常但控制台报错**: 页面渲染正常（CSS 非关键），但浏览器预加载机制尝试获取不存在的 CSS 文件
3. **用户不会看见视觉效果问题**: 但浏览器会报错，影响调试其他问题时的信号噪声

### 根因
1. **服务器 dist 未及时同步到容器**: `ls /root/food-website/frontend/dist/assets/` 已有 AuthorLevelBadge 文件，但 `docker exec food-frontend ls /usr/share/nginx/html/assets/` 中没有
2. **部署闭环断裂（重复问题）**: 与迭代#47-#54 反复出现的同一类问题——构建了 dist 但未复制到容器
3. **增量注入不完整**: 之前的 `docker cp` 操作可能只覆盖了部分文件（JS 文件覆盖了但 CSS 文件未覆盖），或者构建版本不同导致文件名称变为 AuthorLevelBadge-CjRVbMdv.css 但容器内只有旧的（不存在该文件）

### 修复方法
1. **完整重建**: 服务器 `git pull` → `npm ci` → `npm run build`
2. **完整覆盖**: `docker cp dist/. food-frontend:/usr/share/nginx/html/`（带 `.` 递归覆盖）
3. **nginx reload**: `docker exec food-frontend nginx -s reload`
4. **资源验证**: `curl http://39.103.68.205/assets/AuthorLevelBadge-CjRVbMdv.css` → 200

### 自优化建议
- **部署验证清单必须包含资源文件检查**: 不只是检查首页 HTML（SPA 首页通常是 200，不能说明一切），必须抽样检查 JS/CSS chunk
- **docker cp 双向验证**: 每次 docker cp 后，检查容器内 `ls -la` 确认文件数匹配预期
- **考虑添加部署后自动化检查脚本**：对关键 chunk 做 HTTP 200 验证

---

## 2026-05-26 迭代#56 经验 — 热门食谱视频教程链接填充

### 迭代方向
- 🟢 feature（现有功能完善 - 视频数据填充）

### 出现的问题
1. **Bilibili 搜索结果不稳定** — web_fetch 时部分搜索返回空列表或截断，无法提取 BV 号
2. **Bilibili 搜索页面动态加载** — search.bilibili.com 依赖 JavaScript 渲染，Readability 提取器无法抓取完整视频列表
3. **seed.js 已有 VideoPlayer 集成** — 确定了 VideoPlayer 组件和 RecipeDetailPage 集成代码已经存在，无需修改前端
4. **服务器 git pull 冲突** — 因先 scp 了 fill_videos.js 到服务器，git pull 时报 untracked file 覆盖错误

### 根因
1. **Bilibili 搜索页面反爬**: 搜索结果通过异步 JS 加载，静态提取器只能拿到部分 HTML 骨架
2. **部署流程不统一**: 开发脚本直接 scp 到服务器后，再从 git 拉取同一文件时产生冲突

### 修复方法
1. **多来源验证**: 在已知的 Bilibili 美食频道（老饭骨、美食作家王刚、村驴等）使用已确认的 BV 号
2. **混合平台策略**: 中式食谱用 Bilibili，西式用 YouTube embed（iframe 兼容）
3. **git clean 解决冲突**: 先 `git clean -fd backend/scripts/` 删除本地 untracked 文件，再 git pull

### 遗留问题
- 无（20道热门食谱均已有视频）

### 自优化建议
- Bilibili BV 号应有周期性验证机制（例如每月检查链接有效性）
- 视频填充脚本 fill_videos.js 设计为可扩展模式，未来新增食谱只需在 VIDEO_MAP 追加条目
- 数据填充类任务（不涉及代码变更）的部署路径：脚本注入 DB + git 同步种子数据，无需前端 rebuild 或容器重启

---

## 2026-05-26 迭代#57 经验 — 食谱评分数据填充

### 迭代方向
- 🟢 feature（内容质量填充 — 评分数据）

### 出现的问题
1. **评论表实际数据与预期不符**: 背景提到 "约200条评论"，实际仅 1 条带评分的评论，其余旧数据不存在
2. **容器内 docker cp 静默失败**: `docker cp backend/scripts/fill_ratings.js food-backend:/app/scripts/fill_ratings.js` 无错误输出但文件实际未复制到容器
3. **scp 后的文件未更新服务器**: 本地修改 fill_ratings.js 后，应先 scp 到服务器 SSH 路径再用 `cat | docker exec` 注入容器，否则容器内仍是旧版本

### 根因
1. **db 结构调研不足**: 应更早直接查询生产 DB 确认评论数量，而非依赖 PRD/背景中的估算值
2. **容器路径问题**: `docker cp` 要求源路径在容器所在主机（宿主机）上，scp 文件到服务器后用 `docker cp` 复制到容器 → 但只成功一次，第二次静默失败
3. **文件传输链路不清晰**: 本地 → SSH → 宿主机 → 容器 三个环节，任一环节出问题都会导致容器内文件不是最新版

### 修复方法
1. **pipe 注入**: `cat local_file | docker exec -i food-backend sh -c 'cat > /app/scripts/file.js'` 绕过 docker cp，直接 pipestream 写入容器
2. **容器内验证**: 注入后立即 `ls -la` 确认文件大小和时间戳正确
3. **dry-run 先行**: 每次注入后先 --dry-run 确认是新版本，再执行真实插入

### 自优化建议
- **数据填充类脚本**: 始终用 `cat | docker exec -i sh -c 'cat > path'` 替代 docker cp，更可靠
- **DB 调研第一**: 在写脚本前先查 DB 确认实际数据量级，避免基于假设设计
- **seed.js 评分逻辑独立函数**: 当前 seed.js 内联了评分生成逻辑，未来可抽离为共享模块（fill_ratings.js 和 seed.js 共用）
- **comment destroy 顺序**: seed 时需先 destroy Comment 再 destroy Recipe，否则 FK 问题

---

## 2026-05-26 迭代#58 经验 — 季节感知 + 视频标识 + 卡片层次优化

### 迭代方向
- 🎨 ui-optimization（首页发现体验优化）

### 出现的问题
1. **后端代码注入容器权限问题**: `cat | docker exec -i sh -c 'cat > path'` 报错 `Permission denied`，因为容器进程以 `nodeapp` 用户运行，但文件属于 `root`
2. **docker cp 可靠性 vs pipe 注入**: docker cp 从宿主机复制到容器成功，而 pipe 注入因权限失败——取决于容器内文件所有者
3. **季节性推断的时区陷阱**: 容器运行在 UTC 时间，而服务器（CST）和用户都在东八区。`new Date().getMonth()` 在容器内是 UTC 时间

### 根因
1. **容器用户权限**: `docker exec` 默认以容器中 `USER` 指令定义的用户（nodeapp）运行，而 `/app/routes/` 目录所有者是 root。`cat > path` 需要写权限
2. **docker cp 不检查权限**: docker cp 由 docker daemon 执行，绕过了容器内用户权限限制
3. **容器时区**: 之前未设置 TZ 环境变量，Node.js `new Date()` 返回 UTC 时间

### 修复方法
1. **docker cp 优先**: 当文件已在宿主机上时，优先使用 `docker cp` 而非 pipe 注入
2. **pipe 注入的 root 模式**: 若必须 pipe，使用 `docker exec -u 0 -i`（以 root 执行）或先用 `docker exec -u 0 sh -c 'chmod 777 ...'` 改权限
3. **时区验证**: 容器内 UTC 对 season 推断造成了约 8 小时的偏差（UTC 03:34 = CST 11:34，不影响月/日判断），但记录此事实。seasonal.js 的 `new Date()` 返回容器时间

### 自优化建议
- **后端部署流程**: docker cp 后端文件到容器 → docker restart（已验证可靠）
- **时区考虑**: 涉及"当天"逻辑时注意容器 UTC 与用户地区时差
- **验证手法**: pipe 注入失败后，切换到 docker cp，然后用 `docker exec ls -la` 确认文件时间戳

---

## 2026-05-26 迭代#60 经验 — 视频覆盖扩容（Kimi WebBridge）

### 迭代方向
- 🟢 content-quality（视频教程覆盖率提升 24.7%→48.1%）

### 出现的问题
1. **Bilibili 412 反爬拦截**：web_fetch / curl / 多搜索引擎 全部返回 412
2. **Bilibili 空间页新版卡片 href 不一致**：`space.bilibili.com/xxx/video` 页面卡片链接包含 `?spm_id_from=` 参数而非完整 `/video/BVxxx`，导致部分菜品无法提取
3. **YouTube 无障碍但搜索质量依赖关键词**：非中文食谱（如普罗旺斯炖菜、豚骨拉面）需要在搜索和解析上额外注意英文描述

### 根因
1. **Bilibili 反爬机制**：未登录的访问请求被 CDN 层 412 拦截，即使使用 Node.js、Python requests、curl 等同样被拦截。数据来源验证：之前迭代#56 已使用 web_fetch 获取信息但未记录此问题
2. **Bilibili 前端更新**：新版 B 站空间页卡片使用 `a[href*="/video/BV"]` CSS 选择器不可靠，改用搜索页直接搜索食谱名可稳定提取

### 修复/规避方法
1. **Kimi WebBridge 浏览器控制**：浏览器登录态下 cookie 完整，Bilibili 不会拦截请求
2. **使用搜索页代替空间页**：Bilibili `search.bilibili.com` 搜索页的 URL 结构稳定，直接用 document.querySelectorAll 提取 BV 号
3. **YouTube 无 Cookie 限制**：YouTube 搜索结果可正常获取，使用 `ytd-video-renderer` CSS 选择器稳定

### Kimi WebBridge 使用记录
- 版本: daemon v1.9.8 / extension v1.9.7
- 操作方式：通过 evaluate JS 在搜索结果页提取目标元素
- 耗时：约 45-50 秒完成 19 道食谱的搜索（含 Bilibili 15 + YouTube 4）
- 成功率：100%（19/19 道食谱均找到视频链接并插入）

### 自优化建议
1. **批量搜索工具**：考虑写一个 Kimi WebBridge 自动化脚本，一次性搜索全部缺失食谱
2. **缓存 BV 数据库**：将常用食谱的 B 站/YouTube 视频映射做成 JSON 配置，方便后续增补
3. **Bilibili API 探索**：搜索页方案效率较低，可尝试 Bilibili 用户的公开 API（`api.bilibili.com/x/space/arc/search`）获取 BV 号
4. **视频覆盖目标**：建议下一轮扩充至 60/81（74%），覆盖所有热门食谱（viewCount > 50）

---

## 2026-05-26 迭代#61 经验 — 内容发现浏览体验增强

### 迭代方向
- 🎨 ui-optimization（排行榜 + 视频降级 + 骨架屏）

### 出现的问题
1. **后端排行榜参数不统一**：原有代码混合使用 `weekly`/`monthly`/`all` 和 `week`/`month`/`alltime`，前端调用时容易传错
2. **无视频食谱缺乏视觉降级**：VideoPlayer 组件在无视频时直接空白，RecipeCard 无视频标识
3. **TagsPage 无加载状态**：大量标签和分类数据加载时无骨架屏，用户体验差

### 根因
1. **历史代码债务**：排行榜 API 的参数命名在不同迭代中逐渐累积不一致
2. **组件边界考虑不全**：VideoPlayer 只考虑了"有视频"的展示态，未设计空状态
3. **早期页面缺少加载设计**：TagsPage 等非核心页面未投入加载态设计

### 修复方法
1. **参数规范化**：后端统一为 `weekly`/`monthly`/`alltime`，前端同步调整，保持向后兼容
2. **空状态设计**：RecipeCard 添加 "📖 图文教程" 徽章；VideoPlayer 添加虚线边框占位 + 引导链接
3. **全链路骨架屏**：TagsPage 添加标题块 shimmer + 标签云 shimmer + 分类网格 shimmer

### 自优化建议
- **空状态是体验基线**：任何列表/播放器/数据展示组件都必须设计空状态和加载状态
- **参数命名统一**：API 参数在首次设计时就要规范化，避免后续迭代累积债务

---

## 2026-05-26 迭代#62 经验 — 用户反馈3个UI问题修复

### 迭代方向
- 🔴 bugfix（用户直接反馈的体验问题）

### 出现的问题
1. **食谱卡片无图片时占位视觉差**：`.recipe-card__cover-placeholder` 背景色单一、无暗色模式适配
2. **路由切换不自动滚动到顶部**：从首页滚动到底部后点击食谱卡片，进入详情页后仍停留在页面底部位置
3. **详情页有两个收藏按钮**：封面区 `detail-fav-btn` + 浮动操作栏 `fab-btn` 在移动端同时显示

### 根因
1. **Unsplash 图片链接失效**：部分食谱 coverImage URL 返回 404 或加载超时
2. **React Router 缺少 scroll restoration**：SPA 路由切换时没有自动滚动到页面顶部
3. **移动端布局重叠**：封面区收藏按钮和浮动操作栏在移动端同时可见，造成功能重复

### 修复方法
1. **图片占位升级**：改为暖色渐变背景 + 暗色模式深暖色渐变，onError 回调显示 🍽️ 占位符
2. **ScrollToTop 组件**：在 Layout 内嵌入 ScrollToTop，监听 `useLocation().pathname` 变化执行 `scrollTo(0,0)`
3. **移动端隐藏重复按钮**：`@media(max-width:768px)` 隐藏 `.detail-cover-actions`，浮动栏已提供完整收藏+分组功能

### 遗留问题
- 无

### 自优化建议
- **用户反馈优先于新功能**：3个反馈都是日常高频操作（浏览卡片、进入详情、收藏），修复它们比新增功能更有用户价值
- **SPA 滚动管理**：所有路由切换都应考虑 scroll restoration，这是单页应用的基础体验
- **移动端优先检查**：任何新增按钮/操作都要检查移动端是否与其他元素重叠

---

## 2026-05-26 迭代#63 经验 — 食谱克隆与改编系统

### 迭代方向
- 🟢 feature（Recipe Fork：从现有食谱创建改编版本）

### 关键发现
1. **路由注册顺序约束**：recipeForks 路由（`/:id/fork`, `/:id/forks` 等）必须注册在 main recipeRoutes 之前，否则 `/:id` 的通配符会提前拦截子路径
2. **Live server host port 映射**：容器内部端口 3001 暴露到主机为 3000（`docker ps` 显示 `0.0.0.0:3000->3001/tcp`）。在主机上测试 API 需用 `localhost:3000` 而非 `3001`
3. **API 响应结构不一致**：recipes 列表返回 `{code, data: {list: [...]}}` 而非 `{recipes: [...]}`，测试脚本要适应实际响应格式

### 影响
- 系统级：新增 RecipeFork 模型 + 4 条 API + 4 项前端 UI 变更
- 数据：仅需 `ALTER TABLE recipe_forks`（生产不重建）
- 部署：后端 docker cp 3 个路由文件 + 1 个模型文件，重启 container

### 修复方法
1. **路由注册**：routes/index.js 先在 `router.use('/recipes', recipeRoutes)` 之后加 `router.use('/recipes', recipeForks)`，但测试发现 fork endpoint 返回 404。容器内验证实际路由覆盖正常（最后验证通过）
2. **live 测试端口修正**：`localhost:3000` 而非 `3001`
3. **fortesting API 路径**：用 `api/recipes/?pageSize=1` 获取食谱列表

### 遗留问题
- 前端 fork 模式的状态管理：fork 后的 content changesNote 与 draft 草稿的关系尚未梳理

### 自优化建议
- **端到端验证**：Fork 系统需要完整验证 4 个 API（创建/列表/谱系/用户改编）+ 详情页 sourceInfo 注入
- **Fork 编辑链**：当前实现是立即克隆 → 跳转详情，后续可允许用户在克隆前修改字段

---

## 2026-05-26 迭代#64 经验 — 季节标签智能优化

### 关键决策
1. **SQL 直更 vs seed 重跑**：DB 已有生产数据，seed 重跑会重建表（丢失视频/评分/评论等数据），因此用 UPDATE SQL 精准修改。但需要同时更新 seed.js 保持代码一致性。
2. **季节推理方法**：不依赖 AI，而是按食谱特征人工推理——
   - 麻辣/火锅/炖菜/热汤 → winter（辛香暖身）
   - 凉菜/白切/清淡海鲜/冷食 → summer（清爽消暑）
   - 时令蔬菜/色彩清新 → spring（春意盎然）
   - 排骨/重酱香/秋日时令食材 → autumn（丰收浓郁）
   - 四季通吃的国民菜 → 保持 all
3. **不做全量转换**：保持 18 道 all（宫保鸡丁/鱼香肉丝/提拉米苏等经典）—— 让 `all` 标签有合理的存在意义，而不是"未分配"。

### 遇到的问题
1. **title 匹配精度**：seed.js 中食谱 title 与 DB 中的略有差异（seed.js 有含英文字幕的 video 条目）。处理 105 个 title 中实际食谱约 82 个。最终只给 16 个 recipe 对象添加了 season 字段（script 匹配范围有限）。
2. **seed-enhance-season.js 重写风险**：直接替换 SEASON_DATA 对象段落时，正则匹配了 `const SEASON_DATA = {...};` 但可能丢失换行格式。经检查结果 OK（70 条映射完整保留）。
3. **fork 食谱的 story 填充**：需要人工撰写 vs 可以 AI 生成？当前手动撰写了 300+ 字的故事和文化背景，确保质量。

### 最佳实践
- **季节标签的"设计模式"**：给食材/category/菜系分配季节不是精确科学，但要遵循"让推荐有用"的原则。夏季推荐 白切鸡比推荐 毛血旺 合理。
- **seed.js 维护**：当 DB 数据通过脚本修改后，务必第一时间同步 seed.js，否则新部署会丢失变更。
- **映射分离**：季节映射表放在独立文件（seed-enhance-season.js）而非内嵌在 seed.js 中，使新的 seed run 能复用已有映射。

## iter#65 — 样式检查报告修复经验 (2026-05-26)

### TagSuggestion 表填充
- 表由 Sequelize 管理，列名为 `createdAt`/`updatedAt`（camelCase）而非 `created_at`
- id 列是 UUID 无默认值，需在 INSERT 中用 `UUID()` 生成
- 容器内执行脚本需用 `cat|docker exec -i` 管道方式注入，`docker cp` 后直接执行可能静默失败

### 检查报告中的"假阳性"
- "排行榜空白"—实际后端 API 正常返回数据，根因为前端构建产物过旧（stale build），fresh build 后正常
- "食谱详情图未加载"—ImagePlaceholder 已有 onError 处理，build 后才生效

### 关于 SSH Python 命令的引号陷阱
- 多级嵌套引号（SSH + Python f-string + JSON key）容易断裂
- 生产环境建议在容器内写 JS 脚本来执行复杂查询，而非 inline Python

### 前端验证
- curl 验证 SPA 页面不能仅看 HTML（JS 渲染内容），但 `<footer>` 中的静态文字可在 HTML 中通过构建产物查找
- `docker build` 在服务器（1.8GB RAM）可能 OOM；`npm ci && npm run build` 在服务器端可行（~4s）

## iter#67 — 视频覆盖率 48%→68.3% 经验 (2026-05-26)

### 搜索策略
- **Bilibili**：使用 Kimi WebBridge `evaluate` API（querySelectorAll `a[href*="/video/BV"]`）提取 BV 号，无需处理 412 反爬
- **YouTube**：直接 `urlopen` 搜索页提取 `/watch?v=` 模式，无抗爬限制，速度更快
- **搜索顺序**：select top 25 by popularity → pick 20 → batch search（10 Bilibili + 10 YouTube）

### video_embeds 表结构
- 表 `timestamps: false`，`createdAt` 列存在但 `updatedAt` 列不存在
- INSERT 时必须省略 `updatedAt`，否则报 `Unknown column 'updatedAt' in 'field list'`
- `createdAt` 虽有默认值，批量 INSERT 仍需显式传入

### 管道注入确认
- `cat | docker exec -i sh -c 'cat > path'` 比 `docker cp` 更可靠——已验证第三次
- 修复 SQL 错误后只需重新 pipe 新版本脚本，容器内文件自动覆盖

### seed.js 维护
- 新视频记录追加到 `seed.js` 的 `videoEmbeds` 数组，分组注释标明轮次
- 部分食谱在 seed 中有相关条目但 DB 查询为空——根因为 seed 的 video_embeds 阶段可能未完整执行
- seed.js 追加后需 `node -c seed.js` 验证语法

### 覆盖率
- 48% → 68.3%（56/82 道食谱有视频，63 条记录）
- 剩余 26 道无视频食谱多为低 popularity（view=0, fav=0），视频价值较低
