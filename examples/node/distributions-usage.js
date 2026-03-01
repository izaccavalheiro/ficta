/**
 * Ficta — Statistical Distributions & Cross-Column Dependencies (v1.2.0)
 *
 * Run from this directory:
 *   node distributions-usage.js
 *
 * Covers:
 *   - sampleUniform()          — uniform random value in [min, max)
 *   - sampleNormal()           — Box-Muller Gaussian distribution
 *   - sampleExponential()      — inverse-CDF exponential distribution
 *   - sampleZipf()             — Zipf power-law distribution
 *   - sampleFromDistribution() — unified dispatcher
 *   - `distribution` field on SchemaColumn — integrated with generateData()
 *   - Enum columns with Zipf weighting (realistic skewed data)
 *   - Range columns with Normal clamping
 *   - autoWireGeographicDependencies() — country → city/state autowiring
 *   - schema: SchemaColumn[] input with `depends` field for custom dependencies
 *   - Generating realistic analytics datasets
 */

import { faker } from '@faker-js/faker';
import { setFaker, generateData, columnStringToSchema } from '../../src/core.js';
import {
  sampleUniform,
  sampleNormal,
  sampleExponential,
  sampleZipf,
  sampleFromDistribution,
} from '../../src/distributions.js';
import { autoWireGeographicDependencies } from '../../src/dependencies.js';
import { generateAndSave } from '../../src/node.js';
import { mkdirSync } from 'fs';

setFaker(faker);
mkdirSync('output', { recursive: true });

// ---------------------------------------------------------------------------
// 1. Raw samplers — standalone usage
// ---------------------------------------------------------------------------
console.log('=== 1. Raw distribution samplers ===\n');

// Uniform — equally likely across the range
const uniformSamples = Array.from({ length: 5 }, () =>
  sampleUniform(18, 65).toFixed(2)
);
console.log('sampleUniform(18, 65) × 5:', uniformSamples);

// Normal — bell curve around a mean
const normalSamples = Array.from({ length: 5 }, () =>
  Math.round(sampleNormal(70, 10))  // mean=70, stddev=10
);
console.log('sampleNormal(70, 10) × 5:', normalSamples);

// Exponential — very common in wait-times, inter-arrival modelling
const expSamples = Array.from({ length: 5 }, () =>
  sampleExponential(0.5).toFixed(2) // mean = 1/lambda = 2
);
console.log('sampleExponential(0.5) × 5:', expSamples);

// Zipf — power-law: rank 1 is most frequent (tier popularity, word frequency…)
const zipfSamples = Array.from({ length: 10 }, () =>
  sampleZipf(5, 1.5)               // 5 items, exponent 1.5
);
const zipfCounts = [1, 2, 3, 4, 5].map(r => [r, zipfSamples.filter(v => v === r).length]);
console.log('sampleZipf(5, 1.5) × 10 → (rank, count):', zipfCounts);
console.log();

// ---------------------------------------------------------------------------
// 2. sampleFromDistribution() — unified dispatcher
// ---------------------------------------------------------------------------
console.log('=== 2. sampleFromDistribution() — unified dispatcher ===\n');

const types = [
  { type: 'uniform',     min: 0, max: 100 },
  { type: 'normal',      mean: 50, stddev: 8 },
  { type: 'exponential', lambda: 0.3 },
  { type: 'zipf',        n: 4, s: 1.2 },
];

for (const params of types) {
  const sample = sampleFromDistribution(params);
  console.log(`  ${params.type.padEnd(12)} →`, typeof sample === 'number' ? sample.toFixed(3) : sample);
}
console.log();

// ---------------------------------------------------------------------------
// 3. `distribution` on schema columns — integrated with generateData()
//    Range and numeric columns: sampled value is clamped to declared bounds.
//    Enum columns: Zipf rank selects from the enum values list.
// ---------------------------------------------------------------------------
console.log('=== 3. Distributions integrated with generateData() ===\n');

const { records: analyticsRows } = generateData({
  schema: [
    { name: 'userId',  type: 'autoIncrement' },
    { name: 'age',     type: 'range:18-80',
      distribution: { type: 'normal', mean: 35, stddev: 10 } },
    { name: 'sessions', type: 'range:1-500',
      distribution: { type: 'exponential', lambda: 0.1 } },
    { name: 'plan',    type: 'enum:free|starter|pro|enterprise',
      distribution: { type: 'zipf', n: 4, s: 1.8 } },
    { name: 'score',   type: 'range:0-100',
      distribution: { type: 'normal', mean: 72, stddev: 12 } },
  ],
  rows: 20,
});

