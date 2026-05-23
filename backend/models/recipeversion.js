/**
 * models/recipeversion.js
 * RecipeVersion 模型 — 食谱版本历史
 * 每次编辑食谱时自动创建快照
 */
module.exports = (sequelize, DataTypes) => {
  const RecipeVersion = sequelize.define(
    'RecipeVersion',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      recipeId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'recipe_id',
        comment: '关联的食谱 ID',
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '版本号（自增）',
      },
      changes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '变更内容 JSON: {changedFields: string[], snapshot: {title, description, ...}}',
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'user_id',
        comment: '编辑者用户 ID',
      },
      summary: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '变更摘要，如"更新了标题和食材"',
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
        comment: '创建时间',
      },
    },
    {
      tableName: 'recipe_versions',
      timestamps: false,
      indexes: [
        {
          name: 'idx_rv_recipeId',
          fields: ['recipe_id'],
        },
      ],
    }
  )

  RecipeVersion.associate = function (models) {
    RecipeVersion.belongsTo(models.Recipe, { foreignKey: 'recipeId', constraints: false, as: 'recipe' })
  }

  return RecipeVersion
}