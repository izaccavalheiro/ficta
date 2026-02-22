/**
 * Ficta — DDL-Driven Data Generation
 *
 * Shows every API surface related to importing an existing SQL schema and
 * producing realistic, FK-consistent seed data from it.
 *
 * Run from this directory:
 *   node ddl-usage.js
 *
 * Covers:
 *   - parseDDL()              — parse CREATE TABLE statements
 *   - orderByDependencies()   — topological FK sort
 *   - generateFromSchema()    — multi-table seed (insert / upsert / ddl+insert / truncate+insert)
 *   - buildInsertStatements() — pure SQL INSERT/UPSERT helper
 *   - generateFromDDL()       — Node.js file reader (reads a .sql file from disk)
 */

import { faker } from '@faker-js/faker';
import { setFaker } from '../../src/core.js';
import { generateFromDDL } from '../../src/node.js';
import { parseDDL, orderByDependencies } from '../../src/ddl-parser.js';
import { generateFromSchema, buildInsertStatements } from '../../src/schema-generator.js';
import { mkdirSync, writeFileSync } from 'fs';

setFaker(faker);
mkdirSync('output', { recursive: true });

// ---------------------------------------------------------------------------
// Shared DDL used across several examples
// ---------------------------------------------------------------------------
const ECOMMERCE_DDL = `
  -- Lookup table: no FK dependencies
  CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT
  );

  -- Depends on: categories
  CREATE TABLE products (
    id          SERIAL  PRIMARY KEY,
    category_id INT     NOT NULL REFERENCES categories(id),
    sku         VARCHAR(50) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    price       DECIMAL(10,2),
    stock       INT DEFAULT 0
  );

  -- No FK dependencies
  CREATE TABLE customers (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name  VARCHAR(50),
    phone      VARCHAR(30),
    created_at TIMESTAMP
  );

  -- Depends on: customers
  CREATE TABLE orders (
    id          SERIAL PRIMARY KEY,
    customer_id INT  NOT NULL REFERENCES customers(id),
    total       DECIMAL(10,2),
    status      VARCHAR(20) DEFAULT 'pending',
    placed_at   TIMESTAMP
  );

  -- Depends on: orders, products
  CREATE TABLE order_items (
    id         SERIAL PRIMARY KEY,
    order_id   INT NOT NULL REFERENCES orders(id),
    product_id INT NOT NULL REFERENCES products(id),
    quantity   INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
  );
`;

// ---------------------------------------------------------------------------
// 1. parseDDL — inspect what the parser extracts
// ---------------------------------------------------------------------------
console.log('=== 1. parseDDL + orderByDependencies ===\n');

const tables = parseDDL(ECOMMERCE_DDL);
const ordered = orderByDependencies(tables);

console.log(`Parsed ${tables.length} tables. FK-ordered processing sequence:`);
ordered.forEach((t, i) => {
  const fkSummary = t.foreignKeys.length
    ? t.foreignKeys.map(fk => `${fk.column}→${fk.refTable}.${fk.refColumn}`).join(', ')
    : 'none';
  console.log(`  ${i + 1}. ${t.tableName.padEnd(14)} PK=${JSON.stringify(t.primaryKey)}  FKs=[${fkSummary}]`);
});

console.log('\nColumn type resolution (fictaType inferred from name + SQL type):');
for (const t of ordered) {
  console.log(`\n  ${t.tableName}:`);
  for (const col of t.columns) {
    console.log(`    ${col.name.padEnd(14)} sqlType=${col.sqlType.padEnd(20)} fictaType=${col.fictaType}`);
  }
}
console.log();

// ---------------------------------------------------------------------------
// 2. generateFromSchema — insert mode (default)
// ---------------------------------------------------------------------------
console.log('=== 2. generateFromSchema — insert mode ===\n');

const insertSQL = generateFromSchema({
  ddl: ECOMMERCE_DDL,
  rows: 3,
  outputMode: 'insert',
  dialect: 'generic',
});
writeFileSync('output/ecommerce-insert.sql', insertSQL);
console.log('output/ecommerce-insert.sql (first 400 chars):');
console.log(insertSQL.slice(0, 400) + '\n...\n');

// ---------------------------------------------------------------------------
// 3. generateFromSchema — ddl+insert (PostgreSQL)
// ---------------------------------------------------------------------------
console.log('=== 3. generateFromSchema — ddl+insert (PostgreSQL) ===\n');

const ddlInsertSQL = generateFromSchema({
  ddl: ECOMMERCE_DDL,
  rows: 5,
  outputMode: 'ddl+insert',
  dialect: 'postgres',
});
writeFileSync('output/ecommerce-ddl-insert.sql', ddlInsertSQL);
console.log('Written to output/ecommerce-ddl-insert.sql\n');

// ---------------------------------------------------------------------------
// 4. generateFromSchema — truncate+insert (PostgreSQL)
//    TRUNCATE in reverse FK order, then INSERT in FK order
// ---------------------------------------------------------------------------
console.log('=== 4. generateFromSchema — truncate+insert (PostgreSQL) ===\n');

