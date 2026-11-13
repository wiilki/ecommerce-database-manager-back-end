const { HttpError } = require('./http');

function bad(message) {
  throw new HttpError(400, message, 'VALIDATION_ERROR');
}

function id(value, label = 'id') {
  const text = String(value);
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(Number(text))) {
    bad(label + ' must be a positive integer.');
  }
  return Number(text);
}

function bodyObject(value, allowed, partial) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) bad('A JSON object is required.');
  const keys = Object.keys(value);
  if (!keys.length) bad('At least one field is required.');
  const unknown = keys.filter((key) => !allowed.includes(key));
  if (unknown.length) bad('Unknown field(s): ' + unknown.join(', '));
  if (!partial && !keys.includes(allowed[0])) bad(allowed[0] + ' is required.');
}

function name(value, field) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 255) {
    bad(field + ' must be a non-empty string of at most 255 characters.');
  }
  return value.trim();
}

function named(value, field, partial = false) {
  bodyObject(value, [field], partial);
  if (!Object.prototype.hasOwnProperty.call(value, field)) bad(field + ' is required.');
  return { [field]: name(value[field], field) };
}

function price(value) {
  const str = String(value);
  if ((typeof value !== 'number' && typeof value !== 'string') ||
      !/^\d+(\.\d{1,2})?$/.test(str) ||
      !Number.isFinite(Number(str)) || Number(str) > 99999999.99) {
    bad('price must be a non-negative amount with at most two decimal places.');
  }
  return Number(str).toFixed(2);
}

function stock(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 2147483647) {
    bad('stock must be a non-negative whole number.');
  }
  return value;
}

function tagIds(value) {
  if (!Array.isArray(value) || value.length > 100) bad('tagIds must be an array of at most 100 IDs.');
  const ids = value.map((item) => {
    if (typeof item !== 'number') bad('tagIds must contain numeric IDs.');
    return id(item, 'tag ID');
  });
  if (new Set(ids).size !== ids.length) bad('tagIds must not contain duplicates.');
  return ids;
}

function product(value, partial = false) {
  const allowed = ['product_name', 'price', 'stock', 'category_id', 'tagIds'];
  bodyObject(value, allowed, partial);
  if (!partial && (!Object.prototype.hasOwnProperty.call(value, 'product_name') ||
                   !Object.prototype.hasOwnProperty.call(value, 'price'))) {
    bad('product_name and price are required.');
  }
  const result = {};
  if ('product_name' in value) result.product_name = name(value.product_name, 'product_name');
  if ('price' in value) result.price = price(value.price);
  if ('stock' in value) result.stock = stock(value.stock);
  if ('category_id' in value) result.category_id = value.category_id === null ? null : id(value.category_id, 'category_id');
  if ('tagIds' in value) result.tagIds = tagIds(value.tagIds);
  return result;
}

function list(query, sortFields = ['id', 'name']) {
  const allowed = ['q', 'limit', 'offset', 'sort', 'order', 'category_id'];
  const extra = Object.keys(query || {}).filter((k) => !allowed.includes(k));
  if (extra.length) bad('Unknown query parameter(s): ' + extra.join(', '));
  const q = query.q === undefined ? '' : query.q;
  if (typeof q !== 'string' || q.length > 100) bad('q must be text of at most 100 characters.');
  const sort = query.sort || 'id';
  const order = String(query.order || 'asc').toLowerCase();
  if (!sortFields.includes(sort)) bad('Invalid sort field.');
  if (!['asc', 'desc'].includes(order)) bad('order must be asc or desc.');
  function unsigned(raw, field, min, max) {
    if (raw === undefined) return undefined;
    if (typeof raw !== 'string' || !/^\d+$/.test(raw)) bad(field + ' must be a whole number.');
    const num = Number(raw);
    if (!Number.isSafeInteger(num) || num < min || num > max) bad(field + ' is out of range.');
    return num;
  }
  const limit = unsigned(query.limit, 'limit', 1, 100);
  const offset = unsigned(query.offset, 'offset', 0, 100000);
  return {
    q: q.trim(),
    limit: limit === undefined && offset !== undefined ? 25 : limit,
    offset,
    sort,
    order: order.toUpperCase(),
    category_id: query.category_id === undefined ? undefined : id(query.category_id, 'category_id')
  };
}

function like(value) {
  return '%' + value.replace(/[%_\\]/g, '\\$&') + '%';
}

module.exports = { id, named, product, list, like, price, stock, tagIds };
