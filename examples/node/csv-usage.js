/**
 * Ficta CSV Usage Examples
 *
 * Run from this directory:
 *   node csv-usage.js
 *
 * Covers:
 *   - Basic CSV generation with common person/contact fields
 *   - Pattern-based emails (tag+counter style) — matches the CLI example:
 *       npx ficta -c "firstName,lastName,email:pattern:icavalheiro+{COUNTER}@events.com" -r 100 -o ./users.csv
 *   - Special types in CSV: autoIncrement, enum, range, pattern, static
 *   - Header formatting: Title Case (default) vs raw camelCase
 *   - CSV without header row
 *   - Getting the raw CSV string via generateData()
 *   - Template-based CSV generation
 *   - Reproducible CSV output with seedFaker()
 *   - Localised CSV data with setLocale()
 *   - Preview option
 */

import { generateData, generateAndSave, seedFaker, setLocale } from '../../src/node.js';
import { mkdirSync } from 'fs';

mkdirSync('output', { recursive: true });

async function main() {
  console.log('=== Ficta CSV Usage Examples ===\n');

  // -------------------------------------------------------------------------
  // 1. Event registrations — pattern email with {COUNTER}
  //
  //    CLI equivalent:
  //      npx ficta -c "firstName,lastName,email:pattern:icavalheiro+{COUNTER}@events.com" \
  //                -r 100 -o ./users.csv
  // -------------------------------------------------------------------------
  console.log('1. Event registrations — pattern email with {COUNTER}\n');

  await generateAndSave({
    columns: 'firstName,lastName,email:pattern:icavalheiro+{COUNTER}@events.com',
    rows: 100,
    output: 'output/event-registrations.csv',
  });

  // Preview the first few rows in memory
  const eventsPreview = generateData({
    columns: 'firstName,lastName,email:pattern:icavalheiro+{COUNTER}@events.com',
    rows: 4,
  });
  console.log('Sample rows:');
  console.log(eventsPreview.records);
  console.log('→ Written to output/event-registrations.csv\n');

  // -------------------------------------------------------------------------
  // 2. Basic CSV — common person / contact fields
  // -------------------------------------------------------------------------
  console.log('2. Basic CSV — person and contact fields\n');

  await generateAndSave({
    columns: 'id:autoIncrement,firstName,lastName,email,phone,city,country',
    rows: 50,
    output: 'output/contacts.csv',
  });
  console.log('→ Written to output/contacts.csv\n');

  // -------------------------------------------------------------------------
  // 3. CSV with special types
  // -------------------------------------------------------------------------
  console.log('3. CSV with special types\n');

  const specialResult = generateData({
    columns: [
      'id:autoIncrement',
      'role:enum:admin|editor|viewer',             // random pick from list
      'score:range:0-100',                          // random integer in range
      'sku:pattern:PRD-######',                     // # → random digit
      'tag:pattern:user+{COUNTER}@example.com',     // {COUNTER} → row index
      'env:static:production',                      // fixed value every row
    ].join(','),
    rows: 5,
  });
  console.log(JSON.stringify(specialResult.records, null, 2));
  console.log();

  await generateAndSave({
    columns: 'id:autoIncrement,role:enum:admin|editor|viewer,score:range:0-100,env:static:production',
    rows: 20,
    output: 'output/roles.csv',
  });
  console.log('→ Written to output/roles.csv\n');

  // -------------------------------------------------------------------------
  // 4. Header formatting options
  // -------------------------------------------------------------------------
  console.log('4. Header formatting\n');

  // Default: Title Case headers ("First Name", "Last Name", …)
  await generateAndSave({
    columns: 'firstName,lastName,jobTitle,companyName:company',
    rows: 10,
    output: 'output/employees-titlecase.csv',
    // formatOptions.headerFormat defaults to 'title'
  });
  console.log('→ Title-case headers → output/employees-titlecase.csv');

  // Raw camelCase headers ("firstName", "lastName", …)
  await generateAndSave({
    columns: 'firstName,lastName,jobTitle,companyName:company',
    rows: 10,
    output: 'output/employees-raw.csv',
    formatOptions: { headerFormat: 'raw' },
  });
  console.log('→ Raw camelCase headers → output/employees-raw.csv');

  // No header row at all
  await generateAndSave({
    columns: 'firstName,lastName,email',
    rows: 10,
    output: 'output/no-header.csv',
    formatOptions: { header: false },
  });
  console.log('→ No header row → output/no-header.csv\n');

  // -------------------------------------------------------------------------
  // 5. Get raw CSV string (no file write)
  // -------------------------------------------------------------------------
  console.log('5. Raw CSV string in memory\n');

  // generateData() gives records + parsed column metadata — no file I/O
  const { records, columns: parsedCols } = generateData({
    columns: 'id:autoIncrement,firstName,lastName,email',
    rows: 3,
  });
  console.log(`Generated ${records.length} records in memory`);
  console.log('Fields:', parsedCols.map(c => c.name).join(', '));
  console.log();

  // -------------------------------------------------------------------------
  // 6. Template-based CSV generation
  // -------------------------------------------------------------------------
  console.log('6. Template-based CSV generation\n');

  for (const tmpl of ['users', 'addresses', 'contacts']) {
    await generateAndSave({ template: tmpl, rows: 25, output: `output/${tmpl}.csv` });
    console.log(`→ output/${tmpl}.csv`);
  }
  console.log();

  // -------------------------------------------------------------------------
  // 7. Reproducible CSV output with seedFaker()
  // -------------------------------------------------------------------------
  console.log('7. Reproducible CSV with seedFaker()\n');

  seedFaker(42);
  const run1 = generateData({ columns: 'id:autoIncrement,firstName,lastName,email', rows: 3 });

  seedFaker(42);
  const run2 = generateData({ columns: 'id:autoIncrement,firstName,lastName,email', rows: 3 });

  const identical = JSON.stringify(run1.records) === JSON.stringify(run2.records);
  console.log(`Two runs with seed 42 produced identical data: ${identical}`);
  console.log(run1.records);
  console.log();

  // -------------------------------------------------------------------------
  // 8. Localised CSV data
  // -------------------------------------------------------------------------
  console.log('8. Localised CSV data\n');

  const locales = [
    { locale: 'fr', label: 'French', file: 'output/contacts-fr.csv' },
    { locale: 'de', label: 'German', file: 'output/contacts-de.csv' },
    { locale: 'pt_BR', label: 'Brazilian Portuguese', file: 'output/contacts-pt_BR.csv' },
    { locale: 'ja', label: 'Japanese', file: 'output/contacts-ja.csv' },
  ];

  for (const { locale, label, file } of locales) {
    setLocale(locale);
    await generateAndSave({
      columns: 'id:autoIncrement,firstName,lastName,city,phone',
      rows: 10,
      output: file,
    });
    console.log(`→ ${label} data → ${file}`);
  }

  setLocale('en'); // reset to English
  console.log();

  // -------------------------------------------------------------------------
  // 9. Preview option — inspect first N rows before writing
  // -------------------------------------------------------------------------
  console.log('9. Preview option\n');

  await generateAndSave({
    template: 'users',
    rows: 20,
    output: 'output/users-preview.csv',
    preview: true,   // prints a table to stdout
  });

  console.log('\n=== Done ===');
}

main().catch(err => { console.error(err); process.exit(1); });
