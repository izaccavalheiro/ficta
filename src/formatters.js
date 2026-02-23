// Formatters for different file formats
import ExcelJS from 'exceljs';
import xml2js from 'xml2js';
import yaml from 'js-yaml';
import TOML from '@iarna/toml';
import * as sqlSchema from './sql-schema.js';
import { generateFromSchema } from './schema-generator.js';

// Re-export shared pure utilities
export { formatColumnName, toCSV, toJSON, toTSV, getFileExtension, detectFormat } from './formatters.shared.js';
import { formatColumnName, toCSV, toJSON, toTSV } from './formatters.shared.js';

/**
 * Convert array of objects to XML string
 * @param {Array} records - Array of row objects
 * @param {string} rootElement - Root element name
 * @param {string} recordElement - Individual record element name
 * @returns {Promise<string>} XML string
 */
export async function toXML(records, rootElement = 'data', recordElement = 'record') {
  const builder = new xml2js.Builder({
    rootName: rootElement,
    xmldec: { version: '1.0', encoding: 'UTF-8', standalone: true }
  });
  
  const data = {
    [recordElement]: records
  };
  
  return builder.buildObject(data);
}

/**
 * Convert array of objects to Excel workbook buffer
 * @param {Array} records - Array of row objects
 * @param {Array} columns - Column definitions
 * @param {string} sheetName - Worksheet name
 * @returns {Promise<Buffer>} Excel workbook buffer
 */
export async function toExcel(records, columns, sheetName = 'Sheet1') {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  
  if (records.length === 0) {
    return await workbook.xlsx.writeBuffer();
  }
  
  // Create headers with formatted names
  const headers = columns.map(col => formatColumnName(col.name));
  worksheet.addRow(headers);
  
  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Add data rows
  records.forEach(record => {
    const row = columns.map(col => record[col.name]);
    worksheet.addRow(row);
  });
  
  // Auto-fit columns
  worksheet.columns.forEach((column, index) => {
    let maxLength = headers[index].length;
    column.eachCell({ includeEmpty: false }, cell => {
      const cellValue = cell.value ? cell.value.toString() : '';
      maxLength = Math.max(maxLength, cellValue.length);
    });
    column.width = Math.min(maxLength + 2, 50);
  });
  
  return await workbook.xlsx.writeBuffer();
}

/**
 * Convert array of objects to SQL INSERT statements or generate schema
 * 
 * Supports two modes:
 * 1. Legacy mode (backward compatible): toSQL(records, columns, tableName)
 * 2. Schema mode: toSQL(records, columns, schemaOptions)
 * 
 * @param {Array} records - Array of row objects
 * @param {Array} columns - Column definitions
 * @param {string|Object} tableNameOrOptions - Table name (string) or schema options (object)
 * @returns {string} SQL statements (INSERT, DDL, or both)
 * 
 * @example
 * // Legacy mode
 * toSQL(records, columns, 'users')
 * 
 * @example
 * // Schema mode with DDL
 * toSQL(records, columns, {
 *   tableName: 'users',
 *   mode: 'ddl+insert',
 *   dialect: 'postgres'
 * })
 */
export function toSQL(records, columns, tableNameOrOptions = 'data_table') {
  // DDL / multi-table schema overload:
  // If first arg is an object with a 'ddl' or 'tables' key, delegate to
  // generateFromSchema() which handles full multi-table orchestration.
  if (records !== null && typeof records === 'object' && !Array.isArray(records)) {
    if ('ddl' in records || 'tables' in records) {
      const { ddl, tables, rows = 10, outputMode = 'insert', dialect = 'generic' } = records;
      return generateFromSchema({ ddl, tables, rows, outputMode, dialect });
    }
  }

  // Backward compatibility: if third param is a string, use legacy mode
  if (typeof tableNameOrOptions === 'string') {
    return toSQLLegacy(records, columns, tableNameOrOptions);
  }
  
  // New schema mode
  const options = tableNameOrOptions || {};
  const tableName = options.tableName || options.table || 'data_table';
  const mode = options.mode || 'insert';
  const dialect = options.dialect || 'generic';
  
  // Build schema object for generator
  const schema = {
    table: tableName,
    columns: columns,
    records: records,
    dialect: dialect,
    mode: mode,
    batch: options.batch,
    conflictColumns: options.conflictColumns,
  };
  
  return sqlSchema.generateSchema(schema);
}

/**
 * Legacy SQL INSERT generation (backward compatible)
 * @private
 */
function toSQLLegacy(records, columns, tableName) {
  if (records.length === 0) {
    return '';
  }
  
  const columnNames = columns.map(col => col.name);
  const statements = [];
  
  records.forEach(record => {
    const values = columns.map(col => {
      const value = record[col.name];
      if (value === null || value === undefined) {
        return 'NULL';
      }
      if (typeof value === 'string') {
        // Escape single quotes
        return `'${value.replace(/'/g, "''")}'`;
      }
      if (typeof value === 'boolean') {
        return value ? '1' : '0';
      }
      return value;
    });
    
    statements.push(
      `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')});`
    );
  });
  
  return statements.join('\n');
}

