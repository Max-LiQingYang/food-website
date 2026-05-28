# 迭代经验教训记录

---

## 历史迭代摘要（#55-#62 压缩记录）

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

---

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

---

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

---

## iter#69 — 修复11张404封面图+图片降级优化 (2026-05-26)

### 迭代方向
- 🟡 ui-optimization（图片加载体验修复）

### 出现的问题
1. **11 道食谱封面图返回 404**：水煮鱼/班尼迪克蛋/鱼香肉丝/麻婆豆腐/章鱼小丸子/蒜蓉粉丝蒸扇贝/西红柿炒鸡蛋/红烧肉/东坡肉/酸菜鱼 等封面 URL 失效
2. **图片降级体验粗糙**：onError fallback 为纯色背景 + 🍽️ emoji，无过渡动画，视觉突兀
3. **构建产生 CSS syntax warnings**：SearchPage.css 中有 Unexpected "/" 和 "}" 语法问题

### 根因
1. **Unsplash 图片链接不稳定**：部分 Unsplash URL 因作者删除或 CDN 调整返回 404
2. **ImagePlaceholder 组件设计简陋**：仅支持纯色背景 + emoji，无 shimmer/渐变过渡
3. **CSS 语法不严谨**：注释格式或多余符号导致 Vite 构建 warnings

### 修复方法
1. **DB 替换封面 URL**：11 张失效图替换为同题材可用 Unsplash 图片
2. **seed.js 同步更新**：红烧肉、麻婆豆腐封面同步修改
3. **ImagePlaceholder 升级**：支持 `fallbackText` 显示食谱名；新增 shimmer 脉冲过渡动画；加载使用 blur-in 效果替代纯 opacity
4. **CSS 修复**：修复 SearchPage.css syntax warnings，构建 0 warnings

