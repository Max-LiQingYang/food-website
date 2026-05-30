# UI 规范：食谱"我做过"标记系统（Cook It）

> 迭代: iter99 · 版本: v1.0 · 日期: 2026-05-30  
> 对应 PRD：`PRD-cook-it.md`  
> 依赖：详见 PRD §3.3 后端 API 设计（已经就绪）

---

## 1. 设计原则

- **CSS 变量优先**：所有颜色、间距、圆角优先使用 `global.css` 已定义的 `--color-*` 变量
- **参照已有模式**：按钮交互模式参照现有 Favorite 收藏按钮（`.detail-fav-btn`），标签页参照现有 profile-tab 体系
- **绿色语义**：已做过状态使用绿色（`--color-success: #52c41a`）作为语义色，区别于收藏的橙色
- **动效克制**：状态切换使用 `0.2s ease` 过渡，单击反馈使用 `scale(0.97)` 触感，与现有设计语言一致
- **暗色模式**：使用 `body.dark` 选择器（注意：旧代码中遗留了少量 `[data-theme="dark"]`，新写代码统一使用 `body.dark`）

---

## 2. 设计 Token 扩展

新增语义色 Token（建议在 `global.css` 的 `:root` 段落追加，作为可选覆盖；也可直接在组件 CSS 中硬编码——更简单且符合当前项目风格）：

```css
/* "我做过" 语义色 — 建议追加到 :root 和 body.dark */
:root {
  --color-cooked: #52c41a;         /* 已做过状态主色（复用 --color-success） */
  --color-cooked-light: #e8f5e9;   /* 已做过状态背景（浅绿） */
  --color-cooked-dark: #2e7d32;    /* 已做过状态文字（深绿） */
  --color-cooked-bg-subtle: #f1f8e9; /* 极浅绿，用于 hover 背景 */
}

body.dark {
  --color-cooked-bg: #1b3a1b;      /* 暗色已做过背景 */
  --color-cooked-text: #81c784;     /* 暗色已做过文字 */
  --color-cooked-border: #4caf50;   /* 暗色已做过边框 */
  --color-cooked-bg-subtle: #1a2e1a;/* 暗色极浅绿 */
}
```

---

## 3. 食谱详情页 — "我做过"按钮

### 3.1 桌面端（≥769px）

**位置**：在 `div.detail-cover-actions` 内部，追加在现有 `AddToCollectionDropdown` 之后。

**HTML 结构**（参照 PRD 追加至 RecipeDetailPage.tsx）：

```tsx
{/* detail-cover-actions 内追加在 </AddToCollectionDropdown> 之后 */}
<button
  className={`detail-cook-btn ${isCooked ? 'is-cooked' : ''}`}
  onClick={handleCookToggle}
  disabled={cookLoading}
  title={isCooked ? '取消标记' : '我做过'}
>
  <span className="cook-btn-icon">
    {cookLoading ? '⋯' : isCooked ? '👨‍🍳' : '🍳'}
  </span>
  <span className="cook-btn-text">
    {isCooked ? `已做过${cookCount > 1 ? `(${cookCount}次)` : ''}` : '我做过'}
    {totalCookedCount > 0 && (
      <span className="cook-btn-count">({totalCookedCount})</span>
    )}
  </span>
</button>
```

#### Button 规格

| 属性 | 值 |
|------|-----|
| 布局 | `inline-flex`, `align-items: center`, `gap: 6px` |
| 内边距 | `padding: 9px 20px`（与 `.detail-fav-btn` 一致） |
| 圆角 | `border-radius: 22px`（与 `.detail-fav-btn` 一致） |
| 字体 | `font-size: 14px`, `font-weight: 500` |
| 背景 | `rgba(255, 255, 255, 0.92)` + `backdrop-filter: blur(8px)` |
| 阴影 | `box-shadow: 0 2px 8px rgba(0,0,0,0.1)` |
| 过渡 | `transition: all 0.25s ease` |

#### 状态表

