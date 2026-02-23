/**
 * Ficta Node.js Advanced Usage Example
 *
 * Run from this directory:
 *   node advanced-usage.js
 *
 * Covers:
 *   - Large datasets across all formats (including Parquet)
 *   - Complex column definitions with every special type
 *   - SQL: all four dialects × all output modes
 *   - UPSERT with conflict resolution
 *   - generateFromDDL  — FK-aware seed data from a schema file
 *   - generateFromSchema — inline DDL, multi-table with FK integrity
 *   - parseDDL + orderByDependencies — inspect parsed table metadata
 *   - buildInsertStatements — low-level pure SQL builder
 *   - Schema Builder (fluent table()/schema() API)
 *
 * For additional feature showcase see:
 *   stream-usage.js        — generateStream (CSV + NDJSON)
 *   plugin-api.js          — registerType / registerTemplate
 *   schema-builder-usage.js — fluent builder deep-dive
 *   schema-file-usage.js   — generateFromSchemaFile (ficta.schema.json)
 */

import { faker } from '@faker-js/faker';
import { setFaker } from '../../src/core.js';
import { generateData, generateAndSave, generateFromDDL } from '../../src/node.js';
import { parseDDL, orderByDependencies } from '../../src/ddl-parser.js';
import { generateFromSchema, buildInsertStatements } from '../../src/schema-generator.js';
import { table, schema } from '../../src/schema-builder.js';
import { mkdirSync, writeFileSync } from 'fs';

// Faker must be set before any generation (already done in node.js, but explicit
// here to show how universal code initialises Faker)
setFaker(faker);
mkdirSync('output', { recursive: true });

// ============================================================================
// Section 1 — 1 000 rows in every format
// ============================================================================
async function allFormats() {
  console.log('=== 1. All formats — 1 000 rows ===\n');

  const columns = 'id:autoIncrement,firstName,lastName,email,phone,city,country,company,jobTitle';
  const rows = 1000;

  await generateAndSave({ columns, rows, output: 'output/data.csv' });
  await generateAndSave({ columns, rows, output: 'output/data.json' });
  await generateAndSave({ columns, rows, output: 'output/data.xml',
    rootElement: 'employees', recordElement: 'employee' });
  await generateAndSave({ columns, rows, output: 'output/data.xlsx',
    sheetName: 'Employees' });
  await generateAndSave({ columns, rows, output: 'output/data.tsv' });
  await generateAndSave({ columns, rows, output: 'output/data.yaml' });
  await generateAndSave({ columns, rows, output: 'output/data.toml' });

  // Parquet (columnar binary format; useful for big-data / analytics pipelines)
  await generateAndSave({ columns, rows, output: 'output/data.parquet' });

  // SQL — plain INSERT (backward-compatible, works without DDL)
  await generateAndSave({ columns, rows, output: 'output/data-insert.sql',
    tableName: 'employees' });

  console.log('All formats written to output/ (including Parquet)\n');
}

// ============================================================================
// Section 2 — complex column definitions using every special type
// ============================================================================
async function complexColumns() {
  console.log('=== 2. Complex columns with all special types ===\n');

  const orderColumns = [
    'orderId:autoIncrement',            // auto-incrementing integer
    'sku:pattern:ORD-######',           // 6 random digits
    'trackingCode:pattern:TRK-{COUNTER}', // sequential suffix
    'customerId:range:1-500',           // integer between 1 and 500
    'productName:product',
    'quantity:range:1-10',
    'unitPrice:price',
    'currency:enum:USD|EUR|GBP|JPY',   // fixed-choice column
    'status:enum:pending|processing|shipped|delivered|cancelled',
    'env:static:production',            // same value every row
    'notes:sentence',
    'orderDate:recentDate',
    'deliveryDate:futureDate',
    'metadata:json',                    // embedded JSON blob
  ].join(',');

  await generateAndSave({
    columns: orderColumns,
    rows: 500,
    output: 'output/orders.json',
    preview: true,
  });
  console.log();
}

