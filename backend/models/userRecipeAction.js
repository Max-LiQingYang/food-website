'use strict'

/**
 * models/userRecipeAction.js
 * 用户对食谱的操作记录（"我做过"标记）
 *
 * 字段: id(UUID), userId, recipeId, action(ENUM 'cooked'), count(INT), lastCookedAt(DATE), note(TEXT)
 * 联合唯一索引: userId+recipeId+action
 * 索引: idx_userId_lastCookedAt, idx_recipeId_action_count
 * timestamps: false
 */

module.exports = (sequelize, DataTypes) => {
  const UserRecipeAction = sequelize.define('UserRecipeAction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '记录唯一标识符',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '用户 ID',
    },
    recipeId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '食谱 ID',
    },
    action: {
      type: DataTypes.ENUM('cooked'),
      allowNull: false,
      defaultValue: 'cooked',
      comment: '动作类型（预留扩展：liked, tried 等）',
    },
    count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '累计烹饪次数',
    },
    lastCookedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '最近一次烹饪时间',
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: '简短备注（预留）',
    },
  }, {
    tableName: 'user_recipe_actions',
    timestamps: false,
    indexes: [
      {
        name: 'uniq_userId_recipeId_action',
        unique: true,
        fields: ['userId', 'recipeId', 'action'],
      },
      {
        name: 'idx_userId_lastCookedAt',
        fields: ['userId', { name: 'lastCookedAt', order: 'DESC' }],
      },
      {
        name: 'idx_recipeId_action_count',
        fields: ['recipeId', 'action'],
      },
    ],
  })

  UserRecipeAction.associate = (db) => {
    UserRecipeAction.belongsTo(db.User, { foreignKey: 'userId', as: 'user', constraints: false })
    UserRecipeAction.belongsTo(db.Recipe, { foreignKey: 'recipeId', as: 'recipe', constraints: false })
  }

  return UserRecipeAction
}
