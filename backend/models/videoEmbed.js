'use strict'

/**
 * models/videoEmbed.js
 * 食谱视频嵌入模型
 * 字段：id, recipeId(FK), videoUrl, platform, coverImage, title, duration, sortOrder, createdAt
 */

module.exports = (sequelize, DataTypes) => {
  const VideoEmbed = sequelize.define(
    'VideoEmbed',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      recipeId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '关联食谱 ID',
      },
      videoUrl: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: '视频 URL',
      },
      platform: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'generic',
        comment: '视频平台: generic, youtube, bilibili, tiktok',
      },
      coverImage: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '视频封面图片 URL',
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '视频标题',
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '视频时长（秒）',
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '排序序号',
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'video_embeds',
      timestamps: false,
      indexes: [
        { name: 'idx_video_recipeId', fields: ['recipeId'] },
      ],
    }
  )

  VideoEmbed.associate = function (models) {
    VideoEmbed.belongsTo(models.Recipe, { foreignKey: 'recipeId', as: 'recipe' })
  }

  return VideoEmbed
}