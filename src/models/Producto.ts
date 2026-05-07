import moment from 'moment';
import { sequelize } from "../database";
import { DataTypes } from 'sequelize';
import { table } from 'console';


// **** Variables **** //

const INVALID_CONSTRUCTOR_PARAM = 'nameOrObj arg must a string or an object ' + 
  'with the appropriate user keys.';


// **** Types **** //

export interface IProducto {
  idProducto: number;
  nombre: string;
  talle: string;
  color: string;
  precio: number;
  stock: number;
}

export interface IProductoSpecs {
  nombre: string;
  talle: string;
  color: string;

}

export const Producto = sequelize.define('Producto', {
  idProducto: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false
  },
  talle: {
    type: DataTypes.STRING,
    allowNull: false
  },
  precio: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
 
}, {
  timestamps: false,
  tableName: 'Producto'
});

/*
insert into producto values(1, "cPhone", "negro", 980, 10);
insert into producto values(2, "cPhone", "blanco", 980, 10);
insert into producto values(3, "cPhone", "azul", 980, 10);
insert into producto values(4, "cPhone", "rojo", 980, 10);


insert into producto values(5, "cWatch", "blanco", 980, 10);
insert into producto values(6, "cWatch", "azul", 980, 10);
insert into producto values(7, "cWatch", "rojo", 980, 10);
insert into producto values(8, "cWatch", "negro", 980, 10);

insert into producto values(9, "cPad", "negro", 980, 10);
insert into producto values(10, "cPad", "blanco", 980, 10);
insert into producto values(11, "cPad", "azul", 980, 10);
insert into producto values(12, "cPad", "rojo", 980, 10);


*/