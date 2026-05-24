'use strict'

/**
 * models/kitchenTool.js
 * 厨房工具模型
 * 字段：id(UUID), name, category, icon, description, essential(b), createdAt
 * tableName: 'kitchen_tools'
 */

module.exports = (sequelize, DataTypes) => {
  const KitchenTool = sequelize.define(
    'KitchenTool',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '工具名称',
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'basic',
        comment: '分类: basic/cutting/cooking/baking/measuring/specialty',
      },
      icon: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '工具图标（emoji 或 URL）',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '工具描述和用途',
      },
      essential: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否必备工具',
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'kitchen_tools',
      timestamps: false,
      indexes: [
        { name: 'idx_kit_tool_category', fields: ['category'] },
      ],
    }
  )

  KitchenTool.associate = function (models) {
    KitchenTool.hasMany(models.RecipeTool, { foreignKey: 'toolId', as: 'recipeTools' })
    KitchenTool.hasMany(models.UserTool, { foreignKey: 'toolId', as: 'userTools' })
  }

  return KitchenTool
}