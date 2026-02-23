/**
 * Ficta — generateFromSchemaFile (ficta.schema.json)
 *
 * Run from this directory:
 *   node schema-file-usage.js
 *
 * Covers:
 *   - ficta.schema.json file format
 *   - generateFromSchemaFile() — read a JSON schema and produce SQL
 *   - Column options: primaryKey, nullable, notNull, default, references
 *   - Per-table row counts
 *   - All SQL output modes (insert, upsert, truncate+insert, ddl+insert)
 *   - Dialect selection in the schema file
 *   - Writing generated SQL to disk (output option)
 *   - Error handling for missing/invalid schema files
 */

import { generateFromSchemaFile } from '../../src/node.js';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('output', { recursive: true });

// ---------------------------------------------------------------------------
// Helper — write a JSON schema file and return its path
// ---------------------------------------------------------------------------
function writeSchema(filename, schemaObj) {
  const path = `output/${filename}`;
  writeFileSync(path, JSON.stringify(schemaObj, null, 2));
  return path;
}

// ---------------------------------------------------------------------------
// 1. Minimal schema — single table, default rows
// ---------------------------------------------------------------------------
console.log('=== 1. Minimal schema — single table ===\n');

const minimalSchemaPath = writeSchema('minimal.schema.json', {
  dialect: 'generic',
  defaultRows: 5,
  tables: [
    {
      name: 'users',
      columns: [
        { name: 'id',         type: 'autoIncrement', primaryKey: true },
        { name: 'username',   type: 'username',      nullable: false },
        { name: 'email',      type: 'email',         nullable: false },
        { name: 'registered', type: 'pastDate' },
      ],
    },
  ],
});

const minimalSQL = await generateFromSchemaFile({
  schemaFile: minimalSchemaPath,
  outputMode: 'ddl+insert',
});
console.log(minimalSQL);

// ---------------------------------------------------------------------------
// 2. Multi-table schema with FK references
// ---------------------------------------------------------------------------
console.log('=== 2. Multi-table schema with FK references ===\n');

const blogSchemaPath = writeSchema('blog.schema.json', {
  dialect: 'postgres',
  defaultRows: 5,
  tables: [
    {
      name: 'users',
      rows: 5,
      columns: [
        { name: 'id',         type: 'autoIncrement', primaryKey: true },
        { name: 'email',      type: 'email',         nullable: false },
        { name: 'first_name', type: 'firstName' },
        { name: 'last_name',  type: 'lastName' },
        { name: 'created_at', type: 'timestamp' },
      ],
    },
    {
      name: 'posts',
      rows: 10,
      columns: [
        { name: 'id',         type: 'autoIncrement',  primaryKey: true },
        {
          name: 'author_id', type: 'number',
          references: { table: 'users', column: 'id' },
          notNull: true,
        },
        { name: 'title',      type: 'sentence',  nullable: false },
        { name: 'body',       type: 'paragraph' },
        { name: 'published',  type: 'pastDate' },
      ],
    },
    {
      name: 'comments',
      rows: 20,
      columns: [
        { name: 'id',        type: 'autoIncrement', primaryKey: true },
        {
          name: 'post_id',   type: 'number',
          references: { table: 'posts', column: 'id' },
          notNull: true,
        },
        {
          name: 'author_id', type: 'number',
          references: { table: 'users', column: 'id' },
          notNull: true,
        },
        { name: 'content',   type: 'paragraph' },
        { name: 'created_at', type: 'timestamp' },
      ],
    },
  ],
});

const blogSQL = await generateFromSchemaFile({
  schemaFile: blogSchemaPath,
  outputMode: 'ddl+insert',
  output: 'output/blog-schema-file.sql',
});
console.log(`Generated ${blogSQL.split('\n').length} lines of SQL.`);
console.log(`Preview:\n${blogSQL.slice(0, 600)}\n...\n`);

// ---------------------------------------------------------------------------
// 3. All output modes with the same schema
// ---------------------------------------------------------------------------
console.log('=== 3. All SQL output modes ===\n');

