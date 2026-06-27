'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Compra', 'buyer_email', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Compra', 'buyer_name', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Compra', 'buyer_phone', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Compra', 'shipping_address', {
      type: Sequelize.JSONB,
      allowNull: true,
    });

    await queryInterface.addColumn('Compra', 'payment_status', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'pending',
    });

    await queryInterface.addColumn('Compra', 'tracking_token', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });

    await queryInterface.addColumn('Compra', 'total', {
      type: Sequelize.NUMERIC(12, 2),
      allowNull: true,
    });

    await queryInterface.addColumn('Compra', 'updated_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addIndex('Compra', ['buyer_email']);
    await queryInterface.addIndex('Compra', ['tracking_token']);

    await queryInterface.sequelize.query(
      'ALTER TABLE "Compra" ALTER COLUMN "Usuario_idUsuario" DROP NOT NULL',
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Compra', 'buyer_email');
    await queryInterface.removeColumn('Compra', 'buyer_name');
    await queryInterface.removeColumn('Compra', 'buyer_phone');
    await queryInterface.removeColumn('Compra', 'shipping_address');
    await queryInterface.removeColumn('Compra', 'payment_status');
    await queryInterface.removeColumn('Compra', 'tracking_token');
    await queryInterface.removeColumn('Compra', 'total');
    await queryInterface.removeColumn('Compra', 'updated_at');
  },
};