// ============================================================================
// Section 3 — SQL: all four dialects × all output modes
// ============================================================================
async function sqlDialectsAndModes() {
  console.log('=== 3. SQL: dialects × output modes ===\n');

  const columns = 'id:autoIncrement,username,email,active:boolean,createdAt:timestamp';
  const rows = 10;
  const tableName = 'users';

  for (const dialect of ['postgres', 'mysql', 'sqlite', 'generic']) {
    for (const mode of ['insert', 'upsert', 'truncate+insert', 'ddl+insert']) {
      const file = `output/users-${dialect}-${mode.replace('+', '_')}.sql`;
      await generateAndSave({
        columns, rows, output: file,
        // upsert mode requires at least one conflict column
        formatOptions: { mode, dialect, tableName, conflictColumns: ['id'] },
      });
    }
  }

  console.log('16 SQL variants written to output/\n');
}

// ============================================================================
// Section 4 — generateFromDDL (Node.js file reader)
// ============================================================================
async function fromDDLFile() {
  console.log('=== 4. generateFromDDL — FK-aware seed from a schema file ===\n');

  // Write a demo schema with 3 tables and two FK relationships
  writeFileSync('output/blog-schema.sql', `
    CREATE TABLE users (
      id         SERIAL PRIMARY KEY,
      email      VARCHAR(255) NOT NULL,
      first_name VARCHAR(50),
      last_name  VARCHAR(50),
      created_at TIMESTAMP
    );
    CREATE TABLE posts (
      id         SERIAL PRIMARY KEY,
      user_id    INT NOT NULL REFERENCES users(id),
      title      VARCHAR(255) NOT NULL,
      body       TEXT,
      published  DATE
    );
    CREATE TABLE comments (
      id         SERIAL PRIMARY KEY,
      post_id    INT NOT NULL REFERENCES posts(id),
      author_id  INT NOT NULL REFERENCES users(id),
      content    TEXT,
      created_at TIMESTAMP
    );
  `);

  const sql = await generateFromDDL({
    schemaFile: 'output/blog-schema.sql',
    rows: 5,
    outputMode: 'ddl+insert',
    dialect: 'postgres',
    output: 'output/blog-seed.sql',
  });

  console.log('Generated SQL (first 600 chars):');
  console.log(sql.slice(0, 600) + '\n...\n');
}

// ============================================================================
// Section 5 — generateFromSchema (inline DDL, MySQL upsert)
// ============================================================================
async function inlineDDL() {
  console.log('=== 5. generateFromSchema — inline DDL, MySQL upsert ===\n');

  const sql = generateFromSchema({
    ddl: `
      CREATE TABLE categories (
        id   INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL
      );
      CREATE TABLE products (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL REFERENCES categories(id),
        sku         VARCHAR(50) NOT NULL,
        name        VARCHAR(255) NOT NULL,
        price       DECIMAL(10,2),
        description TEXT
      );
    `,
    rows: 5,
    outputMode: 'upsert',
    dialect: 'mysql',
  });

  console.log(sql);
}

// ============================================================================
// Section 6 — parseDDL + orderByDependencies (inspect metadata)
// ============================================================================
async function inspectParsed() {
  console.log('=== 6. parseDDL + orderByDependencies — inspect table metadata ===\n');

  const tables = parseDDL(`
    CREATE TABLE departments (id SERIAL PRIMARY KEY, name VARCHAR(100));
    CREATE TABLE employees   (
      id            SERIAL PRIMARY KEY,
      department_id INT REFERENCES departments(id),
      first_name    VARCHAR(50),
      last_name     VARCHAR(50),
      salary        DECIMAL(10,2),
      hired_date    DATE
    );
  `);

  const ordered = orderByDependencies(tables);

  for (const t of ordered) {
    console.log(`Table: ${t.tableName}`);
    console.log(`  PK : ${JSON.stringify(t.primaryKey)}`);
    console.log(`  FKs: ${JSON.stringify(t.foreignKeys)}`);
    for (const col of t.columns) {
      console.log(`    ${col.name.padEnd(16)} sqlType=${col.sqlType.padEnd(18)} fictaType=${col.fictaType}`);
    }
    console.log();
  }
}

