'use strict'

/**
 * models/recipe.js
 * Recipe 模型
 * 字段：id(UUID/主键), title, coverImage, author, cookTime, userId(FK), createdAt
 * tableName: 'recipes', timestamps: false
 */

module.exports = (sequelize, DataTypes) => {
  const Recipe = sequelize.define(
    'Recipe',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '食谱唯一标识符'
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '食谱标题'
      },
      coverImage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '封面图片 URL'
      },
      author: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '作者/发布者显示名'
      },
      cookTime: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '烹饪时长（分钟）'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '食谱简介'
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '分类: chinese, western, dessert, japanese, korean, other'
      },
      ingredients: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '食材 JSON 数组: [{name, amount, unit}]'
      },
      steps: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '步骤 JSON 数组: [{stepNumber, content, image?}]'
      },
      servings: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '份数'
      },
      difficulty: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '难度: easy, medium, hard'
      },
      categoryTags: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '多维分类标签 JSON: {ingredient, method, cuisine, flavor, price}'
      },
      nutrition: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '营养信息 JSON: {calories, protein, fat, carbs, fiber, sodium}'
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '创建者用户 ID（FK 至 users）'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: '创建时间'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '更新时间'
      }
    },
    {
      tableName: 'recipes',
      timestamps: false,
      indexes: [
        {
          name: 'idx_recipe_title',
          fields: ['title']
        },
        {
          name: 'idx_recipe_category',
          fields: ['category']
        },
        {
          name: 'idx_recipe_userId',
          fields: ['userId']
        }
      ]
    }
  )

  Recipe.associate = function (models) {
    Recipe.belongsTo(models.User, { foreignKey: 'userId', as: 'user' })
  }

  return Recipe
}