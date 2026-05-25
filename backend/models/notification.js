'use strict'

module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    'Notification',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '通知接收者用户ID'
      },
      actorId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: '触发者用户ID'
      },
      type: {
        type: DataTypes.ENUM(
          'follow', 'comment', 'reply', 'favorite',
          'collection_add', 'meal_plan_reminder',
          'cooking_log_reminder', 'achievement_unlock', 'system'
        ),
        allowNull: false
      },
      message: {
        type: DataTypes.STRING(500),
        allowNull: false
      },
      link: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '点击通知跳转链接'
      },
      targetId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '关联对象ID'
      },
      targetType: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '关联对象类型: recipe/comment/user/collection'
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'notifications',
      timestamps: false,
      indexes: [
        { name: 'idx_notif_user', fields: ['userId'] },
        { name: 'idx_notif_actor', fields: ['actorId'] },
        { name: 'idx_notif_read', fields: ['userId', 'isRead'] },
        { name: 'idx_notif_type', fields: ['type'] }
      ]
    }
  )

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false
    })
    Notification.belongsTo(models.User, {
      foreignKey: 'actorId',
      as: 'actor',
      constraints: false
    })
  }

  return Notification
}