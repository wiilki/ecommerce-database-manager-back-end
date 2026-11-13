const test = require('node:test');
const assert = require('node:assert/strict');
const v = require('../utils/validation');

test('a product can be created without tags', () => {
  assert.deepEqual(v.product({ product_name: '  Trail Shoes  ', price: 25 }), {
    product_name: 'Trail Shoes', price: '25.00'
  });
});

test('an empty tag array is accepted', () => {
  assert.deepEqual(v.product({ product_name: 'Hat', price: '9.99', tagIds: [] }).tagIds, []);
});

test('partial updates support tags only', () => {
  assert.deepEqual(v.product({ tagIds: [1, 2] }, true), { tagIds: [1, 2] });
});

test('product identifiers and prices are validated', () => {
  assert.equal(v.id('12'), 12);
  for (const input of ['0', '-1', '1.5', 'abc', '9007199254740992']) {
    assert.throws(() => v.id(input));
  }
  for (const amount of [-5, '4.999', 'Infinity', 'NaN', 100000000]) {
    assert.throws(() => v.price(amount));
  }
});

test('product stock must be a non-negative integer', () => {
  for (const amount of [-1, 2.5, '3', NaN]) {
    assert.throws(() => v.stock(amount));
  }
  assert.equal(v.stock(0), 0);
});

test('required names are trimmed and empty values are rejected', () => {
  assert.deepEqual(v.named({ tag_name: '  Sale ' }, 'tag_name'), { tag_name: 'Sale' });
  assert.throws(() => v.named({ tag_name: '   ' }, 'tag_name'));
});

test('invalid, duplicate and unknown tag IDs are rejected', () => {
  assert.throws(() => v.tagIds([1, 1]));
  assert.throws(() => v.tagIds(['1']));
  assert.throws(() => v.tagIds([0]));
  assert.throws(() => v.tagIds(null));
});

test('unknown payload fields cannot be mass-assigned', () => {
  assert.throws(() => v.product({ product_name: 'Test', price: 5, id: 99 }));
  assert.throws(() => v.named({ category_name: 'Test', id: 99 }, 'category_name'));
  assert.throws(() => v.product({}, true));
});

test('listing validates paging and ordering', () => {
  assert.deepEqual(v.list({ limit: '20', offset: '10', sort: 'price', order: 'desc' },
    ['id', 'price']), {
    q: '', limit: 20, offset: 10, sort: 'price', order: 'DESC', category_id: undefined
  });
  assert.throws(() => v.list({ limit: '1000' }));
  assert.throws(() => v.list({ sort: 'drop table' }));
  assert.throws(() => v.list({ foo: 'bar' }));
});

test('search metacharacters are escaped', () => {
  assert.equal(v.like('20%_\\'), '%20\\%\\_\\\\%');
});
