# UI 设计文档 — 营养数据精度校准与内容质量巡检 (Iter#97)

> **项目**: food-website (React 18 + Vite)  
> **设计规范基准**: `frontend/src/styles/DESIGN_RULES.md` (暖橙 #E8663E 主色调)  
> **关联 PRD**: `iter97-nutrition-calibration/PRD-nutrition-calibration.md`  
> **文档版本**: v1.0 · 2026-05-30  

---

## 目录

1. [组件 1: ContentQualityPage 内容质量仪表板](#1-contentqualitypage-内容质量仪表板-p1)
2. [组件 2: NutritionCard 浮点显示优化](#2-nutritioncard-浮点显示优化-p0)
3. [CSS 变量参考表](#3-css-变量参考表)
4. [响应式断点策略](#4-响应式断点策略)

---

## 1. ContentQualityPage 内容质量仪表板 (P1)

### 1.1 组件结构 (JSX 伪代码)

```tsx
// pages/ContentQualityPage.tsx

// ── 页面 Root ──
<Page className="content-quality-page">
  <PageHeader>
    <Title>内容质量巡检</Title>
    <RefreshButton onClick={handleRefresh} disabled={loading} />
  </PageHeader>

  <PageBody>
    {/* ── 条件渲染：加载态 / 空态 / 数据态 ── */}
    {loading ? (
      <SkeletonContent />
    ) : data?.totalRecipes === 0 ? (
      <EmptyState />
    ) : (
      <>
        {/* Section 1: 覆盖率卡片网格 */}
        <CoverageSection title="覆盖率总览">
          <CoverageGrid>
            {fieldCoverageEntries.map((entry, index) => (
              <CoverageCard
                key={entry.fieldKey}
                fieldKey={entry.fieldKey}       // e.g. "coverImage"
                fieldLabel={entry.fieldLabel}   // e.g. "封面"
                percentage={entry.pct}          // e.g. 95.7
                count={entry.count}             // e.g. 90
                total={data.totalRecipes}       // e.g. 94
                style={{ '--card-delay': `${index * 80}ms` }}
              />
            ))}
          </CoverageGrid>
        </CoverageSection>

        {/* Section 2: 质量分布 */}
        <DistributionSection title="质量分布">
          <DistributionBars>
            {distributionEntries.map((entry) => (
              <DistributionBar
                key={entry.score}
                score={entry.score}           // e.g. 8
                label={`${entry.score}分`}
                count={entry.count}           // e.g. 30
                barWidth={entry.barWidthPct}  // e.g. 100%
                barColor={/* CSS variable per score */}
              />
            ))}
          </DistributionBars>
        </DistributionSection>

        {/* Section 3: 质量最低 10 道食谱 */}
        <BottomTableSection title="质量最低 10 道食谱">
          <BottomTable>
            <thead>
              <tr>
                <th>#</th>
                <th>食谱名</th>
                <th>得分</th>
                <th>缺失字段</th>
              </tr>
            </thead>
            <tbody>
              {bottomRecipes.map((recipe, index) => (
                <tr key={recipe.id}>
                  <td>{index + 1}</td>
                  <td>
                    <Link to={`/recipe/${recipe.id}`}>{recipe.title}</Link>
                    {/* → 点击跳转 /recipe/:id */}
                  </td>
                  <td>
                    <ScoreBadge score={recipe.score} />
                  </td>
                  <td>
                    <MissingFieldsList>
                      {recipe.missingFields.map((field) => (
                        <MissingFieldTag key={field} fieldKey={field} />
                      ))}
                    </MissingFieldsList>
                  </td>
                </tr>
              ))}
            </tbody>
          </BottomTable>
        </BottomTableSection>
      </>
    )}
  </PageBody>
</Page>
```

### 1.2 JSX 伪代码 — 子组件层级

```tsx
// ── CoverageCard ──
<CoverageCard className="coverage-card" style={{ animationDelay: 'var(--card-delay)' }}>
  <CardIcon />                                  {/* 字段图标 */}
  <CardFieldLabel>{fieldLabel}</CardFieldLabel> {/* "封面" */}
  <CardPercentage>{formattedPct}%</CardPercentage> {/* 大号 95.7% */}
  <MiniProgressBar>
    <ProgressFill style={{ width: `${pct}%` }} />
  </MiniProgressBar>
  <CardCount>{count}/{total}</CardCount>        {/* "90/94" */}
</CoverageCard>

// ── DistributionBar ──
<DistributionBar className="distribution-bar">
  <BarTrack>
    <BarFill style={{ width: barWidth, background: barColor }} />
  </BarTrack>
  <BarLabel>{label}({count})</BarLabel>          {/* "8分(30)" */}
</DistributionBar>

// ── ScoreBadge（圆形徽章）──
<ScoreBadge className="score-badge" data-score-tier={tier}>
  {/* tier: 'low' ≤3, 'mid' ≤5, 'high' >5 */}
  {score}
</ScoreBadge>

// ── MissingFieldTag（颜色标签）──
<MissingFieldTag className="missing-field-tag" data-field={fieldKey}>
  {/* e.g. "tips" → 红色, "video" → 紫色 */}
  {fieldLabel}
</MissingFieldTag>
```

### 1.3 完整 CSS 样式规则

#### 1.3.1 页面容器

```css
/* ContentQualityPage.css — 内容质量仪表板 */

.content-quality-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

/* ── 页头 ── */
.cq-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.cq-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.cq-refresh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-card);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.cq-refresh-btn:hover {
  background: var(--color-primary-bg);
  color: var(--color-primary);
  transform: rotate(45deg);
}

.cq-refresh-btn:active {
  transform: rotate(45deg) scale(0.95);
}

.cq-refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.cq-refresh-btn svg {
  width: 18px;
  height: 18px;
}

/* ── Section 标题 ── */
.cq-section {
  margin-bottom: 32px;
}

.cq-section-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 16px;
}
```

#### 1.3.2 覆盖率卡片网格

```css
/* ── 覆盖率卡片网格 ── */
.cq-coverage-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

/* ── 单张覆盖率卡片 ── */
.coverage-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-align: center;
  animation: cardFadeIn 0.4s ease both;
  /* animation-delay 由 style="--card-delay: Xms" 传入 */
}

.coverage-card--is-100 {
  /* 100%: 绿色调 */
  --card-tint-color: #52c41a;
  background: rgba(82, 196, 26, 0.08);
  border-color: rgba(82, 196, 26, 0.2);
}

.coverage-card--is-ok {
  /* ≥80%: 橙色调 */
  --card-tint-color: #faad14;
  background: rgba(250, 173, 20, 0.08);
  border-color: rgba(250, 173, 20, 0.2);
}

.coverage-card--is-low {
  /* <80%: 红色调 */
  --card-tint-color: #ff4d4f;
  background: rgba(255, 77, 79, 0.08);
  border-color: rgba(255, 77, 79, 0.2);
}

.coverage-card__icon {
  font-size: 20px;
  line-height: 1;
  margin-bottom: 2px;
}

.coverage-card__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.coverage-card__percentage {
  font-size: 32px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--card-tint-color, var(--color-text));
}

.coverage-card__count {
  font-size: 12px;
  color: var(--color-text-muted);
}

/* ── 迷你进度条 ── */
.coverage-card__progress {
  width: 100%;
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.coverage-card__progress-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--card-tint-color, var(--color-primary));
  transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

#### 1.3.3 质量分布条

```css
/* ── 质量分布条 ── */
.cq-distribution-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cq-distribution-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cq-distribution-bar__track {
  flex: 1;
  height: 28px;
  background: var(--color-bg-secondary);
  border-radius: 6px;
  overflow: hidden;
}

.cq-distribution-bar__fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.cq-distribution-bar__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  white-space: nowrap;
  min-width: 70px;
  text-align: right;
}

/* ── 各分数段颜色（暖橙渐变：8分最深 → 4分最浅）── */
.bar-score-8  { --bar-color: #E8663E; }
.bar-score-7  { --bar-color: #E87D5A; }
.bar-score-6  { --bar-color: #E89470; }
.bar-score-5  { --bar-color: #E8AB86; }
.bar-score-4  { --bar-color: #E8C29C; }

/* 3 分及以下使用红色调 */
.bar-score-3  { --bar-color: #ff6b6b; }
.bar-score-2  { --bar-color: #ff8787; }
```

#### 1.3.4 质量最低食谱表格（桌面）

```css
/* ── 质量最低食谱表格 ── */
.cq-table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.cq-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.cq-table thead {
  background: var(--color-bg-secondary);
}

.cq-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  color: var(--color-text-secondary);
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
}

.cq-table th:first-child {
  width: 48px;
  text-align: center;
}

.cq-table th:nth-child(2) {
  /* 食谱名列自动宽度 */
}

.cq-table th:nth-child(3) {
  width: 80px;
  text-align: center;
}

.cq-table th:nth-child(4) {
  /* 缺失字段列自动宽度 */
}

.cq-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-light);
  vertical-align: middle;
}

.cq-table tbody tr:last-child td {
  border-bottom: none;
}

.cq-table tbody tr:hover {
  background: var(--color-primary-bg);
}

.cq-table__rank {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-align: center;
}

.cq-table__title {
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.cq-table__title:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

.cq-table__title:active {
  color: var(--color-primary-dark);
}

.cq-table__score {
  text-align: center;
}

/* ── 得分圆形徽章 ── */
.score-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
}

.score-badge--low {
  background: var(--color-danger, #e74c3c);
}

.score-badge--mid {
  background: var(--color-warning, #f39c12);
}

.score-badge--high {
  background: var(--color-success, #27ae60);
}

/* ── 缺失字段标签 ── */
.cq-table__missing-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.missing-field-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.5;
  color: #fff;
}

/* 字段颜色编码 */
.missing-field-tag[data-field="tips"]           { background: #ff4d4f; }
.missing-field-tag[data-field="video"]          { background: #722ed1; }
.missing-field-tag[data-field="coverImage"]     { background: #1890ff; }
.missing-field-tag[data-field="story"]          { background: #52c41a; }
.missing-field-tag[data-field="culturalBackground"] { background: #fa8c16; }
.missing-field-tag[data-field="ingredients"]    { background: #13c2c2; }
.missing-field-tag[data-field="steps"]          { background: #eb2f96; }
.missing-field-tag[data-field="nutrition"]      { background: #f5222d; }
```

#### 1.3.5 骨架屏

```css
/* ── 骨架屏 ── */
.cq-skeleton {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.cq-skeleton-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.cq-skeleton-card {
  height: 140px;
  background: var(--color-skeleton-from);
  border-radius: var(--radius-md);
  animation: shimmer 1.5s infinite;
  background-size: 200% 100%;
  background-image: linear-gradient(
    90deg,
    var(--color-skeleton-from) 0%,
    var(--color-skeleton-to) 50%,
    var(--color-skeleton-from) 100%
  );
}

.cq-skeleton-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cq-skeleton-bar {
  height: 28px;
  border-radius: 6px;
  background: var(--color-skeleton-from);
  animation: shimmer 1.5s infinite;
  background-size: 200% 100%;
  background-image: linear-gradient(
    90deg,
    var(--color-skeleton-from) 0%,
    var(--color-skeleton-to) 50%,
    var(--color-skeleton-from) 100%
  );
}

.cq-skeleton-bar:nth-child(1) { width: 85%; }
.cq-skeleton-bar:nth-child(2) { width: 70%; }
.cq-skeleton-bar:nth-child(3) { width: 60%; }
.cq-skeleton-bar:nth-child(4) { width: 50%; }
.cq-skeleton-bar:nth-child(5) { width: 35%; }
```

#### 1.3.6 空状态

```css
/* ── 空状态 ── */
.cq-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
}

.cq-empty__icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.4;
}

.cq-empty__title {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 8px;
}

.cq-empty__desc {
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0;
}
```

#### 1.3.7 暗色模式覆写

```css
/* ── 暗色模式覆写 ── */
body.dark .content-quality-page {
  /* 继承全局暗色变量，组件级微调 */
}

body.dark .coverage-card--is-100 {
  background: rgba(82, 196, 26, 0.15);
  border-color: rgba(82, 196, 26, 0.3);
}

body.dark .coverage-card--is-ok {
  background: rgba(250, 173, 20, 0.15);
  border-color: rgba(250, 173, 20, 0.3);
}

body.dark .coverage-card--is-low {
  background: rgba(255, 77, 79, 0.15);
  border-color: rgba(255, 77, 79, 0.3);
}

body.dark .cq-distribution-bar__track {
  background: var(--color-bg-secondary);
}

body.dark .cq-table thead {
  background: var(--color-bg-secondary);
}

body.dark .cq-table tbody tr:hover {
  background: rgba(232, 102, 62, 0.1);
}

body.dark .cq-table td {
  border-bottom-color: var(--color-border);
}

body.dark .cq-refresh-btn {
  border-color: var(--color-border);
  background: var(--color-card);
}

body.dark .cq-refresh-btn:hover {
  background: rgba(232, 102, 62, 0.1);
}

body.dark .cq-skeleton-card,
body.dark .cq-skeleton-bar {
  --color-skeleton-from: #2a2a2a;
  --color-skeleton-to: #3a3530;
}
```

### 1.4 响应式布局规则

```css
/* ── 响应式布局 ── */

/* 平板竖屏及以下 (≤768px) */
@media (max-width: 768px) {
  .content-quality-page {
    padding: 24px 16px;
  }

  .cq-header h1 {
    font-size: 22px;
  }

  /* 覆盖率卡片：4列 → 2列 */
  .cq-coverage-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .cq-skeleton-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .coverage-card__percentage {
    font-size: 28px;
  }

  .cq-section-title {
    font-size: 18px;
  }
}

/* 手机小屏 (≤480px) */
@media (max-width: 480px) {
  .content-quality-page {
    padding: 16px 12px;
  }

  .cq-header h1 {
    font-size: 20px;
  }

  /* 覆盖率卡片：2列继续，但间距缩小 */
  .cq-coverage-grid {
    gap: 10px;
  }

  .coverage-card {
    padding: 16px 12px;
  }

  .coverage-card__percentage {
    font-size: 24px;
  }

  /* 表格 → 卡片列表 */
  .cq-table thead {
    display: none;
  }

  .cq-table,
  .cq-table tbody,
  .cq-table tr,
  .cq-table td {
    display: block;
  }

  .cq-table tr {
    padding: 12px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    margin-bottom: 8px;
  }

  .cq-table tr:hover {
    background: var(--color-primary-bg);
  }

  .cq-table td {
    padding: 4px 0;
    border-bottom: none;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cq-table__rank {
    /* 排名数字作为便携前缀，不单独占行 */
    display: inline-flex;
    min-width: 20px;
    text-align: left;
  }

  .cq-table__title {
    flex: 1;
  }

  .cq-table__score {
    /* 得分靠右 */
    justify-content: flex-end;
  }

  .cq-table td::before {
    content: attr(data-label);
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-muted);
    min-width: 60px;
    flex-shrink: 0;
  }

  .cq-table td:first-child::before { content: '#'; }
  .cq-table td:nth-child(2)::before { content: '食谱名'; }
  .cq-table td:nth-child(3)::before { content: '得分'; }
  .cq-table td:nth-child(4)::before { content: '缺失字段'; }

  /* 移动端卡片布局中排排名数字 */
  .cq-table__rank {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-primary);
  }

  .cq-distribution-bar {
    gap: 8px;
  }

  .cq-distribution-bar__label {
    font-size: 12px;
    min-width: 60px;
  }
}
```

### 1.5 动画/过渡定义

```css
/* ── 卡片逐次淡入动画 ── */
@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.coverage-card {
  animation: cardFadeIn 0.4s ease both;
  /* 每张卡片 delay = index * 80ms，由内联 style="--card-delay: 80ms" 动态传入 */
  animation-delay: var(--card-delay, 0ms);
}

/* ── 进度条填入动画 ── */
.coverage-card__progress-fill {
  transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ── 分布条填入动画 ── */
.cq-distribution-bar__fill {
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  /* 启动时自动从 0 展开到设定值 */
  width: 0;  /* 初始状态 */
}

.cq-distribution-bar__fill.animate {
  width: var(--bar-width);
}

/* ── 骨架屏 shimmer 动画（复用项目现有）── */
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── 刷新按钮旋转动画 ── */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.cq-refresh-btn.is-spinning svg {
  animation: spin 0.6s linear infinite;
}
```

### 1.6 交互行为定义

| 元素 | 状态 | 行为 |
|------|------|------|
| **覆盖率卡片** | 默认 | `box-shadow: var(--shadow-sm)`, 浅色 tint 背景 |
| | hover | `transform: translateY(-2px)`, `box-shadow: var(--shadow-md)` |
| | active | `transform: scale(0.98)` |
| **刷新按钮** | 默认 | 灰色图标（刷新 icon） |
| | hover | 背景变为 `--color-primary-bg`，图标变为主色 |
| | active | `transform: scale(0.95)` |
| | 加载中 | 图标旋转动画（class `is-spinning`），disabled |
| **食谱名链接** | 默认 | `color: var(--color-primary)`, 无下划线 |
| | hover | `color: var(--color-primary-hover)`, `text-decoration: underline` |
| | focus-visible | `outline: 2px solid var(--color-primary)`, `outline-offset: 2px` |
| | visited | 同默认（不区分访问态） |
| **得分圆形徽章** | 所有态 | 无交互（纯展示） |
| **缺失字段标签** | hover | `filter: brightness(1.15)`（轻微增亮） |
| **表格行** | hover | `background: var(--color-primary-bg)` |
| | 移动端 tap | `background: var(--color-primary-bg)` (通过 `:active`) |

### 1.7 API 响应类型到 UI 映射

```typescript
// api.ts — 新增类型定义

/** API GET /api/admin/content-quality 响应结构 */
export interface ContentQualityReport {
  totalRecipes: number
  fieldCoverage: Record<string, FieldCoverageItem>
  overallScore: {
    avg: number
    distribution: Record<string, number>   // e.g. { "8分": 30, "7分": 25 }
  }
  bottomRecipes: BottomRecipeItem[]
  recipes: RecipeQualityItem[]
}

export interface FieldCoverageItem {
  count: number
  pct: number
}

export interface BottomRecipeItem {
  id: string
  title: string
  score: number
  missingFields: string[]
}

export interface RecipeQualityItem {
  id: string
  title: string
  score: number
  fieldStatus: Record<string, boolean>
}

/** 新增 API 调用 */
export const getContentQualityReport = (): Promise<ContentQualityReport> =>
  apiClient.get('/admin/content-quality')
```

### 1.8 加载态 & 空状态设计

#### 骨架屏

```
┌──────────────────────────────────────┐
│  ████████████████████████████  [刷新] │
├──────────────────────────────────────┤
│  覆盖率总览                          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ ░░░░ │ │ ░░░░ │ │ ░░░░ │ │ ░░░░ │   │
│  │ ░░░░ │ │ ░░░░ │ │ ░░░░ │ │ ░░░░ │   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ ░░░░ │ │ ░░░░ │ │ ░░░░ │ │ ░░░░ │   │
│  │ ░░░░ │ │ ░░░░ │ │ ░░░░ │ │ ░░░░ │   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
│                                      │
│  质量分布                            │
│  ░░░░░░░░░░░░░░░░░░░░               │
│  ░░░░░░░░░░░░░░░░░                  │
│  ░░░░░░░░░░░░░                      │
│  ░░░░░░░░░                          │
└──────────────────────────────────────┘

图例：░░░░ = 骨架屏 shimmer 占位块
```

- **8 张卡片**：每张 140px 高，显示为灰色 shimmer 矩形
- **5 条分布条**：5 条宽度不同的 28px 高灰色 shimmer 横条

#### 空状态

```
┌──────────────────────────────────────┐
│                                      │
│           📊                          │
│     还没有食谱数据                     │
│   系统暂无食谱内容，请先创建食谱。      │
│                                      │
└──────────────────────────────────────┘
```

- 居中布局，`padding: 60px 24px`
- 大号图标（48px），半透明
- 标题："还没有食谱数据"
- 描述文字："系统暂无食谱内容，请先创建食谱。"
- 注意：空状态不显示刷新按钮之外的任何操作

### 1.9 字段标签 & 颜色配置表

| 字段 Key | 中文标签 | 颜色 | 对应 CSS class |
|----------|---------|------|---------------|
| `coverImage` | 封面 | `#1890ff` (蓝色) | `missing-field-tag[data-field="coverImage"]` |
| `ingredients` | 食材 | `#13c2c2` (青色) | `missing-field-tag[data-field="ingredients"]` |
| `steps` | 步骤 | `#eb2f96` (粉色) | `missing-field-tag[data-field="steps"]` |
| `nutrition` | 营养 | `#f5222d` (红色) | `missing-field-tag[data-field="nutrition"]` |
| `story` | 故事 | `#52c41a` (绿色) | `missing-field-tag[data-field="story"]` |
| `culturalBackground` | 文化 | `#fa8c16` (橙色) | `missing-field-tag[data-field="culturalBackground"]` |
| `tips` | 贴士 | `#ff4d4f` (亮红) | `missing-field-tag[data-field="tips"]` |
| `video` | 视频 | `#722ed1` (紫色) | `missing-field-tag[data-field="video"]` |

### 1.10 字段中文映射（覆盖率卡片用）

| 字段 Key | 卡片标题 | 图标建议 |
|----------|---------|---------|
| `coverImage` | 封面 | 🖼️ |
| `ingredients` | 食材 | 🥘 |
| `steps` | 步骤 | 📋 |
| `nutrition` | 营养 | 💪 |
| `story` | 故事 | 📖 |
| `culturalBackground` | 文化 | 🌏 |
| `tips` | 贴士 | 💡 |
| `video` | 视频 | 🎬 |

---

## 2. NutritionCard 浮点显示优化 (P0)

### 2.1 修改内容

**文件**: `frontend/src/components/NutritionCard.tsx`  
**改动位置**: `<text>` 元素中 `{value}` 的格式化逻辑

**当前代码**（第 65 行附近）:
```tsx
<text ...>{value}</text>
```

**修改后**:
```tsx
<text ...>{displayValue}</text>
```

**格式化逻辑**:
```typescript
// 在组件内部，每个 ring item 计算得出 displayValue：
const rawValue = nutrition[item.key] ?? 0
const value = Math.max(0, rawValue)
const displayValue = Number.isInteger(value) ? value : value.toFixed(1)
```

### 2.2 视觉影响

| 输入值 | 当前显示 | 修改后显示 | 说明 |
|--------|---------|-----------|------|
| `85` | `85` | `85` | 整数不变 |
| `85.55` | `85.55` | `85.6` | 小数保留 1 位 |
| `85.5` | `85.5` | `85.5` | 1 位小数不变 |
| `0` | `0` | `0` | 0 整数不变 |
| `12.34` | `12.34` | `12.3` | 截断保留 1 位 |

**无视觉变化**：样式、布局、颜色、环形图百分比计算均不变，仅文本内容格式化。

**不影响已展开的 DV 百分比**：DV 百分比计算使用原始 `value` 值，不受格式化影响。

### 2.3 JSX 伪代码（修改后局部）

```tsx
// NutritionCard.tsx — 环形 SVG 中数值显示部分

{RING_ITEMS.map(item => {
  const rawValue = nutrition[item.key] ?? 0
  const value = Math.max(0, rawValue)

  // ★ 修改点：浮点格式化
  const displayValue = Number.isInteger(value) ? String(value) : value.toFixed(1)

  // 环形百分比计算仍使用原始 value
  const percent = Math.min(value / item.dv, 1)
  const dashOffset = CIRCUMFERENCE - Math.min(value / item.maxRing, 1) * CIRCUMFERENCE

  return (
    <div key={item.key}
      className={`nutrition-ring-item ${isExpanded ? 'is-expanded' : ''}`}
      onClick={() => setExpandedKey(isExpanded ? null : item.key)}
    >
      <svg ...>
        <text ...>{displayValue}</text>
        {/* ↑ 此处替换为 displayValue */}
      </svg>
      <span className="nutrition-ring-label">{item.label}</span>
      {isExpanded && (
        <div className="nutrition-ring-dv">
          <span className="dv-bar" style={{ '--dv-width': `${Math.round(percent * 100)}%` } as any}>
            <span className="dv-fill" />
          </span>
          <span className="dv-text">
            {Math.round(percent * 100)}% DV
          </span>
        </div>
      )}
    </div>
  )
})}
```

### 2.4 CSS 变更

**无 CSS 变更**。NutritionCard 样式完全不变。

### 2.5 验证清单

| 检查项 | 预期 |
|--------|------|
| 整数显示 `85` → `85` (不加 `.0`) | ✅ |
| 小数 `85.55` → `85.6` (四舍五入) | ✅ |
| 小数 `12.3` → `12.3` (1 位保持) | ✅ |
| `0` → `0` | ✅ |
| 环形图比例/动画/颜色不受影响 | ✅ |
| DV 百分比使用原始 value | ✅ |

---

## 3. CSS 变量参考表

本设计新增的 CSS 变量（遵守 DESIGN_RULES.md 体系，无需新增全局变量）：

| 变量 | 来源 | 用途 |
|------|------|------|
| `--card-tint-color` | 组件级局部变量 | 覆盖率卡片的 tint 颜色（绿/橙/红），通过 `style="--card-tint-color: #xxx"` 动态设置 |
| `--card-delay` | 组件级局部变量 | 卡片动画延迟，通过 `style="--card-delay: 80ms"` 动态设置 |
| `--bar-color` | 组件级局部变量 | 分布条填充色，通过 `class="bar-score-8"` 等类设置 |
| `--bar-width` | 组件级局部变量 | 分布条宽度百分比，通过 `style="--bar-width: 100%"` 动态设置 |
| `--dv-width` | 已有 | NutritionCard DV 进度条宽度 |

**规则**：不新增全局 CSS 变量。所有动态值通过内联 `style` 或数据属性 (`data-field`, `data-score-tier`) 传递。

## 4. 响应式断点策略

| 断点 | 覆盖率卡片网格 | 表格 | 分布条 |
|------|--------------|------|--------|
| >768px (桌面) | 4 列，16px gap | 标准表格，thead 显示 | 正常布局 |
| ≤768px (平板) | 2 列，16px gap | 标准表格可横向滚动 | 正常布局 |
| ≤480px (手机) | 2 列，10px gap，减小内边距 | → 卡片列表（thead 隐藏，每行独立卡片） | gap 缩小，标签字号缩小 |

---

*文档版本 v1.0 · 2026-05-30*
*编写者：UI Designer (Iter#97)*