const express = require('express');
const path = require('path');
const sequelize = require('./config/connection');
require('./models');
const routes = require('./routes');
const { errorHandler } = require('./utils/http');

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'");
  next();
});
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(routes);
app.use(errorHandler);

const port = Number(process.env.PORT) || 3001;

async function start() {
  await sequelize.authenticate();
  await sequelize.sync();
  return app.listen(port, () => {
    console.log('Inventory Manager running at http://localhost:' + port);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Unable to start: check your MySQL connection and .env settings.', error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, start };
