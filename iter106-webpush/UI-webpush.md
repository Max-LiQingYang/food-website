# UI 设计规范 — Web Push 推送通知系统 (iter106-webpush)

> **范围**：`frontend/src/components/PushSubscriptionPrompt.tsx`(新增) + `frontend/src/pages/SettingsPage.tsx`(通知 Tab 重构) + `frontend/src/components/NotificationBell.tsx`(图标映射补充)
> **版本**：v1 · 2026-06-08
> **设计语言**：延续项目现有暖橙主色 (`--color-primary: #e8663e`)、米白底色、暗色 `body.dark` 选择器、BEM 命名 + 0.2s/0.3s 动效
> **后端依据**：`prd/PRD-notification-system.md` v2.0 + `frontend/src/api.ts` 已有 `getNotificationPreferences / updateNotificationPreferences / getPushSubscriptions / registerPushSubscription / unregisterPushSubscription` 函数

---

## 0. 关键发现 & 决策点

| 议题 | 现状 | 决策 |
|------|------|------|
| 通知偏好数据模型 | 后端 `notificationPreferences` JSON 字段，键为 `follow/comment/reply/favorite/achievement_unlock/system`，值为 `{inApp: boolean, push: boolean}` | UI 直接对位这 6 个键 + 2 列开关结构 |
| `updateNotificationPrefs` 旧 API | `SettingsPage.tsx:2066` 旧版 4 键 (`commentReply/followUpdate/challenge/system`) | UI 重构后**仍兼容旧后端**——若新键 PUT 失败回退旧键；新 UI 优先调用 `updateNotificationPreferences` |
| 现有图标表 `NOTIF_ICONS` | `NotificationBell.tsx:11-22` 已有 10 种类型 `follow/comment/reply/favorite/collection_add/meal_plan_reminder/cooking_log_reminder/achievement_unlock/challenge_update/system` | **已覆盖全部 10 种**，无需新增（仅补 1 个 inline 风格锁图标 `🔒` 用于隐私示意）。下方 §4 详列 |
| 现有 toggle-btn 样式 | `SettingsPage.css:142-167` 圆角胶囊按钮 + `on/off` 状态色 | **新建专用 `.channel-toggle` 滑动开关**（iOS/Material 风格），与旧胶囊并存；旧 `.toggle-btn` 仍可保留给其他设置项 |
| Service Worker `push` 事件 | `sw.js` 当前未实现 push handler | UI 不涉及 SW 实现，仅展示浏览器权限态（依赖 `Notification.permission` + `navigator.serviceWorker.ready`） |
| VAPID 公共密钥 | 未生成/配置（任务中未提及） | UI 在"未配置"场景降级为禁用"开启推送"按钮 + 灰色提示文案 |
| 暗色模式 | 项目统一用 `body.dark` 选择器 | 所有新增样式遵守：浅色用 `var(--color-*)`、深色用 `body.dark .class { ... }` 覆写 |
| 移动端 | 已有 `@media (max-width: 480px)` 断点 + `safe-area-inset-bottom` 在 Toast 已用 | 卡片底部 padding 兼容 `env(safe-area-inset-bottom)`；按钮最小 44×44px 触摸区 |
| 三种订阅状态 | PRD 描述"未决定 / 已授权 / 已拒绝"，但浏览器原生只有 `default/granted/denied` | **新增本地状态 `dismissed`**（用户点"稍后再说"），合并为 4 态：默认 / 已授权 / 已拒绝 / 已忽略 |
| `Notification.permission` 不支持 | 老旧浏览器 / iOS 16.4 之前 Safari 无 Push API | UI 顶部权限状态卡片显示"不支持"，开关列隐藏 push 开关列 |
| 推送订阅数量 | `getPushSubscriptions()` 返回数组（用户多设备多端点） | "取消订阅推送"按钮**批量取消所有端点**（弹确认 toast/二次确认） |

---

## 1. PushSubscriptionPrompt 推送订阅提示组件

### 1.1 组件契约

```tsx
// frontend/src/components/PushSubscriptionPrompt.tsx
import './PushSubscriptionPrompt.css'

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported' | 'dismissed'

export interface PushSubscriptionPromptProps {
  /** 浏览器原生权限态 */
  permission: PushPermissionState
  /** 用户点击"稍后再说" */
  onDismiss?: () => void
  /** 用户点击"开启推送"，组件内部已订阅并 registerPushSubscription；返回 success/error */
  onSubscribe?: () => Promise<void>
  /** 用户点击"前往浏览器设置"（denied 态时显示） */
  onOpenBrowserSettings?: () => void
  /** 当前是否正在订阅（按钮 loading） */
  subscribing?: boolean
  /** 关闭整个提示（用户主动关闭抽屉/页面卸载时） */
  onClose?: () => void
  className?: string
}

export default function PushSubscriptionPrompt({ ... }: PushSubscriptionPromptProps) {
  // 1. 根据 permission 渲染不同 variant
  // 2. granted: 显示绿色 ✓ "已开启推送"
  // 3. denied: 显示 ⚠ "推送已关闭，前往浏览器设置"
  // 4. unsupported: 灰色禁用，显示"当前浏览器不支持"
  // 5. default / dismissed: 显示推广卡片 + 2 按钮
}
```