for (const mode of ['insert', 'upsert', 'truncate+insert', 'ddl+insert']) {
  const sql = await generateFromSchemaFile({
    schemaFile: minimalSchemaPath,
    outputMode: mode,
    output: `output/schema-file-${mode.replace('+', '_')}.sql`,
  });
  console.log(`Mode: ${mode.padEnd(18)} Lines: ${sql.split('\n').length}`);
}
console.log();

// ---------------------------------------------------------------------------
// 4. Override rows via the rows option
// ---------------------------------------------------------------------------
console.log('=== 4. Override row count at call time ===\n');

const overriddenSQL = await generateFromSchemaFile({
  schemaFile: blogSchemaPath,
  rows: 2,               // overrides all per-table counts
  outputMode: 'insert',
  output: 'output/blog-schema-file-2rows.sql',
});
console.log(`Generated ${overriddenSQL.split('\n').filter(Boolean).length} non-empty lines with rows=2\n`);

// ---------------------------------------------------------------------------
// 5. E-commerce schema — comprehensive column options
// ---------------------------------------------------------------------------
console.log('=== 5. E-commerce schema — comprehensive options ===\n');

const ecommerceSchemaPath = writeSchema('ecommerce.schema.json', {
  dialect: 'postgres',
  defaultRows: 8,
  tables: [
    {
      name: 'categories',
      rows: 4,
      columns: [
        { name: 'id',          type: 'autoIncrement', primaryKey: true },
        { name: 'name',        type: 'department',    nullable: false },
        { name: 'slug',        type: 'word',          nullable: false },
        { name: 'description', type: 'sentence' },
      ],
    },
    {
      name: 'products',
      rows: 15,
      columns: [
        { name: 'id',          type: 'autoIncrement', primaryKey: true },
        {
          name: 'category_id', type: 'number',
          references: { table: 'categories', column: 'id' },
          notNull: true,
        },
        { name: 'sku',         type: 'nanoid',      nullable: false },
        { name: 'name',        type: 'product',     nullable: false },
        { name: 'price',       type: 'price',       nullable: false },
        { name: 'stock',       type: 'number',      default: 0 },
        { name: 'active',      type: 'boolean',     default: true },
        { name: 'created_at',  type: 'timestamp' },
      ],
    },
    {
      name: 'customers',
      rows: 10,
      columns: [
        { name: 'id',         type: 'autoIncrement', primaryKey: true },
        { name: 'email',      type: 'email',         nullable: false },
        { name: 'first_name', type: 'firstName' },
        { name: 'last_name',  type: 'lastName' },
        { name: 'phone',      type: 'phone' },
        { name: 'created_at', type: 'timestamp' },
      ],
    },
    {
      name: 'orders',
      rows: 20,
      columns: [
        { name: 'id',          type: 'autoIncrement', primaryKey: true },
        {
          name: 'customer_id', type: 'number',
          references: { table: 'customers', column: 'id' },
          notNull: true,
        },
        { name: 'total',       type: 'price',      nullable: false },
        { name: 'status',      type: 'word',       default: 'pending' },
        { name: 'placed_at',   type: 'timestamp' },
      ],
    },
  ],
});

await generateFromSchemaFile({
  schemaFile: ecommerceSchemaPath,
  outputMode: 'ddl+insert',
  output: 'output/ecommerce-schema-file.sql',
});
console.log('Written output/ecommerce-schema-file.sql\n');

// ---------------------------------------------------------------------------
// 6. Error handling
// ---------------------------------------------------------------------------
console.log('=== 6. Error handling ===\n');

// Missing schemaFile
try {
  await generateFromSchemaFile({ outputMode: 'insert' });
} catch (err) {
  console.log(`Missing schemaFile: ${err.message}`);
}

// Non-existent file
try {
  await generateFromSchemaFile({ schemaFile: './does-not-exist.json' });
} catch (err) {
  console.log(`Non-existent file: ${err.message}`);
}

// Empty tables array
try {
  const emptyPath = writeSchema('empty.schema.json', { tables: [] });
  await generateFromSchemaFile({ schemaFile: emptyPath });
} catch (err) {
  console.log(`Empty tables: ${err.message}`);
}

console.log('\n=== generateFromSchemaFile examples done ===');
