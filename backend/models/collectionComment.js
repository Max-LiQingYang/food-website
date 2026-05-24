const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class CollectionComment extends Model {
    static associate(models) {
      CollectionComment.belongsTo(models.Collection, {
        foreignKey: 'collectionId',
        targetKey: 'id',
        as: 'collection',
      })
      CollectionComment.belongsTo(models.User, {
        foreignKey: 'userId',
        targetKey: 'id',
        as: 'user',
      })
    }
  }

  CollectionComment.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    collectionId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 1000],
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'CollectionComment',
    tableName: 'collection_comments',
    timestamps: true,
  })

  return CollectionComment
}