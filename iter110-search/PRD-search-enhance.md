# PRD：搜索体验增强

> **版本**: v1.0  
> **迭代**: iter110-search  
> **日期**: 2026-06-09  
> **状态**: 待开发  

---

## 1. 当前状态分析

### 1.1 后端现状

| 端点 | 方法 | 功能 | 当前行为 |
|------|------|------|----------|
| `/recipes/suggestions?q=xxx` | GET | 搜索建议 | 返回 `id`, `title`, `category`，最多 6 条，按 `favoriteCount DESC` 排序 |
| `/recipes/hot-searches` | GET | 热门搜索词 | 从内存 `searchFrequency` Map 取 Top 8，60s 缓存 |

**搜索频率追踪**（`backend/routes/recipes.js`）：
- `trackSearch(term)` — 每次搜索调用时记录到内存 Map，含 Mojibake 修复逻辑
- `getHotSearches(limit=8)` — 按 count 降序取 Top N，自动清理过期条目（>1h 未更新且 count<2）
- `SEARCH_CACHE_TTL = 3600_000`（1 小时）

**Recipe 模型关键字段**（`backend/models/recipe.js`）：
- `coverImage` (STRING) — 封面图片 URL，已有
- `categoryTags` (TEXT, JSON) — 多维分类标签 `{ingredient, method, cuisine, flavor, price}`
- `category` (STRING) — 单维分类：`chinese, western, dessert, japanese, korean, other`
- `favoriteCount` (INTEGER) — 收藏数

### 1.2 前端现状

**SearchAutocomplete 组件**（`frontend/src/components/SearchAutocomplete.tsx`）：
- ✅ debounce 300ms + 最少 2 字触发 API 建议
- ✅ 键盘导航（↑↓ Enter Esc）
- ✅ 搜索历史（localStorage，最多 8 条）
- ✅ 外部点击关闭
- ✅ API 建议 + 本地建议合并展示
- ✅ 点击 API 建议直接导航到食谱详情（`enableNavigate` prop）
- ❌ 热门搜索词：硬编码数组 `HOT_SEARCHES = ['鸡蛋、番茄', '鸡肉、土豆', '红烧肉', '番茄炒蛋', '汤', '甜点']`（仅 6 条）
- ❌ API 建议仅展示文字，无封面缩略图
- ❌ 无匹配标签/分类区域

**SearchPage 组件**（`frontend/src/pages/SearchPage.tsx`）：
- ✅ 搜索结果展示 + 分页
- ✅ 分类/难度/排序筛选标签
- ✅ 搜索历史展示（独立于 SearchAutocomplete 的 localStorage 逻辑）
- ✅ 热门搜索词展示（调用 `getHotSearches()` API，但数据稀疏时回退硬编码）

### 1.3 核心问题

| # | 问题 | 影响 |
|---|------|------|
| 1 | **热门搜索词稀疏** | 内存中仅 3 条搜索记录（无人实际搜索），API 返回空或极少数据，前端回退硬编码仅 6 条固定词 |
| 2 | **搜索建议无封面图** | 下拉建议只有文字，用户无法通过视觉快速识别食谱 |
| 3 | **搜索建议无标签/分类** | 无法展示"匹配标签"或"匹配分类"分组，缺少信息层次 |
| 4 | **前端下拉缺少视觉层次** | 纯文字列表，无缩略图、无分组，体验单调 |

---

## 2. 需求详述

### 2.1 后端增强：`GET /recipes/suggestions?q=xxx`

#### 2.1.1 响应字段变更

**当前响应**：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      { "id": "uuid", "title": "番茄炒蛋", "category": "chinese" }
    ],
    "total": 6
  }
}
```

**目标响应**：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": "uuid",
        "title": "番茄炒蛋",
        "category": "chinese",
        "coverImage": "/uploads/xxx.jpg",
        "tags": { "cuisine": "chinese", "flavor": "sweet,sour", "ingredient": "egg,tomato", "method": "stir-fry", "price": "low" }
      }
    ],
    "total": 8,
    "matchedTags": ["番茄", "鸡蛋", "家常", "快手"],
    "matchedCategories": ["chinese", "quick-meal"]
  }
}
```

#### 2.1.2 具体变更

| 变更项 | 当前值 | 目标值 | 说明 |
|--------|--------|--------|------|
| `attributes` | `['id', 'title', 'category']` | `['id', 'title', 'category', 'coverImage', 'categoryTags']` | 增加封面图和标签字段 |
| `limit` | `6` | `8` | 提升建议条数 |
| 新增 `matchedTags` | 无 | 最多 4 条 | 从所有匹配食谱的 `categoryTags` 中提取高频标签值 |
| 新增 `matchedCategories` | 无 | 最多 4 条 | 从所有匹配食谱的 `category` 字段去重 |

