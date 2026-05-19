'use strict'

/**
 * models/recipe.js
 * Recipe 模型
 * 字段：id(UUID/主键), title, coverImage(nullable), author(nullable), cookTime(nullable), createdAt
 * tableName: 'recipes', timestamps: false
 */

module.exports = (sequelize, DataTypes) => {
  const Recipe = sequelize.define(
    'Recipe',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '食谱唯一标识符'
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '食谱标题'
      },
      coverImage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '封面图片 URL'
      },
      author: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '作者/发布者'
      },
      cookTime: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '烹饪时长（分钟）'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: '创建时间'
      }
    },
    {
      tableName: 'recipes',
      timestamps: false,
      indexes: [
        {
          name: 'idx_recipe_title',
          fields: ['title']
        }
      ]
    }
  )

  return Recipe
}

/**
 * 原始 SQL（供 DBA / migration 参考）
 *
 * CREATE TABLE `recipes` (
 *   `id`          CHAR(36)      NOT NULL DEFAULT (UUID()),
 *   `title`       VARCHAR(255)  NOT NULL COMMENT '食谱标题',
 *   `coverImage`  VARCHAR(512)  NULL COMMENT '封面图片 URL',
 *   `author`      VARCHAR(128)  NULL COMMENT '作者/发布者',
 *   `cookTime`    INT           NULL COMMENT '烹饪时长（分钟）',
 *   `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
 *   PRIMARY KEY (`id`),
 *   INDEX `idx_recipe_title` (`title`)
 * ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='食谱表';
 */
