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

### Tech Stack
- **Language**: JavaScript (ES Modules)
- **Runtime**: Node.js 18+ / Modern Browsers
- **Dependencies**:
  - `@faker-js/faker` - Test data generation
  - `csv-writer` - CSV file writing
  - `exceljs` - Excel file generation
  - `xml2js` - XML parsing/building
  - `js-yaml` - YAML formatting
  - `@iarna/toml` - TOML formatting
  - `yargs` - CLI argument parsing
- **Build**: esbuild (browser bundles)
- **Testing**: Jest with 100% coverage

---

## 🏗️ Architecture

### Module Structure

```
ficta/
├── src/
│   ├── core.js              # Core generation logic (universal)
│   ├── formatters.js        # Format converters (Node.js)
│   ├── formatters.browser.js # Format converters (browser)
│   ├── node.js              # Node.js entry point
│   └── browser.js           # Browser entry point
├── cli.js                   # CLI entry point
├── tests/                   # Test files
├── examples/                # Usage examples
└── dist/                    # Built browser bundles
```

### Design Principles

1. **Universal Core**: `core.js` has NO Node.js or browser-specific dependencies
2. **Environment Adapters**: `node.js` and `browser.js` wrap core with environment-specific features
3. **Format Separation**: Formatters are separate for Node.js (using full libs) and browser (using minimal implementations)
4. **Lazy Initialization**: Faker is lazily loaded to support different environments
5. **Pure Functions**: Most functions are pure, making testing straightforward

### Data Flow

```
User Input → Parse Columns → Generate Rows → Format Data → Output
     ↓            ↓               ↓              ↓           ↓
   CLI/API   parseColumns()  generateRows()  toCSV()   Save/Download
              Template          Faker.js      toJSON()
              Resolution        Special       toXML()
                               Types         toExcel()
                                              toYAML()
                                              toTOML()
```

---

## 📁 Code Organization

### Core Module (`src/core.js`)

**Exports:**
- `setFaker(faker)` - Set Faker instance
- `fakerTypes` - Object mapping type names to generators
- `templates` - Predefined column templates
- `parseColumns(columnString)` - Parse column definitions
- `generateRows(columns, count)` - Generate data rows
- `listTypes()` - List all available types
- `listTemplates()` - List all templates

