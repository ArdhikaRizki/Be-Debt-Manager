'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class GroupTransaction extends Model {
    static associate(models) {
      GroupTransaction.belongsTo(models.DebtGroup, { foreignKey: 'groupId', as: 'group' });
      GroupTransaction.belongsTo(models.User, { foreignKey: 'fromUserId', as: 'fromUser' });
      GroupTransaction.belongsTo(models.User, { foreignKey: 'toUserId', as: 'toUser' });
      GroupTransaction.hasMany(models.SettlementRequest, { foreignKey: 'groupTransactionId', as: 'settlementRequests' });
    }
  }
  GroupTransaction.init({
    groupId: { type: DataTypes.INTEGER, allowNull: false },
    fromUserId: { type: DataTypes.INTEGER, allowNull: false },
    toUserId: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true }
  }, {
    sequelize,
    modelName: 'GroupTransaction',
  });
  return GroupTransaction;
};
