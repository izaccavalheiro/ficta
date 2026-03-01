// Node.js-specific functionality for Ficta
import { faker } from '@faker-js/faker';
import { Readable } from 'stream';
import * as core from './core.js';
import * as formatters from './formatters.js';
import { generateFromSchema } from './schema-generator.js';
import { inferSchema } from './infer.js';
import { openAPIToFictaSchema } from './openapi-bridge.js';
import { graphQLToFictaSchema } from './graphql-bridge.js';
import { getLogger } from './logger.js';
import { anonymizeRecords } from './anonymizer.js';

// Re-export schema inference, openapi-bridge and graphql-bridge for consumers
export { inferSchema } from './infer.js';
export { fromOpenAPISchema, openAPIToFictaSchema } from './openapi-bridge.js';
export { fromGraphQLSDL, graphQLToFictaSchema } from './graphql-bridge.js';

// Re-export logger utilities so consumers can configure logging
export { setLogger, getLogger, resetLogger } from './logger.js';

// Initialize faker for the core module
core.setFaker(faker);

// Re-export core functionality (including seedFaker)
export * from './core.js';

// Re-export dependency utilities
export { resolveDependencyOrder, resolveDependentValue, autoWireGeographicDependencies } from './dependencies.js';
export { COUNTRY_STATE_MAP, COUNTRY_CITY_MAP, BUILT_IN_DEPENDENCY_MAPS } from './dependency-maps.js';

// Re-export factory builder
export { createFactory } from './factory.js';
export { sampleUniform, sampleNormal, sampleExponential, sampleZipf, sampleFromDistribution } from './distributions.js';

// Re-export formatters
export * from './formatters.js';

/**
 * Write content to file
 * @param {string|Buffer} content - File content
 * @param {string} filepath - Output file path
 * @returns {Promise<void>}
 */
export async function writeFile(content, filepath) {
  const fs = await import('fs');
  const encoding = Buffer.isBuffer(content) ? null : 'utf-8';
  await fs.promises.writeFile(filepath, content, encoding);
}

/**
 * Generate data and save to file in specified format
 * @param {Object} options - Generation options
 * @param {string} options.columns - Column definitions
 * @param {number} options.rows - Number of rows
 * @param {string} options.output - Output file path
 * @param {string} options.format - Output format (csv, json, xml, xlsx, tsv, sql)
 * @param {boolean} options.preview - Show preview
 * @param {Object} options.formatOptions - Additional format-specific options
 * @returns {Promise<Object>} Generation result
 */
export async function generateAndSave(options) {
  // Detect format from filename if not specified
  let format = options.format;
  if (!format && options.output) {
    format = formatters.detectFormat(options.output);
  }
  format = format || 'csv';
  
  // Generate default output filename if not specified (skip when noFile=true)
  let output = options.output;
  if (!output && !options.noFile) {
    const ext = formatters.getFileExtension(format);
    output = `test-data.${ext}`;
  }
  
  // Seed faker for reproducible output if requested
  if (options.seed !== undefined && options.seed !== null && Number.isFinite(options.seed)) {
    core.seedFaker(options.seed);
  }

  // Set locale if requested
  if (options.locale) {
    core.setLocale(options.locale);
  }

  // Generate data
  const result = core.generateData(options);
  
  // Format data according to specified format
  const formatOptions = options.formatOptions || {};
  const formattedData = await formatters.formatData(
    result.records,
    result.columns,
    format,
    formatOptions
  );
  
  let message;
  if (!options.noFile) {
    // Write to file
    await writeFile(formattedData, output);
    message = `✓ Generated ${output} with ${result.rowCount} rows and ${result.columnCount} columns (${format.toUpperCase()} format)`;
    // Status messages go to info() (stderr in CLI) to keep stdout clean for data
    getLogger().info(message);
  } else {
    message = `Generated ${result.rowCount} rows (${format.toUpperCase()} format)`;
    // Still emit status to stderr so users know generation succeeded
    getLogger().info(message);
  }

  if (options.preview) {
    getLogger().log('\nPreview (first 3 rows):');
    getLogger().log(result.records.slice(0, 3).map(r => JSON.stringify(r)).join('\n'));
  }

  return {
    ...result,
    format,
    output: output || '<stdout>',
    data: formattedData,
    message,
  };
}

