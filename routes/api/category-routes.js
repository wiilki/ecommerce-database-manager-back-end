const router = require('express').Router();
const { Op } = require('sequelize');
const { Category, Product } = require('../../models');
const { HttpError, asyncRoute } = require('../../utils/http');
const v = require('../../utils/validation');

const includes = [{ model: Product }];

router.get('/', asyncRoute(async (req, res) => {
  const query = v.list(req.query, ['id', 'category_name']);
  if (query.category_id !== undefined) throw new HttpError(400, 'category_id is only supported for products.');
  const where = query.q ? { category_name: { [Op.like]: v.like(query.q) } } : {};
  const options = { where, include: includes, order: [[query.sort, query.order]] };
  if (query.limit !== undefined) options.limit = query.limit;
  if (query.offset !== undefined) options.offset = query.offset;
  const [rows, count] = await Promise.all([Category.findAll(options), Category.count({ where })]);
  res.set('X-Total-Count', String(count)).json(rows);
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const row = await Category.findByPk(v.id(req.params.id), { include: includes });
  if (!row) throw new HttpError(404, 'Category not found.', 'NOT_FOUND');
  res.json(row);
}));

router.post('/', asyncRoute(async (req, res) => {
  const row = await Category.create(v.named(req.body, 'category_name'));
  res.status(201).json(row);
}));

router.put('/:id', asyncRoute(async (req, res) => {
  const row = await Category.findByPk(v.id(req.params.id));
  if (!row) throw new HttpError(404, 'Category not found.', 'NOT_FOUND');
  await row.update(v.named(req.body, 'category_name', true));
  res.json(row);
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const deleted = await Category.destroy({ where: { id: v.id(req.params.id) } });
  if (!deleted) throw new HttpError(404, 'Category not found.', 'NOT_FOUND');
  res.status(204).end();
}));

module.exports = router;
