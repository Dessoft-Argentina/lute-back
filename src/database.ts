import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize(
  process.env.DB_NAME ?? 'lute',
  process.env.DB_USER ?? 'postgres',
  process.env.DB_PASS ?? '',
  {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    dialect: (process.env.DB_DIALECT as any) ?? 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  }
);

export async function connect() {
    try {
      if (process.env.NODE_ENV === 'test') {
        await sequelize.sync({ alter: true });
        console.log('Test sync done');
      }
      await sequelize.authenticate();
      console.log('Database connection established successfully.');
    } catch (error) {
      console.error('Unable to connect to the database:', error);
    }
}
