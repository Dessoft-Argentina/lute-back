require('dotenv').config({ path: require('path').join(__dirname, '..', 'env', 'development.env') });

module.exports = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'lute',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    dialect: process.env.DB_DIALECT || 'postgres',
    seederStorage: 'sequelize',
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    database: (process.env.DB_NAME || 'lute') + '_test',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: false,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: false,
    pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
  },
};
