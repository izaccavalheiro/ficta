// Node.js-specific functionality for Ficta
import { faker } from '@faker-js/faker';
import { Readable } from 'stream';
import * as core from './core.js';
import * as formatters from './formatters.js';
import { generateFromSchema } from './schema-generator.js';
import { parseDDL as parseDDLStatic, orderByDependencies as orderByDepsStatic } from './ddl-parser.js';
import { generateDDL as genDDLStatic, generateInserts as genInsertsStatic, generateUpserts as genUpsertStatic } from './sql-schema.js';

// Initialize faker for the core module
core.setFaker(faker);

// Re-export core functionality (including seedFaker)
export * from './core.js';

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
  
  // Generate default output filename if not specified
  let output = options.output;
  if (!output) {
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
  
  // Write to file
  await writeFile(formattedData, output);
  
  console.log(`✓ Generated ${output} with ${result.rowCount} rows and ${result.columnCount} columns (${format.toUpperCase()} format)`);
  
  if (options.preview) {
    console.log('\nPreview (first 3 rows):');
    console.table(result.records.slice(0, 3));
  }
  
  return {
    ...result,
    format,
    output,
    data: formattedData
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
  console.log(output);
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
  console.log(output);
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
}) {
  if (!schemaFile) {
    throw new Error('generateFromDDL: schemaFile is required');
  }

  const fs = await import('fs');
  const ddl = await fs.promises.readFile(schemaFile, 'utf-8');

  const sql = generateFromSchema({ ddl, rows, outputMode, dialect });

  if (output) {
    await fs.promises.writeFile(output, sql, 'utf-8');
    console.log(`✓ Generated ${output} from schema ${schemaFile} (${outputMode}, ${dialect})`);
  }

  return sql;
}

/**
 * Read a ficta.schema.json file and generate SQL test data.
 *
 * @param {Object}  options
 * @param {string}  options.schemaFile   - Path to the JSON schema file
 * @param {number}  [options.rows]       - Override row count for all tables
 * @param {string}  [options.outputMode='ddl+insert'] - SQL output mode
 * @param {string}  [options.output]     - Optional file path to write SQL output
 * @returns {Promise<string>} Generated SQL string
 */
export async function generateFromSchemaFile({ schemaFile, rows, outputMode = 'ddl+insert', output }) {
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
  const dialect = schema.dialect || 'generic';

  // Map JSON schema tables to the shape expected by generateFromSchema DDL path.
  // We build a synthetic DDL string from the JSON schema.
  // (parseDDLStatic is imported at the top level for coverage trackability)

  // Build a synthetic DDL string from the JSON table definitions, then use
  // generateFromSchema to do FK-aware generation in topological order.
  const ddlLines = [];
  for (const tbl of schema.tables) {
    if (!tbl.name || !Array.isArray(tbl.columns)) {
      throw new Error(`generateFromSchemaFile: table "${tbl.name || '?'}" must have a name and columns array`);
    }
    const colDefs = tbl.columns.map(col => {
      let def = `  ${col.name} `;
      // Map ficta type to a sensible SQL type
      const typeMap = {
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
      const sqlType = col.sqlType || typeMap[col.type] || 'VARCHAR(255)';
      def += sqlType;
      if (col.primaryKey) def += ' PRIMARY KEY';
      if (col.nullable === false || col.notNull) def += ' NOT NULL';
      if (col.default !== undefined) def += ` DEFAULT ${col.default}`;
      if (col.references) def += ` REFERENCES ${col.references.table}(${col.references.column})`;
      return def;
    });
    ddlLines.push(`CREATE TABLE ${tbl.name} (\n${colDefs.join(',\n')}\n);`);
  }
  const ddl = ddlLines.join('\n\n');

  // Build per-table row counts
  const tableRows = {};
  for (const tbl of schema.tables) {
    tableRows[tbl.name] = rows ?? tbl.rows ?? defaultRows;
  }

  // generateFromSchema uses a single rows value; we use the minimum to keep things
  // simple. Per-table overrides require the orchestrator to be called per-table.
  // Since all tables may have different row counts, call generateFromSchema per-table
  // when counts differ, otherwise use the unified path.
  const rowCounts = Object.values(tableRows);
  const allSame = rowCounts.every(r => r === rowCounts[0]);

  let sql;
  if (allSame) {
    sql = generateFromSchema({ ddl, rows: rowCounts[0], outputMode, dialect });
  } else {
    // For mixed row counts, generate table by table and assemble
    const parsedTables = parseDDLStatic(ddl);
    const ordered = orderByDepsStatic(parsedTables);
    const pkStore = {};
    const output2 = [];

    if (outputMode === 'ddl+insert') {
      for (const tbl of ordered) {
        const cols = tbl.columns.map(col => ({
          name: col.name, type: col.fictaType, sqlType: col.sqlType,
          primaryKey: Array.isArray(tbl.primaryKey) && tbl.primaryKey.includes(col.name),
          nullable: col.nullable !== false, notNull: col.nullable === false,
          default: col.defaultValue ?? undefined,
          references: tbl.foreignKeys.find(f => f.column === col.name)
            ? { table: tbl.foreignKeys.find(f => f.column === col.name).refTable, column: tbl.foreignKeys.find(f => f.column === col.name).refColumn }
            : null,
        }));
        output2.push(genDDLStatic(tbl.tableName, cols, { dialect }));
        output2.push('');
      }
    }

    for (const tbl of ordered) {
      const tableRowCount = tableRows[tbl.tableName] || defaultRows;
      const fkMap = new Map(tbl.foreignKeys.map(fk => [fk.column, fk]));
      const records = [];
      for (let i = 0; i < tableRowCount; i++) {
        const row = {};
        for (const col of tbl.columns) {
          if (fkMap.has(col.name)) {
            const fk = fkMap.get(col.name);
            const pkEntry = pkStore[fk.refTable];
            const parentVals = pkEntry ? (pkEntry[fk.refColumn] || []) : [];
            if (parentVals.length > 0) {
              row[col.name] = parentVals[Math.floor(Math.random() * parentVals.length)];
              continue;
            }
          }
          if (col.autoIncrement || col.fictaType === 'autoIncrement') {
            row[col.name] = i + 1; continue;
          }
          const gen = core.generateRow([{ name: col.name, type: col.fictaType }], i);
          row[col.name] = gen[col.name];
        }
        records.push(row);
      }
      // Store PKs
      for (const pk of (tbl.primaryKey || [])) {
        if (!pkStore[tbl.tableName]) pkStore[tbl.tableName] = {};
        pkStore[tbl.tableName][pk] = records.map(r => r[pk]);
      }
      const insertCols = tbl.columns.map(col => ({ name: col.name }));
      output2.push(`-- Table: ${tbl.tableName}`);
      if (outputMode === 'upsert') {
        output2.push(genUpsertStatic(tbl.tableName, records, insertCols, { dialect, conflictColumns: tbl.primaryKey }));
      } else {
        output2.push(genInsertsStatic(tbl.tableName, records, insertCols, { dialect }));
      }
      output2.push('');
    }
    sql = output2.join('\n');
  }

  if (output) {
    await fs.promises.writeFile(output, sql, 'utf-8');
    console.log(`✓ Generated ${output} from schema file ${schemaFile} (${outputMode}, ${dialect})`);
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

