/**
 * SQL Schema Generator - Universal SQL DDL and DML generation
 * Platform-portable: Works in browsers and Node.js
 */

/**
 * SQL type mapping from Faker types to SQL types
 */
export const sqlTypeMap = {
  // IDs and keys
  autoIncrement: { postgres: 'SERIAL', mysql: 'INT AUTO_INCREMENT', sqlite: 'INTEGER PRIMARY KEY AUTOINCREMENT', generic: 'INTEGER' },
  uuid: { postgres: 'UUID', mysql: 'CHAR(36)', sqlite: 'TEXT', generic: 'CHAR(36)' },
  nanoid: { postgres: 'VARCHAR(21)', mysql: 'VARCHAR(21)', sqlite: 'TEXT', generic: 'VARCHAR(21)' },
  
  // Text types
  firstName: { postgres: 'VARCHAR(50)', mysql: 'VARCHAR(50)', sqlite: 'TEXT', generic: 'VARCHAR(50)' },
  lastName: { postgres: 'VARCHAR(50)', mysql: 'VARCHAR(50)', sqlite: 'TEXT', generic: 'VARCHAR(50)' },
  prefix: { postgres: 'VARCHAR(20)', mysql: 'VARCHAR(20)', sqlite: 'TEXT', generic: 'VARCHAR(20)' },
  suffix: { postgres: 'VARCHAR(20)', mysql: 'VARCHAR(20)', sqlite: 'TEXT', generic: 'VARCHAR(20)' },
  fullName: { postgres: 'VARCHAR(100)', mysql: 'VARCHAR(100)', sqlite: 'TEXT', generic: 'VARCHAR(100)' },
  email: { postgres: 'VARCHAR(255)', mysql: 'VARCHAR(255)', sqlite: 'TEXT', generic: 'VARCHAR(255)' },
  username: { postgres: 'VARCHAR(50)', mysql: 'VARCHAR(50)', sqlite: 'TEXT', generic: 'VARCHAR(50)' },
  password: { postgres: 'VARCHAR(255)', mysql: 'VARCHAR(255)', sqlite: 'TEXT', generic: 'VARCHAR(255)' },
  url: { postgres: 'TEXT', mysql: 'TEXT', sqlite: 'TEXT', generic: 'TEXT' },
  phone: { postgres: 'VARCHAR(20)', mysql: 'VARCHAR(20)', sqlite: 'TEXT', generic: 'VARCHAR(20)' },
  jobTitle: { postgres: 'VARCHAR(100)', mysql: 'VARCHAR(100)', sqlite: 'TEXT', generic: 'VARCHAR(100)' },
  company: { postgres: 'VARCHAR(100)', mysql: 'VARCHAR(100)', sqlite: 'TEXT', generic: 'VARCHAR(100)' },
  department: { postgres: 'VARCHAR(50)', mysql: 'VARCHAR(50)', sqlite: 'TEXT', generic: 'VARCHAR(50)' },
  
  // Address types
  street: { postgres: 'VARCHAR(255)', mysql: 'VARCHAR(255)', sqlite: 'TEXT', generic: 'VARCHAR(255)' },
  city: { postgres: 'VARCHAR(100)', mysql: 'VARCHAR(100)', sqlite: 'TEXT', generic: 'VARCHAR(100)' },
  state: { postgres: 'VARCHAR(50)', mysql: 'VARCHAR(50)', sqlite: 'TEXT', generic: 'VARCHAR(50)' },
  country: { postgres: 'VARCHAR(100)', mysql: 'VARCHAR(100)', sqlite: 'TEXT', generic: 'VARCHAR(100)' },
  zipCode: { postgres: 'VARCHAR(20)', mysql: 'VARCHAR(20)', sqlite: 'TEXT', generic: 'VARCHAR(20)' },
  
  // Numeric types
  number: { postgres: 'INTEGER', mysql: 'INT', sqlite: 'INTEGER', generic: 'INTEGER' },
  float: { postgres: 'DOUBLE PRECISION', mysql: 'DOUBLE', sqlite: 'REAL', generic: 'DOUBLE' },
  price: { postgres: 'DECIMAL(10,2)', mysql: 'DECIMAL(10,2)', sqlite: 'REAL', generic: 'DECIMAL(10,2)' },
  amount: { postgres: 'DECIMAL(10,2)', mysql: 'DECIMAL(10,2)', sqlite: 'REAL', generic: 'DECIMAL(10,2)' },
  latitude: { postgres: 'DOUBLE PRECISION', mysql: 'DOUBLE', sqlite: 'REAL', generic: 'DOUBLE' },
  longitude: { postgres: 'DOUBLE PRECISION', mysql: 'DOUBLE', sqlite: 'REAL', generic: 'DOUBLE' },
  
  // Date/Time types
  pastDate: { postgres: 'DATE', mysql: 'DATE', sqlite: 'TEXT', generic: 'DATE' },
  futureDate: { postgres: 'DATE', mysql: 'DATE', sqlite: 'TEXT', generic: 'DATE' },
  recentDate: { postgres: 'DATE', mysql: 'DATE', sqlite: 'TEXT', generic: 'DATE' },
  date: { postgres: 'DATE', mysql: 'DATE', sqlite: 'TEXT', generic: 'DATE' },
  timestamp: { postgres: 'TIMESTAMP', mysql: 'DATETIME', sqlite: 'TEXT', generic: 'TIMESTAMP' },
  
  // Boolean type
  boolean: { postgres: 'BOOLEAN', mysql: 'TINYINT(1)', sqlite: 'INTEGER', generic: 'BOOLEAN' },
  
  // Text content
  word: { postgres: 'VARCHAR(50)', mysql: 'VARCHAR(50)', sqlite: 'TEXT', generic: 'VARCHAR(50)' },
  words: { postgres: 'VARCHAR(255)', mysql: 'VARCHAR(255)', sqlite: 'TEXT', generic: 'VARCHAR(255)' },
  sentence: { postgres: 'TEXT', mysql: 'TEXT', sqlite: 'TEXT', generic: 'TEXT' },
  paragraph: { postgres: 'TEXT', mysql: 'TEXT', sqlite: 'TEXT', generic: 'TEXT' },
  product: { postgres: 'VARCHAR(255)', mysql: 'VARCHAR(255)', sqlite: 'TEXT', generic: 'VARCHAR(255)' },
  productDescription: { postgres: 'TEXT', mysql: 'TEXT', sqlite: 'TEXT', generic: 'TEXT' },
  
  // Financial
  accountNumber: { postgres: 'VARCHAR(50)', mysql: 'VARCHAR(50)', sqlite: 'TEXT', generic: 'VARCHAR(50)' },
  iban: { postgres: 'VARCHAR(34)', mysql: 'VARCHAR(34)', sqlite: 'TEXT', generic: 'VARCHAR(34)' },
  creditCardNumber: { postgres: 'VARCHAR(19)', mysql: 'VARCHAR(19)', sqlite: 'TEXT', generic: 'VARCHAR(19)' },
  currency: { postgres: 'CHAR(3)', mysql: 'CHAR(3)', sqlite: 'TEXT', generic: 'CHAR(3)' },
  
  // Other types
  ipv4: { postgres: 'INET', mysql: 'VARCHAR(15)', sqlite: 'TEXT', generic: 'VARCHAR(15)' },
  userAgent: { postgres: 'TEXT', mysql: 'TEXT', sqlite: 'TEXT', generic: 'TEXT' },
  color: { postgres: 'VARCHAR(50)', mysql: 'VARCHAR(50)', sqlite: 'TEXT', generic: 'VARCHAR(50)' },
  emoji: { postgres: 'VARCHAR(10)', mysql: 'VARCHAR(10)', sqlite: 'TEXT', generic: 'VARCHAR(10)' },
  
  // Fallback for generic types
  string: { postgres: 'VARCHAR(255)', mysql: 'VARCHAR(255)', sqlite: 'TEXT', generic: 'VARCHAR(255)' },
  text: { postgres: 'TEXT', mysql: 'TEXT', sqlite: 'TEXT', generic: 'TEXT' },
  integer: { postgres: 'INTEGER', mysql: 'INT', sqlite: 'INTEGER', generic: 'INTEGER' },
  int: { postgres: 'INTEGER', mysql: 'INT', sqlite: 'INTEGER', generic: 'INTEGER' },
  json: { postgres: 'JSONB', mysql: 'JSON', sqlite: 'TEXT', generic: 'TEXT' }
};

