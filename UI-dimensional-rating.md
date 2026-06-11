# UI 规范：食谱多维评分系统

> **版本**: v1.0  
> **日期**: 2026-06-11  
> **适用范围**: food-website 评论区评分功能升级  
> **技术栈**: React 18 + TypeScript + CSS（无 UI 框架）  
> **依赖复用**: recharts 雷达图（已安装）、现有 StarRating 组件

---

## 1. 组件清单

| 组件/文件 | 变更类型 | 说明 |
|-----------|----------|------|
| `frontend/src/api.ts` | ✏️ 修改 | 扩展 Comment + CommentStats 接口，新增 4 个维度字段 |
| `frontend/src/components/CommentSection.tsx` | ✏️ 修改 | 表单区增加维度评分、评论卡片增加维度徽章展示、统计区嵌入雷达图 |
| `frontend/src/components/CommentSection.css` | ✏️ 修改 | 新增雷达图容器样式、维度评分行样式、维度徽章样式 |
| `frontend/src/components/DimensionRadar.tsx` | ✨ 新建 | Recharts 雷达图独立组件，接收 dimensionAverages 数据 |

---

## 2. CSS 变量定义

在 `:root` 和 `body.dark` 下分别定义 4 个维度的主题色变量：

```css
/* ── 亮色模式 ── */
:root {
  /* 口味 - 红色系 */
  --dim-taste-color: #ef4444;
  --dim-taste-bg: rgba(239, 68, 68, 0.1);
  --dim-taste-border: rgba(239, 68, 68, 0.3);
  
  /* 难度 - 橙色系 */
  --dim-difficulty-color: #f97316;
  --dim-difficulty-bg: rgba(249, 115, 22, 0.1);
  --dim-difficulty-border: rgba(249, 115, 22, 0.3);
  
  /* 卖相 - 紫色系 */
  --dim-presentation-color: #8b5cf6;
  --dim-presentation-bg: rgba(139, 92, 246, 0.1);
  --dim-presentation-border: rgba(139, 92, 246, 0.3);
  
  /* 性价比 - 绿色系 */
  --dim-value-color: #22c55e;
  --dim-value-bg: rgba(34, 197, 94, 0.1);
  --dim-value-border: rgba(34, 197, 94, 0.3);
  
  /* 雷达图 */
  --radar-grid-color: #e5e7eb;
  --radar-text-color: #6b7280;
  --radar-fill-opacity: 0.3;
}

/* ── 暗色模式（body.dark） ── */
body.dark {
  /* 口味 - 红色系（暗化） */
  --dim-taste-color: #f87171;
  --dim-taste-bg: rgba(248, 113, 113, 0.15);
  --dim-taste-border: rgba(248, 113, 113, 0.25);
  
  /* 难度 - 橙色系（暗化） */
  --dim-difficulty-color: #fb923c;
  --dim-difficulty-bg: rgba(251, 146, 60, 0.15);
  --dim-difficulty-border: rgba(251, 146, 60, 0.25);
  
  /* 卖相 - 紫色系（暗化） */
  --dim-presentation-color: #a78bfa;
  --dim-presentation-bg: rgba(167, 139, 250, 0.15);
  --dim-presentation-border: rgba(167, 139, 250, 0.25);
  
  /* 性价比 - 绿色系（暗化） */
  --dim-value-color: #4ade80;
  --dim-value-bg: rgba(74, 222, 128, 0.15);
  --dim-value-border: rgba(74, 222, 128, 0.25);
  
  /* 雷达图暗色 */
  --radar-grid-color: #374151;
  --radar-text-color: #9ca3af;
  --radar-fill-opacity: 0.4;
}
```

---

## 3. 布局描述

### 3.1 评分统计区（comment-stats）

**现有布局**:
- 左侧：平均分展示（avgRating）+ 星级
- 右侧：评分分布柱状图（5→1 星的数量条）

**新增布局（雷达图）**:
- 在现有统计内容**下方**增加雷达图区域
- 雷达图与现有内容共享 `.comment-stats` 容器背景
- 雷达图与上方内容间距：`1.25rem`

