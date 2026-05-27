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

## 遗留问题

- [ ] VAPID 密钥未配置，Web Push 推送静默跳过