#### 2.1.3 `matchedTags` 提取逻辑

1. 对 `suggestions` 查询返回的所有食谱，解析其 `categoryTags` JSON
2. 提取所有标签值（如 `cuisine:chinese` → `chinese`，`flavor:spicy,mala` → `spicy`, `mala`）
3. 按出现频率降序排列
4. 取前 4 条（最多）
5. 过滤掉与搜索词完全相同的标签（避免冗余）

#### 2.1.4 `matchedCategories` 提取逻辑

1. 对 `suggestions` 查询返回的所有食谱，提取 `category` 字段
2. 去重
3. 取前 4 条（最多）

#### 2.1.5 实现注意事项

- `categoryTags` 在数据库中存储为 TEXT/JSON 字符串，需在 JS 层解析
- `coverImage` 可能为 `null`，前端需处理空值
- 向后兼容：新增字段不影响现有调用方
- 缓存策略保持不变：`Cache-Control: public, max-age=15, s-maxage=60`

---

### 2.2 后端增强：`GET /recipes/hot-searches`

#### 2.2.1 当前行为

- 从内存 `searchFrequency` Map 取 Top 8
- 若内存中数据不足（如新部署、无人搜索），返回空数组或极少条目

#### 2.2.2 目标行为

**Fallback 补充策略**：当 `getHotSearches()` 返回不足 10 条时，自动从以下来源补充：

| 优先级 | 来源 | 数量 | 说明 |
|--------|------|------|------|
| 1 | 内存搜索频率 | 已有的全部 | 真实用户搜索数据，标记 `source: 'search'` |
| 2 | 食谱分类去重 | 最多 5 条 | `SELECT DISTINCT category FROM recipes LIMIT 5`，标记 `source: 'fallback'` |
| 3 | 热门标签 | 最多 5 条 | 从所有食谱 `categoryTags` 中统计标签值频率，取 Top 5，标记 `source: 'fallback'` |
| 4 | 硬编码热门词 | 最多 5 条 | 兜底数据：`['番茄炒蛋', '红烧肉', '蛋糕', '牛肉', '汤']`，标记 `source: 'fallback'` |

#### 2.2.3 响应格式变更

**当前响应**：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      { "text": "番茄炒蛋", "count": 3 }
    ],
    "total": 3
  }
}
```

**目标响应**：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      { "text": "番茄炒蛋", "count": 3, "source": "search" },
      { "text": "chinese", "count": 0, "source": "fallback" },
      { "text": "spicy", "count": 0, "source": "fallback" }
    ],
    "total": 10
  }
}
```

#### 2.2.4 实现要点

- 补充数据去重：fallback 词不应与已有搜索词重复
- 分类名做中文映射（如 `chinese` → `中式`），使用 `CATEGORIES` 常量
- 标签值做可读化处理（如 `stir-fry` → `炒`）
- 确保始终返回至少 10 条（含 fallback）
- 缓存策略：`Cache-Control: public, max-age=60, s-maxage=300`（保持不变）
- `source: 'fallback'` 的条目 `count` 设为 0

---

### 2.3 前端增强：SearchAutocomplete 组件

#### 2.3.1 封面缩略图

- API 建议项左侧显示 **40×30px** 封面缩略图
- 使用 `<img>` 标签，`object-fit: cover`，圆角 4px
- **Fallback**：图片加载失败时显示 🍽️ emoji 占位（使用 `onError` 事件）
- `coverImage` 为 `null` 时直接显示 🍽️ 占位
- 本地建议（历史/热门）不显示缩略图，保持现有 🕐 图标

#### 2.3.2 匹配标签区域（`matchedTags`）

- 当 API 返回 `matchedTags` 且非空时，在下拉列表**顶部**插入分组标题
- 标题格式：`🏷️ 匹配标签`
- 每个标签渲染为可点击的 tag chip
- 点击标签 → 将标签文本填入搜索框并触发搜索
- 样式：小圆角标签，背景色 `var(--color-primary-bg)`，hover 加深

#### 2.3.3 匹配分类区域（`matchedCategories`）

- 当 API 返回 `matchedCategories` 且非空时，在匹配标签区域**下方**插入分组标题
- 标题格式：`📂 匹配分类`
- 每个分类渲染为可点击的分类 chip
- 点击分类 → 填入分类名并触发搜索（或导航到分类页，视 `enableNavigate` 决定）
- 分类名做中文映射（复用 `CATEGORIES` 常量）

