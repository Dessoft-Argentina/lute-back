
const { Sequelize } = require('sequelize');

export const sequelize = new Sequelize(
  process.env.DB_NAME ,
  process.env.DB_USER ,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    dialect: process.env.DB_DIALECT as any ?? 'postgres',
  }
);

export async function connect() {
    try {
      await sequelize.sync({alter: true});
      console.log('all good');
    } catch (error) {      
      console.error('Unable to sinc:', error);
    }
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
      } catch (error) {
        console.error('Unable to connect to the database:', error);
      }
}
