/**
 * Schema Generator - Orchestrate multi-table data generation from parsed DDL.
 *
 * Pure module. Zero Node.js / browser-specific APIs.
 * Faker must be initialised by the caller via `setFaker()` from core.js before
 * any generation function is invoked.
 *
 * @module schema-generator
 */

import { parseDDL, orderByDependencies } from './ddl-parser.js';
import { generateRow, getFaker } from './core.js';
import {
  generateDDL,
  generateInserts,
  generateUpserts,
} from './sql-schema.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Map a TableDef column array to the shape expected by sql-schema.generateDDL.
 * @param {Object} tableDef
 * @returns {Array}
 */
function buildDDLColumns(tableDef) {
  return tableDef.columns.map(col => {
    const fk = tableDef.foreignKeys.find(f => f.column === col.name);
    return {
      name: col.name,
      type: col.fictaType,
      sqlType: col.sqlType,
      primaryKey:
        Array.isArray(tableDef.primaryKey) && tableDef.primaryKey.includes(col.name),
      nullable: col.nullable !== false,
      notNull: col.nullable === false,
      default: col.defaultValue != null ? col.defaultValue : undefined,
      references: fk ? { table: fk.refTable, column: fk.refColumn } : null,
    };
  });
}

/**
 * Map a TableDef column array to the minimal shape expected by generateInserts.
 * @param {Object} tableDef
 * @returns {Array<{name: string}>}
 */
function buildInsertColumns(tableDef) {
  return tableDef.columns.map(col => ({ name: col.name }));
}

/**
 * Generate rows of data for a single table, honouring FK constraints.
 *
 * @param {Object} params
 * @param {Object} params.tableDef - Parsed TableDef from ddl-parser
 * @param {number} params.rows     - Number of rows to generate
 * @param {Object} params.pkStore  - Live map of { tableName: { colName: value[] } }
 * @returns {Array<Object>} Generated records
 */
function generateTableData({ tableDef, rows, pkStore }) {
  const { columns, foreignKeys } = tableDef;

  const fkMap = new Map();
  for (const fk of foreignKeys) {
    fkMap.set(fk.column, { refTable: fk.refTable, refColumn: fk.refColumn });
  }

  const records = [];

  for (let i = 0; i < rows; i++) {
    const row = {};

    for (const col of columns) {
      // FK column: pick a value from parent table's PK
      if (fkMap.has(col.name)) {
        const { refTable, refColumn } = fkMap.get(col.name);
        const parentValues = pkStore[refTable]?.[refColumn] ?? [];
        if (parentValues.length > 0) {
          const idx = getFaker().number.int({ min: 0, max: parentValues.length - 1 });
          row[col.name] = parentValues[idx];
          continue;
        }
        // Parent not available — fall through to normal generation
      }

      // Auto-increment columns
      if (col.autoIncrement || col.fictaType === 'autoIncrement') {
        row[col.name] = i + 1;
        continue;
      }

      // Normal column — delegate to core.generateRow
      const generated = generateRow([{ name: col.name, type: col.fictaType }], i);
      row[col.name] = generated[col.name];
    }

    records.push(row);
  }

  return records;
}

/**
 * Store generated PK values for a table so child tables can reference them.
 * Mutates pkStore in place.
 *
 * @param {Object}        tableDef
 * @param {Array<Object>} records
 * @param {Object}        pkStore
 */
