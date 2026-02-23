import { faker } from '@faker-js/faker';
import { setFaker } from '../src/core.js';
import { table, schema } from '../src/schema-builder.js';

// Initialise Faker before any generation
setFaker(faker);

describe('Schema Builder — table()', () => {
  test('throws when tableName is empty', () => {
    expect(() => table('')).toThrow('table: tableName must be a non-empty string');
  });

  test('.column() is chainable and populates _columns', () => {
    const tb = table('users')
      .column('id', 'autoIncrement', { primaryKey: true })
      .column('email', 'email', { nullable: false });
    const built = tb.build();
    expect(built.columns).toHaveLength(2);
    expect(built.columns[0]).toEqual({ name: 'id', type: 'autoIncrement', primaryKey: true });
    expect(built.columns[1]).toEqual({ name: 'email', type: 'email', nullable: false });
  });

  test('.rows() and .dialect() are reflected in .build()', () => {
    const built = table('items')
      .column('id', 'autoIncrement')
      .rows(50)
      .dialect('postgres')
      .build();
    expect(built.rows).toBe(50);
    expect(built.dialect).toBe('postgres');
    expect(built.table).toBe('items');
  });

  test('.build() returns correct plain object shape', () => {
    const built = table('products')
      .column('id', 'autoIncrement', { primaryKey: true })
      .column('name', 'product')
      .build();
    expect(built).toHaveProperty('table', 'products');
    expect(built).toHaveProperty('columns');
    expect(built).toHaveProperty('rows');
    expect(built).toHaveProperty('dialect');
    expect(Array.isArray(built.columns)).toBe(true);
  });

  test('.toSQL("ddl+insert") output contains CREATE TABLE', () => {
    const sql = table('users')
      .column('id', 'autoIncrement', { primaryKey: true })
      .column('email', 'email')
      .rows(3)
      .toSQL('ddl+insert');
    expect(sql).toContain('CREATE TABLE users');
    expect(sql).toContain('INSERT INTO');
  });

  test('.toSQL() without arguments uses default mode ddl+insert', () => {
    const sql = table('defaults_test')
      .column('id', 'autoIncrement', { primaryKey: true })
      .rows(2)
      .toSQL();  // no argument — exercises the mode = 'ddl+insert' default
    expect(sql).toContain('CREATE TABLE defaults_test');
    expect(sql).toContain('INSERT INTO');
  });

  test('.toSQL("insert") output does NOT contain CREATE TABLE', () => {
    const sql = table('orders')
      .column('id', 'autoIncrement', { primaryKey: true })
      .column('amount', 'price')
      .rows(2)
      .toSQL('insert');
    expect(sql).not.toContain('CREATE TABLE');
    expect(sql).toContain('INSERT INTO');
  });

  test('.toGenerateOptions() returns columns string and rows', () => {
    const opts = table('contacts')
      .column('id', 'autoIncrement')
      .column('name', 'fullName')
      .rows(50)
      .toGenerateOptions();
    expect(opts.columns).toBe('id:autoIncrement,name:fullName');
    expect(opts.rows).toBe(50);
  });

  test('.column() throws when name is missing', () => {
    expect(() => table('t').column('', 'email')).toThrow('column: name must be a non-empty string');
  });

  test('.column() throws when type is missing', () => {
    expect(() => table('t').column('id', '')).toThrow('column: type must be a non-empty string');
  });

  test('.rows() throws when n is not a number', () => {
    expect(() => table('t').column('id', 'autoIncrement').rows('fifty')).toThrow(
      'rows: n must be a non-negative number'
    );
  });

  test('throws when tableName is whitespace-only', () => {
    expect(() => table('   ')).toThrow('table: tableName must be a non-empty string');
  });

  test('.column() throws when name is a non-string (number)', () => {
    expect(() => table('t').column(123, 'email')).toThrow('column: name must be a non-empty string');
  });

  test('.column() throws when type is a non-string (number)', () => {
    expect(() => table('t').column('id', 42)).toThrow('column: type must be a non-empty string');
  });

  test('.rows() throws when n is negative', () => {
    expect(() => table('t').column('id', 'autoIncrement').rows(-1)).toThrow(
      'rows: n must be a non-negative number'
    );
  });

  // M4: dialect validation in TableBuilder
  test('.dialect() throws for unsupported dialect (M4)', () => {
    expect(() => table('t').column('id', 'autoIncrement').dialect('mssql')).toThrow(
      'dialect: "mssql" is not supported'
    );
  });
});

