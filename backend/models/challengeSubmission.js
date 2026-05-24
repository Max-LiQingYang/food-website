'use strict'

/**
 * models/challengeSubmission.js
 * 挑战赛投稿模型
 * 字段：id, challengeId(FK), recipeId(FK), userId, description, voteCount, createdAt
 */

module.exports = (sequelize, DataTypes) => {
  const ChallengeSubmission = sequelize.define(
    'ChallengeSubmission',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      challengeId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '所属挑战 ID',
      },
      recipeId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '投稿食谱 ID',
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '投稿用户 ID',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '投稿说明',
      },
      voteCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '得票数（物化）',
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'challenge_submissions',
      timestamps: false,
      indexes: [
        { name: 'idx_cs_challengeId', fields: ['challengeId'] },
        { name: 'idx_cs_userId', fields: ['userId'] },
        { name: 'idx_cs_voteCount', fields: ['voteCount'] },
      ],
    }
  )

  ChallengeSubmission.associate = function (models) {
    ChallengeSubmission.belongsTo(models.Challenge, { foreignKey: 'challengeId', as: 'challenge' })
    ChallengeSubmission.belongsTo(models.Recipe, { foreignKey: 'recipeId', as: 'recipe' })
    ChallengeSubmission.belongsTo(models.User, { foreignKey: 'userId', as: 'submitter' })
    ChallengeSubmission.hasMany(models.ChallengeVote, { foreignKey: 'submissionId', as: 'votes' })
  }

  return ChallengeSubmission
}