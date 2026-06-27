import { sequelize } from "../database";
import { DataTypes } from 'sequelize';

export interface IPayment {
  id: number;
  orderId: number;
  mpPaymentId: string;
  mpPreferenceId: string | null;
  status: string;
  amount: number | null;
  processedAt: Date | null;
}

export const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
  },
  orderId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'order_id',
  },
  mpPaymentId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'mp_payment_id',
  },
  mpPreferenceId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'mp_preference_id',
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending',
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'processed_at',
  },
}, {
  timestamps: true,
  underscored: true,
  tableName: 'payment',
});

export default Payment;