| 状态 | class | 边框 | 背景 | 文字色 | 图标 |
|------|-------|------|------|--------|------|
| 未做过 | 无额外 class | `1px solid var(--color-border)` | `rgba(255,255,255,0.92)` | `var(--color-text)` | 🍳 |
| Hover (未做过) | `:hover` | `var(--color-cooked)` | `var(--color-card)` | `var(--color-cooked)` | — |
| 已做过 | `.is-cooked` | `2px solid var(--color-cooked)` | `var(--color-cooked-light)` | `var(--color-cooked-dark)` | 👨‍🍳 |
| Hover (已做过) | `.is-cooked:hover` | — | `calc(var(--color-cooked-light)*1.05)` | `var(--color-cooked-dark)` | — |
| Loading | `[disabled]` | 当前状态 - 50% opacity | 当前状态 - 50% opacity | 当前状态 - 50% opacity | ⋯ |
| 未登录点击 | — | — | — | — | ❌ Toast "请先登录" |

#### 完整 CSS

```css
/* ═══════════════════════════════════════════════════════════════
   "我做过"按钮 — 桌面端 detail-cover-actions
   ═══════════════════════════════════════════════════════════════ */

.detail-cook-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  border: 1px solid var(--color-border, #e8e0d8);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text, #2d2d2d);
  cursor: pointer;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  min-height: 44px;
}

.detail-cook-btn:hover:not(:disabled) {
  border-color: var(--color-cooked, #52c41a);
  color: var(--color-cooked, #52c41a);
  background: var(--color-card, #fff);
  transform: scale(1.06);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
}

/* 已做过状态 */
.detail-cook-btn.is-cooked {
  background: var(--color-cooked-light, #e8f5e9);
  border-color: var(--color-cooked, #52c41a);
  color: var(--color-cooked-dark, #2e7d32);
  border-width: 2px;
}

.detail-cook-btn.is-cooked:hover:not(:disabled) {
  background: #c8e6c9;
  border-color: var(--color-cooked, #52c41a);
  color: var(--color-cooked-dark, #2e7d32);
}

/* Loading 状态 */
.detail-cook-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.detail-cook-btn:disabled:hover {
  transform: none !important;
  box-shadow: none !important;
}

/* 子元素 */
.cook-btn-icon {
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}

.cook-btn-text {
  white-space: nowrap;
}

.cook-btn-count {
  font-size: 12px;
  opacity: 0.7;
  margin-left: 2px;
}
```

### 3.2 移动端（≤768px）

**位置**：在 `div.floating-action-bar` 内部，追加在收藏按钮组之后、改编按钮之前。

**HTML 结构**（追加在移动端 FAB 收藏备注按钮之后）：

```tsx
{/* 移动端：浮动操作栏 "我做过" 按钮 */}
<button
  className={`fab-btn ${isCooked ? 'fab-btn--cooked' : ''}`}
  onClick={handleCookToggle}
  disabled={cookLoading}
  title={isCooked ? '取消标记' : '我做过'}
>
  <span className="fab-btn__icon">
    {cookLoading ? '⋯' : isCooked ? '👨‍🍳' : '🍳'}
  </span>
  <span>
    {cookLoading ? '' : isCooked
      ? `已做过${cookCount > 1 ? cookCount + '次' : ''}`
      : '我做过'}
  </span>
</button>

{/* 做过状态下显示 "写日志" 快捷入口 */}
{isCooked && (
  <Link to={`/cooking-journal?recipeId=${id}`} className="fab-btn" title="写烹饪日志">
    <span className="fab-btn__icon">📝</span>
    <span>写日志</span>
  </Link>
)}
```

#### 状态表（移动端）

| 状态 | class | 文字色 | 背景色 | 图标 |
|------|-------|--------|--------|------|
| 未做过 | 无 | `var(--color-text-secondary)` | 透明 | 🍳 |
| 已做过 | `.fab-btn--cooked` | `var(--color-cooked-dark)` | `var(--color-cooked-light)` | 👨‍🍳 |

FAB 按钮本身的布局和 hover 样式已在 `RecipeDetailPage.css` 中定义（`.fab-btn`），只需追加 `.fab-btn--cooked` 状态：

```css
/* 移动端 FAB — 已做过状态 */
@media (max-width: 768px) {
  .fab-btn--cooked {
    background: var(--color-cooked-light, #e8f5e9);
    color: var(--color-cooked-dark, #2e7d32);
  }

  .fab-btn--cooked:hover,
  .fab-btn--cooked:active {
    background: #c8e6c9;
    color: var(--color-cooked-dark, #2e7d32);
  }
}
```

