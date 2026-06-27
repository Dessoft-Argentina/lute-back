import { sequelize } from "../database";
import { DataTypes } from 'sequelize';

export interface IAdminUser {
  id: number;
  email: string;
  passwordHash: string;
  role: 'admin' | 'staff';
  isActive: boolean;
}

export const AdminUser = sequelize.define('AdminUser', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'password_hash',
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'staff',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
  },
}, {
  timestamps: true,
  underscored: true,
  tableName: 'admin_user',
});

export default AdminUser;
