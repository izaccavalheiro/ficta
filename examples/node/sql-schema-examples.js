/**
 * SQL Schema Generation Examples
 * 
 * This example demonstrates the enhanced SQL schema generation features:
 * - DDL generation with column types and constraints
 * - Multi-table schemas with foreign keys
 * - Different SQL dialects (PostgreSQL, MySQL, SQLite)
 * - Various output modes (insert, ddl, ddl+insert, upsert, truncate+insert)
 * - Batch inserts
 */

import { generateData } from 'ficta';
import { generateSchema } from 'ficta/src/sql-schema.js';
import * as core from 'ficta/src/core.js';
import { faker } from '@faker-js/faker';
import fs from 'fs';

// Initialize Faker
core.setFaker(faker);

console.log('=== SQL Schema Generation Examples ===\n');

// Example 1: Basic DDL Generation
console.log('1. Basic DDL Generation (PostgreSQL)');
console.log('═'.repeat(60));

const basicSchema = {
  table: 'users',
  columns: [
    { name: 'id', type: 'autoIncrement', primaryKey: true },
    { name: 'username', type: 'username', unique: true, nullable: false },
    { name: 'email', type: 'email', nullable: false },
    { name: 'full_name', type: 'fullName' },
    { name: 'active', type: 'boolean', default: true },
    { name: 'created_at', type: 'timestamp', default: 'NOW()' }
  ],
  mode: 'ddl',
  dialect: 'postgres'
};

const basicDDL = generateSchema(basicSchema);
console.log(basicDDL);
console.log('\n');

// Example 2: DDL + INSERT (with sample data)
console.log('2. DDL + INSERT Statements');
console.log('═'.repeat(60));

// Generate sample data
const userData = core.generateData({
  columns: 'id:autoIncrement,username,email,fullName,active:boolean,createdAt:timestamp',
  rows: 5
});

const schemaWithData = {
  table: 'users',
  columns: [
    { name: 'id', type: 'autoIncrement', primaryKey: true },
    { name: 'username', type: 'username' },
    { name: 'email', type: 'email' },
    { name: 'fullName', type: 'fullName' },
    { name: 'active', type: 'boolean' },
    { name: 'createdAt', type: 'timestamp' }
  ],
  records: userData.records,
  mode: 'ddl+insert',
  dialect: 'postgres'
};

const ddlWithInserts = generateSchema(schemaWithData);
console.log(ddlWithInserts);
console.log('\n');

// Example 3: Multi-Table Schema with Foreign Keys
console.log('3. Multi-Table Schema with Foreign Keys');
console.log('═'.repeat(60));

// Generate customers
const customersData = core.generateData({
  columns: 'id:autoIncrement,firstName,lastName,email,phone',
  rows: 3
});

// Generate orders (referencing customers)
const ordersData = core.generateData({
  columns: 'id:autoIncrement,customerId:range:1-3,amount:price,status:enum:pending|shipped|delivered,orderDate:recentDate',
  rows: 8
});

const ecommerceSchema = {
  schema: 'ecommerce',
  dialect: 'postgres',
  mode: 'ddl+insert',
  insertOrder: 'auto', // Automatically resolve FK dependencies
  tables: [
    {
      table: 'customers',
      columns: [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'firstName', type: 'firstName' },
        { name: 'lastName', type: 'lastName' },
        { name: 'email', type: 'email', unique: true, nullable: false },
        { name: 'phone', type: 'phone' }
      ],
      records: customersData.records
    },
    {
      table: 'orders',
      columns: [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { 
          name: 'customerId', 
          type: 'number',
          references: { table: 'customers', column: 'id' },
          onDelete: 'CASCADE',
          nullable: false
        },
        { name: 'amount', type: 'price' },
        { name: 'status', type: 'string' },
        { name: 'orderDate', type: 'pastDate' }
      ],
      records: ordersData.records
    }
  ]
};

const multiTableSchema = generateSchema(ecommerceSchema);
console.log(multiTableSchema);
console.log('\n');

// Example 4: MySQL Dialect
console.log('4. MySQL Dialect with ENUM Types');
console.log('═'.repeat(60));

const mysqlSchema = {
  table: 'employees',
  columns: [
    { name: 'id', type: 'autoIncrement', primaryKey: true },
    { name: 'firstName', type: 'firstName' },
    { name: 'lastName', type: 'lastName' },
    { name: 'department', type: 'enum:Engineering|Sales|Marketing|HR' },
    { name: 'salary', type: 'amount' },
    { name: 'hired_date', type: 'pastDate' }
  ],
  mode: 'ddl',
  dialect: 'mysql'
};

const mysqlDDL = generateSchema(mysqlSchema);
console.log(mysqlDDL);
console.log('\n');

// Example 5: SQLite Dialect
console.log('5. SQLite Dialect (Simplified Types)');
console.log('═'.repeat(60));

const sqliteSchema = {
  table: 'products',
  columns: [
    { name: 'id', type: 'autoIncrement', primaryKey: true },
    { name: 'name', type: 'product' },
    { name: 'price', type: 'price' },
    { name: 'in_stock', type: 'boolean' }
  ],
  mode: 'ddl',
  dialect: 'sqlite'
};

const sqliteDDL = generateSchema(sqliteSchema);
console.log(sqliteDDL);
console.log('\n');

// Example 6: UPSERT Statements (PostgreSQL)
console.log('6. UPSERT Statements (PostgreSQL ON CONFLICT)');
console.log('═'.repeat(60));