### 1.2 4 种状态视觉规范

#### 1.2.1 状态：未决定 / 已忽略（default / dismissed）— 推广卡片

```
┌──────────────────────────────────────────────────────────┐
│  🔔  开启浏览器推送                                [✕]   │
│                                                          │
│  不会再错过重要动态：新评论、关注、成就解锁第一时间       │
│  通知你，可随时关闭。                                     │
│                                                          │
│  ┌──────────────┐   ┌──────────────┐                     │
│  │ 开启推送     │   │ 稍后再说     │                     │
│  └──────────────┘   └──────────────┘                     │
└──────────────────────────────────────────────────────────┘
```

- 背景：浅色 `var(--color-primary-bg)` 渐变到 `#fff`；深色 `var(--color-primary-bg)` 渐变到 `var(--color-card)`
- 左边竖条装饰：4px 宽 `var(--color-primary)`
- 图标容器：48×48 圆形 `var(--color-primary-bg)`，内嵌 🔔 emoji 32px
- 主按钮：填充 `var(--color-primary)` 白字 圆角 10px 高度 40px（移动端 44px）
- 次按钮：白底 + `var(--color-border)` 边框 + `var(--color-text-secondary)` 字
- 关闭按钮 [✕]：右上角 32×32 透明 hover 背景 `var(--color-bg-hover)`

#### 1.2.2 状态：已授权（granted）— 成功状态

```
┌──────────────────────────────────────────────────────────┐
│  ✅  浏览器推送已开启                                [✕] │
│                                                          │
│  新评论、回复、关注、成就将立即推送到你的设备。           │
│  当前订阅端点：1 个（Chrome / macOS）                    │
│                                                          │
│  ┌────────────────────────┐                             │
│  │ 取消订阅推送           │                             │
│  └────────────────────────┘                             │
└──────────────────────────────────────────────────────────┘
```

- 背景：浅色 `#f6ffed`（success-bg）深色 `rgba(82,196,26,0.08)`
- 左边竖条装饰：4px 宽 `var(--color-success)`
- 图标：✅ 绿色圆形背景
- 主按钮变次级：白底 + 红色边框 `var(--color-error)` + 红色字 "取消订阅推送"（危险操作风格）

#### 1.2.3 状态：已拒绝（denied）— 警示状态

```
┌──────────────────────────────────────────────────────────┐
│  ⚠️  浏览器推送已关闭                                [✕] │
│                                                          │
│  你已禁止浏览器推送通知。如需重新开启：                    │
│  点击地址栏左侧 🔒 图标 → 网站设置 → 通知 → 允许          │
│                                                          │
│  ┌────────────────────────┐                             │
│  │ 复制设置指引           │                             │
│  └────────────────────────┘                             │
└──────────────────────────────────────────────────────────┘
```

- 背景：浅色 `#fff7e6`（warning-bg）深色 `rgba(250,173,20,0.08)`
- 左边竖条装饰：4px 宽 `var(--color-warning)`
- 图标：⚠️ 黄色
- 按钮变"复制设置指引"——点击复制分段指引文本到剪贴板并 toast 提示

#### 1.2.4 状态：不支持（unsupported）— 禁用状态

```
┌──────────────────────────────────────────────────────────┐
│  ℹ️  当前浏览器不支持推送通知                       [✕] │
│                                                          │
│  请使用最新版本的 Chrome / Edge / Firefox /             │
│  Safari 16.4+ 获得推送体验。                             │
│  你仍可接收站内通知。                                     │
└──────────────────────────────────────────────────────────┘
```

- 背景：浅色 `var(--color-bg-secondary)` 灰
- 左边竖条装饰：4px 宽 `var(--color-text-muted)`
- 图标：ℹ️ 灰色
- **不渲染任何按钮**，仅展示信息

### 1.3 BEM 命名

