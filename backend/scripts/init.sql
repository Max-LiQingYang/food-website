-- backend/scripts/init.sql
-- MySQL 初始化脚本
-- 用于手工初始化数据库表结构 + 示例数据（可选，Sequelize sync() 已自动建表）
-- 实际部署建议使用 migration 工具管理结构变更

-- 创建数据库（如果不存在）
-- CREATE DATABASE IF NOT EXISTS food_website
--   DEFAULT CHARACTER SET utf8mb4
--   DEFAULT COLLATE utf8mb4_unicode_ci;
-- USE food_website;

-- ─────────────────────────────────────────────────────────────────
-- 1. users 表
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`         CHAR(36)      NOT NULL DEFAULT (UUID()),
  `username`   VARCHAR(64)   NOT NULL COMMENT '用户名（唯一）',
  `email`      VARCHAR(255)  NULL     COMMENT '邮箱（唯一）',
  `password`   VARCHAR(255)  NULL     COMMENT '密码（哈希存储）',
  `createdAt`  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '注册时间',
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_user_username` (`username`),
  UNIQUE INDEX `idx_user_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ─────────────────────────────────────────────────────────────────
-- 2. recipes 表
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `recipes` (
  `id`          CHAR(36)      NOT NULL DEFAULT (UUID()),
  `title`       VARCHAR(255)  NOT NULL COMMENT '食谱标题',
  `coverImage`  VARCHAR(512)  NULL     COMMENT '封面图片 URL',
  `author`      VARCHAR(128)  NULL     COMMENT '作者/发布者',
  `cookTime`    INT           NULL     COMMENT '烹饪时长（分钟）',
  `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_recipe_title` (`title`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='食谱表';

-- favorites 表由 Sequelize sync() 管理（参见 backend/models/favorite.js）
-- 如需手工创建，运行 backend/models/favorite.js 底部的原始 SQL

-- ─────────────────────────────────────────────────────────────────
-- 3. 示例 recipe 数据（确保收藏列表有数据可测）
-- ─────────────────────────────────────────────────────────────────
INSERT INTO `recipes` (`id`, `title`, `coverImage`, `author`, `cookTime`, `createdAt`) VALUES
  (
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    '红烧肉',
    'https://img.example.com/recipes/hongshaorou.jpg',
    '张大厨',
    90,
    NOW()
  ),
  (
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    '宫保鸡丁',
    'https://img.example.com/recipes/gongbaojiding.jpg',
    '李师傅',
    30,
    NOW()
  ),
  (
    'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    '麻婆豆腐',
    'https://img.example.com/recipes/mapodoufu.jpg',
    '王大厨',
    25,
    NOW()
  )
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- ─────────────────────────────────────────────────────────────────
-- 4. 示例 user 数据（可选，用于本地测试登录）
-- ─────────────────────────────────────────────────────────────────
INSERT INTO `users` (`id`, `username`, `email`, `password`, `createdAt`) VALUES
  (
    'u1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
    'testuser',
    'test@example.com',
    -- 密码为 plaintext "password123" 的 bcrypt hash（仅供测试，生产请重新生成）
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    NOW()
  )
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);
