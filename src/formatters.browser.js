// Browser-compatible formatters for different file formats
// No Node.js dependencies - works in any browser
import * as sqlSchema from './sql-schema.js';

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
  
  const headers = columns.map(col => formatColumnName(col.name));
  const headerRow = headers.join(',');
  
  const dataRows = records.map(record => {
    return columns.map(col => {
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
 * @returns {string} XML string
 */
export function toXML(records, rootElement = 'data', recordElement = 'record') {
  const escapeXML = (str) => {
    if (typeof str !== 'string') {
      str = String(str);
    }
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };
  
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += `<${rootElement}>\n`;
  
  records.forEach(record => {
    xml += `  <${recordElement}>\n`;
    for (const [key, value] of Object.entries(record)) {
      xml += `    <${key}>${escapeXML(value)}</${key}>\n`;
    }
    xml += `  </${recordElement}>\n`;
  });
  
  xml += `</${rootElement}>`;
  return xml;
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
    batch: options.batch
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
 * Convert array of objects to YAML string (browser-compatible)
 * @param {Array} records - Array of row objects
 * @returns {string} YAML string
 */
export function toYAML(records) {
  if (records.length === 0) {
    return '[]\n';
  }
  
  const yamlLines = [];
  records.forEach((record, index) => {
    yamlLines.push(`- ${Object.keys(record).map(key => {
      const value = record[key];
      const yamlValue = typeof value === 'string' 
        ? (value.includes(':') || value.includes('#') || value.includes('\n') 
          ? JSON.stringify(value) 
          : value)
        : JSON.stringify(value);
      return `${key}: ${yamlValue}`;
    }).join('\n  ')}`);
    if (index < records.length - 1) {
      yamlLines.push('');
    }
  });
  
  return yamlLines.join('\n');
}

/**
 * Convert array of objects to TOML string (browser-compatible)
 * @param {Array} records - Array of row objects
 * @returns {string} TOML string
 */
export function toTOML(records) {
  if (records.length === 0) {
    return '';
  }
  
  const tomlLines = [];
  records.forEach((record, index) => {
    tomlLines.push(`[[records]]`);
    Object.entries(record).forEach(([key, value]) => {
      const tomlValue = typeof value === 'string' 
        ? JSON.stringify(value)
        : value;
      tomlLines.push(`${key} = ${tomlValue}`);
    });
    if (index < records.length - 1) {
      tomlLines.push('');
    }
  });
  
  return tomlLines.join('\n');
}

/**
 * Format data according to specified format
 * @param {Array} records - Array of row objects
 * @param {Array} columns - Column definitions
 * @param {string} format - Output format (csv, json, xml, tsv, sql)
 * @param {Object} options - Additional formatting options
 * @returns {string} Formatted data
 */
export function formatData(records, columns, format, options = {}) {
  switch (format.toLowerCase()) {
    case 'csv':
      return toCSV(records, columns);
    
    case 'json':
      return toJSON(records, options.pretty !== false);
    
    case 'xml':
      return toXML(
        records,
        options.rootElement || 'data',
        options.recordElement || 'record'
      );
    
    case 'tsv':
      return toTSV(records, columns);
    
    case 'sql':
      // Pass through all SQL-specific options
      const sqlOptions = {
        tableName: options.tableName || 'data_table',
        dialect: options.dialect,
        mode: options.mode,
        batch: options.batch
      };
      return toSQL(records, columns, sqlOptions);
    
    case 'yaml':
    case 'yml':
      return toYAML(records);
    
    case 'toml':
      return toTOML(records);
    
    default:
      throw new Error(`Unsupported format in browser: ${format}. Supported formats: csv, json, xml, tsv, sql, yaml, yml, toml. For Excel files, use the Node.js version.`);
  }
}

/**
 * Get appropriate MIME type for format
 * @param {string} format - Format name
 * @returns {string} MIME type
 */
export function getMimeType(format) {
  const mimeTypes = {
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    tsv: 'text/tab-separated-values',
    sql: 'application/sql',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    toml: 'application/toml'
  };
  
  return mimeTypes[format.toLowerCase()] || 'text/plain';
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
    tsv: 'tsv',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yml',
    toml: 'toml'
  };
  
  return formatMap[ext] || 'csv';
}
