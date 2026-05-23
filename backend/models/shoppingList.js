'use strict'

/**
 * ShoppingList 模型 — 用户购物清单
 * 字段: id(UUID/PK), userId(UUID/FK), name(STRING), items(TEXT/JSON), createdAt, updatedAt
 */

module.exports = (sequelize, DataTypes) => {
  const ShoppingList = sequelize.define(
    'ShoppingList',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '购物清单唯一标识符'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '所属用户 ID'
      },
      name: {
        type: DataTypes.STRING(100),
        defaultValue: '我的购物清单',
        comment: '清单名称'
      },
      items: {
        type: DataTypes.TEXT,
        defaultValue: '[]',
        comment: 'JSON 数组: [{name, amount, unit, checked}]'
      }
    },
    {
      tableName: 'shopping_lists',
      timestamps: true,
      indexes: [
        {
          name: 'idx_shopping_list_userId',
          fields: ['userId']
        }
      ]
    }
  )

  ShoppingList.associate = (models) => {
    ShoppingList.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    })
    models.User.hasMany(ShoppingList, {
      foreignKey: 'userId',
      as: 'shoppingLists'
    })
  }

  return ShoppingList
}