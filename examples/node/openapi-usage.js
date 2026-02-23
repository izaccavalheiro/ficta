/**
 * Ficta — OpenAPI Bridge
 *
 * Run from this directory:
 *   node openapi-usage.js
 *
 * Covers:
 *   - fromOpenAPISchema()      — pure: convert parsed OpenAPI doc → Ficta column list
 *   - openAPIToFictaSchema()   — pure: convert all component schemas → ficta.schema.json
 *   - fromOpenAPIFile()        — Node.js: read a .json/.yaml OpenAPI file from disk
 *   - Type mapping: string formats (email, uri, uuid, date, date-time, password, ipv4)
 *   - Enum properties → enum: Ficta special type
 *   - Integer → number, number → price, boolean → boolean
 *   - Skipping array and nested object properties
 *   - $ref resolution (one level deep)
 *   - Piping the ficta.schema.json result into generateFromSchemaFile()
 *   - Writing the result to disk for later use with the CLI
 *
 * CLI equivalents:
 *   ficta from-openapi api.json -o ficta.schema.json
 *   ficta from-openapi api.yaml --schema User --rows 50 --dialect mysql
 */

import { fromOpenAPISchema, openAPIToFictaSchema } from '../../src/openapi-bridge.js';
import { fromOpenAPIFile, generateFromSchemaFile, generateAndSave } from '../../src/node.js';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('output', { recursive: true });

// ===========================================================================
// 1. fromOpenAPISchema() — pure function with an inline OpenAPI document
//    Converts one component schema to Ficta column definitions.
// ===========================================================================
console.log('=== 1. fromOpenAPISchema() — inline document (pure) ===\n');

const inlineDoc = {
  openapi: '3.0.3',
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id:         { type: 'string', format: 'uuid' },
          email:      { type: 'string', format: 'email' },
          username:   { type: 'string' },
          password:   { type: 'string', format: 'password' },
          website:    { type: 'string', format: 'uri' },
          ip_address: { type: 'string', format: 'ipv4' },
          age:        { type: 'integer' },
          balance:    { type: 'number' },
          active:     { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
          birth_date: { type: 'string', format: 'date' },
          role:       { type: 'string', enum: ['admin', 'editor', 'viewer'] },
          // These will be skipped (array and nested object are not flat columns)
          tags:       { type: 'array', items: { type: 'string' } },
          address:    { type: 'object', properties: { city: { type: 'string' } } },
        },
      },
    },
  },
};

const userColumns = fromOpenAPISchema(inlineDoc, { schemaName: 'User' });
console.log('User columns:');
userColumns.forEach(col =>
  console.log(`  ${col.name.padEnd(14)} → ${col.type}`)
);
console.log();

// ===========================================================================
// 2. openAPIToFictaSchema() — pure: convert ALL component schemas at once
//    Returns a ficta.schema.json-compatible object.
// ===========================================================================
console.log('=== 2. openAPIToFictaSchema() — all schemas at once ===\n');

