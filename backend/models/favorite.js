'use strict'

/**
 * Favorite 模型
 * 字段: id, userId, recipeId, createdAt, isDeleted
 * 复合唯一索引: UNIQUE(userId, recipeId) WHERE isDeleted = false
 *
 * 使用 Sequelize ORM
 * 假设项目使用 SQLite（开发）/ MySQL/PostgreSQL（生产），
 * 所有 ORM 配置在 config/database.js 中。
 */

module.exports = (sequelize, DataTypes) => {
  const Favorite = sequelize.define(
    'Favorite',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '收藏记录唯一标识符'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '收藏者用户 ID',
        validate: {
          notNull: { msg: 'userId 不能为空' }
        }
      },
      recipeId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '被收藏的食谱 ID',
        validate: {
          notNull: { msg: 'recipeId 不能为空' }
        }
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: '收藏时间'
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '软删除标记'
      }
    },
    {
      tableName: 'favorites',
      timestamps: false, // 使用自定义 createdAt，不自动管理 updatedAt
      indexes: [
        // 按用户查询收藏列表，按时间倒序
        {
          name: 'idx_userId_createdAt',
          fields: ['userId', 'createdAt']
        },
        // 复合唯一索引：同一用户同一食谱只能有一条未删除的记录
        {
          name: 'uniq_userId_recipeId_active',
          unique: true,
          fields: ['userId', 'recipeId'],
          where: { isDeleted: false }
        }
      ]
    }
  )

  /**
   * 关联 Recipe 表（查询时 JOIN 获取食谱基本信息）
   * 注意：假设 Recipe 模型存在，且在 models/index.js 中已关联
   */
  Favorite.associate = (models) => {
    Favorite.belongsTo(models.Recipe, {
      foreignKey: 'recipeId',
      as: 'recipe',
      constraints: false // 不建外键约束，由业务层保证数据一致性
    })
  }

  return Favorite
}

/**
 * 原始 SQL（供 DBA / migration 参考）
 *
 * CREATE TABLE `favorites` (
 *   `id`          CHAR(36)      NOT NULL DEFAULT (UUID()),
 *   `userId`      CHAR(36)      NOT NULL COMMENT '收藏者用户 ID',
 *   `recipeId`    CHAR(36)      NOT NULL COMMENT '被收藏的食谱 ID',
 *   `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '收藏时间',
 *   `isDeleted`   TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '软删除标记',
 *   PRIMARY KEY (`id`),
 *   UNIQUE INDEX `uniq_userId_recipeId_active` (`userId`, `recipeId`, `isDeleted`),
 *   INDEX `idx_userId_createdAt` (`userId`, `createdAt`)
 * ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户收藏食谱表';
 */
