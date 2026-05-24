'use strict'

module.exports = (sequelize, DataTypes) => {
  const Achievement = sequelize.define(
    'Achievement',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM(
          'first-recipe', 'recipe-10', 'recipe-50',
          'first-comment', 'favorite-10', 'favorite-50',
          'popular-recipe', 'social-butterfly', 'master-chef'
        ),
        allowNull: false
      },
      title: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      description: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      icon: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'emoji icon'
      },
      unlockedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'achievements',
      timestamps: false,
      indexes: [
        { name: 'idx_achievement_user', fields: ['userId'] }
      ]
    }
  )

  Achievement.associate = (models) => {
    Achievement.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false
    })
  }

  return Achievement
}