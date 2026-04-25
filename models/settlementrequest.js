'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SettlementRequest extends Model {
    static associate(models) {
      SettlementRequest.belongsTo(models.Debt, { foreignKey: 'debtId', as: 'debt' });
      SettlementRequest.belongsTo(models.GroupTransaction, { foreignKey: 'groupTransactionId', as: 'groupTransaction' });
      SettlementRequest.belongsTo(models.User, { foreignKey: 'fromUserId', as: 'fromUser' });
      SettlementRequest.belongsTo(models.User, { foreignKey: 'toUserId', as: 'toUser' });
    }
  }
  SettlementRequest.init({
    debtId: { type: DataTypes.INTEGER, allowNull: true },
    groupTransactionId: { type: DataTypes.INTEGER, allowNull: true },
    fromUserId: { type: DataTypes.INTEGER, allowNull: false },
    toUserId: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'SettlementRequest',
  });
  return SettlementRequest;
};
