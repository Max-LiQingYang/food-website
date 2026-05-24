'use strict'

/**
 * models/tagSuggestion.js
 * 用户搜索/浏览行为与标签关联记录
 * 用于标签推荐算法
 */

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class TagSuggestion extends Model {
    static associate(db) {
      // TagSuggestion.belongsTo(db.Recipe, { foreignKey: 'relatedRecipeId', constraints: false })
    }
  }

  TagSuggestion.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tag: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '标签文本',
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '标签分类: ingredient/method/cuisine/flavor/season',
    },
    count: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: '标签出现次数',
    },
    relatedTags: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '关联标签 JSON: [{tag,count}]',
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'TagSuggestion',
    tableName: 'tag_suggestions',
    timestamps: true,
  })

  return TagSuggestion
}