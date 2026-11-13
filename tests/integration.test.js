const test = require('node:test');
const assert = require('node:assert/strict');

if (process.env.RUN_DB_TESTS !== '1') {
  test('MySQL integration (enable with RUN_DB_TESTS=1)', { skip: 'Database tests are opt-in for local runs.' }, () => {});
} else {
  const { once } = require('node:events');
  const sequelize = require('../config/connection');
  const { app } = require('../server');
  let server;
  let base;

  test.before(async () => {
    // Only run on a disposable database. This deliberately deletes test tables.
    if (process.env.DB_NAME !== 'ecommerce_test') {
      throw new Error('Integration tests require DB_NAME=ecommerce_test.');
    }
    process.env.ADMIN_API_KEY = 'integration-test-key';
    await sequelize.sync({ force: true });
    server = app.listen(0);
    await once(server, 'listening');
    base = 'http://127.0.0.1:' + server.address().port;
  });

  test.after(async () => {
    if (server) await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
    await sequelize.close();
  });

  async function call(path, method = 'GET', body, authorized = true) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (authorized) headers['X-Admin-Key'] = 'integration-test-key';
    const response = await fetch(base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const raw = await response.text();
    const json = raw ? JSON.parse(raw) : null;
    return { status: response.status, data: json, count: response.headers.get('X-Total-Count') };
  }

  test('API health, authorization, and relational CRUD against MySQL', async (t) => {
    await t.test('health reports healthy database', async () => {
      const result = await call('/api/health');
      assert.equal(result.status, 200);
      assert.equal(result.data.status, 'ok');
    });

    await t.test('unauthorized mutations are rejected', async () => {
      const result = await call('/api/categories', 'POST', { category_name: 'Not authorized' }, false);
      assert.equal(result.status, 401);
      assert.equal(result.data.error.code, 'UNAUTHORIZED');
    });

    const category = await call('/api/categories', 'POST', { category_name: 'Accessories' });
    assert.equal(category.status, 201);
    const tag = await call('/api/tags', 'POST', { tag_name: 'New arrival' });
    assert.equal(tag.status, 201);

    let productId;

    await t.test('product creation works without optional tags', async () => {
      const result = await call('/api/products', 'POST', {
        product_name: 'Canvas Tote', price: '18.50', stock: 7, category_id: category.data.id
      });
      assert.equal(result.status, 201);
      assert.equal(result.data.product_name, 'Canvas Tote');
      assert.deepEqual(result.data.tags, []);
      assert.equal(result.data.category.id, category.data.id);
      productId = result.data.id;
    });

    await t.test('filters and pagination return consistent results', async () => {
      const result = await call('/api/products?q=Canvas&limit=5&offset=0');
      assert.equal(result.status, 200);
      assert.equal(result.data.length, 1);
      assert.equal(result.count, '1');
      assert.equal(result.data[0].id, productId);
    });

    await t.test('invalid relations roll back product data', async () => {
      const result = await call('/api/products/' + productId, 'PUT', { price: '99.99', tagIds: [999999] });
      assert.equal(result.status, 400);
      const unchanged = await call('/api/products/' + productId);
      assert.equal(Number(unchanged.data.price), 18.50);
      assert.deepEqual(unchanged.data.tags, []);
    });

    await t.test('valid tags are associated and can be cleared', async () => {
      const assigned = await call('/api/products/' + productId, 'PUT', { tagIds: [tag.data.id] });
      assert.equal(assigned.status, 200);
      assert.equal(assigned.data.tags.length, 1);
      assert.equal(assigned.data.tags[0].id, tag.data.id);
      const cleared = await call('/api/products/' + productId, 'PUT', { tagIds: [] });
      assert.equal(cleared.status, 200);
      assert.deepEqual(cleared.data.tags, []);
    });

    await t.test('invalid payloads and missing IDs return errors', async () => {
      assert.equal((await call('/api/products', 'POST', { product_name: 'Bad', price: '-5' })).status, 400);
      assert.equal((await call('/api/products/' + productId, 'PUT', { stock: -1 })).status, 400);
      assert.equal((await call('/api/products/abc')).status, 400);
      assert.equal((await call('/api/products/999999')).status, 404);
      assert.equal((await call('/api/categories/999999', 'PUT', { category_name: 'Missing' })).status, 404);
    });

    await t.test('resource edits and deletes return expected status codes', async () => {
      const changed = await call('/api/categories/' + category.data.id, 'PUT', { category_name: 'Everyday' });
      assert.equal(changed.status, 200);
      assert.equal(changed.data.category_name, 'Everyday');
      assert.equal((await call('/api/products/' + productId, 'DELETE')).status, 204);
      assert.equal((await call('/api/products/' + productId)).status, 404);
      assert.equal((await call('/api/tags/' + tag.data.id, 'DELETE')).status, 204);
      assert.equal((await call('/api/categories/' + category.data.id, 'DELETE')).status, 204);
    });
  });
}