/**
 * Parse SQL type from column definition
 * @param {Object} column - Column definition
 * @param {string} dialect - SQL dialect (postgres, mysql, sqlite, generic)
 * @returns {string} SQL type
 */
export function getSQLType(column, dialect = 'generic') {
  let baseType = column.type;
  
  // Handle special types
  if (baseType.startsWith('enum:')) {
    const values = baseType.replace('enum:', '').split('|');
    if (dialect === 'postgres') {
      // Postgres supports ENUM types, but we'll use VARCHAR with CHECK for simplicity
      return 'VARCHAR(50)';
    } else if (dialect === 'mysql') {
      return `ENUM(${values.map(v => `'${v}'`).join(', ')})`;
    }
    return 'VARCHAR(50)';
  }
  
  if (baseType.startsWith('range:')) {
    // Range types are numeric
    return sqlTypeMap.number[dialect] || sqlTypeMap.number.generic;
  }
  
  if (baseType.startsWith('pattern:')) {
    // Pattern types are strings
    return column.length 
      ? `VARCHAR(${column.length})`
      : (sqlTypeMap.string[dialect] || sqlTypeMap.string.generic);
  }
  
  if (baseType.startsWith('static:')) {
    // Static types - infer from value or use string
    return sqlTypeMap.string[dialect] || sqlTypeMap.string.generic;
  }
  
  // Handle explicit SQL types
  if (column.sqlType) {
    return column.sqlType;
  }
  
  // Look up in type map
  const typeInfo = sqlTypeMap[baseType];
  if (typeInfo) {
    return typeInfo[dialect] || typeInfo.generic;
  }
  
  // Fallback
  return sqlTypeMap.string[dialect] || sqlTypeMap.string.generic;
}

