| 迭代 | 日期 | 方向 | 核心根因 | 关键自优化建议 |
|------|------|------|----------|--------------|
| #84 | 05-28 | 🟡 ui-opt | 无特殊故障。SearchPage 多选分类需同步 URL params ↔ 本地状态 | 共享常量文件减少多组件硬编码；后端 Op.in 兼容数组参数；路由顺序需注意 |
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

| 迭代 | 日期 | 方向 | 核心根因 | 关键自优化建议 |
|------|------|------|----------|--------------|
| #81 | 05-28 | 🟡 ui-opt | 触摸事件与 click 冲突；iOS :active 不生效；haptic 兼容性；下拉刷新与滚动冲突 | 长按事件隔离标志位；全局 -webkit-tap-highlight-color；haptic 静默降级；下拉手势仅在 scrollTop===0 触发 |
| #82 | 05-28 | 🟢 feature | pipe 注入 EACCES 权限炸弹；成就进度 API 需返回完整清单 | pipe 注入后 chmod a+r；成就 API 返回所有定义含进度 |
| #83 | 05-28 | 🟢 content | seed.js 标题重复；pipe-inject 权限；UUID 冲突 | 新增前 grep 去重；chmod a+r；UUIDV4 自动生成 |
| #85 | 05-28 | 🟢 feature | multipart 与 JSON body 混合；Multer 配置复用风险 | 前端 FormData 不手动设 Content-Type；Multer 工厂模式差异化配置 |
| #89-#92 | 05-29 | 🟡/🟢 mix | feed JOIN 性能；浮点精度；TDZ 崩溃；步骤图片 cover→contain；首页冗余 section | JOIN 加 LIMIT；toFixed(1) 格式化；检查循环依赖；contain + background 过渡；定期审视信息架构 |

---

## 遗留问题

- [ ] VAPID 密钥未配置，Web Push 推送静默跳过

---

## 2026-05-29 迭代#95 — 暗色模式遗漏补全

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

---

## 2026-05-30 迭代#97 — 营养数据精度校准与内容质量巡检

### 关键陷阱
- **getter 与旧 JSON.parse 冲突**：Recipe 模型新增 `nutrition` getter 后，Sequelize `toJSON()` 会自动调用 getter 返回已解析的 JSON 对象。但部分旧代码手动执行 `JSON.parse(JSON.stringify(recipe.nutrition))`，导致对字符串进行 JSON.parse 报错。根因是 getter 改变了 nutrition 的访问语义，但调用方未同步更新
- **admin 路由未注册**：新增 `admin.js` 质量报告路由后，未在 `app.js` 中注册，导致前端调用 404
- **测试环境 Nutrition 验证绕过**：测试用例中 `calories=0` 被 validateNutrition 中间件拦截，但 seed 数据中存在合法的低卡食谱。根因是校验规则未区分「0=缺失」和「0=合法值」

### 修复方法
- **移除冗余 JSON.parse**：将 `JSON.parse(JSON.stringify(recipe.nutrition))` 改为直接 `recipe.nutrition`，利用 Sequelize getter 自动解析
- **路由注册检查**：新增后端路由文件后，强制检查 app.js 中是否完成 `app.use()` 注册
- **校验规则细化**：calories=0 时检查 protein/fat/carbs 是否同时为 0，若是则标记为缺失而非异常

### 遗留问题
- 无 🔴 待修复

### 自优化建议
- **getter 引入审计**：为模型字段添加 getter/setter 时，grep 全代码库检查该字段的所有访问点
- **后端路由注册清单**：新增路由必做：①创建路由文件 → ②注册到 app.js → ③添加单元测试 → ④前端 api.ts 同步

---

## 2026-05-30 迭代#98 — 暗色模式覆盖率提升（67%→97%）

### 关键陷阱
- **暗色模式遗漏累积**：新增组件/页面时开发者容易忘记添加 body.dark 样式，覆盖率随迭代从 90%+ 逐渐下降至 67%
- **硬编码颜色是暗色模式的天敌**：部分组件使用 `#fff`、`#333` 等硬编码值，暗色切换时无法自动适配

### 修复方法
- **批量补充 body.dark**：为 20 个缺失 CSS 文件统一添加暗色样式（+1410 行），覆盖 12 组件 + 8 页面
- **CSS 变量统一**：确保所有颜色通过 var(--color-xxx) 定义，暗色覆写只需修改变量值

### 遗留问题
- 无 🔴 待修复

### 自优化建议
- **暗色模式检查清单**：新增组件/页面时，强制检查 CSS 文件是否包含 body.dark 样式块
- **定期覆盖率巡检**：每月运行一次 dark-mode 覆盖率扫描，防止再次下滑

---

## 2026-05-30 迭代#99 — 食谱"我做过"标记系统

### 关键陷阱
- **MySQL UUID 外键约束失败**：Sequelize `DataTypes.UUID` 映射为 `CHAR(36) BINARY`，与现有 users/recipes 表的 id 列存在微妙类型差异（如 COLLATE 或是否 BINARY），导致 `CREATE TABLE` 时 `errno: 150` 外键约束创建失败，后端容器循环重启
- **容器重启后 nginx upstream 失效**：后端 `docker restart` 后 nginx `upstream food-backend:3001` 短暂不可解析，需等待容器 health check 通过后 reload

### 修复方法
- **禁用数据库级外键约束**：`belongsTo(..., { constraints: false })` 阻止 Sequelize sync 生成 FOREIGN KEY，保留应用层关联关系
- **分离 commit 与修复**：代码 commit 后部署发现外键问题，单独 commit 修复（`19d44b6`），避免回滚整个功能

### 遗留问题
- 无 🔴 待修复

### 自优化建议
- **新模型部署前检查外键兼容性**：新增含外键的模型时，先在本地 SQLite 验证通过后再部署到 MySQL；或默认使用 `constraints: false`
- **部署后第一时间验证容器状态**：后端 docker restart 后必须 `docker ps` 确认状态为 healthy，再执行 nginx reload
