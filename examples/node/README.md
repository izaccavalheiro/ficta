# Ficta Node.js Examples

This folder contains runnable Node.js examples that together cover every public
API surface of the Ficta library. All scripts import directly from
`../../src/node.js` — no extra `npm install` is needed when running inside the
repo.

## Quick Start

```bash
cd examples/node
node basic-usage.js
```

---

## Example Files

### [basic-usage.js](./basic-usage.js) — Recommended starting point

| Covered feature | Details |
|----------------|---------|
| All built-in Faker types | `firstName`, `email`, `price`, `uuid`, … |
| Special types | `autoIncrement`, `enum:`, `range:`, `pattern:` (`#` / `{COUNTER}`), `static:` |
| Predefined templates | `users`, `products`, `transactions`, `addresses`, `contacts` |
| All output formats | CSV, JSON, XML, XLSX, TSV, SQL, YAML, TOML |
| `preview: true` | Prints the first 3 rows to the console |
| `seedFaker()` | Reproducible data across runs |
| `setLocale()` | Localised data (`fr`, `de`, …) |
| `generateFromDDL()` | Produce seed data from an existing `.sql` schema file |
| `listTypes()` / `listTemplates()` | Print all available types and templates |

---

### [advanced-usage.js](./advanced-usage.js) — Comprehensive showcase

| Covered feature | Details |
|----------------|---------|
| Large datasets | 1 000-row files in every format |
| Complex column definitions | All special types combined in one realistic schema |
| SQL dialects × modes | `postgres`, `mysql`, `sqlite`, `generic` × `insert`, `upsert`, `truncate+insert`, `ddl+insert` |
| `generateFromDDL()` | FK-aware blog schema (3 related tables) read from disk |
| `generateFromSchema()` | Inline DDL with MySQL upsert |
| `parseDDL()` + `orderByDependencies()` | Inspect parsed table metadata |
| `buildInsertStatements()` | Low-level pure SQL builder for all dialects |
| Schema Builder | Fluent `table()` / `schema()` API examples |

---

### [stream-usage.js](./stream-usage.js) — Streaming large datasets

| Covered feature | Details |
|----------------|---------|
| `generateStream()` CSV | 50 000 rows piped to file without buffering everything in memory |
| `generateStream()` NDJSON | 10 000 rows of newline-delimited JSON |
| Template as column source | `template: 'users'` with streaming |
| `seedFaker()` with streams | Reproducible streamed output |
| Locale-aware streaming | Portuguese data via `setLocale('pt_BR')` |
| `headerFormat: 'raw'` | Suppress Title-Case conversion for CSV headers |
| `header: false` | Emit CSV data rows without a header line |

```javascript
import { generateStream } from '../../src/node.js';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

const stream = generateStream({ columns: 'id:autoIncrement,name:fullName', rows: 100_000, format: 'csv' });
await pipeline(stream, createWriteStream('big.csv'));
```

---

### [plugin-api.js](./plugin-api.js) — Custom types and templates

| Covered feature | Details |
|----------------|---------|
| `registerType()` | Add a custom data type generator function |
| Override guard | Re-registering without `{ override: true }` throws |
| `unregisterType()` | Remove a custom type (built-ins are protected) |
| `registerTemplate()` | Register a domain-specific column preset |
| `unregisterTemplate()` | Remove a custom template (built-ins are protected) |
| Use in `generateData()` | Custom types work in column definitions |
| Use in `generateAndSave()` | Custom templates work with all formats |

```javascript
import { registerType, generateData } from '../../src/core.js';

registerType('hashtag', () => '#' + faker.word.sample());
const result = generateData({ columns: 'id:autoIncrement,tag:hashtag', rows: 5 });
```

---

### [schema-builder-usage.js](./schema-builder-usage.js) — Fluent builder API

| Covered feature | Details |
|----------------|---------|
| `table()` | Single-table fluent builder |
| `schema()` | Multi-table fluent builder |
| `.column(name, type, opts)` | Columns with `primaryKey`, `unique`, `nullable`, `default`, `references` |
| `.rows(n)` | Row count per table |
| `.dialect(d)` | SQL dialect selection |
| `.toSQL(mode)` | All four output modes |
| `.toGenerateOptions()` | Extract options for `generateAndSave()` |
| `.build()` | Inspect the plain object representation |
| All four dialects | `postgres`, `mysql`, `sqlite`, `generic` |
| FK relationships | `references: { table, column }` |