/**
 * Get an additional CHECK constraint fragment for the column, if applicable.
 * Currently emits a CHECK constraint for PostgreSQL ENUM columns (since PostgreSQL
 * has no inline ENUM column syntax).
 * @param {Object} column - Column definition with at least { name, type }
 * @param {string} dialect - SQL dialect (postgres, mysql, sqlite, generic)
 * @returns {string|null} Constraint fragment (e.g. "CHECK (col IN ('a', 'b'))") or null
 */
export function getColumnConstraint(column, dialect = 'generic') {
  if (dialect === 'postgres' && column.type && column.type.startsWith('enum:')) {
    const values = column.type.replace('enum:', '').split('|');
    const list = values.map(v => `'${v}'`).join(', ');
    return `CHECK (${column.name} IN (${list}))`;
  }
  return null;
}

/**
 * Generate CREATE TABLE DDL statement
 * @param {string} tableName - Table name
 * @param {Array} columns - Column definitions
 * @param {Object} options - Generation options
 * @returns {string} CREATE TABLE statement
 */
export function generateDDL(tableName, columns, options = {}) {
  const dialect = options.dialect || 'generic';
  const lines = [`CREATE TABLE ${tableName} (`];
  const columnDefs = [];
  const constraints = [];
  
  columns.forEach(col => {
    let def = `  ${col.name} ${getSQLType(col, dialect)}`;
    
    // Add inline CHECK constraint if applicable (e.g. PostgreSQL enum columns)
    const checkConstraint = getColumnConstraint(col, dialect);
    if (checkConstraint) {
      def += ` ${checkConstraint}`;
    }

    // Add constraints to column definition
    if (col.primaryKey) {
      if (col.type === 'autoIncrement') {
        // AUTO_INCREMENT/SERIAL handles primary key differently by dialect
        if (dialect === 'mysql') {
          def += ' PRIMARY KEY';
        } else if (dialect === 'postgres') {
          def += ' PRIMARY KEY';
        } else if (dialect === 'sqlite') {
          // getSQLType() already returns 'INTEGER PRIMARY KEY AUTOINCREMENT' for
          // sqlite + autoIncrement — do not reassign def so that additional
          // constraints (NOT NULL, DEFAULT) added below are preserved.
        } else {
          def += ' PRIMARY KEY';
        }
      } else {
        def += ' PRIMARY KEY';
      }
    }
    
    if (col.unique && !col.primaryKey) {
      def += ' UNIQUE';
    }
    
    if (col.nullable === false || col.notNull) {
      def += ' NOT NULL';
    }
    
    if (col.default !== undefined) {
      if (typeof col.default === 'string') {
        // Check if it's a SQL function (like NOW(), CURRENT_TIMESTAMP)
        if (col.default.toUpperCase().includes('NOW()') || 
            col.default.toUpperCase().includes('CURRENT_TIMESTAMP')) {
          def += ` DEFAULT ${col.default}`;
        } else {
          def += ` DEFAULT '${col.default}'`;
        }
      } else if (typeof col.default === 'number') {
        def += ` DEFAULT ${col.default}`;
      } else if (typeof col.default === 'boolean') {
        if (dialect === 'postgres') {
          def += ` DEFAULT ${col.default}`;
        } else {
          def += ` DEFAULT ${col.default ? '1' : '0'}`;
        }
      }
    }
    
    columnDefs.push(def);
  });
  
  // Add foreign key constraints
  columns.forEach(col => {
    if (col.references) {
      const fkName = `fk_${tableName}_${col.name}`;
      const refTable = col.references.table;
      const refColumn = col.references.column || 'id';
      let constraint = `  CONSTRAINT ${fkName} FOREIGN KEY (${col.name}) REFERENCES ${refTable}(${refColumn})`;
      
      if (col.onDelete) {
        constraint += ` ON DELETE ${col.onDelete.toUpperCase()}`;
      }
      if (col.onUpdate) {
        constraint += ` ON UPDATE ${col.onUpdate.toUpperCase()}`;
      }
      
      constraints.push(constraint);
    }
  });
  
  lines.push(columnDefs.join(',\n'));
  
  if (constraints.length > 0) {
    lines.push(',');
    lines.push(constraints.join(',\n'));
  }
  
  lines.push(');');
  
  return lines.join('\n');
}

