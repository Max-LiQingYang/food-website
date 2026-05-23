'use strict'

/**
 * models/commentlike.js
 * 评论点赞模型
 * 字段：id(主键), commentId, userId, createdAt
 * tableName: 'comment_likes'
 *
 * 联合唯一索引保证一人只能点赞一次
 */

module.exports = (sequelize, DataTypes) => {
  const CommentLike = sequelize.define(
    'CommentLike',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '点赞唯一标识符'
      },
      commentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '被点赞评论 ID'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '点赞用户 ID'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: '点赞时间'
      }
    },
    {
      tableName: 'comment_likes',
      timestamps: false,
      indexes: [
        {
          name: 'idx_commentlike_commentId',
          fields: ['commentId']
        },
        {
          name: 'idx_commentlike_userId',
          fields: ['userId']
        },
        {
          name: 'uq_commentlike_comment_user',
          unique: true,
          fields: ['commentId', 'userId']
        }
      ]
    }
  )

  CommentLike.associate = function (models) {
    CommentLike.belongsTo(models.Comment, {
      foreignKey: 'commentId',
      as: 'comment',
      constraints: false
    })
    CommentLike.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false
    })
  }

  return CommentLike
}