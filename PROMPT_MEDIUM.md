# Ficta — Medium-Priority Implementation Prompt

## Confirmed Baseline

**639 tests, 0 failures.** All critical and high-priority work is complete except
where noted below.

**Critical (4/4 ✅)**: schema CLI command, browser YAML emitter, csv-writer removed, seedFaker  
**High-Priority (5/6 ✅)**: setLocale, PostgreSQL ENUM CHECK, FK ordering default,
formatters.shared.js, type aliases  
**High-Priority gap carried forward**: TypeScript declarations (H1) — never implemented,
included as Fix 1 below due to developer-impact.

---

## MISSION

You are a Senior JavaScript Software Engineer working on **Ficta** — a universal test data
generator (Node.js + browser + CLI) using ES Modules exclusively.

Repository root: `/Users/izaccavalheiro/git/ficta`

Implement all five fixes below. Do NOT write new markdown summary files. Do NOT
refactor outside the stated scope. After all changes, run `npm test` and confirm all
639 existing tests still pass plus any new tests added.

---

## FIX 1 — TypeScript Declarations (carried from high-priority H1)

**Files to create/edit**: `index.d.ts`, `package.json`  
**Problem**: No `.d.ts` declaration files exist. TypeScript consumers receive `any` for
all Ficta imports. The JSDoc on every public function already carries full type
information — it just needs to be surfaced.

**Implementation requirements**:

Create `index.d.ts` at the project root declaring the complete public Node.js API:

```typescript
// Core types
export interface ColumnDefinition {
  name: string;
  type: string;
}

export interface GenerateResult {
  records: Record<string, unknown>[];
  columns: ColumnDefinition[];
  rowCount: number;
  columnCount: number;
}

export interface FormatOptions {
  pretty?: boolean;
  sheetName?: string;
  tableName?: string;
  dialect?: 'postgres' | 'mysql' | 'sqlite' | 'generic';
  mode?: 'insert' | 'ddl' | 'ddl+insert' | 'upsert' | 'truncate+insert';
  batch?: boolean;
  rootElement?: string;
  recordElement?: string;
}

export interface GenerateAndSaveOptions {
  columns?: string | ColumnDefinition[];
  rows?: number;
  output?: string;
  format?: 'csv' | 'json' | 'xml' | 'xlsx' | 'tsv' | 'sql' | 'yaml' | 'yml' | 'toml';
  template?: string;
  preview?: boolean;
  seed?: number;
  locale?: string;
  formatOptions?: FormatOptions;
}

export interface GenerateFromDDLOptions {
  schemaFile: string;
  rows?: number;
  outputMode?: 'insert' | 'upsert' | 'truncate+insert' | 'ddl+insert';
  dialect?: 'postgres' | 'mysql' | 'sqlite' | 'generic';
  output?: string;
}

// Core functions
export function setFaker(faker: unknown): void;
export function seedFaker(seed: number): void;
export function setLocale(locale: string): void;
export function parseColumns(columnString: string): ColumnDefinition[];
export function generateData(options: Omit<GenerateAndSaveOptions, 'output' | 'format' | 'formatOptions'>): GenerateResult;
export function listTypes(): string[];
export function listTemplates(): string[];

export const fakerTypes: Record<string, (() => unknown) | null>;
export const templates: Record<string, { columns: string; rows: number }>;

// Node.js API
export function generateAndSave(options: GenerateAndSaveOptions): Promise<GenerateResult & { format: string; output: string; data: string | Buffer }>;
export function generateFromDDL(options: GenerateFromDDLOptions): Promise<string>;
export function writeFile(content: string | Buffer, filepath: string): Promise<void>;

// Formatters
export function toCSV(records: Record<string, unknown>[], columns: ColumnDefinition[] | string): string;
export function toJSON(records: Record<string, unknown>[], pretty?: boolean): string;
export function toXML(records: Record<string, unknown>[], rootElement?: string, recordElement?: string): Promise<string>;
export function toExcel(records: Record<string, unknown>[], columns: ColumnDefinition[], sheetName?: string): Promise<Buffer>;
export function toTSV(records: Record<string, unknown>[], columns: ColumnDefinition[]): string;
export function toYAML(records: Record<string, unknown>[]): string;
export function toTOML(records: Record<string, unknown>[]): string;
export function formatColumnName(name: string): string;
export function detectFormat(filename: string): string;
export function getFileExtension(format: string): string;
```

