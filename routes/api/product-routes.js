const router = require('express').Router();
const { Op } = require('sequelize');
const sequelize = require('../../config/connection');
const { Product, Category, Tag } = require('../../models');
const { HttpError, asyncRoute } = require('../../utils/http');
const v = require('../../utils/validation');

const includes = [{ model: Category }, { model: Tag, through: { attributes: [] } }];

async function checkRelated(data, transaction) {
  if (data.category_id !== undefined && data.category_id !== null) {
    const category = await Category.findByPk(data.category_id, { transaction });
    if (!category) throw new HttpError(400, 'category_id does not refer to an existing category.');
  }
  if (data.tagIds !== undefined && data.tagIds.length) {
    const found = await Tag.count({ where: { id: { [Op.in]: data.tagIds } }, transaction });
    if (found !== data.tagIds.length) throw new HttpError(400, 'All tagIds must refer to existing tags.');
  }
}

router.get('/', asyncRoute(async (req, res) => {
  const query = v.list(req.query, ['id', 'product_name', 'price', 'stock']);
  const where = {};
  if (query.q) where.product_name = { [Op.like]: v.like(query.q) };
  if (query.category_id !== undefined) where.category_id = query.category_id;
  const options = { where, include: includes, distinct: true, order: [[query.sort, query.order]] };
  if (query.limit !== undefined) options.limit = query.limit;
  if (query.offset !== undefined) options.offset = query.offset;
  const [rows, count] = await Promise.all([Product.findAll(options), Product.count({ where })]);
  res.set('X-Total-Count', String(count)).json(rows);
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const row = await Product.findByPk(v.id(req.params.id), { include: includes });
  if (!row) throw new HttpError(404, 'Product not found.', 'NOT_FOUND');
  res.json(row);
}));

router.post('/', asyncRoute(async (req, res) => {
  const { tagIds, ...data } = v.product(req.body);
  const created = await sequelize.transaction(async (transaction) => {
    await checkRelated({ ...data, tagIds }, transaction);
    const row = await Product.create(data, { transaction });
    if (tagIds !== undefined) await row.setTags(tagIds, { transaction });
    return row;
  });
  const row = await Product.findByPk(created.id, { include: includes });
  res.status(201).json(row);
}));

router.put('/:id', asyncRoute(async (req, res) => {
  const productId = v.id(req.params.id);
  const { tagIds, ...data } = v.product(req.body, true);
  await sequelize.transaction(async (transaction) => {
    const row = await Product.findByPk(productId, { transaction });
    if (!row) throw new HttpError(404, 'Product not found.', 'NOT_FOUND');
    await checkRelated({ ...data, tagIds }, transaction);
    if (Object.keys(data).length) await row.update(data, { transaction });
    if (tagIds !== undefined) await row.setTags(tagIds, { transaction });
  });
  const updated = await Product.findByPk(productId, { include: includes });
  res.json(updated);
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const deleted = await Product.destroy({ where: { id: v.id(req.params.id) } });
  if (!deleted) throw new HttpError(404, 'Product not found.', 'NOT_FOUND');
  res.status(204).end();
}));

module.exports = router;
