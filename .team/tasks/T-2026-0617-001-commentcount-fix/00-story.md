# 00-story.md — T-2026-0617-001-commentcount-fix

> **任务类型**：Bugfix（commentCount 显示 0）
> **Base**：`36eaafb`（含 #138 内容质量巡检后的 food-website HEAD）
> **风险等级**：低（数据层字段映射修复）
> **owner**：main（已 SKIP product full story，本文档由 main 直接产出）
> **phase**：story（撰写中，落地后推进到 plan-review）

---

## 1. 背景

用户反馈 / #138 巡检发现：**「照烧鸡腿饭」详情页评论数显示 0**（`recipe id=e6c16baf` 实际有 1 条评论），同时前端「2 维评分」展示为 `null`。

后端 schema 上 `commentCount` 是物化列，由评论 CRUD 触发器维护；详情接口理论上应已带值。

---

## 2. 候选方案

### 候选 1：照烧鸡腿 e6c16baf 1 条评论 / 2 维评分 null 修复

- **范围**：定位 `commentCount` 在路由层/前端层被吞掉的环节，补回 `null` → 0 的兜底
- **工时**：0.25d
- **AC**：
  - AC-1.1：`/api/recipes/e6c16baf` 返回的详情 JSON 里 `commentCount === 1`
  - AC-1.2：详情页 UI `commentCount` 显示 `1`（不再显示 0）
  - AC-1.3：2 维评分 null 在前端有兜底展示（不出现空白/null 字面量）

### 候选 2：commentCount 物化列同步触发器

- **范围**：核对 `comments` 表 INSERT/DELETE 触发器与 `recipes.commentCount` 物化列是否同步
- **工时**：0.5d
- **AC**：
  - AC-2.1：DB 现有触发器存在并能正确维护 `commentCount`
  - AC-2.2：手动补跑一次同步脚本，e6c16baf `commentCount` 修正为 1
  - AC-2.3：再增/删一条评论，`commentCount` 实时更新

### 候选 4：MEMORY.md / README.md「94 道」基线 → 84

- **范围**：文档基线数字更新（与本任务弱相关，**不纳入本次**，留待后续 story）
- **状态**：deferred

---

## 3. 本次选型

**采用候选 1**（UI 显示修复），如定位发现触发器缺失，回退到候选 2。
候选 4 不在本次范围。

---

## 4. 风险

- 后端 `commentCount` 字段命名若与前端不一致，可能要顺带改 `api.ts` 归一化
- 不动核心 API 路径