### 3.3 状态切换动效

参照现有收藏按钮的 `heartBounce` 动画模式，为"我做过"按钮新增烹饪专用动效：

```css
/* 👨‍🍳 "我做过" — 点击心反馈 */
.detail-cook-btn:not(:disabled):active {
  transform: scale(0.96);
}

/* 图标弹跳（切换状态时触发） */
.detail-cook-btn.is-cooked .cook-btn-icon {
  animation: cookBounce 0.45s ease;
}

@keyframes cookBounce {
  0%   { transform: scale(1); }
  25%  { transform: scale(1.35); }
  50%  { transform: scale(0.9); }
  75%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}

/* 移动端 FAB 同款动效 */
.fab-btn--cooked .fab-btn__icon {
  animation: cookBounce 0.45s ease;
}
```

**动效触发时机**：仅当从"未做过" → "已做过"时触发（即 `isCooked` 从 `false` 变为 `true` 时）。从"已做过" → "未做过"不触发动效。

### 3.4 暗色模式

```css
/* ═══════════════════════════════════════════════════════════════
   "我做过" — 暗色模式
   ═══════════════════════════════════════════════════════════════ */

body.dark .detail-cook-btn {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text, #e0e0ee);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

body.dark .detail-cook-btn:hover:not(:disabled) {
  border-color: var(--color-cooked, #52c41a);
  color: var(--color-cooked-text, #81c784);
  background: var(--color-card, #1e1e32);
}

body.dark .detail-cook-btn.is-cooked {
  background: var(--color-cooked-bg, #1b3a1b);
  border-color: var(--color-cooked-border, #4caf50);
  color: var(--color-cooked-text, #81c784);
}

body.dark .detail-cook-btn.is-cooked:hover:not(:disabled) {
  background: #1f4a1f;
  border-color: #66bb6a;
  color: #a5d6a7;
}

/* 移动端 FAB 暗色 */
body.dark .fab-btn--cooked {
  background: var(--color-cooked-bg, #1b3a1b);
  color: var(--color-cooked-text, #81c784);
}

body.dark .fab-btn--cooked:hover,
body.dark .fab-btn--cooked:active {
  background: #1f4a1f;
  color: #a5d6a7;
}
```

---

## 4. 用户主页 — "我的烹饪"标签页

### 4.1 Tab 按钮

**位置**：在现有 `.profile-tabs` 中，追加在 `forks` tab 之后。

```tsx
<button
  className={`profile-tab ${activeTab === 'cooked' ? 'profile-tab--active' : ''}`}
  onClick={() => setActiveTab('cooked')}
>
  🍳 我的烹饪
  {cookedTotal > 0 && (
    <span className="profile-tab__count">({cookedTotal})</span>
  )}
</button>
```

**布局**：复用现有 `.profile-tab` 样式，无需新增 CSS。`count` 使用 `.profile-tab__count`（灰色小字）。

### 4.2 内容区 HTML 结构

```tsx
{activeTab === 'cooked' && (
  <>
    {cookedLoading ? (
      <div className="profile-grid">
        {[1, 2, 3].map(i => (
          <div key={i} className="profile-card-skeleton">
            <div className="skeleton-box skeleton-cover" />
            <div className="skeleton-box skeleton-line" style={{ margin: '12px 14px' }} />
          </div>
        ))}
      </div>
    ) : cookedRecipes.length === 0 ? (
      <EmptyState
        icon="🍳"
        title="还没有做过任何食谱"
        desc="去探索美食，开始你的烹饪之旅吧"
        variant="compact"
        ctaText="去探索食谱"
        ctaLink="/"
      />
    ) : (
      <>
        <div className="profile-grid">
          {cookedRecipes.map(item => (
            <div key={item.recipeId} className="profile-recipe-wrapper">
              <RecipeCard recipe={{
                id: item.recipeId,
                title: item.title,
                coverImage: item.coverImage,
                category: item.category,
              }} />
              {/* 烹饪元信息 */}
              <div className="cooked-card-meta">
                <span className="cooked-meta-count">
                  👨‍🍳 做过 {item.cookCount} 次
                </span>
                <span className="cooked-meta-date">
                  上次: {new Date(item.lastCookedAt).toLocaleDateString('zh-CN', {
                    year: 'numeric', month: 'short', day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 分页 */}
        <Pagination
          current={cookedPage}
          total={Math.ceil(cookedTotal / cookedPageSize)}
          onChange={(p) => {
            setCookedPage(p)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      </>
    )}
  </>
)}
```