/**
 * List available data types
 */
export function listTypes() {
  const lines = ['\n📋 Available Data Types:\n'];
  
  const categories = {
    'Person': ['firstName', 'lastName', 'fullName', 'jobTitle', 'prefix', 'suffix'],
    'Internet': ['email', 'username', 'password', 'url', 'ipv4', 'userAgent'],
    'Phone': ['phone'],
    'Address': ['street', 'city', 'state', 'country', 'zipCode', 'latitude', 'longitude'],
    'Company': ['company', 'department'],
    'Commerce': ['product', 'price', 'productDescription'],
    'Finance': ['amount', 'accountNumber', 'iban', 'creditCardNumber', 'currency'],
    'Date': ['pastDate', 'futureDate', 'recentDate', 'timestamp'],
    'Numbers': ['number', 'float'],
    'Text': ['word', 'words', 'sentence', 'paragraph'],
    'IDs': ['uuid', 'nanoid', 'autoIncrement'],
    'Other': ['boolean', 'color', 'emoji'],
    'Aliases': ['string', 'text', 'integer', 'int', 'date']
  };

  for (const [category, types] of Object.entries(categories)) {
    lines.push(`${category}:`);
    types.forEach(type => lines.push(`  - ${type}`));
    lines.push('');
  }

  lines.push('Special Types:');
  lines.push('  - static:VALUE        Fixed value for all rows');
  lines.push('  - enum:val1|val2|val3 Random choice from list');
  lines.push('  - range:MIN-MAX       Random number in range');
  lines.push('  - pattern:PRD-######  Custom pattern (# for digits, {COUNTER} for auto-increment)');
  lines.push('  - pattern:user+{COUNTER}@example.com  Email pattern with auto-increment');
  
  const output = lines.join('\n');
  getLogger().log(output);
  return output;
}

/**
 * List available templates
 */
export function listTemplates() {
  const lines = ['\n📋 Available Templates:\n'];
  
  for (const [name, config] of Object.entries(core.templates)) {
    lines.push(`${name}:`);
    lines.push(`  Columns: ${config.columns}`);
    lines.push(`  Default rows: ${config.rows}`);
    lines.push('');
  }
  
  const output = lines.join('\n');
  getLogger().log(output);
  return output;
}

/**
 * Generate test data from a SQL DDL file and optionally save to disk.
 *
 * This function is Node.js-only (reads files from disk). For browser usage
 * call `generateFromSchema()` from `src/schema-generator.js` directly with
 * a pre-loaded DDL string.
 *
 * @param {Object}  options
 * @param {string}  options.schemaFile            - Path to the DDL .sql file
 * @param {number}  [options.rows=10]             - Rows to generate per table
 * @param {string}  [options.outputMode='insert'] - SQL output mode
 *   ('insert' | 'upsert' | 'truncate+insert' | 'ddl+insert')
 * @param {string}  [options.dialect='generic']   - SQL dialect
 *   ('mysql' | 'postgres' | 'sqlite' | 'generic')
 * @param {string}  [options.output]              - If set, write SQL to this file path
 * @returns {Promise<string>} Generated SQL string
 *
 * @example
 * const sql = await generateFromDDL({
 *   schemaFile: './schema.sql',
 *   rows: 20,
 *   outputMode: 'ddl+insert',
 *   dialect: 'postgres',
 *   output: './seed.sql',
 * });
 */
