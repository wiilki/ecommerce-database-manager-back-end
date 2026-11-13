'use strict';

const state = { products: [], categories: [], tags: [], view: 'products', query: '', category: 'all', stock: 'all', editing: null, adminKey: '', ready: false };
const $ = (id) => document.getElementById(id);
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const singular = { products: 'product', categories: 'category', tags: 'tag' };
const views = {
  products: ['Products', 'A clear view of everything in your catalog.', 'Product catalog', 'Manage and update your inventory in one place.'],
  categories: ['Categories', 'Keep your catalog organized and easy to browse.', 'Your categories', 'Group products into useful collections.'],
  tags: ['Tags', 'Give your products useful labels and attributes.', 'Your tags', 'Create and manage reusable labels.']
};

function el(tag, className, text) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text !== undefined) result.textContent = String(text);
  return result;
}

function actionButton(label, action, id, danger = false) {
  const button = el('button', 'small-button' + (danger ? ' danger' : ''), label);
  button.type = 'button';
  button.dataset.action = action;
  button.dataset.id = String(id);
  return button;
}

function option(select, value, label) {
  const item = el('option', '', label);
  item.value = String(value);
  select.append(item);
}

function showToast(message, error = false) {
  const box = $('toast');
  box.textContent = message;
  box.classList.toggle('error', error);
  box.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => box.classList.add('hidden'), 4500);
}

async function request(path, options = {}) {
  const headers = { Accept: 'application/json', ...options.headers };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (state.adminKey) headers['X-Admin-Key'] = state.adminKey;
  const response = await fetch(path, { ...options, headers });
  const raw = await response.text();
  let json = null;
  try { if (raw) json = JSON.parse(raw); } catch { /* gracefully handle non-JSON errors */ }
  if (!response.ok) throw new Error(json && json.error ? json.error.message : 'HTTP ' + response.status);
  return json;
}

async function loadData() {
  $('connectionText').textContent = 'Syncing';
  $('statusDot').classList.remove('online');
  try {
    const [products, categories, tags] = await Promise.all([
      request('/api/products'), request('/api/categories'), request('/api/tags')
    ]);
    if (!Array.isArray(products) || !Array.isArray(categories) || !Array.isArray(tags)) throw new Error('Unexpected API response.');
    state.products = products;
    state.categories = categories;
    state.tags = tags;
    state.ready = true;
    $('connectionText').textContent = 'Connected';
    $('statusDot').classList.add('online');
  } catch (error) {
    state.ready = false;
    $('connectionText').textContent = 'Offline';
    showToast(error.message + ' Check that the API and MySQL are running.', true);
  }
  render();
}

function productRow(item) {
  const row = el('tr');
  const main = el('td');
  const inner = el('div', 'product');
  const details = el('span');
  details.append(el('strong', '', item.product_name), el('small', '', 'SKU #' + String(item.id).padStart(4, '0')));
  inner.append(el('span', 'product-icon', '▧'), details);
  main.append(inner);
  const category = el('td');
  category.append(el('span', 'pill', item.category ? item.category.category_name : 'Uncategorized'));
  const price = el('td', 'price', money.format(Number(item.price)));
  const stockCell = el('td');
  const stockClass = item.stock === 0 ? 'out' : item.stock <= 10 ? 'low' : '';
  const stockText = item.stock === 0 ? 'Out of stock' : item.stock <= 10 ? 'Low · ' + item.stock : 'In stock · ' + item.stock;
  stockCell.append(el('span', 'stock ' + stockClass, stockText));
  const tags = el('td');
  const tagList = item.tags || [];
  if (!tagList.length) tags.append(el('span', '', '—'));
  for (const tag of tagList.slice(0, 3)) tags.append(el('span', 'tag', tag.tag_name));
  if (tagList.length > 3) tags.append(el('span', 'tag', '+' + (tagList.length - 3)));
  const actions = el('td');
  const buttons = el('div', 'row-actions');
  buttons.append(actionButton('Edit', 'edit', item.id), actionButton('Delete', 'delete', item.id, true));
  actions.append(buttons);
  row.append(main, category, price, stockCell, tags, actions);
  return row;
}

