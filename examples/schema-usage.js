/**
 * Ficta — Schema-based test data generation example
 *
 * Demonstrates how to use the DDL parser and schema generator to produce
 * realistic multi-table test data that respects foreign-key relationships.
 *
 * Run from the project root:
 *   node examples/schema-usage.js
 *
 * Or via the CLI:
 *   node cli.js schema examples/node/test-schema.sql --rows 5 --dialect postgres --mode ddl+insert
 */

import { faker } from '@faker-js/faker';
import { setFaker } from '../src/core.js';
import { parseDDL, orderByDependencies } from '../src/ddl-parser.js';
import { generateFromSchema, buildInsertStatements } from '../src/schema-generator.js';
import { generateFromDDL } from '../src/node.js';

// Initialise Faker before using any generator
setFaker(faker);

// ---------------------------------------------------------------------------
// Example 1 — Inline DDL string → 'insert' mode (default)
// ---------------------------------------------------------------------------
console.log('=== Example 1: Insert mode (default) ===\n');

const schemaDDL = `
  -- Users table
  CREATE TABLE users (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name  VARCHAR(50),
    created_at TIMESTAMP
  );

  -- Posts table with a foreign key to users
  CREATE TABLE posts (
    id         SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(id),
    title      VARCHAR(255) NOT NULL,
    body       TEXT,
    created_at TIMESTAMP
  );

  -- Comments referencing both users and posts
  CREATE TABLE comments (
    id         SERIAL PRIMARY KEY,
    post_id    INT NOT NULL REFERENCES posts(id),
    author_id  INT NOT NULL REFERENCES users(id),
    content    TEXT,
    created_at TIMESTAMP
  );
`;

const insertSQL = generateFromSchema({
  ddl: schemaDDL,
  rows: 3,
  outputMode: 'insert',
  dialect: 'generic',
});

console.log(insertSQL.slice(0, 500) + '\n...\n');

// ---------------------------------------------------------------------------
// Example 2 — DDL + CREATE TABLE output
// ---------------------------------------------------------------------------
console.log('=== Example 2: DDL + insert mode ===\n');

const ddlAndInserts = generateFromSchema({
  ddl: schemaDDL,
  rows: 2,
  outputMode: 'ddl+insert',
  dialect: 'postgres',
});

console.log(ddlAndInserts.slice(0, 600) + '\n...\n');

// ---------------------------------------------------------------------------
// Example 3 — MySQL upsert mode
// ---------------------------------------------------------------------------
console.log('=== Example 3: MySQL upsert mode ===\n');

const mysqlUpsert = generateFromSchema({
  ddl: `
    CREATE TABLE products (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      sku         VARCHAR(50) NOT NULL,
      name        VARCHAR(255) NOT NULL,
      price       DECIMAL(10,2),
      category    VARCHAR(100),
      description TEXT
    );
  `,
  rows: 3,
  outputMode: 'upsert',
  dialect: 'mysql',
});

console.log(mysqlUpsert);

// ---------------------------------------------------------------------------
// Example 4 — Truncate + insert (useful for test fixtures)
// ---------------------------------------------------------------------------
console.log('=== Example 4: Truncate + insert ===\n');

const truncateInsert = generateFromSchema({
  ddl: `
    CREATE TABLE tags (id SERIAL PRIMARY KEY, label VARCHAR(50));
    CREATE TABLE post_tags (
      post_id INT REFERENCES tags(id),
      tag_id  INT REFERENCES tags(id)
    );
  `,
  rows: 4,
  outputMode: 'truncate+insert',
  dialect: 'postgres',
});

console.log(truncateInsert);

// ---------------------------------------------------------------------------
// Example 5 — Use parseDDL + orderByDependencies directly (inspect metadata)
// ---------------------------------------------------------------------------
console.log('=== Example 5: Inspect parsed table definitions ===\n');

const tables = parseDDL(schemaDDL);
const ordered = orderByDependencies(tables);

for (const table of ordered) {
  console.log(`Table: ${table.tableName}`);
  console.log(`  PK : ${JSON.stringify(table.primaryKey)}`);
  console.log(`  FKs: ${JSON.stringify(table.foreignKeys)}`);
  console.log(`  Columns:`);
  for (const col of table.columns) {
    console.log(`    ${col.name.padEnd(15)} sqlType=${col.sqlType.padEnd(20)} fictaType=${col.fictaType}`);
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Example 6 — buildInsertStatements (pure utility)
// ---------------------------------------------------------------------------
console.log('=== Example 6: buildInsertStatements utility ===\n');

const records = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob',   email: 'bob@example.com' },
];
const columns = [{ name: 'id' }, { name: 'name' }, { name: 'email' }];

console.log('Generic INSERT:');
console.log(buildInsertStatements({ tableName: 'users', records, columns }));

console.log('\nPostgreSQL UPSERT (ON CONFLICT DO UPDATE):');
console.log(
  buildInsertStatements({
    tableName: 'users',
    records,
    columns,
    dialect: 'postgres',
    outputMode: 'upsert',
    conflictColumns: ['id'],
  })
);

console.log('\nMySQL UPSERT (ON DUPLICATE KEY UPDATE):');
console.log(
  buildInsertStatements({
    tableName: 'users',
    records,
    columns,
    dialect: 'mysql',
    outputMode: 'upsert',
    conflictColumns: ['id'],
  })
);

console.log('\nSQLite INSERT OR REPLACE:');
console.log(
  buildInsertStatements({
    tableName: 'users',
    records,
    columns,
    dialect: 'sqlite',
    outputMode: 'upsert',
    conflictColumns: ['id'],
  })
);

// ---------------------------------------------------------------------------
// Example 6b — generateFromSchema with pre-parsed TableDef[] (no DDL string)
// ---------------------------------------------------------------------------
console.log('\n=== Example 6b: generateFromSchema with pre-parsed TableDef[] ===\n');

const preParsed = parseDDL(`
  CREATE TABLE regions  (id SERIAL PRIMARY KEY, name VARCHAR(100));
  CREATE TABLE branches (
    id        SERIAL PRIMARY KEY,
    region_id INT REFERENCES regions(id),
    city      VARCHAR(100),
    address   VARCHAR(255)
  );
`);

const branchSQL = generateFromSchema({
  tables: orderByDependencies(preParsed),  // pass TableDef[] directly
  rows: 3,
  outputMode: 'ddl+insert',
  dialect: 'postgres',
});
console.log(branchSQL.slice(0, 400) + '\n...\n');

// ---------------------------------------------------------------------------
// Example 7 — generateFromDDL (Node.js / file-based)
// ---------------------------------------------------------------------------
console.log('\n=== Example 7: generateFromDDL (Node.js file reader) ===\n');

try {
  // This reads a real .sql file and generates test data from it.
  // It will only work if the file exists (adjust path as needed).
  const sql = await generateFromDDL({
    schemaFile: new URL('./node/test-schema.sql', import.meta.url).pathname,
    rows: 5,
    outputMode: 'ddl+insert',
    dialect: 'mysql',
  });
  console.log(sql.slice(0, 400) + '\n...');
} catch (err) {
  console.log(`(Skipped — schema file not found: ${err.message})`);
}

console.log('\nDone.');
