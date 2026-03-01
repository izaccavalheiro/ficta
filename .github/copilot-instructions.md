# GitHub Copilot Instructions — Ficta

## What this project is

Universal test data generator: Node.js + Browser + CLI. Produces CSV, JSON, XML,
Excel, TSV, SQL, YAML, TOML, and Parquet from column definition strings or SQL DDL.
Powered by Faker.js. 1 163 Vitest tests across 21 suites.

## The most important constraints

1. `src/core.js` must stay **universal** — zero Node.js or browser-specific imports.
   No `fs`, `path`, `process`, `window`, `console`, or any npm package that is not `@faker-js/faker`.
2. **ES Modules only** — `import`/`export` everywhere. Never `require`.
3. **No `console.*` in `src/`** — use `src/logger.js` → `getLogger()`.
4. **Always call `getFaker()`**, never access `faker` directly.
5. **Options objects** — every exported function takes a single destructured object, not positional params.
6. **Vitest**, not Jest — use `vi.fn()`, `vi.spyOn()`, `vi.useFakeTimers()`. Never `jest.*`.

## File map (where to put things)

| What | File |
|---|---|
| New Faker type | `src/core.js` → `fakerTypes` |
| New template | `src/core.js` → `templates` |
| New special type | `src/core.js` → `generateValue()` |
| Node.js formatter | `src/formatters.js` |
| Browser formatter | `src/formatters.browser.js` |
| Shared pure util | `src/formatters.shared.js` |
| Node.js API function | `src/node.js` |
| Browser API function | `src/browser.js` |
| CLI subcommand | `cli.js` |
| SQL type mapping | `src/sql-schema.js` → `sqlTypeMap` |
| DDL parsing | `src/ddl-parser.js` |
| FK orchestration | `src/schema-generator.js` |
| Statistical sampler | `src/distributions.js` |
| Column name rule | `src/name-hints.js` |
| PII anonymization | `src/anonymizer.js` |
| DB seeding | `src/seeder.js` / `src/seeders/` |
| Interactive prompts | `src/wizard.js` |

## Patterns to always follow

### Function signatures

```js
export function myFunction({ param1, param2 = 'default' }) { … }
```

### Lazy optional dependency

```js
async function requireDep(pkg) {
  try { return await import(pkg); }
  catch { throw new Error(`"${pkg}" is required. Install it: npm install ${pkg}`); }
}
```

### CSV escaping

```js
const str = String(value ?? '');
if (str.includes(',') || str.includes('"') || str.includes('\n'))
  return `"${str.replace(/"/g, '""')}"`;
return str;
```

### Descriptive errors

```js
throw new Error(`Unknown template: "${t}". Available: ${Object.keys(templates).join(', ')}`);
```

### JSDoc on every public export

```js
/**
 * Brief description.
 * @param {Object} options
 * @param {string} options.columns
 * @param {number} [options.rows=100]
 * @returns {{ records: Object[], rowCount: number }}
 */
```

## Testing

```bash
npm test                   # vitest run — all 1 163 tests
npm run test:coverage      # vitest --coverage (branches ≥ 85%, functions ≥ 95%)
npx vitest run tests/core.test.js
```

Test template:

```js
import { describe, test, expect, vi, afterEach } from 'vitest';
import { resetLogger } from '../src/node.js';

describe('module', () => {
  afterEach(() => resetLogger());
  // …
});
```

## Async formatters / bridges

`toYAML`, `toTOML`, `fromGraphQLSDL`, `graphQLToFictaSchema` are **async** since v1.2.0.
Always `await` them.

## Full reference

See [AGENTS.md](../AGENTS.md) for the complete API reference, module descriptions,
and code examples. See [ARCHITECTURE.md](../ARCHITECTURE.md) for design rationale.