function tile(item) {
  const card = el('article', 'tile');
  const title = el('h3');
  title.append(el('span', '', state.view === 'categories' ? '◫' : '◇'));
  title.append(document.createTextNode(item[state.view === 'categories' ? 'category_name' : 'tag_name']));
  const count = (item.products || []).length;
  card.append(title, el('p', '', count + (count === 1 ? ' associated product' : ' associated products')));
  const actions = el('div', 'row-actions');
  actions.append(actionButton('Edit', 'edit', item.id), actionButton('Delete', 'delete', item.id, true));
  card.append(actions);
  return card;
}

function render() {
  const [heading, subtitle, sectionHeading, sectionSubtitle] = views[state.view];
  $('title').textContent = heading;
  $('crumb').textContent = heading;
  $('kicker').textContent = heading.toUpperCase();
  $('subtitle').textContent = subtitle;
  $('catalogTitle').textContent = sectionHeading;
  $('catalogSubtitle').textContent = sectionSubtitle;
  $('addLabel').textContent = 'Add ' + singular[state.view];
  $('search').placeholder = 'Search ' + state.view + '...';
  for (const nav of document.querySelectorAll('[data-view]')) nav.classList.toggle('active', nav.dataset.view === state.view);
  $('metrics').classList.toggle('hidden', state.view !== 'products');
  $('filters').classList.toggle('hidden', state.view !== 'products');
  $('productTable').classList.toggle('hidden', state.view !== 'products');
  $('tiles').classList.toggle('hidden', state.view === 'products');

  $('metricProducts').textContent = state.products.length.toLocaleString();
  $('metricValue').textContent = money.format(state.products.reduce((sum, p) => sum + Number(p.price) * Number(p.stock), 0));
  $('metricLow').textContent = state.products.filter((p) => p.stock <= 10).length.toLocaleString();
  $('metricCategories').textContent = state.categories.length.toLocaleString();
  $('navProductCount').textContent = String(state.products.length);

  const categorySelect = $('categoryFilter');
  categorySelect.replaceChildren();
  option(categorySelect, 'all', 'All categories');
  for (const category of state.categories) option(categorySelect, category.id, category.category_name);
  categorySelect.value = state.category;
  if (categorySelect.value !== state.category) { state.category = 'all'; categorySelect.value = 'all'; }

  const nameField = state.view === 'products' ? 'product_name' : state.view === 'categories' ? 'category_name' : 'tag_name';
  let records = state[state.view].filter((record) => String(record[nameField]).toLowerCase().includes(state.query.toLowerCase()));
  if (state.view === 'products') {
    records = records.filter((record) =>
      (state.category === 'all' || String(record.category_id) === state.category) &&
      (state.stock === 'all' ||
        (state.stock === 'out' ? record.stock === 0 :
          state.stock === 'low' ? record.stock <= 10 : record.stock > 0)));
    $('productRows').replaceChildren(...records.map(productRow));
  } else {
    $('tiles').replaceChildren(...records.map(tile));
  }
  $('resultCount').textContent = records.length + (records.length === 1 ? ' item' : ' items');
  $('empty').classList.toggle('hidden', records.length > 0);
  $('emptyHeading').textContent = !state.ready ? 'Unable to connect' : state.query ? 'No matching results' : 'Nothing here yet';
  $('emptyText').textContent = !state.ready ? 'Check your MySQL connection and refresh.' : state.query ? 'Try another search term.' : 'Add your first item to get started.';
  $('emptyAdd').classList.toggle('hidden', !state.ready || Boolean(state.query));
}

