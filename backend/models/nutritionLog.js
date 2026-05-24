const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class NutritionLog extends Model {
    static associate(models) {
      NutritionLog.belongsTo(models.User, {
        foreignKey: 'userId',
        targetKey: 'id',
        as: 'user',
      })
      NutritionLog.belongsTo(models.Recipe, {
        foreignKey: 'recipeId',
        targetKey: 'id',
        as: 'recipe',
      })
    }
  }

  NutritionLog.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    recipeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    mealType: {
      type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snack'),
      allowNull: false,
    },
    servings: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 1,
      allowNull: false,
    },
    // Cached nutrition values at time of logging
    calories: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 0,
    },
    protein: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 0,
    },
    fat: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 0,
    },
    carbs: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 0,
    },
    fiber: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 0,
    },
    sodium: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'NutritionLog',
    tableName: 'nutrition_logs',
    timestamps: true,
    indexes: [
      { name: 'idx_nutrition_user_date', fields: ['userId', 'date'] },
      { name: 'idx_nutrition_date', fields: ['date'] },
    ],
  })

  return NutritionLog
}