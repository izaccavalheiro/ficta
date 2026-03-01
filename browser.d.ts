/**
 * Ficta — TypeScript declarations for the browser API.
 *
 * The browser bundle (`dist/ficta.browser.min.js`) is self-contained and
 * exposes all symbols on `window.Ficta`. These declarations describe that
 * surface.
 *
 * @see https://github.com/izaccavalheiro/ficta
 */

// Re-export everything from the Node.js / universal declarations except
// Node-only symbols that are not available in the browser bundle.
export type {
  ColumnDefinition,
  SchemaColumn,
  GenerateResult,
  ColumnOptions,
  TableBuilderInterface,
  SchemaBuilderInterface,
  SQLSchemaOptions,
  TableDef,
  TableDefForeignKey,
  GenerateFromSchemaOptions,
  BuildInsertOptions,
  InferResult,
} from './index';

export {
  setFaker,
  seedFaker,
  setLocale,
  parseColumns,
  columnStringToSchema,
  schemaToColumnString,
  generateData,
  listTypes,
  listTemplates,
  fakerTypes,
  templates,
  registerType,
  unregisterType,
  registerTemplate,
  unregisterTemplate,
  formatColumnName,
  toCSV,
  toJSON,
  toTSV,
  toSQLLegacy,
  detectFormat,
  getFileExtension,
  table,
  schema,
  // DDL / schema-generator universals
  parseDDL,
  orderByDependencies,
  generateFromSchema,
  buildInsertStatements,
  // Schema inference
  inferSchema,
} from './index';

// ---------------------------------------------------------------------------
// Browser-specific formatter overrides
// ---------------------------------------------------------------------------

import type { ColumnDefinition, GenerateResult } from './index';

/**
 * Convert records to an XML string.
 * In the browser bundle this returns a **resolved** Promise<string> so that
 * the API signature matches the Node.js async implementation.
 */
export function toXML(
  records: Record<string, unknown>[],
  rootElement?: string,
  recordElement?: string,
): Promise<string>;

/**
 * Convert records to SQL INSERT statements (browser synchronous implementation).
 * @param records - Array of generated row objects
 * @param columns - Column definitions
 * @param tableNameOrOptions - Target table name string or SQL schema options
 */
export function toSQL(
  records: Record<string, unknown>[],
  columns: import('./index').ColumnDefinition[],
  tableNameOrOptions?: string | import('./index').SQLSchemaOptions,
): string;

/**
 * Convert records to a YAML string (browser synchronous implementation).
 */
export function toYAML(records: Record<string, unknown>[]): string;

/**
 * Convert records to a TOML string (browser synchronous implementation).
 */
export function toTOML(records: Record<string, unknown>[]): string;

// ---------------------------------------------------------------------------
// Browser download helpers
// ---------------------------------------------------------------------------

/**
 * Trigger a browser file download with the given content.
 * @param content - String or Blob to download
 * @param filename - Suggested file name shown to the user
 * @param format  - Format hint used to assign the correct MIME type
 */
export function downloadFile(
  content: string | Blob,
  filename?: string,
  format?: string,
): void;

/**
 * Trigger a browser download of a CSV string.
 * @param csv      - CSV-formatted string
 * @param filename - Suggested file name (default: 'data.csv')
 */
export function downloadCSV(csv: string, filename?: string): void;

// ---------------------------------------------------------------------------
// Browser-specific options
// ---------------------------------------------------------------------------

export interface BrowserGenerateOptions {
  columns?: string;
  rows?: number;
  template?: string;
  seed?: number;
  locale?: string;
}

/**
 * Generate data and immediately trigger a browser download.
 * @returns The generation result plus the resolved filename and formatted data string.
 */
export function generateAndDownload(
  options: BrowserGenerateOptions & {
    filename?: string;
    format?: string;
    formatOptions?: Record<string, unknown>;
  },
): GenerateResult & { filename: string; data: string };

/**
 * Mount the built-in interactive UI into the given container element.
 * @param container - A CSS selector string or an HTMLElement
 */
export function createUI(container: string | HTMLElement): void;
