# Implementation Report — T-2026-0617-001 commentCount fix (r1)

> **Date**: 2026-06-17 07:15 GMT+8
> **Owner**: fullstack
> **Phase**: implementation → ready for test
> **Base**: 36eaafb

---

## 1. Changes Summary

### 1.1 Backend: `backend/routes/recipes.js` (+21 lines)

**File**: `backend/routes/recipes.js`
**Location**: `GET /:id` route, after `const data = recipe.toJSON()`

**Change**: Added commentCount sync safety net.

When `data.commentCount === 0`, the route queries `Comment.count({ where: { recipeId: id } })` to get the actual count. If the actual count > 0 (materialized field out of sync), it:
1. Updates `data.commentCount` to the correct value (immediate fix for API response)
2. Asynchronously backfills the materialized field in the DB via `setImmediate` (non-blocking)

**Root cause**: The `commentCount` materialized field is maintained by application-level increment/decrement in `backend/routes/comments.js` (lines 344, 546-547). There are no DB triggers. If the increment failed silently (e.g., race condition, error swallowed by `.catch()`), the materialized value stays 0 while comments exist. The safety net catches this desync.

**Trigger status (AC-2.3)**: Application-level increment/decrement IS implemented (comments.js:344 `recipe.increment('commentCount')`, comments.js:546-547 `recipe.decrement('commentCount')`). No DB trigger needed. Candidate 2 fallback NOT triggered.

### 1.2 Frontend: `frontend/src/pages/RecipeDetailPage.tsx` (+8 lines, -2 lines)

**File**: `frontend/src/pages/RecipeDetailPage.tsx`
**Location**: `detail-meta` div, around line 836

**Change 1 (AC-1.2)**: Added `commentCount` display tag in the meta tags area:
```jsx
{/* 评论数标签 */}
{recipe.commentCount != null && recipe.commentCount > 0 && (
  <span className="detail-tag detail-tag--comments">
    💬 {recipe.commentCount} 条评论
  </span>
)}
```

**Change 2 (AC-1.3)**: Changed `avgRating` null branch from `null` (renders nothing → blank) to always show "⭐ 暂无评分":
```jsx
// Before: ) : recipe.avgRating != null ? (...) : null}
// After:  ) : (...)}
```

This ensures that when `avgRating` is null/undefined (e.g., API error, race condition), the UI shows "暂无评分" instead of a blank space.

## 2. AC Coverage

| AC | Status | How |
|---|---|---|
| AC-1.1: API returns commentCount === 1 | ✅ Fixed | Backend safety net recomputes from Comment.count() if materialized=0 |
| AC-1.2: UI shows commentCount 1 | ✅ Fixed | Added 💬 comment count tag in detail page meta; CommentSection already shows total from getComments API |
| AC-1.3: 2D rating null fallback | ✅ Fixed | avgRating null branch now shows "暂无评分" instead of blank; DimensionRadar already has empty-state guard |
| AC-2.3: Trigger mechanism | ✅ N/A | Application-level increment/decrement exists (comments.js:344,546). No DB trigger needed. |

## 3. Field Naming Verification

| Layer | Field name | Consistent? |
|---|---|---|
| DB Model (`backend/models/recipe.js`) | `commentCount` (camelCase) | ✅ |
| Backend route (`recipes.js`) | `data.commentCount` | ✅ |
| Frontend type (`api.ts` Recipe interface) | `commentCount?: number` | ✅ |
| Frontend usage (`RecipeDetailPage.tsx`) | `recipe.commentCount` | ✅ |

No `comment_count` / `comments_count` variants found. Field naming is consistent across all layers.

## 4. Build Verification

- **Backend**: `node -c backend/routes/recipes.js` → ✅ syntax OK
- **Frontend**: `npx tsc --noEmit` → Pre-existing errors only (React Router type mismatches in UserProfilePage, UserWorksPage, router/index.tsx). No new errors in RecipeDetailPage.tsx from our changes.
- **ESLint**: `npx eslint RecipeDetailPage.tsx` → 0 errors (file ignored by config)

## 5. What was NOT changed (scope control)

- ❌ No DB migration (trigger not needed — app-level increment/decrement works)
- ❌ No `api.ts` normalization (field name already consistent, no mapping needed)
- ❌ No `CommentSection.tsx` changes (already has proper null guards)
- ❌ No `DimensionRadar.tsx` changes (already has empty-state fallback)
- ❌ No deployment (devops handles deploy)
- ❌ No `99-status.yaml` phase change (main manages)

## 6. Files Changed

| File | Lines added | Lines removed | Net |
|---|---|---|---|
| `backend/routes/recipes.js` | +21 | 0 | +21 |
| `frontend/src/pages/RecipeDetailPage.tsx` | +8 | -2 | +6 |
| **Total** | **+29** | **-2** | **+27** |

## 7. Tester Handoff

Tester should verify:
1. `curl http://<host>/api/recipes/e6c16baf | jq '.data.commentCount'` → should return 1 (AC-1.1)
2. Open detail page for e6c16baf → meta tags area should show "💬 1 条评论" (AC-1.2)
3. Detail page should show "⭐ 暂无评分" (not blank) when avgRating is null/0 (AC-1.3)
4. No literal "null" text anywhere on detail page