```
.push-prompt                        // 容器
.push-prompt--default               // 变体：未决定/已忽略
.push-prompt--granted               // 变体：已授权
.push-prompt--denied                // 变体：已拒绝
.push-prompt--unsupported           // 变体：不支持
.push-prompt--dismissing            // 关闭中（动画中）

.push-prompt__close                 // 右上 ✕
.push-prompt__icon                  // 左侧图标容器
.push-prompt__icon--granted         // 绿色背景
.push-prompt__icon--denied          // 黄色背景
.push-prompt__icon--unsupported     // 灰色背景
.push-prompt__body                  // 内容区
.push-prompt__title                 // 标题行
.push-prompt__desc                  // 描述段落
.push-prompt__endpoint              // "当前订阅端点"次要行
.push-prompt__actions               // 按钮组
.push-prompt__btn                   // 通用按钮
.push-prompt__btn--primary          // 主按钮
.push-prompt__btn--secondary        // 次按钮
.push-prompt__btn--danger           // 危险按钮（取消订阅）
```

### 1.4 状态管理

```tsx
// 父组件（SettingsPage）持有订阅源真相
const [permission, setPermission] = useState<PushPermissionState>('default')
const [subscribing, setSubscribing] = useState(false)
const [subscriptions, setSubscriptions] = useState<PushSubscriptionInfo[]>([])
const [dismissed, setDismissed] = useState(false)  // 用户点"稍后再说"

// 初始加载
useEffect(() => {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    setPermission('unsupported')
    return
  }
  setPermission(Notification.permission)  // 'default' | 'granted' | 'denied'
  // 拉取已订阅端点（用于 granted 态显示）
  if (Notification.permission === 'granted') {
    getPushSubscriptions().then(setSubscriptions).catch(() => {})
  }
}, [])

// 显示条件：permission === 'default' || 'denied' || 'unsupported'
// 或 (permission === 'granted' && subscriptions.length > 0) → 也显示但变体为 granted
// dismissed 后 24h 内不再展示（localStorage 存 timestamp）

// 订阅流程
async function handleSubscribe() {
  if (subscribing) return
  setSubscribing(true)
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY  // 从 .env 注入
    })
    await registerPushSubscription({
      endpoint: sub.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(sub.getKey('p256dh')!),
        auth: arrayBufferToBase64(sub.getKey('auth')!),
      },
      userAgent: navigator.userAgent,
    })
    setPermission('granted')
    showToast('推送订阅成功', 'success')
  } catch (err) {
    showToast('订阅失败，请检查浏览器设置', 'error')
  } finally {
    setSubscribing(false)
  }
}

// 取消订阅
async function handleUnsubscribe() {
  if (!confirm('确认取消浏览器推送？新评论和关注将不再弹窗通知。')) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
    await Promise.all(subscriptions.map(s => unregisterPushSubscription(s.id)))
    setSubscriptions([])
    setPermission('default')
    showToast('已取消推送订阅', 'success')
  } catch (err) {
    showToast('取消失败', 'error')
  }
}
```

### 1.5 出现/消失动画

```css
@keyframes pushPromptEnter {
  from { opacity: 0; transform: translateY(-12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes pushPromptExit {
  from { opacity: 1; transform: translateY(0); max-height: 400px; }
  to   { opacity: 0; transform: translateY(-8px); max-height: 0; padding: 0; margin: 0; }
}

.push-prompt {
  animation: pushPromptEnter 0.3s ease;
}
.push-prompt--dismissing {
  animation: pushPromptExit 0.25s ease forwards;
  overflow: hidden;
}

@media (prefers-reduced-motion: reduce) {
  .push-prompt, .push-prompt--dismissing { animation: none; }
}
```

### 1.6 响应式

```css
/* 桌面 (默认) */
.push-prompt {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px;
  border-radius: 14px;
  position: relative;
  overflow: hidden;
}
.push-prompt::before {  /* 左边竖条 */
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  background: var(--color-primary);
}
.push-prompt--granted::before { background: var(--color-success); }
.push-prompt--denied::before  { background: var(--color-warning); }
.push-prompt--unsupported::before { background: var(--color-text-muted); }

.push-prompt__actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.push-prompt__btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  min-width: 110px;
}

.push-prompt__btn--primary {
  background: var(--color-primary);
  color: #fff;
}
.push-prompt__btn--primary:hover { background: var(--color-primary-dark); }
.push-prompt__btn--primary:disabled {
  opacity: 0.6; cursor: wait;
}
.push-prompt__btn--secondary {
  background: var(--color-card);
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}
.push-prompt__btn--secondary:hover { color: var(--color-text); border-color: var(--color-text-muted); }
.push-prompt__btn--danger {
  background: var(--color-card);
  color: var(--color-error);
  border-color: var(--color-error);
}
.push-prompt__btn--danger:hover { background: var(--color-error); color: #fff; }

.push-prompt__close {
  position: absolute;
  top: 12px; right: 12px;
  width: 32px; height: 32px;
  border: none; background: transparent;
  border-radius: 8px;
  font-size: 1.1rem;
  color: var(--color-text-muted);
  cursor: pointer;
}
.push-prompt__close:hover { background: var(--color-bg-hover); color: var(--color-text); }

/* 移动端 */
@media (max-width: 480px) {
  .push-prompt {
    padding: 16px;
    border-radius: 12px;
  }
  .push-prompt__icon { width: 40px; height: 40px; font-size: 1.4rem; }
  .push-prompt__actions {
    flex-direction: column-reverse;  /* 次按钮在上（iOS 推荐） */
    gap: 8px;
  }
  .push-prompt__btn {
    width: 100%;
    height: 44px;  /* 触摸标准 */
    min-width: 0;
  }
  .push-prompt__title { font-size: 0.95rem; }
  .push-prompt__desc  { font-size: 0.85rem; line-height: 1.5; }
  .push-prompt__close { top: 8px; right: 8px; }
}
```

