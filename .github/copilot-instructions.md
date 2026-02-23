# GitHub Copilot Instructions

> Custom instructions for GitHub Copilot when working in this project

## Project Context

This is **Ficta** - a universal test data generator that works in Node.js, browsers, and CLI. It generates realistic fake data in multiple formats (CSV, JSON, XML, Excel, TSV, SQL, YAML, TOML, Parquet) using Faker.js.

**Test suite:** 921 tests across 13 suites, 100% coverage.

**Key modules (beyond core adapters):**
- `src/infer.js` — infer Ficta column types from existing data rows
- `src/openapi-bridge.js` — convert OpenAPI 3.x/JSON Schema → Ficta schema
- `src/graphql-bridge.js` — convert GraphQL SDL → Ficta schema
- `ficta-schema.v1.json` — JSON Schema for `ficta.schema.json` files

**CLI subcommands:** `ficta schema <file>`, `ficta infer <file>`, `ficta from-openapi <file>`, `ficta from-graphql <file>`

## Code Style & Patterns

### Language & Modules
- Use **ES Modules** exclusively (import/export, no require/module.exports)
- Write **functional, pure functions** where possible
- Prefer **const** over let, never use var
- Use **async/await** over raw promises

### Function Signatures
- Use **destructured options objects** for functions with multiple parameters:
  ```javascript
  // ✅ Good
  function generateData({ columns, rows = 100, format = 'csv' }) { }
  
  // ❌ Avoid
  function generateData(columns, rows, format) { }
  ```

### Naming Conventions
- Functions: `camelCase` (e.g., `generateData`, `parseColumns`)
- Constants: `UPPER_SNAKE_CASE` for true constants
- Files: `kebab-case.js` for filenames
- Column names: `camelCase` internally, convert to Title Case for output

### Error Handling
- Always throw descriptive errors with context:
  ```javascript
  if (!templates[template]) {
    throw new Error(`Unknown template: ${template}. Available: ${Object.keys(templates).join(', ')}`);
  }
  ```

## Core Architectural Principles

### 1. Universal Core
- `src/core.js` must have **ZERO** Node.js or browser-specific code
- All environment-specific code goes in adapters (`node.js`, `browser.js`)
- Use dependency injection for Faker via `setFaker()`

### 2. Pure Functions First
- Generate functions should be pure (same input → same output)
- Side effects (file I/O, downloads) only in adapters
- Example:
  ```javascript
  // ✅ Pure (in core.js)
  export function generateData({ columns, rows = 100 }) {
    const parsed = parseColumns(columns);
    const records = Array.from({ length: rows }, (_, i) => generateRow(parsed, i + 1));
    return { records, columns: parsed, rowCount: records.length };
  }
  
  // ✅ Side effect (in node.js)
  export async function generateAndSave(options) {
    const data = await generateData(options);
    await fs.promises.writeFile(options.output, data);
  }
  ```

### 3. Format Detection
- Always auto-detect format from file extension when possible
- Use explicit format parameter as override
- Pattern:
  ```javascript
  const format = options.format || detectFormat(options.output) || 'csv';
  ```

## Common Patterns

### Parsing Column Definitions
```javascript
// Pattern: "name:type,name:type:options"
function parseColumns(columnString) {
  return columnString.split(',').map(col => {
    const [name, ...typeParts] = col.trim().split(':');
    return { name, type: typeParts.join(':') || name };
  });
}
```

### Type Resolution
```javascript
// Order: special types → fakerTypes → literal
if (type === 'autoIncrement') return counter;
if (type.startsWith('enum:')) return handleEnum(type.substring(5));
if (type.startsWith('range:')) return handleRange(type.substring(6));
if (fakerTypes[type]) return fakerTypes[type]();
return type; // Fallback to literal
```

### Formatter Pattern
```javascript
export function toFormatName(records, columns, options = {}) {
  // Validate inputs
  if (!Array.isArray(records) || records.length === 0) {
    return ''; // or appropriate empty format
  }
  
  // Build output
  const output = /* format-specific logic */;
  return output;
}
```

## Testing Requirements

### Test Coverage
- **Target: 100% coverage** - All new code must be tested
- Run tests: `npm test`
- Check coverage: `npm run test:coverage`

### Test Structure
```javascript
import { functionName } from '../src/module.js';

describe('functionName', () => {
  test('should handle normal case', () => {
    const result = functionName(input);
    expect(result).toEqual(expected);
  });
  
  test('should handle edge case', () => {
    expect(() => functionName(invalid)).toThrow('Expected error');
  });
});
```

### Running Tests
```bash
# Jest with ES modules requires this flag
npm test
# Uses: node --experimental-vm-modules node_modules/jest/bin/jest.js
```

## File Organization

### Where to Add Code

| What | Where |
|------|-------|
| New Faker type | `src/core.js` → `fakerTypes` object |
| New template | `src/core.js` → `templates` object |
| New special type | `src/core.js` → Add handler + update `generateRow()` |
| New format (Node) | `src/formatters.js` → Add `toFormatName()` + update `node.js` |
| Shared format util | `src/formatters.shared.js` → Pure CSV/JSON/TSV helpers |
| New format (Browser) | `src/formatters.browser.js` → Add `toFormatName()` |
| CLI option/subcommand | `cli.js` → Update yargs config |
| Fluent schema | `src/schema-builder.js` → `table()` / `schema()` |
| Plugin type/template | `src/core.js` → `registerType()` / `registerTemplate()` |
| Schema inference logic | `src/infer.js` → `inferSchema()` |
| OpenAPI conversion | `src/openapi-bridge.js` → `openAPIToFictaSchema()` |
| GraphQL conversion | `src/graphql-bridge.js` → `graphQLToFictaSchema()` |
| Tests | `tests/[module].test.js` |

