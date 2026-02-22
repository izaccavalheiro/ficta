# AI Workflows - Ficta

> **Step-by-step workflows for common AI-assisted development tasks**

This guide provides detailed workflows for AI assistants to handle typical development tasks in the Ficta project.

---

## Table of Contents

- [Workflow 1: Add New Faker Data Type](#workflow-1-add-new-faker-data-type)
- [Workflow 2: Add New Template](#workflow-2-add-new-template)
- [Workflow 3: Add New Output Format](#workflow-3-add-new-output-format)
- [Workflow 4: Add Special Type Handler](#workflow-4-add-special-type-handler)
- [Workflow 5: Fix Formatter Bug](#workflow-5-fix-formatter-bug)
- [Workflow 6: Add CLI Option](#workflow-6-add-cli-option)
- [Workflow 7: Improve Performance](#workflow-7-improve-performance)
- [Workflow 8: Add Validation](#workflow-8-add-validation)
- [Workflow 9: Update Documentation](#workflow-9-update-documentation)
- [Workflow 10: Refactor Code](#workflow-10-refactor-code)

---

## Workflow 1: Add New Faker Data Type

### Objective
Add a new data type powered by Faker.js (e.g., `ipv6`, `mac`, `timezone`)

### Steps

#### Step 1: Research Faker API
```javascript
// Check if Faker has the method
// Visit: https://fakerjs.dev/api/
// Example: faker.internet.ipv6()
```

#### Step 2: Locate fakerTypes Object
- File: `src/core.js`
- Section: `export const fakerTypes = {`

#### Step 3: Add New Type
```javascript
export const fakerTypes = {
  // ... existing types
  
  // Add your new type (with JSDoc for clarity)
  ipv6: () => getFaker().internet.ipv6(),
  macAddress: () => getFaker().internet.mac(),
  timezone: () => getFaker().location.timeZone(),
};
```

#### Step 4: Create Test
- File: `tests/core.test.js`

```javascript
test('generates ipv6 addresses', () => {
  const columns = parseColumns('ip:ipv6');
  const rows = generateRows(columns, 5);
  
  rows.forEach(row => {
    expect(row.ip).toBeDefined();
    expect(row.ip).toMatch(/^[0-9a-f:]+$/i); // Basic IPv6 pattern
  });
});

test('generates MAC addresses', () => {
  const columns = parseColumns('mac:macAddress');
  const rows = generateRows(columns, 5);
  
  rows.forEach(row => {
    expect(row.mac).toBeDefined();
    expect(row.mac).toMatch(/^[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}$/i);
  });
});
```

#### Step 5: Run Tests
```bash
npm test -- core.test.js
```

#### Step 6: Verify Coverage
```bash
npm run test:coverage
# Ensure 100% coverage maintained
```

#### Step 7: Update Documentation (Optional)
If adding significant type, update README.md data types section.

### Success Criteria
- [ ] Type added to `fakerTypes`
- [ ] Test passes
- [ ] Coverage remains 100%
- [ ] Type generates expected data

---

## Workflow 2: Add New Template

### Objective
Add a predefined column set for common use case (e.g., `employees`, `orders`)

### Steps

#### Step 1: Define Column String
Plan what columns the template needs:
```
employees: id, firstName, lastName, email, jobTitle, department, phone, hireDate
```

#### Step 2: Locate templates Object
- File: `src/core.js`
- Section: `export const templates = {`

#### Step 3: Add Template
```javascript
export const templates = {
  // ... existing templates
  
  employees: "id:autoIncrement,firstName,lastName,email,jobTitle,department,phone,hireDate:recentDate",
  
  orders: "orderId:autoIncrement,customerId:range:1-1000,productId:range:1-500,quantity:range:1-100,amount:price,orderDate:recentDate,status:enum:pending|processing|shipped|delivered",
};
```

#### Step 4: Create Test
- File: `tests/core.test.js`

```javascript
test('employees template generates correct columns', () => {
  const columns = parseColumns(templates.employees);
  const rows = generateRows(columns, 10);
  
  expect(rows).toHaveLength(10);
  expect(rows[0]).toHaveProperty('id');
  expect(rows[0]).toHaveProperty('firstName');
  expect(rows[0]).toHaveProperty('email');
  expect(rows[0]).toHaveProperty('jobTitle');
  expect(rows[0].id).toBe(1);
  expect(rows[1].id).toBe(2);
});

test('orders template generates valid data', () => {
  const columns = parseColumns(templates.orders);
  const rows = generateRows(columns, 10);
  
  rows.forEach(row => {
    expect(row.orderId).toBeGreaterThan(0);
    expect(row.customerId).toBeGreaterThanOrEqual(1);
    expect(row.customerId).toBeLessThanOrEqual(1000);
    expect(['pending', 'processing', 'shipped', 'delivered']).toContain(row.status);
  });
});
```

#### Step 5: Test CLI Usage
```bash
node cli.js -t employees -r 100 -o test-employees.csv
# Verify file is created with correct columns
cat test-employees.csv | head -5
rm test-employees.csv
```

#### Step 6: Run Tests
```bash
npm test
```

#### Step 7: Update Documentation
- File: `README.md`
- Add template to "Templates" section

### Success Criteria
- [ ] Template added to `templates` object
- [ ] Tests pass
- [ ] CLI works with template
- [ ] Documentation updated

---

## Workflow 3: Add New Output Format

### Objective
Add support for new output format (e.g., YAML, Parquet, XML variations)

### Steps

#### Step 1: Research Format Requirements
- Determine if library needed
- Check browser compatibility
- Assess complexity

#### Step 2: Add Formatter (Node.js)
- File: `src/formatters.js`

```javascript
/**
 * Convert array of objects to YAML string
 * @param {Array} records - Array of row objects
 * @returns {string} YAML string
 */
export function toYAML(records) {
  if (records.length === 0) return '';
  
  // Simple YAML implementation (or use library)
  let yaml = '---\n';
  records.forEach((record, index) => {
    yaml += `- # Record ${index + 1}\n`;
    Object.entries(record).forEach(([key, value]) => {
      const yamlValue = typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : value;
      yaml += `  ${key}: ${yamlValue}\n`;
    });
  });
  return yaml;
}
```

#### Step 3: Add Formatter (Browser)
- File: `src/formatters.browser.js`

```javascript
// Add same or simplified version for browser
export function toYAML(records) {
  // Browser-compatible implementation
  // (usually same as Node.js version if no special libraries)
}
```

#### Step 4: Update Node.js API
- File: `src/node.js`

```javascript
import { toCSV, toJSON, toXML, toExcel, toTSV, toSQL, toYAML, toTOML } from './formatters.js';

export async function generateData(options) {
  // ... existing code
  
  switch (format) {
    case 'csv':
      return toCSV(records, columns);
    case 'json':
      return toJSON(records);
    // ... other cases
    case 'yaml':
      return toYAML(records);
    default:
      return toCSV(records, columns);
  }
}
```

#### Step 5: Update Browser API
- File: `src/browser.js`

```javascript
import { toCSV, toJSON, toXML, toYAML, toTOML } from './formatters.browser.js';

export function generateData({ columns, rows = 100, format = 'csv', template }) {
  // ... existing code
  
  switch (format) {
    // ... existing cases
    case 'yaml':
      data = toYAML(records);
      return data;
    default:
      return toCSV(records, columns);
  }
}
```

#### Step 6: Add Format Detection
- File: `src/node.js`

```javascript
function detectFormat(filename) {
  if (!filename) return null;
  const ext = filename.split('.').pop().toLowerCase();
  const formatMap = {
    csv: 'csv',
    json: 'json',
    xml: 'xml',
    xlsx: 'xlsx',
    tsv: 'tsv',
    sql: 'sql',
    yaml: 'yaml',  // Add new format
    yml: 'yaml'    // Alternative extension
  };
  return formatMap[ext] || null;
}
```

#### Step 7: Update CLI
- File: `cli.js`

```javascript
.option('format', {
  alias: 'f',
  describe: 'Output format',
  type: 'string',
  choices: ['csv', 'json', 'xml', 'xlsx', 'tsv', 'sql', 'yaml', 'yml', 'toml']  // Updated
})
```

#### Step 8: Add Tests
- File: `tests/formatters.test.js`

```javascript
import { toYAML } from '../src/formatters.js';

describe('toYAML', () => {
  test('converts records to YAML format', () => {
    const records = [
      { id: 1, name: 'John', email: 'john@example.com' },
      { id: 2, name: 'Jane', email: 'jane@example.com' }
    ];
    
    const yaml = toYAML(records);
    
    expect(yaml).toContain('---');
    expect(yaml).toContain('id: 1');
    expect(yaml).toContain('name: "John"');
    expect(yaml).toContain('email: "john@example.com"');
  });
  
  test('handles empty records', () => {
    const yaml = toYAML([]);
    expect(yaml).toBe('');
  });
  
  test('escapes special characters', () => {
    const records = [{ text: 'Hello "World"' }];
    const yaml = toYAML(records);
    expect(yaml).toContain('Hello \\"World\\"');
  });
});
```

#### Step 9: Integration Test
- File: `tests/node.test.js`

```javascript
test('generateAndSave creates YAML file', async () => {
  const filename = 'test-output.yaml';
  
  await generateAndSave({
    columns: 'id:autoIncrement,name',
    rows: 3,
    output: filename
  });
  
  expect(fs.existsSync(filename)).toBe(true);
  const content = fs.readFileSync(filename, 'utf-8');
  expect(content).toContain('---');
  expect(content).toContain('id:');
  expect(content).toContain('name:');
  
  fs.unlinkSync(filename);
});
```

#### Step 10: Run All Tests
```bash
npm test
npm run test:coverage
```

#### Step 11: Update Documentation
- File: `README.md`
- Add YAML, YML, and TOML to supported formats list
- Add example

### Success Criteria
- [ ] Formatter added to both Node.js and browser
- [ ] API updated for new format
- [ ] CLI supports new format
- [ ] Format detection works
- [ ] Tests pass with 100% coverage
- [ ] Documentation updated

---

## Workflow 4: Add Special Type Handler

### Objective
Add a custom special type with complex logic (e.g., `uuid4`, `slug`, `hash`)

### Steps

#### Step 1: Design Type Syntax
```
Examples:
- slug:prefix-value → "prefix-value-abc123"
- hash:md5:text → "5d41402abc4b2a76b9719d911017c592"
- weighted:10:high|5:medium|1:low → Weighted random selection
```

#### Step 2: Create Handler Function
- File: `src/core.js`

```javascript
/**
 * Handle weighted random selection
 * Format: "weighted:weight:value|weight:value"
 * @param {string} options - Options string
 * @returns {string} Selected value
 */
function handleWeighted(options) {
  const pairs = options.split('|').map(pair => {
    const [weight, value] = pair.split(':');
    return { weight: parseInt(weight, 10), value };
  });
  
  const totalWeight = pairs.reduce((sum, pair) => sum + pair.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const pair of pairs) {
    random -= pair.weight;
    if (random <= 0) {
      return pair.value;
    }
  }
  
  return pairs[pairs.length - 1].value;
}
```

#### Step 3: Update generateValue Function
- File: `src/core.js`

```javascript
function generateValue(column, counter) {
  const type = column.type || column.name;
  
  // Check for special types
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
  
  // ✨ Add new special type
  if (type.startsWith('weighted:')) {
    return handleWeighted(type.substring(9));
  }
  
  // Check fakerTypes
  if (fakerTypes[type]) {
    return fakerTypes[type]();
  }
  
  return type;
}
```

#### Step 4: Add Tests
- File: `tests/core.test.js`

```javascript
describe('weighted special type', () => {
  test('generates weighted values', () => {
    const columns = parseColumns('priority:weighted:10:high|5:medium|1:low');
    const rows = generateRows(columns, 1000);
    
    const counts = { high: 0, medium: 0, low: 0 };
    rows.forEach(row => {
      counts[row.priority]++;
    });
    
    // High should appear ~625 times (10/16 * 1000)
    // Medium should appear ~312 times (5/16 * 1000)
    // Low should appear ~62 times (1/16 * 1000)
    expect(counts.high).toBeGreaterThan(500);
    expect(counts.medium).toBeGreaterThan(200);
    expect(counts.low).toBeGreaterThan(20);
    expect(counts.high).toBeGreaterThan(counts.medium);
    expect(counts.medium).toBeGreaterThan(counts.low);
  });
  
  test('handles single weighted value', () => {
    const columns = parseColumns('single:weighted:1:only');
    const rows = generateRows(columns, 5);
    
    rows.forEach(row => {
      expect(row.single).toBe('only');
    });
  });
});
```

#### Step 5: Run Tests
```bash
npm test -- core.test.js
```

#### Step 6: Add Documentation
- File: `README.md`
- Add to "Special Types" section

### Success Criteria
- [ ] Handler function created
- [ ] Integrated into `generateValue()`
- [ ] Tests pass
- [ ] Coverage maintained
- [ ] Documented

---

## Workflow 5: Fix Formatter Bug

### Objective
Fix a bug in format conversion (e.g., CSV escaping, JSON encoding, XML structure)

### Steps

#### Step 1: Reproduce Bug
Create failing test that demonstrates the issue:

```javascript
test('CSV handles newlines in values correctly', () => {
  const records = [
    { id: 1, description: 'Line 1\nLine 2' }
  ];
  const columns = [{ name: 'id' }, { name: 'description' }];
  
  const csv = toCSV(records, columns);
  
  // Should escape newlines with quotes
  expect(csv).toContain('"Line 1\nLine 2"');
});
```

#### Step 2: Run Test to Confirm Failure
```bash
npm test -- formatters.test.js
```

#### Step 3: Locate Affected Code
- File: `src/formatters.js`
- Function: `toCSV()` or specific formatter

#### Step 4: Fix the Issue
```javascript
export function toCSV(records, columns) {
  // ... existing code
  
  const dataRows = records.map(record => {
    return parsedColumns.map(col => {
      const value = record[col.name];
      
      // FIX: Add newline to conditions requiring escaping
      if (typeof value === 'string' && (
        value.includes(',') || 
        value.includes('"') || 
        value.includes('\n') ||  // ✨ Added
        value.includes('\r')     // ✨ Added
      )) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  return [headerRow, ...dataRows].join('\n');
}
```

#### Step 5: Run Tests
```bash
npm test -- formatters.test.js
```

#### Step 6: Check for Regressions
```bash
npm test  # Run all tests
npm run test:coverage
```

#### Step 7: Add Edge Case Tests
```javascript
test('CSV handles all edge cases', () => {
  const records = [
    { text: 'normal' },
    { text: 'with,comma' },
    { text: 'with"quote' },
    { text: 'with\nnewline' },
    { text: 'with\r\nCRLF' },
    { text: 'all,\n"combined' }
  ];
  const columns = [{ name: 'text' }];
  
  const csv = toCSV(records, columns);
  const lines = csv.split('\n');
  
  expect(lines[1]).toBe('normal');
  expect(lines[2]).toBe('"with,comma"');
  expect(lines[3]).toBe('"with""quote"');
  expect(lines[4]).toBe('"with\nnewline"');
});
```

#### Step 8: Update Browser Formatter
If bug affects browser, apply same fix to `src/formatters.browser.js`

### Success Criteria
- [ ] Bug reproduced with test
- [ ] Fix applied
- [ ] Test passes
- [ ] No regressions
- [ ] Edge cases covered

---

## Workflow 6: Add CLI Option

### Objective
Add a new command-line option (e.g., `--seed`, `--locale`, `--batch-size`)

### Steps

#### Step 1: Define Option
Plan the option:
- Name: `--seed`
- Purpose: Set Faker random seed for reproducible data
- Type: number
- Default: undefined

#### Step 2: Add to CLI
- File: `cli.js`

```javascript
.option('seed', {
  alias: 's',
  describe: 'Random seed for reproducible data generation',
  type: 'number'
})
```

#### Step 3: Handle Option in generateData
- File: `src/node.js` or `src/core.js`

```javascript
export async function generateData(options) {
  const {
    columns: columnsOption,
    rows = 100,
    format: formatOption,
    template,
    output,
    seed,  // ✨ New option
    ...formatOptions
  } = options;
  
  // Set seed if provided
  if (seed !== undefined) {
    getFaker().seed(seed);
  }
  
  // ... rest of function
}
```

#### Step 4: Add Tests
- File: `tests/cli.test.js`

```javascript
test('--seed option generates reproducible data', async () => {
  const output1 = 'test-seed1.csv';
  const output2 = 'test-seed2.csv';
  
  // Generate with seed
  await generateAndSave({
    columns: 'name:fullName,email',
    rows: 10,
    output: output1,
    seed: 12345
  });
  
  // Generate again with same seed
  await generateAndSave({
    columns: 'name:fullName,email',
    rows: 10,
    output: output2,
    seed: 12345
  });
  
  const content1 = fs.readFileSync(output1, 'utf-8');
  const content2 = fs.readFileSync(output2, 'utf-8');
  
  expect(content1).toBe(content2); // Should be identical
  
  fs.unlinkSync(output1);
  fs.unlinkSync(output2);
});

test('different seeds generate different data', async () => {
  const output1 = 'test-seed-a.csv';
  const output2 = 'test-seed-b.csv';
  
  await generateAndSave({
    columns: 'name:fullName',
    rows: 10,
    output: output1,
    seed: 11111
  });
  
  await generateAndSave({
    columns: 'name:fullName',
    rows: 10,
    output: output2,
    seed: 22222
  });
  
  const content1 = fs.readFileSync(output1, 'utf-8');
  const content2 = fs.readFileSync(output2, 'utf-8');
  
  expect(content1).not.toBe(content2);
  
  fs.unlinkSync(output1);
  fs.unlinkSync(output2);
});
```

#### Step 5: Update Help Example
- File: `cli.js`

```javascript
.example('$0 -c "id,name" -r 100 -s 12345 -o data.csv', 'Generate with seed for reproducibility')
```

#### Step 6: Run Tests
```bash
npm test
```

#### Step 7: Test CLI Manually
```bash
node cli.js -c "name:fullName,email" -r 10 -s 12345 -o test1.csv
node cli.js -c "name:fullName,email" -r 10 -s 12345 -o test2.csv
diff test1.csv test2.csv  # Should be identical
rm test1.csv test2.csv
```

#### Step 8: Update Documentation
- File: `README.md`
- Add option to CLI section

### Success Criteria
- [ ] Option added to yargs config
- [ ] Option handled in logic
- [ ] Tests pass
- [ ] Manual testing confirms behavior
- [ ] Documentation updated

---

## Workflow 7: Improve Performance

### Objective
Optimize performance for large dataset generation

### Steps

#### Step 1: Benchmark Current Performance
```javascript
// tests/performance.test.js
test('benchmark: generate 100k rows', () => {
  const columns = parseColumns('id:autoIncrement,name:fullName,email,phone');
  
  const start = Date.now();
  const rows = generateRows(columns, 100000);
  const duration = Date.now() - start;
  
  console.log(`Generated 100k rows in ${duration}ms`);
  expect(rows).toHaveLength(100000);
});
```

#### Step 2: Profile Code
Identify bottlenecks:
- Which functions take most time?
- Are there unnecessary object creations?
- Can loops be optimized?

#### Step 3: Apply Optimizations

**Example: Optimize parseColumns caching**
```javascript
// Before: Parse columns every time
function generateRows(columns, count) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const row = {};
    for (const column of columns) {
      row[column.name] = generateValue(column, i + 1);
    }
    rows.push(row);
  }
  return rows;
}

// After: Pre-compute what we can
function generateRows(columns, count) {
  const rows = new Array(count);  // Pre-allocate array
  const columnNames = columns.map(c => c.name);  // Cache names
  
  for (let i = 0; i < count; i++) {
    const row = {};
    const counter = i + 1;
    
    for (let j = 0; j < columns.length; j++) {
      row[columnNames[j]] = generateValue(columns[j], counter);
    }
    rows[i] = row;
  }
  return rows;
}
```

#### Step 4: Benchmark After Optimization
```javascript
test('benchmark: optimized 100k rows', () => {
  const columns = parseColumns('id:autoIncrement,name:fullName,email,phone');
  
  const start = Date.now();
  const rows = generateRows(columns, 100000);
  const duration = Date.now() - start;
  
  console.log(`Optimized: Generated 100k rows in ${duration}ms`);
  expect(duration).toBeLessThan(5000); // Should complete in 5s
});
```

#### Step 5: Verify No Regressions
```bash
npm test  # All tests must pass
npm run test:coverage  # Coverage must remain 100%
```

#### Step 6: Document Performance Characteristics
- File: `ARCHITECTURE.md` or `README.md`
- Add performance notes

### Success Criteria
- [ ] Performance improved (measured)
- [ ] All tests pass
- [ ] No functionality changes
- [ ] Performance documented

---

## Workflow 8: Add Validation

### Objective
Add data validation before generation or output

### Steps

#### Step 1: Define Validation Rules
Examples:
- Column names must not be empty
- Row count must be positive
- Template must exist
- Format must be supported

#### Step 2: Create Validation Function
- File: `src/core.js` or new `src/validators.js`

```javascript
/**
 * Validate generation options
 * @param {Object} options - Generation options
 * @throws {Error} If validation fails
 */
export function validateOptions(options) {
  const { columns, template, rows, format } = options;
  
  // Must have columns or template
  if (!columns && !template) {
    throw new Error('Must provide either columns or template');
  }
  
  // Rows must be positive
  if (rows !== undefined && (rows <= 0 || !Number.isInteger(rows))) {
    throw new Error(`Rows must be a positive integer, got: ${rows}`);
  }
  
  // Template must exist
  if (template && !templates[template]) {
    throw new Error(
      `Unknown template: ${template}. Available: ${Object.keys(templates).join(', ')}`
    );
  }
  
  // Format must be supported
  const validFormats = ['csv', 'json', 'xml', 'xlsx', 'tsv', 'sql', 'yaml', 'yml', 'toml'];
  if (format && !validFormats.includes(format)) {
    throw new Error(
      `Unsupported format: ${format}. Supported: ${validFormats.join(', ')}`
    );
  }
}
```

#### Step 3: Integrate Validation
- File: `src/node.js`

```javascript
export async function generateData(options) {
  // Validate options first
  validateOptions(options);
  
  // ... rest of function
}
```

#### Step 4: Add Tests
- File: `tests/validators.test.js` or `tests/node.test.js`

```javascript
describe('validateOptions', () => {
  test('throws error if no columns or template', () => {
    expect(() => validateOptions({}))
      .toThrow('Must provide either columns or template');
  });
  
  test('throws error for negative rows', () => {
    expect(() => validateOptions({ columns: 'id', rows: -5 }))
      .toThrow('Rows must be a positive integer');
  });
  
  test('throws error for invalid template', () => {
    expect(() => validateOptions({ template: 'nonexistent' }))
      .toThrow('Unknown template: nonexistent');
  });
  
  test('throws error for unsupported format', () => {
    expect(() => validateOptions({ columns: 'id', format: 'pdf' }))
      .toThrow('Unsupported format: pdf');
  });
  
  test('accepts valid options', () => {
    expect(() => validateOptions({ columns: 'id', rows: 100, format: 'csv' }))
      .not.toThrow();
  });
});
```

#### Step 5: Run Tests
```bash
npm test
```

#### Step 6: Update Error Messages in Other Code
Ensure consistent error messaging throughout codebase.

### Success Criteria
- [ ] Validation function created
- [ ] Integrated into API
- [ ] Tests cover all validation rules
- [ ] Error messages are clear and helpful

---

## Workflow 9: Update Documentation

### Objective
Update documentation to reflect code changes

### Steps

#### Step 1: Identify What Changed
- New features?
- API changes?
- Bug fixes?
- Performance improvements?

#### Step 2: Update README.md
- Add new features to features list
- Add examples for new functionality
- Update API reference if needed
- Add to changelog/version history

#### Step 3: Update AGENTS.md
- Add new patterns
- Update API reference
- Add to common tasks section

#### Step 4: Update ARCHITECTURE.md
- Document architectural changes
- Update diagrams if needed
- Add design decisions

#### Step 5: Update AI_CONTEXT.md
- Update quick reference
- Add to hot spots if frequently changing

#### Step 6: Update Code Comments
Ensure JSDoc is up to date:

```javascript
/**
 * Generate test data rows
 * @param {Array<Object>} columns - Column definitions
 * @param {number} count - Number of rows to generate
 * @param {Object} [options] - Additional options
 * @param {number} [options.seed] - Random seed for reproducibility
 * @returns {Array<Object>} Generated data rows
 * @example
 * const columns = parseColumns('id,name');
 * const rows = generateRows(columns, 100);
 */
export function generateRows(columns, count, options = {}) {
  // Implementation
}
```

#### Step 7: Check Examples
Ensure all code examples in docs actually work:

```bash
# Test examples from README
node -e "$(grep -A 5 '```javascript' README.md | head -n 6 | tail -n 5)"
```

#### Step 8: Review Documentation Build
If using documentation generator, rebuild docs:

```bash
# If applicable
npm run docs
```

### Success Criteria
- [ ] All docs reflect current code
- [ ] Examples work when tested
- [ ] No outdated information
- [ ] Clear and consistent

---

## Workflow 10: Refactor Code

### Objective
Improve code quality without changing behavior

### Steps

#### Step 1: Ensure Full Test Coverage
```bash
npm run test:coverage
# Must have 100% coverage before refactoring
```

#### Step 2: Identify Refactoring Target
Examples:
- Extract repeated code into function
- Simplify complex conditionals
- Rename variables for clarity
- Split large functions

#### Step 3: Make One Small Change
```javascript
// Before: Complex nested conditionals
function generateValue(column, counter) {
  const type = column.type || column.name;
  
  if (type === 'autoIncrement') {
    return counter;
  } else {
    if (type.startsWith('enum:')) {
      return handleEnum(type.substring(5));
    } else if (type.startsWith('range:')) {
      return handleRange(type.substring(6));
    } else if (type.startsWith('pattern:')) {
      return handlePattern(type.substring(8), counter);
    } else {
      if (fakerTypes[type]) {
        return fakerTypes[type]();
      } else {
        return type;
      }
    }
  }
}

// After: Early returns, clearer flow
function generateValue(column, counter) {
  const type = column.type || column.name;
  
  // Special types
  if (type === 'autoIncrement') return counter;
  if (type.startsWith('enum:')) return handleEnum(type.substring(5));
  if (type.startsWith('range:')) return handleRange(type.substring(6));
  if (type.startsWith('pattern:')) return handlePattern(type.substring(8), counter);
  
  // Faker types
  if (fakerTypes[type]) return fakerTypes[type]();
  
  // Fallback
  return type;
}
```

#### Step 4: Run Tests Immediately
```bash
npm test
```

#### Step 5: Repeat Small Changes
Continue making incremental improvements, testing after each change.

#### Step 6: Final Test Suite Run
```bash
npm test
npm run test:coverage
```

#### Step 7: Check for Performance Impact
```bash
# If refactoring core logic, benchmark before/after
node -e "const { generateRows, parseColumns } = require('./src/core.js'); console.time('gen'); generateRows(parseColumns('id,name,email'), 100000); console.timeEnd('gen');"
```

### Success Criteria
- [ ] Code is clearer/simpler
- [ ] All tests pass
- [ ] Coverage remains 100%
- [ ] No performance regression
- [ ] Behavior unchanged

---

## Workflow 11: Generate Data from SQL DDL Schema

### Objective
Import an existing SQL schema (`.sql` file or DDL string) and produce realistic, FK-consistent test data

### Use Cases
- Seeding a development database from its real schema
- Generating test fixtures for a relational schema
- Producing INSERT scripts that respect primary/foreign key relationships

---

### Step 1: Choose Entry Point

| Scenario | API |
|----------|-----|
| Node.js, read a `.sql` file | `generateFromDDL()` in `src/node.js` |
| Universal (browser or Node.js), DDL string | `generateFromSchema()` in `src/schema-generator.js` |
| Parse only, no generation | `parseDDL()` in `src/ddl-parser.js` |

---

### Step 2A: Node.js — Generate from a `.sql` File

```javascript
import { generateFromDDL } from './src/node.js';

const sql = await generateFromDDL({
  schemaFile: './db/schema.sql',   // Required: path to DDL file
  rows: 20,                        // Rows per table (default: 10)
  outputMode: 'ddl+insert',        // 'insert' | 'upsert' | 'truncate+insert' | 'ddl+insert'
  dialect: 'postgres',             // 'postgres' | 'mysql' | 'sqlite' | 'generic'
  output: './db/seed.sql'          // Optional: write SQL to file
});

console.log(sql);
```

**Valid `outputMode` values:**
- `insert` — only `INSERT INTO` statements
- `upsert` — dialect-aware `UPSERT` / `ON CONFLICT DO UPDATE`
- `truncate+insert` — `TRUNCATE` then `INSERT`
- `ddl+insert` — full `CREATE TABLE` + `INSERT`

---

### Step 2B: Universal — Generate from a DDL String

```javascript
import { faker } from '@faker-js/faker';
import { setFaker } from './src/core.js';
import { generateFromSchema } from './src/schema-generator.js';

setFaker(faker); // Initialize Faker once

const sql = generateFromSchema({
  ddl: `
    CREATE TABLE users (
      id   SERIAL PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255) UNIQUE NOT NULL
    );
    CREATE TABLE posts (
      id      SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      title   VARCHAR(255)
    );
  `,
  rows: 15,
  outputMode: 'ddl+insert',
  dialect: 'postgres'
});

console.log(sql);
```

---

### Step 2C: Parse DDL Manually (no generation)

```javascript
import { parseDDL, orderByDependencies } from './src/ddl-parser.js';

const tables = parseDDL(rawDDLString);
// tables[i] = { tableName, columns, primaryKey, foreignKeys }
// columns[j] = { name, sqlType, fictaType, nullable, autoIncrement, defaultValue, enumValues }

// Sort tables so parents precede children
const ordered = orderByDependencies(tables);
ordered.forEach(t => console.log(t.tableName, t.foreignKeys));
```

---

### Step 3: Understand FK-Aware Generation

The orchestrator (`schema-generator.js`) maintains a `pkStore`:

```
pkStore = {
  users:  { id: [1, 2, 3, ...] },
  orders: { id: [101, 102, ...] }
}
```

- After generating each **parent** table, its PK values are saved to `pkStore`.
- When generating **child** tables, FK columns sample from `pkStore` to ensure valid references.
- Tables are processed in topological dependency order so parents always precede children.

---

### Step 4: Run Tests for DDL Workflow

```bash
# DDL parser tests
npm test -- ddl-parser.test.js

# Schema generator tests
npm test -- schema-generator.test.js

# SQL DDL/DML generator tests
npm test -- sql-schema.test.js
```

---

### Step 5: Add Tests for New DDL Features

When extending `ddl-parser.js`, `schema-generator.js`, or `sql-schema.js`, follow this pattern:

```javascript
// tests/ddl-parser.test.js
import { parseDDL } from '../src/ddl-parser.js';

test('parses ENUM column', () => {
  const [table] = parseDDL(`
    CREATE TABLE items (
      status ENUM('active', 'inactive') NOT NULL
    );
  `);
  expect(table.columns[0].enumValues).toEqual(['active', 'inactive']);
  expect(table.columns[0].fictaType).toMatch(/^enum:/);
});

// tests/schema-generator.test.js
import { generateFromSchema } from '../src/schema-generator.js';

test('generates FK-consistent data', () => {
  const sql = generateFromSchema({
    ddl: `
      CREATE TABLE parents (id SERIAL PRIMARY KEY);
      CREATE TABLE children (id SERIAL PRIMARY KEY, parent_id INT REFERENCES parents(id));
    `,
    rows: 3
  });
  expect(sql).toContain('INSERT INTO parents');
  expect(sql).toContain('INSERT INTO children');
  // parents must appear before children
  const parentIdx = sql.indexOf('INSERT INTO parents');
  const childIdx  = sql.indexOf('INSERT INTO children');
  expect(parentIdx).toBeLessThan(childIdx);
});
```

---

### Success Criteria
- [ ] SQL output passes a linter or can be executed against the target database
- [ ] Child FK values reference existing parent PKs
- [ ] Chosen `dialect` and `outputMode` are reflected in the output
- [ ] All DDL-related tests pass (`npm test -- ddl-parser schema-generator sql-schema`)
- [ ] Overall coverage stays at 100%

---

## General Workflow Tips

### Before Starting Any Task
1. Read relevant documentation (AGENTS.md, ARCHITECTURE.md)
2. Understand current code structure
3. Check existing tests for patterns
4. Run tests to ensure starting state is good

### During Development
1. Make small, incremental changes
2. Test frequently (after each change)
3. Keep commits atomic and focused
4. Write tests alongside code

### After Completing Task
1. Run full test suite
2. Check coverage report
3. Manually test if user-facing
4. Update documentation
5. Clean up temporary files

### If Stuck
1. Check similar existing code
2. Review tests for usage examples
3. Consult ARCHITECTURE.md for design patterns
4. Try simplest solution first

---

**Remember:** The goal is maintainable, tested, documented code that follows project patterns.
