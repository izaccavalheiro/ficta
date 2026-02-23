/**
 * Ficta Schema Builder — Fluent API for constructing single and multi-table schemas.
 *
 * Universal module: zero Node.js or browser-specific dependencies.
 * Faker must be initialised via setFaker() from core.js before calling .toSQL().
 *
 * @module schema-builder
 */

import { generateData } from './core.js';
import { generateSchema } from './sql-schema.js';

// ---------------------------------------------------------------------------
// TableBuilder
// ---------------------------------------------------------------------------

class TableBuilder {
  constructor(tableName) {
    if (!tableName || typeof tableName !== 'string' || !tableName.trim()) {
      throw new Error('table: tableName must be a non-empty string');
    }
    this._tableName = tableName;
    this._columns = [];
    this._rows = 100;
    this._dialect = 'generic';
  }

  /**
   * Add a column to the table.
   * @param {string} name - Column name
   * @param {string} type - Ficta type (e.g. 'autoIncrement', 'email', 'range:1-100')
   * @param {Object} [options={}]
   * @returns {this}
   */
  column(name, type, options = {}) {
    if (!name || typeof name !== 'string') {
      throw new Error('column: name must be a non-empty string');
    }
    if (!type || typeof type !== 'string') {
      throw new Error('column: type must be a non-empty string');
    }
    this._columns.push({ name, type, ...options });
    return this;
  }

  /**
   * Set the number of rows to generate.
   * @param {number} n
   * @returns {this}
   */
  rows(n) {
    if (typeof n !== 'number' || n < 0) {
      throw new Error('rows: n must be a non-negative number');
    }
    this._rows = n;
    return this;
  }

  /**
   * Set the SQL dialect.
   * @param {'postgres'|'mysql'|'sqlite'|'generic'} d
   * @returns {this}
   */
  dialect(d) {
    this._dialect = d;
    return this;
  }

  /**
   * Build a plain object compatible with sql-schema.generateSchema single-table format.
   * @returns {Object}
   */
  build() {
    return {
      table: this._tableName,
      columns: this._columns.map(col => ({ ...col })),
      rows: this._rows,
      dialect: this._dialect,
    };
  }

  /**
   * Generate SQL for this table.
   * @param {string} [mode='ddl+insert']
   * @returns {string}
   */
  toSQL(mode = 'ddl+insert') {
    const built = this.build();
    const colString = built.columns.map(c => `${c.name}:${c.type}`).join(',');
    const result = generateData({ columns: colString, rows: built.rows });

    return generateSchema({
      table: built.table,
      columns: built.columns,
      records: result.records,
      dialect: built.dialect,
      mode,
    });
  }

  /**
   * Return options suitable for generateData / generateAndSave.
   * @returns {{ columns: string, rows: number }}
   */
  toGenerateOptions() {
    const colString = this._columns.map(c => `${c.name}:${c.type}`).join(',');
    return { columns: colString, rows: this._rows };
  }
}

// ---------------------------------------------------------------------------
// SchemaBuilder
// ---------------------------------------------------------------------------

class SchemaBuilder {
  constructor(schemaName) {
    this._schemaName = schemaName;
    this._tables = [];
    this._dialect = 'generic';
    this._defaultRows = 100;
  }

  /**
   * Add a table to the schema using a builder callback.
   * @param {string} name - Table name
   * @param {Function} builderFn - Callback that receives a TableBuilder
   * @returns {this}
   */
  table(name, builderFn) {
    const tb = new TableBuilder(name);
    tb.dialect(this._dialect);
    tb.rows(this._defaultRows);
    if (typeof builderFn === 'function') {
      builderFn(tb);
    }
    this._tables.push(tb.build());
    return this;
  }

  /**
   * Set the SQL dialect for all tables.
   * @param {'postgres'|'mysql'|'sqlite'|'generic'} d
   * @returns {this}
   */
  dialect(d) {
    this._dialect = d;
    return this;
  }

  /**
   * Set the default row count for all tables.
   * @param {number} n
   * @returns {this}
   */
  rows(n) {
    this._defaultRows = n;
    return this;
  }

  /**
   * Build a plain object representing the schema.
   * @returns {Object}
   */
  build() {
    return {
      schema: this._schemaName,
      tables: this._tables.map(t => ({ ...t, columns: t.columns.map(c => ({ ...c })) })),
      dialect: this._dialect,
    };
  }

  /**
   * Generate SQL for the entire schema.
   * @param {string} [mode='ddl+insert']
   * @returns {string}
   */
  toSQL(mode = 'ddl+insert') {
    const built = this.build();

    // Generate data for each table and attach records
    const tablesWithData = built.tables.map(tbl => {
      const colString = tbl.columns.map(c => `${c.name}:${c.type}`).join(',');
      const result = generateData({ columns: colString, rows: tbl.rows });
      return { ...tbl, records: result.records };
    });

    return generateSchema({
      schema: built.schema,
      tables: tablesWithData,
      dialect: built.dialect,
      mode,
    });
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a fluent schema builder for one table.
 * @param {string} tableName
 * @returns {TableBuilder}
 */
export function table(tableName) {
  return new TableBuilder(tableName);
}

/**
 * Create a multi-table schema builder.
 * @param {string} [schemaName]
 * @returns {SchemaBuilder}
 */
export function schema(schemaName) {
  return new SchemaBuilder(schemaName);
}
