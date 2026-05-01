'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DebtGroup extends Model {
    static associate(models) {
      DebtGroup.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      DebtGroup.hasMany(models.GroupMember, { foreignKey: 'groupId', as: 'members' });
      DebtGroup.hasMany(models.GroupTransaction, { foreignKey: 'groupId', as: 'transactions' });
      // Game sessions dalam grup ini
      DebtGroup.hasMany(models.GameSession, { foreignKey: 'groupId', as: 'gameSessions' });
    }
  }
  DebtGroup.init({
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    sequelize,
    modelName: 'DebtGroup',
  });
  return DebtGroup;
};
