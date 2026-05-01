'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('GameSessions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      groupId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Grup yang main (nullable — game bisa tanpa grup)',
        references: { model: 'DebtGroups', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      gameType: {
        type: Sequelize.ENUM('spin_wheel', 'hot_potato', 'last_tap'),
        allowNull: false
      },
      participants: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Array of user IDs yang ikut bermain'
      },
      loserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'User yang kalah / harus bayar',
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      winnerId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'User yang menang (opsional)',
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Jumlah yang harus dibayar si loser'
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Keterangan tagihan'
      },
      debtId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Debt yang otomatis dibuat dari hasil game',
        references: { model: 'Debts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('GameSessions');
  }
};