### 4.3 烹饪元信息样式

```css
/* ═══════════════════════════════════════════════════════════════
   "我的烹饪" — 食谱卡片烹饪元信息
   ═══════════════════════════════════════════════════════════════ */

.cooked-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px 12px;
  font-size: 12px;
  color: var(--color-text-secondary, #666);
  border-top: 1px solid var(--color-border, #e8e0d8);
  margin-top: -8px; /* 与 RecipeCard 底部贴合 */
}

.cooked-meta-count {
  color: var(--color-cooked, #52c41a);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.cooked-meta-date {
  font-size: 11px;
  color: var(--color-text-muted, #999);
}

/* ═══ 暗色模式 ═══ */
body.dark .cooked-card-meta {
  border-top-color: var(--color-border, #2e2e48);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .cooked-meta-count {
  color: var(--color-cooked-text, #81c784);
}

body.dark .cooked-meta-date {
  color: var(--color-text-muted, #686880);
}
```

### 4.4 空腹件

复用现有 `<EmptyState>` 组件，使用 `variant="compact"`（已在 UserProfilePage 中用于收藏/发布空状态）。

```tsx
<EmptyState
  icon="🍳"
  title="还没有做过任何食谱"
  desc="去探索美食，开始你的烹饪之旅吧"
  variant="compact"
  ctaText="去探索食谱"
  ctaLink="/"
/>
```

`global.css` 和 `EmptyState.css` 已覆盖该组件的暗色模式，无需额外样式。

---

## 5. 快捷创建烹饪日志入口

### 5.1 触发条件

仅当同时满足以下两个条件时显示：
1. 当前用户已做过该食谱（`isCooked === true`）
2. 视口宽度 ≤ 768px（移动端 FAB）

### 5.2 入口 UI

参见 §3.2 移动端 HTML 结构。按钮直接使用现有 `.fab-btn`，无需新样式。

### 5.3 跳转逻辑

点击后路由跳转至 `/cooking-journal?recipeId=${id}`，由 `CookingJournalPage` 读取 URL 参数 `recipeId` 预填食谱。

---

## 6. 完整 CSS 文件引用

以上所有样式追加至：

| 文件 | 追加内容 |
|------|----------|
| `frontend/src/pages/RecipeDetailPage.css` | §3.1 桌面端按钮、§3.3 动效、§3.4 暗色 |
| `frontend/src/pages/UserProfilePage.css` | §4.3 烹饪元信息、§4.3 暗色 |

无需新增 CSS 文件，遵循项目现有单文件样式模式。

---

## 7. 状态管理数据流

### 7.1 RecipeDetailPage 新增 State

```typescript
const [isCooked, setIsCooked] = useState(false)
const [cookCount, setCookCount] = useState(0)
const [totalCookedCount, setTotalCookedCount] = useState(0)
const [cookLoading, setCookLoading] = useState(false)
```

### 7.2 组件内新增 API 调用

```typescript
// 初始化加载 — 与 getFavoriteStatus 并行
useEffect(() => {
  if (!id) return
  // 现有：fetch favorite status
  // 新增：
  fetchCookStatus()
}, [id])

const fetchCookStatus = async () => {
  try {
    const status = await getCookStatus(id)
    setIsCooked(status.isCooked)
    setCookCount(status.count)
    setTotalCookedCount(status.totalCookedCount)
  } catch {
    // 静默失败，未登录等场景不影响页面渲染
    setIsCooked(false)
    setCookCount(0)
    setTotalCookedCount(0)
  }
}
```

### 7.3 点击切换 handler