// Show distribution summary
const planCounts = { free: 0, starter: 0, pro: 0, enterprise: 0 };
let totalAge = 0, minAge = Infinity, maxAge = -Infinity;
for (const r of analyticsRows) {
  planCounts[r.plan] = (planCounts[r.plan] || 0) + 1;
  totalAge += Number(r.age);
  minAge = Math.min(minAge, Number(r.age));
  maxAge = Math.max(maxAge, Number(r.age));
}
console.log('Plan distribution (Zipf-weighted — free dominates):');
console.log(planCounts);
console.log(`Age summary: min=${minAge}, max=${maxAge}, avg=${(totalAge / analyticsRows.length).toFixed(1)}`);
console.log('Sample rows (first 5):');
console.log(analyticsRows.slice(0, 5));
console.log();

// ---------------------------------------------------------------------------
// 4. Save a realistic analytics dataset to CSV
// ---------------------------------------------------------------------------
console.log('=== 4. Realistic analytics dataset → CSV ===\n');

await generateAndSave({
  schema: [
    { name: 'userId',       type: 'autoIncrement' },
    { name: 'email',        type: 'email' },
    { name: 'plan',         type: 'enum:free|starter|pro|enterprise',
      distribution: { type: 'zipf', n: 4, s: 1.8 } },
    { name: 'age',          type: 'range:18-80',
      distribution: { type: 'normal', mean: 35, stddev: 10 } },
    { name: 'monthlySpend', type: 'range:0-5000',
      distribution: { type: 'exponential', lambda: 0.001 } },
    { name: 'sessions',     type: 'range:1-1000',
      distribution: { type: 'exponential', lambda: 0.005 } },
    { name: 'npsScore',     type: 'range:0-10',
      distribution: { type: 'normal', mean: 7.2, stddev: 2 } },
    { name: 'country',      type: 'country' },
    { name: 'signupDate',   type: 'pastDate' },
  ],
  rows: 500,
  output: 'output/analytics.csv',
});
console.log('Written output/analytics.csv (500 rows, realistic distributions)\n');

// ---------------------------------------------------------------------------
// 5. Cross-column geographic dependencies
//    autoWireGeographicDependencies() automatically adds depends: { column: 'country' }
//    to any `state` or `city` column when a `country` column is present.
// ---------------------------------------------------------------------------
console.log('=== 5. Cross-column geographic dependencies ===\n');

// Option A: parse a column string and let autoWireGeographicDependencies wire it
const geoSchema = columnStringToSchema(
  'id:autoIncrement,firstName,lastName,email,country,state,city'
);
autoWireGeographicDependencies(geoSchema);

const { records: geoRows } = generateData({ schema: geoSchema, rows: 8 });
console.log('With autoWireGeographicDependencies — city and state match country:');
geoRows.forEach(r => console.log(`  ${r.country.padEnd(20)} → ${(r.state || '').padEnd(15)} → ${r.city}`));
console.log();

// Option B: pass all three columns together — generateData handles wiring internally
const { records: geoRows2 } = generateData({
  columns: 'id:autoIncrement,firstName,country,state,city',
  rows: 5,
});
console.log('Passing country+state+city as column string — automatically consistent:');
geoRows2.forEach(r => console.log(`  ${r.country.padEnd(20)} → ${(r.state || '').padEnd(15)} → ${r.city}`));
console.log();

// ---------------------------------------------------------------------------
// 6. Custom depends mapping — explicit dependency between any two columns
// ---------------------------------------------------------------------------
console.log('=== 6. Custom depends mapping ===\n');

const { records: categoryRows } = generateData({
  schema: [
    { name: 'id',       type: 'autoIncrement' },
    { name: 'region',   type: 'enum:EMEA|AMER|APAC' },
    {
      name: 'currency',
      type: 'enum:EUR|USD|SGD',   // fallback type if mapping has no match
      depends: {
        column: 'region',
        mapping: {
          EMEA: ['EUR', 'GBP', 'CHF'],
          AMER: ['USD', 'CAD', 'MXN'],
          APAC: ['SGD', 'JPY', 'AUD'],
        },
      },
    },
  ],
  rows: 10,
});
console.log('Region → Currency dependency (each currency matches region):');
categoryRows.forEach(r => console.log(`  ${r.region.padEnd(6)} → ${r.currency}`));
console.log();

// ---------------------------------------------------------------------------
// 7. Save a geographically-consistent dataset to JSON
// ---------------------------------------------------------------------------
console.log('=== 7. Consistent geo data → JSON ===\n');

await generateAndSave({
  columns: 'id:autoIncrement,fullName,email,country,state,city,zipCode',
  rows: 100,
  output: 'output/geo-consistent.json',
  formatOptions: { pretty: false },
});
console.log('Written output/geo-consistent.json (100 rows, country/state/city consistent)\n');

console.log('=== Distributions & Dependencies examples completed ===');