### 1.7 暗色模式

```css
body.dark .push-prompt--default {
  background: linear-gradient(135deg, var(--color-primary-bg), var(--color-card));
}
body.dark .push-prompt--granted {
  background: linear-gradient(135deg, rgba(82,196,26,0.12), var(--color-card));
}
body.dark .push-prompt--denied {
  background: linear-gradient(135deg, rgba(250,173,20,0.10), var(--color-card));
}
body.dark .push-prompt--unsupported {
  background: var(--color-bg-secondary);
}
body.dark .push-prompt__btn--secondary {
  background: var(--color-bg-secondary);
  border-color: var(--color-border);
}
body.dark .push-prompt__icon {
  filter: brightness(0.95);
}
```

---

## 2. SettingsPage 通知 Tab 重构

### 2.1 布局结构（最终目标态）

```
┌──────────────────────────────────────────────────────┐
│ 通知偏好                                              │
│                                                       │
│ ┌────────────────────────────────────────────────┐    │
│ │ 🔔  浏览器推送状态                              │    │  ← 权限状态卡片
│ │     当前状态：已开启  ·  订阅端点：1 个         │    │     （per §1 变体）
│ │     [取消订阅推送]                              │    │
│ └────────────────────────────────────────────────┘    │
│                                                       │
│ 按通知类型设置：                                       │
│ ┌────────────────────────────────────────────────┐    │
│ │ 通知类型        站内通知 (In-App)   推送 (Push)│    │  ← 列头
│ ├────────────────────────────────────────────────┤    │
│ │ 👤 关注          [开关]            [开关]      │    │
│ │ 💬 评论          [开关]            [开关]      │    │
│ │ ↩️ 回复          [开关]            [开关]      │    │
│ │ ❤️ 收藏          [开关]            [开关]      │    │
│ │ 🏆 成就解锁      [开关]            [开关]      │    │
│ │ 🔔 系统通知      [开关]            [开关]      │    │
│ └────────────────────────────────────────────────┘    │
│                                                       │
│ 提示：取消勾选推送后，仍可在站内消息中心查看。        │
└──────────────────────────────────────────────────────┘
```

### 2.2 行结构详解

每行使用 `settings-notif-row` 类，三栏 Grid：

| 列 | 宽度 | 内容 |
|----|------|------|
| 1 类型 | 40% | 图标 emoji + 名称 + 描述子标题 |
| 2 站内 | 30% | 滑动开关 `<Toggle>` 组件 |
| 3 推送 | 30% | 滑动开关 `<Toggle>` 组件（推送列在浏览器拒绝时 disabled 并显示 🔒 锁图标） |

**示例 6 行数据**：

```ts
const NOTIFICATION_TYPES = [
  { key: 'follow',              icon: '👤', name: '关注',          desc: '有人关注你时通知' },
  { key: 'comment',             icon: '💬', name: '评论',          desc: '有人评论你的食谱时通知' },
  { key: 'reply',               icon: '↩️', name: '回复',          desc: '有人回复你的评论时通知' },
  { key: 'favorite',            icon: '❤️', name: '收藏',          desc: '有人收藏你的食谱时通知' },
  { key: 'achievement_unlock',  icon: '🏆', name: '成就解锁',      desc: '解锁新成就时通知' },
  { key: 'system',              icon: '🔔', name: '系统通知',      desc: '系统公告与维护通知' },
] as const
```

### 2.3 Toggle 滑动开关组件（新建复用）

