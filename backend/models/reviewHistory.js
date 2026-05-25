'use strict'

/**
 * models/reviewHistory.js
 * 审核历史记录模型
 * 字段：id, reviewableType, reviewableId, reviewerId, action(approved|rejected|flagged),
 *       reason, previousScore, newScore, createdAt
 *
 * tableName: 'review_histories', timestamps: false
 */

module.exports = (sequelize, DataTypes) => {
  const ReviewHistory = sequelize.define(
    'ReviewHistory',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      reviewableType: {
        type: DataTypes.ENUM('recipe', 'comment'),
        allowNull: false,
        comment: '审核对象类型'
      },
      reviewableId: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: '审核对象 ID'
      },
      reviewerId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '审核人 ID'
      },
      action: {
        type: DataTypes.ENUM('approved', 'rejected', 'flagged'),
        allowNull: false,
        comment: '审核操作'
      },
      reason: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '审核原因/备注'
      },
      previousScore: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: '审核前质量评分'
      },
      newScore: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: '审核后质量评分'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: '审核时间'
      }
    },
    {
      tableName: 'review_histories',
      timestamps: false,
      indexes: [
        {
          name: 'idx_review_histories_reviewable',
          fields: ['reviewableType', 'reviewableId']
        },
        {
          name: 'idx_review_histories_reviewerId',
          fields: ['reviewerId']
        },
        {
          name: 'idx_review_histories_createdAt',
          fields: ['createdAt']
        }
      ]
    }
  )

  ReviewHistory.associate = function (models) {
    ReviewHistory.belongsTo(models.User, {
      foreignKey: 'reviewerId',
      as: 'reviewer',
      constraints: false
    })
  }

  return ReviewHistory
}