#### 2.3.4 热门搜索词预填充

- **移除硬编码 `HOT_SEARCHES` 数组**
- 输入框为空时，调用 `GET /recipes/hot-searches` API 获取热门搜索词
- 在下拉中展示（替代原硬编码逻辑）
- 加载中显示骨架屏占位
- 点击热门词 → 填入搜索框并触发搜索
- 搜索历史仍优先展示在热门词上方

#### 2.3.5 最少 1 字触发

- 当前：`trimmed.length < 2` 时不触发 API 建议
- 目标：`trimmed.length < 1` 时不触发 API 建议（即输入 1 个字符就触发）
- debounce 保持 300ms 不变

#### 2.3.6 保留现有功能

- ✅ 搜索历史（localStorage，最多 8 条）
- ✅ 键盘导航（↑↓ Enter Esc）
- ✅ 外部点击关闭
- ✅ API 建议 + 本地建议合并展示
- ✅ 点击 API 建议导航到食谱详情
- ✅ 清除搜索历史按钮
- ✅ 暗色模式适配

#### 2.3.7 下拉列表布局（目标结构）

```
┌─────────────────────────────────────┐
│ 🏷️ 匹配标签                         │
│ [番茄] [鸡蛋] [家常] [快手]          │
├─────────────────────────────────────┤
│ 📂 匹配分类                         │
│ [中式] [快手菜]                      │
├─────────────────────────────────────┤
│ ┌──────┐ 番茄炒蛋         详情 ›    │  ← API 建议（带缩略图）
│ │ 🖼️  │ 酸甜可口...                 │
│ └──────┘                            │
│ ┌──────┐ 番茄牛腩         详情 ›    │
│ │ 🖼️  │ 浓郁鲜美...                 │
│ └──────┘                            │
├─────────────────────────────────────┤
│ 🕐 番茄炒蛋                         │  ← 搜索历史
│ 🕐 红烧肉                           │
├─────────────────────────────────────┤
│ 🔥 鸡蛋、番茄                       │  ← 热门搜索（来自 API）
│ 🔥 鸡肉、土豆                       │
├─────────────────────────────────────┤
│ 清除搜索历史                        │
└─────────────────────────────────────┘
```

#### 2.3.8 接口类型定义

```typescript
// API 建议项（扩展后）
interface SuggestionItem {
  id: string
  title: string
  category: string
  coverImage: string | null
  tags: Record<string, string> | null
}

// API 建议响应
interface SuggestionsResponse {
  list: SuggestionItem[]
  total: number
  matchedTags: string[]
  matchedCategories: string[]
}

// 热门搜索项
interface HotSearchItem {
  text: string
  count: number
  source: 'search' | 'fallback'
}
```

---

## 3. 验收标准

### 3.1 后端验收

| # | 验收项 | 验证方式 |
|---|--------|----------|
| 1 | `GET /recipes/suggestions?q=番` 返回 `coverImage` 和 `tags` 字段 | 检查响应 JSON |
| 2 | `GET /recipes/suggestions?q=番` 返回最多 8 条建议 | 检查 `list.length <= 8` |
| 3 | `GET /recipes/suggestions?q=番` 返回 `matchedTags` 数组（最多 4 条） | 检查响应包含 `matchedTags` |
| 4 | `GET /recipes/suggestions?q=番` 返回 `matchedCategories` 数组（最多 4 条） | 检查响应包含 `matchedCategories` |
| 5 | `GET /recipes/hot-searches` 始终返回至少 10 条 | 清空内存搜索频率后验证 |
| 6 | fallback 数据标记 `source: 'fallback'` | 检查响应 JSON |
| 7 | 真实搜索数据标记 `source: 'search'` | 执行搜索后验证 |
| 8 | 现有测试 `search_enhance.test.js` 全部通过 | `npm test` |

### 3.2 前端验收

