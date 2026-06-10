'use strict'

/**
 * models/cookingLog.js
 * CookingLog 模型 — 用户烹饪日志
 *
 * 字段：
 *   id(UUID/PK), userId(UUID), recipeId(UUID), recipeTitle(STRING),
 *   recipeCategory(STRING), cookedAt(DATEONLY), rating(INTEGER 1-5),
 *   notes(TEXT), duration(INTEGER/minutes), photoUrl(STRING)
 * tableName: 'cooking_logs'
 */

module.exports = (sequelize, DataTypes) => {
  const CookingLog = sequelize.define(
    'CookingLog',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '烹饪日志唯一标识符'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '所属用户 ID'
      },
      recipeId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '食谱 ID'
      },
      recipeTitle: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: '食谱标题（反范式化）'
      },
      recipeCategory: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '食谱分类（反范式化，用于统计）'
      },
      cookedAt: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW,
        comment: '烹饪日期'
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 },
        comment: '个人评分 1-5'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '烹饪笔记'
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '实际烹饪时间（分钟）'
      },
      photoUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '成品照片 URL'
      }
    },
    {
      tableName: 'cooking_logs',
      timestamps: true,
      indexes: [
        {
          name: 'idx_cooking_log_userId',
          fields: ['userId']
        },
        {
          name: 'idx_cooking_log_recipeId',
          fields: ['recipeId']
        }
      ]
    }
  )

  CookingLog.associate = (models) => {
    models.User.hasMany(CookingLog, {
      foreignKey: 'userId',
      as: 'cookingLogs'
    })
    CookingLog.belongsTo(models.Recipe, {
      foreignKey: 'recipeId',
      as: 'recipe'
    })
  }

  return CookingLog
}