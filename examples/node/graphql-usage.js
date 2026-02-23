/**
 * Ficta — GraphQL Bridge
 *
 * Run from this directory:
 *   node graphql-usage.js
 *
 * Covers:
 *   - fromGraphQLSDL()        — pure: convert one object type's fields → Ficta column list
 *   - graphQLToFictaSchema()  — pure: convert all object types → ficta.schema.json
 *   - fromGraphQLFile()       — Node.js: read a .graphql/.gql file from disk
 *   - Type mapping: ID → uuid, String → word, Int → number, Float → price,
 *                   Boolean → boolean, DateTime/Date → timestamp,
 *                   EmailAddress → email, URL → url
 *   - Name-hint overrides: fields named email/url/phone/name etc. get correct types
 *   - Enum types → enum: Ficta special type
 *   - Non-Null fields → nullable: false
 *   - List fields are skipped (not representable as flat columns)
 *   - Piping the result into generateFromSchemaFile() to produce SQL
 *
 * CLI equivalents:
 *   ficta from-graphql schema.graphql -o ficta.schema.json
 *   ficta from-graphql schema.graphql --type User --rows 50 --dialect mysql
 */

import { fromGraphQLSDL, graphQLToFictaSchema } from '../../src/graphql-bridge.js';
import { fromGraphQLFile, generateFromSchemaFile, generateAndSave } from '../../src/node.js';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('output', { recursive: true });

// ===========================================================================
// 1. fromGraphQLSDL() — pure function: process a single object type
// ===========================================================================
console.log('=== 1. fromGraphQLSDL() — single object type ===\n');

const basicSDL = `
  type User {
    id:         ID!
    email:      String!
    username:   String
    full_name:  String
    phone:      String
    city:       String
    country:    String
    company:    String
    job_title:  String
    age:        Int
    balance:    Float
    active:     Boolean!
    created_at: String
  }
`;

const userColumns = fromGraphQLSDL(basicSDL, { typeName: 'User' });
console.log('User columns:');
userColumns.forEach(col =>
  console.log(
    `  ${col.name.padEnd(14)} type=${col.type.padEnd(14)} nullable=${col.nullable}`
  )
);
console.log();

// ===========================================================================
// 2. fromGraphQLSDL() — built-in scalar type mapping
// ===========================================================================
console.log('=== 2. Scalar type mapping (ID, Int, Float, Boolean, custom scalars) ===\n');

const scalarSDL = `
  scalar DateTime
  scalar EmailAddress
  scalar URL

  type Event {
    id:           ID
    title:        String
    count:        Int
    score:        Float
    confirmed:    Boolean
    email:        EmailAddress
    website:      URL
    scheduled_at: DateTime
  }
`;

const eventColumns = fromGraphQLSDL(scalarSDL, { typeName: 'Event' });
console.log('Event columns:');
eventColumns.forEach(col =>
  console.log(`  ${col.name.padEnd(14)} → ${col.type}`)
);
console.log();

// ===========================================================================
// 3. fromGraphQLSDL() — enum types
// ===========================================================================
console.log('=== 3. Enum type mapping ===\n');

const enumSDL = `
  enum OrderStatus {
    PENDING
    PROCESSING
    SHIPPED
    DELIVERED
    CANCELLED
  }

  enum PaymentMethod {
    CREDIT_CARD
    DEBIT_CARD
    PAYPAL
    BANK_TRANSFER
  }

  type Order {
    id:             ID!
    customer_email: String!
    total:          Float!
    status:         OrderStatus!
    payment:        PaymentMethod
    placed_at:      String
  }
`;

const orderColumns = fromGraphQLSDL(enumSDL, { typeName: 'Order' });
console.log('Order columns:');
orderColumns.forEach(col =>
  console.log(`  ${col.name.padEnd(16)} → ${col.type}`)
);
console.log();

// ===========================================================================
// 4. fromGraphQLSDL() — list fields are skipped
// ===========================================================================
console.log('=== 4. List fields are skipped ===\n');

const listSDL = `
  type Article {
    id:       ID!
    title:    String!
    body:     String
    tags:     [String]       # list → skipped
    comments: [Comment]      # list of object → skipped
    views:    Int
  }
`;

const articleColumns = fromGraphQLSDL(listSDL, { typeName: 'Article' });
console.log('Article columns (tags and comments are skipped):');
articleColumns.forEach(col =>
  console.log(`  ${col.name.padEnd(10)} → ${col.type}`)
);
console.log();