const upsertData = [
  { id: 1, username: 'john_doe', email: 'john@example.com' },
  { id: 2, username: 'jane_smith', email: 'jane@example.com' }
];

const upsertSchema = {
  table: 'users',
  columns: [
    { name: 'id', type: 'number', primaryKey: true },
    { name: 'username', type: 'username' },
    { name: 'email', type: 'email' }
  ],
  records: upsertData,
  mode: 'upsert',
  dialect: 'postgres'
};

const upsertSQL = generateSchema(upsertSchema);
console.log(upsertSQL);
console.log('\n');

// Example 7: UPSERT Statements (MySQL)
console.log('7. UPSERT Statements (MySQL ON DUPLICATE KEY)');
console.log('═'.repeat(60));

const mysqlUpsertSchema = {
  ...upsertSchema,
  dialect: 'mysql'
};

const mysqlUpsert = generateSchema(mysqlUpsertSchema);
console.log(mysqlUpsert);
console.log('\n');

// Example 8: Batch Inserts
console.log('8. Batch INSERT Statements (Multiple VALUES)');
console.log('═'.repeat(60));

const batchData = core.generateData({
  columns: 'id:autoIncrement,name:fullName,email',
  rows: 5
});

const batchSchema = {
  table: 'users',
  columns: [
    { name: 'id', type: 'autoIncrement' },
    { name: 'name', type: 'fullName' },
    { name: 'email', type: 'email' }
  ],
  records: batchData.records,
  mode: 'insert',
  batch: true
};

const batchSQL = generateSchema(batchSchema);
console.log(batchSQL);
console.log('\n');

// Example 9: TRUNCATE + INSERT
console.log('9. TRUNCATE + INSERT (Safe Data Reload)');
console.log('═'.repeat(60));

const truncateSchema = {
  table: 'users',
  columns: [
    { name: 'id', type: 'autoIncrement' },
    { name: 'name', type: 'fullName' }
  ],
  records: [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' }
  ],
  mode: 'truncate+insert',
  dialect: 'postgres'
};

const truncateSQL = generateSchema(truncateSchema);
console.log(truncateSQL);
console.log('\n');

// Example 10: Complete E-commerce Database
console.log('10. Complete E-commerce Database Schema');
console.log('═'.repeat(60));

// Generate realistic test data
const customersDataFull = core.generateData({
  columns: 'id:autoIncrement,firstName,lastName,email,phone,street,city,state,zipCode',
  rows: 10
});

const productsData = core.generateData({
  columns: 'id:autoIncrement,name:product,description:productDescription,price:price,stock:range:0-100',
  rows: 20
});

const ordersDataFull = core.generateData({
  columns: 'id:autoIncrement,customerId:range:1-10,totalAmount:price,status:enum:pending|processing|shipped|delivered|cancelled,orderDate:recentDate',
  rows: 30
});

const orderItemsData = core.generateData({
  columns: 'id:autoIncrement,orderId:range:1-30,productId:range:1-20,quantity:range:1-5,price:price',
  rows: 50
});

const fullEcommerceSchema = {
  schema: 'ecommerce',
  dialect: 'postgres',
  mode: 'ddl+insert',
  insertOrder: 'auto',
  tables: [
    {
      table: 'customers',
      columns: [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'firstName', type: 'firstName', nullable: false },
        { name: 'lastName', type: 'lastName', nullable: false },
        { name: 'email', type: 'email', unique: true, nullable: false },
        { name: 'phone', type: 'phone' },
        { name: 'street', type: 'street' },
        { name: 'city', type: 'city' },
        { name: 'state', type: 'state' },
        { name: 'zipCode', type: 'zipCode' }
      ],
      records: customersDataFull.records
    },
    {
      table: 'products',
      columns: [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'name', type: 'product', nullable: false },
        { name: 'description', type: 'productDescription' },
        { name: 'price', type: 'price', nullable: false },
        { name: 'stock', type: 'number', default: 0 }
      ],
      records: productsData.records
    },
    {
      table: 'orders',
      columns: [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        {
          name: 'customerId',
          type: 'number',
          references: { table: 'customers', column: 'id' },
          onDelete: 'CASCADE',
          nullable: false
        },
        { name: 'totalAmount', type: 'price', nullable: false },
        { name: 'status', type: 'string', default: 'pending' },
        { name: 'orderDate', type: 'pastDate', nullable: false }
      ],
      records: ordersDataFull.records
    },
    {
      table: 'order_items',
      columns: [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        {
          name: 'orderId',
          type: 'number',
          references: { table: 'orders', column: 'id' },
          onDelete: 'CASCADE',
          nullable: false
        },
        {
          name: 'productId',
          type: 'number',
          references: { table: 'products', column: 'id' },
          onDelete: 'RESTRICT',
          nullable: false
        },
        { name: 'quantity', type: 'number', nullable: false },
        { name: 'price', type: 'price', nullable: false }
      ],
      records: orderItemsData.records
    }
  ]
};

const fullSchema = generateSchema(fullEcommerceSchema);

// Save to file
fs.writeFileSync('ecommerce-schema.sql', fullSchema);
console.log('✓ Complete schema saved to ecommerce-schema.sql');
console.log(`  - ${customersDataFull.records.length} customers`);
console.log(`  - ${productsData.records.length} products`);
console.log(`  - ${ordersDataFull.records.length} orders`);
console.log(`  - ${orderItemsData.records.length} order items`);
console.log('\nPreview (first 1000 chars):');
console.log(fullSchema.substring(0, 1000) + '...\n');

console.log('\n✅ All SQL schema examples completed!');
