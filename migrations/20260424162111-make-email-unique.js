'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.changeColumn('Users', 'email', {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false // Pastikan ini sesuai dengan kebutuhanmu
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.changeColumn('Users', 'email', {
      type: Sequelize.STRING,
      unique: false,
      allowNull: false
    });
  }
};
