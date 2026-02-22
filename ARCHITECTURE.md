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
│   ├── node.js              # Node.js adapter
│   └── browser.js           # Browser adapter
├── cli.js                   # CLI interface
├── build.js                 # Build script for bundles
├── tests/                   # Test suite
│   ├── core.test.js
│   ├── formatters.test.js
│   ├── formatters.browser.test.js
│   ├── node.test.js
│   ├── browser.test.js
│   └── cli.test.js
└── dist/                    # Built browser bundles
    ├── ficta.browser.js    # UMD bundle
    └── csv-generator.esm.js        # ES Module bundle
```

### Module Dependency Graph

```
                    ┌─────────────┐
                    │   Faker.js  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
          ┌─────────┤  core.js    ├─────────┐
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
- `setFaker(faker)`
- `parseColumns(columnString)`
- `generateRows(columns, count)`
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

**Dependencies:** ExcelJS, xml2js, js-yaml, @iarna/toml

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

**Exports:**
- `generateData(options)` - Returns formatted data
- `generateAndSave(options)` - Saves to file
- Re-exports from core (templates, listTypes, etc.)

**Dependencies:** core.js, formatters.js, fs (Node.js built-in)

#### `browser.js` - Browser Adapter
**Responsibilities:**
- Browser API entry point
- File downloads via Blob API
- Global window.Ficta exposure
- Integrate core + browser formatters

**Exports:**
- `generateData(options)` - Returns formatted string/Blob
- `downloadFile(data, filename, format)` - Trigger download
- Re-exports from core

**Dependencies:** core.js, formatters.browser.js

#### `cli.js` - Command Line Interface
**Responsibilities:**
- Argument parsing with yargs
- User-friendly CLI interface
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
│ Generate Records  │ ← generateRows()
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

### Detailed Flow: generateRows()

```javascript
generateRows(columns, count)
    ↓
  Loop 1 to count
    ↓
  For each row:
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
  users: "id:autoIncrement,firstName,lastName,email,phone,street,city,state,zipCode",
  products: "id:autoIncrement,product,price,department,productDescription",
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
      "browser": "./dist/csv-generator.esm.js",
      "default": "./src/node.js"
    },
    "./browser": "./src/browser.js",
    "./node": "./src/node.js"
  }
}
```

### Node.js Adapter Pattern

```javascript
// src/node.js
import { faker } from '@faker-js/faker';
import { setFaker, parseColumns, generateRows } from './core.js';
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
import { parseColumns, generateRows, templates } from './core.js';
import { toCSV, toJSON, toXML } from './formatters.browser.js';

// Expect Faker to be loaded globally
if (typeof window !== 'undefined' && window.faker) {
  setFaker(window.faker);
}

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
import esbuild from 'esbuild';

// UMD bundle for <script> tags
await esbuild.build({
  entryPoints: ['src/browser.js'],
  bundle: true,
  format: 'iife',
  globalName: 'Ficta',
  outfile: 'dist/ficta.browser.js',
  external: ['@faker-js/faker']
});

// ES Module for modern imports
await esbuild.build({
  entryPoints: ['src/browser.js'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/csv-generator.esm.js',
  external: ['@faker-js/faker']
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
import { generateRows, parseColumns } from 'ficta/core';

function toYAML(records) {
  // Custom YAML formatting logic
  return yamlString;
}

const columns = parseColumns('id,name,email');
const records = generateRows(columns, 100);
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

**Example:**
```javascript
async function generateLargeFile(options) {
  const chunkSize = 10000;
  const totalRows = options.rows;
  
  for (let i = 0; i < totalRows; i += chunkSize) {
    const chunk = generateRows(columns, Math.min(chunkSize, totalRows - i));
    await appendToFile(options.output, chunk);
  }
}
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

### Planned Features

1. **Streaming API**
   - Generate files without loading all data in memory
   - Support for millions of rows

2. **Plugin System**
   - User-defined types
   - User-defined formatters
   - Middleware hooks

3. **Data Relationships**
   - Foreign key references
   - Consistent data across tables
   - Graph generation

4. **Advanced Types**
   - Conditional values
   - Computed columns
   - Cross-field dependencies

5. **Schema Import**
   - Generate from database schema
   - Import from JSON Schema
   - OpenAPI integration

6. **Performance Optimizations**
   - Worker threads for parallel generation
   - WebAssembly for formatters
   - Streaming Excel generation

### Architecture Evolution

**Current:** Functional core with adapters
**Future:** Plugin-based architecture with:
- Type registry
- Formatter registry
- Middleware chain
- Event hooks

---

## Conclusion

This architecture balances:
- **Simplicity** - Easy to understand and extend
- **Flexibility** - Works in multiple environments
- **Performance** - Efficient for most use cases
- **Maintainability** - Clear separation of concerns

The universal core with environment adapters pattern allows sharing 80% of code while providing environment-specific optimizations where needed.

---

**Last Updated:** 2026-02-21
**Version:** 1.0.0
