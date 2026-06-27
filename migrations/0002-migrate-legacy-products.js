'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableName = 'Producto';
    const tables = await queryInterface.sequelize.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tableName}'`
    );

    if (!tables[0] || tables[0].length === 0) {
      return;
    }

    const productos = await queryInterface.sequelize.query(
      `SELECT * FROM "${tableName}"`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!productos || productos.length === 0) {
      return;
    }

    // Group by name to create products
    const grouped = {};
    for (const p of productos) {
      if (!grouped[p.nombre]) {
        grouped[p.nombre] = [];
      }
      grouped[p.nombre].push(p);
    }

    for (const [name, variants] of Object.entries(grouped)) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const basePrice = variants[0].precio || 0;

      // Insert product
      const [productResult] = await queryInterface.sequelize.query(
        `INSERT INTO product (slug, name, base_price, is_active, created_at, updated_at)
         VALUES (:slug, :name, :basePrice, true, NOW(), NOW())
         RETURNING id`,
        {
          replacements: { slug, name, basePrice },
          type: Sequelize.QueryTypes.INSERT,
        }
      );

      const productId = productResult[0]?.id || productResult[0];

      // Insert each variant
      for (const v of variants) {
        const sku = `${slug}-${(v.talle || 'one').toLowerCase()}-${(v.color || 'na').toLowerCase()}`
          .replace(/[^a-z0-9-]+/g, '');

        await queryInterface.sequelize.query(
          `INSERT INTO product_variant (product_id, size, color, sku, stock, price_override, created_at, updated_at)
           VALUES (:productId, :size, :color, :sku, :stock, NULL, NOW(), NOW())`,
          {
            replacements: {
              productId,
              size: v.talle || null,
              color: v.color || null,
              sku,
              stock: v.stock || 0,
            },
            type: Sequelize.QueryTypes.INSERT,
          }
        );
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query('DELETE FROM product_variant');
    await queryInterface.sequelize.query('DELETE FROM product');
  },
};
