/**
 * Ficta Node.js Basic Usage Example
 * 
 * This example demonstrates how to use Ficta in a Node.js environment
 * to generate test data in various formats.
 */

import { generateData, generateAndSave, listTypes, listTemplates } from 'ficta';

async function main() {
  console.log('=== Ficta Node.js Example ===\n');

  // Example 1: Generate CSV data
  console.log('1. Generating CSV data:');
  const csvData = await generateData({
    columns: 'id:autoIncrement,firstName,lastName,email',
    rows: 5,
    format: 'csv'
  });
  console.log(csvData);
  console.log();

  // Example 2: Generate JSON data
  console.log('2. Generating JSON data:');
  const jsonData = await generateData({
    columns: 'id:autoIncrement,product,price,department',
    rows: 3,
    format: 'json'
  });
  console.log(jsonData);
  console.log();

  // Example 3: Using templates
  console.log('3. Using predefined templates:');
  const usersData = await generateData({
    template: 'users',
    rows: 3,
    format: 'json'
  });
  console.log(usersData);
  console.log();

  // Example 4: Using special types
  console.log('4. Using special types (enum, range, pattern):');
  const specialData = await generateData({
    columns: 'id:autoIncrement,status:enum:active|inactive|pending,score:range:0-100,code:pattern:USER-{COUNTER}',
    rows: 3,
    format: 'json'
  });
  console.log(specialData);
  console.log();

  // Example 5: Save to file
  console.log('5. Saving data to files:');
  
  await generateAndSave({
    template: 'users',
    rows: 100,
    output: 'users.csv'
  });
  console.log('✓ Generated users.csv');

  await generateAndSave({
    template: 'products',
    rows: 50,
    output: 'products.json'
  });
  console.log('✓ Generated products.json');

  await generateAndSave({
    columns: 'id:autoIncrement,name:fullName,email,phone,address:street',
    rows: 25,
    output: 'contacts.xlsx'
  });
  console.log('✓ Generated contacts.xlsx');
  console.log();

  // Example 6: List available types and templates
  console.log('6. Available data types:');
  listTypes();

  console.log('Available templates:');
  listTemplates();
}

main().catch(console.error);
