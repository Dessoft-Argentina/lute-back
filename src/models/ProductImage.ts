import { sequelize } from "../database";
import { DataTypes } from 'sequelize';

export const ProductImage = sequelize.define('ProductImage', {
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
  url: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  alt: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  timestamps: true,
  underscored: true,
  tableName: 'product_image',
});

export default ProductImage;
