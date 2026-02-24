/**
 * Simple SQL Schema Generation Example
 * 
 * Quick start guide for generating SQL schemas with Ficta
 */

import { generateAndSave } from 'ficta';
import { mkdirSync } from 'fs';

mkdirSync('output', { recursive: true });

console.log('=== Simple SQL Schema Generation ===\n');

// Example 1: Basic INSERT statements (backward compatible)
console.log('1. Basic INSERT statements');
await generateAndSave({
  columns: 'id:autoIncrement,name:fullName,email',
  rows: 10,
  output: 'output/users-inserts.sql',
  tableName: 'users'
});
console.log('✓ Created output/users-inserts.sql\n');

// Example 2: PostgreSQL schema with DDL
console.log('2. PostgreSQL schema with DDL + INSERT');
await generateAndSave({
  template: 'users',
  rows: 20,
  output: 'output/users-schema-postgres.sql',
  formatOptions: {
    mode: 'ddl+insert',
    dialect: 'postgres',
    tableName: 'users'
  }
});
console.log('✓ Created output/users-schema-postgres.sql\n');

// Example 3: MySQL schema
console.log('3. MySQL schema with DDL');
await generateAndSave({
  columns: 'id:autoIncrement,productName:product,price,category:department,inStock:boolean',
  rows: 15,
  output: 'output/products-mysql.sql',
  formatOptions: {
    mode: 'ddl+insert',
    dialect: 'mysql',
    tableName: 'products'
  }
});
console.log('✓ Created output/products-mysql.sql\n');

// Example 4: SQLite schema
console.log('4. SQLite schema (lightweight)');
await generateAndSave({
  columns: 'id:autoIncrement,title:sentence,content:paragraph,createdAt:timestamp',
  rows: 10,
  output: 'output/posts-sqlite.sql',
  formatOptions: {
    mode: 'ddl+insert',
    dialect: 'sqlite',
    tableName: 'posts'
  }
});
console.log('✓ Created output/posts-sqlite.sql\n');

// Example 5: Batch inserts (more efficient)
console.log('5. Batch INSERT statements');
await generateAndSave({
  columns: 'id:autoIncrement,username,email,active:boolean',
  rows: 100,
  output: 'output/users-batch.sql',
  formatOptions: {
    mode: 'insert',
    batch: true,
    tableName: 'users'
  }
});
console.log('✓ Created output/users-batch.sql with batch inserts\n');

// Example 6: UPSERT statements
console.log('6. UPSERT statements (PostgreSQL)');
await generateAndSave({
  columns: 'id:autoIncrement,sku:pattern:PRD-{COUNTER},name:product,price',
  rows: 10,
  output: 'output/products-upsert.sql',
  formatOptions: {
    mode: 'upsert',
    dialect: 'postgres',
    tableName: 'products',
    conflictColumns: ['id']
  }
});
console.log('✓ Created output/products-upsert.sql\n');

console.log('✅ All SQL files generated successfully!');
console.log('\nCLI equivalents:');
console.log('  ficta -o users.sql -t users -r 20 --sql-mode ddl+insert --sql-dialect postgres');
console.log('  ficta -o products.sql -c "id,name:product,price" -r 50 --sql-mode upsert --sql-dialect mysql');
