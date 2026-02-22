/**
 * Ficta Node.js Advanced Usage Example
 * 
 * This example demonstrates advanced features like multiple formats,
 * large datasets, and custom column definitions.
 */

import { generateData, generateAndSave } from 'ficta';

async function generateMultipleFormats() {
  console.log('=== Generating Test Data in Multiple Formats ===\n');

  const columns = 'id:autoIncrement,firstName,lastName,email,phone,city,country';
  const rows = 1000;

  console.log('Generating 1000 rows in multiple formats...\n');

  // CSV
  await generateAndSave({
    columns,
    rows,
    output: 'data.csv'
  });
  console.log('✓ CSV: data.csv');

  // JSON
  await generateAndSave({
    columns,
    rows,
    output: 'data.json'
  });
  console.log('✓ JSON: data.json');

  // XML
  await generateAndSave({
    columns,
    rows,
    output: 'data.xml',
    rootElement: 'users',
    recordElement: 'user'
  });
  console.log('✓ XML: data.xml');

  // Excel
  await generateAndSave({
    columns,
    rows,
    output: 'data.xlsx',
    sheetName: 'Users'
  });
  console.log('✓ Excel: data.xlsx');

  // TSV
  await generateAndSave({
    columns,
    rows,
    output: 'data.tsv'
  });
  console.log('✓ TSV: data.tsv');

  // SQL
  await generateAndSave({
    columns,
    rows,
    output: 'data.sql',
    tableName: 'users'
  });
  console.log('✓ SQL: data.sql');

  // YAML
  await generateAndSave({
    columns,
    rows,
    output: 'data.yaml'
  });
  console.log('✓ YAML: data.yaml');

  // TOML
  await generateAndSave({
    columns,
    rows,
    output: 'data.toml'
  });
  console.log('✓ TOML: data.toml');

  console.log('\nAll formats generated successfully!');
}

async function generateComplexData() {
  console.log('\n=== Generating Complex Test Data ===\n');

  // E-commerce orders with complex relationships
  const orderColumns = [
    'orderId:autoIncrement',
    'customerId:number',
    'productName:productName',
    'quantity:range:1-10',
    'unitPrice:price',
    'status:enum:pending|processing|shipped|delivered|cancelled',
    'orderDate:date',
    'trackingCode:pattern:TRK-{COUNTER}',
    'email',
    'phone',
    'shippingAddress:street',
    'city',
    'state',
    'zipCode'
  ].join(',');

  await generateAndSave({
    columns: orderColumns,
    rows: 500,
    output: 'orders.json'
  });
  console.log('✓ Generated complex orders.json with 500 records');

  // User profiles with additional fields
  const profileColumns = [
    'userId:autoIncrement',
    'username:userName',
    'email',
    'firstName',
    'lastName',
    'avatar:avatar',
    'bio:sentence',
    'website:url',
    'company:companyName',
    'jobTitle',
    'phone',
    'street',
    'city',
    'country',
    'timezone:timeZone',
    'accountStatus:enum:active|suspended|pending|inactive',
    'memberSince:date',
    'lastLogin:dateTime'
  ].join(',');

  await generateAndSave({
    columns: profileColumns,
    rows: 200,
    output: 'user-profiles.xlsx',
    sheetName: 'User Profiles'
  });
  console.log('✓ Generated user-profiles.xlsx with 200 records');

  console.log('\nComplex data generation complete!');
}

async function main() {
  try {
    await generateMultipleFormats();
    await generateComplexData();
    
    console.log('\n=== All Examples Completed Successfully ===');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
