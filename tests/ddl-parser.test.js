import { parseDDL, orderByDependencies } from '../src/ddl-parser.js';

// ---------------------------------------------------------------------------
// parseDDL — basic
// ---------------------------------------------------------------------------

describe('parseDDL — basic parsing', () => {
  test('parses a minimal CREATE TABLE', () => {
    const tables = parseDDL(`
      CREATE TABLE users (
        id INT NOT NULL,
        name VARCHAR(100)
      );
    `);
    expect(tables).toHaveLength(1);
    expect(tables[0].tableName).toBe('users');
    expect(tables[0].columns).toHaveLength(2);
  });

  test('returns column names correctly', () => {
    const [table] = parseDDL(`CREATE TABLE t (foo INT, bar VARCHAR(50));`);
    expect(table.columns.map(c => c.name)).toEqual(['foo', 'bar']);
  });

  test('captures sqlType in UPPER_CASE', () => {
    const [table] = parseDDL(`CREATE TABLE t (n DECIMAL(10,2));`);
    expect(table.columns[0].sqlType).toBe('DECIMAL(10,2)');
  });

  test('nullable defaults to true when NOT NULL is absent', () => {
    const [table] = parseDDL(`CREATE TABLE t (x VARCHAR(50));`);
    expect(table.columns[0].nullable).toBe(true);
  });

  test('nullable is false when NOT NULL is present', () => {
    const [table] = parseDDL(`CREATE TABLE t (x VARCHAR(50) NOT NULL);`);
    expect(table.columns[0].nullable).toBe(false);
  });

  test('autoIncrement is false by default', () => {
    const [table] = parseDDL(`CREATE TABLE t (x INT);`);
    expect(table.columns[0].autoIncrement).toBe(false);
  });

  test('defaultValue is null when absent', () => {
    const [table] = parseDDL(`CREATE TABLE t (x INT);`);
    expect(table.columns[0].defaultValue).toBeNull();
  });

  test('captures DEFAULT value (numeric)', () => {
    const [table] = parseDDL(`CREATE TABLE t (score INT DEFAULT 0);`);
    expect(table.columns[0].defaultValue).toBe('0');
  });

  test('captures DEFAULT value (string)', () => {
    const [table] = parseDDL(`CREATE TABLE t (status VARCHAR(20) DEFAULT 'active');`);
    expect(table.columns[0].defaultValue).toBe('active');
  });

  test('handles CREATE TABLE IF NOT EXISTS', () => {
    const tables = parseDDL(`CREATE TABLE IF NOT EXISTS notes (id INT);`);
    expect(tables[0].tableName).toBe('notes');
  });

  test('handles CREATE TEMPORARY TABLE', () => {
    const tables = parseDDL(`CREATE TEMPORARY TABLE tmp (x INT);`);
    expect(tables[0].tableName).toBe('tmp');
  });

  test('ignores non-CREATE TABLE statements (e.g. INSERT)', () => {
    const tables = parseDDL(`
      CREATE TABLE t (id INT);
      INSERT INTO t VALUES (1);
    `);
    expect(tables).toHaveLength(1);
  });

  test('parses multiple tables from one DDL string', () => {
    const tables = parseDDL(`
      CREATE TABLE a (id INT);
      CREATE TABLE b (id INT);
    `);
    expect(tables).toHaveLength(2);
    expect(tables.map(t => t.tableName)).toEqual(['a', 'b']);
  });

  test('handles statement without trailing semicolon', () => {
    const tables = parseDDL(`CREATE TABLE t (id INT)`);
    expect(tables).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// parseDDL — comments
// ---------------------------------------------------------------------------

describe('parseDDL — SQL comment stripping', () => {
  test('strips single-line comments (--)', () => {
    const tables = parseDDL(`
      -- This is a comment
      CREATE TABLE t (
        id INT, -- inline comment
        name VARCHAR(100)
      );
    `);
    expect(tables[0].columns).toHaveLength(2);
  });

  test('strips block comments (/* */)', () => {
    const tables = parseDDL(`
      /* header comment */
      CREATE TABLE t (
        /* col comment */ id INT,
        name VARCHAR(100)
      );
    `);
    expect(tables[0].columns).toHaveLength(2);
  });

  test('strips multi-line block comments', () => {
    const tables = parseDDL(`
      /*
       * This spans
       * multiple lines
       */
      CREATE TABLE t (id INT);
    `);
    expect(tables[0].tableName).toBe('t');
  });
});

// ---------------------------------------------------------------------------
// parseDDL — quoted identifiers
// ---------------------------------------------------------------------------

describe('parseDDL — quoted identifiers', () => {
  test('handles backtick-quoted table name (MySQL style)', () => {
    const [table] = parseDDL('CREATE TABLE `my_table` (`id` INT);');
    expect(table.tableName).toBe('my_table');
    expect(table.columns[0].name).toBe('id');
  });

  test('handles double-quote-qualified table name (postgres style)', () => {
    const [table] = parseDDL('CREATE TABLE "my_table" ("id" INT);');
    expect(table.tableName).toBe('my_table');
    expect(table.columns[0].name).toBe('id');
  });
});

// ---------------------------------------------------------------------------
// parseDDL — PRIMARY KEY
// ---------------------------------------------------------------------------

describe('parseDDL — PRIMARY KEY detection', () => {
  test('detects inline PRIMARY KEY', () => {
    const [table] = parseDDL(`CREATE TABLE t (id INT PRIMARY KEY, name VARCHAR(50));`);
    expect(table.primaryKey).toEqual(['id']);
  });

  test('detects table-level PRIMARY KEY', () => {
    const [table] = parseDDL(`
      CREATE TABLE t (
        id INT,
        name VARCHAR(50),
        PRIMARY KEY (id)
      );
    `);
    expect(table.primaryKey).toEqual(['id']);
  });

  test('detects composite table-level PRIMARY KEY', () => {
    const [table] = parseDDL(`
      CREATE TABLE t (
        a INT,
        b INT,
        PRIMARY KEY (a, b)
      );
    `);
    expect(table.primaryKey).toEqual(['a', 'b']);
  });

  test('detects constraint-named PRIMARY KEY', () => {
    const [table] = parseDDL(`
      CREATE TABLE t (
        id INT,
        CONSTRAINT pk_t PRIMARY KEY (id)
      );
    `);
    expect(table.primaryKey).toEqual(['id']);
  });

  test('falls back to autoIncrement column as PK when no explicit PK', () => {
    const [table] = parseDDL(`
      CREATE TABLE t (
        id SERIAL,
        name VARCHAR(50)
      );
    `);
    expect(table.primaryKey).toEqual(['id']);
  });

  test('primaryKey is null when no PK and no autoIncrement', () => {
    const [table] = parseDDL(`CREATE TABLE t (name VARCHAR(50));`);
    expect(table.primaryKey).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseDDL — AUTO_INCREMENT / SERIAL / IDENTITY
// ---------------------------------------------------------------------------

describe('parseDDL — auto-increment variants', () => {
  test('detects AUTO_INCREMENT (MySQL)', () => {
    const [table] = parseDDL(`
      CREATE TABLE t (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(50));
    `);
    expect(table.columns[0].autoIncrement).toBe(true);
    expect(table.columns[0].fictaType).toBe('autoIncrement');
  });

  test('detects AUTOINCREMENT (SQLite)', () => {
    const [table] = parseDDL(`
      CREATE TABLE t (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
    `);
    expect(table.columns[0].autoIncrement).toBe(true);
  });

  test('detects SERIAL (PostgreSQL shorthand)', () => {
    const [table] = parseDDL(`
      CREATE TABLE t (id SERIAL PRIMARY KEY, name VARCHAR(50));
    `);
    expect(table.columns[0].autoIncrement).toBe(true);
    expect(table.columns[0].fictaType).toBe('autoIncrement');
  });

  test('detects GENERATED ... IDENTITY', () => {
    const [table] = parseDDL(`
      CREATE TABLE t (id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name VARCHAR(50));
    `);
    expect(table.columns[0].autoIncrement).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// parseDDL — ENUM types
// ---------------------------------------------------------------------------

describe('parseDDL — ENUM column types', () => {
  test('parses ENUM values', () => {
    const [table] = parseDDL(`
      CREATE TABLE t (
        id INT PRIMARY KEY,
        status ENUM('active', 'inactive', 'pending')
      );
    `);
    const statusCol = table.columns.find(c => c.name === 'status');
    expect(statusCol.enumValues).toEqual(['active', 'inactive', 'pending']);
  });

  test('ENUM fictaType uses enum: syntax', () => {
    const [table] = parseDDL(
      `CREATE TABLE t (id INT, role ENUM('admin','user'));`
    );
    const roleCol = table.columns.find(c => c.name === 'role');
    expect(roleCol.fictaType).toBe('enum:admin|user');
  });

  test('ENUM with escaped single quotes inside value', () => {
    const [table] = parseDDL(
      `CREATE TABLE t (id INT, x ENUM('it''s','ok'));`
    );
    const xCol = table.columns.find(c => c.name === 'x');
    expect(xCol.enumValues).toContain("it's");
  });
});

// ---------------------------------------------------------------------------
// parseDDL — FOREIGN KEY
// ---------------------------------------------------------------------------

describe('parseDDL — FOREIGN KEY detection', () => {
  test('detects inline REFERENCES syntax', () => {
    const [table] = parseDDL(`
      CREATE TABLE orders (
        id INT PRIMARY KEY,
        user_id INT REFERENCES users(id)
      );
    `);
    expect(table.foreignKeys).toHaveLength(1);
    expect(table.foreignKeys[0]).toMatchObject({
      column: 'user_id',
      refTable: 'users',
      refColumn: 'id',
    });
  });

  test('detects table-level CONSTRAINT ... FOREIGN KEY', () => {
    const [table] = parseDDL(`
      CREATE TABLE orders (
        id INT PRIMARY KEY,
        user_id INT,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
    expect(table.foreignKeys).toHaveLength(1);
    expect(table.foreignKeys[0]).toMatchObject({
      column: 'user_id',
      refTable: 'users',
      refColumn: 'id',
    });
  });

  test('detects table-level FOREIGN KEY without CONSTRAINT name', () => {
    const [table] = parseDDL(`
      CREATE TABLE t (
        id INT,
        parent_id INT,
        FOREIGN KEY (parent_id) REFERENCES parent(id)
      );
    `);
    expect(table.foreignKeys[0].refTable).toBe('parent');
  });

  test('has empty foreignKeys array when none present', () => {
    const [table] = parseDDL(`CREATE TABLE t (id INT);`);
    expect(table.foreignKeys).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parseDDL — type resolution (name hints)
// ---------------------------------------------------------------------------

describe('parseDDL — column name → Ficta type hints', () => {
  const cases = [
    ['email', 'VARCHAR(255)', 'email'],
    ['first_name', 'VARCHAR(50)', 'firstName'],
    ['last_name', 'VARCHAR(50)', 'lastName'],
    ['full_name', 'VARCHAR(100)', 'fullName'],
    ['phone', 'VARCHAR(20)', 'phone'],
    ['city', 'VARCHAR(100)', 'city'],
    ['state', 'VARCHAR(50)', 'state'],
    ['country', 'VARCHAR(100)', 'country'],
    ['zip', 'VARCHAR(20)', 'zipCode'],
    ['postal_code', 'VARCHAR(20)', 'zipCode'],
    ['street', 'VARCHAR(255)', 'street'],
    ['latitude', 'DOUBLE', 'latitude'],
    ['longitude', 'DOUBLE', 'longitude'],
    ['lng', 'DOUBLE', 'longitude'],
    ['url', 'TEXT', 'url'],
    ['website', 'VARCHAR(255)', 'url'],
    ['username', 'VARCHAR(50)', 'username'],
    ['password', 'VARCHAR(255)', 'password'],
    ['company', 'VARCHAR(100)', 'company'],
    ['department', 'VARCHAR(50)', 'department'],
    ['job_title', 'VARCHAR(100)', 'jobTitle'],
    ['price', 'DECIMAL(10,2)', 'price'],
    ['amount', 'DECIMAL(10,2)', 'amount'],
    ['currency', 'CHAR(3)', 'currency'],
    ['created_at', 'TIMESTAMP', 'timestamp'],
    ['updated_at', 'DATETIME', 'timestamp'],
    ['birth_day', 'DATE', 'pastDate'],
    ['uuid', 'CHAR(36)', 'uuid'],
    ['description', 'TEXT', 'sentence'],
    ['is_active', 'TINYINT(1)', 'boolean'],
  ];

  test.each(cases)(
    'column "%s" with SQL type "%s" resolves to fictaType "%s"',
    (colName, sqlType, expectedFictaType) => {
      const [table] = parseDDL(
        `CREATE TABLE t (id INT PRIMARY KEY, ${colName} ${sqlType});`
      );
      const col = table.columns.find(c => c.name === colName);
      expect(col.fictaType).toBe(expectedFictaType);
    }
  );
});

// ---------------------------------------------------------------------------
// parseDDL — SQL type fallback (when no name hint matches)
// ---------------------------------------------------------------------------

describe('parseDDL — SQL type → Ficta type fallback', () => {
  const cases = [
    ['col1', 'INT', 'number'],
    ['col2', 'INTEGER', 'number'],
    ['col3', 'BIGINT', 'number'],
    ['col4', 'SMALLINT', 'number'],
    ['col5', 'BOOLEAN', 'boolean'],
    ['col6', 'FLOAT', 'float'],
    ['col7', 'DOUBLE', 'float'],
    ['col8', 'REAL', 'float'],
    ['col9', 'DECIMAL(10,2)', 'float'],
    ['col10', 'NUMERIC(8,3)', 'float'],
    ['col11', 'UUID', 'uuid'],
    ['col12', 'TIMESTAMP', 'timestamp'],
    ['col13', 'DATETIME', 'timestamp'],
    ['col14', 'DATE', 'pastDate'],
    ['col15', 'JSON', 'json'],
    ['col16', 'JSONB', 'json'],
    ['col17', 'TEXT', 'sentence'],
    ['col18', 'SERIAL', 'autoIncrement'],
    ['col19', 'VARCHAR(100)', 'word'],
  ];

  test.each(cases)(
    'column "%s" with SQL type "%s" falls back to fictaType "%s"',
    (colName, sqlType, expectedFictaType) => {
      const [table] = parseDDL(
        `CREATE TABLE t (id INT PRIMARY KEY, ${colName} ${sqlType});`
      );
      const col = table.columns.find(c => c.name === colName);
      expect(col.fictaType).toBe(expectedFictaType);
    }
  );

  test('unknown type falls back to "word"', () => {
    const [table] = parseDDL(`CREATE TABLE t (x CUSTOM_TYPE);`);
    expect(table.columns[0].fictaType).toBe('word');
  });
});

// ---------------------------------------------------------------------------
// parseDDL — table-level INDEX / KEY / UNIQUE / CHECK are skipped
// ---------------------------------------------------------------------------

describe('parseDDL — table-level constraint clauses are ignored as columns', () => {
  test('KEY and INDEX clauses do not produce columns', () => {
    const [table] = parseDDL(`
      CREATE TABLE t (
        id INT PRIMARY KEY,
        name VARCHAR(100),
        KEY idx_name (name),
        INDEX idx2 (name)
      );
    `);
    expect(table.columns).toHaveLength(2);
  });

  test('UNIQUE KEY clause does not produce a column', () => {
    const [table] = parseDDL(`
      CREATE TABLE t (
        id INT PRIMARY KEY,
        email VARCHAR(255),
        UNIQUE KEY uq_email (email)
      );
    `);
    expect(table.columns).toHaveLength(2);
  });

  test('CHECK clause does not produce a column', () => {
    const [table] = parseDDL(`
      CREATE TABLE t (
        id INT PRIMARY KEY,
        age INT,
        CHECK (age >= 0)
      );
    `);
    expect(table.columns).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// parseDDL — error handling
// ---------------------------------------------------------------------------

describe('parseDDL — error handling', () => {
  test('throws when passed an empty string', () => {
    expect(() => parseDDL('')).toThrow('parseDDL requires a non-empty DDL string');
  });

  test('throws when passed a non-string', () => {
    expect(() => parseDDL(null)).toThrow();
    expect(() => parseDDL(42)).toThrow();
  });

  test('throws when no CREATE TABLE statements found', () => {
    expect(() => parseDDL('SELECT 1; DROP TABLE users;')).toThrow(
      'No valid CREATE TABLE statements found'
    );
  });
});

// ---------------------------------------------------------------------------
// orderByDependencies
// ---------------------------------------------------------------------------

describe('orderByDependencies', () => {
  test('returns single table unchanged', () => {
    const tables = parseDDL(`CREATE TABLE users (id INT PRIMARY KEY);`);
    const ordered = orderByDependencies(tables);
    expect(ordered).toHaveLength(1);
    expect(ordered[0].tableName).toBe('users');
  });

  test('independent tables keep stable order', () => {
    const tables = parseDDL(`
      CREATE TABLE a (id INT PRIMARY KEY);
      CREATE TABLE b (id INT PRIMARY KEY);
    `);
    const ordered = orderByDependencies(tables);
    expect(ordered.map(t => t.tableName)).toEqual(['a', 'b']);
  });

  test('parent table comes before child (inline REFERENCES)', () => {
    const tables = parseDDL(`
      CREATE TABLE orders (
        id INT PRIMARY KEY,
        user_id INT REFERENCES users(id)
      );
      CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(50));
    `);
    const ordered = orderByDependencies(tables);
    const names = ordered.map(t => t.tableName);
    expect(names.indexOf('users')).toBeLessThan(names.indexOf('orders'));
  });

  test('multi-level dependencies are resolved (A → B → C)', () => {
    const tables = parseDDL(`
      CREATE TABLE c (id INT PRIMARY KEY, b_id INT REFERENCES b(id));
      CREATE TABLE b (id INT PRIMARY KEY, a_id INT REFERENCES a(id));
      CREATE TABLE a (id INT PRIMARY KEY);
    `);
    const ordered = orderByDependencies(tables);
    const names = ordered.map(t => t.tableName);
    expect(names.indexOf('a')).toBeLessThan(names.indexOf('b'));
    expect(names.indexOf('b')).toBeLessThan(names.indexOf('c'));
  });

  test('self-referencing table does not cause infinite loop', () => {
    const tables = parseDDL(`
      CREATE TABLE categories (
        id INT PRIMARY KEY,
        parent_id INT REFERENCES categories(id)
      );
    `);
    const ordered = orderByDependencies(tables);
    expect(ordered).toHaveLength(1);
  });

  test('external reference (table not in list) is ignored', () => {
    const tables = parseDDL(`
      CREATE TABLE t (id INT PRIMARY KEY, ext_id INT REFERENCES external_table(id));
    `);
    const ordered = orderByDependencies(tables);
    expect(ordered).toHaveLength(1);
  });

  test('throws on circular dependency', () => {
    // Manually craft two TableDef objects with a cycle
    const tableA = {
      tableName: 'a',
      columns: [],
      primaryKey: ['id'],
      foreignKeys: [{ column: 'b_id', refTable: 'b', refColumn: 'id' }],
    };
    const tableB = {
      tableName: 'b',
      columns: [],
      primaryKey: ['id'],
      foreignKeys: [{ column: 'a_id', refTable: 'a', refColumn: 'id' }],
    };
    expect(() => orderByDependencies([tableA, tableB])).toThrow(
      'Circular foreign key dependency'
    );
  });
});

// ---------------------------------------------------------------------------
// parseDDL — edge cases for internal helper coverage
// ---------------------------------------------------------------------------

describe('parseDDL — internal edge cases', () => {
  test('silently skips CREATE TABLE with unclosed parentheses (extractOuterParens returns null)', () => {
    // The second statement has no closing paren and no semicolon, so extractOuterParens
    // exhausts the string and returns null → that table is skipped.
    const tables = parseDDL(
      'CREATE TABLE valid_table (id INT);\n' +
      'CREATE TABLE broken_table (id INT'
    );
    expect(tables).toHaveLength(1);
    expect(tables[0].tableName).toBe('valid_table');
  });

  test('silently skips column clauses that start with a non-identifier character', () => {
    // A clause like "(not_a_real_column INT)" passes the outer constraint skip-checks
    // but fails the /^([`"]?\w+[`"]?)/ nameMatch inside parseColumnClause → returns null.
    const tables = parseDDL(`
      CREATE TABLE t (
        id INT,
        (not_a_real_column INT)
      );
    `);
    expect(tables[0].columns).toHaveLength(1);
    expect(tables[0].columns[0].name).toBe('id');
  });

  test('CONSTRAINT name UNIQUE (...) is skipped by the parseColumnClause constraint guard', () => {
    // "CONSTRAINT name UNIQUE (email)" is NOT caught by the outer UNIQUE/INDEX/KEY/CHECK filter
    // (which requires the clause to START with those keywords, not CONSTRAINT).
    // It reaches parseColumnClause, which DOES match /^CONSTRAINT\s+/ and returns null — line 246.
    const tables = parseDDL(`
      CREATE TABLE t (
        id INT PRIMARY KEY,
        email VARCHAR(255),
        CONSTRAINT uq_email UNIQUE (email)
      );
    `);
    expect(tables[0].columns).toHaveLength(2);
    expect(tables[0].columns.map(c => c.name)).toEqual(['id', 'email']);
  });
});

// ---------------------------------------------------------------------------
// parseDDL — defensive branch coverage for internal helpers
// ---------------------------------------------------------------------------

describe('parseDDL — defensive branch coverage', () => {
  test('silently skips CREATE TABLE with no parentheses (extractOuterParens: start === -1)', () => {
    // No opening paren → extractOuterParens returns null immediately (start === -1 branch).
    const tables = parseDDL('CREATE TABLE valid (id INT); CREATE TABLE no_body_at_all');
    expect(tables).toHaveLength(1);
    expect(tables[0].tableName).toBe('valid');
  });

  test('trailing comma in table body exercises the empty-trimmed false branch in splitClauses', () => {
    // Body ends with a comma: "id INT," → after the comma, current="" → trimmed="" → push skipped.
    const tables = parseDDL('CREATE TABLE t (id INT,);');
    // Trailing comma is ignored; only id is a real column
    expect(tables[0].columns.some(c => c.name === 'id')).toBe(true);
  });

  test('ENUM() with no values makes parseEnumValues return null (falls back to SQL type)', () => {
    // ENUM with unquoted content has no single-quoted values → values=[] → returns null (line 232).
    // Column falls back to SQL type lookup instead of enum: syntax.
    const [table] = parseDDL('CREATE TABLE t (id INT, status ENUM(unquoted_value));');
    const statusCol = table.columns.find(c => c.name === 'status');
    expect(statusCol).toBeDefined();
    // No enum values — fictaType resolves via name hint or SQL type fallback
    expect(statusCol.enumValues).toBeNull();
  });

  test('PRIMARY KEY clause without parentheses makes parsePrimaryKeyClause return null', () => {
    // "PRIMARY KEY id" (no parens) passes the outer /^... PRIMARY\s+KEY\b/ check
    // but parsePrimaryKeyClause's regex requires "(…)" → returns null → PK stays unset.
    const tables = parseDDL('CREATE TABLE t (id INT, PRIMARY KEY id);');
    // The malformed PK clause is silently ignored; table still parsed
    expect(tables).toHaveLength(1);
  });

  test('FOREIGN KEY clause without REFERENCES makes parseForeignKeyClause return []', () => {
    // "FOREIGN KEY (col)" without REFERENCES doesn't match the FK regex → returns [].
    const tables = parseDDL('CREATE TABLE t (id INT, FOREIGN KEY (id));');
    expect(tables[0].foreignKeys).toHaveLength(0);
  });

  test('CREATE TABLE without a name after TABLE makes extractTableName return null (skipped)', () => {
    // "CREATE TABLE (id INT)" has no identifier after TABLE → extractTableName → null → continue.
    const tables = parseDDL(
      'CREATE TABLE valid (id INT); CREATE TABLE (id INT);'
    );
    expect(tables).toHaveLength(1);
    expect(tables[0].tableName).toBe('valid');
  });
});

// ---------------------------------------------------------------------------
// orderByDependencies — duplicate FK reference to same parent
// ---------------------------------------------------------------------------

describe('orderByDependencies — duplicate FK to same parent', () => {
  test('two FK columns pointing to the same parent are deduplicated (seenRefs branch)', () => {
    // child has TWO FK columns both referencing parent(id).
    // orderByDependencies should not double-count the edge; parent still comes first.
    const tables = parseDDL(`
      CREATE TABLE parent (id INT PRIMARY KEY);
      CREATE TABLE child (
        id INT PRIMARY KEY,
        p1 INT REFERENCES parent(id),
        p2 INT REFERENCES parent(id)
      );
    `);
    const ordered = orderByDependencies(tables);
    const names = ordered.map(t => t.tableName);
    expect(names.indexOf('parent')).toBeLessThan(names.indexOf('child'));
  });
});

// ---------------------------------------------------------------------------
// Additional branch coverage tests for remaining gaps
// ---------------------------------------------------------------------------

describe('parseDDL — remaining branch coverage', () => {
  test('leading comma in column body hits the empty-trimmed false branch in splitClauses', () => {
    // Body: ",id INT" → when comma is hit first, current="" → trimmed="" → push skipped (false branch).
    const tables = parseDDL('CREATE TABLE t (,id INT);');
    expect(tables[0].columns.some(c => c.name === 'id')).toBe(true);
  });

  test('leading semicolon in DDL input hits the empty-statement false branch in parseDDL', () => {
    // ";CREATE TABLE t (id INT);" → when first ";" is encountered, current="" → t="" → push skipped.
    const tables = parseDDL(';CREATE TABLE t (id INT);');
    expect(tables).toHaveLength(1);
    expect(tables[0].tableName).toBe('t');
  });

  test('multi-column FOREIGN KEY with one referenced column uses the || fallback', () => {
    // FOREIGN KEY (a, b) REFERENCES parent(id) → refColumns=['id'], columns=['a','b'].
    // For idx=1: refColumns[1] is undefined → || refColumns[0] = 'id' (line 347 fallback).
    const tables = parseDDL(`
      CREATE TABLE parent (id INT PRIMARY KEY);
      CREATE TABLE child (
        id INT PRIMARY KEY,
        a INT,
        b INT,
        FOREIGN KEY (a, b) REFERENCES parent(id)
      );
    `);
    const childFKs = tables.find(t => t.tableName === 'child').foreignKeys;
    expect(childFKs).toHaveLength(2);
    // Both a and b reference parent.id via the || fallback
    expect(childFKs.every(fk => fk.refColumn === 'id')).toBe(true);
  });

  test('table-level PRIMARY KEY set before inline-PK column exercises !primaryKey false branches', () => {
    // PRIMARY KEY (id) processed first → primaryKey=['id'].
    // Then id INT PRIMARY KEY clause: col.primaryKey=true → if(!primaryKey) → false (already set).
    // Also if(!primaryKey.includes('id')) → false (already includes 'id').
    const tables = parseDDL(`
      CREATE TABLE t (
        PRIMARY KEY (id),
        id INT PRIMARY KEY,
        name VARCHAR(50)
      );
    `);
    expect(tables[0].primaryKey).toEqual(['id']);
    expect(tables[0].columns.some(c => c.name === 'id')).toBe(true);
  });
});

describe('orderByDependencies — diamond dependency', () => {
  test('table with two parents: newDegree > 0 path is exercised before finally reaching 0', () => {
    // C depends on both A and B (degree 2).
    // When A is processed, C's degree drops to 1 (not 0 → NOT pushed yet) → false branch of
    // if (newDegree === 0).  When B is processed, C's degree drops to 0 → pushed.
    const tables = parseDDL(`
      CREATE TABLE a (id INT PRIMARY KEY);
      CREATE TABLE b (id INT PRIMARY KEY);
      CREATE TABLE c (
        id INT PRIMARY KEY,
        a_id INT REFERENCES a(id),
        b_id INT REFERENCES b(id)
      );
    `);
    const ordered = orderByDependencies(tables);
    const names = ordered.map(t => t.tableName);
    expect(names.indexOf('a')).toBeLessThan(names.indexOf('c'));
    expect(names.indexOf('b')).toBeLessThan(names.indexOf('c'));
  });
});
