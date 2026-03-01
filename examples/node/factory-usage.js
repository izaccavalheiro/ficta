/**
 * Ficta — Factory API (v1.2.0)
 *
 * Run from this directory:
 *   node factory-usage.js
 *
 * Covers:
 *   - createFactory()       — create a reusable factory from a column string
 *   - factory.build()       — generate a single record with optional overrides
 *   - factory.buildMany()   — n identical-override records
 *   - factory.buildList()   — n records with per-record override function
 *   - factory.schema        — inspect the parsed SchemaColumn[] array
 *   - Deterministic output  — seed option for reproducible test fixtures
 *   - defaults option       — applied to every generated record
 *   - SchemaColumn[] input  — pass a schema array instead of a string
 *   - Custom types inside factories
 *   - Using factories in Vitest-style unit tests
 */

import { faker } from '@faker-js/faker';
import { setFaker, generateData, columnStringToSchema, registerType } from '../../src/core.js';
import { createFactory } from '../../src/factory.js';
import { mkdirSync, writeFileSync } from 'fs';

setFaker(faker);
mkdirSync('output', { recursive: true });

// ---------------------------------------------------------------------------
// 1. Basic factory — build(), buildMany(), buildList()
// ---------------------------------------------------------------------------
console.log('=== 1. Basic factory ===\n');

const userFactory = createFactory(
  'id:autoIncrement,firstName,lastName,email,phone,city,country,role:enum:admin|editor|viewer'
);

// Single record
const user = userFactory.build();
console.log('build() — single record:');
console.log(user);
console.log();

// Single record with overrides
const adminUser = userFactory.build({ role: 'admin', email: 'alice@example.com' });
console.log('build({ role: "admin", email: "..." }) — overridden fields:');
console.log(adminUser);
console.log();

// 5 records, all with the same override
const editors = userFactory.buildMany(5, { role: 'editor' });
console.log('buildMany(5, { role: "editor" }) — first two:');
console.log(editors.slice(0, 2));
console.log();

// 4 records, per-record override function
const indexed = userFactory.buildList(4, (record, i) => ({
  email: `user${i + 1}@example.com`,
  city: ['London', 'Paris', 'Berlin', 'Tokyo'][i],
}));
console.log('buildList(4, fn) — sequential email + city:');
console.log(indexed);
console.log();

// ---------------------------------------------------------------------------
// 2. factory.schema — inspect the parsed column metadata
// ---------------------------------------------------------------------------
console.log('=== 2. factory.schema — SchemaColumn[] ===\n');

const productFactory = createFactory(
  'id:autoIncrement,sku:pattern:PRD-######,name:product,category:department,price,stock:range:0-200'
);

console.log('Column metadata for the product factory:');
for (const col of productFactory.schema) {
  console.log(`  ${col.name.padEnd(12)} type=${col.type}`);
}
console.log();

// ---------------------------------------------------------------------------
// 3. Deterministic seed — reproducible test fixtures
// ---------------------------------------------------------------------------
console.log('=== 3. Deterministic seed ===\n');

const deterministicFactory = createFactory(
  'id:autoIncrement,name:fullName,email,score:range:0-100',
  { seed: 42 }
);

const run1 = deterministicFactory.buildMany(3);
const run2 = deterministicFactory.buildMany(3);

console.log('Run 1:', JSON.stringify(run1.map(r => r.name)));
console.log('Run 2:', JSON.stringify(run2.map(r => r.name)));
console.log('Identical:', JSON.stringify(run1) === JSON.stringify(run2));
console.log();

// ---------------------------------------------------------------------------
// 4. defaults option — applied to every built record
// ---------------------------------------------------------------------------
console.log('=== 4. defaults option ===\n');

const tenantFactory = createFactory(
  'id:autoIncrement,firstName,lastName,email',
  { defaults: { tenantId: 'org-001', active: true } }
);

const tenantUsers = tenantFactory.buildMany(3);
console.log('Every record has tenantId and active injected:');
console.log(tenantUsers);
console.log();

// ---------------------------------------------------------------------------
// 5. SchemaColumn[] input — richer column metadata
//    (useful when migrated from a DDL parser or schema builder)
// ---------------------------------------------------------------------------
console.log('=== 5. SchemaColumn[] input ===\n');

// Convert a column string to a schema array, then enrich it
const schemaColumns = columnStringToSchema(
  'id:autoIncrement,email,score:range:0-100,status:enum:active|inactive|pending'
);

// Mark id as primaryKey (metadata not expressible in the string syntax)
schemaColumns[0].primaryKey = true;
schemaColumns[1].nullable = false;

const richFactory = createFactory(schemaColumns);
const richRecord = richFactory.build();
console.log('Record from SchemaColumn[] factory:');
console.log(richRecord);
console.log('PK column metadata preserved:', richFactory.schema[0]);
console.log();

// ---------------------------------------------------------------------------
// 6. Custom types in factories
// ---------------------------------------------------------------------------
console.log('=== 6. Custom types in factories ===\n');

registerType('semver', () => {
  const f = faker;
  return `${f.number.int({ min: 0, max: 5 })}.${f.number.int({ min: 0, max: 20 })}.${f.number.int({ min: 0, max: 99 })}`;
});

const packageFactory = createFactory(
  'id:autoIncrement,name:word,version:semver,published:recentDate'
);

const packages = packageFactory.buildList(4, (rec, i) => ({
  name: ['@ficta/core', '@ficta/cli', '@ficta/browser', '@ficta/react'][i],
}));
console.log('Package list with custom semver type:');
console.log(packages);
console.log();

// ---------------------------------------------------------------------------
// 7. Factory-powered test stubs (Vitest / Jest pattern)
//    In a real test file you'd import the factory and use it in describe/test.
// ---------------------------------------------------------------------------
console.log('=== 7. Vitest / Jest integration pattern ===\n');

// Simulating a test scenario inline:
function assertUserHasRequiredFields(user) {
  const required = ['id', 'firstName', 'lastName', 'email'];
  for (const field of required) {
    if (user[field] === undefined || user[field] === null || user[field] === '') {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  return true;
}

const testFactory = createFactory(
  'id:autoIncrement,firstName,lastName,email,phone',
  { seed: 99 }
);

// Simulates: test('user has required fields', () => { ... })
const testUsers = testFactory.buildMany(10);
const allValid = testUsers.every(assertUserHasRequiredFields);
console.log(`All 10 factory-generated users passed field validation: ${allValid}`);

// Simulates: test('admin user has role override', () => { ... })
const admin = testFactory.build({ role: 'admin' });
console.log(`Admin role override applied: ${admin.role === 'admin'}`);
console.log();

// ---------------------------------------------------------------------------
// 8. Exporting factory records to a file
// ---------------------------------------------------------------------------
console.log('=== 8. Persist factory output ===\n');

const fixtureFactory = createFactory(
  'id:autoIncrement,firstName,lastName,email,phone,company,jobTitle,status:enum:active|inactive',
  { seed: 2024 }
);

const fixtures = fixtureFactory.buildMany(20);
writeFileSync('output/test-fixtures.json', JSON.stringify(fixtures, null, 2));
console.log(`Written 20 deterministic test fixtures to output/test-fixtures.json`);
const sample = fixtures.slice(0, 2);
console.log('First two records:', JSON.stringify(sample, null, 2));

console.log('\n=== Factory API examples completed ===');
