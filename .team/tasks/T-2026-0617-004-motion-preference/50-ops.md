# 部署报告：T-2026-0617-004-motion-preference

| 属性 | 值 |
|------|-----|
| taskId | T-2026-0617-004-motion-preference |
| 阶段 | ops |
| 部署时间 | 2026-06-17 |
| 部署 commit | bd634ab |
| 公网 URL | http://39.103.68.205/ |
| 容器 ID | 6b4be354ab67 |
| 容器状态 | healthy |
| 部署耗时 | ~120s（npm build 6.68s + docker cp + 验证） |
| deployVerdict | **pass** |

---

## 部署步骤

1. ✅ git push origin main：5 个 motion-preference commit（230ce7c → bd634ab）已推送
2. ✅ SSH 服务器 git pull：代码同步成功
3. ✅ 服务器 npm build：构建成功（6.68s）
4. ✅ docker cp dist/. food-frontend:/usr/share/nginx/html/：无 xattr 错误
5. ✅ 容器内文件验证：静态资源全部复制成功

---

## CI/CD 5 关验证（全部通过）

| # | 验证项 | 结果 | 详情 |
|---|--------|------|------|
| 1 | 本地 dist 代码 grep | ✅ PASS | 11 CSS + 2 JS + index.html preseed 命中 prefers-reduced-motion |
| 2 | 容器内代码验证 | ✅ PASS | 15 CSS + index.html preseed = 1 命中 |
| 3 | 公网 curl 200 | ✅ PASS | `curl -sI http://39.103.68.205/` → HTTP/1.1 200 OK |
| 4 | 公网 chunk 命中 | ✅ PASS | `curl http://39.103.68.205/assets/index-COssQf9B.css | grep -c` = 1 |
| 5 | 容器 running | ✅ PASS | food-frontend (6b4be354ab67) Up 20 hours (healthy) |

---

## 公网业务验证

| 验证项 | 结果 |
|--------|------|
| 首页 HTTP 200 | ✅ PASS |
| index.html prefers-reduced-motion | ✅ 1 命中 |
| CSS chunk prefers-reduced-motion | ✅ 1 命中 |
| 后端 /api/health 200 | ✅ PASS |
| 容器日志无错误 | ✅ PASS |

---

## 防御检查

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | 时长阈值（≥90s）| ✅ 120s 通过 |
| 2 | 公网 curl 独立验证 | ✅ 通过 |
| 3 | docker cp 静默失败防御（grep 验证）| ✅ 通过 |
| 4 | docker cp 目录陷阱防御（dist/.）| ✅ 通过 |
| 5 | chown 防御（前端 nginx 静态文件不需要）| ✅ N/A |

---

## 新增代码统计

- 5 个 commit：230ce7c → e779c69 → 85972d3 → 9505955 → bd634ab
- 32 files changed, 770 insertions(+), 181 deletions(-)
- 新增文件：MotionPreferenceContext.tsx、usePrefersReducedMotion.ts、useSmartScroll.ts

---

## 遗留非阻塞项（来自 reviewer r2 建议）

1. `useSmartScroll.ts` 死代码仍存在（未被任何文件 import）
2. `applyMotionScale` 3 处重复调用
3. preseed 脚本使用 `var` 而非 `const`

以上均为非阻塞性代码风格问题，不影响功能运行，可后续迭代清理。

---

## 结论

**部署成功 ✅**

prefers-reduced-motion 全站优雅降级功能已部署到生产环境并通过全部验证。

- CSS 变量乘法：`--motion-duration-scale` 注入到所有动画过渡
- 全局兜底：`@media (prefers-reduced-motion: reduce)` 禁用所有第三方动画
- JS 动效控制：useCountUp / useParallax / useStaggerReveal / HeroSection 自动轮播全部受控
- 平滑滚动降级：18 处 scrollIntoView/window.scrollTo 全部受控
- View Transitions 受控：仅在 no-preference 时启用
- SSR 无闪烁：index.html preseed 脚本在 React hydrate 前检测系统偏好
