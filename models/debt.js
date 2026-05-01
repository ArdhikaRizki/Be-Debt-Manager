'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Debt extends Model {
    static associate(models) {
      // Pemilik debt
      Debt.belongsTo(models.User, { foreignKey: 'userId', as: 'owner' });
      // User lawan
      Debt.belongsTo(models.User, { foreignKey: 'otherUserId', as: 'otherUser' });
      // Debt cermin (self-referencing)
      Debt.belongsTo(models.Debt, { foreignKey: 'counterpartId', as: 'counterpart' });
      Debt.hasOne(models.Debt, { foreignKey: 'counterpartId', as: 'counterpartOf' });
      // Settlement requests
      Debt.hasMany(models.SettlementRequest, { foreignKey: 'debtId', as: 'settlementRequests' });
      // Game session yang menghasilkan debt ini (jika ada)
      Debt.hasOne(models.GameSession, { foreignKey: 'debtId', as: 'gameSession' });
    }
  }
  Debt.init({
    userId: { type: DataTypes.INTEGER, allowNull: false },
    otherUserId: { type: DataTypes.INTEGER, allowNull: true },
    counterpartId: { type: DataTypes.INTEGER, allowNull: true },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'settlement_requested'),
      defaultValue: 'pending',
      allowNull: false
    },
    is_paid: { type: DataTypes.BOOLEAN, defaultValue: false },
    due_date: { type: DataTypes.DATE, allowNull: true }
  }, {
    sequelize,
    modelName: 'Debt',
  });
  return Debt;
};
