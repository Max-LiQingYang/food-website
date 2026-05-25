# 迭代#47 PRD: UI/UX 移动端体验增强

## 优先级划分

### P0 — 必须做（严重影响移动端用户体验）
1. **MobileBottomNav 手势导航使用 React Router** — 当前左右滑动用 `window.location.href` 导致全页刷新，应改为 `useNavigate()`
2. **MobileBottomNav 滚动隐藏/显示** — 添加 scroll hide/show 行为，让内容区真正全屏可见
3. **搜索页面移动端筛选器** — 移动端筛选改为底部抽屉式面板替代侧栏
4. **RecipeDetailPage 步骤左右滑动 + 箭头导航** — 添加触摸滑动切换步骤 + 上一页/下一页箭头按钮

### P1 — 值得做（提升移动端精致度）
5. **移动端安全区(safe-area-inset)覆盖完整性检查** — 确保所有 fixed 元素都有安全区 padding
6. **Tab 切换动画** — MobileBottomNav 切换时微妙的缩放/颜色过渡

## P0 实现方案

### 1. MobileBottomNav 手势修复
- 将 `window.location.href = targetPath` 改为 `navigate(targetPath)`
- 引入 `useNavigate()` hook

### 2. Scroll hide/show
- 新增 `useScrollHide` hook（或内联逻辑）：监听 scroll 方向，向下滚动隐藏 nav，向上滚动显示
- 使用 CSS transform translateY(100%) 实现隐藏动画（不影响布局性能）
- transition 300ms ease

### 3. 搜索移动端筛选器
- 新增 `FilterDrawer` 组件：从底部滑出的面板，半透明遮罩
- 移动端（<=480px）时筛选按钮显示在搜索框下方
- 点击筛选按钮从底部弹出抽屉
- 抽屉内：分类下拉、难度选择、排序方式

### 4. 步骤滑动 + 箭头
- 步骤区域绑定 onTouchStart/onTouchMove/onTouchEnd
- 左滑→下一个步骤，右滑→上一个步骤
- 步骤底部新增左右箭头按钮（同时兼容桌面端）

## 测试方案
1. MobileBottomNav 手势不触发全页刷新验证
2. 搜索页面移动端筛选器弹出/关闭
3. RecipeDetailPage 步骤滑动切换
4. 响应式布局在不同断点下的渲染