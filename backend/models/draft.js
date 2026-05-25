'use strict'

/**
 * models/draft.js
 * 食谱草稿模型
 * 字段：id, title, description, category, ingredients(JSON), steps(JSON),
 *       servings, difficulty, cookTime, coverImage, tips, categoryTags(JSON),
 *       season, userId, status(draft|scheduled|published), scheduledPublishAt,
 *       createdAt, updatedAt
 *
 * 关联：belongsTo User
 * tableName: 'drafts', timestamps: true (自动管理 createdAt/updatedAt)
 */

module.exports = (sequelize, DataTypes) => {
  const Draft = sequelize.define(
    'Draft',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        defaultValue: '',
        comment: '食谱标题'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '食谱描述'
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '食谱分类'
      },
      ingredients: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '[]',
        comment: '食材列表(JSON)',
        get() {
          const raw = this.getDataValue('ingredients')
          return raw ? JSON.parse(raw) : []
        },
        set(val) {
          this.setDataValue('ingredients', JSON.stringify(val))
        }
      },
      steps: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '[]',
        comment: '步骤列表(JSON)',
        get() {
          const raw = this.getDataValue('steps')
          return raw ? JSON.parse(raw) : []
        },
        set(val) {
          this.setDataValue('steps', JSON.stringify(val))
        }
      },
      servings: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '份量'
      },
      difficulty: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: '难度'
      },
      cookTime: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '烹饪时长(分钟)'
      },
      coverImage: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '封面图片 URL'
      },
      tips: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '小贴士'
      },
      categoryTags: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '[]',
        comment: '多维分类标签(JSON)',
        get() {
          const raw = this.getDataValue('categoryTags')
          return raw ? JSON.parse(raw) : []
        },
        set(val) {
          this.setDataValue('categoryTags', JSON.stringify(val))
        }
      },
      season: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: '季节'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '作者用户 ID'
      },
      status: {
        type: DataTypes.ENUM('draft', 'scheduled', 'published'),
        defaultValue: 'draft',
        comment: '草稿状态'
      },
      scheduledPublishAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '定时发布时间'
      }
    },
    {
      tableName: 'drafts',
      timestamps: true,
      indexes: [
        {
          name: 'idx_draft_userId',
          fields: ['userId']
        },
        {
          name: 'idx_draft_status',
          fields: ['status']
        },
        {
          name: 'idx_draft_userId_status',
          fields: ['userId', 'status']
        }
      ]
    }
  )

  Draft.associate = function (models) {
    Draft.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false
    })
  }

  return Draft
}