```tsx
// frontend/src/components/Toggle.tsx
export interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'                // sm = 32x18, md = 44x24
  ariaLabel?: string
  loading?: boolean
  className?: string
}

// 用法
<Toggle
  checked={prefs.follow.inApp}
  onChange={(v) => updatePref('follow', 'inApp', v)}
  ariaLabel="关注 - 站内通知"
  size="md"
/>
<Toggle
  checked={prefs.follow.push}
  onChange={(v) => updatePref('follow', 'push', v)}
  disabled={permission !== 'granted'}
  ariaLabel="关注 - 推送通知"
  size="md"
/>
```

**Toggle 视觉**：

- 关闭态：轨道 `#d0c8c0` (浅) / `#3e3e58` (深)，圆点 `var(--color-card)` 居左
- 开启态：轨道 `var(--color-primary)`，圆点居右
- Disabled：轨道 `var(--color-bg-secondary)` 透明度 0.5
- 尺寸 sm：轨道 32×18，圆点 14×14，translateX(14px) 开启
- 尺寸 md：轨道 44×24，圆点 20×20，translateX(20px) 开启
- 过渡：0.2s ease（圆点 + 轨道同色切换）

```css
.toggle {
  position: relative;
  display: inline-block;
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
}
.toggle--md .toggle__track { width: 44px; height: 24px; }
.toggle--sm .toggle__track { width: 32px; height: 18px; }

.toggle__track {
  background: var(--color-input-border);
  border-radius: 999px;
  transition: background 0.2s ease;
  position: relative;
}
.toggle__thumb {
  position: absolute;
  top: 2px; left: 2px;
  background: var(--color-card);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.2s ease;
}
.toggle--md .toggle__thumb { width: 20px; height: 20px; }
.toggle--sm .toggle__thumb { width: 14px; height: 14px; }

.toggle--on .toggle__track { background: var(--color-primary); }
.toggle--md.toggle--on .toggle__thumb { transform: translateX(20px); }
.toggle--sm.toggle--on .toggle__thumb { transform: translateX(14px); }

.toggle--disabled { cursor: not-allowed; opacity: 0.5; }
.toggle--loading .toggle__thumb {
  animation: togglePulse 1.2s ease-in-out infinite;
}
@keyframes togglePulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.5; }
}

body.dark .toggle--on .toggle__track { background: var(--color-primary-light); }

/* Touch target: 实际可点击区域 ≥ 44x44 */
.toggle::after {
  content: '';
  position: absolute;
  inset: -10px;
}
```

### 2.4 BEM 命名（SettingsPage 通知 Tab 局部）

```
.settings-notif                          // 整个通知 Tab 容器
.settings-notif__permission              // 顶部权限状态卡片
.settings-notif__permission--granted
.settings-notif__permission--denied
.settings-notif__permission--default
.settings-notif__permission-icon
.settings-notif__permission-text
.settings-notif__permission-meta         // "订阅端点：1 个"
.settings-notif__actions                 // 卡片内操作按钮组

.settings-notif__table                   // 6 行类型表
.settings-notif__table-header            // 列表头
.settings-notif__table-header-cell       // 表头单元格
.settings-notif__table-row               // 单行
.settings-notif__table-row--disabled     // 整行禁用（unsupported 时）
.settings-notif__cell-type               // 类型列
.settings-notif__cell-icon               // 类型图标
.settings-notif__cell-name               // 类型名
.settings-notif__cell-desc               // 类型描述
.settings-notif__cell-channel            // 渠道列（inApp / push）
.settings-notif__cell-lock               // push 列在 denied 时显示的 🔒 提示
```

### 2.5 SettingsPage.tsx 改造点（仅规划，**不写代码**）

| 位置 | 改动 |
|------|------|
| `Settings` interface | 替换 `notifications: { commentReply, followUpdate, challenge, system }` → `notifications: Record<NotifKey, { inApp, push }>` |
| `handleNotificationToggle` | 改为 `handleChannelToggle(type, channel)`，调用 `updateNotificationPreferences`（替代旧 `updateNotificationPrefs`） |
| Notifications Tab 渲染 | 顶部插入 `<PushSubscriptionPrompt />`（§1 组件） + 下方 `<table>` 渲染 6 行 × 2 列 `<Toggle>` |
| 删除旧 toggle 按钮 DOM | 移除 `settings-toggle` + `toggle-btn`（仅通知 Tab 内） |
| Loading/Empty 态 | 通知偏好拉取失败时回退"通用提示"——不阻断 UI |

### 2.6 SettingsPage.css 改造点

