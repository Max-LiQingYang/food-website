'use strict'

/**
 * CollectionRecipe 关联模型 — 收藏夹与食谱的多对多关联
 * 字段: collectionId(UUID/FK), recipeId(UUID/FK)，复合主键
 */

module.exports = (sequelize, DataTypes) => {
  const CollectionRecipe = sequelize.define(
    'CollectionRecipe',
    {
      collectionId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        comment: '收藏夹 ID'
      },
      recipeId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        comment: '食谱 ID'
      }
    },
    {
      tableName: 'collection_recipes',
      timestamps: false,
      indexes: [
        {
          name: 'idx_cr_collectionId',
          fields: ['collectionId']
        },
        {
          name: 'idx_cr_recipeId',
          fields: ['recipeId']
        }
      ]
    }
  )

  CollectionRecipe.associate = (models) => {
    CollectionRecipe.belongsTo(models.Collection, {
      foreignKey: 'collectionId',
      as: 'collection',
      constraints: false
    })
    CollectionRecipe.belongsTo(models.Recipe, {
      foreignKey: 'recipeId',
      as: 'Recipe',
      constraints: false
    })
  }

  return CollectionRecipe
}