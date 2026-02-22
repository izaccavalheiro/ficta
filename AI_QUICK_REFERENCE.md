# AI Quick Reference Card

> **Print this! Keep handy while developing with AI assistance**

## 🎯 Project: Ficta
Universal test data generator: Node.js + Browser + CLI → CSV/JSON/XML/Excel/TSV/SQL/YAML/TOML

---

## 📁 Essential Files

| File | Purpose |
|------|---------|
| `src/core.js` | Data generation (universal - NO Node/browser deps) |
| `src/formatters.js` | Format converters (Node.js) |
| `src/formatters.browser.js` | Format converters (browser) |
| `src/node.js` | Node.js API + `generateFromDDL()` |
| `src/browser.js` | Browser API |
| `src/sql-schema.js` | SQL DDL/DML generator (universal) |
| `src/ddl-parser.js` | SQL schema → TableDef parser (universal, pure) |
| `src/schema-generator.js` | Multi-table FK-aware orchestrator (universal) |
| `cli.js` | CLI interface |
| `tests/*.test.js` | 596 tests, 100% coverage |

---

## 📚 Documentation Quick Links

| Need | Read |
|------|------|
| Quick overview (5 min) | **AI_CONTEXT.md** |
| Comprehensive guide (30 min) | **AGENTS.md** |
| Step-by-step task guide | **AI_WORKFLOWS.md** |
| Architecture details | **ARCHITECTURE.md** |
| GitHub Copilot setup | **.github/copilot-instructions.md** |
| Contributing | **CONTRIBUTING.md** |

---

## ⚡ Common Tasks

### Add Data Type
```javascript
// File: src/core.js → fakerTypes object
myType: () => getFaker().category.method()
```

### Add Template
```javascript
// File: src/core.js → templates object
myTemplate: "id:autoIncrement,field1:type1,field2:type2"
```

### Add Format
1. `src/formatters.js` → `toMyFormat()`
2. `src/node.js` → Add case
3. `cli.js` → Add choice
4. Tests

### Fix Formatter
```javascript
// File: src/formatters.js
export function toCSV(records, columns) { ... }
```

### Generate from SQL DDL Schema
```javascript
// Node.js: read .sql file
import { generateFromDDL } from './src/node.js';
await generateFromDDL({ schemaFile: 'schema.sql', rows: 20, dialect: 'postgres' });

// Universal: DDL string
import { generateFromSchema } from './src/schema-generator.js';
generateFromSchema({ ddl: createTableSQL, rows: 10 });

// Parse-only
import { parseDDL, orderByDependencies } from './src/ddl-parser.js';
const tables = orderByDependencies(parseDDL(ddlString));
```

---

## 🧪 Testing

```bash
npm test                             # All tests
npm test -- core.test.js            # Specific file
npm test -- ddl-parser.test.js      # DDL parser tests
npm test -- schema-generator.test.js # FK orchestrator tests
npm test -- sql-schema.test.js      # SQL DDL/DML tests
npm run test:coverage               # With coverage
```

**Required**: 100% coverage, all tests pass

---

## ✅ Code Checklist

Every change must:
- [ ] Use ES Modules (import/export)
- [ ] No Node/browser in `src/core.js`
- [ ] Pure functions where possible
- [ ] Destructured options objects
- [ ] Descriptive error messages
- [ ] Has tests (100% coverage)
- [ ] JSDoc comments
- [ ] Follows patterns

---

## 🚫 Never Do

- ❌ `require()` or `module.exports`
- ❌ Node.js/browser code in `src/core.js`
- ❌ Direct `faker` access (use `getFaker()`)
- ❌ Submit without tests
- ❌ Submit without maintaining 100% coverage

---

## 💡 Code Patterns

### Function Signature
```javascript
export function myFunction({ param1, param2 = default }) {
  // Pure logic
  return result;
}
```

### Error Handling
```javascript
if (!valid) {
  throw new Error(`Descriptive message with context: ${value}`);
}
```

### CSV Escaping
```javascript
if (value.includes(',') || value.includes('"') || value.includes('\n')) {
  return `"${value.replace(/"/g, '""')}"`;
}
```

---

## 🎨 Type Resolution Order

1. Special types (`autoIncrement`, `enum:*`, `range:*`, `pattern:*`)
2. `fakerTypes` mapping
3. Literal value

---

## 📦 Dependencies

- `@faker-js/faker` - Data generation
- `csv-writer`, `exceljs`, `xml2js` - Formatters (Node.js)
- `js-yaml`, `@iarna/toml` - YAML/TOML formatters
- `yargs` - CLI
- `jest` - Testing
- `esbuild` - Browser bundles

---

## 🔍 Find Code

| What | Where |
|------|-------|
| Generate data | `src/core.js` → `generateRows()` |
| Parse columns | `src/core.js` → `parseColumns()` |
| Data types | `src/core.js` → `fakerTypes` |
| Templates | `src/core.js` → `templates` |
| CSV format | `src/formatters.js` → `toCSV()` |
| JSON format | `src/formatters.js` → `toJSON()` |
| SQL DDL/DML | `src/sql-schema.js` → `generateDDL()`, `generateInserts()` |
| Parse SQL schema | `src/ddl-parser.js` → `parseDDL()`, `orderByDependencies()` |
| FK-aware generation | `src/schema-generator.js` → `generateFromSchema()` |
| DDL file import | `src/node.js` → `generateFromDDL()` |

---

## 🎯 Success Formula

```
1. Read AI_CONTEXT.md (5 min)
2. Identify task type
3. Follow pattern from docs
4. Write tests
5. Run: npm test
6. Verify: 100% coverage
7. Done!
```

---

## 🔑 Key Principles

1. **Universal Core** - core.js = no env deps
2. **ES Modules** - import/export only
3. **Pure Functions** - no side effects
4. **100% Coverage** - all code tested
5. **Options Objects** - destructured params
6. **FK Integrity** - `schema-generator.js` `pkStore` ensures valid FK references

---

## ⚙️ Quick Commands

```bash
npm test                    # Test
npm run test:coverage       # Coverage
npm run build              # Build
node cli.js --help         # CLI help
node cli.js --list-types   # Show types
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Faker not initialized" | Call `setFaker(faker)` |
| "Module not found" | Use ES modules flag |
| Tests fail | Check patterns in tests/ |
| Coverage drop | Add tests |

---

## 📖 When Stuck

1. Check similar code in project
2. Read tests for examples
3. Consult AI_WORKFLOWS.md
4. Review ARCHITECTURE.md

---

**Project Values**: Simplicity · Universality · Testability

---

**Version**: 1.1.0 | **Updated**: 2026-02-22 | **Status**: ✅ Ready
