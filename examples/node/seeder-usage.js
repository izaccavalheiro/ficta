/**
 * Ficta — Database Seeder (v1.2.0)
 *
 * Run from this directory:
 *   node seeder-usage.js
 *
 * NOTE: Live seeding requires the relevant peer dependency:
 *   PostgreSQL  →  npm install pg
 *   MySQL       →  npm install mysql2
 *   SQLite      →  npm install better-sqlite3
 *
 * Running this file without a real database will show dialect detection,
 * record generation, and the full seedDatabase() call, but the connection
 * step will throw a "X is required" error that is caught and described.
 *
 * Covers:
 *   - detectDialect()     — auto-detect dialect from connection string
 *   - seedDatabase()      — seed a live database with generated records
 *   - Pre-generating records with generateData() before seeding
 *   - Multi-table seeding with FK-aware ordering
 *   - truncate option     — clear tables before seeding
 *   - Lazy driver loading — actionable error when peer dep is missing
 *   - setLogger()         — capture seeder log output
 */

import { faker } from '@faker-js/faker';
import { setFaker, generateData } from '../../src/core.js';
import { detectDialect, seedDatabase } from '../../src/seeder.js';
import { setLogger, resetLogger } from '../../src/logger.js';

setFaker(faker);

// ---------------------------------------------------------------------------
// 1. detectDialect() — pure helper, no DB connection needed
// ---------------------------------------------------------------------------
console.log('=== 1. detectDialect() ===\n');

const examples = [
  'postgres://user:pass@localhost:5432/mydb',
  'postgresql://user:pass@db.cloud.io/prod',
  'mysql://root@localhost/testdb',
  'mariadb://root@localhost/testdb',
  '/var/data/app.sqlite',
  '/var/data/warehouse.db',
  '/var/data/cache.sqlite3',
  'unknown://something',
];

for (const cs of examples) {
  console.log(`  ${detectDialect(cs) ?? 'null'}\t← ${cs}`);
}
console.log();

// ---------------------------------------------------------------------------
// 2. Generate records with generateData() — then pass to seedDatabase()
//    This separation means you can inspect / validate records before inserting.
// ---------------------------------------------------------------------------
console.log('=== 2. Prepare table data for seeding ===\n');

// Table A — users (parent)
const usersResult = generateData({
  schema: [
    { name: 'id',         type: 'autoIncrement', primaryKey: true },
    { name: 'email',      type: 'email',         nullable: false },
    { name: 'first_name', type: 'firstName' },
    { name: 'last_name',  type: 'lastName' },
    { name: 'created_at', type: 'timestamp' },
  ],
  rows: 5,
  seed: 1,
});

const usersColumns   = usersResult.columns;
const usersRecords   = usersResult.records;
const userIds        = usersRecords.map(r => r.id);

console.log('Users table — 5 records generated:');
usersRecords.forEach(r => console.log(`  [${r.id}] ${r.first_name} ${r.last_name} <${r.email}>`));
console.log();

// Table B — orders (child — references users.id)
const { records: ordersRecords, columns: ordersColumns } = generateData({
  schema: [
    { name: 'id',         type: 'autoIncrement', primaryKey: true },
    { name: 'user_id',    type: 'number' },   // FK — sampled below
    { name: 'amount',     type: 'price' },
    { name: 'status',     type: 'enum:pending|processing|shipped|delivered' },
    { name: 'placed_at',  type: 'recentDate' },
  ],
  rows: 10,
  seed: 2,
});

// Wire FK values from actual user IDs
ordersRecords.forEach(r => {
  r.user_id = userIds[Math.floor(Math.random() * userIds.length)];
});

console.log('Orders table — 10 records generated (first 3):');
ordersRecords.slice(0, 3).forEach(r =>
  console.log(`  [${r.id}] user_id=${r.user_id} amount=${r.amount} status=${r.status}`)
);
console.log();

// ---------------------------------------------------------------------------
// 3. seedDatabase() — full workflow (gracefully handles missing driver)
// ---------------------------------------------------------------------------
console.log('=== 3. seedDatabase() — live seeding workflow ===\n');

const POSTGRES_URL = 'postgres://ficta_demo:secret@localhost:5432/testdb';

// Capture log output from the seeder
const logs = [];
setLogger({
  log:   m => { logs.push(m); console.log('[seeder]', m); },
  info:  m => { logs.push(m); console.log('[seeder]', m); },
  warn:  m => console.warn('[seeder warn]', m),
  error: m => console.error('[seeder error]', m),
});

try {
  const result = await seedDatabase({
    connectionString: POSTGRES_URL,
    // Rows are pre-generated and paired with their column definitions
    tables: [
      { tableName: 'users',  records: usersRecords,  columns: usersColumns },
      { tableName: 'orders', records: ordersRecords, columns: ordersColumns },
    ],
  });
  console.log('Seeding result:', result);
} catch (err) {
  // Without "pg" installed you'll see:
  // '"pg" is required for Postgres seeding. Install it: npm install pg'
  console.log(`Expected error (driver not installed): ${err.message}`);
  console.log('\nTo run seeding for real:');
  console.log('  npm install pg          # PostgreSQL');
  console.log('  npm install mysql2      # MySQL/MariaDB');
  console.log('  npm install better-sqlite3  # SQLite');
} finally {
  resetLogger();
}

console.log();

// ---------------------------------------------------------------------------
// 4. SQLite — easiest to run locally (no server required)
// ---------------------------------------------------------------------------
console.log('=== 4. SQLite seeding pattern ===\n');

const SQLITE_PATH = 'output/test.db';

// Ensure output directory exists
import { mkdirSync } from 'fs';
mkdirSync('output', { recursive: true });

const { records: contactsRecords, columns: contactsColumns } = generateData({
  columns: 'id:autoIncrement,fullName,email,phone,company',
  rows: 20,
});

setLogger({
  log:  m => console.log('[seeder]', m),
  info: m => console.log('[seeder]', m),
  warn: m => {},
  error: m => {},
});

try {
  const result = await seedDatabase({
    connectionString: SQLITE_PATH,  // .db extension → auto-detected as sqlite
    tables: [
      { tableName: 'contacts', records: contactsRecords, columns: contactsColumns },
    ],
  });
  console.log(`SQLite seeding completed: ${result.rowsInserted} rows inserted in ${result.elapsed}ms`);
} catch (err) {
  console.log(`Expected error (better-sqlite3 not installed): ${err.message}`);
  console.log('Install with: npm install better-sqlite3');
} finally {
  resetLogger();
}

console.log();

// ---------------------------------------------------------------------------
// 5. Multi-table with truncate (wipe + re-seed pattern)
// ---------------------------------------------------------------------------
console.log('=== 5. Multi-table seed with truncate ===\n');
console.log('Pattern — generates and seeds three related tables in FK order:');
console.log(`
  const tables = [
    'categories',  // parent — no FK
    'products',    // references categories
    'orders',      // references products
  ];

  await seedDatabase({
    connectionString: 'postgres://user:pass@localhost:5432/shop',
    truncate: true,           // TRUNCATE in reverse FK order before inserting
    tables: [
      { tableName: 'categories', records: catRecords,     columns: catCols },
      { tableName: 'products',   records: productRecords, columns: productCols },
      { tableName: 'orders',     records: orderRecords,   columns: orderCols },
    ],
  });
`);

console.log('=== Seeder examples completed ===');
