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
    await queryInterface.removeColumn('Users', 'otp_code');
    await queryInterface.removeColumn('Users', 'otp_expires_at');
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */await queryInterface.addColumn('Users', 'otp_code', { type: Sequelize.STRING });
    await queryInterface.addColumn('Users', 'otp_expires_at', { type: Sequelize.DATE });
  }
};