```javascript
import { table, schema } from '../../src/schema-builder.js';

const sql = table('users')
  .dialect('postgres').rows(10)
  .column('id',    'autoIncrement', { primaryKey: true })
  .column('email', 'email',         { unique: true })
  .toSQL('ddl+insert');
```

---

### [schema-file-usage.js](./schema-file-usage.js) — JSON schema files

| Covered feature | Details |
|----------------|---------|
| `generateFromSchemaFile()` | Load a `ficta.schema.json` and generate SQL |
| Column options | `primaryKey`, `nullable`, `notNull`, `default`, `references` |
| Per-table row counts | Each table's `rows` field is honoured |
| Override via `rows:` option | Overrides all per-table counts at call time |
| All output modes | `insert`, `upsert`, `truncate+insert`, `ddl+insert` |
| E-commerce schema | 4 tables, FK relationships, comprehensive options |
| Error handling | Missing file, invalid JSON, empty tables array |

```json
{
  "dialect": "postgres",
  "defaultRows": 10,
  "tables": [
    {
      "name": "users",
      "columns": [
        { "name": "id",    "type": "autoIncrement", "primaryKey": true },
        { "name": "email", "type": "email",         "nullable": false  }
      ]
    }
  ]
}
```

---

### [ddl-usage.js](./ddl-usage.js) — DDL-driven workflow (deep dive)

| Covered feature | Details |
|----------------|---------|
| `parseDDL()` | Inspect column type resolution from name hints + SQL types |
| `orderByDependencies()` | Visualise the topological FK processing order |
| `generateFromSchema()` | All output modes and dialects with a 5-table e-commerce DDL |
| Pre-parsed `TableDef[]` | Pass parsed tables directly to skip string parsing |
| `buildInsertStatements()` | Manual record objects → INSERT/UPSERT for all dialects |
| `generateFromDDL()` | Node.js file reader — reads schema from disk, writes seed file |

---

### [sql-schema-examples.js](./sql-schema-examples.js) — Low-level `generateSchema()` API

| Covered feature | Details |
|----------------|---------|
| `generateSchema()` (DDL) | `CREATE TABLE` statements per dialect |
| DDL + INSERT | Combined schema + data output |
| Multi-table schema objects | FK constraints, `onDelete`, `insertOrder: 'auto'` |
| Batch inserts | Multi-row `VALUES` clauses |
| UPSERT (PostgreSQL / MySQL) | Conflict handling per dialect |
| TRUNCATE + INSERT | Safe data reload |
| Full e-commerce schema | 4 tables — `customers`, `products`, `orders`, `order_items` |

---

### [sql-simple.js](./sql-simple.js) — Quick-start SQL recipes

Minimal, copy-paste-ready snippets using the high-level `generateAndSave()` API.

---

## Special Types Reference

| Syntax | Description | Example |
|--------|-------------|---------|
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

## Feature Coverage Matrix

| Feature | basic | advanced | stream | plugin-api | schema-builder | schema-file | ddl |
|---------|:-----:|:--------:|:------:|:----------:|:--------------:|:-----------:|:---:|
| Faker types | ✓ | ✓ | | | ✓ | | |
| Special types | ✓ | ✓ | | | ✓ | | |
| Templates | ✓ | | ✓ | ✓ | | | |
| All formats | ✓ | ✓ | | | ✓ | | |
| `seedFaker` | ✓ | | ✓ | | | | |
| `setLocale` | ✓ | | ✓ | | | | |
| `generateStream` | | | ✓ | | | | |
| `registerType` | | | | ✓ | | | |
| `registerTemplate` | | | | ✓ | | | |
| `table()` builder | | ✓ | | | ✓ | | |
| `schema()` builder | | ✓ | | | ✓ | | |
| `generateFromSchemaFile` | | | | | | ✓ | |
| `generateFromDDL` | ✓ | ✓ | | | | | ✓ |
| `generateFromSchema` | | ✓ | | | | | ✓ |
| `parseDDL` | | ✓ | | | | | ✓ |
| `buildInsertStatements` | | ✓ | | | | | ✓ |
| SQL dialects × modes | | ✓ | | | ✓ | ✓ | ✓ |

## Learn More

- [Main Documentation](../../README.md)
- [AGENTS.md — AI/API reference](../../AGENTS.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)

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
