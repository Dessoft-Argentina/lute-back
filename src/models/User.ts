import moment from 'moment';
import { sequelize } from "../database";
import { DataTypes } from 'sequelize';
import { table } from 'console';


// **** Variables **** //

const INVALID_CONSTRUCTOR_PARAM = 'nameOrObj arg must a string or an object ' + 
  'with the appropriate user keys.';


// **** Types **** //

export interface IUser {
  idUsuario: number;
  nombre: string;
  apellido: string;
  email: string;
  direccion: string;
  telefono: number;
}

export const Usuario = sequelize.define('Usuario', {
  idUsuario: {
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
    allowNull: false
  },
  telefono: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: false
  },

}, {
  timestamps: false,
  tableName: 'Usuario'
});

function newUser(
  idUsuario: number,
  nombre: string,
  apellido: string,
  email: string,
  direccion: string,
  telefono: number
): IUser {
  return {
      idUsuario: (idUsuario ?? 0),
      nombre: (nombre ?? ''),
      apellido: (apellido ?? ''),
      email: (email ?? ''),
      direccion: (direccion ?? ''),
      telefono: (telefono ?? 0)
  };
}

export default {
  Usuario,
  newUser

};
