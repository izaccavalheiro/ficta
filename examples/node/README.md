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
| All output formats | CSV, JSON, XML, XLSX, TSV, SQL, YAML, TOML, Parquet |
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

### [infer-usage.js](./infer-usage.js) — Schema inference

| Covered feature | Details |
|----------------|---------|
| `inferSchema()` | Pure function: infer Ficta column types from an array of row objects |
| `inferSchemaFromFile()` | Node.js helper: read a `.csv` or `.json` file and infer its schema |
| Type cascade | name hints → UUID regex → ISO date → email/URL → enum (small set) → numeric → `word` |
| Generating matching data | Use inferred columns to produce synthetic data with the same shape |
| Edge cases | Nulls, mixed types, empty-string values |
| CLI equivalent | `ficta infer data.csv` / `ficta infer data.json --format json` |

```javascript
import { inferSchemaFromFile, generateAndSave } from '../../src/node.js';

const { columns } = await inferSchemaFromFile('./users.csv');
await generateAndSave({ columns, rows: 500, output: 'output/users-synthetic.csv' });
```

---

### [openapi-usage.js](./openapi-usage.js) — OpenAPI / JSON Schema bridge

| Covered feature | Details |
|----------------|---------|
| `fromOpenAPISchema()` | Pure: convert one component schema's properties → Ficta column list |
| `openAPIToFictaSchema()` | Pure: convert ALL component schemas → `ficta.schema.json` |
| `fromOpenAPIFile()` | Node.js: read a `.json` or `.yaml` OpenAPI file from disk |
| Format mapping | `email`, `uri`, `uuid`, `date`, `date-time`, `ipv4`, `password`, `hostname` |
| Enum properties | `enum: [...]` → `enum:val1\|val2\|…` Ficta type |
| `$ref` resolution | One-level-deep `#/components/schemas/…` references resolved |
| Skipped types | Array and nested object properties are intentionally omitted |
| Standalone JSON Schema | Root-level `properties` object (no OpenAPI wrapper) |
| SQL generation | Pipe result into `generateFromSchemaFile()` to produce seed SQL |
| CLI equivalent | `ficta from-openapi api.yaml -o ficta.schema.json` |

```javascript
import { fromOpenAPIFile, generateFromSchemaFile } from '../../src/node.js';
import { writeFileSync } from 'fs';

const schema = await fromOpenAPIFile('./api.yaml', { rows: 50, dialect: 'postgres' });
writeFileSync('ficta.schema.json', JSON.stringify(schema, null, 2));
const sql = await generateFromSchemaFile({ schemaFile: 'ficta.schema.json', outputMode: 'ddl+insert' });
```

---

### [graphql-usage.js](./graphql-usage.js) — GraphQL SDL bridge

| Covered feature | Details |
|----------------|---------|
| `fromGraphQLSDL()` | Pure: convert one GraphQL object type → Ficta column list |
| `graphQLToFictaSchema()` | Pure: convert all object types → `ficta.schema.json` |
| `fromGraphQLFile()` | Node.js: read a `.graphql` or `.gql` file from disk |
| Type mapping | `ID` → uuid, `String` → word, `Int` → number, `Float` → price, `Boolean` → boolean |
| Custom scalars | `EmailAddress` → email, `URL` → url, `DateTime`/`Date` → timestamp |
| Name-hint overrides | Fields named `email`, `phone`, `city`, etc. get semantic types |
| Enum types | GraphQL enum types mapped to `enum:VAL1\|VAL2\|…` |
| Non-null fields | `!` → `nullable: false` in the column definition |
| List fields | Skipped (not representable as flat columns) |
| Default type | First object type selected when `typeName` option is omitted |
| SQL generation | Pipe result into `generateFromSchemaFile()` to produce seed SQL |
| CLI equivalent | `ficta from-graphql schema.graphql --type User -o ficta.schema.json` |