## Common Tasks

### Adding a Faker Data Type
```javascript
// 1. Add to fakerTypes in src/core.js
export const fakerTypes = {
  // ... existing types
  myNewType: () => getFaker().category.method(),
};

// 2. Add test in tests/core.test.js
test('generates myNewType data', () => {
  const result = generateData({ columns: 'field:myNewType', rows: 1 });
  expect(result.records[0].field).toBeDefined();
});
```

### Adding a Template
```javascript
// In src/core.js
export const templates = {
  // ... existing
  myTemplate: "id:autoIncrement,field1:type1,field2:type2",
};
```

### Adding an Output Format
```javascript
// 1. Add formatter (src/formatters.js)
export function toMyFormat(records, columns) {
  // Implementation
  return formattedString;
}

// 2. Update generateData (src/node.js)
switch (format) {
  // ... existing
  case 'myformat':
    return toMyFormat(records, columns);
}

// 3. Update CLI (cli.js)
.option('format', {
  choices: ['csv', 'json', 'xml', 'xlsx', 'tsv', 'sql', 'yaml', 'yml', 'toml', 'parquet', 'myformat']
})

// 4. Add tests (tests/formatters.test.js)
```

### Infer Schema from Existing Data
```javascript
import { inferSchemaFromFile } from './src/node.js';
const { columns } = await inferSchemaFromFile('./data.csv');
// CLI: ficta infer ./data.csv
```

### Convert OpenAPI/GraphQL to ficta.schema.json
```javascript
// OpenAPI
import { fromOpenAPIFile } from './src/node.js';
const schema = await fromOpenAPIFile('./openapi.yaml', { rows: 50 });

// GraphQL
import { fromGraphQLFile } from './src/node.js';
const schema2 = await fromGraphQLFile('./schema.graphql', { typeName: 'User' });
// CLI: ficta from-openapi ./openapi.yaml -o ficta.schema.json
// CLI: ficta from-graphql ./schema.graphql -o ficta.schema.json
```

## Code Quality Checklist

When suggesting code, ensure:
- [ ] Uses ES Modules (import/export)
- [ ] Follows pure function pattern where possible
- [ ] Uses destructured options objects
- [ ] Includes descriptive error messages
- [ ] Has corresponding test coverage
- [ ] Environment-specific code is in correct adapter
- [ ] CSV values are properly escaped
- [ ] Documentation comments (JSDoc) for public functions

## Documentation Style

Use JSDoc for public functions:
```javascript
/**
 * Brief description
 * @param {Type} paramName - Description
 * @returns {Type} Description
 * @example
 * const result = myFunction({ option: 'value' });
 */
export function myFunction({ option }) {
  // Implementation
}
```

## Dependencies

### Production
- `@faker-js/faker` - Test data generation
- `exceljs` - Excel file generation
- `xml2js` - XML parsing/building
- `js-yaml` - YAML formatting
- `@iarna/toml` - TOML formatting
- `yargs` - CLI argument parsing
- `graphql` - GraphQL SDL parsing (for `graphql-bridge.js`)
- `parquetjs-lite` - Parquet file generation (Node.js)

### Development
- `jest` - Testing framework
- `esbuild` - Browser bundle building
- `csv-parse` - CSV parsing for tests
- `c8` - Coverage collection

> Note: `csv-writer` is **not** a dependency. CSV output is handled by the built-in `toCSV()` in `src/formatters.shared.js`.

Always use these existing dependencies before suggesting new ones.

## Helpful Context Files

For more detailed guidance, refer to:
- **AI_CONTEXT.md** - Quick project overview
- **AGENTS.md** - Comprehensive AI integration guide
- **ARCHITECTURE.md** - Deep technical details
- **README.md** - User-facing documentation

## Special Notes

### Faker Lazy Loading
Faker is lazily initialized. Always call `getFaker()` instead of accessing directly:
```javascript
// ✅ Good
const value = getFaker().person.fullName();

// ❌ Bad
const value = faker.person.fullName(); // May not be initialized
```

### Browser vs Node.js
Check environment before using environment-specific APIs:
```javascript
if (typeof window !== 'undefined') {
  // Browser code
} else {
  // Node.js code
}
```

### CSV Escaping
Always escape CSV values containing special characters:
```javascript
if (value.includes(',') || value.includes('"') || value.includes('\n')) {
  return `"${value.replace(/"/g, '""')}"`;
}
```

## Performance Tips

- For large datasets (>100k rows), consider chunking
- Excel generation is memory-intensive; use streaming for huge files
- Browser downloads work best with <50MB files
- Use appropriate data types (avoid heavy types like `paragraph` for large datasets)

---

**Remember:** This project values simplicity, universality, and developer experience. When in doubt, favor readable code over clever optimizations.
