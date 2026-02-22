// Node.js-specific functionality for Ficta
import { faker } from '@faker-js/faker';
import * as core from './core.js';
import * as formatters from './formatters.js';

// Initialize faker for the core module
core.setFaker(faker);

// Re-export core functionality
export * from './core.js';

// Re-export formatters
export * from './formatters.js';

/**
 * Write content to file
 * @param {string|Buffer} content - File content
 * @param {string} filepath - Output file path
 * @returns {Promise<void>}
 */
export async function writeFile(content, filepath) {
  const fs = await import('fs');
  const encoding = Buffer.isBuffer(content) ? null : 'utf-8';
  await fs.promises.writeFile(filepath, content, encoding);
}

/**
 * Generate data and save to file in specified format
 * @param {Object} options - Generation options
 * @param {string} options.columns - Column definitions
 * @param {number} options.rows - Number of rows
 * @param {string} options.output - Output file path
 * @param {string} options.format - Output format (csv, json, xml, xlsx, tsv, sql)
 * @param {boolean} options.preview - Show preview
 * @param {Object} options.formatOptions - Additional format-specific options
 * @returns {Promise<Object>} Generation result
 */
export async function generateAndSave(options) {
  // Detect format from filename if not specified
  let format = options.format;
  if (!format && options.output) {
    format = formatters.detectFormat(options.output);
  }
  format = format || 'csv';
  
  // Generate default output filename if not specified
  let output = options.output;
  if (!output) {
    const ext = formatters.getFileExtension(format);
    output = `test-data.${ext}`;
  }
  
  // Generate data
  const result = core.generateData(options);
  
  // Format data according to specified format
  const formatOptions = options.formatOptions || {};
  const formattedData = await formatters.formatData(
    result.records,
    result.columns,
    format,
    formatOptions
  );
  
  // Write to file
  await writeFile(formattedData, output);
  
  console.log(`✓ Generated ${output} with ${result.rowCount} rows and ${result.columnCount} columns (${format.toUpperCase()} format)`);
  
  if (options.preview) {
    console.log('\nPreview (first 3 rows):');
    console.table(result.records.slice(0, 3));
  }
  
  return {
    ...result,
    format,
    output,
    data: formattedData
  };
}

/**
 * List available data types
 */
export function listTypes() {
  const lines = ['\n📋 Available Data Types:\n'];
  
  const categories = {
    'Person': ['firstName', 'lastName', 'fullName', 'jobTitle', 'prefix', 'suffix'],
    'Internet': ['email', 'username', 'password', 'url', 'ipv4', 'userAgent'],
    'Phone': ['phone'],
    'Address': ['street', 'city', 'state', 'country', 'zipCode', 'latitude', 'longitude'],
    'Company': ['company', 'department'],
    'Commerce': ['product', 'price', 'productDescription'],
    'Finance': ['amount', 'accountNumber', 'iban', 'creditCardNumber', 'currency'],
    'Date': ['pastDate', 'futureDate', 'recentDate', 'timestamp'],
    'Numbers': ['number', 'float'],
    'Text': ['word', 'words', 'sentence', 'paragraph'],
    'IDs': ['uuid', 'nanoid', 'autoIncrement'],
    'Other': ['boolean', 'color', 'emoji']
  };

  for (const [category, types] of Object.entries(categories)) {
    lines.push(`${category}:`);
    types.forEach(type => lines.push(`  - ${type}`));
    lines.push('');
  }

  lines.push('Special Types:');
  lines.push('  - static:VALUE        Fixed value for all rows');
  lines.push('  - enum:val1|val2|val3 Random choice from list');
  lines.push('  - range:MIN-MAX       Random number in range');
  lines.push('  - pattern:PRD-######  Custom pattern (# for digits, {COUNTER} for auto-increment)');
  lines.push('  - pattern:user+{COUNTER}@example.com  Email pattern with auto-increment');
  
  const output = lines.join('\n');
  console.log(output);
  return output;
}

/**
 * List available templates
 */
export function listTemplates() {
  const lines = ['\n📋 Available Templates:\n'];
  
  for (const [name, config] of Object.entries(core.templates)) {
    lines.push(`${name}:`);
    lines.push(`  Columns: ${config.columns}`);
    lines.push(`  Default rows: ${config.rows}`);
    lines.push('');
  }
  
  const output = lines.join('\n');
  console.log(output);
  return output;
}
