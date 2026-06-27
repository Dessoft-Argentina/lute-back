import { sequelize } from "../database";
import { DataTypes } from 'sequelize';

export interface IProduct {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  basePrice: number;
  dropId: number | null;
  isActive: boolean;
  isFeatured: boolean;
}

export interface IProductVariant {
  id: number;
  productId: number;
  size: string | null;
  color: string | null;
  sku: string;
  stock: number;
  priceOverride: number | null;
}

export interface IProductImage {
  id: number;
  productId: number;
  url: string;
  alt: string | null;
  position: number;
}

export interface IProductVariantDTO {
  id: number;
  size: string | null;
  color: string | null;
  sku: string;
  stock: number;
  price: number;
  available: boolean;
}

export interface IProductImageDTO {
  url: string;
  alt: string | null;
  position: number;
}

export interface IProductDTO {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  basePrice: number;
  currency: string;
  isFeatured: boolean;
  images: IProductImageDTO[];
  variants: IProductVariantDTO[];
}

export const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
  },
  basePrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'base_price',
  },
  dropId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'drop_id',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_featured',
  },
}, {
  timestamps: true,
  underscored: true,
  tableName: 'product',
});

export default Product;