/**
 * Generate INSERT statements with proper value escaping
 * @param {string} tableName - Table name
 * @param {Array} records - Data records
 * @param {Array} columns - Column definitions
 * @param {Object} options - Generation options
 * @returns {string} INSERT statements
 */
export function generateInserts(tableName, records, columns, options = {}) {
  if (records.length === 0) {
    return '';
  }
  
  const dialect = options.dialect || 'generic';
  const batch = options.batch || false; // Use batch inserts (multiple VALUES)
  const columnNames = columns.map(col => col.name);
  
  const escapeValue = (value, column) => {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      // Escape single quotes
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'boolean') {
      if (dialect === 'postgres') {
        return value ? 'TRUE' : 'FALSE';
      }
      return value ? '1' : '0';
    }
    return value;
  };
  
  if (batch) {
    // Generate single INSERT with multiple VALUES
    const valueRows = records.map(record => {
      const values = columns.map(col => escapeValue(record[col.name], col));
      return `  (${values.join(', ')})`;
    });
    
    return `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES\n${valueRows.join(',\n')};`;
  } else {
    // Generate individual INSERT statements
    const statements = records.map(record => {
      const values = columns.map(col => escapeValue(record[col.name], col));
      return `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')});`;
    });
    
    return statements.join('\n');
  }
}

