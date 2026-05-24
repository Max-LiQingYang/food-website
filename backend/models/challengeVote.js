'use strict'

/**
 * models/challengeVote.js
 * 挑战赛投票模型（一人一票，当前挑战）
 * 字段：id, submissionId(FK), userId, createdAt
 * 唯一约束：(submissionId, userId)
 */

module.exports = (sequelize, DataTypes) => {
  const ChallengeVote = sequelize.define(
    'ChallengeVote',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      submissionId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '投稿 ID',
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '投票用户 ID',
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'challenge_votes',
      timestamps: false,
      indexes: [
        {
          name: 'idx_cv_submission_user',
          unique: true,
          fields: ['submissionId', 'userId'],
        },
        { name: 'idx_cv_userId', fields: ['userId'] },
      ],
    }
  )

  ChallengeVote.associate = function (models) {
    ChallengeVote.belongsTo(models.ChallengeSubmission, { foreignKey: 'submissionId', as: 'submission' })
    ChallengeVote.belongsTo(models.User, { foreignKey: 'userId', as: 'voter' })
  }

  return ChallengeVote
}