```css
/* 在 SettingsPage.css 末尾追加（不修改原有） */

/* 通知 Tab 专用：权限状态卡片 + 通知类型表 */
.settings-notif {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-notif__table {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 10px);
  overflow: hidden;
}

.settings-notif__table-header,
.settings-notif__table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  align-items: center;
  padding: 14px 16px;
  gap: 12px;
}

.settings-notif__table-header {
  background: var(--color-bg-secondary);
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.settings-notif__table-header-cell {
  text-align: center;
}
.settings-notif__table-header-cell:first-child {
  text-align: left;
}

.settings-notif__table-row {
  border-top: 1px solid var(--color-border);
  transition: background 0.2s ease;
}
.settings-notif__table-row:hover {
  background: var(--color-bg-hover);
}

.settings-notif__cell-type {
  display: flex;
  align-items: center;
  gap: 12px;
}
.settings-notif__cell-icon {
  font-size: 1.4rem;
  width: 32px;
  text-align: center;
}
.settings-notif__cell-name {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text);
}
.settings-notif__cell-desc {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.settings-notif__cell-channel {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
}
.settings-notif__cell-lock {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.settings-notif__table-row--disabled {
  opacity: 0.55;
}

/* 移动端：堆叠为卡片式 */
@media (max-width: 600px) {
  .settings-notif__table-header { display: none; }  /* 隐藏表头 */
  .settings-notif__table-row {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 14px;
  }
  .settings-notif__cell-channel {
    justify-content: space-between;
    padding: 6px 0;
    border-top: 1px dashed var(--color-border);
  }
  .settings-notif__cell-channel::before {
    content: attr(data-channel);
    font-size: 0.85rem;
    color: var(--color-text-secondary);
  }
}

/* 暗色 */
body.dark .settings-notif__table {
  background: var(--color-card);
  border-color: var(--color-border);
}
body.dark .settings-notif__table-header {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}
```

### 2.7 状态管理（伪代码）

```ts
type NotifKey = 'follow' | 'comment' | 'reply' | 'favorite' | 'achievement_unlock' | 'system'
type Channel = 'inApp' | 'push'
type Prefs = Record<NotifKey, { inApp: boolean; push: boolean }>

const DEFAULT_PREFS: Prefs = {
  follow:              { inApp: true, push: true },
  comment:             { inApp: true, push: true },
  reply:               { inApp: true, push: true },
  favorite:            { inApp: true, push: true },
  achievement_unlock:  { inApp: true, push: false },
  system:              { inApp: true, push: true },
}

const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
const [permission, setPermission] = useState<PushPermissionState>('default')
const [subscriptions, setSubscriptions] = useState<PushSubscriptionInfo[]>([])
const [savingChannels, setSavingChannels] = useState<Set<string>>(new Set())

async function updatePref(key: NotifKey, channel: Channel, value: boolean) {
  const next = { ...prefs, [key]: { ...prefs[key], [channel]: value } }
  setPrefs(next)  // 乐观更新
  const saveKey = `${key}.${channel}`
  setSavingChannels(s => new Set(s).add(saveKey))
  try {
    await updateNotificationPreferences(next)
  } catch {
    setPrefs(prefs)  // 回滚
    showToast('保存失败', 'error')
  } finally {
    setSavingChannels(s => { const n = new Set(s); n.delete(saveKey); return n })
  }
}
```

### 2.8 取消订阅推送按钮（卡片底部）

- **位置**：权限状态卡片（§1 组件）内右下角；或在独立 `<div class="settings-notif__danger-zone">` 内
- **样式**：次级按钮 `var(--color-card)` 底 + `var(--color-error)` 边框 + `var(--color-error)` 字（沿用 §1.2.2 风格）
- **显示条件**：`permission === 'granted' && subscriptions.length > 0`
- **二次确认**：`window.confirm('确认取消所有设备的浏览器推送？')` — iOS 风格用 `useConfirmDialog` 替换（项目已有 Toast 但未确认是否有 confirm hook）
- **成功后**：`setSubscriptions([])` + `setPermission('default')` + 卡片变体切回 default + toast "已取消推送订阅"

---

## 3. 动效规范汇总

| 元素 | 动效 | 时长 | 缓动 |
|------|------|------|------|
| Toggle 开关 | 圆点 + 轨道同色切换 | 0.2s | ease |
| PushPrompt 卡片出现 | opacity + translateY + scale | 0.3s | ease |
| PushPrompt 卡片关闭 | opacity + translateY + max-height 折叠 | 0.25s | ease |
| 表格行 hover | 背景色 | 0.2s | ease |
| 通知类型行初次进入 | 同 `fadeIn`（沿用） | 0.3s | ease |
| `prefers-reduced-motion: reduce` | 全部禁用 | — | — |

---

## 4. 通知类型图标补全（NotificationBell）

### 4.1 现状审计

`NotificationBell.tsx:11-22` `NOTIF_ICONS` 已有 10 种类型：

