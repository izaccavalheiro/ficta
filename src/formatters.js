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
    
    default:
      throw new Error(`Unsupported format: ${format}. Supported formats: csv, json, xml, xlsx, tsv, sql, yaml, yml, toml`);
  }
}
