'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.hasMany(models.PaymentMethod, { foreignKey: 'userId', as: 'paymentMethods' });
      User.hasMany(models.Debt, { foreignKey: 'userId', as: 'debts' });
      User.hasMany(models.Debt, { foreignKey: 'otherUserId', as: 'involvedDebts' });
      User.hasMany(models.GroupMember, { foreignKey: 'userId', as: 'groupMemberships' });
      User.hasMany(models.DebtGroup, { foreignKey: 'createdBy', as: 'createdGroups' });
      User.hasMany(models.GroupTransaction, { foreignKey: 'fromUserId', as: 'sentTransactions' });
      User.hasMany(models.GroupTransaction, { foreignKey: 'toUserId', as: 'receivedTransactions' });
      User.hasMany(models.SettlementRequest, { foreignKey: 'fromUserId', as: 'sentSettlements' });
      User.hasMany(models.SettlementRequest, { foreignKey: 'toUserId', as: 'receivedSettlements' });
    }
  }
  User.init({
    username: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    is_verified: DataTypes.BOOLEAN,
    photo_path: DataTypes.STRING,
    biometric_key: DataTypes.STRING,
    fcm_token: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};