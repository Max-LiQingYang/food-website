'use strict'

/**
 * models/comment.js
 * 评论模型
 * 字段：id(主键), content, rating(1-5), taste(1-5), difficulty(1-5), presentation(1-5), value(1-5), userId, recipeId, createdAt, updatedAt
 * tableName: 'comments', timestamps: false
 *
 * 注意：userId/recipeId 使用 DataTypes.UUID 匹配 users.id/recipes.id 的 CHAR(36)
 * 关联使用 constraints: false，不建外键约束，由业务层保证一致性
 */

module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define(
    'Comment',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '评论唯一标识符'
      },
      parentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '父评论ID（回复关系）'
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '评论内容'
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5
        },
        comment: '综合评分(1-5)，可选'
      },
      taste: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 1, max: 5 },
        comment: '口味评分(1-5)'
      },
      difficulty: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 1, max: 5 },
        comment: '难度评分(1-5)'
      },
      presentation: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 1, max: 5 },
        comment: '卖相评分(1-5)'
      },
      value: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 1, max: 5 },
        comment: '性价比评分(1-5)'
      },
      likesCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '点赞数'
      },
      imageUrls: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '图片URL列表(JSON数组,最多3张)',
        get() {
          const raw = this.getDataValue('imageUrls')
          if (!raw) return []
          try { return JSON.parse(raw) } catch { return [] }
        },
        set(val) {
          const arr = Array.isArray(val) ? val.slice(0, 3) : []
          this.setDataValue('imageUrls', JSON.stringify(arr))
        }
      },
      isFeatured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '是否为精华评论'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '评论者用户 ID'
      },
      recipeId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '所属食谱 ID'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: '创建时间'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '更新时间'
      }
    },
    {
      tableName: 'comments',
      timestamps: false,
      indexes: [
        {
          name: 'idx_comment_recipeId',
          fields: ['recipeId']
        },
        {
          name: 'idx_comment_userId',
          fields: ['userId']
        },
        {
          name: 'idx_comment_recipeId_createdAt',
          fields: ['recipeId', 'createdAt']
        },
        {
          name: 'idx_comment_parentId',
          fields: ['parentId']
        },
        // 迭代 #134：评分历史模块专用索引（ARCH §4.1）
        {
          name: 'idx_comment_userId_rating',
          fields: ['userId', 'rating']
        },
        {
          name: 'idx_comment_userId_recipeId_createdAt',
          fields: ['userId', 'recipeId', 'createdAt']
        }
      ]
    }
  )

  Comment.associate = function (models) {
    Comment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false
    })
    Comment.belongsTo(models.Recipe, {
      foreignKey: 'recipeId',
      as: 'recipe',
      constraints: false
    })
  }

  return Comment
}