```javascript
import { fromGraphQLFile, generateFromSchemaFile } from '../../src/node.js';
import { writeFileSync } from 'fs';

const schema = await fromGraphQLFile('./schema.graphql', { rows: 20, dialect: 'postgres' });
writeFileSync('ficta.schema.json', JSON.stringify(schema, null, 2));
const sql = await generateFromSchemaFile({ schemaFile: 'ficta.schema.json', outputMode: 'ddl+insert' });
```

---

### [watch-usage.js](./watch-usage.js) — Live schema file watching

| Covered feature | Details |
|----------------|---------|
| `watchAndGenerate()` | Watch a DDL file and re-run `generateFromDDL` on every change |
| `onSuccess` callback | Called with `(outputPath, elapsedMs)` after each successful rebuild |
| `onError` callback | Catches generation failures without crashing the process |
| `debounceMs` option | Collapse rapid consecutive edits into a single rebuild |
| `watcher.stop()` | Cleanly shut down the `fs.watch` listener |
| Complete round-trip | Write schema → start watcher → edit schema → verify rebuild |
| CLI equivalent | `ficta schema schema.sql --watch --output seed.sql` |

```javascript
import { watchAndGenerate } from '../../src/node.js';

const watcher = watchAndGenerate({
  schemaFile: 'schema.sql',
  rows: 10,
  outputMode: 'ddl+insert',
  dialect: 'postgres',
  output: 'seed.sql',
  onSuccess: (path, ms) => console.log(`Rebuilt ${path} in ${ms}ms`),
  onError:   err => console.error('Error:', err.message),
  debounceMs: 300,
});

// Later, to stop watching:
// watcher.stop();
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

| Feature | basic | advanced | stream | plugin | builder | schema-file | ddl | infer | openapi | graphql | watch |
|---------|:-----:|:--------:|:------:|:------:|:-------:|:-----------:|:---:|:-----:|:-------:|:-------:|:-----:|
| Faker types | ✓ | ✓ | | | ✓ | | | | | | |
| Special types | ✓ | ✓ | | | ✓ | | | | | | |
| Templates | ✓ | | ✓ | ✓ | | | | | | | |
| All formats | ✓ | ✓ | | | ✓ | | | | | | |
| Parquet format | ✓ | ✓ | | | | | | | | | |
| `seedFaker` | ✓ | | ✓ | | | | | | | | |
| `setLocale` | ✓ | | ✓ | | | | | | | | |
| `generateStream` | | | ✓ | | | | | | | | |
| `registerType` | | | | ✓ | | | | | | | |
| `registerTemplate` | | | | ✓ | | | | | | | |
| `table()` builder | | ✓ | | | ✓ | | | | | | |
| `schema()` builder | | ✓ | | | ✓ | | | | | | |
| `generateFromSchemaFile` | | | | | | ✓ | | | ✓ | ✓ | |
| `generateFromDDL` | ✓ | ✓ | | | | | ✓ | | | | |
| `generateFromSchema` | | ✓ | | | | | ✓ | | | | |
| `parseDDL` | | ✓ | | | | | ✓ | | | | |
| `buildInsertStatements` | | ✓ | | | | | ✓ | | | | |
| SQL dialects × modes | | ✓ | | | ✓ | ✓ | ✓ | | | | |
| `inferSchema` | | | | | | | | ✓ | | | |
| `inferSchemaFromFile` | | | | | | | | ✓ | | | |
| `fromOpenAPIFile` | | | | | | | | | ✓ | | |
| `openAPIToFictaSchema` | | | | | | | | | ✓ | | |
| `fromGraphQLFile` | | | | | | | | | | ✓ | |
| `graphQLToFictaSchema` | | | | | | | | | | ✓ | |
| `watchAndGenerate` | | | | | | | | | | | ✓ |

## Learn More

- [Main Documentation](../../README.md)
- [AGENTS.md — AI/API reference](../../AGENTS.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