describe('Schema Builder — schema()', () => {
  test('callback receives a TableBuilder with column() method', () => {
    let received = null;
    schema().table('a', t => { received = t; });
    // Verify the callback received an object with the fluent API
    expect(typeof received.column).toBe('function');
    expect(typeof received.rows).toBe('function');
    expect(typeof received.dialect).toBe('function');
    expect(typeof received.build).toBe('function');
    expect(typeof received.toSQL).toBe('function');
    expect(typeof received.toGenerateOptions).toBe('function');
  });

  test('.build() returns schema object with tables array', () => {
    const built = schema('myDb')
      .table('users', t => t.column('id', 'autoIncrement', { primaryKey: true }))
      .build();
    expect(built.schema).toBe('myDb');
    expect(Array.isArray(built.tables)).toBe(true);
    expect(built.tables).toHaveLength(1);
    expect(built.tables[0].table).toBe('users');
  });

  test('.dialect() propagates to all tables', () => {
    const built = schema()
      .dialect('mysql')
      .table('a', t => t.column('id', 'autoIncrement'))
      .table('b', t => t.column('id', 'autoIncrement'))
      .build();
    expect(built.dialect).toBe('mysql');
    built.tables.forEach(tbl => expect(tbl.dialect).toBe('mysql'));
  });

  test('.rows() sets default row count for all tables', () => {
    const built = schema()
      .rows(7)
      .table('x', t => t.column('id', 'autoIncrement'))
      .build();
    expect(built.tables[0].rows).toBe(7);
  });

  test('.toSQL("ddl+insert") with two tables emits both table names', () => {
    const sql = schema()
      .table('authors', t => t
        .column('id', 'autoIncrement', { primaryKey: true })
        .column('name', 'fullName')
        .rows(3))
      .table('books', t => t
        .column('id', 'autoIncrement', { primaryKey: true })
        .column('title', 'sentence')
        .rows(3))
      .toSQL('ddl+insert');
    expect(sql).toContain('CREATE TABLE authors');
    expect(sql).toContain('CREATE TABLE books');
    expect(sql).toContain('INSERT INTO');
  });

  test('.table() without callback builds an empty table (no callback branch)', () => {
    const built = schema().table('emptyTable').build();
    expect(built.tables).toHaveLength(1);
    expect(built.tables[0].table).toBe('emptyTable');
    expect(built.tables[0].columns).toEqual([]);
  });

  test('.toSQL() without arguments for schema uses default mode ddl+insert', () => {
    const sql = schema()
      .table('default_mode_tbl', t => t
        .column('id', 'autoIncrement', { primaryKey: true })
        .rows(2))
      .toSQL();  // no argument — exercises the mode = 'ddl+insert' default in SchemaBuilder
    expect(sql).toContain('CREATE TABLE default_mode_tbl');
    expect(sql).toContain('INSERT INTO');
  });

  test('.toSQL() is chainable — schema() call itself returns SchemaBuilder', () => {
    const sb = schema('test');
    expect(typeof sb.table).toBe('function');
    expect(typeof sb.dialect).toBe('function');
    expect(typeof sb.rows).toBe('function');
    expect(typeof sb.build).toBe('function');
    expect(typeof sb.toSQL).toBe('function');
  });

  // M4: dialect validation in SchemaBuilder
  test('.dialect() throws for unsupported dialect (M4)', () => {
    expect(() => schema().dialect('mssql')).toThrow(
      'dialect: "mssql" is not supported'
    );
  });

  // C4: SchemaBuilder.toSQL() with FK references generates correct SQL for both parent and child tables (C4)
  test('.toSQL() with FK references generates SQL for both parent and child tables (C4)', () => {
    const sql = schema()
      .table('authors', t => t
        .column('id', 'autoIncrement', { primaryKey: true })
        .column('name', 'fullName')
        .rows(2))
      .table('books', t => t
        .column('id', 'autoIncrement', { primaryKey: true })
        .column('author_id', 'number', { references: { table: 'authors', column: 'id' } })
        .column('title', 'sentence')
        .rows(3))
      .toSQL('insert');
    expect(sql).toContain('INSERT INTO authors');
    expect(sql).toContain('INSERT INTO books');
  });

  // Cover col.default branch in SchemaBuilder.toSQL() (line 203 true path)
  test('.toSQL() with a column default value covers the col.default branch', () => {
    const sql = schema()
      .table('tbl_with_default', t => t
        .column('id', 'autoIncrement', { primaryKey: true })
        .column('status', 'word', { default: 'active' })
        .rows(2))
      .toSQL('insert');
    expect(sql).toContain('INSERT INTO tbl_with_default');
  });

  // Cover primaryKey.length === 0 null path in SchemaBuilder.toSQL() (line 222 null path)
  test('.toSQL() with no primary key column returns null primaryKey (line 222 null path)', () => {
    const sql = schema()
      .table('no_pk_tbl', t => t
        .column('val', 'word')
        .rows(2))
      .toSQL('insert');
    expect(sql).toContain('INSERT INTO no_pk_tbl');
  });
});