// ===========================================================================
// 5. graphQLToFictaSchema() — all object types → ficta.schema.json
// ===========================================================================
console.log('=== 5. graphQLToFictaSchema() — full schema conversion ===\n');

const fullSDL = `
  enum PostStatus {
    DRAFT
    PUBLISHED
    ARCHIVED
  }

  type Author {
    id:         ID!
    name:       String!
    email:      String!
    website:    String
    created_at: String
  }

  type Post {
    id:          ID!
    title:       String!
    body:        String
    status:      PostStatus!
    view_count:  Int
    score:       Float
    published:   Boolean!
    created_at:  String
  }

  type Comment {
    id:         ID!
    content:    String!
    approved:   Boolean
    created_at: String
  }
`;

const fullFictaSchema = graphQLToFictaSchema(fullSDL, { rows: 8, dialect: 'postgres' });

console.log('ficta.schema.json structure:');
console.log(JSON.stringify(fullFictaSchema, null, 2));
console.log();

// ===========================================================================
// 6. Write a .graphql file to disk and read it with fromGraphQLFile()
// ===========================================================================
console.log('=== 6. fromGraphQLFile() — read .graphql file from disk ===\n');

const graphqlFilePath = 'output/schema.graphql';
writeFileSync(graphqlFilePath, `
  scalar DateTime

  enum ProductCategory {
    ELECTRONICS
    BOOKS
    CLOTHING
    SPORTS
    HOME
  }

  type Product {
    id:          ID!
    sku:         String!
    name:        String!
    description: String
    price:       Float!
    stock:       Int!
    category:    ProductCategory!
    available:   Boolean!
    created_at:  DateTime
  }

  type Customer {
    id:         ID!
    email:      String!
    first_name: String!
    last_name:  String
    phone:      String
    city:       String
    country:    String
    created_at: DateTime
  }
`.trim());

const schemaFromFile = await fromGraphQLFile(graphqlFilePath, { rows: 10, dialect: 'postgres' });

console.log('Tables found:', schemaFromFile.tables.map(t => t.name).join(', '));
console.log('Product columns:', schemaFromFile.tables.find(t => t.name === 'product').columns.map(c => `${c.name}:${c.type}`).join(', '));
console.log();

// ===========================================================================
// 7. Pipe the result into generateFromSchemaFile() to generate SQL
// ===========================================================================
console.log('=== 7. GraphQL → ficta.schema.json → SQL ===\n');

const schemaJsonPath = 'output/graphql.schema.json';
writeFileSync(schemaJsonPath, JSON.stringify(schemaFromFile, null, 2));

const sql = await generateFromSchemaFile({
  schemaFile: schemaJsonPath,
  outputMode: 'ddl+insert',
  output: 'output/graphql-seed.sql',
});
console.log(`Generated ${sql.split('\n').length} lines of SQL.`);
console.log('Preview:');
console.log(sql.slice(0, 500) + '\n...\n');

// ===========================================================================
// 8. fromGraphQLSDL() defaults to the FIRST object type when typeName omitted
// ===========================================================================
console.log('=== 8. Default: first object type when typeName is omitted ===\n');

const firstTypeSDL = `
  type Vehicle {
    id:    ID!
    make:  String!
    model: String!
    year:  Int
    price: Float
  }
  type Driver {
    id:    ID!
    name:  String!
    email: String
  }
`;

const firstTypeCols = fromGraphQLSDL(firstTypeSDL); // no typeName → uses Vehicle
console.log('First type (Vehicle) columns:');
firstTypeCols.forEach(col =>
  console.log(`  ${col.name.padEnd(8)} → ${col.type}`)
);
console.log();

// Generate CSV directly from those columns
await generateAndSave({
  columns: firstTypeCols.map(c => `${c.name}:${c.type}`).join(','),
  rows: 5,
  output: 'output/vehicles.csv',
});

// ===========================================================================
// 9. CLI reference
// ===========================================================================
console.log('=== 9. CLI equivalents (run from project root) ===\n');
console.log('  # Convert all types in a GraphQL schema file, print to stdout:');
console.log('  node cli.js from-graphql examples/node/output/schema.graphql\n');
console.log('  # Target a specific type, save to disk:');
console.log('  node cli.js from-graphql schema.graphql --type Product -o ficta.schema.json\n');
console.log('  # MySQL dialect, 50 rows:');
console.log('  node cli.js from-graphql schema.graphql --dialect mysql --rows 50\n');

console.log('=== GraphQL bridge examples done ===');
