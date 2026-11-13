const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/connection');

class Product extends Model {}

Product.init({
  id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
  product_name: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true } },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
  stock: { type: DataTypes.INTEGER, defaultValue: 10, allowNull: false, validate: { min: 0, isInt: true } },
  category_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'category', key: 'id' } }
}, {
  sequelize,
  timestamps: false,
  freezeTableName: true,
  underscored: true,
  modelName: 'product'
});

module.exports = Product;
