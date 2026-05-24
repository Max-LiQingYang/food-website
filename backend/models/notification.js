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
      type: {
        type: DataTypes.ENUM('follow', 'comment', 'favorite', 'milestone'),
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
        { name: 'idx_notif_read', fields: ['userId', 'isRead'] }
      ]
    }
  )

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false
    })
  }

  return Notification
}