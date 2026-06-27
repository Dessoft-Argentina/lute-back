import { sequelize } from "../database";
import { DataTypes } from 'sequelize';

export interface IShippingAddress {
  street: string;
  number: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface IOrderItem {
  variantId: number;
  quantity: number;
  unitPrice: number;
}

export interface ICompra {
  idCompra: number;
  fecha: Date;
  status: string;
  paymentStatus: string;
  Usuario_idUsuario: number | null;
  buyerEmail: string | null;
  buyerName: string | null;
  buyerPhone: string | null;
  shippingAddress: IShippingAddress | null;
  trackingToken: string | null;
  total: number | null;
  items?: IOrderItem[] | null;
}

export const Compra = sequelize.define('Compra', {
    idCompra: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        allowNull: true,
    },
    fecha: {
        type: DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: true
    },
    paymentStatus: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'payment_status',
    },
    Usuario_idUsuario: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    buyerEmail: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'buyer_email',
    },
    buyerName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'buyer_name',
    },
    buyerPhone: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'buyer_phone',
    },
    shippingAddress: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'shipping_address',
    },
    trackingToken: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        field: 'tracking_token',
    },
    total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
    },
    items: {
        type: DataTypes.JSONB,
        allowNull: true,
    }
}, {
  timestamps: true,
  updatedAt: 'updated_at',
  createdAt: false,
  tableName: 'Compra'
});
