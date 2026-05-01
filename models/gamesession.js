'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GameSession extends Model {
    static associate(models) {
      // Grup yang mengadakan game
      GameSession.belongsTo(models.DebtGroup, { foreignKey: 'groupId', as: 'group' });

      // User yang kalah
      GameSession.belongsTo(models.User, { foreignKey: 'loserId', as: 'loser' });

      // User yang menang (opsional)
      GameSession.belongsTo(models.User, { foreignKey: 'winnerId', as: 'winner' });

      // Debt yang otomatis dibuat
      GameSession.belongsTo(models.Debt, { foreignKey: 'debtId', as: 'debt' });
    }
  }

  GameSession.init({
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    gameType: {
      type: DataTypes.ENUM('spin_wheel', 'hot_potato', 'last_tap'),
      allowNull: false
    },
    participants: {
      type: DataTypes.JSON,
      allowNull: false
    },
    loserId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    winnerId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    debtId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'GameSession',
  });

  return GameSession;
};
