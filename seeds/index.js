const seedCategories = require('./category-seeds');
const seedProducts = require('./product-seeds');
const seedTags = require('./tag-seeds');
const seedProductTags = require('./product-tag-seeds');
const sequelize = require('../config/connection');
require('../models');

async function seedAll() {
  // Deliberately destructive: seed resets existing tables. Never run on production data.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to reset production data.');
  }
  await sequelize.sync({ force: true });
  await seedCategories();
  await seedProducts();
  await seedTags();
  await seedProductTags();
  console.log('Sample inventory seeded successfully.');
}

seedAll()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
