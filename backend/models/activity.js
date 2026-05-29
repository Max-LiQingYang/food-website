'use strict'

/**
 * models/activity.js
 * 用户活动模型（动态流）
 * 字段：id(主键), userId, type, targetId, targetType, extra(JSON), createdAt
 * tableName: 'activities'
 *
 * type 枚举值：
 *   'create_recipe'   - 发布食谱
 *   'comment'         - 评论
 *   'favorite'        - 收藏食谱
 *   'follow'          - 关注用户
 *   'review'          - 评分/评价
 *   'work'            - 上传作品（评论带图片）
 *
 * targetType 表示活动目标类型：'recipe', 'user', 'comment'
 * targetId  为目标的主键 ID
 * extra     存储附加信息（JSON 字符串），如食谱标题、评论内容摘要等
 */

module.exports = (sequelize, DataTypes) => {
  const Activity = sequelize.define(
    'Activity',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '活动唯一标识符'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '执行活动的用户 ID'
      },
      type: {
        type: DataTypes.STRING(30),
        allowNull: false,
        comment: '活动类型: create_recipe/comment/favorite/follow/review/work'
      },
      targetId: {
        type: DataTypes.STRING(36),
        allowNull: true,
        comment: '目标对象主键 ID'
      },
      targetType: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: '目标类型: recipe/user/comment'
      },
      extra: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '附加信息（JSON 字符串）'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: '活动时间'
      }
    },
    {
      tableName: 'activities',
      timestamps: false,
      indexes: [
        {
          name: 'idx_activity_userId',
          fields: ['userId']
        },
        {
          name: 'idx_activity_type',
          fields: ['type']
        },
        {
          name: 'idx_activity_createdAt',
          fields: ['createdAt']
        },
        {
          name: 'idx_activity_user_created',
          fields: ['userId', 'createdAt']
        }
      ]
    }
  )

  Activity.associate = function (models) {
    Activity.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false
    })
  }

  return Activity
}