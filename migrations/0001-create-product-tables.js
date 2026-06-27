'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create product table (renamed from Producto, with new fields)
    await queryInterface.createTable('product', {
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
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      },
      base_price: {
        type: Sequelize.NUMERIC(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      drop_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: null,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

    // Create product_variant table
    await queryInterface.createTable('product_variant', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      product_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'product', key: 'id' },
        onDelete: 'CASCADE',
      },
      size: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      color: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sku: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      price_override: {
        type: Sequelize.NUMERIC(12, 2),
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

    // Create product_image table
    await queryInterface.createTable('product_image', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      product_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'product', key: 'id' },
        onDelete: 'CASCADE',
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      alt: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create indexes
    await queryInterface.addIndex('product', ['slug']);
    await queryInterface.addIndex('product', ['drop_id']);
    await queryInterface.addIndex('product', ['category']);
    await queryInterface.addIndex('product_variant', ['sku']);
    await queryInterface.addIndex('product_variant', ['product_id']);
    await queryInterface.addIndex('product_image', ['product_id', 'position']);

    // Add CHECK constraint for stock >= 0
    await queryInterface.sequelize.query(
      'ALTER TABLE product_variant ADD CONSTRAINT stock_non_negative CHECK (stock >= 0)'
    );

    // Add CHECK constraint for base_price >= 0
    await queryInterface.sequelize.query(
      'ALTER TABLE product ADD CONSTRAINT base_price_non_negative CHECK (base_price >= 0)'
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('product_image');
    await queryInterface.dropTable('product_variant');
    await queryInterface.dropTable('product');
  },
};