| # | 验收项 | 验证方式 |
|---|--------|----------|
| 1 | API 建议项左侧显示 40×30px 封面缩略图 | 视觉检查 |
| 2 | 封面图加载失败/null 时显示 🍽️ fallback | 模拟图片 404 |
| 3 | 输入框为空时，下拉显示热门搜索词（来自 API） | 检查无硬编码 `HOT_SEARCHES` |
| 4 | 输入 1 个字符即触发 API 建议 | 输入"番"验证 |
| 5 | `matchedTags` 非空时显示 🏷️ 匹配标签区域 | 搜索"番茄"验证 |
| 6 | `matchedCategories` 非空时显示 📂 匹配分类区域 | 搜索"鸡"验证 |
| 7 | 点击标签 chip → 填入搜索框并搜索 | 交互验证 |
| 8 | 点击分类 chip → 填入搜索框并搜索 | 交互验证 |
| 9 | 键盘导航（↑↓ Enter Esc）正常工作 | 交互验证 |
| 10 | 搜索历史功能正常（保存/清除/删除） | 交互验证 |
| 11 | 暗色模式下样式正常 | 切换暗色模式验证 |
| 12 | 移动端（≤480px）样式正常 | 响应式检查 |

---

## 4. 风险与回滚策略

### 4.1 风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| `categoryTags` JSON 解析失败（格式异常） | 低 | 中 | try-catch 包裹，解析失败返回空对象 `{}` |
| `coverImage` 为相对路径导致前端 404 | 中 | 低 | 前端使用 `imageProxy` 工具函数处理路径 |
| fallback 热门词质量低（如分类名 `chinese` 对用户不友好） | 中 | 低 | 分类名做中文映射；标签值做可读化处理 |
| 1 字触发导致 API 请求量激增 | 低 | 低 | debounce 300ms 不变；suggestions 已有 15s 浏览器缓存 |
| `matchedTags` 提取逻辑性能（大量食谱时） | 低 | 低 | suggestions 已限制 8 条，标签提取在内存中完成 |
| 前端下拉列表过长（标签+分类+建议+历史+热门） | 中 | 中 | 设置 `max-height: 360px` + `overflow-y: auto`；无结果时隐藏对应区域 |

### 4.2 回滚策略

1. **后端回滚**：
   - `suggestions` 新增字段为**纯增量**，不影响现有字段，回滚只需恢复 `attributes` 和 `limit`
   - `hot-searches` fallback 逻辑为**纯增量**，回滚只需移除 fallback 代码块
   - 建议通过 feature flag 或环境变量控制 fallback 开关

2. **前端回滚**：
   - 封面缩略图、标签/分类区域为**纯增量 UI**，移除不影响核心搜索功能
   - 热门搜索词从 API 获取 → 回退硬编码：恢复 `HOT_SEARCHES` 数组即可
   - 1 字触发 → 回退 2 字：改回 `trimmed.length < 2`

3. **灰度发布建议**：
   - 先上线后端变更（向后兼容）
   - 验证 API 响应正确后，再上线前端变更
   - 前端可通过 props 控制新功能开关（如 `showThumbnails`、`showTagGroups`）

---

## 附录 A：涉及文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `backend/routes/recipes.js` | 修改 | suggestions 端点增强 + hot-searches fallback |
| `backend/tests/search_enhance.test.js` | 修改 | 更新测试用例覆盖新字段 |
| `frontend/src/components/SearchAutocomplete.tsx` | 修改 | 缩略图、标签/分类区域、API 热门词、1 字触发 |
| `frontend/src/components/SearchAutocomplete.css` | 修改 | 新增缩略图、标签 chip、分类 chip 样式 |
| `frontend/src/api.ts` | 修改 | 更新 `getSuggestions` 和 `getHotSearches` 返回类型 |
| `frontend/src/pages/SearchPage.tsx` | 可能修改 | 如果 SearchPage 也使用硬编码热门词需同步更新 |

## 附录 B：分类中文映射参考

```typescript
const CATEGORY_LABELS: Record<string, string> = {
  chinese: '中式',
  western: '西式',
  dessert: '甜点',
  japanese: '日式',
  korean: '韩式',
  other: '其他',
  thai: '泰式',
  'quick-meal': '快手菜',
}
```

## 附录 C：标签值可读化映射参考

```typescript
const TAG_LABELS: Record<string, string> = {
  'stir-fry': '炒',
  'deep-fry': '炸',
  boil: '煮',
  steam: '蒸',
  braise: '烧',
  'pan-fry': '煎',
  spicy: '辣',
  mala: '麻辣',
  sweet: '甜',
  sour: '酸',
  savory: '咸',
  numbing: '麻',
  chicken: '鸡肉',
  pork: '猪肉',
  beef: '牛肉',
  fish: '鱼',
  shrimp: '虾',
  egg: '鸡蛋',
  tofu: '豆腐',
  vegetable: '蔬菜',
  chinese: '中式',
  japanese: '日式',
  korean: '韩式',
  thai: '泰式',
  western: '西式',
  low: '实惠',
  medium: '中等',
  high: '高端',
}
```
