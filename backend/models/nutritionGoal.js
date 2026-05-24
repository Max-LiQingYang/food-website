const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class NutritionGoal extends Model {
    static associate(models) {
      NutritionGoal.belongsTo(models.User, {
        foreignKey: 'userId',
        targetKey: 'id',
        as: 'user',
      })
    }

    /** 基于用户体型的推荐值 */
    static getRecommended(userProfile = {}) {
      const { weight = 60, height = 165, age = 30, gender = 'female', activity = 'moderate' } = userProfile
      let bmr
      if (gender === 'male') {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
      } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161
      }
      const activityFactors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very: 1.9 }
      const factor = activityFactors[activity] || 1.55
      const tdee = Math.round(bmr * factor)

      return {
        calories: tdee,
        protein: Math.round(weight * 1.6),
        fat: Math.round(tdee * 0.25 / 9),
        carbs: Math.round(tdee * 0.50 / 4),
        fiber: gender === 'male' ? 38 : 25,
      }
    }
  }

  NutritionGoal.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    calories: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 2000,
    },
    protein: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 60,
    },
    fat: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 65,
    },
    carbs: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 250,
    },
    fiber: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 25,
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
    modelName: 'NutritionGoal',
    tableName: 'nutrition_goals',
    timestamps: true,
  })

  return NutritionGoal
}