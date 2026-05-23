'use strict'

/**
 * models/follow.js
 * 用户关注模型
 * 字段：id(主键), followerId(关注者), followingId(被关注者), createdAt
 * tableName: 'follows'
 *
 * followerId + followingId 联合唯一索引确保不能重复关注
 * 无外键约束（兼容生产环境手工建表）
 */

module.exports = (sequelize, DataTypes) => {
  const Follow = sequelize.define(
    'Follow',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '关注关系唯一标识符'
      },
      followerId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '关注者用户 ID'
      },
      followingId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '被关注者用户 ID'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: '关注时间'
      }
    },
    {
      tableName: 'follows',
      timestamps: false,
      indexes: [
        {
          name: 'idx_follow_follower',
          fields: ['followerId']
        },
        {
          name: 'idx_follow_following',
          fields: ['followingId']
        },
        {
          name: 'uq_follow_pair',
          unique: true,
          fields: ['followerId', 'followingId']
        }
      ]
    }
  )

  Follow.associate = function (models) {
    Follow.belongsTo(models.User, {
      foreignKey: 'followerId',
      as: 'follower',
      constraints: false
    })
    Follow.belongsTo(models.User, {
      foreignKey: 'followingId',
      as: 'following',
      constraints: false
    })
  }

  return Follow
}