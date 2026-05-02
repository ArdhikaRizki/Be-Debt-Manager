'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Gunakan backtick (`) untuk string JS, dan kutip ganda (") untuk nama ENUM
    await queryInterface.sequelize.query(`ALTER TYPE "enum_Debts_status" ADD VALUE IF NOT EXISTS 'settled';`);
    await queryInterface.sequelize.query(`ALTER TYPE "enum_Debts_status" ADD VALUE IF NOT EXISTS 'rejected';`);
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