```typescript
const handleCookToggle = async () => {
  if (!isAuthenticated) {
    toast.info('请先登录')
    navigate('/login')
    return
  }

  setCookLoading(true)
  const prevIsCooked = isCooked
  const prevCount = cookCount

  // Optimistic UI
  try {
    if (isCooked) {
      // 取消标记
      setIsCooked(false)
      setCookCount(0)
      setTotalCookedCount(prev => Math.max(0, prev - 1))
      await uncookRecipe(id)
      toast.success('已取消标记')
    } else {
      // 标记做过
      setIsCooked(true)
      setCookCount(1)
      setTotalCookedCount(prev => prev + 1)
      const res = await cookRecipe(id)
      setCookCount(res.count)
      toast.success('已标记为做过')
    }
  } catch {
    // 回滚
    setIsCooked(prevIsCooked)
    setCookCount(prevCount)
    toast.error('操作失败，请重试')
  } finally {
    setCookLoading(false)
  }
}
```

### 7.4 UserProfilePage 新增 State

```typescript
// "我的烹饪" tab
const [cookedRecipes, setCookedRecipes] = useState<CookedRecipeItem[]>([])
const [cookedTotal, setCookedTotal] = useState(0)
const [cookedLoading, setCookedLoading] = useState(false)
const [cookedPage, setCookedPage] = useState(1)
const cookedPageSize = 20
```

---

## 8. 响应式断点总览

| 断点 | 宽度 | "我做过"按钮表现 |
|------|------|-----------------|
| Desktop | ≥769px | `detail-cover-actions` 内，玻璃态按钮 + 文字 |
| Tablet | 481–768px | `floating-action-bar` FAB，仅图标 + 简短文字 |
| Mobile | ≤480px | 同 FAB，padding 缩小适配窄屏 |

移动端 FAB 的行为已在 `RecipeDetailPage.css` 中全部处理好（`@media (max-width: 768px)` 显示 `floating-action-bar`），新按钮直接插入即可。

---

## 9. 验收对照

| 验收项 | 实现位置 | 状态 |
|--------|----------|------|
| AC-1: 桌面端显示按钮 + 总人数 | `detail-cover-actions` 内 `detail-cook-btn` | ✅ |
| AC-2: 点击变绿 + Toast | `handleCookToggle` + optimistic UI | ✅ |
| AC-3: 再次点击取消 | 同上 | ✅ |
| AC-4: 重复做 count++ | 后端幂等逻辑，前端显示最新 count | ✅ |
| AC-5: 移动端"写日志"入口 | `floating-action-bar` 内 conditional Link | ✅ |
| AC-6: 用户主页"我的烹饪" | `profile-tabs` 新 tab + `profile-grid` | ✅ |
| AC-7: 空状态 | `<EmptyState icon="🍳">` | ✅ |
| AC-8: 未登录提示 | `useAuth` 判断 + toast | ✅ |
| NFR-4: 暗色模式 | `body.dark` 下全组件覆盖 | ✅ |
| NFR-5: 移动端适配 | FAB + `@media (max-width: 768px)` | ✅ |

---

## 10. API 函数引用（前端 api.ts）

已在 PRD §3.4 定义，无需重复。关键类型：

```typescript
// api.ts 中已定义的接口
export interface CookStatus {
  isCooked: boolean
  count: number
  lastCookedAt: string | null
  totalCookedCount: number
}

export interface CookedRecipeItem {
  recipeId: string
  title: string
  coverImage: string | null
  category: string | null
  cookCount: number
  lastCookedAt: string
}

export function getCookStatus(recipeId: string): Promise<CookStatus>
export function cookRecipe(recipeId: string): Promise<CookActionResponse>
export function uncookRecipe(recipeId: string): Promise<void>
export function getCookedRecipes(userId: string, params: { page?: number; pageSize?: number }): Promise<CookedRecipesResponse>
```

---

## 11. 改动文件清单

| 文件 | 改动类型 | 改动内容 |
|------|----------|----------|
| `frontend/src/api.ts` | 追加 | 4 个新函数（如 PRD 定义，可能已完成） |
| `frontend/src/pages/RecipeDetailPage.tsx` | 修改 | 追加 cook state、handler、JSX（desktop + mobile） |
| `frontend/src/pages/RecipeDetailPage.css` | 追加 | §§ 3.1–3.4 全部样式 |
| `frontend/src/pages/UserProfilePage.tsx` | 修改 | 追加 cooked tab + 内容区 |
| `frontend/src/pages/UserProfilePage.css` | 追加 | §§ 4.3–4.4 烹饪元信息样式 |
| `frontend/src/global.css` | 可选 | 追加 `--color-cooked-*` token |