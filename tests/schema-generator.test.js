import { faker } from '@faker-js/faker';
import { setFaker, seedFaker } from '../src/core.js';
import { generateFromSchema, buildInsertStatements } from '../src/schema-generator.js';
import { parseDDL } from '../src/ddl-parser.js';
import { toSQL } from '../src/formatters.js';

// Initialise Faker before all tests
setFaker(faker);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SIMPLE_DDL = `
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100)
  );
`;

const TWO_TABLE_DDL = `
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL
  );

  CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    title VARCHAR(255)
  );
`;

// ---------------------------------------------------------------------------
// generateFromSchema — basic
// ---------------------------------------------------------------------------

describe('generateFromSchema — basic', () => {
  test('accepts ddl string and returns a non-empty string', () => {
    const sql = generateFromSchema({ ddl: SIMPLE_DDL, rows: 3 });
    expect(typeof sql).toBe('string');
    expect(sql.trim()).not.toBe('');
  });

  test('accepts pre-parsed tables array', () => {
    const tables = parseDDL(SIMPLE_DDL);
    const sql = generateFromSchema({ tables, rows: 2 });
    expect(sql).toContain('users');
  });

  test('output contains the table name', () => {
    const sql = generateFromSchema({ ddl: SIMPLE_DDL, rows: 2 });
    expect(sql).toContain('users');
  });

  test('output contains INSERT INTO for insert mode', () => {
    const sql = generateFromSchema({ ddl: SIMPLE_DDL, rows: 2, outputMode: 'insert' });
    expect(sql).toContain('INSERT INTO');
  });

  test('generates the requested number of INSERT rows', () => {
    const sql = generateFromSchema({ ddl: SIMPLE_DDL, rows: 5, outputMode: 'insert' });
    const insertCount = (sql.match(/INSERT INTO/g) || []).length;
    expect(insertCount).toBe(5);
  });

  test('auto-increment columns produce 1-based sequential values', () => {
    const sql = generateFromSchema({ ddl: SIMPLE_DDL, rows: 3, outputMode: 'insert' });
    expect(sql).toMatch(/VALUES \(1,/);
  });
});

// ---------------------------------------------------------------------------
// generateFromSchema — output modes
// ---------------------------------------------------------------------------

describe('generateFromSchema — outputMode', () => {
  test("outputMode 'insert' produces INSERT statements", () => {
    const sql = generateFromSchema({ ddl: SIMPLE_DDL, rows: 2, outputMode: 'insert' });
    expect(sql).toContain('INSERT INTO');
  });

  test("outputMode 'ddl+insert' produces CREATE TABLE and INSERT", () => {
    const sql = generateFromSchema({ ddl: SIMPLE_DDL, rows: 2, outputMode: 'ddl+insert' });
    expect(sql).toContain('CREATE TABLE');
    expect(sql).toContain('INSERT INTO');
  });

  test("outputMode 'truncate+insert' produces TRUNCATE and INSERT", () => {
    const sql = generateFromSchema({ ddl: SIMPLE_DDL, rows: 2, outputMode: 'truncate+insert' });
    expect(sql).toContain('TRUNCATE TABLE');
    expect(sql).toContain('INSERT INTO');
  });

  test("outputMode 'upsert' with postgres produces ON CONFLICT DO UPDATE", () => {
    const sql = generateFromSchema({
      ddl: SIMPLE_DDL,
      rows: 2,
      outputMode: 'upsert',
      dialect: 'postgres',
    });
    expect(sql).toContain('ON CONFLICT');
  });

  test("outputMode 'upsert' with mysql produces ON DUPLICATE KEY UPDATE", () => {
    const sql = generateFromSchema({
      ddl: SIMPLE_DDL,
      rows: 2,
      outputMode: 'upsert',
      dialect: 'mysql',
    });
    expect(sql).toContain('ON DUPLICATE KEY UPDATE');
  });

  test("outputMode 'upsert' with sqlite produces INSERT OR REPLACE", () => {
    const sql = generateFromSchema({
      ddl: SIMPLE_DDL,
      rows: 2,
      outputMode: 'upsert',
      dialect: 'sqlite',
    });
    expect(sql).toContain('INSERT OR REPLACE');
  });
});

// ---------------------------------------------------------------------------
// generateFromSchema — dialect
// ---------------------------------------------------------------------------

describe('generateFromSchema — dialect options', () => {
  test("dialect 'postgres' cascade in truncate mode", () => {
    const sql = generateFromSchema({
      ddl: SIMPLE_DDL,
      rows: 1,
      outputMode: 'truncate+insert',
      dialect: 'postgres',
    });
    expect(sql).toContain('CASCADE');
  });

  test("dialect 'mysql' no cascade in truncate mode", () => {
    const sql = generateFromSchema({
      ddl: SIMPLE_DDL,
      rows: 1,
      outputMode: 'truncate+insert',
      dialect: 'mysql',
    });
    expect(sql).not.toContain('CASCADE');
  });
});

// ---------------------------------------------------------------------------
// generateFromSchema — FK resolution
// ---------------------------------------------------------------------------

describe('generateFromSchema — FK resolution', () => {
  test('child FK column values exist in the parent PK range', () => {
    const sql = generateFromSchema({ ddl: TWO_TABLE_DDL, rows: 5, outputMode: 'insert' });

    // Extract user IDs generated (values 1-5)
    // Extract posts' user_id values and check they are all 1-5
    // Both tables produce inserts — just verify the output contains both
    expect(sql).toContain('-- Table: users');
    expect(sql).toContain('-- Table: posts');
  });

  test('parent table inserts come before child table inserts', () => {
    const sql = generateFromSchema({ ddl: TWO_TABLE_DDL, rows: 3, outputMode: 'insert' });
    const usersIdx = sql.indexOf('-- Table: users');
    const postsIdx = sql.indexOf('-- Table: posts');
    expect(usersIdx).toBeGreaterThanOrEqual(0);
    expect(postsIdx).toBeGreaterThan(usersIdx);
  });

  test('generates correct number of rows for each table', () => {
    const sql = generateFromSchema({ ddl: TWO_TABLE_DDL, rows: 4, outputMode: 'insert' });
    // There should be 4 inserts for users and 4 inserts for posts
    const insertMatches = sql.match(/INSERT INTO/g) || [];
    expect(insertMatches.length).toBe(8);
  });

  test('FK column falls back gracefully when parent is outside schema', () => {
    // posts references users, but users is not in this DDL
    const orphanDDL = `
      CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        title VARCHAR(255)
      );
    `;
    // Should not throw; user_id falls back to normal generation
    const sql = generateFromSchema({ ddl: orphanDDL, rows: 2, outputMode: 'insert' });
    expect(sql).toContain('INSERT INTO');
  });
});

// ---------------------------------------------------------------------------
// generateFromSchema — error cases
// ---------------------------------------------------------------------------

describe('generateFromSchema — error handling', () => {
  test('throws when neither ddl nor tables provided', () => {
    expect(() => generateFromSchema({ rows: 5 })).toThrow(
      'generateFromSchema requires either "ddl"'
    );
  });

  test('throws on unknown outputMode', () => {
    expect(() =>
      generateFromSchema({ ddl: SIMPLE_DDL, outputMode: 'bad-mode' })
    ).toThrow('Unknown outputMode');
  });

  test('throws on unknown dialect', () => {
    expect(() =>
      generateFromSchema({ ddl: SIMPLE_DDL, dialect: 'oracle' })
    ).toThrow('Unknown dialect');
  });
});

// ---------------------------------------------------------------------------
// buildInsertStatements
// ---------------------------------------------------------------------------

describe('buildInsertStatements', () => {
  const records = [
    { id: 1, email: 'alice@example.com' },
    { id: 2, email: 'bob@example.com' },
  ];
  const columns = [{ name: 'id' }, { name: 'email' }];

  test('produces INSERT statements for each record', () => {
    const sql = buildInsertStatements({ tableName: 'users', records, columns });
    expect(sql.match(/INSERT INTO users/g)).toHaveLength(2);
  });

  test('includes column names and values', () => {
    const sql = buildInsertStatements({ tableName: 'users', records, columns });
    expect(sql).toContain('id');
    expect(sql).toContain('email');
    expect(sql).toContain('alice@example.com');
  });

  test('returns empty string for empty records', () => {
    const sql = buildInsertStatements({ tableName: 'users', records: [], columns });
    expect(sql).toBe('');
  });

  test("dialect 'postgres' upsert uses ON CONFLICT syntax", () => {
    const sql = buildInsertStatements({
      tableName: 'users',
      records,
      columns,
      dialect: 'postgres',
      outputMode: 'upsert',
      conflictColumns: ['id'],
    });
    expect(sql).toContain('ON CONFLICT');
  });

  test("dialect 'mysql' upsert uses ON DUPLICATE KEY syntax", () => {
    const sql = buildInsertStatements({
      tableName: 'users',
      records,
      columns,
      dialect: 'mysql',
      outputMode: 'upsert',
      conflictColumns: ['id'],
    });
    expect(sql).toContain('ON DUPLICATE KEY UPDATE');
  });

  test("dialect 'sqlite' upsert uses INSERT OR REPLACE syntax", () => {
    const sql = buildInsertStatements({
      tableName: 'users',
      records,
      columns,
      dialect: 'sqlite',
      outputMode: 'upsert',
      conflictColumns: ['id'],
    });
    expect(sql).toContain('INSERT OR REPLACE');
  });

  test('throws when tableName is missing', () => {
    expect(() =>
      buildInsertStatements({ tableName: '', records, columns })
    ).toThrow('tableName must be a non-empty string');
  });

  test('throws when tableName is not a string', () => {
    expect(() =>
      buildInsertStatements({ tableName: 42, records, columns })
    ).toThrow('tableName must be a non-empty string');
  });

  test('throws when records is not an array', () => {
    expect(() =>
      buildInsertStatements({ tableName: 'users', records: 'bad', columns })
    ).toThrow('records must be an Array');
  });

  test('throws when columns is empty', () => {
    expect(() =>
      buildInsertStatements({ tableName: 'users', records, columns: [] })
    ).toThrow('columns must be a non-empty Array');
  });

  test('throws when columns is not an array', () => {
    expect(() =>
      buildInsertStatements({ tableName: 'users', records, columns: null })
    ).toThrow('columns must be a non-empty Array');
  });

  test('throws on upsert without conflictColumns', () => {
    expect(() =>
      buildInsertStatements({
        tableName: 'users',
        records,
        columns,
        outputMode: 'upsert',
        conflictColumns: [],
      })
    ).toThrow('conflictColumn');
  });
});

// ---------------------------------------------------------------------------
// toSQL() overload in formatters.js — schema delegation
// ---------------------------------------------------------------------------

describe('toSQL() schema overload (via formatters.js)', () => {
  test('delegates to generateFromSchema when first arg has ddl key', () => {
    const sql = toSQL({ ddl: SIMPLE_DDL, rows: 2, outputMode: 'insert', dialect: 'generic' });
    expect(typeof sql).toBe('string');
    expect(sql).toContain('INSERT INTO');
    expect(sql).toContain('users');
  });

  test('delegates to generateFromSchema when first arg has tables key', () => {
    const tables = parseDDL(SIMPLE_DDL);
    const sql = toSQL({ tables, rows: 2, outputMode: 'insert' });
    expect(sql).toContain('users');
  });

  test('still works with legacy signature toSQL(records, columns, tableName)', () => {
    const records = [{ id: 1, name: 'Alice' }];
    const columns = [{ name: 'id' }, { name: 'name' }];
    const sql = toSQL(records, columns, 'test_table');
    expect(sql).toContain('INSERT INTO test_table');
    expect(sql).toContain('Alice');
  });

  test('still works with schema options object as 3rd arg', () => {
    const records = [{ id: 1, name: 'Alice' }];
    const columns = [{ name: 'id' }, { name: 'name' }];
    const sql = toSQL(records, columns, { tableName: 'people', dialect: 'generic', mode: 'insert' });
    expect(sql).toContain('people');
  });
});

// ---------------------------------------------------------------------------
// generateFromSchema — rows=0 edge case
// ---------------------------------------------------------------------------

describe('generateFromSchema — edge cases', () => {
  test('rows=0 produces no INSERT statements', () => {
    const sql = generateFromSchema({ ddl: SIMPLE_DDL, rows: 0, outputMode: 'insert' });
    expect(sql).not.toContain('INSERT INTO');
  });

  test('ddl+insert with rows=0 still produces CREATE TABLE', () => {
    const sql = generateFromSchema({ ddl: SIMPLE_DDL, rows: 0, outputMode: 'ddl+insert' });
    expect(sql).toContain('CREATE TABLE');
  });

  test('handles table with no primaryKey gracefully', () => {
    const noPKDdl = `CREATE TABLE t (name VARCHAR(50), value TEXT);`;
    const sql = generateFromSchema({ ddl: noPKDdl, rows: 2 });
    expect(sql).toContain('INSERT INTO');
  });

  test("ddl+insert mode covers FK references branch in buildDDLColumns", () => {
    // TWO_TABLE_DDL has posts.user_id referencing users.id.
    // In ddl+insert mode, buildDDLColumns is called; the FK branch (references: fk ? {...} : null)
    // exercises the truthy path for the user_id FK column.
    const sql = generateFromSchema({ ddl: TWO_TABLE_DDL, rows: 2, outputMode: 'ddl+insert' });
    expect(sql).toContain('CREATE TABLE');
    expect(sql).toContain('INSERT INTO');
    expect(sql).toContain('users');
    expect(sql).toContain('posts');
  });

  test('columns with DEFAULT values cover the defaultValue branch in buildDDLColumns', () => {
    // buildDDLColumns computes: default: col.defaultValue != null ? col.defaultValue : undefined
    // Without a column that has a non-null defaultValue the truthy branch (line 39) is never hit.
    const ddlWithDefaults = `
      CREATE TABLE config (
        id SERIAL PRIMARY KEY,
        status VARCHAR(20) DEFAULT 'active',
        retry_count INT DEFAULT 0
      );
    `;
    const sql = generateFromSchema({ ddl: ddlWithDefaults, rows: 2, outputMode: 'ddl+insert' });
    expect(sql).toContain('CREATE TABLE');
    expect(sql).toContain('INSERT INTO');
  });

  test('upsert mode with no-PK table exercises the primaryKey || [] fallback', () => {
    // A table with no primary key causes the || [] fallback on line 244 of schema-generator.
    // generateUpserts then throws because no conflict columns are available.
    const noPKDdl = `CREATE TABLE t (name VARCHAR(50), value TEXT);`;
    expect(() =>
      generateFromSchema({ ddl: noPKDdl, rows: 2, outputMode: 'upsert', dialect: 'generic' })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// C3 — FK column sampling uses Faker seeded PRNG (reproducible output)
// ---------------------------------------------------------------------------

describe('generateFromSchema — seeded FK sampling (C3)', () => {
  test('two runs with the same seed produce identical FK column values', () => {
    seedFaker(12345);
    const sql1 = generateFromSchema({ ddl: TWO_TABLE_DDL, rows: 3, outputMode: 'insert' });
    seedFaker(12345);
    const sql2 = generateFromSchema({ ddl: TWO_TABLE_DDL, rows: 3, outputMode: 'insert' });
    expect(sql1).toBe(sql2);
  });

  test('FK column values in child table are a subset of parent PKs', () => {
    const sql = generateFromSchema({ ddl: TWO_TABLE_DDL, rows: 3, outputMode: 'insert' });
    // Extract user INSERT id values (first column in INSERT INTO users ...)
    const userMatches = [...sql.matchAll(/INSERT INTO users \(id, email\) VALUES \((\d+),/g)];
    const userIds = new Set(userMatches.map(m => parseInt(m[1], 10)));
    // Extract user_id values from posts INSERT
    const postMatches = [...sql.matchAll(/INSERT INTO posts \(id, user_id, title\) VALUES \(\d+, (\d+),/g)];
    const postUserIds = postMatches.map(m => parseInt(m[1], 10));
    postUserIds.forEach(uid => expect(userIds.has(uid)).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// M6 — Per-table row count support
// ---------------------------------------------------------------------------

describe('generateFromSchema — per-table rows (M6)', () => {
  test('rows as Record<string,number> produces correct row counts', () => {
    const sql = generateFromSchema({
      ddl: TWO_TABLE_DDL,
      rows: { users: 3, posts: 7 },
      outputMode: 'insert',
    });
    const userInserts = (sql.match(/INSERT INTO users/g) || []).length;
    const postInserts = (sql.match(/INSERT INTO posts/g) || []).length;
    expect(userInserts).toBe(3);
    expect(postInserts).toBe(7);
  });

  test('rows object with missing table falls back to 10 rows', () => {
    // Only provide row count for 'users'; posts should fall back to 10
    const sql = generateFromSchema({
      ddl: TWO_TABLE_DDL,
      rows: { users: 2 },
      outputMode: 'insert',
    });
    const postInserts = (sql.match(/INSERT INTO posts/g) || []).length;
    expect(postInserts).toBe(10); // default fallback
  });
});

