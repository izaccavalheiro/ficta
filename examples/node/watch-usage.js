/**
 * Ficta — watchAndGenerate
 *
 * Run from this directory:
 *   node watch-usage.js
 *
 * Covers:
 *   - watchAndGenerate()  — watch a DDL .sql file and re-run generateFromDDL
 *                           every time the file changes
 *   - onSuccess callback  — called with (outputPath, elapsedMs) after each rebuild
 *   - onError callback    — called with (Error) when generation fails
 *   - debounceMs option   — control how quickly consecutive changes trigger a rebuild
 *   - watcher.stop()      — cleanly shut down the file watcher
 *   - Complete round-trip: write schema → start watcher → edit schema → verify rebuild
 *
 * CLI equivalent (stays active until Ctrl-C):
 *   ficta schema schema.sql --watch --output seed.sql --rows 5 --dialect postgres
 */

import { watchAndGenerate } from '../../src/node.js';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';

mkdirSync('output', { recursive: true });

// ---------------------------------------------------------------------------
// Helper — wait for N milliseconds
// ---------------------------------------------------------------------------
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ===========================================================================
// Demo schema file we will create and mutate during the watch session
// ===========================================================================
const schemaFile = 'output/watch-demo.sql';
const outputFile = 'output/watch-demo-seed.sql';

function writeSchema(version) {
  const extra = version === 2
    ? ',\n      created_at TIMESTAMP'
    : '';
  writeFileSync(schemaFile, `
    -- Watch demo schema v${version}
    CREATE TABLE users (
      id         SERIAL PRIMARY KEY,
      email      VARCHAR(255) NOT NULL,
      first_name VARCHAR(50),
      last_name  VARCHAR(50)${extra}
    );
    CREATE TABLE posts (
      id      SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id),
      title   VARCHAR(255) NOT NULL,
      body    TEXT
    );
  `.trim());
}

// ===========================================================================
// 1. Basic usage — start watcher, trigger a change, stop cleanly
// ===========================================================================
console.log('=== 1. Basic watchAndGenerate round-trip ===\n');

// Write initial schema
writeSchema(1);

let buildCount = 0;

const watcher = watchAndGenerate({
  schemaFile,
  rows: 3,
  outputMode: 'ddl+insert',
  dialect: 'postgres',
  output: outputFile,

  // onSuccess is called after each successful rebuild
  onSuccess(outputPath, elapsedMs) {
    buildCount++;
    console.log(`  [build ${buildCount}] Written ${outputPath} in ${elapsedMs}ms`);
  },

  // onError is called if generation throws
  onError(err) {
    console.error('  [error]', err.message);
  },

  // Debounce: wait 200 ms after the last file change before rebuilding
  // (default is 300 ms; lower value speeds up this demo)
  debounceMs: 200,
});

// Give the watcher a moment to initialise, then modify the schema
await sleep(400);
console.log('  Modifying schema file (adding created_at column)…');
writeSchema(2);

// Wait for the debounce + rebuild to complete
await sleep(700);

// Stop the watcher
watcher.stop();
console.log('  Watcher stopped. Total rebuilds triggered:', buildCount);

// Verify the output was written
const outputSQL = readFileSync(outputFile, 'utf-8');
console.log(`  Output SQL lines: ${outputSQL.split('\n').length}`);
console.log();

// ===========================================================================
// 2. debounceMs — rapid consecutive changes are collapsed into one rebuild
// ===========================================================================
console.log('=== 2. Debouncing rapid file edits ===\n');

const schemaFile2 = 'output/watch-rapid.sql';
writeFileSync(schemaFile2, `
  CREATE TABLE items (
    id    SERIAL PRIMARY KEY,
    label VARCHAR(100)
  );
`.trim());

let rapidBuildCount = 0;

const watcher2 = watchAndGenerate({
  schemaFile: schemaFile2,
  rows: 2,
  outputMode: 'insert',
  dialect: 'generic',
  output: 'output/watch-rapid-seed.sql',
  debounceMs: 500,   // longer window so rapid edits coalesce
  onSuccess(_, elapsedMs) {
    rapidBuildCount++;
    console.log(`  [build ${rapidBuildCount}] Rebuilt in ${elapsedMs}ms`);
  },
  onError(err) {
    console.error('  [error]', err.message);
  },
});

await sleep(200);

// Simulate three rapid edits within the 500 ms debounce window
for (let i = 1; i <= 3; i++) {
  writeFileSync(schemaFile2, `
    CREATE TABLE items (
      id    SERIAL PRIMARY KEY,
      label VARCHAR(100),
      rev   INT DEFAULT ${i}
    );
  `.trim());
  await sleep(60); // faster than debounceMs
}

// Wait for debounce to fire + rebuild
await sleep(800);
watcher2.stop();
console.log(`  Rapid edits triggered ${rapidBuildCount} actual rebuild(s) (expected: 1)\n`);

// ===========================================================================
// 3. onError callback — bad SQL syntax causes a graceful error
// ===========================================================================
console.log('=== 3. onError callback — handles generation errors gracefully ===\n');

const badSchemaFile = 'output/watch-bad.sql';
writeFileSync(badSchemaFile, `
  CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100)
  );
`.trim());

let errorCount = 0;

const watcher3 = watchAndGenerate({
  schemaFile: badSchemaFile,
  rows: 2,
  outputMode: 'insert',
  dialect: 'generic',
  onSuccess() {
    console.log('  [build] OK');
  },
  onError(err) {
    errorCount++;
    console.log(`  [error ${errorCount}] Caught: ${err.message.slice(0, 80)}…`);
  },
  debounceMs: 150,
});

await sleep(200);

// Write intentionally broken SQL to trigger a parse/generation error
writeFileSync(badSchemaFile, 'THIS IS NOT VALID SQL ;;;');
await sleep(500);

watcher3.stop();
console.log(`  Total errors caught: ${errorCount}\n`);

// ===========================================================================
// 4. CLI reference
// ===========================================================================
console.log('=== 4. CLI equivalent (run from project root) ===\n');
console.log('  # Generate once then watch for changes (Ctrl-C to stop):');
console.log('  node cli.js schema examples/node/output/watch-demo.sql \\');
console.log('    --watch --rows 5 --dialect postgres --output seed.sql\n');
console.log('  # Watch with MySQL upsert mode:');
console.log('  node cli.js schema schema.sql --watch --mode upsert --dialect mysql -o seed.sql\n');

console.log('=== watchAndGenerate examples done ===');