const truncateSQL = generateFromSchema({
  ddl: ECOMMERCE_DDL,
  rows: 4,
  outputMode: 'truncate+insert',
  dialect: 'postgres',
});
writeFileSync('output/ecommerce-truncate-insert.sql', truncateSQL);
// Print just the TRUNCATE block as illustration
const truncateLines = truncateSQL.split('\n').filter(l => l.startsWith('TRUNCATE'));
console.log('TRUNCATE order (leaf tables first to respect FKs):');
truncateLines.forEach(l => console.log(' ', l));
console.log();

// ---------------------------------------------------------------------------
// 5. generateFromSchema — upsert (MySQL ON DUPLICATE KEY UPDATE)
// ---------------------------------------------------------------------------
console.log('=== 5. generateFromSchema — upsert (MySQL) ===\n');

const mysqlUpsert = generateFromSchema({
  ddl: `
    CREATE TABLE tags (
      id    INT AUTO_INCREMENT PRIMARY KEY,
      slug  VARCHAR(60) NOT NULL,
      label VARCHAR(100) NOT NULL
    );
  `,
  rows: 3,
  outputMode: 'upsert',
  dialect: 'mysql',
});
console.log(mysqlUpsert);

// ---------------------------------------------------------------------------
// 6. generateFromSchema — upsert (SQLite INSERT OR REPLACE)
// ---------------------------------------------------------------------------
console.log('=== 6. generateFromSchema — upsert (SQLite) ===\n');

const sqliteUpsert = generateFromSchema({
  ddl: `
    CREATE TABLE settings (
      setting_key TEXT PRIMARY KEY,
      value       TEXT
    );
  `,
  rows: 3,
  outputMode: 'upsert',
  dialect: 'sqlite',
});
console.log(sqliteUpsert);

// ---------------------------------------------------------------------------
// 7. Pre-parsed tables (skip string parsing, pass TableDef[] directly)
// ---------------------------------------------------------------------------
console.log('=== 7. generateFromSchema with pre-parsed tables ===\n');

const preParsedTables = parseDDL(`
  CREATE TABLE authors (id SERIAL PRIMARY KEY, name VARCHAR(100), email VARCHAR(255));
  CREATE TABLE books   (
    id        SERIAL PRIMARY KEY,
    author_id INT REFERENCES authors(id),
    title     VARCHAR(255),
    published DATE
  );
`);
const orderedPreParsed = orderByDependencies(preParsedTables);

const preParsedSQL = generateFromSchema({
  tables: orderedPreParsed,   // <-- pass TableDef[] directly (no DDL string needed)
  rows: 3,
  outputMode: 'ddl+insert',
  dialect: 'postgres',
});
writeFileSync('output/authors-books.sql', preParsedSQL);
console.log('Written to output/authors-books.sql\n');

// ---------------------------------------------------------------------------
// 8. buildInsertStatements — pure helper for manual records
// ---------------------------------------------------------------------------
console.log('=== 8. buildInsertStatements — manual records ===\n');

const manualRecords = [
  { id: 1, slug: 'javascript', label: 'JavaScript' },
  { id: 2, slug: 'typescript', label: 'TypeScript' },
  { id: 3, slug: 'python',     label: 'Python' },
];
const tagColumns = [{ name: 'id' }, { name: 'slug' }, { name: 'label' }];

console.log('PostgreSQL INSERT:');
console.log(buildInsertStatements({
  tableName: 'tags', records: manualRecords, columns: tagColumns,
  dialect: 'postgres',
}));

console.log('\nPostgreSQL UPSERT (conflict on id):');
console.log(buildInsertStatements({
  tableName: 'tags', records: manualRecords, columns: tagColumns,
  dialect: 'postgres', outputMode: 'upsert', conflictColumns: ['id'],
}));

console.log('\nMySQL ON DUPLICATE KEY UPDATE:');
console.log(buildInsertStatements({
  tableName: 'tags', records: manualRecords, columns: tagColumns,
  dialect: 'mysql', outputMode: 'upsert', conflictColumns: ['id'],
}));

console.log('\nSQLite INSERT OR REPLACE:');
console.log(buildInsertStatements({
  tableName: 'tags', records: manualRecords, columns: tagColumns,
  dialect: 'sqlite', outputMode: 'upsert', conflictColumns: ['id'],
}));

// ---------------------------------------------------------------------------
// 9. generateFromDDL — reads a real .sql file from disk (Node.js only)
// ---------------------------------------------------------------------------
console.log('=== 9. generateFromDDL — file-based reader (Node.js) ===\n');

// Write the shared DDL to a file first so the example is self-contained
writeFileSync('output/ecommerce-schema.sql', ECOMMERCE_DDL);

const fileSeed = await generateFromDDL({
  schemaFile: 'output/ecommerce-schema.sql',
  rows: 5,
  outputMode: 'ddl+insert',
  dialect: 'postgres',
  output: 'output/ecommerce-seed.sql',
});
console.log('Generated seed SQL (first 500 chars):');
console.log(fileSeed.slice(0, 500) + '\n...\n');

console.log('=== DDL usage examples complete. Files written to output/ ===');