export async function generateFromDDL({
  schemaFile,
  rows = 10,
  outputMode = 'insert',
  dialect = 'generic',
  output,
  locale,
  seed,
}) {
  if (!schemaFile) {
    throw new Error('generateFromDDL: schemaFile is required');
  }

  const fs = await import('fs');
  const ddl = await fs.promises.readFile(schemaFile, 'utf-8');

  if (locale) {
    core.setLocale(locale);
  }

  if (seed !== undefined && seed !== null && Number.isFinite(seed)) {
    core.seedFaker(seed);
  }

  const sql = generateFromSchema({ ddl, rows, outputMode, dialect });

  if (output) {
    await fs.promises.writeFile(output, sql, 'utf-8');
    getLogger().info(`✓ Generated ${output} from schema ${schemaFile} (${outputMode}, ${dialect})`);
  }

  return sql;
}

/**
 * Ficta type → SQL type fallback map used when no explicit sqlType is provided.
 * @private
 */
const FICTA_TO_SQL_TYPE = {
  autoIncrement: 'SERIAL',
  integer: 'INTEGER',
  int: 'INTEGER',
  number: 'INTEGER',
  float: 'FLOAT',
  boolean: 'BOOLEAN',
  uuid: 'UUID',
  timestamp: 'TIMESTAMP',
  pastDate: 'DATE',
  futureDate: 'DATE',
  recentDate: 'DATE',
  date: 'DATE',
  json: 'TEXT',
};

/**
 * Read a ficta.schema.json file and generate SQL test data.
 *
 * @param {Object}  options
 * @param {string}  options.schemaFile   - Path to the JSON schema file
 * @param {number}  [options.rows]       - Override row count for all tables
 * @param {string}  [options.outputMode='ddl+insert'] - SQL output mode
 * @param {string}  [options.output]     - Optional file path to write SQL output
 * @param {string}  [options.locale]     - Faker.js locale for localized data (e.g. 'fr', 'de')
 * @param {number}  [options.seed]       - Integer seed for reproducible output
 * @param {string}  [options.dialect]    - SQL dialect override ('postgres'|'mysql'|'sqlite'|'generic')
 * @returns {Promise<string>} Generated SQL string
 */
export async function generateFromSchemaFile({ schemaFile, rows, outputMode = 'ddl+insert', output, locale, seed, dialect: dialectOverride }) {
  if (!schemaFile) {
    throw new Error('generateFromSchemaFile: schemaFile is required');
  }

  const fs = await import('fs');
  let raw;
  try {
    raw = await fs.promises.readFile(schemaFile, 'utf-8');
  } catch (err) {
    throw new Error(`generateFromSchemaFile: could not read file "${schemaFile}": ${err.message}`);
  }

  let schema;
  try {
    schema = JSON.parse(raw);
  } catch (err) {
    throw new Error(`generateFromSchemaFile: invalid JSON in "${schemaFile}": ${err.message}`);
  }

  if (!schema.tables || !Array.isArray(schema.tables) || schema.tables.length === 0) {
    throw new Error('generateFromSchemaFile: schema must have a non-empty "tables" array');
  }

  const defaultRows = rows ?? schema.defaultRows ?? 100;
  const dialect = dialectOverride || schema.dialect || 'generic';

  if (locale) {
    core.setLocale(locale);
  }

  if (seed !== undefined && seed !== null && Number.isFinite(seed)) {
    core.seedFaker(seed);
  }

  // Build per-table row counts
  const tableRows = {};
  for (const tbl of schema.tables) {
    tableRows[tbl.name] = rows ?? tbl.rows ?? defaultRows;
  }

  // Convert JSON schema tables directly to TableDef objects for generateFromSchema
  const tableDefs = schema.tables.map(tbl => {
    if (!tbl.name || !Array.isArray(tbl.columns)) {
      throw new Error(`generateFromSchemaFile: table "${tbl.name || '?'}" must have a name and columns array`);
    }
    const primaryKey = [];
    const foreignKeys = [];
    const columns = tbl.columns.map(col => {
      if (col.primaryKey) primaryKey.push(col.name);
      if (col.references) {
        foreignKeys.push({
          column: col.name,
          refTable: col.references.table,
          refColumn: col.references.column,
        });
      }
      return {
        name: col.name,
        fictaType: col.type,
        sqlType: col.sqlType || FICTA_TO_SQL_TYPE[col.type] || 'VARCHAR(255)',
        nullable: col.nullable !== false,
        autoIncrement: col.type === 'autoIncrement',
        defaultValue: col.default != null ? col.default : null,
        enumValues: null,
      };
    });
    return { tableName: tbl.name, columns, primaryKey, foreignKeys };
  });

  // Pass pre-parsed TableDef objects — no synthetic DDL construction needed
  const sql = generateFromSchema({ tables: tableDefs, rows: tableRows, outputMode, dialect });

  if (output) {
    await fs.promises.writeFile(output, sql, 'utf-8');
    getLogger().info(`✓ Generated ${output} from schema file ${schemaFile} (${outputMode}, ${dialect})`);
  }

  return sql;
}

