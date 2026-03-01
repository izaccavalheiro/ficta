/**
 * Ficta — Data Anonymization (v1.2.0)
 *
 * Run from this directory:
 *   node anonymizer-usage.js
 *
 * Covers:
 *   - anonymizeRecords()      — replace PII in an array of records
 *   - categorizeColumns()     — classify columns into PII / identifier / numeric / passthrough
 *   - buildIdMap()            — consistent identifier mapping (same input → same output)
 *   - anonymizeFile()         — Node.js helper: read a CSV/JSON file, anonymize, write output
 *   - preserveDistributions   — keep numeric statistical shape
 *   - consistentIdentifiers   — stable ID mapping across calls
 *   - keepColumns             — opt specific columns out of anonymization
 *   - Producing anonymized CSV and JSON from synthetic "production" data
 */

import { faker } from '@faker-js/faker';
import { setFaker, generateData } from '../../src/core.js';
import {
  anonymizeRecords,
  categorizeColumns,
  buildIdMap,
  anonymizeFile,
  generateAndSave,
} from '../../src/node.js';
import { mkdirSync } from 'fs';

setFaker(faker);
mkdirSync('output', { recursive: true });

// ---------------------------------------------------------------------------
// 1. categorizeColumns() — inspect how columns are classified
// ---------------------------------------------------------------------------
console.log('=== 1. categorizeColumns() — column classification ===\n');

const columns = [
  { name: 'id',          type: 'autoIncrement' },
  { name: 'firstName',   type: 'firstName' },
  { name: 'lastName',    type: 'lastName' },
  { name: 'email',       type: 'email' },
  { name: 'phone',       type: 'phone' },
  { name: 'company',     type: 'company' },
  { name: 'salary',      type: 'number' },
  { name: 'score',       type: 'range:0-100' },
  { name: 'country',     type: 'country' },
  { name: 'createdAt',   type: 'pastDate' },
];

const categories = categorizeColumns(columns);
console.log('PII columns        :', categories.pii);
console.log('Identifier columns :', categories.identifier);
console.log('Numeric columns    :', categories.numeric);
console.log('Passthrough columns:', categories.passthrough);
console.log();

// ---------------------------------------------------------------------------
// 2. anonymizeRecords() — basic usage
// ---------------------------------------------------------------------------
console.log('=== 2. anonymizeRecords() — basic PII replacement ===\n');

// Generate realistic "production" data as a source
const { records: productionData } = generateData({
  columns: columns.map(c => `${c.name}:${c.type}`).join(','),
  rows: 5,
});

console.log('Original records (first 2):');
productionData.slice(0, 2).forEach(r =>
  console.log(`  [${r.id}] ${r.firstName} ${r.lastName} <${r.email}> company=${r.company}`)
);

const { records: anonymized } = anonymizeRecords({ records: productionData, columns });

console.log('\nAnonymized records (first 2):');
anonymized.slice(0, 2).forEach(r =>
  console.log(`  [${r.id}] ${r.firstName} ${r.lastName} <${r.email}> company=${r.company}`)
);
console.log('\nNon-PII fields preserved (country, createdAt):');
console.log('  original  :', productionData[0].country, '/', productionData[0].createdAt);
console.log('  anonymized:', anonymized[0].country, '/', anonymized[0].createdAt);
console.log();

// ---------------------------------------------------------------------------
// 3. preserveDistributions — keep numeric statistical shape
// ---------------------------------------------------------------------------
console.log('=== 3. preserveDistributions — numeric shape preserved ===\n');

const cols = [
  { name: 'id',     type: 'autoIncrement' },
  { name: 'name',   type: 'fullName' },
  { name: 'email',  type: 'email' },
  { name: 'salary', type: 'number' },
  { name: 'score',  type: 'range:0-100' },
];

const { records: source } = generateData({
  columns: cols.map(c => `${c.name}:${c.type}`).join(','),
  rows: 20,
});

const originalSalaryAvg = source.reduce((s, r) => s + Number(r.salary), 0) / source.length;

const { records: preserved } = anonymizeRecords({
  records:  source,
  columns:  cols,
  options:  { preserveDistributions: true },
});

const preservedSalaryAvg = preserved.reduce((s, r) => s + Number(r.salary), 0) / preserved.length;

