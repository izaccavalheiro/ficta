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