```ts
const NOTIF_ICONS: Record<string, string> = {
  follow: '👤',
  comment: '💬',
  reply: '↩️',
  favorite: '❤️',
  collection_add: '📂',
  meal_plan_reminder: '⏰',
  cooking_log_reminder: '📝',
  achievement_unlock: '🏆',
  challenge_update: '🏅',
  system: '🔔',
}
```

**结论：全部 10 种类型已有图标，无需新增。** 但建议补充 fallback + A11y 文本：

```ts
const NOTIF_ICONS: Record<string, { emoji: string; label: string }> = {
  follow:              { emoji: '👤', label: '关注' },
  comment:             { emoji: '💬', label: '评论' },
  reply:               { emoji: '↩️', label: '回复' },
  favorite:            { emoji: '❤️', label: '收藏' },
  collection_add:      { emoji: '📂', label: '加入收藏夹' },
  meal_plan_reminder:  { emoji: '⏰', label: '膳食计划提醒' },
  cooking_log_reminder:{ emoji: '📝', label: '烹饪日志提醒' },
  achievement_unlock:  { emoji: '🏆', label: '成就解锁' },
  challenge_update:    { emoji: '🏅', label: '挑战赛更新' },
  system:              { emoji: '🔔', label: '系统通知' },
}

// 渲染
<span className="notif-bell__item-icon" aria-label={meta.label} role="img">
  {meta.emoji}
</span>
```

### 4.2 提取为共享常量

为避免 SettingsPage 和 NotificationBell 重复定义，**新建**：

```ts
// frontend/src/constants/notificationTypes.ts
export interface NotifTypeMeta {
  key: string
  icon: string
  name: string
  desc: string
  /** 是否在通知偏好设置中提供开关（true=PRD 6 类型） */
  hasPref?: boolean
}

export const NOTIFICATION_TYPES: NotifTypeMeta[] = [
  { key: 'follow',              icon: '👤', name: '关注',          desc: '有人关注你时通知',                       hasPref: true },
  { key: 'comment',             icon: '💬', name: '评论',          desc: '有人评论你的食谱时通知',                 hasPref: true },
  { key: 'reply',               icon: '↩️', name: '回复',          desc: '有人回复你的评论时通知',                 hasPref: true },
  { key: 'favorite',            icon: '❤️', name: '收藏',          desc: '有人收藏你的食谱时通知',                 hasPref: true },
  { key: 'achievement_unlock',  icon: '🏆', name: '成就解锁',      desc: '解锁新成就时通知',                       hasPref: true },
  { key: 'system',              icon: '🔔', name: '系统通知',      desc: '系统公告与维护通知',                     hasPref: true },
  // 暂未提供偏好开关的类型（但仍可能在 Bell 中显示）：
  { key: 'collection_add',      icon: '📂', name: '加入收藏夹',    desc: '有人把你的食谱加入收藏夹时通知' },
  { key: 'meal_plan_reminder',  icon: '⏰', name: '膳食计划提醒',  desc: '你设置的膳食计划提醒' },
  { key: 'cooking_log_reminder',icon: '📝', name: '烹饪日志提醒',  desc: '提醒你记录今天的烹饪日志' },
  { key: 'challenge_update',    icon: '🏅', name: '挑战赛更新',    desc: '挑战赛进度或新赛季提醒' },
]

/** 仅在通知偏好中显示的 6 类型（PRD 对齐） */
export const PREF_NOTIF_KEYS = NOTIFICATION_TYPES.filter(t => t.hasPref).map(t => t.key)
// → ['follow', 'comment', 'reply', 'favorite', 'achievement_unlock', 'system']

/** 兜底图标（防止后端推送未知 type） */
export const FALLBACK_NOTIF_ICON = { icon: '🔔', name: '通知' }
```

### 4.3 NotificationBell.tsx 改造点（仅规划，**不写代码**）

| 位置 | 改动 |
|------|------|
| 顶部 import | `import { NOTIFICATION_TYPES, FALLBACK_NOTIF_ICON } from '../constants/notificationTypes'` |
| 删除本地 `NOTIF_ICONS` | 删除 `NotificationBell.tsx:11-22` 的 10 行 emoji map |
| 查找函数 | `const meta = NOTIFICATION_TYPES.find(t => t.key === item.type) ?? FALLBACK_NOTIF_ICON` |
| 渲染图标 | `<span aria-label={meta.name} role="img">{meta.icon}</span>` |
| 显示名（可选） | 在 hover tooltip 加上 `title={meta.name}` 提升可访问性 |

---

## 5. 跨组件交互流

### 5.1 用户首次进入设置页（未订阅路径）

