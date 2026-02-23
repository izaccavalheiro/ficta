/**
 * Shared pure formatter utilities — environment-agnostic.
 * These functions contain zero Node.js or browser-specific dependencies and
 * are re-exported by both formatters.js (Node.js) and formatters.browser.js.
 */

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
 * @param {Object} [options={}] - Formatting options
 * @param {boolean} [options.header=true] - Whether to include a header row
 * @param {'title'|'raw'} [options.headerFormat='title'] - Header casing: 'title' uses formatColumnName, 'raw' uses key names as-is
 * @returns {string} CSV string
 */
export function toCSV(records, columns, options = {}) {
  if (records.length === 0) {
    return '';
  }

  const includeHeader = options.header !== false;
  const headerFormat = options.headerFormat || 'title';

  // Parse columns if string was passed
  const parsedColumns = typeof columns === 'string'
    ? columns.split(',').map(c => ({ name: c.trim() }))
    : columns;

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

  if (!includeHeader) {
    return dataRows.join('\n');
  }

  const headers = parsedColumns.map(col =>
    headerFormat === 'raw' ? col.name : formatColumnName(col.name)
  );
  const headerRow = headers.join(',');

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
 * Convert array of objects to TSV (Tab-Separated Values) string
 * @param {Array} records - Array of row objects
 * @param {Array} columns - Column definitions
 * @param {Object} [options={}] - Formatting options
 * @param {boolean} [options.header=true] - Whether to include a header row
 * @param {'title'|'raw'} [options.headerFormat='title'] - Header casing: 'title' uses formatColumnName, 'raw' uses key names as-is
 * @returns {string} TSV string
 */
export function toTSV(records, columns, options = {}) {
  if (records.length === 0) {
    return '';
  }

  const includeHeader = options.header !== false;
  const headerFormat = options.headerFormat || 'title';

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

  if (!includeHeader) {
    return dataRows.join('\n');
  }

  const headers = columns.map(col =>
    headerFormat === 'raw' ? col.name : formatColumnName(col.name)
  );
  const headerRow = headers.join('\t');

  return [headerRow, ...dataRows].join('\n');
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
