'use strict'

/**
 * models/challenge.js
 * 食谱挑战赛模型
 * 字段：id(UUID), title, description, theme, coverImage, startDate, endDate,
 *       status(draft/active/voting/closed), rules, prize, createdBy, createdAt, updatedAt
 */

module.exports = (sequelize, DataTypes) => {
  const Challenge = sequelize.define(
    'Challenge',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: '挑战标题',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '挑战描述',
      },
      theme: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '挑战主题（如：夏日凉菜、快手早餐等）',
      },
      coverImage: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '挑战封面图',
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '开始时间',
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '结束时间',
      },
      status: {
        type: DataTypes.ENUM('draft', 'active', 'voting', 'closed'),
        defaultValue: 'draft',
        comment: '状态: draft/active/voting/closed',
      },
      rules: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '挑战规则（Markdown）',
      },
      prize: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '奖品说明',
      },
      submissionCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '投稿数（物化）',
      },
      voteCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '总投票数（物化）',
      },
      createdBy: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '创建者用户 ID',
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'challenges',
      timestamps: false,
      indexes: [
        { name: 'idx_challenge_status', fields: ['status'] },
        { name: 'idx_challenge_theme', fields: ['theme'] },
      ],
    }
  )

  Challenge.associate = function (models) {
    Challenge.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' })
    Challenge.hasMany(models.ChallengeSubmission, { foreignKey: 'challengeId', as: 'submissions' })
  }

  return Challenge
}