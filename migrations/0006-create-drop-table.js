'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('drop', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'scheduled',
      },
      starts_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      ends_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      facade_config: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('drop', ['slug']);
    await queryInterface.addIndex('drop', ['status']);
    await queryInterface.addIndex('drop', ['starts_at', 'ends_at']);

    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX one_active_drop ON "drop" ((status)) WHERE status = 'active'`,
    );
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS one_active_drop');
    await queryInterface.dropTable('drop');
  },
};