**Key Functions:**
```javascript
// Parse "id:autoIncrement,name:fullName,email" → column objects
parseColumns(columnString) → Array<{name, type, options}>

// Generate N rows of data based on columns
generateRows(columns, count) → Array<Object>

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
- `listTypes()` - Export from core
- `listTemplates()` - Export from core
- `templates` - Export from core

**Options Object:**
```javascript
{
  columns: string | Array,  // Column definitions
  rows: number,             // Number of rows (default: 100)
  format: string,          // csv|json|xml|xlsx|tsv|sql|yaml|yml|toml
  output: string,          // Output filename
  template: string,        // Template name
  preview: boolean,        // Return data without saving
  tableName: string,       // SQL table name (default: 'data')
  rootElement: string,     // XML root element
  recordElement: string,   // XML record element
  sheetName: string        // Excel sheet name
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
- `toSQL(records, columns, tableName)` - Generate SQL INSERT statements
- `toYAML(records)` - Convert to YAML string
- `toTOML(records)` - Convert to TOML string
- `formatColumnName(name)` - Convert camelCase to Title Case

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
  users: "id:autoIncrement,firstName,lastName,email,phone,street,city,state,zipCode",
  products: "id:autoIncrement,product,price,department,productDescription",
  transactions: "id:autoIncrement,accountNumber,amount,timestamp,currency",
  addresses: "id:autoIncrement,street,city,state,country,zipCode,latitude,longitude",
  contacts: "id:autoIncrement,fullName,email,phone,company,jobTitle"
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
  const columns = parseColumns('wallet:cryptocurrency');
  const rows = generateRows(columns, 5);
  expect(rows[0].wallet).toMatch(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/);
});
```

### Task 2: Add New Template

**Location**: `src/core.js`

```javascript
// Add to templates object
export const templates = {
  // ... existing templates
  
  // Add new template
  employees: "id:autoIncrement,firstName,lastName,email,jobTitle,department,phone,street,city,state",
  
  orders: "orderId:autoIncrement,productId:number,customerId:number,quantity:range:1-100,amount:price,timestamp,status:enum:pending|shipped|delivered",
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

### Task 5: Modify CSV Escaping Logic

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
└── cli.test.js               # CLI interface
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
import { parseColumns, generateRows } from '../src/core.js';

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
  const rows = generateRows(columns, 1);
  expect(rows[0].name).toBe('Test Name');
});
```

### Coverage Goals

- **Target**: 100% code coverage
- **Critical paths**: Core generation, formatters, special types
- **Edge cases**: Empty data, special characters, large datasets

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

#### `generateRows(columns, count)`
Generates array of data rows based on column definitions.

**Parameters:**
- `columns` (Array): Column definition objects
- `count` (number): Number of rows to generate

**Returns:** `Array<Object>`

**Example:**
```javascript
const columns = parseColumns('id:autoIncrement,name');
const rows = generateRows(columns, 3);
// Returns:
[
  { id: 1, name: 'John Doe' },
  { id: 2, name: 'Jane Smith' },
  { id: 3, name: 'Bob Johnson' }
]
```

#### `setFaker(faker)`
Sets the Faker.js instance for data generation.

**Parameters:**
- `faker` (object): Faker.js instance

**Example:**
```javascript
import { faker } from '@faker-js/faker';
import { setFaker } from './src/core.js';
setFaker(faker);
```

### Node.js API (`src/node.js`)

#### `generateData(options)`
Generates formatted data string/buffer.

**Parameters:**
- `options` (object):
  - `columns` (string|Array): Column definitions
  - `rows` (number): Number of rows (default: 100)
  - `format` (string): Output format (csv|json|xml|xlsx|tsv|sql)
  - `template` (string): Template name
  - `tableName` (string): SQL table name
  - Format-specific options...

**Returns:** `Promise<string|Buffer>`

**Example:**
```javascript
const csv = await generateData({
  columns: 'id,name,email',
  rows: 50,
  format: 'csv'
});
```

#### `generateAndSave(options)`
Generates data and saves to file.

**Parameters:**
- `options` (object): Same as generateData + `output` (required)

**Returns:** `Promise<void>`

**Example:**
```javascript
await generateAndSave({
  template: 'users',
  rows: 1000,
  output: 'users.xlsx'
});
```

### Browser API (`src/browser.js`)

#### `generateData(options)`
Generates data as string or Blob for browser.

**Parameters:** Same as Node.js version

**Returns:** `string|Blob`

**Example:**
```javascript
const jsonData = Ficta.generateData({
  columns: 'id,name',
  rows: 10,
  format: 'json'
});
```

#### `downloadFile(data, filename, format)`
Triggers browser download.

**Parameters:**
- `data` (string|Blob): File content
- `filename` (string): Download filename
- `format` (string): File format for MIME type

**Example:**
```javascript
const data = Ficta.generateData({ columns: 'id,name', rows: 10 });
Ficta.downloadFile(data, 'data.csv', 'csv');
```

---

## 🔌 Extension Points

### 1. Custom Data Types

Add custom Faker-based types to `fakerTypes` object.

**When:** Need data types not in Faker.js standard API

**How:**
```javascript
export const fakerTypes = {
  // Add custom types
  customerId: () => `CUST-${getFaker().string.alphanumeric(8).toUpperCase()}`,
  timezone: () => getFaker().location.timeZone(),
};
```

### 2. Format Converters

Add new output format to formatters.

**When:** Need to support new file formats (YAML, Parquet, etc.)

**How:**
1. Add `toFormatName()` function in formatters.js
2. Update switch statement in `generateData()`
3. Add format to CLI choices
4. Add browser implementation in formatters.browser.js

### 3. Special Types

Add complex value generation beyond simple Faker calls.

**When:** Need computed or conditional values

**How:**
```javascript
// In generateValue() function
if (type.startsWith('mySpecial:')) {
  return handleMySpecial(type.substring(10), counter);
}

function handleMySpecial(options, counter) {
  // Custom logic
  return computedValue;
}
```

### 4. Templates

Add domain-specific column sets.

**When:** Common data schemas used repeatedly

**How:**
```javascript
export const templates = {
  myDomain: "field1:type1,field2:type2,...",
};
```

### 5. Validators

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

// Call in generateRows()
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

**Cause:** Faker not loaded globally

**Solution:**
```html
<!-- Load Faker first -->
<script src="https://cdn.jsdelivr.net/npm/@faker-js/faker@latest/dist/faker.min.js"></script>
<!-- Then load generator -->
<script src="./dist/ficta.browser.js"></script>
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
- Formatters: `src/formatters.js`
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

**Last Updated:** 2026-02-21
**Agent Version:** 1.0.0
**Project Version:** 1.0.0
