# Architecture Documentation

> **Deep technical guide to Ficta architecture, design decisions, and implementation details**

## Table of Contents

- [Overview](#overview)
- [Design Principles](#design-principles)
- [Module Architecture](#module-architecture)
- [Data Flow](#data-flow)
- [Core Components](#core-components)
- [Environment Abstraction](#environment-abstraction)
- [Format System](#format-system)
- [Type System](#type-system)
- [Extension Mechanisms](#extension-mechanisms)
- [Performance Considerations](#performance-considerations)
- [Security Considerations](#security-considerations)
- [Future Roadmap](#future-roadmap)

---

## Overview

### Project Goals

1. **Universal Compatibility** - Single codebase for Node.js, browsers, and CLI
2. **Zero Configuration** - Works out of the box with sensible defaults
3. **Format Flexibility** - Support multiple output formats with automatic detection
4. **Type Safety** - Predictable data generation with consistent types
5. **Developer Experience** - Intuitive API for both programmatic and CLI usage

### Architecture Style

- **Functional Core, Imperative Shell** - Pure functions for logic, side effects at boundaries
- **Adapter Pattern** - Environment-specific wrappers around universal core
- **Strategy Pattern** - Pluggable formatters for different output types
- **Factory Pattern** - Dynamic value generation based on type definitions

---

## Design Principles

### 1. Universal Core

**Principle:** Core logic has zero runtime dependencies on Node.js or browser APIs.

**Implementation:**
```javascript
// ✅ GOOD: Universal
function generateRows(columns, count) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push(generateRow(columns, i + 1));
  }
  return rows;
}

// ❌ BAD: Node.js specific
function generateRows(columns, count) {
  const fs = require('fs'); // Node-specific!
  // ...
}
```

**Benefits:**
- Code reuse across environments
- Easier testing (no mocking environment APIs)
- Better separation of concerns

### 2. Lazy Initialization

**Principle:** Defer loading of heavy dependencies until needed.

**Implementation:**
```javascript
let fakerInstance = null;

function getFaker() {
  if (!fakerInstance) {
    throw new Error('Faker.js not initialized');
  }
  return fakerInstance;
}

export function setFaker(faker) {
  fakerInstance = faker;
}
```

**Benefits:**
- Faster initial load times
- Support for custom Faker configurations
- Better testability

### 3. Format Detection

**Principle:** Minimize user configuration through intelligent defaults.

**Implementation:**
```javascript
function detectFormat(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const formatMap = {
    csv: 'csv',
    json: 'json',
    xml: 'xml',
    xlsx: 'xlsx',
    xls: 'xlsx',
    tsv: 'tsv',
    sql: 'sql'
  };
  return formatMap[ext] || 'csv';
}
```

**Benefits:**
- Reduced cognitive load
- Fewer errors from misconfiguration
- Cleaner API

### 4. Pure Functions

**Principle:** Prefer pure functions without side effects.

**Characteristics:**
- Same input → same output (given same Faker seed)
- No mutations of input parameters
- No external state modification

**Example:**
```javascript
// Pure function
function parseColumns(columnString) {
  return columnString.split(',').map(col => {
    const [name, ...typeParts] = col.trim().split(':');
    return { name, type: typeParts.join(':') || name };
  });
}

// Returns new array, doesn't modify input
```

### 5. Options Objects

**Principle:** Use configuration objects instead of positional parameters.

**Rationale:**
- Easier to add new options without breaking API
- Self-documenting code (named parameters)
- Natural defaults through destructuring

**Pattern:**
```javascript
function generateData({
  columns,
  rows = 100,           // Default values
  format = 'csv',
  template,
  ...formatOptions      // Extensible
}) {
  // Implementation
}
```

---

## Module Architecture

### Directory Structure

```
ficta/
├── src/
│   ├── core.js              # Universal core logic
│   ├── formatters.js        # Node.js formatters
│   ├── formatters.browser.js # Browser formatters
│   ├── formatters.shared.js  # Shared pure utilities (CSV, TSV, JSON)
│   ├── node.js              # Node.js adapter + generateFromDDL/Stream/SchemaFile
│   ├── browser.js           # Browser adapter
│   ├── sql-schema.js        # SQL DDL/DML generator (universal)
│   ├── ddl-parser.js        # SQL DDL → TableDef parser (universal, pure)
│   ├── schema-generator.js  # Multi-table FK-aware orchestrator (universal)
│   ├── schema-builder.js    # Fluent table/schema builder API (universal)
│   ├── infer.js             # Schema inference from sample rows (universal)
│   ├── openapi-bridge.js    # OpenAPI/JSON Schema → Ficta columns (universal)
│   └── graphql-bridge.js    # GraphQL SDL → Ficta columns (universal)
├── cli.js                   # CLI interface
├── build.js                 # Build script for bundles
├── ficta-schema.v1.json     # JSON Schema for ficta.schema.json files
├── tests/                   # Test suite (921 tests across 13 suites, 100% coverage)
│   ├── core.test.js
│   ├── formatters.test.js
│   ├── formatters.browser.test.js
│   ├── node.test.js
│   ├── browser.test.js
│   ├── cli.test.js
│   ├── sql-schema.test.js
│   ├── ddl-parser.test.js
│   ├── schema-generator.test.js
│   ├── schema-builder.test.js
│   ├── infer.test.js
│   ├── openapi-bridge.test.js
│   └── graphql-bridge.test.js
└── dist/                    # Built browser bundles
    ├── ficta.browser.js     # IIFE bundle (self-contained)
    ├── ficta.browser.min.js # Minified IIFE bundle (self-contained)
    └── ficta.esm.js         # ES Module bundle
```

### Module Dependency Graph

```
                    ┌─────────────┐
                    │   Faker.js  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐          ┌─────────┤  core.js    ├─────────┐
          │         └─────────────┘         │
          │                                 │
     ┌────┴────┐                       ┌────┴────┐
     │ node.js │                       │browser.js│
     └────┬────┘                       └────┬────┘
          │                                 │
  ┌───────┴───────┐              ┌─────────┴──────────┐
  │ formatters.js  │              │formatters.browser.js│
  └───────┬───────┘              └─────────┬──────────┘
          │                                 │
    ┌─────┴─────┐                    ┌──────┴─────┐
    │  cli.js   │                    │ Web Browser │
    └───────────┘                    └─────────────┘

  SQL layer (universal — used by both node.js and schema-generator.js):

  ┌────────────────────┐   ┌────────────────────┐
  │  ddl-parser.js     │→│ schema-generator.js │→ node.js
  └────────────────────┘   └─────────┬──────────┘
                                           │
                             ┌──────────┴────────┐
                             │  sql-schema.js     │
                             └──────────────────┘
```          ┌─────────┤  core.js    ├─────────┐
          │         └─────────────┘         │
          │                                 │
     ┌────▼────┐                       ┌────▼────┐
     │ node.js │                       │browser.js│
     └────┬────┘                       └────┬────┘
          │                                 │
  ┌───────▼────────┐              ┌─────────▼──────────┐
  │ formatters.js  │              │formatters.browser.js│
  └───────┬────────┘              └─────────┬──────────┘
          │                                 │
    ┌─────▼─────┐                    ┌──────▼──────┐
    │  cli.js   │                    │ Web Browser │
    └───────────┘                    └─────────────┘
```

### Module Responsibilities

#### `core.js` - Universal Core
**Responsibilities:**
- Column parsing
- Data generation logic
- Type system (fakerTypes)
- Template system
- Special type handlers

**Exports:**
- `setFaker(faker)` - Inject Faker instance
- `seedFaker(seed)` - Set deterministic seed
- `setLocale(locale)` - Set Faker locale (e.g. `'fr'`, `'de'`)
- `parseColumns(columnString)` - Parse column definitions
- `generateData(options)` - Generate records (returns `{ records, columns, rowCount }`)
- `registerType(name, fn)` / `unregisterType(name)` - Plugin API
- `registerTemplate(name, config)` / `unregisterTemplate(name)` - Plugin API
- `fakerTypes` object
- `templates` object
- `listTypes()`, `listTemplates()`

**Dependencies:** None (Faker injected via `setFaker`)

#### `formatters.js` - Node.js Formatters
**Responsibilities:**
- Convert data to CSV, JSON, XML, Excel, TSV, SQL, YAML, TOML
- Use full-featured libraries (ExcelJS, xml2js, js-yaml, @iarna/toml)
- Handle file-specific options

**Exports:**
- `toCSV(records, columns)`
- `toJSON(records, pretty)`
- `toXML(records, rootElement, recordElement)`
- `toExcel(records, columns, sheetName)`
- `toTSV(records, columns)`
- `toSQL(records, columns, tableName)`
- `toYAML(records)`
- `toTOML(records)`
- `formatColumnName(name)`

**Dependencies:** ExcelJS, xml2js, js-yaml, @iarna/toml, formatters.shared.js

#### `formatters.shared.js` - Shared Pure Utilities
**Responsibilities:**
- Pure CSV, JSON, TSV formatting (no external dependencies)
- Format detection from file extension
- `formatColumnName` conversion (camelCase → Title Case)
- Shared by both `formatters.js` and `formatters.browser.js`

**Exports:**
- `toCSV(records, columns, options?)` - with `header`, `headerFormat` options
- `toJSON(records, pretty?)`
- `toTSV(records, columns, options?)`
- `detectFormat(filename)`
- `getFileExtension(filename)`
- `formatColumnName(name)`

**Dependencies:** None (pure JS, universal)

#### `formatters.browser.js` - Browser Formatters
**Responsibilities:**
- Lightweight format conversion for browsers
- CSV, JSON, XML, TSV, YAML, TOML (Excel via Blob)
- Minimal dependencies

**Exports:** Same interface as formatters.js

**Dependencies:** None (pure JavaScript)

#### `node.js` - Node.js Adapter
**Responsibilities:**
- Node.js API entry point
- File system operations
- Format detection from filename
- Integrate core + formatters
- DDL file import (`generateFromDDL`)
- JSON schema file import (`generateFromSchemaFile`)
- Streaming data generation (`generateStream`)

**Exports:**
- `generateAndSave(options)` - Generate + save to file (supports `seed`, `locale`, `formatOptions.header`/`headerFormat`)
- `generateFromDDL(options)` - Reads a DDL `.sql` file and writes a seed SQL file
- `generateFromSchemaFile(options)` - Reads a `ficta.schema.json` file and generates SQL
- `generateStream(options)` - Returns a Node.js `Readable` stream (CSV or NDJSON)
- `inferSchemaFromFile(filePath)` - Infer column types from a `.csv` or `.json` file
- `fromOpenAPIFile(filePath, options?)` - Convert OpenAPI YAML/JSON spec to ficta.schema.json object
- `fromGraphQLFile(filePath, options?)` - Convert GraphQL SDL file to ficta.schema.json object
- `watchAndGenerate(options)` - Watch a DDL file and regenerate output on changes
- Re-exports from core (`templates`, `listTypes`, `listTemplates`, etc.)

**Dependencies:** core.js, formatters.js, schema-generator.js, ddl-parser.js, infer.js, openapi-bridge.js, graphql-bridge.js, fs (Node.js built-in)

#### `sql-schema.js` - SQL DDL/DML Generator
**Responsibilities:**
- Generate `CREATE TABLE` DDL statements with column types and constraints
- Generate `INSERT` (individual and batch) and `UPSERT` DML statements
- Map 40+ Faker types to SQL column types across 4 dialects
- Provide legacy `generateSchema()` for object-based schema definitions

**Exports:**
- `sqlTypeMap` - Faker type → SQL type mapping per dialect
- `getSQLType(column, dialect)` - Resolve SQL type for a column
- `generateDDL(tableName, columns, options)` - CREATE TABLE statement
- `generateInserts(tableName, records, columns, options)` - INSERT statements
- `generateUpserts(tableName, records, columns, options)` - UPSERT statements
- `resolveTableDependencies(tables)` - Topological sort (legacy)
- `generateSchema(schema)` - Complete schema generation (multi-table)

**Dependencies:** None (pure JS, universal)

#### `ddl-parser.js` - SQL DDL Parser
**Responsibilities:**
- Parse raw SQL `CREATE TABLE` strings into structured `TableDef` objects
- Two-layer type resolution: column name hints first, SQL type fallback second
- Support inline and table-level `FOREIGN KEY … REFERENCES` syntax
- Handle SQL comments, quoted identifiers, `ENUM`, `AUTO_INCREMENT`, `SERIAL`

**Exports:**
- `parseDDL(ddlString)` - Parse DDL into `Array<TableDef>`
- `orderByDependencies(tables)` - Topological sort (Kahn's algorithm)

**Dependencies:** None (pure JS, universal)

#### `schema-generator.js` - Multi-Table Orchestrator
**Responsibilities:**
- Coordinate multi-table FK-aware data generation from DDL or pre-parsed tables
- Maintain a `pkStore` so child-table FK columns reference real parent PKs
- Assemble the final SQL script (DDL, TRUNCATE, DML in correct order)

**Exports:**
- `generateFromSchema(options)` - Primary entry point returning a SQL string
- `buildInsertStatements(options)` - Pure helper for single-table INSERT/UPSERT

**Dependencies:** core.js, ddl-parser.js, sql-schema.js

#### `schema-builder.js` - Fluent Schema Builder
**Responsibilities:**
- Provide a fluent, code-first API for defining tables and schemas
- Single-table (`table()`) and multi-table (`schema()`) builder patterns
- Generate FK-aware test data via `generateFromSchema` under the hood
- Produce the same SQL output modes as the DDL flow

**Exports:**
- `table(tableName)` → `TableBuilder` (`column()`, `rows()`, `dialect()`, `toSQL()`, `build()`)
- `schema(schemaName)` → `SchemaBuilder` (`table()`, `rows()`, `dialect()`, `toSQL()`, `build()`)

**Import path:** `ficta/schema-builder`

**Dependencies:** core.js, schema-generator.js

#### `infer.js` - Schema Inference
**Responsibilities:**
- Infer Ficta column types from an array of sample data rows
- Apply name-hint lookup cascade, regex detection (UUID, ISO date, email, URL), enum detection, numeric type detection
- Zero Node.js built-ins; works in browser and Node.js

**Exports:**
- `inferSchema(rows)` - Returns `{ columns: string, columnList: Array<{name, type}> }`

**Dependencies:** None (pure JS, universal)

#### `openapi-bridge.js` - OpenAPI Bridge
**Responsibilities:**
- Convert parsed OpenAPI 3.x or JSON Schema objects to ficta.schema.json-compatible format
- Resolve `$ref` references one level deep within component schemas
- Map JSON Schema types/formats to Ficta types

**Exports:**
- `openAPIToFictaSchema(doc, options?)` - Primary conversion function
- `fromOpenAPISchema(doc, options?)` - Alias

**Dependencies:** None (pure JS, universal)

#### `graphql-bridge.js` - GraphQL Bridge
**Responsibilities:**
- Parse GraphQL SDL strings using the `graphql` package
- Map GraphQL object types and scalars to Ficta column definitions
- Handle enum types from SDL

**Exports:**
- `graphQLToFictaSchema(sdl, options?)` - Primary conversion function
- `fromGraphQLSDL(sdl, options?)` - Alias

**Dependencies:** `graphql` npm package (universal)
- Browser API entry point (self-contained: Faker bundled in)
- File downloads via Blob API
- Global `window.Ficta` exposure
- Integrate core + browser formatters
- Mount self-contained interactive UI via `createUI()`

**Exports:**
- `generateData(options)` - Returns formatted string
- `downloadFile(data, filename, format)` - Trigger download
- `generateAndDownload(options)` - Generate + download in one call
- `createUI(containerSelector)` - Mount interactive HTML UI
- Re-exports from core

**Dependencies:** core.js, formatters.browser.js

#### `cli.js` - Command Line Interface
**Responsibilities:**
- Argument parsing with yargs
- User-friendly CLI interface with subcommands: `schema`, `infer`, `from-openapi`, `from-graphql`
- Watch mode (`schema --watch`) via `watchAndGenerate()`
- Preview mode support
- Help documentation

**Exports:** None (executable)

**Dependencies:** node.js, yargs

---

## Data Flow

### High-Level Flow

```
User Input
    ↓
┌───────────────────┐
│  Parse Options    │ ← detectFormat(), resolveTemplate()
└─────────┬─────────┘
          ↓
┌───────────────────┐
│  Parse Columns    │ ← parseColumns()
└─────────┬─────────┘
          ↓
┌───────────────────┐
│ Generate Records  │ ← generateData() (core.js)
└─────────┬─────────┘
          ↓
┌───────────────────┐
│  Format Data      │ ← toCSV(), toJSON(), etc.
└─────────┬─────────┘
          ↓
┌───────────────────┐
│  Output/Save      │ ← fs.writeFile() or Blob download
└───────────────────┘
```

### DDL-Driven Generation Flow

```
DDL String / .sql File
    ↓
parseDDL(ddlString)
    ↓
Array<TableDef>: [{ tableName, columns, primaryKey, foreignKeys }]
    ↓
orderByDependencies(tables)
    ↓
Tables sorted in dependency order (Kahn's topological sort)
    ↓
for each table (in FK-safe order):
    ├─ generateTableData({ tableDef, rows, pkStore })
    │   ├─ FK columns: look up parent PKs from pkStore
    │   ├─ autoIncrement columns: use sequential counter
    │   └─ Other columns: delegate to core.generateRow()
    ├─ storePKValues(tableDef, records, pkStore)
    └─ Push { tableDef, records, ddlCols, insertCols } to results
    ↓
Assemble output (TRUNCATE → DDL → DML) based on outputMode
    ↓
Complete SQL script string
```

**pkStore** is a live map `{ tableName: { colName: value[] } }` that accumulates
primary key values as each parent table is generated, ensuring FK integrity.

### Detailed Flow: generateData() / generateRow()

```javascript
generateData({ columns, rows, ... })
    ↓
  parseColumns(columns)
    ↓
  Loop 1 to rows
    ↓
  For each row: generateRow(parsedColumns, counter)
    ├─ Initialize empty record {}
    ├─ Loop through columns
    │   ├─ Get column type
    │   ├─ Check if special type (autoIncrement, enum, range, pattern)
    │   │   ├─ Yes → Call special handler
    │   │   └─ No → Check fakerTypes mapping
    │   │       ├─ Found → Call faker function
    │   │       └─ Not found → Use type as literal
    │   └─ Assign value to record[column.name]
    └─ Push record to results array
    ↓
  Return results array
```

### Column Parsing Flow

```
"id:autoIncrement,name:fullName,status:enum:active|inactive"
    ↓
  Split by ','
    ↓
["id:autoIncrement", "name:fullName", "status:enum:active|inactive"]
    ↓
  Map each to object
    ↓
[
  { name: "id", type: "autoIncrement" },
  { name: "name", type: "fullName" },
  { name: "status", type: "enum:active|inactive" }
]
```

### Value Generation Flow

```
Column: { name: "age", type: "range:18-65" }
Counter: 5
    ↓
  Check type
    ↓
  Is special type? → "range:*"
    ↓
  YES: Call handleRange()
    ↓
  Parse "18-65" → min=18, max=65
    ↓
  Generate random number between 18 and 65
    ↓
  Return: 42
```

---

## Core Components

### Type System

The type system maps type names to value generators.

#### Standard Types (via Faker)

```javascript
export const fakerTypes = {
  // Direct mapping to Faker functions
  email: () => getFaker().internet.email(),
  fullName: () => getFaker().person.fullName(),
  // ... ~40 more types
};
```

#### Special Types

Special types have custom logic beyond simple Faker calls:

**1. Auto Increment**
```javascript
// Type: "autoIncrement"
function handleAutoIncrement(counter) {
  return counter; // Simple counter
}
```

**2. Enum**
```javascript
// Type: "enum:value1|value2|value3"
function handleEnum(options) {
  const values = options.split('|');
  const index = Math.floor(Math.random() * values.length);
  return values[index];
}
```

**3. Range**
```javascript
// Type: "range:0-100"
function handleRange(options) {
  const [min, max] = options.split('-').map(Number);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
```

**4. Pattern**
```javascript
// Type: "pattern:USER-{COUNTER}"
function handlePattern(options, counter) {
  return options.replace(/{COUNTER}/g, counter);
}
```

### Template System

Templates are named column definition strings:

```javascript
export const templates = {
  users: { columns: "id:autoIncrement,firstName,lastName,email,phone,company,jobTitle,registeredDate:pastDate", rows: 100 },
  products: { columns: "sku:autoIncrement,name:product,category:department,price,stock:number,description:productDescription", rows: 100 },
  // ...
};
```

**Usage:**
```javascript
// Instead of:
generateData({ 
  columns: "id:autoIncrement,firstName,lastName,email,phone,street,city,state,zipCode",
  rows: 100 
});

// Use:
generateData({ 
  template: 'users',
  rows: 100 
});
```

### Format System

Each format has a dedicated formatter function:

```javascript
// CSV Formatter
function toCSV(records, columns) {
  const headers = columns.map(col => formatColumnName(col.name));
  const rows = records.map(record => 
    columns.map(col => escapeCSV(record[col.name])).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// Excel Formatter (Node.js only)
async function toExcel(records, columns, sheetName) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.addRow(columns.map(col => formatColumnName(col.name)));
  records.forEach(record => {
    worksheet.addRow(columns.map(col => record[col.name]));
  });
  return await workbook.xlsx.writeBuffer();
}
```

---

## Environment Abstraction

### Strategy

Use conditional exports and environment detection:

**package.json:**
```json
{
  "exports": {
    ".": {
      "node": "./src/node.js",
      "browser": "./dist/ficta.esm.js",
      "default": "./src/node.js"
    },
    "./browser": "./src/browser.js",
    "./core": "./src/core.js",
    "./node": "./src/node.js",
    "./schema-builder": "./src/schema-builder.js"
  }
}
```

### Node.js Adapter Pattern

```javascript
// src/node.js
import { faker } from '@faker-js/faker';
import { setFaker, generateData } from './core.js';
import { toCSV, toJSON, toXML, toExcel } from './formatters.js';
import fs from 'fs';

// Initialize Faker for Node.js
setFaker(faker);

export async function generateAndSave(options) {
  const data = await generateData(options);
  await fs.promises.writeFile(options.output, data);
}
```

### Browser Adapter Pattern

```javascript
// src/browser.js
import { setFaker, generateData, templates } from './core.js';
import { toCSV, toJSON, toXML } from './formatters.browser.js';

// Faker bundled in — no need to load separately
import { faker } from '@faker-js/faker';
setFaker(faker);

export function downloadFile(data, filename, format) {
  const blob = new Blob([data], { type: getMimeType(format) });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Build System

Browser bundles created with esbuild:

```javascript
// build.js
import * as esbuild from 'esbuild';

// IIFE (self-contained + Faker bundled)
await esbuild.build({
  entryPoints: ['src/browser.js'],
  bundle: true,
  format: 'iife',
  globalName: 'Ficta',
  platform: 'browser',
  target: ['es2020'],
  outfile: 'dist/ficta.browser.js',
});

// Minified IIFE
await esbuild.build({
  entryPoints: ['src/browser.js'],
  bundle: true,
  format: 'iife',
  globalName: 'Ficta',
  platform: 'browser',
  minify: true,
  outfile: 'dist/ficta.browser.min.js',
});

// ES Module for modern browsers
await esbuild.build({
  entryPoints: ['src/browser.js'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: 'dist/ficta.esm.js',
});
```

---

## Format System

### Format Detection

Auto-detect format from file extension:

```javascript
function detectFormat(filename) {
  if (!filename) return 'csv';
  const ext = filename.split('.').pop().toLowerCase();
  const formatMap = {
    csv: 'csv',
    json: 'json',
    xml: 'xml',
    xlsx: 'xlsx',
    xls: 'xlsx',
    tsv: 'tsv',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yml',
    toml: 'toml'
  };
  return formatMap[ext] || 'csv';
}
```

### Format Strategy Pattern

```javascript
async function generateData(options) {
  // ... parse options and generate records
  
  switch (format) {
    case 'csv':
      return toCSV(records, columns);
    case 'json':
      return toJSON(records);
    case 'xml':
      return await toXML(records, options.rootElement, options.recordElement);
    case 'xlsx':
      return await toExcel(records, columns, options.sheetName);
    case 'tsv':
      return toTSV(records, columns);
    case 'sql':
      return toSQL(records, columns, options.tableName);
    case 'yaml':
    case 'yml':
      return toYAML(records);
    case 'toml':
      return toTOML(records);
    default:
      return toCSV(records, columns);
  }
}
```

### CSV Escaping

Proper CSV escaping handling:

```javascript
function escapeCSVValue(value) {
  if (value == null) return '';
  const stringValue = String(value);
  
  // Check if escaping needed
  if (stringValue.includes(',') || 
      stringValue.includes('"') || 
      stringValue.includes('\n') ||
      stringValue.includes('\r')) {
    // Escape quotes by doubling them
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}
```

---

## Type System

### Type Resolution Algorithm

```javascript
function generateValue(column, counter) {
  const type = column.type || column.name;
  
  // 1. Check special types
  if (type === 'autoIncrement') {
    return handleAutoIncrement(counter);
  }
  
  if (type.startsWith('enum:')) {
    return handleEnum(type.substring(5));
  }
  
  if (type.startsWith('range:')) {
    return handleRange(type.substring(6));
  }
  
  if (type.startsWith('pattern:')) {
    return handlePattern(type.substring(8), counter);
  }
  
  // 2. Check fakerTypes mapping
  if (fakerTypes[type]) {
    return fakerTypes[type]();
  }
  
  // 3. Fallback: use type as literal value
  return type;
}
```

### Adding New Types

To add a new type, update `fakerTypes`:

```javascript
export const fakerTypes = {
  // ... existing types
  
  // Add custom type
  ipv6: () => getFaker().internet.ipv6(),
  bitcoinAddress: () => getFaker().finance.bitcoinAddress(),
  userAgent: () => getFaker().internet.userAgent(),
};
```

---

## Extension Mechanisms

### 1. Custom Types via setFaker

```javascript
import { faker } from '@faker-js/faker';
import { setFaker, fakerTypes } from 'ficta';

// Extend fakerTypes
fakerTypes.customType = () => 'custom value';

setFaker(faker);
```

### 2. Custom Formatters

```javascript
import { generateData } from 'ficta';

function toYAML(records) {
  // Custom YAML formatting logic
  return yamlString;
}

const { records } = generateData({ columns: 'id,name,email', rows: 100 });
const yaml = toYAML(records);
```

### 3. Plugin Architecture (Future)

Potential plugin system design:

```javascript
// Future API
import { registerFormatter, registerType } from 'ficta';

registerType('myType', () => 'generated value');
registerFormatter('yaml', (records) => toYAML(records));

await generateAndSave({
  columns: 'id:myType,name',
  rows: 100,
  output: 'data.yaml'
});
```

---

## Performance Considerations

### 1. Memory Usage

**Issue:** Large datasets can consume significant memory.

**Mitigation:**
- Generate in chunks for very large files
- Stream Excel generation using ExcelJS streaming API
- Consider pagination for browser generation

**Example (streaming is preferred for very large files):**
```javascript
import { generateStream } from 'ficta';
import { createWriteStream } from 'fs';

// Use the built-in streaming API for large datasets
const stream = generateStream({
  columns: options.columns,
  rows: options.rows,
  format: 'csv',
  batchSize: 10000
});
stream.pipe(createWriteStream(options.output));
```

### 2. Faker Performance

**Observation:** Faker.js is fast but repeated calls add up.

**Optimization:**
- Cache Faker instance (already done)
- Reuse column definitions
- Consider memoization for deterministic types

### 3. Bundleize

**Browser bundles:**
- UMD bundle: ~100KB minified
- ES Module: ~90KB minified
- Gzipped: ~30KB

**Optimization:**
- Tree-shaking with ES modules
- External Faker (user loads separately)
- Minimal browser formatters

---

## Security Considerations

### 1. CSV Injection

**Risk:** Special characters in CSV can execute in Excel.

**Mitigation:**
```javascript
function sanitizeCSVValue(value) {
  const stringValue = String(value);
  
  // Prevent formula injection
  if (stringValue.startsWith('=') ||
      stringValue.startsWith('+') ||
      stringValue.startsWith('-') ||
      stringValue.startsWith('@')) {
    return `'${stringValue}`; // Prefix with single quote
  }
  
  return escapeCSVValue(value);
}
```

### 2. SQL Injection

**Risk:** Generated SQL could be vulnerable if not using parameterized queries.

**Current:** SQL formatter generates INSERT statements with properly escaped strings.

**Best practice:** Use parameterized queries when executing generated SQL.

### 3. File Path Traversal

**Risk:** User-provided filenames could write outside intended directory.

**Mitigation:**
```javascript
import path from 'path';

function sanitizeFilename(filename) {
  // Remove path separators
  const basename = path.basename(filename);
  // Additional validation
  if (basename.includes('..')) {
    throw new Error('Invalid filename');
  }
  return basename;
}
```

---

## Future Roadmap

### Implemented (as of 2026-02-23)

1. ✅ **SQL Schema Generation** — DDL, foreign keys, 4 dialects, multi-mode output
2. ✅ **DDL Import (Schema Import)** — Parse existing `.sql` schemas, generate FK-aware test data
3. ✅ **Multi-table orchestration** — Topological sort, parent-to-child FK resolution, pkStore
4. ✅ **Streaming API** — CSV and NDJSON streams for large datasets (`generateStream`)
5. ✅ **Plugin System** — `registerType()`, `registerTemplate()`, `unregisterType()`, `unregisterTemplate()`
6. ✅ **Schema Inference** — Auto-detect column types from CSV/JSON files (`inferSchemaFromFile`)
7. ✅ **OpenAPI Bridge** — Convert OpenAPI 3.x / JSON Schema to `ficta.schema.json`
8. ✅ **GraphQL Bridge** — Convert GraphQL SDL to `ficta.schema.json`
9. ✅ **Watch Mode** — Auto-regenerate on DDL file changes (`watchAndGenerate`)
10. ✅ **Parquet Output** — Apache Parquet columnar storage format (Node.js)

### Potential Future Enhancements

1. **Advanced Types**
   - Conditional values based on other column values
   - Computed columns with expressions
   - Cross-field dependencies

2. **Schema Import Extensions**
   - PostgreSQL ENUM type DDL creation
   - Composite primary keys
   - CHECK constraints
   - Index definitions

3. **Performance Optimizations**
   - Worker threads for parallel generation
   - Streaming Excel generation for very large files
   - WebAssembly formatters

4. **Additional Formats**
   - Avro
   - MessagePack
   - Protocol Buffers (protobuf)

5. **Schema Registry**
   - Persist registered custom types/templates across sessions
   - Share type registries between projects

---

## Conclusion

This architecture balances:
- **Simplicity** - Easy to understand and extend
- **Flexibility** - Works in multiple environments
- **Performance** - Efficient for most use cases
- **Maintainability** - Clear separation of concerns

The universal core with environment adapters pattern allows sharing 80% of code while providing environment-specific optimizations where needed.

---

**Last Updated:** 2026-02-23
**Version:** 1.1.8
