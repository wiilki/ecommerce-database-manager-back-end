const router = require('express').Router();
const sequelize = require('../../config/connection');
const { asyncRoute, adminWriteGuard } = require('../../utils/http');

router.get('/health', asyncRoute(async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', service: 'inventory-manager' });
  } catch (error) {
    res.status(503).json({ status: 'unavailable', service: 'inventory-manager' });
  }
}));

router.use(adminWriteGuard);
router.use('/categories', require('./category-routes'));
router.use('/products', require('./product-routes'));
router.use('/tags', require('./tag-routes'));

module.exports = router;
