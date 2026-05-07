import { sequelize } from "../database";
import { DataTypes } from 'sequelize';

// **** Types **** //

export interface INewsteller {
  id: number;
  email: string;
  nombre: string;
  apellido: string;

}

export const Newsteller = sequelize.define('Newsteller', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  apellido: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },


}, {
  timestamps: false,
  tableName: 'Newsteller'
});

function newNewsteller(
  id: number,
  nombre: string,
  apellido: string,
  email: string,

): INewsteller {
  return {
      id: (id ?? 0),
      nombre: (nombre ?? ''),
      apellido: (apellido ?? ''),
      email: (email ?? ''),

  };
}

export default {
  Newsteller,
  newNewsteller

};