In `package.json`:
- Add `"types": "./index.d.ts"` as a top-level field (alongside `"main"`)
- Add `"index.d.ts"` to the `"files"` array so it ships in the npm package

**Tests** (`tests/node.test.js`):
- Add a test that imports `index.d.ts` content can be parsed as valid TypeScript-shaped
  syntax — since Jest runs in Node.js, a practical substitute is: read the file, assert
  it contains `export function generateAndSave`, `export function generateFromDDL`, and
  `export interface GenerateAndSaveOptions`

---

## FIX 2 — `createUI` Format and Template Lists Must Be Generated Dynamically

**File**: `src/browser.js`  
**Problem**: The `createUI()` function builds its HTML with hardcoded `<option>` lists
for both formats (5 entries, missing `yaml`, `yml`, `toml`) and templates (5 hardcoded
names, will silently miss any new templates added to `core.templates`). Both lists are
stale the moment either `core.templates` or supported formats expand.

**Implementation requirements**:

The supported browser format list is: `csv`, `json`, `xml`, `tsv`, `sql`, `yaml`, `toml`.
Define this as a module-level constant in `browser.js` (not imported — keep it local):
```js
const BROWSER_FORMATS = ['csv', 'json', 'xml', 'tsv', 'sql', 'yaml', 'toml'];
```

Replace the hardcoded format `<select>` block in `createUI()` with a dynamically
generated string:
```js
const formatOptions = BROWSER_FORMATS
  .map(f => `<option value="${f}">${f.toUpperCase()}</option>`)
  .join('\n          ');
```

Replace the hardcoded template `<select>` block with a dynamically generated string
using `Object.keys(core.templates)`:
```js
const templateOptions = [
  '<option value="">-- Custom Columns --</option>',
  ...Object.keys(core.templates).map(
    name => `<option value="${name}">${name.charAt(0).toUpperCase() + name.slice(1)}</option>`
  )
].join('\n          ');
```

Inject both into the template literal via `${formatOptions}` and `${templateOptions}`.

Remove the now-dead `templateSelect.addEventListener('change', ...)` hardcoded guard
referencing `.value === 'users'` etc. — the handler already uses `core.templates[templateName]`
dynamically, so no code change is needed there.

**Tests** (`tests/browser.test.js`):
- Add a test that calls `createUI` with a mock DOM and asserts the rendered HTML
  contains `yaml` and `toml` format options
- Add a test that the template select contains exactly `Object.keys(core.templates).length + 1`
  options (the `+1` is the blank "Custom Columns" option)

---

## FIX 3 — `build.js` Banner Contains Placeholder URL

**File**: `build.js`  
**Problem**: The IIFE browser bundle is emitted with the banner:
```
// https://github.com/your-repo/ficta
```
`your-repo` is a template placeholder that ships in every built `dist/ficta.browser.js`.

**Implementation requirements**:
- Read `homepage` and `version` from `package.json` at the top of `build.js` using
  `fs.readFileSync` + `JSON.parse` — no new dependencies
