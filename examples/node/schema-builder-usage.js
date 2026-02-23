/**
 * Ficta — Schema Builder (Fluent API)
 *
 * Run from this directory:
 *   node schema-builder-usage.js
 *
 * Covers:
 *   - table()          — single-table fluent builder
 *   - schema()         — multi-table fluent builder
 *   - .column()        — define columns with types and constraints
 *   - .rows()          — set row count per table
 *   - .dialect()       — choose SQL dialect
 *   - .toSQL()         — emit SQL (all output modes)
 *   - .toGenerateOptions() — extract options for generateAndSave()
 *   - .build()         — inspect the plain object representation
 *   - All four SQL dialects
 *   - All SQL output modes (insert / upsert / truncate+insert / ddl+insert)
 *   - FK references through column options
 */

import { faker } from '@faker-js/faker';
import { setFaker } from '../../src/core.js';
import { table, schema } from '../../src/schema-builder.js';
import { generateAndSave, writeFile } from '../../src/node.js';
import { mkdirSync } from 'fs';

setFaker(faker);
mkdirSync('output', { recursive: true });

// ---------------------------------------------------------------------------
// 1. Single-table builder — ddl+insert (PostgreSQL)
// ---------------------------------------------------------------------------
console.log('=== 1. Single-table builder — ddl+insert (PostgreSQL) ===\n');

const usersSQL = table('users')
  .dialect('postgres')
  .rows(10)
  .column('id',         'autoIncrement', { primaryKey: true })
  .column('username',   'username',      { unique: true, nullable: false })
  .column('email',      'email',         { unique: true, nullable: false })
  .column('full_name',  'fullName')
  .column('job_title',  'jobTitle')
  .column('is_active',  'boolean',       { default: true })
  .column('created_at', 'timestamp')
  .toSQL('ddl+insert');

await writeFile(usersSQL, 'output/users-builder.sql');
console.log('Written output/users-builder.sql');
console.log(usersSQL.slice(0, 400) + '\n...\n');

// ---------------------------------------------------------------------------
// 2. Single-table builder — MySQL, all special types
// ---------------------------------------------------------------------------
console.log('=== 2. Single-table builder — MySQL, special column types ===\n');

const ordersSQL = table('orders')
  .dialect('mysql')
  .rows(8)
  .column('id',           'autoIncrement',                  { primaryKey: true })
  .column('order_ref',    'pattern:ORD-######')             // 6 random digits
  .column('tracking',     'pattern:TRK-{COUNTER}')         // sequential suffix
  .column('customer_id',  'range:1-100')                   // random FK-like int
  .column('currency',     'enum:USD|EUR|GBP|JPY')          // fixed choices
  .column('total',        'price')
  .column('status',       'enum:pending|processing|shipped|delivered|cancelled')
  .column('env',          'static:production')             // fixed value every row
  .column('placed_at',    'recentDate')
  .toSQL('ddl+insert');

await writeFile(ordersSQL, 'output/orders-builder.sql');
console.log('Written output/orders-builder.sql\n');

// ---------------------------------------------------------------------------
// 3. All SQL output modes for a single table
// ---------------------------------------------------------------------------
console.log('=== 3. All SQL output modes ===\n');

const tableDef = table('products')
  .dialect('postgres')
  .rows(5)
  .column('id',       'autoIncrement', { primaryKey: true })
  .column('sku',      'pattern:PRD-######', { unique: true })
  .column('name',     'product',       { nullable: false })
  .column('price',    'price')
  .column('in_stock', 'boolean',       { default: true });

for (const mode of ['insert', 'upsert', 'truncate+insert', 'ddl+insert']) {
  const sql = tableDef.toSQL(mode);
  const file = `output/products-builder-${mode.replace('+', '_')}.sql`;
  await writeFile(sql, file);
  console.log(`Written ${file}`);
}
console.log();

// ---------------------------------------------------------------------------
// 4. .toGenerateOptions() — use builder output with generateAndSave()
// ---------------------------------------------------------------------------
console.log('=== 4. toGenerateOptions() with generateAndSave() ===\n');

const contactOpts = table('contacts')
  .rows(20)
  .column('id',       'autoIncrement')
  .column('name',     'fullName')
  .column('email',    'email')
  .column('phone',    'phone')
  .column('company',  'company')
  .toGenerateOptions();

