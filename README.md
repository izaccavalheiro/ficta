# Ficta

A universal test data generator that works in **Node.js**, **browsers**, and as a **CLI tool**. Generate realistic test data in multiple formats (CSV, JSON, XML, Excel, TSV, SQL, YAML, TOML) using simple column definitions powered by Faker.js.

## Features

- ✅ **Universal**: Works in Node.js, browsers, and as CLI
- ✅ **Multiple Formats**: CSV, JSON, XML, XLSX, TSV, SQL, YAML, TOML
- ✅ **40+ Data Types**: Names, emails, addresses, dates, and more
- ✅ **Smart Auto-Detection**: Format detected from file extension
- ✅ **Special Types**: Auto-increment, enums, ranges, patterns with counters
- ✅ **Predefined Templates**: Users, products, transactions, addresses, contacts
- ✅ **SQL Schema Generation**: DDL, foreign keys, multi-dialect support (PostgreSQL, MySQL, SQLite)
- ✅ **Advanced SQL Modes**: INSERT, UPSERT, DDL+INSERT, batch inserts, TRUNCATE+INSERT
- ✅ **Zero Config Browser**: Just include a script tag
- ✅ **TypeScript Ready**: Full type definitions included
- ✅ **High Test Coverage**: 100% coverage with 596 tests across all modules
- ✅ **Preview Mode**: See data before saving

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
  - [CLI (Command Line)](#cli-command-line)
  - [Node.js (Programmatic)](#nodejs-programmatic)
  - [Browser (Script Tag)](#browser-script-tag)
  - [Browser (ES Module)](#browser-es-module)
- [Supported Formats](#supported-formats)
- [Data Types](#data-types)
- [Special Types](#special-types)
- [Templates](#templates)
- [Format-Specific Options](#format-specific-options)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Development](#development)
- [Testing](#testing)
- [License](#license)

---

## Installation

### For Node.js / CLI

```bash
npm install ficta
```

### For Browser (No Installation)

Just include the script in your HTML:

```html
<script src="https://unpkg.com/ficta/dist/ficta.browser.js"></script>
```

Or download the browser bundle and include it locally.

---

## Quick Start

### CLI

```bash
# CSV (default)
ficta -c "id:autoIncrement,name:fullName,email" -r 100 -o users.csv

# JSON
ficta -c "id:autoIncrement,name:fullName,email" -r 100 -o users.json

# Excel
ficta -t users -r 500 -o users.xlsx

# SQL schema with DDL (PostgreSQL)
ficta -t users -r 100 -o schema.sql --sql-mode ddl+insert --sql-dialect postgres

# SQL with custom table name (legacy INSERT mode)
ficta -c "id,name,email" -r 100 -o users.sql --table-name my_users
```

Format is **automatically detected** from the file extension!

### Node.js

```javascript
import { generateAndSave } from 'ficta';

await generateAndSave({
    columns: 'id:autoIncrement,name:fullName,email',
    rows: 100,
    output: 'users.csv'
});
```

### Browser

```html
<!DOCTYPE html>
<html>
<body>
    <div id="app"></div>
    <script src="https://unpkg.com/ficta/dist/ficta.browser.js"></script>
    <script>
        // Create built-in interactive UI
        Ficta.createUI('#app');
        
        // Or generate programmatically
        const result = Ficta.generateCSV({
            columns: 'id:autoIncrement,name:fullName,email',
            rows: 50
        });
        
        // Download the file
        Ficta.downloadCSV(result.csv, 'data.csv');
    </script>
</body>
</html>
```

---

## Usage

### CLI (Command Line)

The CLI provides a simple interface for generating test files from the terminal.

```bash
# Basic usage
ficta -c "id:autoIncrement,name:fullName,email" -r 100 -o users.csv

# Use a template
ficta -t users -r 500 -o users.csv

# Custom patterns with counter
ficta -c "email:pattern:user+{COUNTER}@test.com" -r 50 -o emails.csv

# Show preview before saving
ficta -t products -r 20 -o products.csv -p

# List available types
ficta --list-types

# List available templates
ficta --list-templates
```

#### CLI Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--output` | `-o` | Output filename | `test-data.csv` |
| `--format` | `-f` | Output format (csv, json, xml, xlsx, tsv, sql, yaml, yml, toml) | Auto-detect from filename |
| `--columns` | `-c` | Column definitions (name:type,...) | - |
| `--rows` | `-r` | Number of rows to generate | `100` |
| `--template` | `-t` | Use predefined template | - |
| `--preview` | `-p` | Show preview of first 3 rows | `false` |
| `--list-types` | - | List all available data types | - |
| `--list-templates` | - | List all available templates | - |
| `--table-name` | - | SQL table name (for SQL format) | `data_table` |
| `--sql-dialect` | - | SQL dialect (postgres, mysql, sqlite, generic) | `generic` |
| `--sql-mode` | - | SQL mode (insert, ddl, ddl+insert, upsert, truncate+insert) | `insert` |
| `--sql-batch` | - | Use batch INSERT statements | `false` |
| `--sheet-name` | - | Excel worksheet name (for XLSX format) | `Sheet1` |
| `--pretty` | - | Pretty-print JSON (for JSON format) | `true` |
| `--help` | `-h` | Show help | - |

### Node.js (Programmatic)

Use as a library in your Node.js application.

```javascript
import { generateAndSave, generateCSV, templates } from 'ficta';

// Generate and save to file
await generateAndSave({
    columns: 'id:autoIncrement,name:fullName,email',
    rows: 1000,
    output: 'users.csv',
    preview: true  // Show preview in console
});

// Generate JSON format
await generateAndSave({
    columns: 'id:autoIncrement,name:fullName,email',
    rows: 100,
    output: 'users.json',
    format: 'json'
});

// Generate with format-specific options
await generateAndSave({
    columns: 'id:autoIncrement,name:fullName,email',
    rows: 100,
    output: 'users.xlsx',
    format: 'xlsx',
    formatOptions: {
        sheetName: 'User Data'
    }
});

// Just generate data (no file)
const result = generateCSV({
    columns: templates.users.columns,
    rows: 100
});

console.log(result.csv);      // CSV string
console.log(result.records);  // Array of objects
```

**Import from submodules**:

```javascript
// Import only what you need
import { generateData, parseColumns } from 'ficta/core';
import { templates } from 'ficta/node';
```

### Browser (Script Tag)

Perfect for quick prototyping or standalone HTML files.

```html
<!DOCTYPE html>
<html>
<head>
    <title>Ficta</title>
</head>
<body>
    <div id="csv-ui"></div>

    <!-- Include the library -->
    <script src="dist/ficta.browser.js"></script>
    
    <script>
        // Option 1: Use the built-in UI
        Ficta.createUI('#csv-ui');
        
        // Option 2: Generate programmatically
        const result = Ficta.generateCSV({
            columns: 'id:autoIncrement,email:pattern:user+{COUNTER}@test.com,name:fullName',
            rows: 50
        });
        
        // Download the file
        Ficta.downloadCSV(result.csv, 'data.csv');
        
        // Or use the data
        console.log(result.records); // Array of objects
        console.log(result.csv);     // CSV string
    </script>
</body>
</html>
```

**Try the examples**: Open `examples/simple.html` in your browser!

### Browser (ES Module)

For modern web apps with module support.

```html
<script type="module">
    import * as Ficta from './dist/ficta.esm.js';
    
    // Generate and download
    const result = Ficta.generateAndDownload({
        columns: 'id:autoIncrement,name:fullName,email,phone',
        rows: 100,
        filename: 'users.csv'
    });
    
    console.log(`Generated ${result.rowCount} rows!`);
</script>
```

**Try the example**: Open `examples/esmodule.html` in your browser!

---

## Supported Formats

Generate test data in 9 popular file formats:

| Format | Extension | Description | Node.js | Browser |
|--------|-----------|-------------|---------|---------||
| **CSV** | `.csv` | Comma-separated values with proper escaping | ✅ | ✅ |
| **JSON** | `.json` | JavaScript Object Notation (pretty or compact) | ✅ | ✅ |
| **XML** | `.xml` | Extensible Markup Language with configurable elements | ✅ | ✅ |
| **Excel** | `.xlsx` | Microsoft Excel workbook with formatting | ✅ | ❌ |
| **TSV** | `.tsv` | Tab-separated values | ✅ | ✅ |
| **SQL** | `.sql` | SQL DDL (CREATE TABLE) and DML (INSERT, UPSERT) statements | ✅ | ✅ |
| **YAML** | `.yaml` | YAML Ain't Markup Language - human-readable data format | ✅ | ✅ |
| **YML** | `.yml` | YAML format with shorter extension | ✅ | ✅ |
| **TOML** | `.toml` | Tom's Obvious, Minimal Language - config file format | ✅ | ✅ |

### Format Auto-Detection

If you don't specify the `-f` format option, the generator automatically detects the format from the output filename extension:

```bash
# These automatically use the correct format
ficta -c "id,name" -r 100 -o users.json   # → JSON
ficta -c "id,name" -r 100 -o users.xml    # → XML
ficta -c "id,name" -r 100 -o users.xlsx   # → Excel
ficta -c "id,name" -r 100 -o users.tsv    # → TSV
ficta -c "id,name" -r 100 -o users.sql    # → SQL
ficta -c "id,name" -r 100 -o users.yaml   # → YAML
ficta -c "id,name" -r 100 -o users.yml    # → YML
ficta -c "id,name" -r 100 -o users.toml   # → TOML
```

---

## Data Types

### Column Definition Format

Columns are defined as `name:type` pairs separated by commas:

```
columnName:dataType,anotherColumn:dataType
```

If no type is specified, defaults to `word`:
```bash
-c "name,email,phone"  # All use default 'word' type
```

### Available Types (40+)

#### Person
`firstName`, `lastName`, `fullName`, `jobTitle`, `prefix`, `suffix`

#### Internet
`email`, `username`, `password`, `url`, `ipv4`, `userAgent`

#### Phone
`phone`

#### Address
`street`, `city`, `state`, `country`, `zipCode`, `latitude`, `longitude`

#### Company
`company`, `department`

#### Commerce
`product`, `price`, `productDescription`

#### Finance
`amount`, `accountNumber`, `iban`, `creditCardNumber`, `currency`

#### Date
`pastDate`, `futureDate`, `recentDate`, `timestamp`

#### Numbers
`number`, `float`

#### Text
`word`, `words`, `sentence`, `paragraph`

#### IDs
`uuid`, `nanoid`, `autoIncrement`

#### Other
`boolean`, `color`, `emoji`

**List all types:**
```bash
ficta --list-types
```

---

## Special Types

### Auto Increment

Sequential numbering starting from 1.

```bash
-c "id:autoIncrement"
```
Output: `1, 2, 3, 4, ...`

### Static Values

Use the same value for all rows.

```bash
-c "status:static:active,country:static:USA"
```
Output: All rows have `active` status and `USA` country

### Enums

Random selection from a list of values.

```bash
-c "status:enum:active|inactive|pending"
```
Output: Randomly selects from: `active`, `inactive`, or `pending`

### Number Ranges

Random number within a specified range.

```bash
-c "age:range:18-65,score:range:0-100"
```
Output: `age` between 18-65, `score` between 0-100

### Patterns

Custom patterns with placeholders:
- `{COUNTER}` - Auto-incrementing number (1, 2, 3, ...)
- `#` - Random digit (0-9)

```bash
# Email with counter
-c "email:pattern:user+{COUNTER}@test.com"
# Output: user+1@test.com, user+2@test.com, ...

# Product SKU with random digits
-c "sku:pattern:PRD-######"
# Output: PRD-847291, PRD-192834, ...

# Order number combining counter and random
-c "orderNum:pattern:ORD-{COUNTER}-##"
# Output: ORD-1-42, ORD-2-17, ...
```

---

## Templates

Predefined column sets for common data structures.

### Available Templates

| Template | Description | Columns |
|----------|-------------|---------|
| **users** | User account data | id, firstName, lastName, email, phone, company, jobTitle, registeredDate |
| **products** | Product catalog | sku, name, category, price, stock, description |
| **transactions** | Financial transactions | id, date, customerId, amount, currency, status, paymentMethod |
| **addresses** | Address data with coordinates | id, street, city, state, zipCode, country, lat, lng |
| **contacts** | Contact information | id, fullName, email, phone, company, jobTitle, website |

### Usage

**CLI:**
```bash
ficta -t users -r 500 -o users.csv
ficta -t products -r 1000 -o products.json
```

**Node.js:**
```javascript
import { templates, generateCSV } from 'ficta';

const result = generateCSV({
    columns: templates.users.columns,
    rows: 100
});
```

**List all templates:**
```bash
ficta --list-templates
```

---

## Format-Specific Options

### Excel (XLSX)

```bash
# Specify worksheet name
ficta -t users -r 100 -o users.xlsx --sheet-name "User Data"
```

**Features:**
- Formatted headers (bold, gray background)
- Auto-fitted column widths
- Custom worksheet names

### SQL

Generate SQL INSERT statements or complete database schemas with DDL.

#### Basic INSERT Statements (Legacy)

```bash
# Simple INSERT statements
ficta -c "id,name,email" -r 100 -o users.sql --table-name my_users
```

#### Advanced SQL Schema Generation

**Generate PostgreSQL schema with DDL:**
```bash
ficta -t users -r 100 -o schema.sql \
  --sql-dialect postgres \
  --sql-mode ddl+insert \
  --table-name users
```

**Generate MySQL upsert statements:**
```bash
ficta -c "id:autoIncrement,username,email" -r 50 -o data.sql \
  --sql-dialect mysql \
  --sql-mode upsert \
  --table-name users
```

**Batch inserts for better performance:**
```bash
ficta -t products -r 1000 -o products.sql \
  --sql-batch \
  --table-name products
```

#### SQL Dialect Options

| Dialect | Description | Special Features |
|---------|-------------|------------------|
| `postgres` | PostgreSQL | SERIAL, JSONB, ON CONFLICT |
| `mysql` | MySQL/MariaDB | AUTO_INCREMENT, ENUM types, ON DUPLICATE KEY |
| `sqlite` | SQLite | Simplified types, INTEGER PRIMARY KEY AUTOINCREMENT |
| `generic` | Generic SQL | Standard SQL (default) |

#### SQL Generation Modes

| Mode | Description | Output |
|------|-------------|--------|
| `insert` | INSERT statements only (default) | `INSERT INTO table ...` |
| `ddl` | CREATE TABLE statements only | `CREATE TABLE ...` |
| `ddl+insert` | Schema + data | `CREATE TABLE ...` + `INSERT INTO ...` |
| `upsert` | UPSERT statements | `ON CONFLICT` (Postgres) / `ON DUPLICATE KEY` (MySQL) |
| `truncate+insert` | Clear data first | `TRUNCATE TABLE ...` + `INSERT INTO ...` |

**Node.js API:**

```javascript
import { generateAndSave } from 'ficta';

// Generate PostgreSQL schema with DDL
await generateAndSave({
  template: 'users',
  rows: 100,
  output: 'users-postgres.sql',
  formatOptions: {
    dialect: 'postgres',
    mode: 'ddl+insert',
    tableName: 'users'
  }
});

// Generate MySQL upserts
await generateAndSave({
  columns: 'id:autoIncrement,sku:pattern:PRD-{COUNTER},name:product,price',
  rows: 50,
  output: 'products-upsert.sql',
  formatOptions: {
    dialect: 'mysql',
    mode: 'upsert',
    tableName: 'products'
  }
});

// Batch inserts (more efficient)
await generateAndSave({
  columns: 'id,name,email',
  rows: 10000,
  output: 'users-batch.sql',
  formatOptions: {
    tableName: 'users',
    batch: true  // Single INSERT with multiple VALUES
  }
});
```

**Advanced: Multi-Table Schema with Foreign Keys:**

```javascript
import { generateSchema } from 'ficta/src/sql-schema.js';
import { generateData } from 'ficta';

// Generate sample data
const customers = generateData({
  columns: 'id:autoIncrement,firstName,lastName,email',
  rows: 10
});

const orders = generateData({
  columns: 'id:autoIncrement,customerId:range:1-10,amount:price,status:word',
  rows: 30
});

// Create multi-table schema
const schema = {
  schema: 'ecommerce',
  dialect: 'postgres',
  mode: 'ddl+insert',
  insertOrder: 'auto',  // Resolve FK dependencies automatically
  tables: [
    {
      table: 'customers',
      columns: [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'firstName', type: 'firstName' },
        { name: 'lastName', type: 'lastName' },
        { name: 'email', type: 'email', unique: true, nullable: false }
      ],
      records: customers.records
    },
    {
      table: 'orders',
      columns: [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        {
          name: 'customerId',
          type: 'number',
          references: { table: 'customers', column: 'id' },
          onDelete: 'CASCADE'
        },
        { name: 'amount', type: 'price' },
        { name: 'status', type: 'string' }
      ],
      records: orders.records
    }
  ]
};

const sql = generateSchema(schema);
// Outputs complete schema with proper table ordering
```

**Features:**
- **DDL Generation**: CREATE TABLE statements with proper column types
- **Type Mapping**: Automatic conversion from Faker types to SQL types
- **Constraints**: PRIMARY KEY, UNIQUE, NOT NULL, DEFAULT, FOREIGN KEY
- **Multi-Dialect**: PostgreSQL, MySQL, SQLite support
- **Foreign Keys**: Automatic dependency resolution and insert ordering
- **Batch Mode**: Multiple VALUES in single INSERT for performance
- **Upserts**: Dialect-aware UPSERT/MERGE statements
- **Proper Escaping**: Single quotes, NULL values, boolean conversion

**See Examples:**
- `examples/node/sql-simple.js` - Basic SQL generation
- `examples/node/sql-schema-examples.js` - Advanced multi-table schemas
- `examples/sql-schema.html` - Interactive browser demo

---

### SQL from Existing Schema (DDL Import)

Import an existing `.sql` schema file and automatically generate realistic test data that respects your table structure, column types, and foreign key relationships.

**Node.js programmatic API:**

```javascript
import { generateFromDDL } from 'ficta';

// Read schema.sql and generate test data
const sql = await generateFromDDL({
  schemaFile: './schema.sql',   // Path to your DDL file
  rows: 20,                     // Rows per table
  outputMode: 'ddl+insert',     // 'insert' | 'upsert' | 'truncate+insert' | 'ddl+insert'
  dialect: 'postgres',          // 'postgres' | 'mysql' | 'sqlite' | 'generic'
  output: './seed.sql'          // Optional: write output to file
});

console.log(sql); // Complete SQL script ready to execute
```

**Universal API (`generateFromSchema`) — works in browsers too:**

```javascript
import { generateFromSchema } from 'ficta/src/schema-generator.js';

// Pass a DDL string directly (browser-compatible)
const sql = generateFromSchema({
  ddl: `
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      created_at TIMESTAMP
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

**Low-level: Parse DDL then inspect or modify before generating:**

```javascript
import { parseDDL, orderByDependencies } from 'ficta/src/ddl-parser.js';
import { generateFromSchema } from 'ficta/src/schema-generator.js';

// Parse DDL into structured table definitions
const tables = parseDDL(rawDDLString);
// tables → [{ tableName, columns, primaryKey, foreignKeys }, ...]

// Sort tables in FK dependency order
const ordered = orderByDependencies(tables);

// Generate data from pre-parsed tables
const sql = generateFromSchema({ tables: ordered, rows: 5, dialect: 'mysql' });
```

**What `ddl-parser` understands:**
- `AUTO_INCREMENT`, `SERIAL`, `IDENTITY` auto-increment variants
- Inline and table-level `FOREIGN KEY … REFERENCES` syntax
- `ENUM('a','b','c')` column types → maps to `enum:a|b|c`
- `NOT NULL`, `DEFAULT`, `UNIQUE`, `PRIMARY KEY` modifiers
- SQL comments (`--` single-line and `/* */` block)
- Quoted identifiers (backtick and double-quote)
- Two-layer type resolution: column name hints first, SQL type fallback second

### JSON

```bash
# Disable pretty-printing (compact JSON)
ficta -c "id,name" -r 100 -o users.json --pretty false
```

**Features:**
- Pretty-printed by default
- Compact mode available

### CSV

Standard comma-separated values with:
- Proper escaping of commas, quotes, and newlines
- RFC 4180 compliant

### TSV

Tab-separated values, suitable for importing into Excel or databases.

### XML

Well-formed XML with:
- Configurable root and record element names
- Proper character escaping

### YAML / YML

Human-readable data serialization format:
- Clean, indented structure
- Compatible with most YAML parsers
- Suitable for configuration files

```bash
# Generate YAML file
ficta -c "id,name,email" -r 100 -o config.yaml
```

### TOML

Tom's Obvious, Minimal Language for configuration:
- Array of tables format (`[[records]]`)
- Type-safe values
- Popular for config files (Cargo.toml, pyproject.toml)

```bash
# Generate TOML file
ficta -c "id,name,email" -r 100 -o data.toml
```

---

## API Reference

### Core Functions

#### `generateCSV(options)`

Generate CSV data.

```javascript
import { generateCSV } from 'ficta';

const result = generateCSV({
    columns: 'id:autoIncrement,name:fullName,email',
    rows: 100
});

// Returns:
// {
//   csv: string,           // CSV string
//   records: Array,        // Array of objects
//   columns: Array,        // Parsed column definitions
//   rowCount: number,      // Number of rows
//   columnCount: number    // Number of columns
// }
```

#### `generateData(options)`

Generate data as array of objects (no CSV conversion).

```javascript
import { generateData } from 'ficta/core';

const records = generateData({
    columns: 'id:autoIncrement,name:fullName,email',
    rows: 100
});
// Returns: Array of objects
```

#### `generateFromDDL(options)` *(Node.js only)*

Read a `.sql` DDL file and generate test data for all tables, respecting column types and foreign key relationships.

```javascript
import { generateFromDDL } from 'ficta';

const sql = await generateFromDDL({
  schemaFile: './schema.sql',  // Required: path to DDL file
  rows: 10,                    // Rows per table (default: 10)
  outputMode: 'insert',        // 'insert' | 'upsert' | 'truncate+insert' | 'ddl+insert'
  dialect: 'generic',          // 'postgres' | 'mysql' | 'sqlite' | 'generic'
  output: './seed.sql'         // Optional: write to this file
});
```

#### `generateFromSchema(options)` *(universal)*

Generate test data from a DDL string or pre-parsed table definitions. Works in both Node.js and browsers.

```javascript
import { generateFromSchema } from 'ficta/src/schema-generator.js';

const sql = generateFromSchema({
  ddl: '...',          // Raw DDL string (or provide tables:)
  tables: [...],       // Pre-parsed TableDef array (from parseDDL)
  rows: 10,            // Rows per table
  outputMode: 'insert',
  dialect: 'postgres'
});
```

#### `parseDDL(ddlString)` *(universal)*

Parse SQL CREATE TABLE statements into structured table definitions.

```javascript
import { parseDDL } from 'ficta/src/ddl-parser.js';

const tables = parseDDL(`
  CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR(255) NOT NULL);
`);
// Returns: [{ tableName: 'users', columns: [...], primaryKey: ['id'], foreignKeys: [] }]
```

#### `orderByDependencies(tables)` *(universal)*

Sort parsed table definitions in foreign key dependency order (topological sort). Throws on circular dependencies.

```javascript
import { orderByDependencies } from 'ficta/src/ddl-parser.js';

const ordered = orderByDependencies(parseDDL(ddlString));
// Parent tables always appear before child tables
```

#### `parseColumns(columnString)`

Parse column definitions.

```javascript
import { parseColumns } from 'ficta/core';

const columns = parseColumns('id:autoIncrement,name:fullName,email');
// Returns: [
//   { name: 'id', type: 'autoIncrement' },
//   { name: 'name', type: 'fullName' },
//   { name: 'email', type: 'email' }
// ]
```

### Node.js Functions

#### `generateAndSave(options)`

Generate and save file.

```javascript
import { generateAndSave } from 'ficta';

await generateAndSave({
    columns: 'id:autoIncrement,name:fullName,email',
    rows: 100,
    output: 'users.csv',
    format: 'csv',      // Optional: auto-detected from filename
    preview: true,      // Optional: show preview
    formatOptions: {    // Optional: format-specific options
        tableName: 'users',  // SQL
        sheetName: 'Data',   // XLSX
        pretty: true         // JSON
    }
});
```

### Browser Functions

#### `downloadCSV(csv, filename)`

Download CSV as a file.

```javascript
import { downloadCSV } from 'ficta/browser';

downloadCSV(csvString, 'data.csv');
```

#### `createUI(container, options)`

Create interactive UI.

```javascript
import { createUI } from 'ficta/browser';

const ui = createUI('#container');
ui.setColumns('id:autoIncrement,name:fullName');
ui.setRows(50);
```

#### `generateAndDownload(options)`

Generate and download file in browser.

```javascript
import { generateAndDownload } from 'ficta/browser';

generateAndDownload({
    columns: 'id:autoIncrement,name:fullName,email',
    rows: 100,
    filename: 'users.json',
    format: 'json'
});
```

---

## Examples

### Generate User Data

```bash
ficta \
  -o users.csv \
  -c "id:autoIncrement,firstName,lastName,email,phone,company,registeredDate:pastDate" \
  -r 1000
```

### Generate Product Catalog

```bash
ficta \
  -o products.csv \
  -c "sku:pattern:PRD-######,name:product,price,category:department,inStock:boolean" \
  -r 500
```

### Generate Orders with Custom Status

```bash
ficta \
  -o orders.csv \
  -c "orderId:uuid,date:timestamp,total:amount,status:enum:pending|shipped|delivered,customerEmail:email" \
  -r 2000
```

### Generate Test Addresses with Preview

```bash
ficta -t addresses -r 300 -o addresses.csv -p
```

### Email Counter Pattern

```javascript
// Generate sequential email addresses
const result = generateCSV({
    columns: 'email:pattern:testuser+{COUNTER}@example.com',
    rows: 1000
});
// Result: testuser+1@example.com, testuser+2@example.com, ...
```

### Mixed Column Types

```javascript
generateCSV({
    columns: 'id:autoIncrement,name:fullName,status:enum:active|inactive,score:range:0-100,code:pattern:XYZ-####',
    rows: 50
});
```

### Generate Multiple Files

```javascript
const datasets = ['users', 'products', 'transactions'];

for (const template of datasets) {
    await generateAndSave({
        columns: templates[template].columns,
        rows: 1000,
        output: `${template}.csv`
    });
}
```

### Different Formats for Different Scenarios

```bash
# API testing (JSON)
ficta -t users -r 1000 -o api-test-data.json

# Database seeding (SQL)
ficta -t products -r 500 -o seed-products.sql --table-name products

# Excel reports (XLSX)
ficta -t transactions -r 10000 -o report.xlsx --sheet-name "Transactions 2024"

# Data import (CSV)
ficta -c "id:autoIncrement,email:pattern:user+{COUNTER}@test.com" -r 5000 -o import.csv

# Configuration files (XML)
ficta -c "key:word,value:word" -r 50 -o config.xml
```

---

## Development

### Setup

```bash
# Clone repository
git clone https://github.com/your-username/ficta.git
cd ficta

# Install dependencies
npm install

# Build browser bundles
npm run build
```

### Project Structure

```
ficta/
├── src/
│   ├── core.js              # Core generator (universal — no Node/browser deps)
│   ├── formatters.js        # Format converters (Node.js)
│   ├── formatters.browser.js # Format converters (browser)
│   ├── node.js              # Node.js-specific exports + generateFromDDL()
│   ├── browser.js           # Browser-specific exports
│   ├── sql-schema.js        # SQL DDL/DML generator (universal)
│   ├── ddl-parser.js        # SQL DDL → TableDef parser (universal)
│   └── schema-generator.js  # Multi-table data generation orchestrator (universal)
├── tests/
│   ├── core.test.js         # Core generation tests
│   ├── formatters.test.js   # Node.js formatter tests
│   ├── formatters.browser.test.js # Browser formatter tests
│   ├── node.test.js         # Node.js API tests
│   ├── browser.test.js      # Browser API tests
│   ├── cli.test.js          # CLI interface tests
│   ├── sql-schema.test.js   # SQL schema generator tests
│   ├── ddl-parser.test.js   # DDL parser tests
│   └── schema-generator.test.js # Schema orchestrator tests
├── examples/
│   ├── simple.html          # Simple browser example
│   ├── esmodule.html        # ES module browser example
│   ├── sql-schema.html      # Interactive SQL schema browser demo
│   └── node/
│       ├── sql-simple.js          # Basic SQL generation examples
│       └── sql-schema-examples.js # Advanced multi-table SQL examples
├── cli.js                   # CLI entry point
├── build.js                 # Build script for browser bundles
└── package.json
```

### Build Scripts

```bash
# Build browser bundles
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

---

## Testing

### Test Coverage

| Metric     | Coverage |
|------------|----------|
| Statements | 100%     |
| Branches   | 100%     |
| Functions  | 100%     |
| Lines      | 100%     |

### Test Statistics

- **Total Tests**: 596
- **Test Suites**: 9

### Test Categories

1. **fakerTypes Tests** - All Faker data type categories
2. **templates Tests** - Predefined template validation
3. **parseColumns Tests** - Column parsing with complex definitions
4. **generateRow Tests** - Row generation with all special types
5. **generateCSV Tests** - CSV generation and formatting
6. **CLI Tests** - Command-line interface and options
7. **Integration Tests** - End-to-end workflows
8. **Format Tests** - All output format converters

### Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Key Features Tested

✅ All Faker data types (40+ types)  
✅ Special types: static, enum, range, pattern  
✅ Pattern with {COUNTER} placeholder and # for random digits  
✅ All predefined templates  
✅ Column parsing with complex type definitions  
✅ All file format generation (CSV, JSON, XML, XLSX, TSV, SQL, YAML, TOML)  
✅ CLI argument parsing and error handling  
✅ Preview mode and format auto-detection  
✅ Browser and Node.js environments  
✅ SQL DDL generation (CREATE TABLE, PK, FK, constraints, 4 dialects)  
✅ SQL DML generation (INSERT, batch INSERT, UPSERT, TRUNCATE+INSERT)  
✅ DDL parsing from raw SQL (parseDDL, orderByDependencies)  
✅ Multi-table FK-aware data generation (schema-generator)  
✅ Topological sort and circular dependency detection

---

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (ES2020+)
- **Legacy Support**: Use the minified bundle for better compatibility

## Node.js Compatibility

- **Node.js**: 16+ (ES Modules required)

---

## Dependencies

### Production

- [@faker-js/faker](https://fakerjs.dev/) - Generate realistic fake data
- [csv-writer](https://www.npmjs.com/package/csv-writer) - Write CSV files (Node.js)
- [exceljs](https://www.npmjs.com/package/exceljs) - Excel file generation (Node.js)
- [xml2js](https://www.npmjs.com/package/xml2js) - XML building (Node.js)
- [yargs](https://yargs.js.org/) - CLI argument parsing

### Development

- [jest](https://jestjs.io/) - Testing framework
- [esbuild](https://esbuild.github.io/) - Browser bundle builder
- [csv-parse](https://csv.js.org/) - CSV parsing for tests

---

## AI Integration & Development

This project includes comprehensive AI/Agent support documentation:

- **[AI_CONTEXT.md](AI_CONTEXT.md)** - Quick reference for AI assistants (start here!)
- **[AGENTS.md](AGENTS.md)** - Complete AI integration guide with patterns and workflows
- **[AI_WORKFLOWS.md](AI_WORKFLOWS.md)** - Step-by-step workflows for common tasks
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Deep technical architecture documentation
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** - GitHub Copilot specific instructions

These documents empower AI assistants to understand, modify, and extend the codebase effectively.

---

## License

ISC

---

## Contributing

Contributions welcome! Please open an issue or PR.

For AI-assisted development, please review our AI integration documentation:
- [AI_CONTEXT.md](AI_CONTEXT.md) - Quick project overview
- [AGENTS.md](AGENTS.md) - Comprehensive AI development guide
- [AI_WORKFLOWS.md](AI_WORKFLOWS.md) - Common task workflows

---

Made with ❤️ using [Faker.js](https://fakerjs.dev/)
