# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] — 2026-02-28

### Summary

This release is a major capability expansion. It introduces a **factory API**, an **interactive wizard**, **direct database seeding**, **statistical distributions**, **cross-column geographic dependencies**, a **UNIX-composable CLI overhaul**, and a **centralized logger system**. The entire test suite has been migrated from Jest to Vitest, and several heavy optional dependencies are now lazily loaded.

---

### Added

#### Factory API (`src/factory.js`)
- New `createFactory(schemaOrString, options?)` — factory pattern for generating single or batched records.
  - `factory.build(overrides?)` — generate a single record with optional field overrides.
  - `factory.buildMany(n, overrides?)` — generate `n` identical-override records.
  - `factory.buildList(n, overridesFnOrObj?)` — generate `n` records with a per-record override function `(record, index) => overrides`.
  - `factory.schema` — exposes the parsed `SchemaColumn[]` array.
  - `seed` option for deterministic, reproducible output.
  - Accepts both column-definition strings and `SchemaColumn[]` arrays.

#### Interactive Wizard (`src/wizard.js`)
- New `runInitWizard(prompter?)` — guided `ficta.schema.json` scaffolding via interactive prompts.
  - Supports **template mode** (pick a built-in template, optionally customise columns) and **scratch mode** (define tables and columns one by one).
  - Prompts for rows, output format, and SQL dialect (when format is `sql`).
  - Returns a valid `ficta.schema.json`-compatible object ready for `generateFromSchemaFile`.
- New `runInteractiveGenerate(existingOptions, prompter?)` — fills in any missing generation options (`columns`, `rows`, `format`, `output`) via prompts, preserving all pre-existing fields.
- Prompter argument accepts a `{ input, select, confirm }` duck-type for full testability without spawning a real TTY.

#### Database Seeder (`src/seeder.js` + `src/seeders/`)
- New `seedDatabase({ connectionString, tables, dialect? })` — seeds a live database with generated records.
  - Auto-detects dialect from the connection string scheme (`postgres://`, `postgresql://`, `mysql://`, `mariadb://`) or file extension (`.sqlite`, `.sqlite3`, `.db`).
  - Explicit `dialect` option overrides auto-detection.
  - Validates dialect early and throws a descriptive error for unsupported databases.
  - Logs a connecting message via the central logger.
- New `detectDialect(connectionString)` — pure helper returning `'postgres' | 'mysql' | 'sqlite' | null`.
- Database adapters with lazy driver loading and actionable error messages:
  - `src/seeders/postgres.js` (`pg`, peer dependency)
  - `src/seeders/mysql.js` (`mysql2`, peer dependency)
  - `src/seeders/sqlite.js` (`better-sqlite3`, peer dependency)
- All three adapters throw `"X" is required … npm install X` when the driver is absent, so users see exactly which package to install.

#### Statistical Distributions (`src/distributions.js`)
- New `sampleUniform(min, max, rng?)` — uniform random value in `[min, max)`.
- New `sampleNormal(mean, stddev, rng?)` — Box-Muller normal distribution.
- New `sampleExponential(lambda, rng?)` — exponential distribution; throws on `lambda ≤ 0`.
- New `sampleZipf(n, s, rng?)` — Zipf power-law distribution; commonly used to model realistic skewed data (e.g. tier popularity). Throws on invalid `n` or `s`.
- New `sampleFromDistribution({ type, ...params, rng })` — unified dispatcher; throws a descriptive error for unknown types.
- All samplers accept an optional `rng` parameter for deterministic testing.
- **Integration with `generateData`**: any schema column may include a `distribution` field (e.g. `{ type: 'normal', mean: 60, stddev: 10 }`). For numeric and range columns the sampled value is clamped to the declared bounds; for enum columns the Zipf rank selects from the enum values.