/**
 * Generate UPSERT statement (INSERT ... ON CONFLICT / ON DUPLICATE KEY)
 * @param {string} tableName - Table name
 * @param {Array} records - Data records
 * @param {Array} columns - Column definitions
 * @param {Object} options - Generation options
 * @returns {string} UPSERT statements
 */
export function generateUpserts(tableName, records, columns, options = {}) {
  if (records.length === 0) {
    return '';
  }
  
  const dialect = options.dialect || 'postgres';
  const conflictColumns = options.conflictColumns || columns.filter(c => c.primaryKey || c.unique).map(c => c.name);
  
  if (conflictColumns.length === 0) {
    throw new Error('UPSERT requires at least one unique/primary key column');
  }
  
  const statements = [];
  
  records.forEach(record => {
    const columnNames = columns.map(col => col.name);
    const values = columns.map(col => {
      const value = record[col.name];
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      if (typeof value === 'boolean') {
        return dialect === 'postgres' ? (value ? 'TRUE' : 'FALSE') : (value ? '1' : '0');
      }
      return value;
    });
    
    if (dialect === 'postgres') {
      // PostgreSQL: INSERT ... ON CONFLICT DO UPDATE
      const updateCols = columns
        .filter(c => !c.primaryKey)
        .map(c => `${c.name} = EXCLUDED.${c.name}`)
        .join(', ');
      
      statements.push(
        `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')}) ` +
        `ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ${updateCols};`
      );
    } else if (dialect === 'mysql') {
      // MySQL: INSERT ... ON DUPLICATE KEY UPDATE
      const updateCols = columns
        .filter(c => !c.primaryKey)
        .map(c => `${c.name} = VALUES(${c.name})`)
        .join(', ');
      
      statements.push(
        `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')}) ` +
        `ON DUPLICATE KEY UPDATE ${updateCols};`
      );
    } else if (dialect === 'sqlite') {
      // SQLite: INSERT OR REPLACE
      statements.push(
        `INSERT OR REPLACE INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')});`
      );
    } else {
      // Generic: UPSERT is not supported; fall back to plain INSERT
      // Add a one-time warning comment before the first INSERT statement.
      if (statements.length === 0) {
        statements.push(
          `-- Note: UPSERT is not supported for the "generic" dialect; INSERT used instead.`
        );
      }
      statements.push(
        `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')});`
      );
    }
  });
  
  return statements.join('\n');
}

/**
 * Resolve table dependencies for correct INSERT order
 * @param {Array} tables - Array of table schemas
 * @returns {Array} Ordered array of table names
 */
export function resolveTableDependencies(tables) {
  const graph = new Map();
  const inDegree = new Map();
  
  // Build dependency graph
  tables.forEach(table => {
    graph.set(table.table, []);
    inDegree.set(table.table, 0);
  });
  
  tables.forEach(table => {
    const fkColumns = table.columns.filter(col => col.references);
    fkColumns.forEach(col => {
      const refTable = col.references.table;
      if (refTable !== table.table) { // Avoid self-references
        if (graph.has(refTable)) {
          graph.get(refTable).push(table.table);
          inDegree.set(table.table, inDegree.get(table.table) + 1);
        }
      }
    });
  });
  
  // Topological sort (Kahn's algorithm)
  const queue = [];
  const result = [];
  
  inDegree.forEach((degree, table) => {
    if (degree === 0) {
      queue.push(table);
    }
  });
  
  while (queue.length > 0) {
    const current = queue.shift();
    result.push(current);
    
    const neighbors = graph.get(current);
    neighbors.forEach(neighbor => {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    });
  }
  
  // Check for cycles
  if (result.length !== tables.length) {
    throw new Error('Circular foreign key dependencies detected');
  }
  
  return result;
}

