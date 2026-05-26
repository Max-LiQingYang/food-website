'use strict'

/**
 * RecipeFork 模型
 * 字段: id, originalRecipeId, forkedRecipeId, forkedByUserId, changesNote, createdAt
 *
 * 跟踪食谱的改编谱系：谁从哪个食谱改编成了哪个新食谱
 * 使用 Sequelize ORM
 */

module.exports = (sequelize, DataTypes) => {
  const RecipeFork = sequelize.define(
    'RecipeFork',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '改编记录唯一标识符'
      },
      originalRecipeId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '原食谱 ID',
        validate: {
          notNull: { msg: 'originalRecipeId 不能为空' }
        }
      },
      forkedRecipeId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        comment: '改编后的新食谱 ID（唯一，一篇食谱只能由一个 fork 产生）',
        validate: {
          notNull: { msg: 'forkedRecipeId 不能为空' }
        }
      },
      forkedByUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '改编者用户 ID',
        validate: {
          notNull: { msg: 'forkedByUserId 不能为空' }
        }
      },
      changesNote: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '改编说明（有哪些改动）'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: '改编时间'
      }
    },
    {
      tableName: 'recipe_forks',
      timestamps: false, // 使用自定义 createdAt
      indexes: [
        {
          name: 'idx_originalRecipeId',
          fields: ['originalRecipeId']
        },
        {
          name: 'idx_forkedByUserId',
          fields: ['forkedByUserId']
        },
        {
          name: 'uniq_forkedRecipeId',
          unique: true,
          fields: ['forkedRecipeId']
        }
      ]
    }
  )

  /**
   * 关联 Recipe 和 User 表
   */
  RecipeFork.associate = (models) => {
    RecipeFork.belongsTo(models.Recipe, {
      foreignKey: 'originalRecipeId',
      as: 'originalRecipe',
      constraints: false
    })
    RecipeFork.belongsTo(models.Recipe, {
      foreignKey: 'forkedRecipeId',
      as: 'forkedRecipe',
      constraints: false
    })
    RecipeFork.belongsTo(models.User, {
      foreignKey: 'forkedByUserId',
      as: 'forkedBy',
      constraints: false
    })
  }

  return RecipeFork
}

/**
 * 原始 SQL（供 DBA / migration 参考）
 *
 * CREATE TABLE `recipe_forks` (
 *   `id`                CHAR(36)      NOT NULL DEFAULT (UUID()),
 *   `originalRecipeId`  CHAR(36)      NOT NULL COMMENT '原食谱 ID',
 *   `forkedRecipeId`    CHAR(36)      NOT NULL COMMENT '改编后的新食谱 ID',
 *   `forkedByUserId`    CHAR(36)      NOT NULL COMMENT '改编者用户 ID',
 *   `changesNote`       TEXT          NULL     COMMENT '改编说明',
 *   `createdAt`         DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '改编时间',
 *   PRIMARY KEY (`id`),
 *   UNIQUE INDEX `uniq_forkedRecipeId` (`forkedRecipeId`),
 *   INDEX `idx_originalRecipeId` (`originalRecipeId`),
 *   INDEX `idx_forkedByUserId` (`forkedByUserId`)
 * ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='食谱改编谱系表';
 */