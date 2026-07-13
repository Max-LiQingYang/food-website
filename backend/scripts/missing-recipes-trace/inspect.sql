-- ============================================================================
-- T-2026-0617-005 missing-recipes-trace: 巡检 SQL（SELECT-only, 零写库）
-- 用途：对比 seed.js 历史基线 94 道与公网 API 当前 84 道，定位消失的 10 道
-- 用法：sqlite3 backend/database.sqlite < inspect.sql
--       （生产 MariaDB 需替换 UUID/createdAt 字面量为对应类型）
-- 重新运行：仅 SELECT，无副作用，可任意频次执行
-- ============================================================================

.headers on
.mode column
.nullvalue NULL

-- ----------------------------------------------------------------------------
-- 0. 当前基线
-- ----------------------------------------------------------------------------
SELECT 'current_total' AS metric, COUNT(*) AS value FROM recipes
UNION ALL
SELECT 'current_min_created',  MIN(createdAt)            FROM recipes
UNION ALL
SELECT 'current_max_created',  MAX(createdAt)            FROM recipes;

-- ----------------------------------------------------------------------------
-- 1. 历史基线（seed.js @ commit 0d00c29，2026-06-09）的 94 道 ID
--    用于外层 diff：本文件保留旧版 partial-id + createdAt 指纹，
--    便于人工核对 migrate-duplicates.js 的合并映射
-- ----------------------------------------------------------------------------
-- 历史 ID 共 94 道（见 backend/seeds/seed.js git show 0d00c29:backend/seeds/seed.js）

-- ----------------------------------------------------------------------------
-- 2. 历史"旧版"10 道（migrate-duplicates.js 中被合并删除的源记录）
--    共同特征：createdAt = '2026-05-23 02:52:39'
--    对应 partial-id（前 8 位）见下方 10 行
-- ----------------------------------------------------------------------------
-- 期望结果：0 行（旧版已在 2fc9165 提交中 DELETE）
SELECT id, title, createdAt, updatedAt
FROM recipes
WHERE createdAt = '2026-05-23 02:52:39'
  AND id LIKE '7ba9985a-%'   -- 冬阴功汤
   OR id LIKE 'b1901221-%'   -- 回锅肉
   OR id LIKE '3acc7ea6-%'   -- 提拉米苏
   OR id LIKE 'a535bb2d-%'   -- 法式洋葱汤
   OR id LIKE 'a182c8e6-%'   -- 泰式绿咖喱鸡
   OR id LIKE '2fff92e4-%'   -- 班尼迪克蛋
   OR id LIKE '63cd90c0-%'   -- 芒果糯米饭
   OR id LIKE '0a40d033-%'   -- 蒜蓉粉丝蒸扇贝
   OR id LIKE 'e4ca8023-%'   -- 韩式拌饭
   OR id LIKE 'e1896402-%';  -- 鱼香肉丝

-- ----------------------------------------------------------------------------
-- 3. 历史"新版"10 道（migrate-duplicates.js 中保留的目标记录）
--    共同特征：createdAt = '2026-05-24 05:01:06'
--    期望：10/10 命中，且 favoriteCount/commentCount 已合并
-- ----------------------------------------------------------------------------
SELECT id, title, createdAt, viewCount, favoriteCount, commentCount
FROM recipes
WHERE createdAt = '2026-05-24 05:01:06'
ORDER BY title;

-- ----------------------------------------------------------------------------
-- 4. 关联表合并证据（旧版 0 引用 / 新版继承全部引用）
-- ----------------------------------------------------------------------------
-- 4.1 旧版 partial-id 在 favorites 中应无残留
SELECT 'favorites_old_residual' AS check_name, COUNT(*) AS cnt
FROM favorites f
WHERE f.recipeId LIKE '7ba9985a-%'
   OR f.recipeId LIKE 'b1901221-%'
   OR f.recipeId LIKE '3acc7ea6-%'
   OR f.recipeId LIKE 'a535bb2d-%'
   OR f.recipeId LIKE 'a182c8e6-%'
   OR f.recipeId LIKE '2fff92e4-%'
   OR f.recipeId LIKE '63cd90c0-%'
   OR f.recipeId LIKE '0a40d033-%'
   OR f.recipeId LIKE 'e4ca8023-%'
   OR f.recipeId LIKE 'e1896402-%';
-- 期望：cnt = 0

-- 4.2 旧版 partial-id 在 comments 中应无残留
SELECT 'comments_old_residual' AS check_name, COUNT(*) AS cnt
FROM comments c
WHERE c.recipeId LIKE '7ba9985a-%'
   OR c.recipeId LIKE 'b1901221-%'
   OR c.recipeId LIKE '3acc7ea6-%'
   OR c.recipeId LIKE 'a535bb2d-%'
   OR c.recipeId LIKE 'a182c8e6-%'
   OR c.recipeId LIKE '2fff92e4-%'
   OR c.recipeId LIKE '63cd90c0-%'
   OR c.recipeId LIKE '0a40d033-%'
   OR c.recipeId LIKE 'e4ca8023-%'
   OR c.recipeId LIKE 'e1896402-%';
-- 期望：cnt = 0

-- 4.3 新版 partial-id 在 favorites 中应承接合并后的引用
SELECT SUBSTR(f.recipeId, 1, 8) AS new_partial, COUNT(*) AS fav_count
FROM favorites f
WHERE f.recipeId LIKE '09dbb410-%'   -- 冬阴功汤 (new)
   OR f.recipeId LIKE '57bb4513-%'   -- 回锅肉 (new)
   OR f.recipeId LIKE '30eb4af1-%'   -- 提拉米苏 (new)
   OR f.recipeId LIKE 'b00be566-%'   -- 法式洋葱汤 (new)
   OR f.recipeId LIKE '224220d6-%'   -- 泰式绿咖喱鸡 (new)
   OR f.recipeId LIKE '14302720-%'   -- 班尼迪克蛋 (new)
   OR f.recipeId LIKE 'b0d365e7-%'   -- 芒果糯米饭 (new)
   OR f.recipeId LIKE '8f72bfdd-%'   -- 蒜蓉粉丝蒸扇贝 (new)
   OR f.recipeId LIKE 'e009b9db-%'   -- 韩式拌饭 (new)
   OR f.recipeId LIKE '3fa05f8f-%'   -- 鱼香肉丝 (new)
GROUP BY SUBSTR(f.recipeId, 1, 8)
ORDER BY new_partial;

-- ----------------------------------------------------------------------------
-- 5. 反向校验：被合并食谱的 4 维完整性（应全部健康）
-- ----------------------------------------------------------------------------
SELECT id, title,
       CASE WHEN story IS NOT NULL AND LENGTH(story) > 50 THEN 1 ELSE 0 END AS story_ok,
       CASE WHEN culturalBackground IS NOT NULL AND LENGTH(culturalBackground) > 30 THEN 1 ELSE 0 END AS cb_ok,
       CASE WHEN nutrition IS NOT NULL THEN 1 ELSE 0 END AS nutrition_ok
FROM recipes
WHERE createdAt = '2026-05-24 05:01:06'
ORDER BY title;

-- ============================================================================
-- END — 巡检结论
-- 期望：0 旧版残留 + 10 新版命中 + 4 维完整 + 关联表已迁移
-- 数据零变更：全程 SELECT，重复执行无副作用
-- ============================================================================
