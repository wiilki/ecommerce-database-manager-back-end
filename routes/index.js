const router = require('express').Router();
const apiRoutes = require('./api');
const { HttpError } = require('../utils/http');

router.use('/api', apiRoutes);
router.use((req, res, next) => next(new HttpError(404, 'Route not found.', 'NOT_FOUND')));

module.exports = router;