function storePKValues(tableDef, records, pkStore) {
  if (!tableDef.primaryKey || tableDef.primaryKey.length === 0) return;
  pkStore[tableDef.tableName] = {};
  for (const pkCol of tableDef.primaryKey) {
    pkStore[tableDef.tableName][pkCol] = records
      .map(r => r[pkCol])
      .filter(v => v !== undefined && v !== null);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate multi-table test data from a DDL string (or pre-parsed TableDef
 * array) and produce a complete SQL script.
 *
 * Tables are processed in foreign-key dependency order so that parent rows
 * always exist before child rows reference them.
 *
 * Supported outputMode values:
 * - `'insert'`          — INSERT INTO ... VALUES (...) per row (default)
 * - `'upsert'`          — dialect-aware upsert syntax
 * - `'truncate+insert'` — TRUNCATE TABLE statements (reverse order) + inserts
 * - `'ddl+insert'`      — CREATE TABLE DDL for every table, then inserts
 *
 * Supported dialect values: `'mysql'` | `'postgres'` | `'sqlite'` | `'generic'`
 *
 * @param {Object}  options
 * @param {string}  [options.ddl]                 - Raw DDL SQL string
 * @param {Array}   [options.tables]              - Pre-parsed TableDef array (from parseDDL)
 * @param {number|Object}  [options.rows=10]      - Rows to generate per table.
 *   Pass a number for the same count on all tables, or a
 *   `Record<string, number>` mapping table names to row counts.
 *   Tables not present in the object fall back to 10.
 * @param {string}  [options.outputMode='insert'] - SQL output mode
 * @param {string}  [options.dialect='generic']   - SQL dialect
 * @returns {string} Complete SQL script
 *
 * @example
 * import { setFaker } from './core.js';
 * import { faker } from '@faker-js/faker';
 * setFaker(faker);
 *
 * const sql = generateFromSchema({
 *   ddl: `
 *     CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR(255) NOT NULL);
 *     CREATE TABLE posts (
 *       id SERIAL PRIMARY KEY,
 *       user_id INT REFERENCES users(id),
 *       title VARCHAR(255)
 *     );
 *   `,
 *   rows: 5,
 *   outputMode: 'ddl+insert',
 *   dialect: 'postgres',
 * });
 */
export function generateFromSchema({
  ddl,
  tables: inputTables,
  rows = 10,
  outputMode = 'insert',
  dialect = 'generic',
}) {
  if (!ddl && !inputTables) {
    throw new Error(
      'generateFromSchema requires either "ddl" (string) or "tables" (Array)'
    );
  }

  const validModes = ['insert', 'upsert', 'truncate+insert', 'ddl+insert'];
  if (!validModes.includes(outputMode)) {
    throw new Error(
      `Unknown outputMode: "${outputMode}". Available: ${validModes.join(', ')}`
    );
  }

  const validDialects = ['mysql', 'postgres', 'sqlite', 'generic'];
  if (!validDialects.includes(dialect)) {
    throw new Error(
      `Unknown dialect: "${dialect}". Available: ${validDialects.join(', ')}`
    );
  }

  // Parse DDL if a raw string was provided
  const parsedTables = inputTables || parseDDL(ddl);

  // Topologically sort by FK dependencies
  const orderedTables = orderByDependencies(parsedTables);

  // Generate data, table by table
  const pkStore = {};
  const tableResults = [];

  for (const tableDef of orderedTables) {
    const tableRows = typeof rows === 'object' && rows !== null
      ? (tableDef.tableName in rows ? rows[tableDef.tableName] : 10)
      : rows;
    const records = generateTableData({ tableDef, rows: tableRows, pkStore });
    storePKValues(tableDef, records, pkStore);
    tableResults.push({
      tableDef,
      records,
      ddlCols: buildDDLColumns(tableDef),
      insertCols: buildInsertColumns(tableDef),
    });
  }

  // Assemble SQL output
  const output = [];

  // TRUNCATE in reverse order (leaf tables first to respect FK constraints)
  if (outputMode === 'truncate+insert') {
    for (const { tableDef } of [...tableResults].reverse()) {
      const cascade = dialect === 'postgres' ? ' CASCADE' : '';
      output.push(`TRUNCATE TABLE ${tableDef.tableName}${cascade};`);
    }
    output.push('');
  }

  // DDL block
  if (outputMode === 'ddl+insert') {
    for (const { tableDef, ddlCols } of tableResults) {
      output.push(generateDDL(tableDef.tableName, ddlCols, { dialect }));
      output.push('');
    }
  }

  // DML block
  for (const { tableDef, records, ddlCols, insertCols } of tableResults) {
    if (records.length === 0) continue;

    output.push(`-- Table: ${tableDef.tableName}`);

    if (outputMode === 'upsert') {
      const conflictColumns = tableDef.primaryKey || [];
      output.push(
        generateUpserts(tableDef.tableName, records, ddlCols, { dialect, conflictColumns })
      );
    } else {
      output.push(
        generateInserts(tableDef.tableName, records, insertCols, { dialect })
      );
    }

    output.push('');
  }

  return output.join('\n');
}

/**
 * Build dialect-aware SQL INSERT statements for a single table.
 *
 * Pure function — no side effects, no I/O, no Faker calls.
 *
 * @param {Object}               options
 * @param {string}               options.tableName             - Target table name
 * @param {Array<Object>}        options.records               - Array of row objects
 * @param {Array<{name:string}>} options.columns               - Column definitions
 * @param {string}               [options.dialect='generic']   - SQL dialect
 * @param {string}               [options.outputMode='insert'] - 'insert' or 'upsert'
 * @param {string[]}             [options.conflictColumns=[]]  - Columns for conflict resolution
 * @returns {string} SQL INSERT/UPSERT statements
 *
 * @example
 * const sql = buildInsertStatements({
 *   tableName: 'users',
 *   records: [{ id: 1, email: 'test@example.com' }],
 *   columns: [{ name: 'id' }, { name: 'email' }],
 *   dialect: 'postgres',
 * });
 */
export function buildInsertStatements({
  tableName,
  records,
  columns,
  dialect = 'generic',
  outputMode = 'insert',
  conflictColumns = [],
}) {
  if (!tableName || typeof tableName !== 'string') {
    throw new Error('buildInsertStatements: tableName must be a non-empty string');
  }
  if (!Array.isArray(records)) {
    throw new Error('buildInsertStatements: records must be an Array');
  }
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new Error('buildInsertStatements: columns must be a non-empty Array');
  }
  if (records.length === 0) return '';

  if (outputMode === 'upsert') {
    if (conflictColumns.length === 0) {
      throw new Error(
        'buildInsertStatements: upsert mode requires at least one conflictColumn'
      );
    }
    return generateUpserts(tableName, records, columns, { dialect, conflictColumns });
  }

  return generateInserts(tableName, records, columns, { dialect });
}
