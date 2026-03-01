# Architecture

> Technical design guide for Ficta's internals.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Module Map](#2-module-map)
3. [Data Flow Diagrams](#3-data-flow-diagrams)
4. [Core Components In Depth](#4-core-components-in-depth)
5. [Environment Abstraction](#5-environment-abstraction)
6. [Format System](#6-format-system)
7. [Type System](#7-type-system)
8. [SQL Stack](#8-sql-stack)
9. [Extension Mechanisms](#9-extension-mechanisms)
10. [Known Architectural Smells](#10-known-architectural-smells)

---

## 1. Design Principles

| # | Principle | Rationale |
|---|---|---|
| 1 | **Universal core** | `src/core.js` imports nothing at all. Pure JS, runs in Node.js, browsers, and edge runtimes without modification. |
| 2 | **Faker dependency injection** | `setFaker(faker)` / `getFaker()` — initialization is explicit, lazy, and testable. Never access Faker directly. |
| 3 | **Pure functions first** | Core logic has no side effects. I/O and state only at the adapter boundary (`node.js`, `browser.js`, `cli.js`). |
| 4 | **Lazy optional dependencies** | `js-yaml`, `@iarna/toml`, `graphql`, `@inquirer/prompts`, database drivers are dynamically imported on first use. Absent packages produce actionable install messages, not cryptic import errors. |
| 5 | **Silent by default** | No `console.*` anywhere in source. All output is routed through `src/logger.js`. The default logger is a no-op; callers opt in. |
| 6 | **Options objects** | Every exported function accepts a single destructured options object. This keeps the public API stable as new options are added. |
| 7 | **ES Modules only** | `import`/`export` everywhere. No `require`, no `module.exports`, no CommonJS interop shims. |

---

## 2. Module Map

### Full dependency graph (acyclic)

```
Tier 0 — zero imports (pure)
  core.js
  ddl-parser.js
  sql-schema.js
  infer.js
  openapi-bridge.js
  distributions.js
  dependency-maps.js
  formatters.shared.js
  name-hints.js
  logger.js

Tier 1 — depends only on Tier 0
  graphql-bridge.js    ← graphql (lazy npm)
  factory.js           ← core
  wizard.js            ← core, @inquirer/prompts (lazy)
  dependencies.js      ← dependency-maps
  anonymizer.js        ← core, distributions

Tier 2 — depends on Tier 0 + 1
  formatters.js        ← sql-schema, schema-generator, formatters.shared  [Node]
  formatters.browser.js← sql-schema, formatters.shared                    [Browser]
  schema-generator.js  ← ddl-parser, core, sql-schema
  schema-builder.js    ← core, sql-schema, schema-generator
  seeder.js            ← logger, seeders/* (lazy drivers)

Tier 3 — environment adapters
  node.js              ← all of the above
  browser.js           ← core, formatters.browser, ddl-parser, schema-generator,
                         infer, openapi-bridge, graphql-bridge

Tier 4 — executables
  cli.js               ← node.js, wizard (yargs)
```

### Source file responsibility summary

| File | Responsibility | Env |
|---|---|---|
| `core.js` | Column parsing, data generation, type/template registry, plugin API | Universal |
| `formatters.shared.js` | Pure CSV / TSV / JSON utilities, `detectFormat`, `escapeCSV` | Universal |
| `formatters.js` | Excel, XML, YAML, TOML, Parquet, SQL formatting | Node.js |
| `formatters.browser.js` | CSV, JSON, XML, SQL formatting (no heavy deps) | Browser |
| `node.js` | File I/O, streaming, watch mode, DB seeding, OpenAPI/GraphQL file loading, re-exports all of `core.js` | Node.js |
| `browser.js` | Browser adapter; calls `setFaker` at import; exposes `generateData`, `generateAndDownload` | Browser |
| `cli.js` | yargs CLI: parses argv, routes to `node.js` functions, stdin piping, stdout/stderr split | Node.js |
| `ddl-parser.js` | `parseDDL` → `TableDef[]`; `orderByDependencies` topological sort | Universal |
| `sql-schema.js` | `generateDDL`, `generateInserts`, `generateUpserts`, `generateSchema`, `sqlTypeMap` | Universal |
| `schema-generator.js` | Multi-table FK orchestration, `pkStore` for FK sampling, topological ordering | Universal |
| `schema-builder.js` | Fluent `table()` / `schema()` builder returning `toSQL()` | Universal |
| `infer.js` | Infer Ficta column types from sample rows | Universal |
| `openapi-bridge.js` | Convert OpenAPI 3.x object → `ficta.schema.json` | Universal |
| `graphql-bridge.js` | Convert GraphQL SDL → `ficta.schema.json` (async, lazy `graphql`) | Universal |
| `factory.js` | `createFactory` → `build` / `buildMany` / `buildList` test fixtures | Universal |
| `wizard.js` | Interactive guided schema creation (async, lazy `@inquirer/prompts`) | Universal |
| `seeder.js` | `seedDatabase` — delegates to `src/seeders/` with lazy driver loading | Node.js |
| `seeders/postgres.js` | Insert rows via `pg` | Node.js |
| `seeders/mysql.js` | Insert rows via `mysql2` | Node.js |
| `seeders/sqlite.js` | Insert rows via `better-sqlite3` | Node.js |
| `distributions.js` | `sampleUniform`, `sampleNormal`, `sampleExponential`, `sampleZipf`, `sampleFromDistribution` | Universal |
| `dependencies.js` | `resolveDependencyOrder`, `resolveDependentValue`, `autoWireGeographicDependencies` | Universal |
| `dependency-maps.js` | `COUNTRY_STATE_MAP`, `COUNTRY_CITY_MAP`, `BUILT_IN_DEPENDENCY_MAPS` | Universal |
| `anonymizer.js` | `anonymize`, `detectPIIColumns` — PII replacement preserving shape | Universal |
| `logger.js` | `setLogger`, `getLogger`, `resetLogger` — no-op by default | Universal |
| `name-hints.js` | `NAME_HINTS` array, `lookupNameHint(name)` — column-name → type inference | Universal |

---

## 3. Data Flow Diagrams

### Standard generation

```
Input
  │
  ├─ columns string  ──► columnStringToSchema()
  ├─ SchemaColumn[]  ──► (used directly)
  └─ template name   ──► resolve template → columnStringToSchema()
                                │
                                ▼
                         autoWireGeographicDependencies()   [dependencies.js]
                         resolveDependencyOrder()            [dependencies.js]
                                │
                                ▼
                         generateData()  [core.js]
                           for each row:
                             for each independent column: generateValue()
                             for each dependent column:  resolveDependentValue()
                             apply distribution sampling  [distributions.js]
                                │
                                ▼
                         { records, columns, rowCount, columnCount }
                                │
                                ▼
                         formatter  [formatters.js / formatters.browser.js]
                                │
                                ▼
                         File / stdout / Blob download
```

### DDL-driven generation

```
.sql file or DDL string
       │
       ▼
  parseDDL()               [ddl-parser.js]
    → TableDef[]
       │
       ▼
  orderByDependencies()    [ddl-parser.js]
    → TableDef[] (topological order)
       │
       ▼
  generateFromSchema()     [schema-generator.js]
    for each table (parent-first):
      generateData() with pkStore injection for FK columns
      store PK values → pkStore
       │
       ▼
  generateDDL() / generateInserts() / generateUpserts()  [sql-schema.js]
       │
       ▼
  SQL string output
```

---

## 4. Core Components In Depth

### `core.js` — generation pipeline

```
generateData(options)
  │
  ├─ normalize input → SchemaColumn[]
  │    columnStringToSchema  OR  SchemaColumn[] direct  OR  template lookup
  │
  ├─ apply geographic auto-wiring  [dependencies.js]
  ├─ topological sort by 'depends'  [dependencies.js]
  │
  └─ for i in [0..rows):
       generateRow(columns, i+1)
         │
         ├─ independent columns: generateValue(col, i+1, records[i])
         │    1. static:value
         │    2. autoIncrement
         │    3. enum:a|b|c
         │    4. range:min-max
         │    5. pattern:{COUNTER}
         │    6. fakerTypes[type]()
         │    7. literal fallback
         │
         └─ dependent columns: resolveDependentValue(col, row)
              applies distribution sampling if col.distribution is set
```

### `ddl-parser.js` — two-layer type resolution

DDL column type inference runs in order:
1. **Name hint** — `lookupNameHint(columnName)` via `name-hints.js`
2. **SQL type fallback** — map common SQL types (`VARCHAR`, `INT`, `TIMESTAMP`, …) to Ficta equivalents
3. **Enum inference** — if `CHECK (col IN (…))` found, synthesize `enum:val1|val2`
4. **Final fallback** — `word`

### `schema-generator.js` — FK-aware orchestration

```js
pkStore = {}   // { 'tableName.columnName': [generated PK values] }

for each table in topological order:
  for each row:
    for each FK column:
      value = random.pick(pkStore[refTable.refColumn])
    for each PK column:
      pkStore[table.column].push(generatedValue)
```

This guarantees every FK value references an existing PK from the parent table.

---

## 5. Environment Abstraction

### What belongs where

| Code | Location |
|---|---|
| Data generation logic | `src/core.js` (universal) |
| File reads/writes | `src/node.js` only |
| `process.stdout` / `process.stderr` | `cli.js` only |
| DOM / `window` | `src/browser.js` only |
| `fs`, `path`, `stream` | `src/node.js` only |
| `Blob`, `URL.createObjectURL` | `src/browser.js` only |

### Faker initialization

Both adapters initialize Faker immediately at import:

```js
// src/node.js (line ~1)
import { faker } from '@faker-js/faker';
import { setFaker } from './core.js';
setFaker(faker);

// src/browser.js (line ~1)
import { faker } from '@faker-js/faker';
import { setFaker } from './core.js';
setFaker(faker);
```

Tests that import `core.js` directly must call `setFaker(faker)` themselves before generating data.

### Browser bundles

`build.js` uses esbuild to produce:

| Bundle | Format | Description |
|---|---|---|
| `dist/ficta.browser.js` | IIFE | Exposes `window.Ficta` global, full feature set |
| `dist/ficta.browser.min.js` | IIFE | Minified production bundle |
| `dist/ficta.esm.js` | ESM | Tree-shakeable ES module bundle |
| `playground/dist/playground.js` | IIFE | Playground-specific bundle |

---

## 6. Format System

### Three-layer formatter architecture

```
formatters.shared.js   ← pure, zero deps, used by both
       ├── formatters.js          (Node.js: adds Excel, YAML, TOML, Parquet)
       └── formatters.browser.js  (Browser: lightweight versions)
```

### Formatter responsibility split

| Formatter | Shared | Node | Browser |
|---|---|---|---|
| CSV | ✅ `toCSV` | re-exports | re-exports |
| TSV | ✅ `toTSV` | re-exports | re-exports |
| JSON | ✅ `toJSON` | re-exports | re-exports |
| XML | | `toXML` (xml2js) | `toXML` (manual) |
| SQL | | `toSQL` | `toSQL` |
| Excel | | `toExcel` (ExcelJS) | — |
| YAML | | `toYAML` (async, js-yaml) | — |
| TOML | | `toTOML` (async, @iarna/toml) | — |
| Parquet | | `toParquet` (async, parquetjs-lite) | — |

### Adding a new format

1. `src/formatters.js` → `export [async] function toMyFormat(records, columns, opts) { … }`
2. `src/formatters.browser.js` → browser version or feature-stub
3. `src/node.js` → `case 'myformat':` in `generateAndSave` switch
4. `src/browser.js` → `case 'myformat':` in browser switch
5. `cli.js` → add `'myformat'` to `choices` array
6. `tests/formatters.test.js` + `tests/node.test.js` → tests

---

## 7. Type System

### Built-in type registry (`fakerTypes`)

`fakerTypes` in `src/core.js` is a plain object mapping string names to zero-argument generator functions:

```js
export const fakerTypes = {
  email:      () => getFaker().internet.email(),
  fullName:   () => getFaker().person.fullName(),
  uuid:       () => getFaker().string.uuid(),
  price:      () => getFaker().commerce.price(),
  // … 40+ total
};
```

### Special type parsing (evaluated before `fakerTypes`)

| Prefix | Example | How it works |
|---|---|---|
| `static:` | `static:N/A` | Returns literal remainder as string |
| `autoIncrement` | `autoIncrement` | Returns 1-based row index |
| `enum:` | `enum:red\|blue\|green` | `faker.helpers.arrayElement(values)` |
| `range:` | `range:1-100` | Random float in `[min, max]`; optionally distribution-sampled |
| `pattern:` | `pattern:ID-{COUNTER}` | Substitutes `{COUNTER}` with row index |

### Distribution integration

When a column has a `distribution` property, the raw faker/range value is replaced by a distribution sample:

- `enum` columns: distribution rank selects from enum values
- Numeric / range columns: sampled value is clamped to `[min, max]`

```js
{ name: 'score', type: 'range:0-100', distribution: { type: 'normal', mean: 70, stddev: 15 } }
```

### Plugin API guards

`BUILT_IN_TYPES` and `BUILT_IN_TEMPLATES` are frozen `Set`s. `unregisterType` / `unregisterTemplate` throw on built-in names, preventing accidental breakage of core functionality.

---

## 8. SQL Stack

### Three separate responsibilities

```
ddl-parser.js       → parse text DDL into structured objects
schema-generator.js → orchestrate multi-table FK-aware data generation
sql-schema.js       → emit SQL strings (DDL, INSERT, UPSERT)
```

### `TableDef` object shape

```js
{
  tableName: 'posts',
  primaryKey: 'id',
  columns: [
    { name: 'id', sqlType: 'SERIAL', fictaType: 'autoIncrement', nullable: false, autoIncrement: true },
    { name: 'user_id', sqlType: 'INT', fictaType: 'number', nullable: false },
    { name: 'body', sqlType: 'TEXT', fictaType: 'paragraph', nullable: true },
  ],
  foreignKeys: [
    { column: 'user_id', refTable: 'users', refColumn: 'id' }
  ]
}
```

### Output modes

| Mode | Output |
|---|---|
| `insert` | `INSERT INTO …` statements only |
| `upsert` | Dialect-specific upsert (`ON CONFLICT DO UPDATE` / `ON DUPLICATE KEY UPDATE`) |
| `truncate+insert` | `TRUNCATE TABLE …; INSERT INTO …` |
| `ddl+insert` | Full `CREATE TABLE …` DDL + `INSERT INTO …` data |

### Dialect-specific SQL

`sql-schema.js` dispatches on `dialect` (`'postgres'`, `'mysql'`, `'sqlite'`, `'generic'`) for:
- `SERIAL` vs `AUTO_INCREMENT` vs `INTEGER PRIMARY KEY AUTOINCREMENT`
- `ON CONFLICT DO UPDATE` vs `ON DUPLICATE KEY UPDATE`
- Quote character differences
- Type overrides from `sqlTypeMap`

---

## 9. Extension Mechanisms

### Runtime plugin API

```js
import { registerType, registerTemplate } from 'ficta';

// Custom type (zero-arg generator function)
registerType('bitcoinAddress', () => getFaker().finance.bitcoinAddress());

// Custom template
registerTemplate('iot', {
  columns: 'deviceId:uuid,temperature:range:-20-80,humidity:range:0-100,ts:timestamp',
  rows: 500,
});
```

Limitations of the current plugin API:
- Types must be zero-argument generator functions. Parameterized types (like `range:min-max`) require modifying `generateValue()` in `core.js`.
- No lifecycle hooks (pre/post row generation, custom formatters).
- Custom templates are not surfaced in CLI `--template` autocomplete (built-ins only).

### Custom special types

Add prefix handlers in `core.js` → `generateValue()` before the `fakerTypes` lookup:

```js
if (type.startsWith('myprefix:')) {
  return myHandler(type.slice(10), rowIndex);
}
```

---

## 10. Known Architectural Smells

These are documented trade-offs and known issues that warrant attention in future work.

### `node.js` is a God module

At ~600 lines, `src/node.js` imports nearly every other module and serves as both entry point and adapter implementation. It handles file I/O, streaming, watch mode, schema file loading, OpenAPI/GraphQL file loading, database seeding, logging, and re-exports all of `core.js`. This is manageable today but will grow unwieldy. A natural split would be:
- `src/io.js` — file read/write helpers
- `src/watcher.js` — watch mode
- `src/pipeline.js` — `generateAndSave` orchestration

### `toSQL` overload in `formatters.js`

`toSQL()` in `src/formatters.js` has an overloaded first-argument signature: it accepts either a `records` array or a `{ddl, tables}` object. The overload is undocumented in type definitions and does not exist in the browser version, creating an asymmetric API surface.

### Duplicate topological sort

`sql-schema.js` contains a private `resolveTableDependencies()` and `ddl-parser.js` exports `orderByDependencies()`. These operate on slightly different object shapes. The SQL schema sort was made internal in v1.2.0 but the duplication remains.

### `formatters.js` / `formatters.browser.js` SQL duplication

`toSQL()` and `toSQLLegacy()` are nearly verbatim duplicates between the two formatter files (~55 lines). They should be moved to `formatters.shared.js` and re-exported.
