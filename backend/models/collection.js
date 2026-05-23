'use strict'

/**
 * Collection 模型 — 用户收藏夹
 * 字段: id(UUID/PK), name(STRING), description(TEXT), userId(UUID/FK), createdAt
 */

module.exports = (sequelize, DataTypes) => {
  const Collection = sequelize.define(
    'Collection',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '收藏夹唯一标识符'
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '收藏夹名称'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '收藏夹描述'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '创建者用户 ID'
      }
    },
    {
      tableName: 'collections',
      timestamps: true,
      indexes: [
        {
          name: 'idx_collection_userId',
          fields: ['userId']
        }
      ]
    }
  )

  Collection.associate = (models) => {
    Collection.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false
    })
    models.User.hasMany(Collection, {
      foreignKey: 'userId',
      as: 'collections'
    })
    Collection.belongsToMany(models.Recipe, {
      through: 'CollectionRecipe',
      foreignKey: 'collectionId',
      otherKey: 'recipeId',
      as: 'recipes'
    })
    models.Recipe.belongsToMany(Collection, {
      through: 'CollectionRecipe',
      foreignKey: 'recipeId',
      otherKey: 'collectionId',
      as: 'collections'
    })
  }

  return Collection
}