/**
 * Convert array of objects to YAML string
 * @param {Array} records - Array of row objects
 * @returns {string} YAML string
 */
export function toYAML(records) {
  return yaml.dump(records, {
    indent: 2,
    lineWidth: 120,
    noRefs: true
  });
}

/**
 * Convert array of objects to TOML string
 * @param {Array} records - Array of row objects
 * @returns {string} TOML string
 */
export function toTOML(records) {
  // TOML works best with a root object containing arrays
  // Format as [[records]] array of tables
  return TOML.stringify({ records });
}

/**
 * Generate a Parquet file buffer from records.
 *
 * Column type mapping:
 * - `number` / `autoIncrement` / `integer` / `int` → INT64
 * - `price` / `float` / `amount`                  → DOUBLE
 * - `boolean`                                      → BOOLEAN
 * - all others                                     → UTF8
 *
 * @param {Array<Record<string, unknown>>} records - Array of row objects
 * @param {Array<{name: string, type: string}>} columns - Column definitions
 * @returns {Promise<Buffer>} Parquet file buffer
 */
export async function toParquet(records, columns) {
  const parquet = await import('parquetjs-lite');
  /* istanbul ignore next -- CJS/ESM interop; parquet.default always present in test env */
  const { ParquetSchema, ParquetWriter } = parquet.default || parquet;
  const os = await import('os');
  const fs = await import('fs');
  const path = await import('path');

  // Build Parquet schema fields
  const schemaFields = {};
  for (const col of columns) {
    const t = col.type;
    if (t === 'number' || t === 'autoIncrement' || t === 'integer' || t === 'int') {
      schemaFields[col.name] = { type: 'INT64', optional: true };
    } else if (t === 'price' || t === 'float' || t === 'amount') {
      schemaFields[col.name] = { type: 'DOUBLE', optional: true };
    } else if (t === 'boolean') {
      schemaFields[col.name] = { type: 'BOOLEAN', optional: true };
    } else {
      schemaFields[col.name] = { type: 'UTF8', optional: true };
    }
  }

  const schema = new ParquetSchema(schemaFields);
  const tmpFile = path.join(
    os.tmpdir(),
    `ficta-${Date.now()}-${Math.random().toString(36).slice(2)}.parquet`
  );

  const writer = await ParquetWriter.openFile(schema, tmpFile);
  for (const record of records) {
    const row = {};
    for (const col of columns) {
      const val = record[col.name];
      const t = col.type;
      if (t === 'number' || t === 'autoIncrement' || t === 'integer' || t === 'int') {
        row[col.name] = val !== null && val !== undefined ? BigInt(Math.round(Number(val))) : null;
      } else if (t === 'price' || t === 'float' || t === 'amount') {
        row[col.name] = val !== null && val !== undefined ? Number(val) : null;
      } else if (t === 'boolean') {
        row[col.name] = val !== null && val !== undefined ? Boolean(val) : null;
      } else {
        row[col.name] = val !== null && val !== undefined ? String(val) : null;
      }
    }
    await writer.appendRow(row);
  }
  await writer.close();

  const buf = await fs.promises.readFile(tmpFile);
  await fs.promises.unlink(tmpFile);
  return buf;
}

/**
 * Format data according to specified format
 * @param {Array} records - Array of row objects
 * @param {Array} columns - Column definitions
 * @param {string} format - Output format (csv, json, xml, xlsx, tsv, sql)
 * @param {Object} options - Additional formatting options
 * @returns {Promise<string|Buffer>} Formatted data
 */
export async function formatData(records, columns, format, options = {}) {
  switch (format.toLowerCase()) {
    case 'csv':
      return toCSV(records, columns, {
        header: options.header !== false,
        headerFormat: options.headerFormat || 'title'
      });
    
    case 'json':
      return toJSON(records, options.pretty !== false);
    
    case 'xml':
      return await toXML(
        records,
        options.rootElement || 'data',
        options.recordElement || 'record'
      );
    
    case 'xlsx':
    case 'xls':
    case 'excel':
      return await toExcel(records, columns, options.sheetName || 'Sheet1');
    
    case 'tsv':
      return toTSV(records, columns, {
        header: options.header !== false,
        headerFormat: options.headerFormat || 'title'
      });
    
    case 'sql':
      // Pass through all SQL-specific options
      const sqlOptions = {
        tableName: options.tableName || 'data_table',
        dialect: options.dialect,
        mode: options.mode,
        batch: options.batch,
        conflictColumns: options.conflictColumns,
      };
      return toSQL(records, columns, sqlOptions);
    
    case 'yaml':
    case 'yml':
      return toYAML(records);
    
    case 'toml':
      return toTOML(records);

    case 'parquet':
      return await toParquet(records, columns);

    default:
      throw new Error(`Unsupported format: ${format}. Supported formats: csv, json, xml, xlsx, tsv, sql, yaml, yml, toml, parquet`);
  }
}
