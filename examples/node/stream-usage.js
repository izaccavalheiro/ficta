/**
 * Ficta — Streaming Data Generation
 *
 * Run from this directory:
 *   node stream-usage.js
 *
 * Covers:
 *   - generateStream() — Node.js Readable stream for CSV and NDJSON
 *   - Large dataset generation without loading all rows into memory
 *   - Pipe stream to a writable file
 *   - Batch size control
 *   - Reproducible streaming output with seed
 *   - Locale-aware streaming
 *   - Using a template as the column source
 *   - Reading stream data into a string (for small previews)
 */

import { generateStream, seedFaker, setLocale } from '../../src/node.js';
import { createWriteStream, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';

mkdirSync('output', { recursive: true });

// ---------------------------------------------------------------------------
// Helper: collect all stream chunks into a single string (useful for tests)
// ---------------------------------------------------------------------------
function streamToString(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', chunk => chunks.push(String(chunk)));
    readable.on('end', () => resolve(chunks.join('')));
    readable.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// 1. CSV stream — 50 000 rows piped to a file
// ---------------------------------------------------------------------------
console.log('=== 1. CSV stream — 50 000 rows ===\n');

const csvStream = generateStream({
  columns: 'id:autoIncrement,firstName,lastName,email,phone,city,country,company,jobTitle',
  rows: 50_000,
  format: 'csv',
  batchSize: 1000, // emit 1 000 CSV rows per chunk
});

await pipeline(csvStream, createWriteStream('output/large.csv'));
console.log('Written output/large.csv (50 000 rows)\n');

// ---------------------------------------------------------------------------
// 2. NDJSON stream — 10 000 rows piped to a file
//    Each line is a JSON object: {"id":1,"firstName":"…",…}
// ---------------------------------------------------------------------------
console.log('=== 2. NDJSON stream — 10 000 rows ===\n');

const ndjsonStream = generateStream({
  columns: 'id:autoIncrement,username,email,active:boolean,score:range:1-100,registeredAt:timestamp',
  rows: 10_000,
  format: 'ndjson',
  batchSize: 500,
});

await pipeline(ndjsonStream, createWriteStream('output/large.ndjson'));
console.log('Written output/large.ndjson (10 000 rows)\n');

// ---------------------------------------------------------------------------
// 3. Stream from a template
// ---------------------------------------------------------------------------
console.log('=== 3. Stream using a template ===\n');

const templateStream = generateStream({
  template: 'users',
  rows: 5_000,
  format: 'csv',
});

await pipeline(templateStream, createWriteStream('output/users-stream.csv'));
console.log('Written output/users-stream.csv (5 000 rows, template: users)\n');

// ---------------------------------------------------------------------------
// 4. Reproducible stream with seedFaker()
//    Both streams must produce the same data.
// ---------------------------------------------------------------------------
console.log('=== 4. Reproducible stream with seed ===\n');

const columns = 'id:autoIncrement,name:fullName,email';

seedFaker(1234);
const run1 = await streamToString(
  generateStream({ columns, rows: 5, format: 'csv' })
);

seedFaker(1234);
const run2 = await streamToString(
  generateStream({ columns, rows: 5, format: 'csv' })
);

console.log('Run 1 === Run 2:', run1 === run2);
console.log('Preview:\n' + run1);

// ---------------------------------------------------------------------------
// 5. Locale-aware streaming
// ---------------------------------------------------------------------------
console.log('=== 5. Locale-aware stream (Portuguese) ===\n');

setLocale('pt_BR');

const ptStream = generateStream({
  columns: 'id:autoIncrement,firstName,lastName,city,state,phone',
  rows: 5,
  format: 'ndjson',
});

const ptData = await streamToString(ptStream);
ptData.trim().split('\n').forEach(line => console.log(line));
console.log();

setLocale('en'); // reset

// ---------------------------------------------------------------------------
// 6. Raw header formatting — headerFormat: 'raw'
//    Column names are emitted as-is instead of being Title-Cased
// ---------------------------------------------------------------------------
console.log('=== 6. CSV stream with raw header format ===\n');

const rawHeaderStream = generateStream({
  columns: 'user_id:autoIncrement,full_name:fullName,email_address:email',
  rows: 3,
  format: 'csv',
  formatOptions: { headerFormat: 'raw' },
});

console.log(await streamToString(rawHeaderStream));

// ---------------------------------------------------------------------------
// 7. CSV stream with header suppressed
// ---------------------------------------------------------------------------
console.log('=== 7. CSV stream — no header row ===\n');

const noHeaderStream = generateStream({
  columns: 'id:autoIncrement,sku:pattern:P-######,price',
  rows: 3,
  format: 'csv',
  formatOptions: { header: false },
});

console.log(await streamToString(noHeaderStream));

console.log('=== Stream examples done ===');
