'use strict'

/**
 * models/report.js
 * 举报模型
 * 用户可举报有问题的食谱（垃圾信息/不当内容/侵权/信息有误）
 * admin 可审查并更新状态
 */

module.exports = (sequelize, DataTypes) => {
  const Report = sequelize.define(
    'Report',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '举报唯一标识符'
      },
      recipeId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '被举报食谱 ID'
      },
      reporterId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '举报人用户 ID'
      },
      reason: {
        type: DataTypes.ENUM('spam', 'inappropriate', 'copyright', 'inaccurate', 'other'),
        allowNull: false,
        comment: '举报原因'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '补充说明'
      },
      status: {
        type: DataTypes.ENUM('pending', 'reviewed', 'dismissed', 'resolved'),
        defaultValue: 'pending',
        allowNull: false,
        comment: '处理状态'
      },
      reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '审查时间'
      },
      reviewerId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: '审查人用户 ID'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: '举报时间'
      }
    },
    {
      tableName: 'reports',
      timestamps: false,
      indexes: [
        {
          name: 'idx_report_recipeId',
          fields: ['recipeId']
        },
        {
          name: 'idx_report_reporterId',
          fields: ['reporterId']
        },
        {
          name: 'idx_report_status',
          fields: ['status']
        },
        {
          name: 'idx_report_createdAt',
          fields: ['createdAt']
        }
      ]
    }
  )

  Report.associate = function (models) {
    Report.belongsTo(models.Recipe, {
      foreignKey: 'recipeId',
      as: 'recipe',
      constraints: false
    })
    Report.belongsTo(models.User, {
      foreignKey: 'reporterId',
      as: 'reporter',
      constraints: false
    })
  }

  return Report
}