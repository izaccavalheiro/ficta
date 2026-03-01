# Ficta — AI & Developer Reference

> **The single authoritative guide for AI assistants, code agents, and contributors working in this codebase.**
>
> Start here. Everything you need is in this document.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Quick Start](#2-quick-start)
3. [Architecture](#3-architecture)
4. [Module Reference](#4-module-reference)
5. [Key Concepts](#5-key-concepts)
6. [Common Tasks](#6-common-tasks)
7. [API Reference](#7-api-reference)
8. [Testing](#8-testing)
9. [Code Patterns & Style](#9-code-patterns--style)
10. [Extension Points](#10-extension-points)
11. [CLI Reference](#11-cli-reference)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Project Overview

**Ficta** is a universal test data generator that runs in Node.js, browsers, and as a CLI. It produces realistic fake data in 9 formats (CSV, JSON, XML, Excel, TSV, SQL, YAML, TOML, Parquet) powered by Faker.js.

| Stat | Value |
|---|---|
| Current version | `1.2.0` |
| Test runner | Vitest |
| Test suite | 1 163 tests across 21 suites |
| Coverage targets | branches ≥ 85 %, functions ≥ 95 %, lines ≥ 85 % |
| Runtime | Node.js 18+ / Modern Browsers |
| Module system | ES Modules only (`import`/`export`) |

### Core capabilities

- **40+ data types** via Faker.js (names, emails, addresses, UUIDs, dates, prices, …)
- **Special types**: `autoIncrement`, `enum:val1|val2`, `range:min-max`, `pattern:{COUNTER}`, `static:value`
- **SQL schema import**: parse `.sql` DDL files and generate referentially-intact INSERT/UPSERT scripts
- **Multi-table FK orchestration**: topological parent-before-child ordering, `pkStore`-backed FK values
- **Schema inference**: auto-detect column types from existing CSV / JSON files
- **OpenAPI + GraphQL bridges**: convert specs to `ficta.schema.json` objects
- **Factory API**: `build()` / `buildMany()` / `buildList()` patterns for test fixtures
- **Statistical distributions**: uniform, normal, exponential, Zipf — applied per column
- **Cross-column geographic dependencies**: city/state auto-wired to country
- **Data anonymization**: replace PII columns in existing datasets while preserving shape
- **Live database seeding**: INSERT generated rows directly into Postgres / MySQL / SQLite
- **Interactive wizard**: guided `ficta.schema.json` scaffolding via CLI prompts
- **UNIX-composable CLI**: data to stdout, status to stderr; `--quiet`, `--json-output`, stdin piping
- **Streaming API**: memory-efficient generation of millions of rows (CSV / NDJSON)
- **Watch mode**: auto-regenerate when DDL files change

---

## 2. Quick Start

```js
// Node.js — generate and save
import { generateAndSave } from 'ficta';
await generateAndSave({ columns: 'id:autoIncrement,name:fullName,email', rows: 100, output: 'users.csv' });

// Node.js — generate from SQL schema
import { generateFromDDL } from 'ficta';
const sql = await generateFromDDL({ schemaFile: './schema.sql', rows: 20, dialect: 'postgres', outputMode: 'ddl+insert' });

// Node.js — factory for test fixtures
import { createFactory } from 'ficta/factory';
const factory = createFactory('id:autoIncrement,name:fullName,email');
const user = factory.build({ name: 'Alice' });
const users = factory.buildMany(10);

// Browser (IIFE bundle — self-contained, no Faker tag needed)
const result = Ficta.generateData({ columns: 'id,name,email', rows: 50, format: 'json' });

// CLI
ficta -t users -r 1000 -o users.xlsx
ficta -c "id:autoIncrement,name:fullName" -r 100 | gzip > data.csv.gz   # stdout pipeline
ficta schema ./schema.sql -o seed.sql --watch                           # watch mode
ficta infer ./data.csv                                                   # infer schema
ficta from-openapi ./openapi.yaml -o ficta.schema.json
ficta from-graphql ./schema.graphql -o ficta.schema.json
ficta init                                                               # interactive wizard
```

---

## 3. Architecture

### Design principles

1. **Universal core** — `src/core.js` has **zero** Node.js or browser imports. All env-specific code lives in adapters.
2. **Faker dependency injection** — Always call `getFaker()`, never access Faker directly. Both adapters call `setFaker(faker)` at import time.
3. **Pure functions first** — Core logic is functional and side-effect free; I/O only at the adapter boundary.
4. **Lazy optional deps** — Heavy / optional packages (`js-yaml`, `@iarna/toml`, `graphql`, `@inquirer/prompts`, database drivers) are dynamically imported on first use and fail with actionable install messages.
5. **Silent by default** — No `console.*` calls. Status is routed through `src/logger.js`. Library consumers configure the logger; the CLI sets it up at startup.
6. **Options objects** — Functions accept a single destructured options object, never positional parameters.
7. **100 % ES Modules** — `import`/`export` everywhere; no `require` / `module.exports`.

### Module dependency graph (acyclic)

```
core.js              ← (zero imports — pure universal core)
ddl-parser.js        ← (zero imports — pure SQL DDL parser)
sql-schema.js        ← (zero imports — DDL/DML string builder)
infer.js             ← (zero imports — schema inference)
openapi-bridge.js    ← (zero imports)
distributions.js     ← (zero imports — statistical samplers)
dependency-maps.js   ← (zero imports — geographic lookup tables)
formatters.shared.js ← (zero imports — CSV/TSV/JSON pure utils)
name-hints.js        ← (zero imports — column-name type rules)
logger.js            ← (zero imports)
graphql-bridge.js    ← graphql (lazy npm)
factory.js           ← core
wizard.js            ← core, @inquirer/prompts (lazy)
dependencies.js      ← dependency-maps
anonymizer.js        ← core, distributions
formatters.js        ← sql-schema, schema-generator, formatters.shared (Node)
formatters.browser.js← sql-schema, formatters.shared (Browser)
schema-generator.js  ← ddl-parser, core, sql-schema
schema-builder.js    ← core, sql-schema, schema-generator
seeder.js            ← logger, seeders/* (lazy drivers)
node.js              ← core, formatters, schema-generator, ddl-parser, sql-schema,
                       infer, openapi-bridge, graphql-bridge, logger, seeder, anonymizer
browser.js           ← core, formatters.browser, ddl-parser, schema-generator,
                       infer, openapi-bridge, graphql-bridge
cli.js               ← node.js, wizard (yargs)
```

### Data flow

**Standard generation:**
```
User input → parseColumns() / columnStringToSchema()
           → generateData()  [core.js]
           → toCSV() / toJSON() / toXML() / … [formatters]
           → File / stdout / download
```

**DDL-driven generation:**
```
.sql file / DDL string
  → parseDDL()              [ddl-parser.js]    Parse CREATE TABLE statements
  → orderByDependencies()   [ddl-parser.js]    Topological FK sort
  → generateFromSchema()    [schema-generator.js]  FK-aware row generation with pkStore
  → generateDDL() / generateInserts() / generateUpserts()  [sql-schema.js]
  → SQL output
```

---

## 4. Module Reference

### `src/core.js` — Universal core

The heart of Ficta. Zero dependencies. Never add Node.js or browser APIs here.

**Exports:**

| Export | Description |
|---|---|
| `setFaker(faker)` | Inject Faker instance (called by both adapters at import) |
| `getFaker()` | Return the current Faker instance (use this, never access `faker` directly) |
| `seedFaker(seed)` | Set deterministic seed |
| `setLocale(locale)` | Set Faker locale (e.g. `'fr'`, `'de'`, `'pt_BR'`) |
| `parseColumns(str)` | Parse `"name:type,name:type"` string → `Array<{name,type}>` |
| `columnStringToSchema(str)` | Parse column string → `SchemaColumn[]` (richer metadata) |
| `schemaToColumnString(schema)` | `SchemaColumn[]` → column string (for backward compat) |
| `generateData(options)` | Generate records → `{records, columns, rowCount, columnCount}` |
| `fakerTypes` | Object mapping type names to generator functions |
| `templates` | Predefined column templates |
| `listTypes()` | List all registered type names |
| `listTemplates()` | List all registered template names |
| `registerType(name, fn)` | Plugin: add custom type |
| `unregisterType(name)` | Plugin: remove custom type (cannot remove built-ins) |
| `registerTemplate(name, config)` | Plugin: add custom template |
| `unregisterTemplate(name)` | Plugin: remove custom template |

**`generateData` options:**

```js
generateData({
  columns: 'id:autoIncrement,name:fullName,email',  // column string
  // OR:
  schema: [ { name: 'id', type: 'autoIncrement', primaryKey: true }, … ],  // SchemaColumn[]
  // OR:
  template: 'users',                                // built-in template name
  rows: 100,                                        // default 100
  seed: 42,                                         // optional Faker seed
  locale: 'fr',                                     // optional Faker locale
})
// Returns: { records, columns: SchemaColumn[], rowCount, columnCount }
```

**`SchemaColumn` typedef:**

```js
/**
 * @typedef {Object} SchemaColumn
 * @property {string} name
 * @property {string} type               — Ficta type, e.g. 'email', 'range:1-100'
 * @property {boolean} [primaryKey]
 * @property {boolean} [nullable]
 * @property {boolean} [unique]
 * @property {string|number|boolean} [default]
 * @property {{table:string, column:string}} [references]  — FK reference
 * @property {string} [sqlType]          — SQL type override
 * @property {Object} [distribution]     — Statistical distribution config
 * @property {Object|false} [depends]    — Cross-column dependency, or false to opt out
 */
```

---

### `src/node.js` — Node.js adapter

The Node.js entry point. Imports everything and adds file I/O, streaming, watch mode.

**Key exports:**

| Export | Description |
|---|---|
| `generateAndSave(options)` | Generate formatted data; save to file or return string |
| `generateFromDDL(options)` | Read `.sql` DDL file → generate data → optional output |
| `generateFromSchemaFile(options)` | Read `ficta.schema.json` → generate SQL |
| `generateStream(options)` | Return Node.js `Readable` stream (CSV or NDJSON) |
| `inferSchemaFromFile(filePath)` | Infer column types from `.csv` or `.json` |
| `fromOpenAPIFile(filePath, opts?)` | Parse OpenAPI YAML/JSON → ficta.schema.json object |
| `fromGraphQLFile(filePath, opts?)` | Parse GraphQL SDL → ficta.schema.json object |
| `watchAndGenerate(options)` | Watch DDL file; regenerate on change. Returns `{stop()}` |
| `seedDatabase(options)` | Insert generated rows into a live database |
| `detectDialect(connectionString)` | `'postgres'|'mysql'|'sqlite'|null` |
| `setLogger(logger)` | Configure output logger |
| `getLogger()` | Get active logger |
| `resetLogger()` | Restore no-op logger |
| Re-exports | All of `core.js` exports |

**`generateAndSave` options:**

```js
generateAndSave({
  columns: 'id:autoIncrement,name:fullName,email',
  rows: 100,
  format: 'csv',        // csv|json|xml|xlsx|tsv|sql|yaml|yml|toml|parquet
  output: 'users.csv',  // omit to return string / buffer
  template: 'users',    // alternative to columns
  preview: false,        // if true, return first 3 rows without saving
  seed: 42,
  locale: 'fr',
  formatOptions: {
    tableName: 'users',      // SQL table name
    rootElement: 'data',     // XML root
    recordElement: 'record', // XML record element
    sheetName: 'Sheet1',     // Excel sheet name
    header: true,            // include CSV/TSV header
    headerFormat: 'title',   // 'title' | 'raw'
    mode: 'insert',          // SQL mode
    dialect: 'postgres',     // SQL dialect
    batch: false,            // SQL batch inserts
    pretty: false,           // JSON pretty print
  }
})
```

**`generateFromDDL` options:**

```js
generateFromDDL({
  schemaFile: './schema.sql',           // required
  rows: 10,                             // rows per table
  outputMode: 'ddl+insert',            // 'insert'|'upsert'|'truncate+insert'|'ddl+insert'
  dialect: 'postgres',                  // 'postgres'|'mysql'|'sqlite'|'generic'
  output: './seed.sql',                 // optional: write to file
  locale: 'fr',
})
```

**`generateStream` options:**

```js
generateStream({
  columns: 'id,name,email',  // or template:
  rows: 100_000,
  format: 'csv',             // 'csv' | 'ndjson'
  batchSize: 500,
  seed: 42,
  locale: 'fr',
})
// Returns Node.js Readable stream
```

**`seedDatabase` options:**

```js
seedDatabase({
  connectionString: 'postgres://user:pass@localhost/db',
  tables: [{ tableName: 'users', columns: 'id:autoIncrement,name:fullName,email', rows: 100 }],
  dialect: 'postgres',   // auto-detected from URL if omitted
})
// Requires peer dep: pg | mysql2 | better-sqlite3
```

---

### `src/factory.js` — Test data factory

Factory pattern for generating consistent test fixtures.

```js
import { createFactory } from 'ficta/factory';

const factory = createFactory('id:autoIncrement,name:fullName,email,score:range:0-100', {
  seed: 42,            // optional deterministic seed
  defaults: { role: 'user' },  // applied to every record
});

factory.build()                          // single record
factory.build({ name: 'Override' })      // with overrides
factory.buildMany(10)                    // 10 records (same overrides)
factory.buildList(5, (rec, i) => ({ index: i }))  // per-record override fn
factory.schema                           // SchemaColumn[] array
```

---

### `src/distributions.js` — Statistical distributions

Pure samplers. All accept an optional `rng` function for deterministic testing.

```js
import { sampleUniform, sampleNormal, sampleExponential, sampleZipf, sampleFromDistribution } from 'ficta/src/distributions.js';

sampleUniform(0, 100)
sampleNormal(60, 10)          // mean=60, stddev=10
sampleExponential(0.5)        // lambda=0.5
sampleZipf(10, 1.2)           // n=10 elements, s=1.2 exponent

// Unified dispatcher (used by generateData internally):
sampleFromDistribution({ type: 'normal', mean: 60, stddev: 10 })
```

Distributions integrate with `generateData` via the `distribution` field on `SchemaColumn`:

```js
generateData({
  schema: [
    { name: 'score', type: 'number', distribution: { type: 'normal', mean: 75, stddev: 10 } },
    { name: 'tier',  type: 'enum:free|pro|enterprise', distribution: { type: 'zipf', n: 3, s: 1.5 } },
  ],
  rows: 1000,
})
```

---

### `src/anonymizer.js` — Data anonymization

Replaces PII columns in existing datasets while preserving data shape.

```js
import { anonymize, detectPIIColumns } from './src/anonymizer.js';
import { setFaker } from './src/core.js';
import { faker } from '@faker-js/faker';

setFaker(faker);

const records = [{ name: 'John Doe', email: 'john@example.com', age: 30 }];
const columns = [{ name: 'name', type: 'fullName' }, { name: 'email', type: 'email' }, { name: 'age', type: 'number' }];

const result = anonymize(records, columns);
// name and email replaced with fake values; age preserved
```

---

### `src/seeder.js` — Live database seeding

```js
import { seedDatabase, detectDialect } from 'ficta';

// Auto-detects dialect from URL
await seedDatabase({
  connectionString: 'postgres://user:pass@localhost:5432/mydb',
  tables: [
    { tableName: 'users',  columns: 'id:autoIncrement,name:fullName,email', rows: 50 },
    { tableName: 'orders', columns: 'id:autoIncrement,userId:number,amount:price', rows: 200 },
  ],
});

// Lazy driver loading — if `pg` is not installed you'll get:
// Error: "pg" is required for Postgres seeding. Install it: npm install pg
```

---

### `src/logger.js` — Centralized logger

Ficta never calls `console.*` directly. All output goes through the logger.

```js
import { setLogger, getLogger, resetLogger } from 'ficta';

// Route to stderr for library use (matches CLI behaviour)
setLogger({
  log:   (...a) => process.stdout.write(a.join(' ') + '\n'),
  info:  (...a) => process.stderr.write(a.join(' ') + '\n'),
  warn:  (...a) => process.stderr.write('[warn] ' + a.join(' ') + '\n'),
  error: (...a) => process.stderr.write('[error] ' + a.join(' ') + '\n'),
});

resetLogger();  // restore no-op (default)
```

---

### `src/schema-builder.js` — Fluent builder API

```js
import { table, schema } from 'ficta/schema-builder';

// Single table
const sql = table('users')
  .dialect('postgres').rows(50)
  .column('id', 'autoIncrement', { primaryKey: true })
  .column('email', 'email', { unique: true })
  .column('score', 'number', { distribution: { type: 'normal', mean: 70, stddev: 15 } })
  .toSQL('ddl+insert');

// Multi-table (FK-aware, topological ordering)
const sql2 = schema('blog')
  .dialect('mysql').rows(20)
  .table('authors', t => t
    .column('id', 'autoIncrement', { primaryKey: true })
    .column('name', 'fullName'))
  .table('posts', t => t
    .column('id', 'autoIncrement', { primaryKey: true })
    .column('author_id', 'number', { references: { table: 'authors', column: 'id' } })
    .column('title', 'sentence'))
  .toSQL('ddl+insert');
```

---

### `src/ddl-parser.js` — SQL DDL parser

Pure module. Zero deps. Converts raw DDL strings into `TableDef` objects.

```js
import { parseDDL, orderByDependencies } from './src/ddl-parser.js';

const tables = parseDDL(`
  CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR(255) NOT NULL);
  CREATE TABLE posts (id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id), title TEXT);
`);
// tables[i] = { tableName, columns, primaryKey, foreignKeys }
// columns[i] = { name, sqlType, fictaType, nullable, autoIncrement, defaultValue, enumValues }

const ordered = orderByDependencies(tables);
// parent tables first; throws on circular FK dependencies
```

---

### `src/schema-generator.js` — Multi-table FK-aware orchestrator

```js
import { generateFromSchema } from './src/schema-generator.js';

const sql = generateFromSchema({
  ddl: rawDDLString,         // mutually exclusive with tables
  // OR:
  tables: parsedTableDefs,   // pre-parsed TableDef[]
  rows: 10,
  outputMode: 'ddl+insert',  // 'insert'|'upsert'|'truncate+insert'|'ddl+insert'
  dialect: 'postgres',
});
```

FK-aware generation: child-table FK columns sample from parent PK values stored in `pkStore`, ensuring referential integrity.

---

### `src/infer.js` — Schema inference

```js
import { inferSchema } from './src/infer.js';
// OR (reads file):
import { inferSchemaFromFile } from './src/node.js';

const { columns, columnList } = inferSchema([
  { id: 1, email: 'a@b.com', joined: '2024-01-15' },
  { id: 2, email: 'c@d.com', joined: '2024-03-22' },
]);
// columns: "id:autoIncrement,email:email,joined:pastDate"
// columnList: [{ name, type }, …]

const result = await inferSchemaFromFile('./users.csv');   // or .json
```

Type cascade: name hints → UUID regex → ISO date → email/URL → small closed set (enum) → numeric → fallback `word`.

---

### `src/openapi-bridge.js` — OpenAPI bridge

```js
import { openAPIToFictaSchema } from './src/openapi-bridge.js';
// OR (reads file):
import { fromOpenAPIFile } from './src/node.js';

const schema = openAPIToFictaSchema(parsedDoc, {
  schemaName: 'User',    // target a specific #/components/schemas/<name>
  rows: 100,
  dialect: 'postgres',
});

const schema2 = await fromOpenAPIFile('./openapi.yaml', { rows: 50 });
```

---

### `src/graphql-bridge.js` — GraphQL bridge

> **Note:** `fromGraphQLSDL` and `graphQLToFictaSchema` are **async** (lazy-load the `graphql` package).

```js
import { graphQLToFictaSchema } from './src/graphql-bridge.js';
// OR (reads file):
import { fromGraphQLFile } from './src/node.js';

const schema = await graphQLToFictaSchema(sdlString, {
  typeName: 'User',   // defaults to first object type
  rows: 100,
  dialect: 'postgres',
});

const schema2 = await fromGraphQLFile('./schema.graphql', { typeName: 'User' });
```

---

### `src/wizard.js` — Interactive wizard

```js
import { runInitWizard, runInteractiveGenerate } from './src/wizard.js';

// Interactive ficta.schema.json builder (uses @inquirer/prompts, lazy)
const schemaObj = await runInitWizard();

// Fill in missing generation options interactively
const opts = await runInteractiveGenerate({ template: 'users' });
```

CLI: `ficta init`

---

### `src/formatters.js` — Node.js formatters

> **Note:** `toYAML()` and `toTOML()` are **async** (lazy-load optional packages).

```js
import { toCSV, toJSON, toXML, toExcel, toTSV, toSQL, toYAML, toTOML } from './src/formatters.js';

const csv  = toCSV(records, columns);
const json = toJSON(records, true);          // pretty=true
const xml  = await toXML(records, 'data', 'item');
const xlsx = await toExcel(records, columns, 'Sheet1');
const tsv  = toTSV(records, columns);
const yaml = await toYAML(records);          // async!
const toml = await toTOML(records);          // async!
const sql  = toSQL(records, columns, { tableName: 'users', dialect: 'postgres', mode: 'insert' });
```

---

## 5. Key Concepts

### Column definition string

```
"name:type,name:type,..."

Examples:
  "id:autoIncrement,firstName,lastName,email"
  "status:enum:active|inactive|pending"
  "score:range:0-100"
  "ref:pattern:REF-{COUNTER}-2024"
  "price:range:1.00-999.99"
```

### Built-in templates

| Template | Columns |
|---|---|
| `users` | id:autoIncrement, firstName, lastName, email, phone, company, jobTitle, registeredDate:pastDate |
| `products` | sku:autoIncrement, name:product, category:department, price, stock:number, description:productDescription |
| `transactions` | id:uuid, date:timestamp, customerId:number, amount, currency, status:word, paymentMethod:word |
| `addresses` | id:autoIncrement, street, city, state, zipCode, country, lat:latitude, lng:longitude |
| `contacts` | id:autoIncrement, fullName, email, phone, company, jobTitle, website:url |

### Type resolution order (per column, per row)

1. **Static**: `static:value` — always returns the literal value
2. **Auto-increment**: `autoIncrement` — 1-based row counter
3. **Enum**: `enum:a|b|c` — random choice
4. **Range**: `range:min-max` — random float in range
5. **Pattern**: `pattern:prefix-{COUNTER}` — string with counter substitution
6. **Cross-column dependency**: if `depends` field set on `SchemaColumn`, resolved after all independent columns
7. **`fakerTypes`** mapping — Faker.js call
8. **Literal fallback** — return the type string as a constant

### Format auto-detection

File extension → format:  `.csv` → `csv`, `.json` → `json`, `.xlsx` → `xlsx`, `.xml` → `xml`, `.sql` → `sql`, `.tsv` → `tsv`, `.yaml`/`.yml` → `yaml`, `.toml` → `toml`, `.parquet` → `parquet`.

---

## 6. Common Tasks

### Add a new Faker data type

```js
// 1. src/core.js → fakerTypes object
export const fakerTypes = {
  // … existing
  ipv6:     () => getFaker().internet.ipv6(),
  timezone: () => getFaker().location.timeZone(),
  btcAddress: () => getFaker().finance.bitcoinAddress(),
};

// 2. tests/core.test.js
test('generates ipv6', () => {
  const { records } = generateData({ columns: 'ip:ipv6', rows: 5 });
  records.forEach(r => expect(r.ip).toBeDefined());
});
```

### Add a new template

```js
// src/core.js → templates object
export const templates = {
  // … existing
  employees: {
    columns: 'id:autoIncrement,firstName,lastName,email,jobTitle,department,phone,hireDate:pastDate',
    rows: 100,
  },
};
```

### Add a new output format

1. `src/formatters.js` → add `toMyFormat(records, columns)` (use `async` + lazy import if needs a package)
2. `src/formatters.browser.js` → add browser version (or stub)
3. `src/node.js` → add `case 'myformat':` to `generateAndSave` switch
4. `src/browser.js` → add `case 'myformat':` to browser `generateData` switch
5. `cli.js` → add `'myformat'` to the `--format` choices array
6. `tests/formatters.test.js` → add tests
7. `tests/node.test.js` → add integration test

### Add a SQL column type mapping

```js
// src/sql-schema.js → sqlTypeMap object
export const sqlTypeMap = {
  // … existing
  myType: { postgres: 'TEXT', mysql: 'VARCHAR(255)', sqlite: 'TEXT', generic: 'VARCHAR(255)' },
};
```

### Generate referentially-intact data from DDL

```js
import { generateFromDDL } from './src/node.js';

const sql = await generateFromDDL({
  schemaFile: './schema.sql',
  rows: 20,
  outputMode: 'ddl+insert',   // 'insert' | 'upsert' | 'truncate+insert' | 'ddl+insert'
  dialect: 'postgres',
  output: './seed.sql',        // optional
  locale: 'fr',
});
```

### Stream large datasets

```js
import { generateStream } from './src/node.js';
import fs from 'fs';

const stream = generateStream({
  columns: 'id:autoIncrement,name:fullName,email',
  rows: 1_000_000,
  format: 'ndjson',  // 'csv' | 'ndjson'
  batchSize: 1000,
});
stream.pipe(fs.createWriteStream('big.ndjson'));
```

### Watch DDL and auto-regenerate

```js
import { watchAndGenerate } from './src/node.js';

const watcher = watchAndGenerate({
  schemaFile: './schema.sql',
  rows: 10,
  outputMode: 'ddl+insert',
  output: './seed.sql',
  onSuccess: (path, ms) => console.error(`Regenerated in ${ms}ms`),
});

// later:
watcher.stop();
```

CLI: `ficta schema ./schema.sql -o seed.sql --watch`

### Infer schema from an existing file

```js
const { columns, columnList } = await inferSchemaFromFile('./users.csv');
// Use inferred columns directly:
await generateAndSave({ columns, rows: 100, output: 'synthetic.csv' });
```

CLI: `ficta infer ./data.csv`

### Use statistical distributions

```js
await generateAndSave({
  schema: [
    { name: 'age',    type: 'range:18-80',              distribution: { type: 'normal', mean: 35, stddev: 10 } },
    { name: 'plan',   type: 'enum:free|pro|enterprise', distribution: { type: 'zipf',   n: 3,    s: 1.5    } },
    { name: 'visits', type: 'number',                   distribution: { type: 'exponential', lambda: 0.1  } },
  ],
  rows: 1000,
  output: 'users.json',
  format: 'json',
});
```

### Anonymize an existing dataset

```js
import { anonymize } from './src/anonymizer.js';
import { setFaker } from './src/core.js';
import { faker } from '@faker-js/faker';

setFaker(faker);

const anonymized = anonymize(productionRecords, columnDefs, {
  preserveDistributions: true,   // keep numeric distributions
  consistentIdentifiers: true,   // same original → same fake (stable mapping)
});
```

### Register a plugin type / template

```js
import { registerType, registerTemplate } from 'ficta';

registerType('hashtag', () => '#' + Math.random().toString(36).slice(2, 8));

registerTemplate('employees', {
  columns: 'id:autoIncrement,firstName,lastName,email,jobTitle,department',
  rows: 50,
});
```

---

## 7. API Reference

### `src/sql-schema.js`

| Export | Description |
|---|---|
| `sqlTypeMap` | Map of 40+ Ficta types → SQL types per dialect |
| `getSQLType(column, dialect)` | Resolve SQL type for a column |
| `generateDDL(tableName, columns, opts)` | `CREATE TABLE` statement |
| `generateInserts(tableName, records, columns, opts)` | `INSERT` statements |
| `generateUpserts(tableName, records, columns, opts)` | `UPSERT` statements (dialect-aware) |
| `generateSchema(schema)` | Complete multi-table schema (DDL + DML) |

### `src/formatters.shared.js`

Shared pure utilities used by both Node.js and browser formatters:
`toCSV`, `toTSV`, `toJSON`, `detectFormat`, `formatColumnName`, `escapeCSV`.

### `src/name-hints.js`

Column-name → type inference rules. Used by `parseDDL` and `inferSchema`.

```js
import { lookupNameHint, NAME_HINTS } from './src/name-hints.js';

lookupNameHint('email_address');  // → 'email'
lookupNameHint('dob');            // → 'pastDate'
```

### `src/dependencies.js`

```js
import { resolveDependencyOrder, resolveDependentValue, autoWireGeographicDependencies } from './src/dependencies.js';

// Add city/state → country dependencies automatically
const wired = autoWireGeographicDependencies(columns);

// Topological sort of columns by `depends` fields
const ordered = resolveDependencyOrder(wired);
```

---

## 8. Testing

### Commands

```bash
npm test                        # Run all tests (vitest run)
npm run test:watch              # Watch mode (vitest)
npm run test:coverage           # Coverage report (vitest --coverage)

# Run specific file:
npx vitest run tests/core.test.js
npx vitest run tests/ddl-parser.test.js
npx vitest run tests/schema-generator.test.js
```

### Test file map

| Test file | What it covers |
|---|---|
| `core.test.js` | Column parsing, generation, templates, special types, plugin API, SchemaColumn, distributions |
| `formatters.test.js` | Node.js formatters (CSV, JSON, XML, Excel, TSV, SQL, YAML, TOML) |
| `formatters.browser.test.js` | Browser formatters |
| `node.test.js` | `generateAndSave`, `generateFromDDL`, `generateFromSchemaFile`, `generateStream`, `watchAndGenerate` |
| `browser.test.js` | Browser adapter |
| `cli.test.js` | CLI subcommands, stdout/stderr routing, `--quiet`, `--json-output`, stdin |
| `sql-schema.test.js` | DDL/DML generation, dialects, upsert modes |
| `ddl-parser.test.js` | `parseDDL`, `orderByDependencies`, edge cases |
| `schema-generator.test.js` | Multi-table FK orchestration, topological ordering |
| `schema-builder.test.js` | Fluent builder API |
| `infer.test.js` | Schema inference from rows |
| `openapi-bridge.test.js` | OpenAPI → Ficta schema |
| `graphql-bridge.test.js` | GraphQL → Ficta schema |
| `factory.test.js` | Factory API (`build`, `buildMany`, `buildList`) |
| `wizard.test.js` | Interactive wizard (template and scratch modes) |
| `seeder.test.js` | Database seeder, dialect detection, lazy drivers |
| `distributions.test.js` | Statistical samplers |
| `dependencies.test.js` | Cross-column dependency resolution |
| `anonymizer.test.js` | PII detection and anonymization |
| `name-hints.test.js` | Column name → type rules |
| `build.test.js` | Browser bundle build artifacts |

### Writing tests

```js
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateData } from '../src/core.js';
import { setLogger, resetLogger } from '../src/node.js';

describe('myModule', () => {
  beforeEach(() => resetLogger());
  afterEach(() => resetLogger());

  test('handles normal case', () => {
    const { records } = generateData({ columns: 'id:autoIncrement,name', rows: 3 });
    expect(records).toHaveLength(3);
    expect(records[0].id).toBe(1);
  });

  test('throws on invalid input', () => {
    expect(() => generateData({})).toThrow('Either columns, schema, or template must be provided');
  });

  test('spies on logger', () => {
    const spy = vi.fn();
    setLogger({ log: spy, info: spy, warn: spy, error: spy });
    // … trigger code that logs
    expect(spy).toHaveBeenCalled();
  });
});
```

> **Do not use `jest.*`** — the project migrated to Vitest. Use `vi.fn()`, `vi.spyOn()`, `vi.clearAllMocks()`, `vi.useFakeTimers()`, etc.

---

## 9. Code Patterns & Style

### Function signatures always use options objects

```js
// ✅ Good
export function myFunction({ param1, param2 = 'default', ...rest }) { }

// ❌ Never
export function myFunction(param1, param2, param3) { }
```

### Error messages include context

```js
// ✅ Good
throw new Error(`Unknown template: "${template}". Available: ${Object.keys(templates).join(', ')}`);

// ❌ Too terse
throw new Error('Invalid template');
```

### CSV escaping

```js
function escapeCSV(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
```

### Lazy optional dependencies

```js
// ✅ Pattern used throughout formatters.js
async function requireDep(pkg) {
  try {
    return await import(pkg);
  } catch {
    throw new Error(`"${pkg}" is required for this operation. Install it: npm install ${pkg}`);
  }
}

export async function toYAML(records) {
  const yaml = await requireDep('js-yaml');
  return yaml.dump(records);
}
```

### Universal modules — forbidden patterns in `src/core.js`

```js
// ❌ Never — breaks browser / universal constraint
import fs from 'fs';
import path from 'path';
console.log('...');          // use logger instead
process.env.FOO              // Node-only
window.xxx                   // browser-only
```

### JSDoc for public functions

```js
/**
 * Brief one-liner.
 * @param {string} columnString - Comma-separated column definitions.
 * @param {Object} [options]
 * @param {number} [options.rows=100]
 * @returns {{ records: Object[], columns: SchemaColumn[], rowCount: number }}
 */
export function generateData({ columns, rows = 100 }) { }
```

---

## 10. Extension Points

### Plugin API (runtime types and templates)

```js
import { registerType, unregisterType, registerTemplate, unregisterTemplate } from 'ficta';

registerType('hashtag', () => '#' + Math.random().toString(36).slice(2, 8));
unregisterType('hashtag');   // cannot unregister built-ins

registerTemplate('iot-sensors', {
  columns: 'deviceId:uuid,temperature:range:-20-80,humidity:range:0-100,timestamp',
  rows: 500,
});
```

### Custom formatters

1. Add `toMyFormat(records, columns)` to `src/formatters.js` (Node) and `src/formatters.browser.js` (browser).
2. Add case to `generateAndSave` switch in `src/node.js`.
3. Add case to browser `generateData` switch in `src/browser.js`.
4. Add `'myformat'` to `cli.js` format choices.

### Custom special types

In `src/core.js` → `generateValue()` function, add before the `fakerTypes` fallback:

```js
if (type.startsWith('weighted:')) {
  return handleWeighted(type.substring(9));
}
```

---

## 11. CLI Reference

```
ficta [options]                         Generate data
ficta schema <file>                     Generate from DDL .sql file
ficta infer <file>                      Infer schema from .csv/.json file
ficta from-openapi <file>               Convert OpenAPI spec to ficta.schema.json
ficta from-graphql <file>               Convert GraphQL SDL to ficta.schema.json
ficta init                              Interactive wizard (requires @inquirer/prompts)

Global options:
  -c, --columns <str>    Column definition string
  -t, --template <name>  Use built-in template
  -r, --rows <n>         Number of rows  [default: 100]
  -f, --format <fmt>     csv|json|xml|xlsx|tsv|sql|yaml|yml|toml|parquet
  -o, --output <file>    Output file (omit to write data to stdout)
  -p, --preview          Print first 3 rows and exit
  -q, --quiet            Suppress all status output (stderr)
      --json-output      Print structured JSON summary to stdout
      --seed <n>         Faker seed (deterministic output)
      --locale <str>     Faker locale (e.g. fr, de, pt_BR)
      --list-types       List all available data types
      --list-templates   List all templates

schema subcommand extra options:
      --outputMode       insert|upsert|truncate+insert|ddl+insert
      --dialect          postgres|mysql|sqlite|generic
      --watch            Watch file and regenerate on change

infer extra options:
      --format           string (column string) | json (JSON array)
```

**UNIX pipeline examples:**

```bash
# Data to stdout, status to stderr — pipe-safe
ficta -c "id:autoIncrement,name:fullName,email" -r 10000 | wc -l

# Compress on the fly
ficta -t users -r 50000 | gzip > users.csv.gz

# Structured JSON summary for scripting
ficta -c "id:autoIncrement,email" -r 100 --json-output | jq '.rowCount'

# Pipe schema.json
cat ficta.schema.json | ficta --format sql > seed.sql

# Pipe raw DDL
cat schema.sql | ficta --format sql --outputMode ddl+insert

# Completely silent
ficta -t users -r 1000 --quiet -o users.csv
```

---

## 12. Troubleshooting

### "Faker.js not initialized"

```js
import { faker } from '@faker-js/faker';
import { setFaker } from 'ficta';
setFaker(faker);  // required before any generation
// Note: both node.js and browser.js do this automatically at import.
```

### "X is required for this operation. Install it: npm install X"

These are lazy-load errors for optional packages: `js-yaml`, `@iarna/toml`, `graphql`, `@inquirer/prompts`, `pg`, `mysql2`, `better-sqlite3`. Install the listed package.

### `toYAML` / `toTOML` / `fromGraphQLSDL` — "not a function" or missing `await`

These are now **async**. Always `await` them:

```js
// ❌ Before (v1.1.x)
const yaml = toYAML(records);

// ✅ After (v1.2.0+)
const yaml = await toYAML(records);
const schema = await fromGraphQLSDL(sdl, { typeName: 'User' });
```

### Console output unexpectedly silent

Ficta uses a no-op logger by default. Configure it:

```js
import { setLogger } from 'ficta';
setLogger({ log: console.log, info: console.info, warn: console.warn, error: console.error });
```

### Tests use `jest.*` APIs

Migrate to Vitest equivalents:

| Jest | Vitest |
|---|---|
| `import { jest } from '@jest/globals'` | `import { vi } from 'vitest'` |
| `jest.fn()` | `vi.fn()` |
| `jest.spyOn(...)` | `vi.spyOn(...)` |
| `jest.clearAllMocks()` | `vi.clearAllMocks()` |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| `jest.advanceTimersByTime(n)` | `vi.advanceTimersByTime(n)` |
| `jest.requireActual(m)` | `vi.importActual(m)` (async) |

### Large Excel files fail

```bash
node --max-old-space-size=4096 your-script.js
```

Or use `generateStream` for large datasets (CSV / NDJSON).

### Circular FK dependencies

`orderByDependencies()` throws `Error: Circular dependency detected: table_a → table_b → table_a`. Break the cycle in your DDL before parsing.

---

## Where to add code — quick map

| What | Where |
|---|---|
| New Faker type | `src/core.js` → `fakerTypes` |
| New template | `src/core.js` → `templates` |
| New special type | `src/core.js` → `generateValue()` |
| New output format (Node) | `src/formatters.js` + `src/node.js` + `cli.js` |
| New output format (Browser) | `src/formatters.browser.js` + `src/browser.js` |
| Shared format util | `src/formatters.shared.js` |
| SQL type mapping | `src/sql-schema.js` → `sqlTypeMap` |
| DDL parsing logic | `src/ddl-parser.js` |
| FK orchestration | `src/schema-generator.js` |
| Fluent schema builder | `src/schema-builder.js` |
| Schema inference logic | `src/infer.js` |
| OpenAPI conversion | `src/openapi-bridge.js` |
| GraphQL conversion | `src/graphql-bridge.js` |
| Factory patterns | `src/factory.js` |
| Statistical distributions | `src/distributions.js` |
| Cross-column dependencies | `src/dependencies.js` / `src/dependency-maps.js` |
| PII anonymization | `src/anonymizer.js` |
| Database seeding | `src/seeder.js` / `src/seeders/` |
| Interactive wizard | `src/wizard.js` |
| Name hint rules | `src/name-hints.js` |
| CLI subcommands | `cli.js` |
| Tests | `tests/[module].test.js` |
