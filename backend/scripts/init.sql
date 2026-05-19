-- ─────────────────────────────────────────────────────────────
-- 美食食谱网站 — MySQL 初始化脚本
-- 首次启动时由 Docker 自动执行（docker-entrypoint-initdb.d）
-- ─────────────────────────────────────────────────────────────

-- 使用已创建的数据库（Docker MYSQL_DATABASE 已自动创建）
USE food_website;

-- ─────────────────────────────────────────────────────────────
-- 1. 用户表 (users)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`         CHAR(36)     NOT NULL DEFAULT (UUID()),
  `username`   VARCHAR(64)  NOT NULL COMMENT '用户名（唯一）',
  `email`      VARCHAR(255) NULL     COMMENT '邮箱（唯一）',
  `password`   VARCHAR(255) NULL     COMMENT '密码（哈希存储）',
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '注册时间',
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_user_username` (`username`),
  UNIQUE INDEX `idx_user_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ─────────────────────────────────────────────────────────────
-- 2. 食谱表 (recipes)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `recipes` (
  `id`          CHAR(36)     NOT NULL DEFAULT (UUID()),
  `title`       VARCHAR(255) NOT NULL COMMENT '食谱标题',
  `coverImage`  VARCHAR(512) NULL     COMMENT '封面图片 URL',
  `author`      VARCHAR(128) NULL     COMMENT '作者/发布者',
  `cookTime`    INT          NULL     COMMENT '烹饪时长（分钟）',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_recipe_title` (`title`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='食谱表';

-- ─────────────────────────────────────────────────────────────
-- 3. 收藏表 (favorites)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `favorites` (
  `id`          CHAR(36)     NOT NULL DEFAULT (UUID()),
  `userId`      CHAR(36)     NOT NULL COMMENT '用户 ID',
  `recipeId`    CHAR(36)     NOT NULL COMMENT '食谱 ID',
  `isDeleted`   TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '软删除标记（0=正常，1=已删除）',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '收藏时间',
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_favorite_user_recipe` (`userId`, `recipeId`),
  INDEX `idx_favorite_user_created` (`userId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收藏表';

-- ─────────────────────────────────────────────────────────────
-- 种子数据（开发测试用）
-- ─────────────────────────────────────────────────────────────

-- 测试用户
INSERT INTO `users` (`id`, `username`, `email`, `password`) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'testuser', 'test@example.com', NULL);

-- 测试食谱
INSERT INTO `recipes` (`id`, `title`, `coverImage`, `author`, `cookTime`) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '红烧肉', 'https://example.com/hongshaorou.jpg', '美食达人', 60),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '清蒸鲈鱼', 'https://example.com/qingzhengluyu.jpg', '海鲜控', 30),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '麻婆豆腐', 'https://example.com/mapodoufu.jpg', '川菜大师', 20);
