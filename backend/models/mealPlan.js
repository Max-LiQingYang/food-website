'use strict'

/**
 * models/mealPlan.js
 * MealPlan 模型 — 用户每周餐单计划
 *
 * 字段：
 *   id(UUID/PK), userId(UUID), weekStart(DATEONLY), meals(TEXT/JSON)
 *   createdAt, updatedAt
 * tableName: 'meal_plans'
 */

module.exports = (sequelize, DataTypes) => {
  const MealPlan = sequelize.define(
    'MealPlan',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '餐单唯一标识符'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '所属用户 ID'
      },
      weekStart: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: '周起始日期（周一），格式 YYYY-MM-DD'
      },
      meals: {
        type: DataTypes.TEXT,
        defaultValue: '[]',
        comment: 'JSON 数组: [{day:0-6, mealType, recipeId, recipeTitle, recipeImage}]',
        field: 'mealData'
      }
    },
    {
      tableName: 'meal_plans',
      timestamps: true,
      indexes: [
        {
          name: 'idx_meal_plan_user_week',
          unique: true,
          fields: ['userId', 'weekStart']
        }
      ]
    }
  )

  MealPlan.associate = (models) => {
    models.User.hasMany(MealPlan, {
      foreignKey: 'userId',
      as: 'mealPlans'
    })
  }

  return MealPlan
}