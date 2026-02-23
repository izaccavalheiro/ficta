/**
 * Ficta — Plugin API
 *
 * Run from this directory:
 *   node plugin-api.js
 *
 * Covers:
 *   - registerType()        — add a custom data type generator
 *   - unregisterType()      — remove a custom type
 *   - registerTemplate()    — add a custom column template
 *   - unregisterTemplate()  — remove a custom template
 *   - Override guard ({ override: true }) for both types and templates
 *   - Using custom types inside generateData() and generateAndSave()
 *   - Error handling for duplicate registrations and built-in protection
 */

import { faker } from '@faker-js/faker';
import {
  setFaker,
  generateData,
  registerType,
  unregisterType,
  registerTemplate,
  unregisterTemplate,
} from '../../src/core.js';
import { generateAndSave } from '../../src/node.js';
import { mkdirSync } from 'fs';

setFaker(faker);
mkdirSync('output', { recursive: true });

// ---------------------------------------------------------------------------
// 1. Register a custom type — hashtag
// ---------------------------------------------------------------------------
console.log('=== 1. Register a custom type: hashtag ===\n');

registerType('hashtag', () => '#' + faker.word.sample());

const hashtagResult = generateData({
  columns: 'id:autoIncrement,tag:hashtag',
  rows: 5,
});
console.log(hashtagResult.records);
console.log();

// ---------------------------------------------------------------------------
// 2. Register a custom type — semver (semantic version string)
// ---------------------------------------------------------------------------
console.log('=== 2. Register a custom type: semver ===\n');

registerType('semver', () => {
  const major = faker.number.int({ min: 0, max: 5 });
  const minor = faker.number.int({ min: 0, max: 20 });
  const patch = faker.number.int({ min: 0, max: 99 });
  return `${major}.${minor}.${patch}`;
});

const semverResult = generateData({
  columns: 'package:product,version:semver,tag:hashtag',
  rows: 4,
});
console.log(semverResult.records);
console.log();

// ---------------------------------------------------------------------------
// 3. Register a custom type — hex color
// ---------------------------------------------------------------------------
console.log('=== 3. Register a custom type: hexColor ===\n');

registerType('hexColor', () => faker.color.rgb({ format: 'hex' }));

await generateAndSave({
  columns: 'id:autoIncrement,name:word,primaryColor:hexColor,secondaryColor:hexColor',
  rows: 5,
  output: 'output/themes.json',
});
console.log();

// ---------------------------------------------------------------------------
// 4. Override an existing custom type (requires override: true)
// ---------------------------------------------------------------------------
console.log('=== 4. Override a custom type ===\n');

registerType('semver', () => '1.0.0', { override: true }); // always '1.0.0'

const fixedSemver = generateData({ columns: 'pkg:product,version:semver', rows: 3 });
console.log('All versions fixed at 1.0.0:');
console.log(fixedSemver.records.map(r => r.version));
console.log();

// Error when overriding without the flag:
try {
  registerType('semver', () => '0.0.0'); // will throw
} catch (err) {
  console.log(`Expected error: ${err.message}\n`);
}

// ---------------------------------------------------------------------------
// 5. Unregister a custom type
// ---------------------------------------------------------------------------
console.log('=== 5. Unregister a custom type ===\n');

unregisterType('semver');
console.log('semver type removed.\n');

// Trying to use it now falls back to the word generator
const afterUnregister = generateData({ columns: 'version:semver', rows: 2 });
console.log('Fallback value after unregister:', afterUnregister.records);
console.log();

// Built-in types cannot be removed:
try {
  unregisterType('email');
} catch (err) {
  console.log(`Expected error: ${err.message}\n`);
}

// ---------------------------------------------------------------------------
// 6. Register a custom template — changelog entry
// ---------------------------------------------------------------------------
console.log('=== 6. Register a custom template: changelog ===\n');

registerTemplate('changelog', {
  columns: 'id:autoIncrement,version:hashtag,author:fullName,date:recentDate,summary:sentence',
  rows: 10,
});

const changelogResult = generateData({ template: 'changelog', rows: 3 });
console.log(changelogResult.records);
console.log();

// ---------------------------------------------------------------------------
// 7. Register a custom template — IoT sensor reading
// ---------------------------------------------------------------------------
console.log('=== 7. Register a custom template: sensorReading ===\n');

registerTemplate('sensorReading', {
  columns: [
    'deviceId:uuid',
    'timestamp:timestamp',
    'temperature:range:15-40',
    'humidity:range:20-90',
    'pressure:range:950-1050',
    'active:boolean',
  ].join(','),
  rows: 50,
});

await generateAndSave({
  template: 'sensorReading',
  rows: 20,
  output: 'output/sensor-readings.json',
});
console.log();

// ---------------------------------------------------------------------------
// 8. Override an existing custom template (requires override: true)
// ---------------------------------------------------------------------------
console.log('=== 8. Override a custom template ===\n');

registerTemplate('changelog', {
  columns: 'id:autoIncrement,tag:hashtag,author:fullName,date:recentDate',
  rows: 5,
}, { override: true });

const overridden = generateData({ template: 'changelog', rows: 2 });
console.log('Overridden changelog columns:', Object.keys(overridden.records[0]));
console.log();

// Error when overriding without the flag:
try {
  registerTemplate('changelog', { columns: 'id:autoIncrement', rows: 1 });
} catch (err) {
  console.log(`Expected error: ${err.message}\n`);
}

// ---------------------------------------------------------------------------
// 9. Unregister a custom template
// ---------------------------------------------------------------------------
console.log('=== 9. Unregister a custom template ===\n');

unregisterTemplate('changelog');
unregisterTemplate('sensorReading');
console.log('Both custom templates removed.\n');

// Built-in templates cannot be removed:
try {
  unregisterTemplate('users');
} catch (err) {
  console.log(`Expected error: ${err.message}\n`);
}

// ---------------------------------------------------------------------------
// Cleanup custom types registered in this session
// ---------------------------------------------------------------------------
unregisterType('hashtag');
unregisterType('hexColor');

console.log('=== Plugin API examples done ===');
