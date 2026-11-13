const crypto = require('crypto');

class HttpError extends Error {
  constructor(status, message, code = 'REQUEST_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function adminWriteGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const secret = process.env.ADMIN_API_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return next(new HttpError(503, 'Configure ADMIN_API_KEY to enable changes in production.', 'ADMIN_NOT_CONFIGURED'));
    }
    return next();
  }
  const supplied = req.get('X-Admin-Key') || '';
  const a = Buffer.from(secret);
  const b = Buffer.from(supplied);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return next(new HttpError(401, 'A valid admin key is required.', 'UNAUTHORIZED'));
  }
  next();
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Malformed JSON request body.' } });
  }
  if (err && (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError')) {
    const isUnique = err.name === 'SequelizeUniqueConstraintError';
    return res.status(isUnique ? 409 : 400).json({
      error: {
        code: isUnique ? 'CONFLICT' : 'VALIDATION_ERROR',
        message: 'The supplied data is invalid.',
        fields: (err.errors || []).map((item) => ({ field: item.path, message: item.message }))
      }
    });
  }
  if (err && (err.name === 'SequelizeForeignKeyConstraintError' || err.name === 'SequelizeDatabaseError')) {
    console.error('Database error:', err.message);
    return res.status(err.name === 'SequelizeForeignKeyConstraintError' ? 409 : 500).json({
      error: { code: 'DATABASE_ERROR', message: 'Unable to complete the database operation.' }
    });
  }
  console.error('Unhandled request error:', err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } });
}

module.exports = { HttpError, asyncRoute, adminWriteGuard, errorHandler };
