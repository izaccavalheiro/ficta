/**
 * Ficta Node.js Basic Usage Example
 *
 * Run from this directory:
 *   node basic-usage.js
 *
 * Covers:
 *   - All built-in Faker data types
 *   - All special types (autoIncrement, enum, range, pattern, static)
 *   - All five predefined templates
 *   - All output formats (CSV, JSON, XML, XLSX, TSV, SQL, YAML, TOML, Parquet)
 *   - The `preview` option
 *   - Reproducible output with seedFaker()
 *   - Localised data with setLocale()
 *   - generateFromDDL — generate seed data from an existing .sql schema file
 *   - listTypes() / listTemplates()
 */

import { generateData, generateAndSave, generateFromDDL, seedFaker, setLocale, listTypes, listTemplates } from '../../src/node.js';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('output', { recursive: true });

async function main() {
  console.log('=== Ficta Node.js Basic Usage ===\n');

  // -------------------------------------------------------------------------
  // 1. Core Faker types — verify each category
  // -------------------------------------------------------------------------
  console.log('1. All built-in Faker data types\n');

  const typesResult = generateData({
    columns: [
      // Person
      'firstName', 'lastName', 'fullName', 'jobTitle', 'prefix', 'suffix',
      // Internet
      'email', 'username', 'password', 'url', 'ipv4', 'userAgent',
      // Phone & Address
      'phone', 'street', 'city', 'state', 'country', 'zipCode',
      'latitude', 'longitude',
      // Company & Commerce
      'company', 'department', 'product', 'price', 'productDescription',
      // Finance
      'amount', 'accountNumber', 'iban', 'creditCardNumber', 'currency',
      // Dates
      'pastDate', 'futureDate', 'recentDate', 'timestamp',
      // Numbers & Text
      'number', 'float', 'word', 'words', 'sentence', 'paragraph',
      // IDs
      'uuid', 'nanoid',
      // Boolean, Color, Emoji, JSON
      'boolean', 'color', 'emoji', 'json',
    ].join(','),
    rows: 1,
  });
  console.log('Generated columns:', Object.keys(typesResult.records[0]).join(', '));
  console.log();

  // -------------------------------------------------------------------------
  // 2. Special types
  // -------------------------------------------------------------------------
  console.log('2. Special types\n');

  const specialResult = generateData({
    columns: [
      'id:autoIncrement',
      'role:enum:admin|editor|viewer',            // random pick from list
      'score:range:0-100',                         // random integer in range
      'sku:pattern:PRD-######',                    // # replaced with random digit
      'email:pattern:user+{COUNTER}@example.com',  // {COUNTER} = row index
      'env:static:production',                     // fixed value every row
    ].join(','),
    rows: 4,
  });
  console.log(JSON.stringify(specialResult.records, null, 2));
  console.log();

  // -------------------------------------------------------------------------
  // 3. Predefined templates
  // -------------------------------------------------------------------------
  console.log('3. Predefined templates\n');

  for (const tmpl of ['users', 'products', 'transactions', 'addresses', 'contacts']) {
    const res = generateData({ template: tmpl, rows: 2 });
    const cols = Object.keys(res.records[0]).join(', ');
    console.log(`  ${tmpl}: ${cols}`);
  }
  console.log();

  // -------------------------------------------------------------------------
  // 4. All output formats
  // -------------------------------------------------------------------------
  console.log('4. Saving to all supported formats\n');

  const columns = 'id:autoIncrement,firstName,lastName,email,phone,city,country';

  await generateAndSave({ columns, rows: 20, output: 'output/users.csv' });
  await generateAndSave({ columns, rows: 20, output: 'output/users.json' });
  await generateAndSave({ columns, rows: 20, output: 'output/users.xml',
    rootElement: 'users', recordElement: 'user' });
  await generateAndSave({ columns, rows: 20, output: 'output/users.xlsx',
    sheetName: 'Users' });
  await generateAndSave({ columns, rows: 20, output: 'output/users.tsv' });
  await generateAndSave({ columns, rows: 20, output: 'output/users.yaml' });
  await generateAndSave({ columns, rows: 20, output: 'output/users.toml' });

  // Parquet (Node.js only — columnar binary format used in big-data pipelines)
  await generateAndSave({ columns, rows: 20, output: 'output/users.parquet' });

  // SQL — basic INSERT (backward-compatible)
  await generateAndSave({ columns, rows: 20, output: 'output/users-insert.sql',
    tableName: 'users' });

  // SQL — DDL + INSERT (PostgreSQL)
  await generateAndSave({ columns, rows: 20, output: 'output/users-ddl.sql',
    formatOptions: { mode: 'ddl+insert', dialect: 'postgres', tableName: 'users' } });

  console.log('All formats written to output/\n');

  // -------------------------------------------------------------------------
  // 5. The `preview` option — prints a table preview to the console
  // -------------------------------------------------------------------------
  console.log('5. Preview option (prints first 3 rows to console)\n');

  await generateAndSave({
    template: 'products',
    rows: 10,
    output: 'output/products.json',
    preview: true,
  });
  console.log();

  // -------------------------------------------------------------------------
  // 6. generateFromDDL — seed data from an existing SQL schema file
  // -------------------------------------------------------------------------
  console.log('6. generateFromDDL — read a .sql schema, produce seed data\n');

  // Write a tiny schema file so the example is self-contained
  writeFileSync('output/demo-schema.sql', `
    CREATE TABLE authors (
      id    SERIAL PRIMARY KEY,
      name  VARCHAR(100),
      email VARCHAR(255) NOT NULL
    );
    CREATE TABLE books (
      id        SERIAL PRIMARY KEY,
      author_id INT REFERENCES authors(id),
      title     VARCHAR(255),
      published DATE
    );
  `);

  const seedSQL = await generateFromDDL({
    schemaFile: 'output/demo-schema.sql',
    rows: 4,
    outputMode: 'ddl+insert',
    dialect: 'postgres',
    output: 'output/demo-seed.sql',
  });

  console.log('Generated seed SQL (preview):');
  console.log(seedSQL.slice(0, 500) + '\n...');
  console.log();

  // -------------------------------------------------------------------------
  // 7. Reproducible output with seedFaker()
  // -------------------------------------------------------------------------
  console.log('7. Reproducible output with seedFaker()\n');

  seedFaker(42);
  const seeded1 = generateData({ columns: 'id:autoIncrement,name:fullName,email', rows: 3 });

  seedFaker(42);
  const seeded2 = generateData({ columns: 'id:autoIncrement,name:fullName,email', rows: 3 });

  const identical = JSON.stringify(seeded1.records) === JSON.stringify(seeded2.records);
  console.log(`Both runs with seed 42 produced identical data: ${identical}`);
  console.log(seeded1.records);
  console.log();

  // -------------------------------------------------------------------------
  // 8. Localised data with setLocale()
  // -------------------------------------------------------------------------
  console.log('8. Localised data with setLocale()\n');

  setLocale('fr'); // French locale
  const frenchData = generateData({ columns: 'id:autoIncrement,firstName,lastName,city,phone', rows: 3 });
  console.log('French data:');
  console.log(frenchData.records);
  console.log();

  setLocale('de'); // German locale
  const germanData = generateData({ columns: 'id:autoIncrement,firstName,lastName,city,phone', rows: 3 });
  console.log('German data:');
  console.log(germanData.records);
  console.log();

  setLocale('en'); // Reset to English

  // -------------------------------------------------------------------------
  // 9. List available types and templates
  // -------------------------------------------------------------------------
  console.log('9. Available types and templates\n');
  listTypes();
  console.log();
  listTemplates();

  console.log('\n=== Done ===');
}

main().catch(err => { console.error(err); process.exit(1); });