const multiSchemaDoc = {
  openapi: '3.0.3',
  components: {
    schemas: {
      Author: {
        type: 'object',
        properties: {
          id:         { type: 'string', format: 'uuid' },
          full_name:  { type: 'string' },
          email:      { type: 'string', format: 'email' },
        },
      },
      Post: {
        type: 'object',
        properties: {
          id:         { type: 'string', format: 'uuid' },
          title:      { type: 'string' },
          body:       { type: 'string' },
          price:      { type: 'number' },
          views:      { type: 'integer' },
          published:  { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id:   { type: 'integer' },
          name: { type: 'string' },
          slug: { type: 'string' },
        },
      },
    },
  },
};

const fictaSchema = openAPIToFictaSchema(multiSchemaDoc, { rows: 10, dialect: 'postgres' });
console.log('ficta.schema.json structure:');
console.log(JSON.stringify(fictaSchema, null, 2));
console.log();

// ===========================================================================
// 3. $ref resolution — one level deep
// ===========================================================================
console.log('=== 3. $ref resolution (one level deep) ===\n');

const refDoc = {
  openapi: '3.0.3',
  components: {
    schemas: {
      Address: {
        type: 'object',
        properties: {
          street:  { type: 'string' },
          city:    { type: 'string' },
          country: { type: 'string' },
        },
      },
      Contact: {
        type: 'object',
        properties: {
          id:      { type: 'integer' },
          name:    { type: 'string' },
          email:   { type: 'string', format: 'email' },
          // $ref to Address — resolved one level deep; object type → skipped
          address: { $ref: '#/components/schemas/Address' },
        },
      },
    },
  },
};

const contactColumns = fromOpenAPISchema(refDoc, { schemaName: 'Contact' });
console.log('Contact columns (address $ref is an object → skipped):');
contactColumns.forEach(col =>
  console.log(`  ${col.name.padEnd(10)} → ${col.type}`)
);
console.log();

// ===========================================================================
// 4. Write an OpenAPI JSON file to disk and read it with fromOpenAPIFile()
// ===========================================================================
console.log('=== 4. fromOpenAPIFile() — read JSON from disk ===\n');

const apiJsonPath = 'output/api.json';
writeFileSync(
  apiJsonPath,
  JSON.stringify({
    openapi: '3.0.3',
    info: { title: 'Demo API', version: '1.0.0' },
    components: {
      schemas: {
        Product: {
          type: 'object',
          properties: {
            id:           { type: 'string', format: 'uuid' },
            sku:          { type: 'string' },
            name:         { type: 'string' },
            price:        { type: 'number' },
            stock:        { type: 'integer' },
            available:    { type: 'boolean' },
            category:     { type: 'string', enum: ['Electronics', 'Books', 'Clothing', 'Sports'] },
            created_at:   { type: 'string', format: 'date-time' },
          },
        },
        Customer: {
          type: 'object',
          properties: {
            id:         { type: 'string', format: 'uuid' },
            email:      { type: 'string', format: 'email' },
            first_name: { type: 'string' },
            last_name:  { type: 'string' },
            phone:      { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, null, 2)
);

const schemaFromJson = await fromOpenAPIFile(apiJsonPath, { rows: 8, dialect: 'postgres' });

console.log('Tables found:', schemaFromJson.tables.map(t => t.name).join(', '));
console.log('Product columns:', schemaFromJson.tables.find(t => t.name === 'product').columns.map(c => `${c.name}:${c.type}`).join(', '));
console.log();

// ===========================================================================
// 5. Write an OpenAPI YAML file to disk and read it with fromOpenAPIFile()
// ===========================================================================
console.log('=== 5. fromOpenAPIFile() — read YAML from disk ===\n');

const apiYamlPath = 'output/api.yaml';
writeFileSync(apiYamlPath, `
openapi: "3.0.3"
info:
  title: Blog API
  version: "1.0.0"
components:
  schemas:
    BlogPost:
      type: object
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
        content:
          type: string
        published:
          type: boolean
        views:
          type: integer
        rating:
          type: number
        status:
          type: string
          enum: [draft, published, archived]
        created_at:
          type: string
          format: date-time
    Tag:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        slug:
          type: string
`.trim());

const schemaFromYaml = await fromOpenAPIFile(apiYamlPath, { rows: 5, dialect: 'mysql' });

console.log('Tables from YAML:', schemaFromYaml.tables.map(t => t.name).join(', '));
writeFileSync('output/blog-openapi.schema.json', JSON.stringify(schemaFromYaml, null, 2));
console.log('Written output/blog-openapi.schema.json\n');

// ===========================================================================
// 6. Pipe the result directly into generateFromSchemaFile() to produce SQL
// ===========================================================================
console.log('=== 6. OpenAPI → ficta.schema.json → SQL ===\n');

// Save the schema produced in step 4, then generate SQL from it
const schemaPath = 'output/api.schema.json';
writeFileSync(schemaPath, JSON.stringify(schemaFromJson, null, 2));

const sql = await generateFromSchemaFile({
  schemaFile: schemaPath,
  outputMode: 'ddl+insert',
  output: 'output/api-seed.sql',
});
console.log(`Generated ${sql.split('\n').length} lines of SQL.`);
console.log('Preview:');
console.log(sql.slice(0, 500) + '\n...\n');

// ===========================================================================
// 7. Convert a standalone JSON Schema (no OpenAPI wrapper)
// ===========================================================================
console.log('=== 7. Standalone JSON Schema (no OpenAPI wrapper) ===\n');

const standaloneSchema = {
  type: 'object',
  properties: {
    id:       { type: 'integer' },
    name:     { type: 'string' },
    email:    { type: 'string', format: 'email' },
    url:      { type: 'string', format: 'uri' },
    verified: { type: 'boolean' },
    joined:   { type: 'string', format: 'date' },
  },
};

// fromOpenAPISchema understands standalone JSON Schema (root-level properties)
const standaloneColumns = fromOpenAPISchema(standaloneSchema);
console.log('Columns from standalone JSON Schema:');
standaloneColumns.forEach(col =>
  console.log(`  ${col.name.padEnd(12)} → ${col.type}`)
);

// Generate CSV directly from those columns
await generateAndSave({
  columns: standaloneColumns.map(c => `${c.name}:${c.type}`).join(','),
  rows: 5,
  output: 'output/standalone-schema.csv',
});
console.log();

// ===========================================================================
// 8. CLI reference
// ===========================================================================
console.log('=== 8. CLI equivalents (run from project root) ===\n');
console.log('  # Convert OpenAPI JSON to ficta.schema.json, print to stdout:');
console.log('  node cli.js from-openapi examples/node/output/api.json\n');
console.log('  # Convert specific component schema, save to disk:');
console.log('  node cli.js from-openapi api.json --schema Product -o ficta.schema.json\n');
console.log('  # Convert YAML, MySQL dialect, 50 rows:');
console.log('  node cli.js from-openapi examples/node/output/api.yaml --dialect mysql --rows 50\n');

console.log('=== OpenAPI bridge examples done ===');
