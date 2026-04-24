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
      // define association here
    }
  }
  User.init({
    username: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    is_verified: DataTypes.BOOLEAN,
    photo_path: DataTypes.STRING,
    biometric_key: DataTypes.STRING,
    otp_code: DataTypes.STRING,
    otp_expires_at: DataTypes.DATE,

  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};