# Contributing to Ficta

Thank you for your interest in contributing! Read this guide before opening a PR.

---

## Prerequisites

- Node.js 18+
- npm
- Git

## Setup

```bash
git clone https://github.com/YOUR_USERNAME/ficta.git
cd ficta
npm install
npm test       # verify everything passes (1 163 tests across 21 suites)
```

---

## Project Structure

```
src/
  core.js              — Universal: parseColumns, generateData, Plugin API
  formatters.shared.js — Pure CSV/TSV/JSON utils (no deps)
  formatters.js        — Node.js formatters (Excel, YAML, TOML, Parquet, …)
  formatters.browser.js — Browser formatters
  node.js              — Node.js adapter and public API
  browser.js           — Browser adapter
  sql-schema.js        — SQL DDL/DML generation
  ddl-parser.js        — SQL DDL → TableDef parser
  schema-generator.js  — Multi-table FK orchestrator
  schema-builder.js    — Fluent table/schema builder
  infer.js             — Schema inference from sample data
  openapi-bridge.js    — OpenAPI → ficta.schema.json
  graphql-bridge.js    — GraphQL SDL → ficta.schema.json
  factory.js           — Test data factory (build/buildMany/buildList)
  wizard.js            — Interactive CLI wizard
  seeder.js            — Live database seeding
  distributions.js     — Statistical samplers
  dependencies.js      — Cross-column geographic dependencies
  dependency-maps.js   — Geographic lookup tables
  anonymizer.js        — PII anonymization
  logger.js            — Centralized no-op logger
  name-hints.js        — Column-name → type inference rules
  seeders/             — postgres.js, mysql.js, sqlite.js
cli.js                 — CLI (yargs)
tests/                 — 21 test suites (Vitest)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design rationale and
[AGENTS.md](AGENTS.md) for the complete API reference and code examples.

---

## Core Constraints

These are non-negotiable:

1. **`src/core.js` must stay universal** — zero Node.js or browser imports. No `fs`, `path`, `process`, `window`, or `console`.
2. **ES Modules only** — `import`/`export` everywhere; never `require` or `module.exports`.
3. **No `console.*` in source** — route all output through `src/logger.js`.
4. **Always call `getFaker()`** — never access `faker` directly.
5. **Options objects** — every exported function takes a single destructured options object.

---

## Common Contribution Types

### Add a new Faker data type

```js
// src/core.js → fakerTypes
ipv6: () => getFaker().internet.ipv6(),
```

Then add a test in `tests/core.test.js`.

### Add a new template

```js
// src/core.js → templates
employees: {
  columns: 'id:autoIncrement,firstName,lastName,email,jobTitle,department,phone,hireDate:pastDate',
  rows: 100,
},
```

### Add a new output format

1. `src/formatters.js` → `export [async] function toMyFormat(records, columns, opts)`
2. `src/formatters.browser.js` → browser version or stub
3. `src/node.js` → `case 'myformat':` in `generateAndSave` switch
4. `src/browser.js` → `case 'myformat':` in browser switch
5. `cli.js` → add `'myformat'` to the `--format` choices array
6. Tests in `tests/formatters.test.js` and `tests/node.test.js`

### Add a SQL column type mapping

```js
// src/sql-schema.js → sqlTypeMap
myType: { postgres: 'TEXT', mysql: 'VARCHAR(255)', sqlite: 'TEXT', generic: 'VARCHAR(255)' }
```

### Generate data from a SQL DDL schema

```js
import { generateFromDDL } from './src/node.js';
const sql = await generateFromDDL({
  schemaFile: './schema.sql',
  rows: 20,
  outputMode: 'ddl+insert',
  dialect: 'postgres',
});
```

---

## Testing

### Commands

```bash
npm test                        # run all 1 163 tests
npm run test:watch              # watch mode
npm run test:coverage           # coverage report (open coverage/lcov-report/index.html)

# Run a single suite
npx vitest run tests/core.test.js
npx vitest run tests/ddl-parser.test.js
```

### Coverage targets

| Metric | Target |
|---|---|
| Branches | ≥ 85 % |
| Functions | ≥ 95 % |
| Lines | ≥ 85 % |

### Test patterns

```js
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
// Do NOT import from '@jest/globals' — the project uses Vitest, not Jest.

import { generateData } from '../src/core.js';
import { setLogger, resetLogger } from '../src/node.js';

describe('myModule', () => {
  afterEach(() => resetLogger());

  test('generates expected output', () => {
    const { records } = generateData({ columns: 'id:autoIncrement,email', rows: 3 });
    expect(records).toHaveLength(3);
    expect(records[0].id).toBe(1);
  });

  test('logs status via injected logger', () => {
    const spy = vi.fn();
    setLogger({ log: spy, info: spy, warn: spy, error: spy });
    // trigger code that logs …
    expect(spy).toHaveBeenCalled();
  });

  test('throws on invalid input', () => {
    expect(() => generateData({}))
      .toThrow('Either columns, schema, or template must be provided');
  });
});
```

Use `vi.fn()`, `vi.spyOn()`, `vi.useFakeTimers()`, `vi.advanceTimersByTime()`. Never use `jest.*`.

---

## Code Style

### Functions

```js
// ✅
/**
 * Brief description.
 * @param {Object} options
 * @param {string} options.columns - Column definition string.
 * @param {number} [options.rows=100]
 * @returns {{ records: Object[], rowCount: number }}
 */
export function generateData({ columns, rows = 100 }) { … }

// ❌ — positional params, no JSDoc
function generateData(columns, rows) { … }
```

### Error messages

```js
// ✅
throw new Error(`Unknown template: "${template}". Available: ${Object.keys(templates).join(', ')}`);

// ❌
throw new Error('Invalid template');
```

### CSV escaping

```js
const str = String(value ?? '');
if (str.includes(',') || str.includes('"') || str.includes('\n')) {
  return `"${str.replace(/"/g, '""')}"`;
}
return str;
```

### Lazy optional deps

```js
async function requireDep(pkg) {
  try { return await import(pkg); }
  catch { throw new Error(`"${pkg}" is required. Install it: npm install ${pkg}`); }
}
```

---

## Commit Guidelines

```
feat(core): add ipv6 data type
fix(formatters): escape newlines in TSV output
docs: update CONTRIBUTING for Vitest migration
test(factory): add buildList edge cases
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `perf`, `chore`.

---

## Pull Request Checklist

- [ ] `npm test` passes (no failures, coverage targets met)
- [ ] New code has corresponding tests
- [ ] No `console.*` calls in `src/`
- [ ] Uses `import`/`export` (no `require`)
- [ ] Destructured options object on all exported functions
- [ ] JSDoc on public exports
- [ ] No breaking changes, or migration notes added to `CHANGELOG.md`

---

## Questions

Open an issue or consult [AGENTS.md](AGENTS.md) for detailed examples.

By contributing you agree your work will be licensed under the ISC License.
