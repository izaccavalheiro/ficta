# Ficta Node.js Examples

This folder contains examples of using Ficta in a Node.js environment.

## Setup

All examples import directly from the project root (`../../src/node.js`) so no
additional `npm install` is required when running inside the repo.

```bash
cd examples/node
node basic-usage.js
```

## Examples Included

### [basic-usage.js](./basic-usage.js)
The best starting point. Covers:
- Every built-in Faker data type
- All special types: `autoIncrement`, `enum:`, `range:`, `pattern:` (`#` and `{COUNTER}`), `static:`
- All five predefined templates (`users`, `products`, `transactions`, `addresses`, `contacts`)
- All output formats: CSV, JSON, XML, XLSX, TSV, SQL, YAML, TOML
- `preview: true` — prints a row sample to the console
- `generateFromDDL` — produce seed data from an existing `.sql` schema file
- `listTypes()` / `listTemplates()`

### [advanced-usage.js](./advanced-usage.js)
Comprehensive feature showcase:
- 1 000-row datasets across every format
- Complex realistic column definitions (e-commerce orders with every special type)
- SQL: all four dialects (`postgres`, `mysql`, `sqlite`, `generic`) × all output
  modes (`insert`, `upsert`, `truncate+insert`, `ddl+insert`)
- `generateFromDDL` — FK-aware blog schema with three related tables
- `generateFromSchema` — inline DDL with MySQL upsert
- `parseDDL` + `orderByDependencies` — inspect parsed table metadata
- `buildInsertStatements` — low-level pure SQL builder for all dialects

### [ddl-usage.js](./ddl-usage.js)
Deep-dive into the DDL-driven workflow:
- `parseDDL` — inspect how the parser resolves column types from name hints and SQL types
- `orderByDependencies` — visualise the FK-based processing sequence
- `generateFromSchema` with every output mode and dialect
- Pre-parsed `TableDef[]` passed directly (skipping the DDL string step)
- `buildInsertStatements` with manual records for all four dialects
- `generateFromDDL` — reads a schema from disk and writes a seed file

### [sql-schema-examples.js](./sql-schema-examples.js)
Low-level SQL schema builder using `generateSchema` from `src/sql-schema.js`:
- DDL generation per dialect
- Multi-table schemas with FK constraints
- Batch inserts, UPSERT, TRUNCATE+INSERT
- Complete e-commerce schema (4 tables, FK relationships)

### [sql-simple.js](./sql-simple.js)
Quick-start SQL recipes using the high-level `generateAndSave` API.

## Quick Start

```javascript
import { generateData, generateAndSave, generateFromDDL } from '../../src/node.js';

// Generate CSV data
const csvData = await generateData({
  columns: 'id:autoIncrement,name:fullName,email',
  rows: 100,
  format: 'csv',
});

// Save to file with preview
await generateAndSave({
  template: 'users',
  rows: 1000,
  output: 'users.json',
  preview: true,
});

// Generate seed data from an existing SQL schema
await generateFromDDL({
  schemaFile: './schema.sql',
  rows: 20,
  outputMode: 'ddl+insert',
  dialect: 'postgres',
  output: './seed.sql',
});
```

## Special Types Reference

| Syntax | Description | Example |
|--------|-------------|--------|
| `autoIncrement` | 1, 2, 3, … | `id:autoIncrement` |
| `enum:v1\|v2\|v3` | Random pick | `status:enum:active\|inactive` |
| `range:MIN-MAX` | Random integer | `score:range:0-100` |
| `pattern:PRD-######` | `#` → random digit | `sku:pattern:PRD-######` |
| `pattern:u+{COUNTER}@x.com` | `{COUNTER}` → row index | `email:pattern:u+{COUNTER}@x.com` |
| `static:VALUE` | Fixed value every row | `env:static:production` |

## SQL Output Modes

| Mode | Description |
|------|-------------|
| `insert` | Plain `INSERT INTO … VALUES (…)` |
| `upsert` | Dialect-aware upsert (ON CONFLICT / ON DUPLICATE KEY / INSERT OR REPLACE) |
| `truncate+insert` | `TRUNCATE` in reverse FK order, then `INSERT` |
| `ddl+insert` | `CREATE TABLE` DDL for every table, then inserts |

## SQL Dialects

`postgres` · `mysql` · `sqlite` · `generic`

## Learn More

- [Main Documentation](../../README.md)
- [AGENTS.md — AI/API reference](../../AGENTS.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
