'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('admin_user', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'staff',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.createTable('audit_log', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      admin_user_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      entity: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      entity_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('admin_user', ['email']);
    await queryInterface.addIndex('audit_log', ['admin_user_id']);
    await queryInterface.addIndex('audit_log', ['action']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('audit_log');
    await queryInterface.dropTable('admin_user');
  },
};
