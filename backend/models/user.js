'use strict'

/**
 * models/user.js
 * User 模型
 * 字段：id(UUID主键), username(唯一), email(唯一/nullable), password(nullable), createdAt
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

  return User
}

/**
 * 原始 SQL（供 DBA / migration 参考）
 *
 * CREATE TABLE `users` (
 *   `id`         CHAR(36)     NOT NULL DEFAULT (UUID()),
 *   `username`   VARCHAR(64)  NOT NULL COMMENT '用户名（唯一）',
 *   `email`      VARCHAR(255) NULL COMMENT '邮箱（唯一）',
 *   `password`   VARCHAR(255) NULL COMMENT '密码（哈希存储）',
 *   `nickname`   VARCHAR(64)  NULL COMMENT '昵称',
 *   `role`       VARCHAR(32)  NOT NULL DEFAULT 'user' COMMENT '角色, user/admin',
 *   `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '注册时间',
 *   PRIMARY KEY (`id`),
 *   UNIQUE INDEX `idx_user_username` (`username`),
 *   UNIQUE INDEX `idx_user_email` (`email`)
 * ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
 */
