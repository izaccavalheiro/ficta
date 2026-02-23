/**
 * Ficta — TypeScript declarations for the public Node.js API.
 * @see https://github.com/izaccavalheiro/ficta
 */

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

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
  /** When false, the header row is omitted from CSV/TSV output. Default: true */
  header?: boolean;
  /** 'title' emits Title Case column names (default); 'raw' emits key names as-is */
  headerFormat?: 'title' | 'raw';
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
  /** Path to the .sql DDL schema file */
  schemaFile: string;
  rows?: number;
  outputMode?: 'insert' | 'upsert' | 'truncate+insert' | 'ddl+insert';
  dialect?: 'postgres' | 'mysql' | 'sqlite' | 'generic';
  /** Optional file path to write the generated SQL to */
  output?: string;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/** Set the Faker.js instance used for data generation. */
export function setFaker(faker: unknown): void;

/** Seed the Faker.js RNG for reproducible output. */
export function seedFaker(seed: number): void;

/** Set the Faker.js locale (e.g. 'fr', 'de', 'pt_BR'). */
export function setLocale(locale: string): void;

/**
 * Parse a column definition string into structured column objects.
 * @example parseColumns('id:autoIncrement,name:fullName,email')
 */
export function parseColumns(columnString: string): ColumnDefinition[];

/**
 * Generate records and return a result object without writing to disk.
 * This is the universal (Node.js + browser) generation entry point.
 */
export function generateData(
  options: Omit<GenerateAndSaveOptions, 'output' | 'format' | 'formatOptions'>
): GenerateResult;

/** Return an array of all supported Faker type names. */
export function listTypes(): string[];

/** Return an array of all built-in template names. */
export function listTemplates(): string[];

/** All registered Faker type generators, keyed by type name. */
export const fakerTypes: Record<string, (() => unknown) | null>;

/** All built-in column templates. */
export const templates: Record<string, { columns: string; rows: number }>;

/**
 * Register a custom data type generator.
 * @param name - Type name (used in column definitions as name:type)
 * @param generatorFn - Zero-argument function returning a value
 * @param options - Optional options: { override?: boolean }
 */
export function registerType(
  name: string,
  generatorFn: () => unknown,
  options?: { override?: boolean }
): void;

/** Unregister a previously registered custom type. Built-in types cannot be removed. */
export function unregisterType(name: string): void;

/**
 * Register a custom column template.
 * @param name - Template name
 * @param config - Template configuration: { columns: string; rows?: number }
 * @param options - Optional options: { override?: boolean }
 */
export function registerTemplate(
  name: string,
  config: { columns: string; rows?: number },
  options?: { override?: boolean }
): void;

/** Unregister a previously registered custom template. Built-in templates cannot be removed. */
export function unregisterTemplate(name: string): void;

// ---------------------------------------------------------------------------
// Node.js API
// ---------------------------------------------------------------------------

/**
 * Generate formatted data and optionally save it to a file.
 * Returns a result object that includes the formatted string/buffer.
 */
export function generateAndSave(
  options: GenerateAndSaveOptions
): Promise<GenerateResult & { format: string; output: string; data: string | Buffer }>;

/**
 * Read a `.sql` DDL schema file, generate test data for every table (in
 * FK-dependency order), and optionally write the resulting SQL to disk.
 */
export function generateFromDDL(options: GenerateFromDDLOptions): Promise<string>;

export interface SchemaFileColumn {
  name: string;
  type: string;
  primaryKey?: boolean;
  nullable?: boolean;
  unique?: boolean;
  default?: string | number | boolean;
  references?: { table: string; column: string };
  sqlType?: string;
}
export interface SchemaFileTable {
  name: string;
  rows?: number;
  columns: SchemaFileColumn[];
}
export interface SchemaFileOptions {
  schemaFile: string;
  rows?: number;
  outputMode?: 'insert' | 'upsert' | 'truncate+insert' | 'ddl+insert';
  output?: string;
}

/**
 * Read a ficta.schema.json file and generate SQL test data.
 */
export function generateFromSchemaFile(options: SchemaFileOptions): Promise<string>;

/** Write content to a file, creating parent directories as needed. */
export function writeFile(content: string | Buffer, filepath: string): Promise<void>;

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/** Convert records to a CSV string. */
export function toCSV(
  records: Record<string, unknown>[],
  columns: ColumnDefinition[] | string,
  options?: Pick<FormatOptions, 'header' | 'headerFormat'>
): string;

/** Convert records to a JSON string. */
export function toJSON(records: Record<string, unknown>[], pretty?: boolean): string;

/** Convert records to an XML string (async, uses xml2js). */
export function toXML(
  records: Record<string, unknown>[],
  rootElement?: string,
  recordElement?: string
): Promise<string>;

/** Convert records to an Excel (.xlsx) Buffer (async, uses ExcelJS). */
export function toExcel(
  records: Record<string, unknown>[],
  columns: ColumnDefinition[],
  sheetName?: string
): Promise<Buffer>;

/** Convert records to a TSV string. */
export function toTSV(
  records: Record<string, unknown>[],
  columns: ColumnDefinition[],
  options?: Pick<FormatOptions, 'header' | 'headerFormat'>
): string;

/** Convert records to a YAML string. */
export function toYAML(records: Record<string, unknown>[]): string;

/** Convert records to a TOML string. */
export function toTOML(records: Record<string, unknown>[]): string;

/** Convert a camelCase column name to Title Case display form. */
export function formatColumnName(name: string): string;

/** Detect the output format from a filename's extension. */
export function detectFormat(filename: string): string;

/** Return the canonical file extension (without dot) for a given format name. */
export function getFileExtension(format: string): string;

// ---------------------------------------------------------------------------
// Streaming API (Node.js only — import from 'ficta' or 'ficta/node')
// ---------------------------------------------------------------------------

import type { Readable } from 'stream';

export interface GenerateStreamOptions {
  columns?: string;
  template?: string;
  rows: number;
  format: 'csv' | 'ndjson';
  batchSize?: number;
  seed?: number;
  locale?: string;
  formatOptions?: Pick<FormatOptions, 'header' | 'headerFormat'>;
}

/**
 * Generate data as a Node.js Readable stream emitting formatted chunks.
 * Supported formats: 'csv' and 'ndjson' (JSON Lines).
 * For all other formats, use generateAndSave() instead.
 */
export function generateStream(options: GenerateStreamOptions): Readable;

// ---------------------------------------------------------------------------
// Schema Builder API (import from 'ficta/schema-builder')
// ---------------------------------------------------------------------------

export interface ColumnOptions {
  primaryKey?: boolean;
  unique?: boolean;
  nullable?: boolean;
  notNull?: boolean;
  default?: string | number | boolean;
  references?: { table: string; column: string };
  sqlType?: string;
}

export interface TableBuilderInterface {
  column(name: string, type: string, options?: ColumnOptions): this;
  rows(n: number): this;
  dialect(d: 'postgres' | 'mysql' | 'sqlite' | 'generic'): this;
  build(): Record<string, unknown>;
  toSQL(mode?: string): string;
  toGenerateOptions(): { columns: string; rows: number };
}

export interface SchemaBuilderInterface {
  table(name: string, builderFn: (t: TableBuilderInterface) => void): this;
  dialect(d: 'postgres' | 'mysql' | 'sqlite' | 'generic'): this;
  rows(n: number): this;
  build(): Record<string, unknown>;
  toSQL(mode?: string): string;
}

/** Create a fluent schema builder for one table. */
export function table(tableName: string): TableBuilderInterface;

/** Create a multi-table schema builder. */
export function schema(schemaName?: string): SchemaBuilderInterface;
