const router = require('express').Router();
const { Op } = require('sequelize');
const { Tag, Product } = require('../../models');
const { HttpError, asyncRoute } = require('../../utils/http');
const v = require('../../utils/validation');

const includes = [{ model: Product }];

router.get('/', asyncRoute(async (req, res) => {
  const query = v.list(req.query, ['id', 'tag_name']);
  if (query.category_id !== undefined) throw new HttpError(400, 'category_id is only supported for products.');
  const where = query.q ? { tag_name: { [Op.like]: v.like(query.q) } } : {};
  const options = { where, include: includes, order: [[query.sort, query.order]] };
  if (query.limit !== undefined) options.limit = query.limit;
  if (query.offset !== undefined) options.offset = query.offset;
  const [rows, count] = await Promise.all([Tag.findAll(options), Tag.count({ where })]);
  res.set('X-Total-Count', String(count)).json(rows);
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const row = await Tag.findByPk(v.id(req.params.id), { include: includes });
  if (!row) throw new HttpError(404, 'Tag not found.', 'NOT_FOUND');
  res.json(row);
}));

router.post('/', asyncRoute(async (req, res) => {
  const row = await Tag.create(v.named(req.body, 'tag_name'));
  res.status(201).json(row);
}));

router.put('/:id', asyncRoute(async (req, res) => {
  const row = await Tag.findByPk(v.id(req.params.id));
  if (!row) throw new HttpError(404, 'Tag not found.', 'NOT_FOUND');
  await row.update(v.named(req.body, 'tag_name', true));
  res.json(row);
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const deleted = await Tag.destroy({ where: { id: v.id(req.params.id) } });
  if (!deleted) throw new HttpError(404, 'Tag not found.', 'NOT_FOUND');
  res.status(204).end();
}));

module.exports = router;