### 验证结果
- 0 CSS warnings（仅 chunk 容量提示）
- 所有 11 张替换图返回 200 ✅
- 1.10s build → clean scp → docker cp → nginx reload
- 已清理容器 assets/*.map

### 自优化建议
- **Unsplash URL 应定期巡检**：建议每月检查封面图有效性，批量替换失效链接
- **ImagePlaceholder 设计模式**：图片加载组件应包含 shimmer → blur-in → 完整图的渐进过渡
- **构建 0 warnings 是基线**：任何 warnings 都应在迭代中修复，防止信号噪声积累

---

## iter#70 — 搜索体验增强 (2026-05-26)

### 部署决策
- **后端文件写入**：`docker cp /tmp/file container:/app/path/` 优于 `cat|docker exec -i sh -c 'cat > path'`（避免容器内非 root 用户的写入权限问题）
- **内存搜索频率 vs DB 持久化**：小规模站点用内存 Map 即可（≤100 条，1h TTL），无需 DB 写操作浪费 IO。重启后丢失但冷启动后会重新积累
- **静态 fallback**：API 不可用时必须有降级体验（硬编码 4 条常见搜索词展示）

---

## 遗留问题

- [ ] VAPID 密钥未配置，Web Push 推送静默跳过

---

## iter#76 — 视频端点"假故障"排查 (2026-05-27)

### 关键陷阱
- **误报比真 bug 更危险**：巡检时用水煮鱼（改编）UUID 测试 /videos，返回空 → 误判为端点故障
- 根因：该食谱 videoCount=0（无视频），端点返回空是正确行为
- 真正有视频的食谱（如"水煮鱼"）端点返回正常

### 修复方法
- VideoPlayer.tsx: 区分 API 错误（网络/500）与空结果（无视频），错误时显示 ⚠️ 而非空白
- videos.js: 添加 debug 日志，便于快速定位是"无数据"还是"查询失败"

### 自优化建议
- **巡检用例必须选有数据的样本**：测试 /videos 前先从列表页取 videoCount>0 的 recipeId
- **前端错误状态需可视化**：静默失败 → 用户困惑 → 误报 bug；明确提示 → 用户理解 → 减少误报
- **API 端点返回空数组 ≠ Bug**：需结合业务语义判断，空结果是合法状态


---

## iter#77 — 视频覆盖率 82.9%→98.8% (2026-05-27)

### 关键陷阱
- **"聚合不一致"可能是数据缺失，而非代码 Bug**：逐道 API 验证后发现 videoCount=0 的食谱确实没有视频记录，是内容缺口而非查询逻辑错误
- 列表查询 COUNT 聚合与独立 /videos 端点行为一致，问题在数据层不在代码层

### 修复方法
- Kimi WebBridge 批量搜索 Bilibili `{食谱名}做法教程` → 提取 BV 号
- 容器内 pipe-inject 执行 Sequelize 插入脚本，13/14 成功（跳过 fork 版本）
- 逐条验证 `/api/recipes/{id}/videos` 返回 total>0

### 自优化建议
- **先验证数据再修代码**：遇到"聚合不一致"时，先排除数据缺失再动查询逻辑
- **内容缺口优先自动化填充**：视频/图片/故事等缺失内容可用 WebBridge + 脚本批量补充
- **fork 食谱可继承原食谱视频**：克隆版本的 videoCount 可通过谱系查询关联原始食谱视频

---

## iter#78 — 搜索编码修复与测试数据清理 (2026-05-28)

### 关键陷阱
- **mojibake 不是传输层问题，是存储层问题**：前端 URL 编码 → Express 正常解码为 UTF-8，但 `trackSearch()` 在某种路径下（可能是重复 URL 编码或中间件处理）将 UTF-8 字节误解码为 Latin-1，导致存入内存 Map 的键为乱码
- **测试数据清理必须用 SQL**：Sequelize `destroy({ truncate: true })` 不会重置自增 ID，且可能有外键约束；直接 `DELETE FROM challenges WHERE title LIKE '%测试%'` 更干净

### 修复方法
- `fixMojibake(str)`：检测 Latin-1 特征字节序列，用 `Buffer.from(str, 'latin1').toString('utf8')` 重新解码
- `trackSearch()`：归一化输入后检查是否存在 mojibake 版本，合并计数后删除损坏条目
- `getHotSearches()`：定期扫描内存 Map，自动修复并合并历史 mojibake 记录

### 自优化建议
- **URL 编码参数统一在入口层处理**：所有搜索相关路由在 `req.query.q` 读取后立即 `decodeURIComponent` 并验证，避免各路由自行处理导致不一致
- **内存缓存数据定期清理**：hot-searches Map 设置 1h TTL + 上限 100 条，防止历史脏数据长期滞留
- **测试数据隔离**：开发/测试环境插入的挑战赛数据应带 `isTest: true` 标记，生产环境查询自动过滤


---

## iter#79 — 挑战赛内容填充与首页入口优化 (2026-05-28)

### 关键陷阱
- **docker cp 时间戳不可靠**：容器 overlayfs 下文件时间戳不更新，不能仅凭 `ls -la` 判断部署是否成功，需用内容 grep 验证
- **QClaw 迭代编号混淆**：commit message 和 tracker 记录可能写错迭代编号，需人工核对 commit 日期和内容匹配性

### 修复方法
- 服务器执行 `git pull` → `npm run build` → `docker cp` → `nginx -s reload` 完整闭环
- 部署验证：容器内 JS bundle grep 组件名 + API curl 验证数据 + 页面 HTTP 200

### 自优化建议
- **部署验证必须内容级**：不要只看文件存在/时间戳，要 grep bundle 内容确认组件被编译进去
- **生产 DB 操作与前端部署解耦**：先 pipe-inject 插入 DB 数据，验证 API 后再 build + docker cp 前端
- **迭代编号在 prompt 中显式声明**：派发 QClaw 时在任务描述中写明 "这是迭代 #N"，减少编号混淆

### 遗留问题
- 无 🔴 待修复


---

## iter#80 — 推荐系统质量优化 (2026-05-28)

### 关键陷阱
- **推荐算法缺少多样性控制**：原始 recommend 返回固定排序的 12 条，同一分类可能占 50% 以上，用户审美疲劳
- **相似度计算维度单一**：原始 Jaccard 仅基于 cuisine 分类，不同菜系但食材/做法高度相似的食谱被遗漏
- **前端推荐理由缺失**：RecipeCard 无法向用户解释"为什么推荐这道菜"

### 修复方法
- **多样性控制**：`perCategoryLimit = Math.ceil(limit / 4)`，限制每个分类最多出现 3 条，剩余配额按分数递补其他分类
- **多维度 Jaccard**：五维 categoryTags 分别计算 Jaccard 系数后加权平均（ingredient 35%、method 25%、cuisine 20%、flavor 15%、price 5%）
- **推荐理由标签**：后端根据排序因素分配标签（isFeatured→"编辑精选"、season 匹配→"当季推荐"、qualityScore 高→"热门食谱"）
- **新鲜度衰减**：`freshness = 1 / (1 + daysSinceCreated * 0.05)`，30 天内新食谱获得显著权重加成

### 自优化建议
- **推荐算法 A/B 测试框架**：为不同推荐策略（多样性优先/新鲜度优先/热门优先）预留切换开关，便于后续数据驱动优化
- **用户行为反馈闭环**：推荐结果点击/收藏率应回写到推荐算法，形成反馈循环
- **推荐理由前端展示统一**：将 recommendReason 作为 RecipeCard 的可选属性，所有使用推荐列表的地方统一展示

### 遗留问题
- 无 🔴 待修复


---

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