/**
 * Generate complete SQL schema with DDL and INSERT statements
 * @param {Object} schema - Schema definition
 * @returns {string} Complete SQL script
 */
export function generateSchema(schema) {
  const dialect = schema.dialect || 'generic';
  const mode = schema.mode || 'ddl+insert';
  const output = [];
  
  // Single table mode
  if (schema.table && schema.columns) {
    return generateSingleTable(schema);
  }
  
  // Multi-table mode
  if (!schema.tables || schema.tables.length === 0) {
    throw new Error('Schema must have either "table" and "columns" or "tables" array');
  }
  
  // Add header comment
  if (schema.schema) {
    output.push(`-- Schema: ${schema.schema}`);
    output.push(`-- Dialect: ${dialect}`);
    output.push(`-- Generated: ${new Date().toISOString()}`);
    output.push('');
  }
  
  // Resolve dependencies unless manual order is explicitly requested
  let orderedTables = schema.tables;
  if (schema.insertOrder !== 'manual') {
    try {
      const tableOrder = resolveTableDependencies(schema.tables);
      orderedTables = tableOrder.map(name => 
        schema.tables.find(t => t.table === name)
      );
    } catch (err) {
      console.warn('Could not resolve dependencies:', err.message);
      // Fall back to original order
    }
  }
  
  // Generate DDL
  if (mode === 'ddl' || mode === 'ddl+insert') {
    orderedTables.forEach(table => {
      output.push(generateDDL(table.table, table.columns, { dialect }));
      output.push('');
    });
  }
  
  // Generate INSERT statements
  if (mode === 'insert' || mode === 'ddl+insert' || mode === 'upsert' || mode === 'truncate+insert') {
    if (mode === 'truncate+insert') {
      // Add TRUNCATE statements in reverse order
      [...orderedTables].reverse().forEach(table => {
        output.push(`TRUNCATE TABLE ${table.table}${dialect === 'postgres' ? ' CASCADE' : ''};`);
      });
      output.push('');
    }
    
    orderedTables.forEach(table => {
      if (table.records && table.records.length > 0) {
        output.push(`-- Table: ${table.table}`);
        
        if (mode === 'upsert') {
          output.push(generateUpserts(table.table, table.records, table.columns, { dialect }));
        } else {
          output.push(generateInserts(table.table, table.records, table.columns, { dialect, batch: schema.batch }));
        }
        output.push('');
      }
    });
  }
  
  return output.join('\n');
}

/**
 * Generate SQL for a single table
 * @param {Object} schema - Single table schema
 * @returns {string} SQL script
 */
function generateSingleTable(schema) {
  const dialect = schema.dialect || 'generic';
  const mode = schema.mode || 'ddl+insert';
  const output = [];
  
  // Generate DDL
  if (mode === 'ddl' || mode === 'ddl+insert') {
    output.push(generateDDL(schema.table, schema.columns, { dialect }));
    output.push('');
  }
  
  // Generate data statements
  if (schema.records && schema.records.length > 0) {
    if (mode === 'truncate+insert') {
      output.push(`TRUNCATE TABLE ${schema.table}${dialect === 'postgres' ? ' CASCADE' : ''};`);
      output.push('');
    }
    
    if (mode === 'insert' || mode === 'ddl+insert' || mode === 'truncate+insert') {
      output.push(generateInserts(schema.table, schema.records, schema.columns, { dialect, batch: schema.batch }));
    } else if (mode === 'upsert') {
      output.push(generateUpserts(schema.table, schema.records, schema.columns, { dialect, conflictColumns: schema.conflictColumns }));
    }
  }
  
  return output.join('\n');
}