// ============================================================================
// Section 7 — buildInsertStatements (low-level pure helper)
// ============================================================================
async function pureInsertHelper() {
  console.log('=== 7. buildInsertStatements — low-level SQL builder ===\n');

  const records = [
    { id: 1, username: 'alice', email: 'alice@example.com', active: true },
    { id: 2, username: 'bob',   email: 'bob@example.com',   active: false },
  ];
  const columns = [
    { name: 'id' }, { name: 'username' }, { name: 'email' }, { name: 'active' }
  ];

  console.log('Generic INSERT:');
  console.log(buildInsertStatements({ tableName: 'users', records, columns }));

  console.log('\nPostgreSQL UPSERT (conflict on id):');
  console.log(buildInsertStatements({
    tableName: 'users', records, columns,
    dialect: 'postgres',
    outputMode: 'upsert',
    conflictColumns: ['id'],
  }));

  console.log('\nMySQL UPSERT (ON DUPLICATE KEY):');
  console.log(buildInsertStatements({
    tableName: 'users', records, columns,
    dialect: 'mysql',
    outputMode: 'upsert',
    conflictColumns: ['id'],
  }));

  console.log('\nSQLite INSERT OR REPLACE:');
  console.log(buildInsertStatements({
    tableName: 'users', records, columns,
    dialect: 'sqlite',
    outputMode: 'upsert',
    conflictColumns: ['id'],
  }));
  console.log();
}

// ============================================================================
// Section 8 — Schema Builder (fluent API)
// ============================================================================
async function schemaBuilderDemo() {
  console.log('=== 8. Schema Builder — fluent table()/schema() API ===\n');

  // Single-table builder
  const singleSQL = table('products')
    .dialect('postgres')
    .rows(5)
    .column('id', 'autoIncrement', { primaryKey: true })
    .column('sku', 'pattern:PRD-######', { unique: true })
    .column('name', 'product')
    .column('category', 'department')
    .column('price', 'price')
    .column('in_stock', 'boolean')
    .toSQL('ddl+insert');

  writeFileSync('output/products-builder.sql', singleSQL);
  console.log('Single-table builder written to output/products-builder.sql\n');

  // Multi-table builder with FK
  const multiSQL = schema('blog')
    .dialect('postgres')
    .rows(5)
    .table('authors', t => t
      .column('id', 'autoIncrement', { primaryKey: true })
      .column('name', 'fullName')
      .column('email', 'email', { unique: true, nullable: false })
    )
    .table('articles', t => t
      .column('id', 'autoIncrement', { primaryKey: true })
      .column('author_id', 'number', { references: { table: 'authors', column: 'id' } })
      .column('title', 'sentence')
      .column('published_at', 'timestamp')
    )
    .toSQL('ddl+insert');

  writeFileSync('output/blog-builder.sql', multiSQL);
  console.log('Multi-table builder written to output/blog-builder.sql');

  // toGenerateOptions() — get plain options for generateAndSave
  const opts = table('contacts')
    .rows(10)
    .column('id', 'autoIncrement')
    .column('name', 'fullName')
    .column('email', 'email')
    .toGenerateOptions();

  await generateAndSave({ ...opts, output: 'output/contacts-builder.csv' });
  console.log('toGenerateOptions() → output/contacts-builder.csv\n');
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  try {
    await allFormats();
    await complexColumns();
    await sqlDialectsAndModes();
    await fromDDLFile();
    await inlineDDL();
    await inspectParsed();
    await pureInsertHelper();
    await schemaBuilderDemo();
    console.log('=== All advanced examples completed ===');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();

