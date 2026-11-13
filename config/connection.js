require('dotenv').config();

const Sequelize = require('sequelize');

const common = {
  dialect: 'mysql',
  logging: process.env.DB_LOG_SQL === 'true' ? console.log : false,
  dialectOptions: { decimalNumbers: true },
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
};

const sequelize = process.env.DATABASE_URL || process.env.JAWSDB_URL
  ? new Sequelize(process.env.DATABASE_URL || process.env.JAWSDB_URL, common)
  : new Sequelize(
      process.env.DB_NAME || 'ecommerce_db',
      process.env.DB_USER || 'root',
      process.env.DB_PASSWORD || '',
      { ...common, host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT) || 3306 }
    );

module.exports = sequelize;