```
用户进入 /settings → 切换到"通知"Tab
  → SettingsPage 拉取 getNotificationPreferences + getPushSubscriptions
  → 渲染 <PushSubscriptionPrompt permission={Notification.permission} />
     (若 Notification.permission === 'default' → 显示推广卡片)
  → 渲染 6 行 × 2 列 Toggle 表（inApp 开关全部可用，push 开关因 permission !== 'granted' 而 disabled）
  → 用户点击"开启推送"
     → PushSubscriptionPrompt 内部 onSubscribe() → 调用 pushManager.subscribe
     → 成功 → 调 registerPushSubscription → 更新 permission 状态为 'granted'
     → 卡片变体切到 .push-prompt--granted
     → 表格中所有 push 列 disabled 解除，状态保持关闭
     → 用户可逐个开启 push
  → 失败 → toast "订阅失败" + 卡片保持 default 不变
```

### 5.2 用户已拒绝浏览器权限（denied）

```
用户进入通知 Tab
  → PushSubscriptionPrompt 变体 = .push-prompt--denied
  → 表格 push 列 disabled + 显式 🔒 + tooltip "请先在浏览器中允许推送"
  → 用户可仍可调整 inApp 列（不受影响）
  → 用户点击"复制设置指引"
     → navigator.clipboard.writeText('1. 点击地址栏左侧 🔒 图标\n2. 网站设置\n3. 通知 → 允许')
     → toast "已复制到剪贴板"
```

### 5.3 用户在通知中心（/notifications）收到推送

```
浏览器显示系统通知 (由 sw.js push 事件触发) — 不在本文档范围
  → 用户点击通知 → sw.js notificationclick → clients.openWindow(item.link)
  → 页面跳转（已在 PRD 中定义）
  → NotificationBell 30s 轮询检测到新通知 → 数字角标 +1
```

### 5.4 用户主动取消订阅

```
用户在 PushSubscriptionPrompt(.push-prompt--granted) 点击"取消订阅推送"
  → confirm() 二次确认
  → handleUnsubscribe()：
     1. reg.pushManager.getSubscription().unsubscribe()
     2. 并行 unregisterPushSubscription(id) 所有端点
     3. setSubscriptions([]) + setPermission('default')
     4. 卡片变体切回 .push-prompt--default
     5. 表格 push 列重新 disabled
  → toast "已取消推送订阅"
```

---

## 6. 实施 Checklist（交付给前端开发）

> 本节为开发指引，**不写代码**。每项可单独 PR。

- [ ] 新建 `frontend/src/components/Toggle.tsx` + `Toggle.css`（复用组件）
- [ ] 新建 `frontend/src/components/PushSubscriptionPrompt.tsx` + `PushSubscriptionPrompt.css`（§1 完整实现）
- [ ] 新建 `frontend/src/constants/notificationTypes.ts`（§4.2 共享常量）
- [ ] 改造 `frontend/src/pages/SettingsPage.tsx`（§2.5 改造点）：
  - [ ] 替换 `Settings.notifications` 类型
  - [ ] 添加 `permission` / `subscriptions` / `dismissed` state
  - [ ] Notifications Tab 顶部插入 `<PushSubscriptionPrompt />`
  - [ ] Notifications Tab 旧 toggle 替换为 `<table>` + `<Toggle />`
  - [ ] `handleChannelToggle` 乐观更新 + 失败回滚
- [ ] 追加样式到 `frontend/src/pages/SettingsPage.css`（§2.6 CSS 块）
- [ ] 改造 `frontend/src/components/NotificationBell.tsx`（§4.3 改造点）
- [ ] 验收：6 类型表渲染、push 列在 denied 时 disabled 且带 🔒、Toggle 切换 0.2s、卡片出现 0.3s
- [ ] 验收：暗色模式无残留亮色 / 无对比度不足
- [ ] 验收：移动端 < 600px 表行变卡片堆叠、按钮 ≥ 44px、`env(safe-area-inset-bottom)` 兼容
- [ ] 验收：disabled Toggle `aria-disabled="true"` + 屏幕阅读器朗读完整 label
- [ ] 验收：二次取消订阅确认窗口可关闭、复制剪贴板成功 toast
- [ ] 验收：`prefers-reduced-motion: reduce` 时无动画

---

## 7. 不在本文档范围

- Service Worker `push` / `notificationclick` 事件处理（`sw.js` 改造）
- VAPID 公私钥生成与 `.env` 注入
- `web-push` npm 包安装确认
- 后端 `POST/PUT/DELETE /api/push/subscription` 与 `GET/PUT /api/notification-preferences` 路由
- 路由注入 `createNotification`（follows / comments / favorites / achievement / challenges）
- `NotificationsPage.tsx` 通知列表本身（本迭代仅做图标补全，不动列表 UI）
- 推送通知内容中的 emoji / 折叠摘要设计（由后端 payload 决定）

---

**END — UI-webpush v1.0**