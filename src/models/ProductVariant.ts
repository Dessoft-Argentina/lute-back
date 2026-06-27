import { sequelize } from "../database";
import { DataTypes } from 'sequelize';

export const ProductVariant = sequelize.define('ProductVariant', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
  },
  productId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'product_id',
  },
  size: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  priceOverride: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    field: 'price_override',
  },
}, {
  timestamps: true,
  underscored: true,
  tableName: 'product_variant',
});

export default ProductVariant;
