'use strict'

/**
 * models/pushSubscription.js
 * 浏览器推送订阅存储模型
 */

module.exports = (sequelize, DataTypes) => {
  const PushSubscription = sequelize.define(
    'PushSubscription',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '用户ID'
      },
      endpoint: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '推送端点URL'
      },
      p256dh: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'p256dh 密钥'
      },
      auth: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'auth 密钥'
      },
      userAgent: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: '浏览器UA标识'
      }
    },
    {
      tableName: 'push_subscriptions',
      timestamps: true,
      indexes: [
        { name: 'idx_push_user', fields: ['userId'] },
        { name: 'idx_push_endpoint', fields: ['endpoint'], unique: true }
      ]
    }
  )

  PushSubscription.associate = (models) => {
    PushSubscription.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false
    })
  }

  return PushSubscription
}