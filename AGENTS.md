# AI Agents Guide - Ficta

> **Comprehensive guide for AI assistants, code generation agents, and LLMs working with this project**

This document provides AI agents with complete context, patterns, and workflows to effectively understand, modify, and extend the Ficta codebase.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Code Organization](#code-organization)
- [Key Concepts](#key-concepts)
- [Common Tasks](#common-tasks)
- [Testing Strategy](#testing-strategy)
- [Code Patterns](#code-patterns)
- [API Reference](#api-reference)
- [Extension Points](#extension-points)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

### Purpose
Universal test data generator that works in Node.js, browsers, and CLI. Generates realistic test data in multiple formats (CSV, JSON, XML, Excel, TSV, SQL, YAML, TOML) using Faker.js.

### Key Features
- **Universal**: Node.js, browser, and CLI support
- **Multi-format**: CSV, JSON, XML, XLSX, TSV, SQL, YAML, TOML output
- **40+ data types**: Powered by Faker.js
- **Smart detection**: Format auto-detection from file extension
- **Templates**: Predefined schemas (users, products, transactions)
- **Special types**: auto-increment, enums, ranges, patterns with counters
- **SQL Schema Generation**: DDL, foreign keys, 4 dialects (PostgreSQL, MySQL, SQLite, generic)
- **DDL Import**: Parse existing `.sql` schema files and generate FK-aware test data
- **Multi-table orchestration**: Topological FK ordering, parent-to-child generation

### Tech Stack
- **Language**: JavaScript (ES Modules)
- **Runtime**: Node.js 18+ / Modern Browsers
- **Dependencies**:
  - `@faker-js/faker` - Test data generation
  - `exceljs` - Excel file generation
  - `xml2js` - XML parsing/building
  - `js-yaml` - YAML formatting
  - `@iarna/toml` - TOML formatting
  - `yargs` - CLI argument parsing
- **Build**: esbuild (browser bundles)
- **Testing**: Jest — 737 tests, 100% overall coverage

---

## 🏗️ Architecture

### Module Structure

```
ficta/
├── src/
│   ├── core.js              # Core generation logic (universal — no env deps)
│   ├── formatters.js        # Format converters (Node.js)
│   ├── formatters.browser.js # Format converters (browser)
│   ├── formatters.shared.js  # Shared pure format utilities (CSV, TSV, JSON)
│   ├── node.js              # Node.js entry point + generateFromDDL/Stream/SchemaFile
│   ├── browser.js           # Browser entry point
│   ├── sql-schema.js        # SQL DDL/DML generator with dialect support (universal)
│   ├── ddl-parser.js        # SQL DDL → TableDef parser (universal, pure)
│   ├── schema-generator.js  # Multi-table FK-aware data orchestrator (universal)
│   └── schema-builder.js    # Fluent table/schema builder API (universal)
├── cli.js                   # CLI entry point
├── tests/                   # Test files (737 tests, 100% coverage)
│   ├── sql-schema.test.js   # SQL schema generator tests
│   ├── ddl-parser.test.js   # DDL parser tests
│   ├── schema-generator.test.js # Orchestrator tests
│   └── schema-builder.test.js   # Fluent builder tests
├── examples/                # Usage examples
│   ├── sql-schema.html      # Interactive browser SQL demo
│   └── node/
│       ├── sql-simple.js          # Basic SQL examples
│       └── sql-schema-examples.js # Advanced multi-table examples
└── dist/                    # Built browser bundles
```

### Design Principles

1. **Universal Core**: `core.js` has NO Node.js or browser-specific dependencies
2. **Environment Adapters**: `node.js` and `browser.js` wrap core with environment-specific features
3. **Format Separation**: Formatters are separate for Node.js (using full libs) and browser (using minimal implementations)
4. **Lazy Initialization**: Faker is lazily loaded to support different environments
5. **Pure Functions**: Most functions are pure, making testing straightforward

### Data Flow

**Standard generation (column definitions):**
```
User Input → Parse Columns → Generate Rows → Format Data → Output
     ↓            ↓               ↓              ↓           ↓
   CLI/API   parseColumns()  generateData()  toCSV()   Save/Download
              Template          Faker.js      toJSON()
              Resolution        Special       toXML()
                               Types         toExcel()
                                              toYAML()
                                              toTOML()
                                              toSQL()
```

**DDL-driven generation (schema import):**
```
DDL String / .sql File
     ↓
parseDDL()          — extracts tables, columns, PKs, FKs
     ↓
orderByDependencies() — topological sort (FK order)
     ↓
generateTableData()   — FK-aware row generation with pkStore
     ↓
generateDDL() / generateInserts() / generateUpserts()
     ↓
Complete SQL script
```

---

## 📁 Code Organization

### Core Module (`src/core.js`)

**Exports:**
- `setFaker(faker)` - Set Faker instance
- `seedFaker(seed)` - Set deterministic seed
- `setLocale(locale)` - Set Faker locale
- `fakerTypes` - Object mapping type names to generators
- `templates` - Predefined column templates
- `parseColumns(columnString)` - Parse column definitions
- `generateData(options)` - Generate records ({ records, columns, rowCount })
- `registerType(name, fn)` / `unregisterType(name)` - Plugin API
- `registerTemplate(name, config)` / `unregisterTemplate(name)` - Plugin API
- `listTypes()` - List all available types
- `listTemplates()` - List all templates

**Key Functions:**
```javascript
// Parse "id:autoIncrement,name:fullName,email" → column objects
parseColumns(columnString) → Array<{name, type, options}>

// Generate records
generateData({ columns, rows, template?, seed?, locale? }) → { records, columns, rowCount }

// Special type handlers
handleAutoIncrement(counter) → number
handleEnum(options) → string
handleRange(options) → number
handlePattern(options, counter) → string
```

### Node.js Module (`src/node.js`)

**Exports:**
- `generateData(options)` - Generate data in specified format
- `generateAndSave(options)` - Generate and save to file
- `generateFromDDL(options)` - Read a `.sql` file, generate test data, optionally save
- `listTypes()` - Export from core
- `listTemplates()` - Export from core
- `templates` - Export from core

**`generateFromDDL` options:**
```javascript
{
  schemaFile: string,   // Required: path to DDL .sql file
  rows: number,         // Rows per table (default: 10)
  outputMode: string,   // 'insert' | 'upsert' | 'truncate+insert' | 'ddl+insert'
  dialect: string,      // 'postgres' | 'mysql' | 'sqlite' | 'generic'
  output: string        // Optional: write generated SQL to this file path
}
```

**`generateFromSchemaFile` options (Node.js only):**
```javascript
{
  schemaFile: string,   // Required: path to ficta.schema.json file
  rows: number,         // Override row count for all tables
  outputMode: string,   // 'insert' | 'upsert' | 'truncate+insert' | 'ddl+insert'
  output: string        // Optional: write generated SQL to this file path
}
```

**`generateStream` options (Node.js only):**
```javascript
{
  columns: string,      // Column definitions (or use template:)
  template: string,     // Template name (alternative to columns)
  rows: number,         // Total rows to generate
  format: 'csv'|'ndjson', // Output format
  batchSize: number,    // Rows per emitted chunk (default: 500)
  seed: number,         // Optional Faker seed
  locale: string        // Optional Faker locale
}
```

**`generateAndSave` options:**
```javascript
{
  columns: string | Array,  // Column definitions
  rows: number,             // Number of rows (default: 100)
  format: string,          // csv|json|xml|xlsx|tsv|sql|yaml|yml|toml
  output: string,          // Output filename
  template: string,        // Template name
  preview: boolean,        // Return data without saving
  seed: number,            // Optional Faker seed for reproducible output
  locale: string,          // Optional Faker locale (e.g. 'fr', 'de', 'ja')
  formatOptions: {
    tableName: string,       // SQL table name (default: 'data_table')
    rootElement: string,     // XML root element
    recordElement: string,   // XML record element
    sheetName: string,       // Excel sheet name
    header: boolean,         // Include CSV/TSV header row (default: true)
    headerFormat: string,    // 'title' | 'raw' (default: 'title')
    mode: string,            // SQL output mode
    dialect: string,         // SQL dialect
    batch: boolean,          // SQL batch inserts
    pretty: boolean          // JSON pretty print
  }
}
```

### Browser Module (`src/browser.js`)

**Exports:**
- `generateData(options)` - Generate formatted string/blob
- `downloadFile(data, filename, format)` - Trigger browser download
- Core exports (setFaker, templates, etc.)

**Browser Globals:**
- `window.Ficta` - All exports available globally
- `window.faker` - Expected to be loaded separately

### Formatters (`src/formatters.js`)

**Exports:**
- `toCSV(records, columns)` - Convert to CSV string
- `toJSON(records, pretty)` - Convert to JSON string
- `toXML(records, rootElement, recordElement)` - Convert to XML (async)
- `toExcel(records, columns, sheetName)` - Create Excel buffer (async)
- `toTSV(records, columns)` - Convert to TSV string
- `toSQL(records, columns, tableNameOrOptions)` - INSERT statements (legacy) or full schema (options object)
- `toYAML(records)` - Convert to YAML string
- `toTOML(records)` - Convert to TOML string
- `formatColumnName(name)` - Convert camelCase to Title Case

### SQL Schema Module (`src/sql-schema.js`)

Universal (no runtime env dependencies). Handles DDL and DML generation.

**Exports:**
- `sqlTypeMap` - Mapping of 40+ Faker types → SQL types per dialect
- `getSQLType(column, dialect)` - Resolve SQL type for a column
- `generateDDL(tableName, columns, options)` - CREATE TABLE statement
- `generateInserts(tableName, records, columns, options)` - INSERT statements
- `generateUpserts(tableName, records, columns, options)` - UPSERT statements (dialect-aware)
- `resolveTableDependencies(tables)` - Topological sort (legacy helper)
- `generateSchema(schema)` - Complete schema generator (multi-table)
- `buildInsertStatements(options)` — *see schema-generator.js*

### DDL Parser (`src/ddl-parser.js`)

Pure module. Converts raw SQL DDL strings into structured `TableDef` objects. Zero side effects; works in both Node.js and browsers.

**Exports:**
- `parseDDL(ddlString)` - Parse one or more `CREATE TABLE` statements
  - Returns `Array<TableDef>` where each entry has `{ tableName, columns, primaryKey, foreignKeys }`
  - `columns[i]` fields: `name`, `sqlType`, `fictaType`, `nullable`, `autoIncrement`, `defaultValue`, `enumValues`
- `orderByDependencies(tables)` - Topological sort using Kahn's algorithm
  - Throws `Error` if circular FK dependencies are detected

**Two-layer type resolution in `parseDDL`:**
1. Column **name hints** (e.g., column named `email` → `email` type regardless of SQL type)
2. SQL **type fallback** (e.g., `SERIAL` → `autoIncrement`, `BOOLEAN` → `boolean`)

### Schema Generator (`src/schema-generator.js`)

Orchestrates multi-table generation from DDL. Pure module; Faker must be initialised via `setFaker()` from `core.js` before use.

**Exports:**
- `generateFromSchema(options)` - Main entry point
  - `options.ddl` — raw DDL string (mutually exclusive with `options.tables`)
  - `options.tables` — pre-parsed `TableDef[]` array
  - `options.rows` — rows per table (default `10`)
  - `options.outputMode` — `'insert'` | `'upsert'` | `'truncate+insert'` | `'ddl+insert'`
  - `options.dialect` — `'mysql'` | `'postgres'` | `'sqlite'` | `'generic'`
- `buildInsertStatements(options)` - Pure helper for INSERT/UPSERT on a single table
  - `options.tableName`, `options.records`, `options.columns`, `options.dialect`, `options.outputMode`, `options.conflictColumns`

**FK-aware data generation:** When generating child-table rows the orchestrator samples parent PK values stored in `pkStore`, so referential integrity is maintained across generated data.

---

## 🔑 Key Concepts

### Column Definitions

Columns are defined as comma-separated strings: `"name:type,name:type,..."`

**Examples:**
```javascript
"id:autoIncrement,name:fullName,email"
"status:enum:active|inactive,score:range:0-100"
"email:pattern:user+{COUNTER}@example.com"
```

**Special Type Syntax:**
- `enum:value1|value2|value3` - Random selection
- `range:min-max` - Random number in range
- `pattern:template` - String with {COUNTER} placeholder

### Templates

Predefined column sets for common use cases:

```javascript
templates = {
  users: { columns: "id:autoIncrement,firstName,lastName,email,phone,company,jobTitle,registeredDate:pastDate", rows: 100 },
  products: { columns: "sku:autoIncrement,name:product,category:department,price,stock:number,description:productDescription", rows: 100 },
  transactions: { columns: "id:uuid,date:timestamp,customerId:number,amount,currency,status:word,paymentMethod:word", rows: 100 },
  addresses: { columns: "id:autoIncrement,street,city,state,zipCode,country,lat:latitude,lng:longitude", rows: 100 },
  contacts: { columns: "id:autoIncrement,fullName,email,phone,company,jobTitle,website:url", rows: 100 }
}
```

### Faker Integration

The project uses Faker.js with lazy initialization:

```javascript
// Setting Faker (done automatically in most cases)
import { faker } from '@faker-js/faker';
setFaker(faker);

// Faker types are mapped in fakerTypes object
fakerTypes.fullName → faker.person.fullName()
fakerTypes.email → faker.internet.email()
```

### Format Detection

Formats are auto-detected from file extensions:

```javascript
'file.csv'   → format: 'csv'
'file.json'  → format: 'json'
'file.xlsx'  → format: 'xlsx'
'data.xml'   → format: 'xml'
'output.sql' → format: 'sql'
```

---

## 🛠️ Common Tasks

### Task 1: Add New Faker Data Type

**Location**: `src/core.js`

```javascript
// 1. Add to fakerTypes object
export const fakerTypes = {
  // ... existing types
  
  // Add new type
  myNewType: () => getFaker().category.method(),
  
  // Example: Add cryptocurrency
  cryptocurrency: () => getFaker().finance.bitcoinAddress(),
  
  // Example: Add color hex
  colorHex: () => getFaker().internet.color(),
};

// 2. Test it (tests/core.test.js)
test('generates cryptocurrency data', () => {
  const result = generateData({ columns: 'wallet:cryptocurrency', rows: 5 });
  expect(result.records[0].wallet).toMatch(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/);
});
```

### Task 2: Add New Template

**Location**: `src/core.js`

```javascript
// Add to templates object
export const templates = {
  // ... existing templates
  
  // Add new template
  employees: {
    columns: "id:autoIncrement,firstName,lastName,email,jobTitle,department,phone,street,city,state",
    rows: 100
  },
  
  orders: {
    columns: "orderId:autoIncrement,productId:number,customerId:number,quantity:range:1-100,amount:price,timestamp,status:enum:pending|shipped|delivered",
    rows: 50
  },
};
```

### Task 3: Add New Output Format

**Steps:**

1. **Add formatter function** (`src/formatters.js`):
```javascript
/**
 * Convert to YAML format
 * @param {Array} records - Array of row objects
 * @returns {string} YAML string
 */
export function toYAML(records) {
  // Implementation
  return yamlString;
}
```

2. **Update generateData** (`src/node.js`):
```javascript
export async function generateData(options) {
  // ... existing code
  
  switch (format) {
    // ... existing formats
    case 'yaml':
      return toYAML(records);
    default:
      return toCSV(records, columns);
  }
}
```

3. **Update CLI choices** (`cli.js`):
```javascript
.option('format', {
  alias: 'f',
  describe: 'Output format',
  type: 'string',
  choices: ['csv', 'json', 'xml', 'xlsx', 'tsv', 'sql', 'yaml'] // Add yaml
})
```

4. **Add tests** (`tests/formatters.test.js`):
```javascript
test('toYAML converts data correctly', () => {
  const data = [{id: 1, name: 'John'}];
  const yaml = toYAML(data);
  expect(yaml).toContain('id: 1');
  expect(yaml).toContain('name: John');
});
```

### Task 4: Add Custom Special Type

**Location**: `src/core.js`

```javascript
// Add handler function
function handleCustomType(options, counter) {
  // Parse options
  // Generate value based on options and counter
  return value;
}

// Update generateValue function
function generateValue(column, counter) {
  // ... existing code
  
  // Add new special type
  if (type.startsWith('customType:')) {
    return handleCustomType(type.substring(11), counter);
  }
  
  // ... rest of code
}
```

### Task 5: Generate Test Data from an Existing SQL Schema

**Use case**: You have a `.sql` file with `CREATE TABLE` statements and want realistic test data.

**Node.js (reads file from disk):**
```javascript
import { generateFromDDL } from './src/node.js';

// Reads schema.sql, generates data, optionally writes seed.sql
const sql = await generateFromDDL({
  schemaFile: './schema.sql',
  rows: 20,
  outputMode: 'ddl+insert', // 'insert' | 'upsert' | 'truncate+insert' | 'ddl+insert'
  dialect: 'postgres',       // 'postgres' | 'mysql' | 'sqlite' | 'generic'
  output: './seed.sql'
});
```

**Universal (browser + Node.js):**
```javascript
import { setFaker } from './src/core.js';
import { faker } from '@faker-js/faker';
import { generateFromSchema } from './src/schema-generator.js';

setFaker(faker);

const sql = generateFromSchema({
  ddl: `
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL
    );
    CREATE TABLE posts (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      title VARCHAR(255)
    );
  `,
  rows: 10,
  outputMode: 'ddl+insert',
  dialect: 'postgres'
});
```

**Parse DDL into table definitions manually:**
```javascript
import { parseDDL, orderByDependencies } from './src/ddl-parser.js';

const tables = parseDDL(rawDDL);
// tables[0] = { tableName, columns, primaryKey, foreignKeys }
const ordered = orderByDependencies(tables);
// ordered = tables sorted so parent tables precede child tables
```

### Task 6: Modify CSV Escaping Logic

**Location**: `src/formatters.js` → `toCSV()` function

```javascript
export function toCSV(records, columns) {
  // ... existing code
  
  const dataRows = records.map(record => {
    return parsedColumns.map(col => {
      const value = record[col.name];
      
      // Modify escaping logic here
      if (typeof value === 'string' && needsEscaping(value)) {
        return `"${escapeValue(value)}"`;
      }
      return value;
    }).join(',');
  });
  
  return [headerRow, ...dataRows].join('\n');
}
```

---

## 🧪 Testing Strategy

### Test Organization

```
tests/
├── core.test.js              # Core generation logic
├── formatters.test.js        # Node.js formatters
├── formatters.browser.test.js # Browser formatters
├── node.test.js              # Node.js API
├── browser.test.js           # Browser API
├── cli.test.js               # CLI interface
├── sql-schema.test.js        # SQL schema generator (73+ tests)
├── ddl-parser.test.js        # DDL parser (762-line test suite)
└── schema-generator.test.js  # Multi-table orchestrator
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- core.test.js

# Run in watch mode
npm test -- --watch
```

### Test Patterns

**Unit Tests (Pure Functions):**
```javascript
import { parseColumns, generateData } from '../src/core.js';

test('parseColumns parses simple columns', () => {
  const result = parseColumns('id,name,email');
  expect(result).toEqual([
    { name: 'id', type: 'id' },
    { name: 'name', type: 'name' },
    { name: 'email', type: 'email' }
  ]);
});
```

**Integration Tests (File Generation):**
```javascript
test('generateAndSave creates CSV file', async () => {
  const filename = 'test-output.csv';
  await generateAndSave({
    columns: 'id:autoIncrement,name',
    rows: 10,
    output: filename
  });
  
  expect(fs.existsSync(filename)).toBe(true);
  const content = fs.readFileSync(filename, 'utf-8');
  expect(content).toContain('Name');
  fs.unlinkSync(filename); // Cleanup
});
```

**Mock Tests (External Dependencies):**
```javascript
import { setFaker } from '../src/core.js';

test('uses custom faker configuration', () => {
  const mockFaker = {
    person: { fullName: () => 'Test Name' }
  };
  setFaker(mockFaker);
  
  const columns = parseColumns('name:fullName');
  const result = generateData({ columns: 'name:fullName', rows: 1 });
  expect(result.records[0].name).toBe('Test Name');
});
```

### Coverage Goals

- **Target**: Maintain 100% overall coverage
- **Critical paths**: Core generation, formatters, special types, DDL parser, schema orchestrator
- **Edge cases**: Empty data, special characters, large datasets, circular FK dependencies

---

## 🎨 Code Patterns

### Pattern 1: Pure Function Design

Most functions are pure (no side effects):

```javascript
// Input → Processing → Output (no mutations)
export function parseColumns(columnString) {
  return columnString.split(',').map(col => {
    const [name, ...typeParts] = col.trim().split(':');
    return { name, type: typeParts.join(':') || name };
  });
}
```

### Pattern 2: Options Object

Flexible configuration through options objects:

```javascript
// Instead of many parameters, use options object
async function generateData({
  columns,
  rows = 100,
  format = 'csv',
  template,
  ...formatOptions
}) {
  // Defaults, destructuring, rest parameters
}
```

### Pattern 3: Environment Detection

Code adapts to runtime environment:

```javascript
// Check environment
if (typeof window !== 'undefined') {
  // Browser-specific code
} else {
  // Node.js-specific code
}

// Use dynamic imports for Node.js only
const fs = await import('fs');
```

### Pattern 4: Error Handling

Consistent error messages with context:

```javascript
// Throw descriptive errors
if (!fakerInstance) {
  throw new Error('Faker.js not initialized. Import faker or call setFaker()');
}

if (!templates[template]) {
  throw new Error(`Unknown template: ${template}`);
}
```

### Pattern 5: String Parsing

Consistent delimiter-based parsing:

```javascript
// Use split and map for parsing
'enum:active|inactive|pending'.split(':')[1].split('|')
→ ['active', 'inactive', 'pending']

// Pattern matching
'pattern:user-{COUNTER}@test.com'
→ extract pattern, replace {COUNTER}
```

---

## 📚 API Reference

### Core API (`src/core.js`)

#### `setFaker(faker)`, `seedFaker(seed)`, `setLocale(locale)`

Initialize and configure the Faker instance.

```javascript
import { setFaker, seedFaker, setLocale } from './src/core.js';
import { faker } from '@faker-js/faker';
setFaker(faker);
seedFaker(42);      // reproducible output
setLocale('fr');    // French data
```

#### `parseColumns(columnString)`
Parses column definition string into structured array.

**Parameters:**
- `columnString` (string): Comma-separated column definitions

**Returns:** `Array<{name: string, type: string}>`

**Example:**
```javascript
parseColumns('id:autoIncrement,name:fullName,age:range:18-65')
// Returns:
[
  { name: 'id', type: 'autoIncrement' },
  { name: 'name', type: 'fullName' },
  { name: 'age', type: 'range:18-65' }
]
```

#### `generateData(options)` (previously named `generateRows` internally)
Generates records and returns a result object (no file I/O).

### Browser API (`src/browser.js`)

The browser bundle is self-contained (Faker bundled in). No external Faker script needed.

#### `generateData(options)`
Generates records from column definitions. Returns `{ records, columns, rowCount, columnCount }`.

```javascript
const result = Ficta.generateData({ columns: 'id,name', rows: 10 });
```

#### `downloadFile(data, filename, format)`
Triggers browser file download with the correct MIME type.

```javascript
const csv = Ficta.toCSV(result.records, result.columns);
Ficta.downloadFile(csv, 'data.csv', 'csv');
```

#### `generateAndDownload(options)` / `createUI(container)`

Generate + download in one call, or mount a self-contained UI.

```javascript
Ficta.generateAndDownload({ columns: 'id,name', rows: 50, filename: 'data.json', format: 'json' });
Ficta.createUI('#app');
```

---

### Schema Builder API (`src/schema-builder.js`)

Fluent code-first alternative to raw DDL strings.

```javascript
import { table, schema } from './src/schema-builder.js';

// Single table
const sql = table('users')
  .dialect('postgres').rows(50)
  .column('id', 'autoIncrement', { primaryKey: true })
  .column('email', 'email', { unique: true })
  .toSQL('ddl+insert');

// Multi-table
const sql2 = schema('blog')
  .dialect('mysql').rows(20)
  .table('authors', t => t.column('id', 'autoIncrement', { primaryKey: true }).column('name', 'fullName'))
  .table('posts', t => t
    .column('id', 'autoIncrement', { primaryKey: true })
    .column('author_id', 'number', { references: { table: 'authors', column: 'id' } })
    .column('title', 'sentence'))
  .toSQL('ddl+insert');
```

---

## 🔌 Extension Points

### 1. Plugin API (Custom Types and Templates)

Add or replace types/templates at runtime without touching `core.js`. Preferred over direct edits for project-specific extensions.

```javascript
import { registerType, registerTemplate } from 'ficta';

registerType('hashtag', () => '#' + Math.random().toString(36).slice(2, 8));
registerTemplate('employees', {
  columns: 'id:autoIncrement,firstName,lastName,email,jobTitle,department',
  rows: 50
});
```

### 2. Custom Data Types (built-in extension)

Add to `fakerTypes` in `src/core.js` for permanent built-in types.

### 3. Format Converters

Add new output format to formatters.

**When:** Need to support new file formats (YAML, Parquet, etc.)

**How:**
1. Add `toFormatName()` function in formatters.js
2. Update switch statement in `generateAndSave()`
3. Add format to CLI choices
4. Add browser implementation in formatters.browser.js

### 4. Special Types

Add complex value generation beyond simple Faker calls.

**When:** Need computed or conditional values

**How:**
```javascript
// In generateRow() function inside core.js
if (type.startsWith('mySpecial:')) {
  return handleMySpecial(type.substring(10), counter);
}

function handleMySpecial(options, counter) {
  // Custom logic
  return computedValue;
}
```

### 5. Templates

Add domain-specific column sets.

**When:** Common data schemas used repeatedly

**How:**
```javascript
export const templates = {
  myDomain: "field1:type1,field2:type2,...",
};
```

### 6. Validators

Add data validation before output.

**When:** Need to ensure data integrity

**How:**
```javascript
function validateRecord(record, columns) {
  // Validation logic
  if (!isValid(record)) {
    throw new Error('Invalid record');
  }
}

// Call in generateRow()
const record = {...};
validateRecord(record, columns);
records.push(record);
```

---

## 🔍 Troubleshooting

### Issue: "Faker.js not initialized"

**Cause:** Faker instance not set before generating data

**Solution:**
```javascript
import { faker } from '@faker-js/faker';
import { setFaker } from 'ficta';
setFaker(faker);
```

### Issue: Module not found in tests

**Cause:** Jest configuration with ES modules

**Solution:** Run tests with experimental VM modules flag:
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js
```

### Issue: Browser bundle not working

**Cause:** The IIFE bundle (`ficta.browser.js` / `ficta.browser.min.js`) is **self-contained** — Faker is bundled in. No separate Faker `<script>` tag is needed.

```html
<!-- This is enough — no Faker script required -->
<script src="https://cdn.jsdelivr.net/npm/ficta/dist/ficta.browser.min.js"></script>
```

### Issue: Large Excel files fail

**Cause:** Memory limits with ExcelJS

**Solution:**
- Generate in chunks
- Use streaming API
- Increase Node.js heap: `node --max-old-space-size=4096`

### Issue: Special characters in CSV

**Cause:** Improper escaping

**Solution:** Check `toCSV()` escaping logic:
```javascript
// Should escape quotes and commas
if (value.includes(',') || value.includes('"')) {
  return `"${value.replace(/"/g, '""')}"`;
}
```

---

## 🤖 AI Agent Workflows

### Workflow: Add New Feature

1. **Understand requirements** → Read relevant docs
2. **Locate code** → Check module structure
3. **Check patterns** → Follow existing code style
4. **Implement** → Add feature with tests
5. **Test** → Run test suite
6. **Document** → Update README/AGENTS.md

### Workflow: Fix Bug

1. **Reproduce** → Create failing test case
2. **Debug** → Identify root cause
3. **Fix** → Minimal change to fix issue
4. **Verify** → Ensure test passes
5. **Regression** → Check all tests still pass

### Workflow: Refactor

1. **Identify** → What needs improvement
2. **Test first** → Ensure full test coverage
3. **Refactor** → Make changes incrementally
4. **Test continuously** → Run tests after each change
5. **Verify** → Final full test suite run

---

## 📋 Quick Reference

### File Locations
- Core logic: `src/core.js`
- Node API: `src/node.js`
- Browser API: `src/browser.js`
- Formatters (Node.js): `src/formatters.js`
- Formatters (shared/pure): `src/formatters.shared.js`
- Formatters (browser): `src/formatters.browser.js`
- SQL DDL/DML generator: `src/sql-schema.js`
- DDL parser: `src/ddl-parser.js`
- Multi-table orchestrator: `src/schema-generator.js`
- Fluent schema builder: `src/schema-builder.js`
- CLI: `cli.js`
- Tests: `tests/*.test.js`

### Key Commands
```bash
npm test                    # Run tests
npm run test:coverage       # Run with coverage
npm run build              # Build browser bundles
node cli.js --help         # CLI help
```

### Common Patterns
- **Parse input**: `columnString.split(',').map(...)`
- **Generate value**: Check fakerTypes → special types → default
- **Format output**: Switch on format → call formatter
- **Handle errors**: Throw descriptive errors with context

---

## 🎓 Learning Path for AI Agents

### Level 1: Understanding
- Read this document completely
- Review `src/core.js` to understand data flow
- Check `tests/core.test.js` for usage examples

### Level 2: Basic Modifications
- Add new Faker data type
- Add new template
- Modify existing formatter

### Level 3: Advanced Features
- Add new output format
- Implement custom special type
- Add data validation layer

### Level 4: Architecture Changes
- Modify core generation algorithm
- Add plugin system
- Implement streaming for large files

---

## 📞 Support & Resources

- **README.md**: User-facing documentation
- **Tests**: Living examples of all features
- **Examples**: Browser usage examples in `examples/`
- **Coverage Report**: `coverage/lcov-report/index.html`

---

**Last Updated:** 2026-02-23
**Agent Version:** 2.1.0
**Project Version:** 1.1.7
