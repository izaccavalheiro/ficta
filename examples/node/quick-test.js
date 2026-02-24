#!/usr/bin/env node
import { generateAndSave, generateData } from '../../src/node.js';
import { generateSchema } from '../../src/sql-schema.js';
import fs from 'fs';

fs.mkdirSync('output', { recursive: true });

console.log('🚀 Testing SQL schema generation...\n');

try {
  // Test 1: Basic DDL+INSERT (PostgreSQL)
  await generateAndSave({
    columns: 'id:autoIncrement,username,email,active:boolean',
    rows: 5,
    output: 'output/test-schema.sql',
    formatOptions: {
      mode: 'ddl+insert',
      dialect: 'postgres',
      tableName: 'users'
    }
  });
  console.log('✅ Test 1: DDL+INSERT generated (output/test-schema.sql)');

  // Test 2: Batch inserts
  await generateAndSave({
    columns: 'id:autoIncrement,name:product,price',
    rows: 10,
    output: 'output/test-batch.sql',
    formatOptions: {
      mode: 'insert',
      batch: true,
      tableName: 'products'
    }
  });
  console.log('✅ Test 2: Batch inserts generated (output/test-batch.sql)');

  // Test 3: MySQL upsert (using generateSchema directly for full control)
  const productData = generateData({
    columns: 'id:autoIncrement,sku:pattern:PRD-{COUNTER},name:product',
    rows: 3
  });
  
  const upsertSQL = generateSchema({
    table: 'products',
    columns: [
      { name: 'id', type: 'autoIncrement', primaryKey: true },
      { name: 'sku', type: 'pattern:PRD-{COUNTER}', unique: true },
      { name: 'name', type: 'product' }
    ],
    records: productData.records,
    mode: 'upsert',
    dialect: 'mysql'
  });
  
  await fs.promises.writeFile('output/test-upsert.sql', upsertSQL);
  console.log('✅ Test 3: MySQL upsert generated (output/test-upsert.sql)');

  console.log('\n🎉 All tests passed!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
