// Formatters for different file formats
import ExcelJS from 'exceljs';
import xml2js from 'xml2js';
import yaml from 'js-yaml';
import TOML from '@iarna/toml';

/**
 * Format column name to Title Case
 * @param {string} name - Column name
 * @returns {string} Formatted name
 */
export function formatColumnName(name) {
  return name.replace(/([A-Z])/g, ' $1').trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Convert array of objects to CSV string
 * @param {Array} records - Array of row objects
 * @param {Array} columns - Column definitions
 * @returns {string} CSV string
 */
export function toCSV(records, columns) {
  if (records.length === 0) {
    return '';
  }
  
  // Parse columns if string was passed
  const parsedColumns = typeof columns === 'string' 
    ? columns.split(',').map(c => ({ name: c.trim() }))
    : columns;
  
  const headers = parsedColumns.map(col => formatColumnName(col.name));
  const headerRow = headers.join(',');
  
  const dataRows = records.map(record => {
    return parsedColumns.map(col => {
      const value = record[col.name];
      // Escape values that contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Convert array of objects to JSON string
 * @param {Array} records - Array of row objects
 * @param {boolean} pretty - Whether to pretty print
 * @returns {string} JSON string
 */
export function toJSON(records, pretty = true) {
  return JSON.stringify(records, null, pretty ? 2 : 0);
}

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
 * Convert array of objects to TSV (Tab-Separated Values) string
 * @param {Array} records - Array of row objects
 * @param {Array} columns - Column definitions
 * @returns {string} TSV string
 */
export function toTSV(records, columns) {
  if (records.length === 0) {
    return '';
  }
  
  const headers = columns.map(col => formatColumnName(col.name));
  const headerRow = headers.join('\t');
  
  const dataRows = records.map(record => {
    return columns.map(col => {
      const value = record[col.name];
      // Escape tabs and newlines
      if (typeof value === 'string') {
        return value.replace(/\t/g, ' ').replace(/\n/g, ' ');
      }
      return value;
    }).join('\t');
  });
  
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Convert array of objects to SQL INSERT statements
 * @param {Array} records - Array of row objects
 * @param {Array} columns - Column definitions
 * @param {string} tableName - Table name
 * @returns {string} SQL INSERT statements
 */
export function toSQL(records, columns, tableName = 'data_table') {
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
      return toCSV(records, columns);
    
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
      return toTSV(records, columns);
    
    case 'sql':
      return toSQL(records, columns, options.tableName || 'data_table');
    
    case 'yaml':
    case 'yml':
      return toYAML(records);
    
    case 'toml':
      return toTOML(records);
    
    default:
      throw new Error(`Unsupported format: ${format}. Supported formats: csv, json, xml, xlsx, tsv, sql, yaml, yml, toml`);
  }
}

/**
 * Get appropriate file extension for format
 * @param {string} format - Format name
 * @returns {string} File extension (without dot)
 */
export function getFileExtension(format) {
  const extensions = {
    csv: 'csv',
    json: 'json',
    xml: 'xml',
    xlsx: 'xlsx',
    xls: 'xlsx',
    excel: 'xlsx',
    tsv: 'tsv',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yml',
    toml: 'toml'
  };
  
  return extensions[format.toLowerCase()] || format.toLowerCase();
}

/**
 * Detect format from filename
 * @param {string} filename - Filename
 * @returns {string} Detected format
 */
export function detectFormat(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const formatMap = {
    csv: 'csv',
    json: 'json',
    xml: 'xml',
    xlsx: 'xlsx',
    xls: 'xlsx',
    tsv: 'tsv',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yml',
    toml: 'toml'
  };
  
  return formatMap[ext] || 'csv';
}
