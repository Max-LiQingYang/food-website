'use strict'

/**
 * models/comment.js
 * 评论模型
 * 字段：id(主键), content, rating(1-5), userId(FK), recipeId(FK), createdAt, updatedAt
 * tableName: 'comments', timestamps: false
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
        comment: '评分(1-5)，可选'
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '评论者用户 ID（FK 至 users）'
      },
      recipeId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '所属食谱 ID（FK 至 recipes）'
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
        }
      ]
    }
  )

  Comment.associate = function (models) {
    Comment.belongsTo(models.User, { foreignKey: 'userId', as: 'user' })
    Comment.belongsTo(models.Recipe, { foreignKey: 'recipeId', as: 'recipe' })
  }

  return Comment
}