// Pass into generateAndSave for any format
await generateAndSave({ ...contactOpts, output: 'output/contacts-builder.csv' });
await generateAndSave({ ...contactOpts, output: 'output/contacts-builder.json' });
console.log();

// ---------------------------------------------------------------------------
// 5. .build() — inspect the plain object representation
// ---------------------------------------------------------------------------
console.log('=== 5. .build() — inspect plain table definition ===\n');

const built = table('employees')
  .dialect('sqlite')
  .rows(50)
  .column('id',   'autoIncrement', { primaryKey: true })
  .column('name', 'fullName')
  .column('dept', 'department')
  .build();

console.log(JSON.stringify(built, null, 2));
console.log();

// ---------------------------------------------------------------------------
// 6. Multi-table schema builder — e-commerce (3 related tables)
// ---------------------------------------------------------------------------
console.log('=== 6. Multi-table schema builder ===\n');

const ecommerceSQL = schema('ecommerce')
  .dialect('postgres')
  .rows(10)
  .table('categories', t => t
    .column('id',          'autoIncrement', { primaryKey: true })
    .column('name',        'department',    { nullable: false })
    .column('description', 'sentence')
  )
  .table('products', t => t
    .column('id',          'autoIncrement',  { primaryKey: true })
    .column('category_id', 'number',         { references: { table: 'categories', column: 'id' } })
    .column('sku',         'pattern:P-######', { unique: true })
    .column('name',        'product',        { nullable: false })
    .column('price',       'price')
    .column('stock',       'range:0-500',    { default: 0 })
  )
  .table('customers', t => t
    .column('id',         'autoIncrement', { primaryKey: true })
    .column('email',      'email',         { unique: true, nullable: false })
    .column('first_name', 'firstName')
    .column('last_name',  'lastName')
    .column('phone',      'phone')
    .column('created_at', 'timestamp')
  )
  .toSQL('ddl+insert');

await writeFile(ecommerceSQL, 'output/ecommerce-builder.sql');
console.log('Written output/ecommerce-builder.sql');
console.log(ecommerceSQL.slice(0, 600) + '\n...\n');

// ---------------------------------------------------------------------------
// 7. Multi-table schema — all four dialects
// ---------------------------------------------------------------------------
console.log('=== 7. Multi-table schema — all four dialects ===\n');

for (const dialect of ['postgres', 'mysql', 'sqlite', 'generic']) {
  const sql = schema('blog')
    .dialect(dialect)
    .rows(3)
    .table('authors', t => t
      .column('id',    'autoIncrement', { primaryKey: true })
      .column('name',  'fullName')
      .column('email', 'email', { nullable: false })
    )
    .table('posts', t => t
      .column('id',        'autoIncrement', { primaryKey: true })
      .column('author_id', 'number', { references: { table: 'authors', column: 'id' } })
      .column('title',     'sentence',      { nullable: false })
      .column('body',      'paragraph')
      .column('published', 'pastDate')
    )
    .toSQL('ddl+insert');

  const file = `output/blog-builder-${dialect}.sql`;
  await writeFile(sql, file);
  console.log(`Written ${file}`);
}
console.log();

// ---------------------------------------------------------------------------
// 8. .build() on a multi-table schema
// ---------------------------------------------------------------------------
console.log('=== 8. schema().build() — inspect multi-table plain object ===\n');

const multiBuilt = schema('inventory')
  .dialect('mysql')
  .rows(5)
  .table('warehouses', t => t
    .column('id',   'autoIncrement', { primaryKey: true })
    .column('city', 'city')
  )
  .table('items', t => t
    .column('id',           'autoIncrement', { primaryKey: true })
    .column('warehouse_id', 'number', { references: { table: 'warehouses', column: 'id' } })
    .column('name',         'product')
    .column('qty',          'range:1-200')
  )
  .build();

console.log(`Schema: ${multiBuilt.schema}`);
console.log(`Dialect: ${multiBuilt.dialect}`);
multiBuilt.tables.forEach(t => {
  console.log(`  Table: ${t.table}  rows=${t.rows}  columns=${t.columns.map(c => c.name).join(', ')}`);
});

console.log('\n=== Schema Builder examples done ===');