function openEditor(item = null) {
  state.editing = item;
  const product = state.view === 'products';
  $('editorTitle').textContent = (item ? 'Edit ' : 'Add ') + singular[state.view];
  $('productInputs').classList.toggle('hidden', !product);
  $('nameInputs').classList.toggle('hidden', product);
  $('productName').required = product;
  $('price').required = product;
  $('nameInput').required = !product;
  $('save').textContent = item ? 'Save changes' : 'Create ' + singular[state.view];
  if (product) {
    $('productName').value = item ? item.product_name : '';
    $('price').value = item ? item.price : '';
    $('stock').value = item ? item.stock : 10;
    $('productCategory').replaceChildren();
    option($('productCategory'), '', 'Uncategorized');
    for (const category of state.categories) option($('productCategory'), category.id, category.category_name);
    $('productCategory').value = item && item.category_id != null ? String(item.category_id) : '';
    const tags = $('tagInputs');
    tags.replaceChildren();
    if (!state.tags.length) tags.append(el('small', '', 'No tags created yet.'));
    for (const tag of state.tags) {
      const label = el('label');
      const checkbox = el('input');
      checkbox.type = 'checkbox';
      checkbox.value = String(tag.id);
      checkbox.checked = Boolean(item && (item.tags || []).some((assigned) => assigned.id === tag.id));
      label.append(checkbox, document.createTextNode(tag.tag_name));
      tags.append(label);
    }
  } else {
    const field = state.view === 'categories' ? 'category_name' : 'tag_name';
    $('nameLabel').textContent = state.view === 'categories' ? 'Category name *' : 'Tag name *';
    $('nameInput').value = item ? item[field] : '';
  }
  $('editor').showModal();
  setTimeout(() => $(product ? 'productName' : 'nameInput').focus(), 0);
}

async function save(event) {
  event.preventDefault();
  const isProduct = state.view === 'products';
  const data = isProduct ? {
    product_name: $('productName').value.trim(),
    price: $('price').value,
    stock: $('stock').value === '' ? 10 : Number($('stock').value),
    category_id: $('productCategory').value ? Number($('productCategory').value) : null,
    tagIds: Array.from($('tagInputs').querySelectorAll('input:checked'), (checkbox) => Number(checkbox.value))
  } : { [state.view === 'categories' ? 'category_name' : 'tag_name']: $('nameInput').value.trim() };
  const editing = state.editing;
  const saveButton = $('save');
  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';
  try {
    await request('/api/' + state.view + (editing ? '/' + editing.id : ''), {
      method: editing ? 'PUT' : 'POST', body: JSON.stringify(data)
    });
    $('editor').close();
    showToast(editing ? 'Changes saved successfully.' : 'Item created successfully.');
    await loadData();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = editing ? 'Save changes' : 'Create ' + singular[state.view];
  }
}

async function remove(id) {
  const record = state[state.view].find((item) => item.id === id);
  if (!record) return;
  const field = state.view === 'products' ? 'product_name' : state.view === 'categories' ? 'category_name' : 'tag_name';
  if (!confirm('Delete "' + record[field] + '"? This action cannot be undone.')) return;
  try {
    await request('/api/' + state.view + '/' + id, { method: 'DELETE' });
    showToast('Item deleted.');
    await loadData();
  } catch (error) { showToast(error.message, true); }
}

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
  state.view = button.dataset.view;
  state.query = '';
  $('search').value = '';
  render();
}));
$('refresh').addEventListener('click', loadData);
$('add').addEventListener('click', () => openEditor());
$('emptyAdd').addEventListener('click', () => openEditor());
$('search').addEventListener('input', (event) => { state.query = event.target.value; render(); });
$('categoryFilter').addEventListener('change', (event) => { state.category = event.target.value; render(); });
$('stockFilter').addEventListener('change', (event) => { state.stock = event.target.value; render(); });
$('adminKey').addEventListener('input', (event) => { state.adminKey = event.target.value; });
$('close').addEventListener('click', () => $('editor').close());
$('cancel').addEventListener('click', () => $('editor').close());
$('editorForm').addEventListener('submit', save);
document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const id = Number(target.dataset.id);
  if (target.dataset.action === 'edit') {
    const item = state[state.view].find((record) => record.id === id);
    if (item) openEditor(item);
  }
  if (target.dataset.action === 'delete') remove(id);
});
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && document.activeElement.tagName !== 'INPUT' && !$('editor').open) {
    event.preventDefault();
    $('search').focus();
  }
});
loadData();
