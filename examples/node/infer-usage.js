/**
 * Ficta — Schema Inference
 *
 * Run from this directory:
 *   node infer-usage.js
 *
 * Covers:
 *   - inferSchema()          — pure function: infer types from an array of row objects
 *   - inferSchemaFromFile()  — Node.js helper: read a .csv or .json file and infer
 *   - Using inferred columns to generate matching synthetic data
 *   - Saving the inferred column string to a file for reuse
 *   - CLI equivalent commands (printed as comments for reference)
 *
 * CLI equivalents:
 *   ficta infer users.csv
 *   ficta infer products.json --format json
 *   ficta infer users.csv -o inferred.txt
 */

import { inferSchema } from '../../src/infer.js';
import { inferSchemaFromFile, generateAndSave } from '../../src/node.js';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('output', { recursive: true });

// Generate fresh sample input files so this script is self-contained.
await generateAndSave({
  template: 'users',
  rows: 20,
  output: 'output/users-sample.csv',
});
await generateAndSave({
  template: 'products',
  rows: 20,
  output: 'output/products-sample.json',
  formatOptions: { pretty: true },
});

// ===========================================================================
// 1. inferSchema() — pure function (works in browser and Node.js)
//    Accepts an array of row objects and returns inferred Ficta column defs.
// ===========================================================================
console.log('=== 1. inferSchema() — pure function ===\n');

const sampleRows = [
  { id: 1, first_name: 'Alice', last_name: 'Smith', email: 'alice@example.com', phone: '555-1234', city: 'London', active: true,  created_at: '2024-01-15T08:30:00Z' },
  { id: 2, first_name: 'Bob',   last_name: 'Jones', email: 'bob@example.com',   phone: '555-5678', city: 'Paris',  active: false, created_at: '2024-03-22T14:00:00Z' },
  { id: 3, first_name: 'Carol', last_name: 'Lee',   email: 'carol@example.com', phone: '555-9012', city: 'Berlin', active: true,  created_at: '2025-07-11T09:15:00Z' },
];

const inferred = inferSchema(sampleRows);

console.log('Inferred column string:');
console.log(' ', inferred.columns);
console.log('\nInferred column list:');
inferred.columnList.forEach(col =>
  console.log(`  ${col.name.padEnd(14)} → ${col.type}`)
);
console.log();

// ===========================================================================
// 2. inferSchema() — UUID, ISO date, price, and enum detection
//    Note: "id"-named columns get autoIncrement via name-hint (highest priority).
//    Rename to "record_uuid" to let the UUID regex kick in instead.
// ===========================================================================
console.log('=== 2. UUID, ISO date, price, and enum detection ===\n');

const variedRows = [
  { record_uuid: 'a1b2c3d4-0000-0000-0000-000000000001', title: 'Draft',     price: 9.99,  status: 'draft',      created: '2024-06-01' },
  { record_uuid: 'a1b2c3d4-0000-0000-0000-000000000002', title: 'Review',    price: 14.99, status: 'published',  created: '2024-07-15' },
  { record_uuid: 'a1b2c3d4-0000-0000-0000-000000000003', title: 'Published', price: 19.99, status: 'draft',      created: '2024-08-20' },
  { record_uuid: 'a1b2c3d4-0000-0000-0000-000000000004', title: 'Archived',  price: 4.99,  status: 'archived',   created: '2025-01-10' },
];

const variedInferred = inferSchema(variedRows);
console.log('Inferred:');
variedInferred.columnList.forEach(col =>
  console.log(`  ${col.name.padEnd(12)} → ${col.type}`)
);
// Expect: record_uuid → uuid, title → enum, price → price, status → enum, created → date
console.log();

// ===========================================================================
// 3. inferSchemaFromFile() — infer from the existing users.csv
// ===========================================================================
console.log('=== 3. inferSchemaFromFile() — from output/users-sample.csv ===\n');

const csvResult = await inferSchemaFromFile('./output/users-sample.csv');

console.log('Columns inferred from output/users-sample.csv:');
console.log(' ', csvResult.columns);
console.log('\nColumn list:');
csvResult.columnList.forEach(col =>
  console.log(`  ${col.name.padEnd(16)} → ${col.type}`)
);
console.log();

// ===========================================================================
// 4. inferSchemaFromFile() — infer from the existing products.json
// ===========================================================================
console.log('=== 4. inferSchemaFromFile() — from output/products-sample.json ===\n');

const jsonResult = await inferSchemaFromFile('./output/products-sample.json');

console.log('Columns inferred from output/products-sample.json:');
console.log(' ', jsonResult.columns);
console.log();

// ===========================================================================
// 5. Use inferred columns to generate a synthetic version of the source data
// ===========================================================================
console.log('=== 5. Generate synthetic data matching the inferred schema ===\n');

// Generate 20 users that look like the users.csv schema
await generateAndSave({
  columns: csvResult.columns,
  rows: 20,
  output: 'output/users-synthetic.csv',
});

// Generate 30 products that look like the products.json schema
await generateAndSave({
  columns: jsonResult.columns,
  rows: 30,
  output: 'output/products-synthetic.json',
});

console.log();

// ===========================================================================
// 6. Save the inferred column string for reuse in future scripts
// ===========================================================================
console.log('=== 6. Save inferred column definitions to a plain text file ===\n');

writeFileSync('output/users-inferred-columns.txt', csvResult.columns);
writeFileSync('output/products-inferred-columns.txt', jsonResult.columns);

console.log('Written output/users-inferred-columns.txt');
console.log('Written output/products-inferred-columns.txt\n');

// ===========================================================================
// 7. inferSchema() — edge-cases: nulls, mixed types, empty strings
// ===========================================================================
console.log('=== 7. Edge-cases: nulls, mixed types, empty-string columns ===\n');

const edgeCaseRows = [
  { user_id: 1, score: null,  label: '',    is_admin: 'yes', total: '12.5' },
  { user_id: 2, score: null,  label: null,  is_admin: 'no',  total: '8.00' },
  { user_id: 3, score: null,  label: '',    is_admin: 'yes', total: '5.99' },
];

const edgeInferred = inferSchema(edgeCaseRows);
edgeInferred.columnList.forEach(col =>
  console.log(`  ${col.name.padEnd(10)} → ${col.type}`)
);
console.log();

// ===========================================================================
// 8. CLI reference
// ===========================================================================
console.log('=== 8. CLI equivalents (run from project root) ===\n');
console.log('  # Infer columns from CSV, print to stdout:');
console.log('  node cli.js infer examples/node/users.csv\n');
console.log('  # Infer columns from JSON, save as JSON array:');
console.log('  node cli.js infer examples/node/products.json --format json\n');
console.log('  # Infer and write to a file:');
console.log('  node cli.js infer examples/node/users.csv -o inferred.txt\n');

console.log('=== Inference examples done ===');
