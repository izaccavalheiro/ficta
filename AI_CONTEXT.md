# AI Context - Ficta

> **Quick reference for AI assistants. Read this first for instant project understanding.**

## 🎯 What This Project Does

Universal test data generator that creates realistic fake data in 9 formats. Works everywhere: Node.js, browsers, CLI.

**One-line summary:** Generate CSV/JSON/XML/Excel/TSV/SQL/YAML/TOML test files with realistic data using Faker.js.

## ⚡ Quick Start (For AI)

```javascript
// Node.js
import { generateAndSave } from 'ficta';
await generateAndSave({
  columns: 'id:autoIncrement,name:fullName,email',
  rows: 100,
  output: 'users.csv'
});

// Browser
const data = Ficta.generateData({
  columns: 'id,name,email',
  rows: 50,
  format: 'json'
});

// CLI
ficta -t users -r 1000 -o users.xlsx
```

## 📁 Project Structure (Essential Files)

```
src/
  core.js              ← 🎯 Core logic: parseColumns, generateRows
  formatters.js        ← Format converters (CSV, JSON, XML, Excel, etc.)
  formatters.browser.js ← Browser-safe format converters
  node.js              ← Node.js API wrapper + generateFromDDL()
  browser.js           ← Browser API wrapper
  sql-schema.js        ← SQL DDL/DML generator (universal)
  ddl-parser.js        ← SQL DDL → TableDef parser (universal, pure)
  schema-generator.js  ← Multi-table FK-aware orchestrator (universal)
cli.js                 ← CLI interface with yargs
tests/*.test.js        ← 596 tests, 100% overall coverage
```

## 🔑 Core Concepts

### 1. Column Definitions
```
Format: "name:type,name:type,..."
Example: "id:autoIncrement,name:fullName,email,age:range:18-65"
```

### 2. Data Types (40+)
- **Basic**: email, phone, fullName, address, company
- **Special**: autoIncrement, enum:val1|val2, range:0-100, pattern:text-{COUNTER}
- **All Faker.js types** mapped in `fakerTypes` object

### 3. Templates
```javascript
users: "id:autoIncrement,firstName,lastName,email,phone,street,city,state,zipCode"
products: "id:autoIncrement,product,price,department,productDescription"
transactions: "id:autoIncrement,accountNumber,amount,timestamp,currency"
```

### 4. Formats
- CSV, JSON, XML, XLSX (Excel), TSV, SQL, YAML, YML, TOML
- Auto-detected from file extension
- Each has dedicated formatter function

## 🏗️ Architecture (Mental Model)

```
Input String → Parse → Generate → Format → Output
     ↓           ↓         ↓         ↓        ↓
 "id,name"  Columns   Faker.js   toCSV()   File/Download
           Template              toJSON()
                                 toXML()
                                 toYAML()
                                 toTOML()

DDL String / .sql file → parseDDL() → orderByDependencies() → generateFromSchema() → SQL
```

**Key principle:** Core is universal (no Node/browser deps), adapters add environment-specific features.

## 🎯 Common Tasks (What You'll Do)

### Task: Add Faker Data Type
**File:** `src/core.js` → `fakerTypes` object
```javascript
myType: () => getFaker().category.method()
```

### Task: Add Template
**File:** `src/core.js` → `templates` object
```javascript
myTemplate: "field1:type1,field2:type2,..."
```

### Task: Add Output Format
**Files:** 
1. `src/formatters.js` → Add `toFormatName()` function

### Task: Generate Data from SQL DDL Schema
**Node.js API:**
```javascript
import { generateFromDDL } from 'ficta';
const sql = await generateFromDDL({
  schemaFile: './schema.sql',
  rows: 20,
  outputMode: 'ddl+insert', // 'insert' | 'upsert' | 'truncate+insert' | 'ddl+insert'
  dialect: 'postgres',
  output: './seed.sql'
});
```
**Universal API (browser + Node.js):**
```javascript
import { generateFromSchema } from 'ficta/src/schema-generator.js';
const sql = generateFromSchema({ ddl: rawDDLString, rows: 10, dialect: 'postgres' });
```
**Parse DDL manually:**
```javascript
import { parseDDL, orderByDependencies } from 'ficta/src/ddl-parser.js';
const tables = parseDDL(rawDDLString);
const ordered = orderByDependencies(tables);
```
2. `src/node.js` → Add case to switch statement
3. `cli.js` → Add to format choices

### Task: Fix Formatter
**Location:** `src/formatters.js` → Specific `toXXX()` function

## 🧪 Testing

```bash
npm test                    # Run all tests
npm run test:coverage       # With coverage report
```

**Pattern:** Every feature has corresponding test in `tests/`
**Goal:** Maintain 100% coverage

## 📦 Dependencies

```javascript
@faker-js/faker    // Data generation (core dependency)
csv-writer         // CSV files (Node.js)
exceljs           // Excel files (Node.js)
xml2js            // XML parsing/building
js-yaml           // YAML formatting
@iarna/toml       // TOML formatting
yargs             // CLI arguments
esbuild           // Browser bundles
jest              // Testing
```

