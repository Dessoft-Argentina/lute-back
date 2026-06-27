'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payment', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      order_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      mp_payment_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      mp_preference_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending',
      },
      amount: {
        type: Sequelize.NUMERIC(12, 2),
        allowNull: true,
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('payment', ['mp_payment_id'], { unique: true });
    await queryInterface.addIndex('payment', ['order_id']);
    await queryInterface.addIndex('payment', ['status']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('payment');
  },
};
