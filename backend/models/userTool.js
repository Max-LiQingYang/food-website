'use strict'

/**
 * models/userTool.js
 * 用户工具库（用户拥有哪些工具）
 * 字段：id, userId, toolId, createdAt
 * tableName: 'user_tools'
 */

module.exports = (sequelize, DataTypes) => {
  const UserTool = sequelize.define(
    'UserTool',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      toolId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'user_tools',
      timestamps: false,
      indexes: [
        { name: 'idx_ut_userId', fields: ['userId'] },
        { name: 'idx_ut_toolId', fields: ['toolId'] },
      ],
    }
  )

  UserTool.associate = function (models) {
    UserTool.belongsTo(models.User, { foreignKey: 'userId', as: 'user' })
    UserTool.belongsTo(models.KitchenTool, { foreignKey: 'toolId', as: 'tool' })
  }

  return UserTool
}