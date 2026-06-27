import { sequelize } from "../database";
import { DataTypes } from 'sequelize';

export interface IDrop {
  id: number;
  slug: string;
  name: string;
  status: 'scheduled' | 'active' | 'ended';
  startsAt: Date;
  endsAt: Date;
  facadeConfig: Record<string, unknown> | null;
}

export const Drop = sequelize.define('Drop', {
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
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'scheduled',
  },
  startsAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'starts_at',
  },
  endsAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'ends_at',
  },
  facadeConfig: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'facade_config',
  },
}, {
  timestamps: true,
  underscored: true,
  tableName: 'drop',
});

export default Drop;
