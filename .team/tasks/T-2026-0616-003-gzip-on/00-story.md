# 00-story — 服务器启用 gzip 静态资源压缩

## 用户故事

**作为** food-website 的终端用户，
**我想要**服务器在传输 HTML / JS / CSS 等文本类静态资源时启用 gzip 压缩，
**以便**减少网络传输体积、降低页面加载时间，并节省移动端用户的流量消耗。

---

## 背景与触发依据

- 今日 01:46 自动化巡检发现：线上静态资源响应头未包含 `Content-Encoding: gzip`。
- 巡检报告结论（2026-06-16）：
  > "静态资源未启用 gzip（首页 HTML 仅 400 bytes，影响极小）"
- 当前架构：Nginx 作为反向代理，前端为 React 18 构建产物。gzip 属于纯服务器层配置，不触及业务代码。
- 当前 HEAD：`acbd349`

---

## 验收标准（AC）

> 以下所有验证均针对部署地址 `http://39.103.68.205/` 执行。

### AC-1：HTML 资源返回 `Content-Encoding: gzip`
当请求首页 HTML 且客户端声明支持 gzip 时，响应必须包含 `Content-Encoding: gzip`。

```bash
curl -sI -H "Accept-Encoding: gzip" http://39.103.68.205/ | grep -i "content-encoding"
# 预期：content-encoding: gzip
```

### AC-2：JS 资源返回 `Content-Encoding: gzip`
当请求任意 `.js` 静态资源且客户端声明支持 gzip 时，响应必须包含 `Content-Encoding: gzip`。

```bash
curl -sI -H "Accept-Encoding: gzip" http://39.103.68.205/static/js/main.<hash>.js | grep -i "content-encoding"
# 预期：content-encoding: gzip
```

### AC-3：CSS 资源返回 `Content-Encoding: gzip`
当请求任意 `.css` 静态资源且客户端声明支持 gzip 时，响应必须包含 `Content-Encoding: gzip`。

```bash
curl -sI -H "Accept-Encoding: gzip" http://39.103.68.205/static/css/main.<hash>.css | grep -i "content-encoding"
# 预期：content-encoding: gzip
```

### AC-4：SVG 资源返回 `Content-Encoding: gzip`
当请求 `.svg` 静态资源且客户端声明支持 gzip 时，响应必须包含 `Content-Encoding: gzip`（SVG 为文本格式，压缩收益高）。

```bash
curl -sI -H "Accept-Encoding: gzip" http://39.103.68.205/static/media/logo.<hash>.svg | grep -i "content-encoding"
# 预期：content-encoding: gzip
```

### AC-5：二进制资源**不**返回 `Content-Encoding: gzip`
当请求图片等已压缩的二进制资源（如 `image/jpeg`、`image/png`、`image/webp`）时，响应**不得**包含 `Content-Encoding: gzip`，避免无意义的 CPU 开销。

```bash
curl -sI -H "Accept-Encoding: gzip" http://39.103.68.205/static/media/hero.<hash>.jpg | grep -i "content-encoding"
# 预期：无输出（即不返回 content-encoding 头）
```

### AC-6：`Vary: Accept-Encoding` 头正确设置
所有启用了 gzip 的资源响应必须包含 `Vary: Accept-Encoding`，确保 CDN / 浏览器缓存能根据客户端压缩支持能力做正确区分。

```bash
curl -sI -H "Accept-Encoding: gzip" http://39.103.68.205/ | grep -i "vary"
# 预期：vary: Accept-Encoding
```

### AC-7：未声明 `Accept-Encoding: gzip` 的客户端收到原始内容
若请求头中不带 `Accept-Encoding: gzip`，服务器应返回未压缩的原始内容，且**不**包含 `Content-Encoding: gzip`。

```bash
curl -sI http://39.103.68.205/ | grep -i "content-encoding"
# 预期：无输出
```

### AC-8：压缩传输体积小于原始体积（抽样验证）
选取一个代表性 JS 文件，对比 gzip 与未 gzip 的 `Content-Length`，确认压缩后体积确实减小。

```bash
# 原始体积
ORIG=$(curl -sI http://39.103.68.205/static/js/main.<hash>.js | grep -i "content-length" | awk '{print $2}' | tr -d '\r')
# 压缩体积
GZIPPED=$(curl -sI -H "Accept-Encoding: gzip" http://39.103.68.205/static/js/main.<hash>.js | grep -i "content-length" | awk '{print $2}' | tr -d '\r')
echo "原始: $ORIG, gzip: $GZIPPED"
# 预期：$GZIPPED < $ORIG
```

---

## 约束

- **范围**：仅限 Nginx / 服务器层面的 gzip 配置（`nginx.conf` 或站点配置）。
- **不修改**：业务逻辑代码、前端构建配置、React 源码。
- **不影响**：现有接口行为（`/api/*` 等）。

---

## 参考

- 巡检报告：`~/.qclaw/workspace/reports/巡检汇总-2026-06-16.md`
- Baseline Commit：`acbd349`