console.log(`Original  salary avg: ${originalSalaryAvg.toFixed(0)}`);
console.log(`Preserved salary avg: ${preservedSalaryAvg.toFixed(0)} (similar distribution)`);
console.log();

// ---------------------------------------------------------------------------
// 4. consistentIdentifiers — same original → same fake value
// ---------------------------------------------------------------------------
console.log('=== 4. consistentIdentifiers — stable ID mapping ===\n');

const ordersCols = [
  { name: 'orderId',    type: 'number' },
  { name: 'customerId', type: 'number' },
  { name: 'email',      type: 'email' },
  { name: 'amount',     type: 'price' },
];

const { records: orders } = generateData({
  columns: ordersCols.map(c => `${c.name}:${c.type}`).join(','),
  rows: 8,
  seed: 123,
});
// Ensure some customers repeat so we can observe consistency
orders[1].customerId = orders[0].customerId;
orders[5].customerId = orders[3].customerId;

const { records: anonOrders, idMap } = anonymizeRecords({
  records:  orders,
  columns:  ordersCols,
  options:  { consistentIdentifiers: true },
});

console.log('customer mapping (same original → same anonymized id):');
orders.forEach((orig, i) => {
  const anon = anonOrders[i];
  console.log(`  original=${orig.customerId} → anonymized=${anon.customerId}`);
});
console.log('idMap size (unique original IDs mapped):', idMap.size);
console.log();

// ---------------------------------------------------------------------------
// 5. keepColumns — opt certain columns out of anonymization
// ---------------------------------------------------------------------------
console.log('=== 5. keepColumns — preserve specific columns verbatim ===\n');

const { records: partial } = anonymizeRecords({
  records:  productionData,
  columns,
  options:  { keepColumns: ['country', 'createdAt', 'score'] },
});

console.log('original  | anon (country / score / createdAt must match):');
productionData.slice(0, 3).forEach((orig, i) => {
  const anon = partial[i];
  const countryMatch = orig.country === anon.country;
  const scoreMatch   = orig.score   === anon.score;
  console.log(
    `  country=${countryMatch ? '✓' : '✗'}  score=${scoreMatch ? '✓' : '✗'}` +
    `  email changed=${orig.email !== anon.email ? '✓' : '✗'}`
  );
});
console.log();

// ---------------------------------------------------------------------------
// 6. anonymizeFile() — Node.js file I/O helper
// ---------------------------------------------------------------------------
console.log('=== 6. anonymizeFile() — CSV/JSON file round-trip ===\n');

// Create a "production" CSV file first
await generateAndSave({
  columns: 'id:autoIncrement,firstName,lastName,email,phone,company,country',
  rows: 30,
  output: 'output/production-users.csv',
});

// Anonymize it — PII columns inferred automatically from column names
await anonymizeFile(
  'output/production-users.csv',
  'output/anonymized-users.csv',
);
console.log('CSV anonymized: output/production-users.csv → output/anonymized-users.csv');

// Same for JSON
await generateAndSave({
  columns: 'id:autoIncrement,firstName,lastName,email,salary:number,city,country',
  rows: 20,
  output: 'output/production-employees.json',
  formatOptions: { pretty: true },
});

await anonymizeFile(
  'output/production-employees.json',
  'output/anonymized-employees.json',
  { preserveDistributions: true },
);
console.log('JSON anonymized: output/production-employees.json → output/anonymized-employees.json\n');

// ---------------------------------------------------------------------------
// 7. buildIdMap() — reuse a map across batches
// ---------------------------------------------------------------------------
console.log('=== 7. buildIdMap() — consistent mapping across batches ===\n');

const idColumns = ['customerId'];
const batch1 = [
  { customerId: 101, name: 'Alice' },
  { customerId: 102, name: 'Bob' },
];
const batch2 = [
  { customerId: 101, name: 'Alice (new order)' },
  { customerId: 103, name: 'Carol' },
];

const sharedMap = buildIdMap(batch1, idColumns);
buildIdMap(batch2, idColumns, sharedMap); // extends the same map

console.log('Shared idMap entries:');
for (const [key, val] of sharedMap) {
  console.log(`  ${key} → ${val}`);
}
console.log('customerId 101 maps to the same value in both batches:', sharedMap.get('customerId:101'));

console.log('\n=== Anonymization examples completed ===');