**尺寸规范**:
```
┌─────────────────────────────────────────────────────────────┐
│  comment-stats 容器                                          │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │  4.5 ★★★★☆             │  │  ★★★★★ ██████████████   │  │
│  │  128人评分              │  │  ★★★★☆ ███████████     │  │
│  │                         │  │  ...                    │  │
│  └─────────────────────────┘  └─────────────────────────┘  │
│                                                             │
│  ──────────────────── 分隔线 ─────────────────────────────  │
│  margin-top: 1.25rem;                                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                DimensionRadar 雷达图                 │   │
│  │              尺寸: 桌面端 220×220px                 │   │
│  │              移动端 160×160px                        │   │
│  │              水平居中                                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**雷达图容器 CSS**:
```css
.comment-stats__radar {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border-color, #e5e7eb);
  display: flex;
  justify-content: center;
  align-items: center;
}

body.dark .comment-stats__radar {
  border-top-color: var(--color-border, #374151);
}

.dimension-radar-container {
  width: 220px;
  height: 220px;
}
```

---

### 3.2 评论表单区（comment-form）

**现有元素**:
- 用户昵称
- 综合评分 StarRating
- 文本输入框
- 图片上传
- 提交/取消按钮

**新增元素**:
- 「展开详细评分」按钮（默认收起）
- 展开后显示 4 行维度评分（每行：标签 + StarRating size="sm"）

**布局结构**:
```
comment-form
├── comment-form__header（不变）
├── comment-form__rating（不变：综合评分）
├── comment-form__dimensions-toggle（新增）
│   └── 按钮：展开详细评分 ▼ / 收起详细评分 ▲
├── comment-form__dimensions（新增，折叠面板）
│   ├── .dimension-row × 4
│   │   ├── .dimension-label（口味/难度/卖相/性价比 + emoji）
│   │   └── .dimension-stars（StarRating size="sm"）
│   └── .dimension-hint（提示文案）
├── textarea（不变）
├── CommentImagePicker（不变）
└── comment-form__actions（不变）
```

**关键 CSS**:
```css
.comment-form__dimensions-toggle {
  margin: 0.5rem 0;
  padding: 0.5rem 1rem;
  background: var(--bg-secondary, #f9fafb);
  border: 1px dashed var(--border-color, #e5e7eb);
  border-radius: 8px;
  color: var(--text-secondary, #6b7280);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  text-align: left;
}

.comment-form__dimensions-toggle:hover {
  border-color: var(--accent-warm, #d4532b);
  color: var(--accent-warm, #d4532b);
}

.comment-form__dimensions {
  margin: 0.75rem 0;
  padding: 1rem;
  background: var(--bg-primary, #fff);
  border-radius: 8px;
  border: 1px solid var(--border-color, #e5e7eb);
  
  /* 展开动画 */
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease;
}

.comment-form__dimensions.is-expanded {
  max-height: 300px;
  opacity: 1;
  padding: 1rem;
}

.dimension-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.375rem 0;
}

.dimension-label {
  width: 80px;
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.dimension-hint {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border-color, #e5e7eb);
  font-size: 0.75rem;
  color: var(--text-tertiary, #9ca3af);
  font-style: italic;
}

/* 暗色模式覆盖 */
body.dark .comment-form__dimensions-toggle {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #374151);
  color: var(--color-text-secondary, #9ca3af);
}

body.dark .comment-form__dimensions-toggle:hover {
  border-color: var(--color-primary, inherit);
  color: var(--color-primary, inherit);
}

body.dark .comment-form__dimensions {
  background: var(--color-bg-secondary, #1a1a2e);
  border-color: var(--color-border, #374151);
}

body.dark .dimension-label {
  color: var(--color-text-secondary, #9ca3af);
}
```

---

### 3.3 评论卡片维度徽章展示

**位置**: 
- 在评论卡片 header 的 StarRating 后方
- 水平排列，超出换行

**徽章格式**:
- 口味: 😋 X.X（红色系）
- 难度: 🔥 X.X（橙色系）
- 卖相: 👀 X.X（紫色系）
- 性价比: 💰 X.X（绿色系）

**布局**:
```
comment-item__header
├── avatar
├── comment-item__info
│   ├── 用户名
│   ├── StarRating（综合评分）
│   └── .dimension-badges（新增）
│       ├── .dimension-badge × N（1-4 个）
│       └── 仅显示有值的维度
└── 时间
```

**徽章 CSS**:
```css
.dimension-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-left: 0.5rem;
}

.dimension-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.4;
  
  /* 默认使用口味颜色，各维度单独覆盖 */
  background: var(--dim-taste-bg);
  color: var(--dim-taste-color);
  border: 1px solid var(--dim-taste-border);
}

.dimension-badge--taste {
  background: var(--dim-taste-bg);
  color: var(--dim-taste-color);
  border-color: var(--dim-taste-border);
}

.dimension-badge--difficulty {
  background: var(--dim-difficulty-bg);
  color: var(--dim-difficulty-color);
  border-color: var(--dim-difficulty-border);
}

.dimension-badge--presentation {
  background: var(--dim-presentation-bg);
  color: var(--dim-presentation-color);
  border-color: var(--dim-presentation-border);
}

.dimension-badge--value {
  background: var(--dim-value-bg);
  color: var(--dim-value-color);
  border-color: var(--dim-value-border);
}

.dimension-badge__emoji {
  font-size: 0.875rem;
}
```

---

## 4. 交互说明

### 4.1 雷达图交互（DimensionRadar 组件）

**Recharts 配置**:
```tsx
// 数据结构示例
const data = [
  { dimension: '口味', value: 4.2, fullMark: 5 },
  { dimension: '难度', value: 3.5, fullMark: 5 },
  { dimension: '卖相', value: 4.0, fullMark: 5 },
  { dimension: '性价比', value: 4.7, fullMark: 5 },
]

// RadarChart props
<RadarChart
  cx="50%"
  cy="50%"
  outerRadius="70%"
  data={data}
  margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
>
  <PolarGrid stroke="var(--radar-grid-color)" />
  <PolarAngleAxis 
    dataKey="dimension" 
    tick={{ fill: 'var(--radar-text-color)', fontSize: 12 }}
  />
  <PolarRadiusAxis 
    angle={90} 
    domain={[0, 5]} 
    tick={false}
    axisLine={false}
  />
  <Radar
    name="平均分"
    dataKey="value"
    stroke="var(--accent-warm, #d4532b)"
    fill="var(--accent-warm, #d4532b)"
    fillOpacity="var(--radar-fill-opacity)"
    strokeWidth={2}
  />
</RadarChart>
```

**Hover 效果**:
- 雷达图多边形填充透明度从 0.3 → 0.5（hover 时）
- 鼠标悬停在数据点上时显示 Tooltip：`口味：4.2 分（基于 120 条评价）`
- Tooltip 背景半透明，带阴影

**空态处理**:
- 所有维度 count === 0 时：雷达图不渲染，显示文案「暂无维度评分数据」
- 部分维度有值：仅渲染有数据的维度

---

### 4.2 维度评分行交互

**StarRating 复用**:
- 直接复用现有 StarRating 组件，传入 `size="sm"`
- 每个维度独立管理 state：`tasteRating`、`difficultyRating`、`presentationRating`、`valueRating`
- 默认值均为 0（未评分）

**Hover 状态**:
- 鼠标悬停在维度行上时，行背景轻微高亮（opacity 变化）
- StarRating hover 效果与现有保持一致（星星放大 + 颜色变化）

---

### 4.3 展开/收起动画

**详细评分面板**:
- 收起 → 展开：`max-height: 0 → 300px` + `opacity: 0 → 1`
- 展开 → 收起：反向动画
- 时长：0.3s，easing：ease
- 箭头图标同步旋转 180°

---

## 5. 响应式适配

### 断点 1：768px（平板端）

```css
@media (max-width: 768px) {
  /* 雷达图缩小 */
  .dimension-radar-container {
    width: 180px;
    height: 180px;
  }
  
  /* 维度标签宽度减少 */
  .dimension-label {
    width: 70px;
  }
  
  /* 徽章间距缩小 */
  .dimension-badges {
    gap: 0.25rem;
  }
  
  .dimension-badge {
    padding: 0.1rem 0.375rem;
    font-size: 0.7rem;
  }
}
```

### 断点 2：480px（移动端）

```css
@media (max-width: 480px) {
  /* 雷达图进一步缩小 */
  .dimension-radar-container {
    width: 160px;
    height: 160px;
  }
  
  /* 雷达图边距调整 */
  .comment-stats__radar {
    margin-top: 1rem;
    padding-top: 1rem;
  }
  
  /* 维度行纵向排列 */
  .dimension-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .dimension-label {
    width: auto;
  }
  
  /* 徽章换行 */
  .dimension-badges {
    margin-left: 0;
    margin-top: 0.25rem;
    width: 100%;
  }
  
  /* 评论卡片 info 区域改为纵向 */
  .comment-item__info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
```

---

## 6. 暗色模式完整覆盖

所有新增组件均需支持 `body.dark` 选择器：

```css
/* ── 雷达图暗色模式 ── */
body.dark .comment-stats__radar {
  border-top-color: var(--color-border, #374151);
}

/* ── 表单暗色模式 ── */
body.dark .comment-form__dimensions-toggle {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #374151);
  color: var(--color-text-secondary, #9ca3af);
}

body.dark .comment-form__dimensions-toggle:hover {
  border-color: var(--color-primary, inherit);
  color: var(--color-primary, inherit);
}

body.dark .comment-form__dimensions {
  background: var(--color-bg-secondary, #1a1a2e);
  border-color: var(--color-border, #374151);
}

body.dark .dimension-hint {
  border-top-color: var(--color-border, #374151);
  color: var(--color-text-muted, #6b7280);
}

/* ── 徽章暗色模式 ── */
/* 徽章颜色已通过 CSS 变量自动适配，无需额外覆盖 */

/* ── Recharts 内部样式（需要通过 props 传递） ── */
// 在 DimensionRadar 组件中检测暗色模式：
// const isDark = document.body.classList.contains('dark')
// 然后动态设置 stroke/fill 颜色
```

---

## 7. TypeScript 接口变更

### api.ts 扩展

```typescript
// 新增：维度平均数据
export interface DimensionAverage {
  average: number
  count: number
}

// 扩展 Comment 接口
export interface Comment {
  // ... 现有字段不变 ...
  taste: number | null
  difficulty: number | null
  presentation: number | null
  value: number | null
}

// 扩展 CommentStats 接口
export interface CommentStats {
  // ... 现有字段不变 ...
  dimensionAverages: {
    taste: DimensionAverage
    difficulty: DimensionAverage
    presentation: DimensionAverage
    value: DimensionAverage
  }
}
```

---

## 8. 维度中文映射常量

```typescript
// 在 CommentSection.tsx 顶部定义
const DIMENSION_CONFIG = {
  taste: {
    label: '口味',
    emoji: '😋',
    cssClass: 'dimension-badge--taste'
  },
  difficulty: {
    label: '难度',
    emoji: '🔥',
    cssClass: 'dimension-badge--difficulty'
  },
  presentation: {
    label: '卖相',
    emoji: '👀',
    cssClass: 'dimension-badge--presentation'
  },
  value: {
    label: '性价比',
    emoji: '💰',
    cssClass: 'dimension-badge--value'
  }
} as const
```

---

## 9. 提交逻辑说明

### handleSubmit 变更

1. **保持现有逻辑不变**：content 必填、综合 rating 可选
2. **新增**：收集 4 个维度评分（可为 0/null，表示未评分）
3. **提交数据**：
   ```typescript
   {
     content: content.trim(),
     rating: rating || undefined,
     taste: tasteRating > 0 ? tasteRating : undefined,
     difficulty: difficultyRating > 0 ? difficultyRating : undefined,
     presentation: presentationRating > 0 ? presentationRating : undefined,
     value: valueRating > 0 ? valueRating : undefined,
     imageUrls: imageUrls.length > 0 ? imageUrls : undefined
   }
   ```
4. **提交成功后**：所有评分 state 重置为 0，详细评分面板自动收起

---

## 10. 无障碍（A11y）考虑

| 元素 | ARIA 属性 |
|------|-----------|
| 展开/收起按钮 | `aria-expanded={isExpanded}` `aria-controls="dimensions-panel"` |
| 维度评分行 | 每个 StarRating 已有 `aria-label="{N} 星"` |
| 雷达图容器 | `role="img" aria-label="四维评分雷达图，口味 X.X 分，难度 X.X 分..."` |
| 维度徽章 | 纯展示元素，无需额外属性 |

---

## 11. 空态与降级处理

| 场景 | 处理方式 |
|------|----------|
| stats.dimensionAverages 不存在（旧 API） | 雷达图不渲染，不报错 |
| 某维度 average === 0 且 count === 0 | 该维度不在雷达图中显示 |
| 所有维度均无数据 | 显示「暂无维度评分数据」文案 |
| 历史评论 4 维字段全为 null | 评论卡片不显示维度徽章区域 |
| 部分维度有值部分为 null | 只显示有值的维度徽章 |

---

**设计完成** ✅  
此规范完全复用现有组件风格，不新增 npm 依赖，支持响应式与暗色模式，边界情况全覆盖。