#### Cross-Column Dependencies (`src/dependencies.js` + `src/dependency-maps.js`)
- New `resolveDependencyOrder(columns)` — topological sort of schema columns by `depends` declarations. Throws on unknown parent columns or circular dependencies (detected via Kahn's algorithm).
- New `resolveDependentValue(column, row, rng?)` — resolves the value of a dependent column given the already-generated values in `row`. Falls back through: explicit `mapping`, built-in geographic maps, then `null` (falls back to independent generation).
- New `autoWireGeographicDependencies(columns)` — automatically adds `depends: { column: 'country' }` to any `state` or `city` column when a `country` column is present, unless an explicit `depends` is already set (or `depends: false` opts out).
- New `COUNTRY_STATE_MAP` and `COUNTRY_CITY_MAP` — built-in lookup tables for 5+ countries covering states/provinces and major cities.
- New `BUILT_IN_DEPENDENCY_MAPS` object indexing built-in maps by key (`'country→state'`, `'country→city'`).
- **Integration with `generateData`**: dependent columns are resolved after independent columns in each row, guaranteeing referential consistency (e.g. UK cities always match UK states).

#### Schema-First Input API (`src/core.js`)
- `generateData` now accepts `options.schema` — a `SchemaColumn[]` array — as an alternative to `options.columns` string. `schema` columns may carry extended metadata fields (`primaryKey`, `nullable`, `unique`, `distribution`, `depends`, etc.) which are respected by the generation pipeline without requiring special string syntax.
- New `columnStringToSchema(columnString)` — converts a column-definition string into a `SchemaColumn[]` array. Round-trips losslessly with `schemaToColumnString`.
- New `schemaToColumnString(schema)` — converts a `SchemaColumn[]` array back to a column-definition string, stripping metadata fields not expressible in string syntax.
- Error message updated: _"Either columns, schema, or template must be provided"_ (previously didn't mention `schema`).

#### Centralized Logger System (`src/logger.js`)
- New `setLogger(logger)` — inject a custom logger with `{ log, info, warn, error }` methods. Pass `null` to restore the no-op default.
- New `getLogger()` — retrieve the currently active logger.
- New `resetLogger()` — restore the silent no-op logger.
- **No console output by default** — the library is now completely silent unless a logger is explicitly configured. This is a library-friendly behaviour that avoids polluting the output of applications that embed Ficta.
- `setLogger`, `getLogger`, `resetLogger` are now exported from `src/node.js` for convenience.

#### Name-Hints Module (`src/name-hints.js`)
- Extracted the column-name inference rules into a standalone, reusable `src/name-hints.js` module.
- Exports `NAME_HINTS` (array of `[RegExp, type]` pairs) and `lookupNameHint(columnName)`.
- `lookupNameHint` is case-insensitive.

#### UNIX-Composable CLI (`cli.js`)
- **Data to stdout, status to stderr**: when `--output` is omitted the generated data is written to `process.stdout` (pipeline-friendly), while status messages (e.g. `✓ Generated`) are written to `process.stderr`.
- **`--quiet` / `-q` flag**: suppresses all status messages. Only the data appears; stderr is completely silent.
- **`--json-output` flag**: instead of (or in addition to) writing data to a file, writes a structured JSON summary to stdout containing `rowCount`, `columnCount`, `format`, `message`, and (when relevant) `output` and `sql` fields. Ideal for scripting and CI pipelines.
- **Stdin piping**: when stdin is not a TTY, `ficta` reads and processes the piped data before falling back to `--columns`/`--template`. Supports piped ficta.schema.json (generates SQL seeder output) and raw SQL DDL strings.
- New exported `readStdin()` helper — returns piped stdin content as a string, or `null` when stdin is a TTY or not readable.
- Logger routing:
  - `logger.log()` → `process.stdout.write` (data, type lists, etc.)
  - `logger.info()` → `process.stderr.write` (status messages)
  - `--quiet` disables the logger entirely via `resetLogger()`.
- Preview rows (`--preview`) go to stdout; the `✓ Generated` status goes to stderr.

#### Build Integration Tests (`tests/build.test.js`)
- New test suite that runs `node build.js` in a subprocess and asserts all expected artifacts are produced:
  - `dist/ficta.browser.js`, `dist/ficta.browser.min.js`, `dist/ficta.esm.js`
  - `playground/dist/playground.js`, `playground/dist/ficta.browser.min.js`
- Validates that the minified bundle exposes the `Ficta` global name.
- Validates that `playground/index.html` references the expected asset paths.
- Validates that `playground/styles.css` is non-empty.
- Skippable in watch mode via `SKIP_BUILD_TESTS=1`.

---

### Changed

#### Test Framework: Jest → Vitest (all test files)
- Migrated the entire test suite from Jest to **Vitest**.
  - Added `vitest.config.js` with coverage thresholds: branches ≥ 85%, functions ≥ 95%, lines ≥ 85%, statements ≥ 85%.
  - All `import { jest } from '@jest/globals'` removed; replaced with `import { vi } from 'vitest'`.
  - All `jest.fn()`, `jest.spyOn()`, `jest.clearAllMocks()`, `jest.useFakeTimers()`, `jest.advanceTimersByTime()`, `jest.useRealTimers()`, `jest.requireActual` → Vitest equivalents.
  - Removed explicit `describe`, `expect`, `test` imports from `@jest/globals` (Vitest provides globals by default).
  - Callback-style `(done)` tests replaced with synchronous timer assertions using `vi.advanceTimersByTime`.
  - `npm test` / `npm run test:coverage` now invoke `vitest`.

#### Async Formatters
- `toYAML(records)` is now **async** — lazily imports `js-yaml` on first call. All callers must `await` the result. Tests updated accordingly.
- `toTOML(records)` is now **async** — lazily imports `@iarna/toml` on first call. All callers must `await` the result. Tests updated accordingly.
- New `requireDep(packageName)` helper in `src/formatters.js` — attempts a dynamic import and rejects with a human-readable `"X" is required for this operation. Install it: npm install X` message when the package is missing.

#### Async Bridge Modules
- `fromGraphQLSDL(sdlString, options?)` and `graphQLToFictaSchema(sdlString, options?)` in `src/graphql-bridge.js` are now **async** — lazily import the `graphql` package. All callers must `await` the result.
- All related tests updated to `async/await` and `expect(...).rejects.toThrow(...)` patterns.

#### SQL Schema — Dependency Ordering via `generateSchema`
- `resolveTableDependencies` is no longer the public API for dependency ordering. Table order is now resolved internally within `generateSchema` when `insertOrder` is `'auto'` (the default).
- `generateSchema` with `insertOrder: 'manual'` preserves the caller's declared table order.
- Circular FK detection in `generateSchema` now emits a warning via `getLogger().warn()` instead of logging directly to `console.warn`, and falls back to the original table order rather than throwing.
- Tests for `resolveTableDependencies` replaced with integration tests exercising `generateSchema` dependency ordering end-to-end.

#### CLI Preview Output Channel
- `--preview` / `-p` now prints preview rows to **stdout** (data channel) while the `✓ Generated` status message goes to **stderr**. Previously both went to stdout via `console.log`.

#### `generateAndSave` Return Value
- The `generateAndSave` result object now always includes a `message` field containing the `✓ Generated N rows → filename` status string, regardless of whether a logger is configured.

#### Logger Usage in Tests
- All `jest.spyOn(console, 'log')` patterns that tested status message output have been replaced with `setLogger` / `resetLogger` injection, making tests independent of console side-effects.
- Tests that inspect stdout/stderr use `vi.spyOn(process.stdout, 'write')` / `vi.spyOn(process.stderr, 'write')` to match the new logger routing.

#### `ficta-schema.v1.json`
- `$schema` property description updated to include the post-install hint: `node_modules/ficta/ficta-schema.v1.json`.

---

### Fixed

- **`toYAML` / `toTOML` in browser builds**: lazy-loading prevents bundlers from crashing when optional packages (`js-yaml`, `@iarna/toml`) are absent at import time.
- **`graphql` package lazy-load**: `src/graphql-bridge.js` no longer fails to import in environments where the `graphql` package is not installed.
- **`infer.test.js` column name collisions**: test rows renamed (`token` → `row_uid`, `registered` → `inserted`, `bio` → `misc_text`) to avoid the name-hints system overriding inferred types with hint-based types during inference tests.
- **`generateData` error propagation**: dependent columns that resolve to `null` (unrecognised parent value) now fall back to independent generation instead of inserting `null` into the record.

---

### Removed

- `resolveTableDependencies` is no longer exported as an entry-point API (it was a low-level helper). Dependency ordering is handled transparently inside `generateSchema`.
- Direct `console.warn` calls in `src/sql-schema.js` replaced with `getLogger().warn()`.

---

### Migration Guide

#### Awaiting `toYAML` / `toTOML`
```js
// Before
const yaml = formatters.toYAML(records);

// After
const yaml = await formatters.toYAML(records);
```

#### Awaiting GraphQL bridge
```js
// Before
const columns = fromGraphQLSDL(sdl, { typeName: 'User' });

// After
const columns = await fromGraphQLSDL(sdl, { typeName: 'User' });
```

#### Opting into status output (logger)
```js
import { setLogger } from 'ficta';

// Route status to stderr (matches CLI behaviour)
setLogger({
  log:   (...args) => process.stdout.write(args.join(' ') + '\n'),
  info:  (...args) => process.stderr.write(args.join(' ') + '\n'),
  warn:  (...args) => process.stderr.write('[warn] ' + args.join(' ') + '\n'),
  error: (...args) => process.stderr.write('[error] ' + args.join(' ') + '\n'),
});
```

#### UNIX-friendly CLI pipelines
```sh
# Generate CSV to stdout, status to stderr (pipe-safe)
ficta -c "id:autoIncrement,name:fullName" -r 1000 | gzip > data.csv.gz

# Structured JSON output for scripting
ficta -c "id:autoIncrement,email" -r 50 --json-output | jq '.rowCount'

# Pipe a ficta.schema.json into ficta
cat ficta.schema.json | ficta --format sql > seed.sql

# Completely silent (data only)
ficta -c "id:autoIncrement" -r 100 --quiet
```

---

[1.2.0]: https://github.com/izaccavalheiro/ficta/compare/v1.1.10...v1.2.0
