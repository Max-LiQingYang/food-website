'use strict'

/**
 * models/behaviorEvent.js
 * 用户行为追踪 — view/favorite/cook/share
 * 用于优化推荐算法权重
 */

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class BehaviorEvent extends Model {
    static associate(db) {
      BehaviorEvent.belongsTo(db.Recipe, { foreignKey: 'recipeId', constraints: false })
    }
  }

  BehaviorEvent.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    eventType: {
      type: DataTypes.ENUM('view', 'favorite', 'cook', 'share'),
      allowNull: false,
      comment: '事件类型',
    },
    recipeId: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '附加元数据 JSON',
      get() {
        const raw = this.getDataValue('metadata')
        if (!raw) return null
        try { return JSON.parse(raw) } catch { return raw }
      },
      set(val) {
        this.setDataValue('metadata', typeof val === 'string' ? val : JSON.stringify(val))
      },
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'BehaviorEvent',
    tableName: 'behavior_events',
    timestamps: false,
    indexes: [
      { fields: ['userId'] },
      { fields: ['recipeId'] },
      { fields: ['eventType'] },
      { fields: ['userId', 'eventType'] },
      { fields: ['userId', 'timestamp'] },
    ],
  })

  return BehaviorEvent
}