/**
 * Generate data as a Node.js Readable stream, emitting formatted chunks.
 * Supported formats: 'csv' (Comma-Separated Values) and 'ndjson' (JSON Lines).
 * For all other formats use generateAndSave() instead.
 *
 * @param {Object} options
 * @param {string} [options.columns] - Column definitions
 * @param {string} [options.template] - Template name (alternative to columns)
 * @param {number} options.rows - Total rows to generate
 * @param {'csv'|'ndjson'} options.format - Output format
 * @param {number} [options.batchSize=500] - Rows per emitted chunk
 * @param {number} [options.seed] - Optional Faker seed for reproducible output
 * @param {string} [options.locale] - Optional Faker locale
 * @param {Object} [options.formatOptions] - Format-specific options (header, headerFormat)
 * @returns {Readable} Node.js Readable stream emitting string chunks
 */
export function generateStream({
  columns: columnsInput,
  template,
  rows: totalRows,
  format,
  batchSize = 500,
  seed,
  locale,
  formatOptions = {},
}) {
  if (format !== 'csv' && format !== 'ndjson') {
    throw new Error(
      `generateStream only supports csv and ndjson formats. Use generateAndSave() for ${format}`
    );
  }

  if (!totalRows || typeof totalRows !== 'number' || totalRows < 1) {
    throw new Error('generateStream: rows must be a positive number');
  }

  // Resolve columns from template or inline definition
  let columnString = columnsInput;
  if (template) {
    const tmpl = core.templates[template];
    if (!tmpl) {
      throw new Error(`generateStream: unknown template "${template}"`);
    }
    if (!columnString) columnString = tmpl.columns;
  }
  if (!columnString) {
    throw new Error('generateStream: either columns or template must be provided');
  }

  const columns = core.parseColumns(columnString);
  const includeHeader = formatOptions.header !== false;
  const headerFormat = formatOptions.headerFormat || 'title';

  // Apply seed / locale before any generation
  if (seed !== undefined && seed !== null && Number.isFinite(seed)) {
    core.seedFaker(seed);
  }
  if (locale) {
    core.setLocale(locale);
  }

  let rowIndex = 0;
  let headerEmitted = false;

  const stream = new Readable({
    read() {
      if (rowIndex >= totalRows) {
        this.push(null);
        return;
      }

      const chunkSize = Math.min(batchSize, totalRows - rowIndex);
      const chunks = [];

      // Emit CSV header on first read
      if (format === 'csv' && includeHeader && !headerEmitted) {
        const { formatColumnName } = formatters;
        const headerRow = columns.map(col =>
          headerFormat === 'raw' ? col.name : formatColumnName(col.name)
        ).join(',');
        chunks.push(headerRow + '\n');
        headerEmitted = true;
      }

      for (let i = 0; i < chunkSize; i++) {
        const row = core.generateRow(columns, rowIndex + i);

        if (format === 'ndjson') {
          chunks.push(JSON.stringify(row) + '\n');
        } else {
          // CSV row — reuse shared escaping logic
          const csvRow = columns.map(col => {
            const value = row[col.name];
            if (typeof value === 'string' &&
                (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',');
          chunks.push(csvRow + '\n');
        }
      }

      rowIndex += chunkSize;
      this.push(chunks.join(''));
    },
  });

  return stream;
}

/**
 * Infer Ficta column definitions from a CSV or JSON file.
 *
 * For CSV files (`.csv`): reads and parses the file using `csv-parse/sync`.
 * For JSON files (`.json`): parses the file as JSON; accepts both an array of
 * objects and a `{ data: [...] }` envelope.
 *
 * @param {string} filePath - Absolute or relative path to a `.csv` or `.json` file
 * @returns {Promise<{ columns: string, columnList: Array<{name:string,type:string}> }>}
 * @throws {Error} If the file cannot be read or the format is unsupported
 */
export async function inferSchemaFromFile(filePath) {
  const fs = await import('fs');
  const path = await import('path');

  const raw = await fs.promises.readFile(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  let rows;

  if (ext === '.csv') {
    const { parse: csvParse } = await import('csv-parse/sync');
    rows = csvParse(raw, { columns: true, skip_empty_lines: true });
  } else if (ext === '.json') {
    const parsed = JSON.parse(raw);
    rows = Array.isArray(parsed) ? parsed : (parsed.data || []);
  } else {
    throw new Error(`inferSchemaFromFile: unsupported file type "${ext}". Use .csv or .json`);
  }

  return inferSchema(rows);
}

/**
 * Read an OpenAPI 3.x YAML or JSON file and produce a ficta.schema.json structure.
 *
 * @param {string} filePath - Path to the `.json`, `.yaml`, or `.yml` OpenAPI file
 * @param {object} [options]
 * @param {string} [options.schemaName] - Which component schema to target
 * @param {number} [options.rows=100] - Rows per table
 * @param {string} [options.dialect='postgres'] - SQL dialect
 * @returns {Promise<object>} ficta.schema.json-compatible object
 */
export async function fromOpenAPIFile(filePath, options = {}) {
  const fs = await import('fs');
  const path = await import('path');

  const raw = await fs.promises.readFile(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  let doc;
  if (ext === '.yaml' || ext === '.yml') {
    const yaml = await import('js-yaml');
    doc = yaml.default.load(raw);
  } else {
    doc = JSON.parse(raw);
  }

  return openAPIToFictaSchema(doc, options);
}

/**
 * Read a `.graphql` or `.gql` file and produce a ficta.schema.json structure.
 *
 * @param {string} filePath - Path to the `.graphql` or `.gql` file
 * @param {object} [options]
 * @param {string} [options.typeName] - GraphQL object type to target
 * @param {number} [options.rows=100] - Rows per table
 * @param {string} [options.dialect='postgres'] - SQL dialect
 * @returns {Promise<object>} ficta.schema.json-compatible object
 */
export async function fromGraphQLFile(filePath, options = {}) {
  const fs = await import('fs');
  const raw = await fs.promises.readFile(filePath, 'utf-8');
  return await graphQLToFictaSchema(raw, options);
}

/**
 * Watch a schema file and regenerate output whenever it changes.
 *
 * Uses Node.js `fs.watch` (no extra dependencies) with a configurable debounce
 * delay to avoid duplicate triggers on rapid edits. Calls `generateFromDDL`
 * on each change.
 *
 * @param {object} options - Same options as generateFromDDL, plus:
 * @param {function} [options.onSuccess] - Called with (outputPath, elapsedMs) after each successful generation
 * @param {function} [options.onError]   - Called with (Error) on generation failure (if omitted, error is thrown)
 * @param {number}   [options.debounceMs=300] - Debounce delay in milliseconds
 * @returns {{ stop(): void }} An object with a `stop()` method to halt watching
 */
export function watchAndGenerate(options) {
  const {
    onSuccess,
    onError,
    debounceMs = 300,
    ...generateOptions
  } = options;

  if (!generateOptions.schemaFile) {
    throw new Error('watchAndGenerate: schemaFile is required');
  }

  let debounceTimer = null;
  let stopped = false;

  async function runGeneration() {
    const start = Date.now();
    try {
      const result = await generateFromDDL(generateOptions);
      const elapsed = Date.now() - start;
      if (onSuccess) {
        onSuccess(generateOptions.output || '', elapsed);
      }
      return result;
    } catch (err) {
      /* istanbul ignore else -- defensive throw when no onError provided; unhandled async rejection cannot be safely tested */
      if (onError) {
        onError(err);
      } else {
        throw err;
      }
    }
  }

  function handler() {
    /* istanbul ignore next -- race-condition: stopped becomes true after OS event queued */
    if (stopped) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      /* istanbul ignore next -- race-condition: stopped becomes true between debounce fire and setTimeout callback */
      if (!stopped) runGeneration();
    }, debounceMs);
  }

  // Dynamically import fs to watch the file
  import('fs').then(fsModule => {
    if (!stopped) {
      const watcher = fsModule.watch(generateOptions.schemaFile, { persistent: false }, handler);

      // Override stop to close the watcher
      watcherRef.stop = () => {
        stopped = true;
        clearTimeout(debounceTimer);
        watcher.close();
      };
    }
  });

  const watcherRef = {
    stop() {
      stopped = true;
      clearTimeout(debounceTimer);
    },
  };

  return watcherRef;
}

// Re-export anonymizeRecords for universal (browser) use
export { anonymizeRecords, categorizeColumns, buildIdMap, computeStats } from './anonymizer.js';

/**
 * Anonymize a CSV or JSON file by replacing PII columns with Faker-generated data.
 *
 * @param {string} inputPath - Path to the input file (.csv or .json)
 * @param {string} outputPath - Path for the anonymized output file
 * @param {Object} [options={}]
 * @param {string[]} [options.keepColumns=[]] - Column names to pass through unchanged
 * @param {string[]} [options.onlyColumns] - If set, only anonymize these columns
 * @param {boolean} [options.preserveDistributions=true] - Preserve numeric distributions
 * @param {Map<string,string>} [options.idMap] - Existing ID map for cross-file consistency
 * @returns {Promise<{ records: Object[], idMap: Map<string,string> }>}
 */
export async function anonymizeFile(inputPath, outputPath, options = {}) {
  const fs = await import('fs');
  const path = await import('path');
  const ext = path.extname(inputPath).toLowerCase();

  let records;
  let columns;

  if (ext === '.json') {
    const raw = JSON.parse(await fs.promises.readFile(inputPath, 'utf-8'));
    records = Array.isArray(raw) ? raw : (raw.records || []);
    columns = records.length > 0
      ? Object.keys(records[0]).map(name => ({ name, type: '' }))
      : [];
  } else {
    // Default: treat as CSV
    const { parse: csvParse } = await import('csv-parse/sync');
    const content = await fs.promises.readFile(inputPath, 'utf-8');
    records = csvParse(content, { columns: true, skip_empty_lines: true });
    columns = records.length > 0
      ? Object.keys(records[0]).map(name => ({ name, type: '' }))
      : [];
  }

  const { records: anonymized, idMap } = anonymizeRecords({ records, columns, options });

  if (outputPath) {
    const outExt = path.extname(outputPath).toLowerCase();
    let content;
    if (outExt === '.json') {
      content = JSON.stringify(anonymized, null, 2);
    } else {
      const { toCSV } = await import('./formatters.shared.js');
      content = toCSV(anonymized, columns);
    }
    await fs.promises.writeFile(outputPath, content, 'utf-8');
    getLogger().info(`✓ Anonymized ${anonymized.length} records → ${outputPath}`);
  }

  return { records: anonymized, idMap };
}
