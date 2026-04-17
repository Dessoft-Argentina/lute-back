/* eslint-disable @typescript-eslint/no-var-requires */
const { Sequelize } = require('sequelize');

const {
  DB_NAME = 'ciros',
  DB_USER = 'postgres',
  DB_PASSWORD = '',
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  DB_SSL = 'false',
} = process.env;

const useSsl = DB_SSL === 'true';

export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: 'postgres',
  logging: false,
  dialectOptions: useSsl
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
});

export async function connect(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('Connection to PostgreSQL has been established successfully.');
    await sequelize.sync({ alter: true });
    console.log('Database synchronized.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}
