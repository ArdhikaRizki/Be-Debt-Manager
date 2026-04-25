'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Debts', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'User yang membuat / memiliki catatan hutang ini',
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      otherUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'User lawan (bisa null jika dicatat sendiri)',
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      counterpartId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID debt cermin di sisi otherUser (self-referencing)',
        references: { model: 'Debts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      description: { type: Sequelize.STRING, allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'settlement_requested'),
        defaultValue: 'pending',
        allowNull: false
      },
      is_paid: { type: Sequelize.BOOLEAN, defaultValue: false },
      due_date: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Debts');
  }
};