- Replace the hardcoded banner string with:
```js
banner: {
  js: `// Ficta v${pkg.version} - Browser Bundle\n// ${pkg.homepage}\n`
}
```
- Apply the same dynamic banner to the minified IIFE build (`ficta.browser.min.js`)
- The ESM build (`ficta.esm.js`) does not use a banner — leave it unchanged
- No tests required for this fix (build script, not runtime code)

---

## FIX 4 — AGENTS.md Template Documentation Uses Stale String Format

**File**: `AGENTS.md`  
**Problem**: The "Adding a Template" example in AGENTS.md documents templates as plain
column strings:
```js
export const templates = {
  employees: "id:autoIncrement,firstName,...",
};
```
But `src/core.js` stores templates as objects since at least v1.1:
```js
export const templates = {
  employees: {
    columns: 'id:autoIncrement,firstName,...',
    rows: 100
  }
};
```
Any contributor following the AGENTS.md example will introduce a broken template that
throws a `TypeError: Cannot read properties of undefined (reading 'columns')` at runtime.

**Implementation requirements**:
- Find the "Adding a Template" section in AGENTS.md (around line 350–365)
- Replace the plain-string template example with the correct `{ columns, rows }` object format
- Also update the inline `templates = { ... }` snippet near line 283 if it uses the
  old string format — change it to match the actual structure
- No code changes. No tests required (documentation only)

---

## FIX 5 — Add `--no-header` and `--header-format` Options to CSV and TSV

**Files**: `src/formatters.shared.js`, `src/formatters.js`, `src/formatters.browser.js`,
`src/node.js`, `cli.js`  
**Problem**: CSV and TSV formatters always emit a Title Case header row with no way to
suppress it or emit raw column key names. Two concrete needs are unserviceable:
(a) piping output into a tool that expects no header, (b) downstream systems that
require exact column names like `first_name` rather than `First Name`.

**Implementation requirements**:

**`src/formatters.shared.js`**:

Extend `toCSV(records, columns, options = {})` to accept a third `options` parameter:
- `options.header` (boolean, default `true`) — when `false`, omit the header row entirely
- `options.headerFormat` (`'title'` | `'raw'`, default `'title'`) — `'raw'` emits column
  names as-is without calling `formatColumnName`

Apply the same extension to `toTSV(records, columns, options = {})` with identical semantics.

Both changes must be **backward-compatible** — existing callers passing only 2 arguments
continue to work identically.

**`src/formatters.js`** and **`src/formatters.browser.js`**:

In `formatData()` (present in both files), forward relevant options from the `options`
object into `toCSV` and `toTSV` calls:
```js
case 'csv':
  return toCSV(records, columns, {
    header: options.header !== false,
    headerFormat: options.headerFormat || 'title'
  });
case 'tsv':
  return toTSV(records, columns, {
    header: options.header !== false,
    headerFormat: options.headerFormat || 'title'
  });
```

**`cli.js`**:

Add two options to the main yargs chain (before `.check()`):
```js
.option('no-header', {
  describe: 'Omit header row from CSV/TSV output',
  type: 'boolean',
  default: false
})
.option('header-format', {
  describe: 'Header casing: "title" (default) or "raw" (exact column key names)',
  type: 'string',
  choices: ['title', 'raw'],
  default: 'title'
})
```

In `main()`, propagate both into `formatOptions`:
```js
if (argv.noHeader) {
  options.formatOptions.header = false;
}
if (argv.headerFormat) {
  options.formatOptions.headerFormat = argv.headerFormat;
}
```

**Tests** (`tests/formatters.test.js`, `tests/formatters.browser.test.js`, `tests/cli.test.js`):

`formatters.test.js` and `formatters.browser.test.js`:
- `toCSV` with `{ header: false }` returns no header row (first line is a data value, not a column name)
- `toCSV` with `{ headerFormat: 'raw' }` emits `firstName` not `First Name`
- `toTSV` with `{ header: false }` returns no header row
- `toTSV` with `{ headerFormat: 'raw' }` emits raw key names
- `toCSV` with no options continues to emit Title Case header (backward compat)

`cli.test.js`:
- `main()` with `argv.noHeader = true` generates CSV without a header line
- `main()` with `argv.headerFormat = 'raw'` generates CSV with raw column names

---

## EXECUTION ORDER

1. Fix 3 first (`build.js` URL — trivial, zero test risk, immediately ships correct banner)
2. Fix 4 (`AGENTS.md` docs — documentation only, no code impact)
3. Fix 2 (`createUI` dynamic lists — bounded to browser.js, easy DOM test)
4. Fix 5 (`--no-header` / `--header-format` — most test surface, do on stable base)
5. Fix 1 last (TypeScript declarations — additive only, verify `package.json` fields and file ships)

---

## COMPLETION CRITERIA

- All pre-existing 639 tests pass
- Coverage thresholds in `jest.config.js` (85/95/85/85) are not regressed
- No new production dependencies introduced
- No existing public API signatures changed (only additions and an optional third param)
- `index.d.ts` is present at project root and listed in `package.json` `files` array
- `dist/ficta.browser.js` (after `npm run build`) contains the correct repository URL in its banner
