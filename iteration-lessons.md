
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