## 🔍 Finding Code

| What | Where |
|------|-------|
| Data generation logic | `src/core.js` → `generateRows()` |
| Column parsing | `src/core.js` → `parseColumns()` |
| CSV formatting | `src/formatters.js` → `toCSV()` |
| JSON formatting | `src/formatters.js` → `toJSON()` |
| Excel formatting | `src/formatters.js` → `toExcel()` |
| Special types (enum, range) | `src/core.js` → `generateRow()` |
| Templates | `src/core.js` → `templates` object |
| CLI logic | `cli.js` → `setupCLI()` |
| Node.js API | `src/node.js` → `generateAndSave()` |
| DDL file import | `src/node.js` → `generateFromDDL()` |
| Browser API | `src/browser.js` → `generateData()`, `downloadFile()` |
| SQL DDL/DML generation | `src/sql-schema.js` → `generateDDL()`, `generateInserts()` |
| Parse SQL schema | `src/ddl-parser.js` → `parseDDL()` |
| Multi-table FK generation | `src/schema-generator.js` → `generateFromSchema()` |

## 🎨 Code Patterns

### Pattern 1: Pure Functions
```javascript
// Input → Process → Output (no side effects)
function parseColumns(str) {
  return str.split(',').map(col => ({
    name: col.split(':')[0],
    type: col.split(':')[1] || col
  }));
}
```

### Pattern 2: Options Objects
```javascript
// Flexible configuration
async function generateData({ 
  columns, 
  rows = 100, 
  format = 'csv',
  ...options 
}) { }
```

### Pattern 3: Environment Detection
```javascript
if (typeof window !== 'undefined') {
  // Browser code
} else {
  // Node.js code
}
```

## ⚠️ Important Constraints

1. **Core is universal** - `src/core.js` has NO Node.js/browser deps
2. **Faker is lazy** - Must be set with `setFaker()` before use
3. **ES Modules only** - No CommonJS
4. **Jest needs flag** - Run with `--experimental-vm-modules`
5. **100% coverage** - All changes must include tests

## 🚀 Typical Changes

### 90% of requests fall into:
1. **Add data type** - Extend `fakerTypes` in core.js
2. **Add template** - Extend `templates` in core.js
3. **Fix formatter** - Edit function in formatters.js
4. **Add format** - Three-file change (formatters, node.js, cli.js)

### Rare but possible:
- Change core generation algorithm
- Add validation layer
- Implement streaming
- Add plugin system

## 📚 Documentation Hierarchy

1. **AI_CONTEXT.md** ← You are here (quick reference)
2. **AGENTS.md** - Comprehensive AI guide
3. **ARCHITECTURE.md** - Deep technical details
4. **README.md** - User documentation
5. **Tests** - Living examples

## 🔗 Related Files

- **AGENTS.md** - Full AI integration guide
- **ARCHITECTURE.md** - Detailed architecture
- **AI_WORKFLOWS.md** - Step-by-step task workflows
- **README.md** - User-facing docs

## 💡 Pro Tips

1. **Start with tests** - Check `tests/` to see how features work
2. **Follow patterns** - Code is highly consistent
3. **Test immediately** - Run tests after every change
4. **Update coverage** - 100% is the goal
5. **Check formatters** - Most bugs are in format conversion

## 🎓 Learning Order

1. Read AI_CONTEXT.md (this file) - 5 min
2. Scan AGENTS.md introduction - 10 min
3. Read `src/core.js` top to bottom - 15 min
4. Browse test files for examples - 10 min
5. You're ready to code! - ∞ min

## 📊 Project Stats

- **Lines of Code**: ~4,500+
- **Test Coverage**: 100% (statements, branches, functions, lines)
- **Number of Tests**: 596
- **Supported Formats**: 9
- **Data Types**: 40+
- **Templates**: 5
- **SQL Dialects**: 4 (PostgreSQL, MySQL, SQLite, Generic)
- **SQL Output Modes**: 5 (insert, upsert, ddl, ddl+insert, truncate+insert)
- **Dependencies**: 12
- **Complexity**: Low-Medium

## 🔥 Hot Spots (Change Frequently)

- `src/core.js` → `fakerTypes` (add data types)
- `src/core.js` → `templates` (add templates)
- `src/formatters.js` → All `toXXX()` functions
- `cli.js` → CLI options and help

## ❄️ Cold Spots (Rarely Change)

- `src/core.js` → `parseColumns()` (stable)
- `src/core.js` → `generateRows()` (stable)
- Build configuration
- Test setup

## 🎯 Success Criteria

Your change is successful when:
- [ ] All tests pass (`npm test`)
- [ ] Coverage remains 100% (`npm run test:coverage`)
- [ ] No TypeScript errors (if applicable)
- [ ] Follows existing code patterns
- [ ] Includes test for new functionality
- [ ] Documentation updated (if public API change)

---

**Quick Command Reference:**
```bash
npm test                    # Test
npm run test:coverage       # Coverage
npm run build              # Build bundles
node cli.js --help         # CLI help
node cli.js --list-types   # Show all data types
```

---

**Read AGENTS.md next for comprehensive guide.**
