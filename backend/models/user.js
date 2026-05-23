'use strict'

/**
 * models/user.js
 * User 模型
 * 字段：id(UUID主键), username(唯一), email(唯一/nullable), password(nullable), nickname, role, createdAt
 * tableName: 'users', timestamps: false
 */

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '用户唯一标识符'
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: '用户名（唯一）'
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        comment: '邮箱（唯一，可为空）'
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '密码（哈希存储，可为空）'
      },
      nickname: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '昵称'
      },
      role: {
        type: DataTypes.STRING,
        defaultValue: 'user',
        comment: '角色, user/admin'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: '注册时间'
      }
    },
    {
      tableName: 'users',
      timestamps: false,
      indexes: [
        {
          name: 'idx_user_username',
          unique: true,
          fields: ['username']
        },
        {
          name: 'idx_user_email',
          unique: true,
          fields: ['email']
        }
      ]
    }
  )

  User.associate = function (models) {
    User.hasMany(models.Recipe, { foreignKey: 'userId', as: 'recipes' })
    User.hasMany(models.Follow, { foreignKey: 'followerId', as: 'followingRelations', constraints: false })
    User.hasMany(models.Follow, { foreignKey: 'followingId', as: 'followerRelations', constraints: false })
    // 通过关联查询关注/粉丝列表（belongsToMany）
    User.belongsToMany(models.User, {
      through: models.Follow,
      as: 'followers',
      foreignKey: 'followingId',
      otherKey: 'followerId',
      constraints: false
    })
    User.belongsToMany(models.User, {
      through: models.Follow,
      as: 'following',
      foreignKey: 'followerId',
      otherKey: 'followingId',
      constraints: false
    })
  }

  return User
}