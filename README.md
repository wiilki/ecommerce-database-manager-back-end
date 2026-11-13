# Stockroom — E-commerce Inventory Manager

A modern, responsive **inventory management dashboard** backed by an Express REST API, Sequelize, and MySQL.

## Features

- Responsive browser-based dashboard for **products, categories and tags**
- Inventory value, product counts and low-stock summaries
- Search, stock/category filters, product editing and delete confirmation
- Correct product CRUD, including product creation **without tags**
- Transactional product/tag updates to avoid partially completed writes
- Validated request bodies and IDs; consistent JSON error responses
- Optional administrator key for changes; required for writes in production
- MySQL health check, pagination, sorting and search
- Unit tests and GitHub Actions quality checks

## Requirements

Node.js 18 or newer (22 recommended), npm, and MySQL 8+ (or a compatible server).

## Local setup

1. Clone this repository and open its directory in a terminal.
2. Run **npm install**.
3. Copy **.env.example** to **.env** and edit your database username/password.
4. Start MySQL, then create the database if it does not exist:
   - mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS ecommerce_db;"
5. Run **npm start**. Missing tables are created non-destructively.
6. Open **http://localhost:3001** in your browser.

For starter products, run **npm run seed**. Warning: this action resets the tables and **deletes all existing data**. Use it only on a disposable/demo database and never with real inventory. Restart the app after seeding if needed.

Run **npm test** to execute validation unit tests or **npm run dev** to use nodemon.

### Configuration

Copy the included .env.example file. Supported keys:

| Setting | Use |
| --- | --- |
| DB_NAME | Database name, default ecommerce_db |
| DB_USER / DB_PASSWORD | MySQL user credentials |
| DB_HOST / DB_PORT | Database host and port |
| DATABASE_URL | Optional complete MySQL URL, overriding individual connection fields |
| PORT | HTTP port, defaults to 3001 |
| ADMIN_API_KEY | Key used in X-Admin-Key header for write operations |
| NODE_ENV | Set to production when publishing |
| DB_LOG_SQL | Set true to log database queries |

The dashboard contains an **Admin key** field in the upper-right corner. When configured, the key is sent as the X-Admin-Key header for API requests and is kept only in the current page's memory. It is not persisted in the browser.

**Security:** This is an inventory admin tool, not a customer storefront or multi-user login system. Production writes are disabled if ADMIN_API_KEY is missing. Read-only API endpoints are public, so keep the app on a private network or use gateway authentication if inventory data is sensitive. Use HTTPS and a strong random key before allowing remote writes; never commit the .env file.

## REST API

| Method | Endpoint | Action |
| --- | --- | --- |
| GET | /api/health | MySQL connection health |
| GET | /api/products | Products with categories and tags |
| GET | /api/products/:id | One product |
| POST | /api/products | Create |
| PUT | /api/products/:id | Update |
| DELETE | /api/products/:id | Delete |
| GET / POST | /api/categories | List/create categories |
| GET / PUT / DELETE | /api/categories/:id | Detail/update/delete |
| GET / POST | /api/tags | List/create tags |
| GET / PUT / DELETE | /api/tags/:id | Detail/update/delete |

Successful creates use HTTP 201, updates 200, and deletes 204. Missing entities return 404; invalid requests return 400. Database and other internal errors do not disclose stack traces to clients.

### Example product

Send a POST request to /api/products with the following JSON body:

    {
      "product_name": "Everyday Canvas Tote",
      "price": "24.95",
      "stock": 18,
      "category_id": 1,
      "tagIds": [2, 3]
    }

The **tagIds** property is optional. On an update, omit it to retain the existing tags or send an empty array to remove all tags. Category and tag IDs must exist. Product price must be non-negative with at most two decimal places; stock must be a non-negative integer.

The list endpoints return JSON arrays. Optional query parameters: **q** (name search), **limit** (1 through 100), **offset**, **sort**, and **order** (asc or desc). For products, **category_id** filters by category. List responses also include the X-Total-Count header.

## Database safety

The older version of this project had a destructive SQL setup script. The new db/schema.sql only creates the database if missing. Application startup calls Sequelize sync in non-destructive mode. **Sync is not a schema migration tool:** if you have an existing database that needs structural changes, back it up and create a proper migration plan before modifying it. Seed is intentionally destructive and refuses to run in production.

## License

MIT.
