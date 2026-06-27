import { sequelize } from "../database";
import { DataTypes } from 'sequelize';

export interface IAuditLog {
  id: number;
  adminUserId: number | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
}

export const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
  },
  adminUserId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'admin_user_id',
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  entity: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  entityId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'entity_id',
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  tableName: 'audit_log',
});

export default AuditLog;
