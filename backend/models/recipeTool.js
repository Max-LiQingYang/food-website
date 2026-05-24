'use strict'

/**
 * models/recipeTool.js
 * 食谱-工具关联表（多对多）
 * 字段：id, recipeId, toolId
 * tableName: 'recipe_tools'
 */

module.exports = (sequelize, DataTypes) => {
  const RecipeTool = sequelize.define(
    'RecipeTool',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      recipeId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      toolId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: 'recipe_tools',
      timestamps: false,
      indexes: [
        { name: 'idx_rt_recipeId', fields: ['recipeId'] },
        { name: 'idx_rt_toolId', fields: ['toolId'] },
      ],
    }
  )

  RecipeTool.associate = function (models) {
    RecipeTool.belongsTo(models.Recipe, { foreignKey: 'recipeId', as: 'recipe' })
    RecipeTool.belongsTo(models.KitchenTool, { foreignKey: 'toolId', as: 'tool' })
  }

  return RecipeTool
}