// Tests for SQL schema generator
import { vi } from 'vitest';
import * as sqlSchema from '../src/sql-schema.js';
import { setLogger, resetLogger } from '../src/logger.js';

describe('SQL Schema Generator', () => {
  
  describe('getSQLType', () => {
    test('maps basic Faker types to SQL types', () => {
      expect(sqlSchema.getSQLType({ name: 'id', type: 'autoIncrement' }, 'postgres')).toBe('SERIAL');
      expect(sqlSchema.getSQLType({ name: 'id', type: 'autoIncrement' }, 'mysql')).toBe('INT AUTO_INCREMENT');
      expect(sqlSchema.getSQLType({ name: 'id', type: 'autoIncrement' }, 'sqlite')).toBe('INTEGER PRIMARY KEY AUTOINCREMENT');
      
      expect(sqlSchema.getSQLType({ name: 'email', type: 'email' }, 'postgres')).toBe('VARCHAR(255)');
      expect(sqlSchema.getSQLType({ name: 'active', type: 'boolean' }, 'mysql')).toBe('TINYINT(1)');
      expect(sqlSchema.getSQLType({ name: 'created', type: 'timestamp' }, 'postgres')).toBe('TIMESTAMP');
    });

    test('handles autoIncrement in generic dialect', () => {
      expect(sqlSchema.getSQLType({ name: 'id', type: 'autoIncrement' }, 'generic')).toBe('INTEGER');
    });

    test('handles number type in different dialects', () => {
      expect(sqlSchema.getSQLType({ name: 'count', type: 'number' }, 'postgres')).toBe('INTEGER');
      expect(sqlSchema.getSQLType({ name: 'count', type: 'number' }, 'mysql')).toBe('INT');
      expect(sqlSchema.getSQLType({ name: 'count', type: 'number' }, 'generic')).toBe('INTEGER');
    });

    test('handles boolean type in different dialects', () => {
      expect(sqlSchema.getSQLType({ name: 'active', type: 'boolean' }, 'postgres')).toBe('BOOLEAN');
      expect(sqlSchema.getSQLType({ name: 'active', type: 'boolean' }, 'sqlite')).toBe('INTEGER');
      expect(sqlSchema.getSQLType({ name: 'active', type: 'boolean' }, 'generic')).toBe('BOOLEAN');
    });

    test('handles timestamp type in different dialects', () => {
      expect(sqlSchema.getSQLType({ name: 'created', type: 'timestamp' }, 'postgres')).toBe('TIMESTAMP');
      expect(sqlSchema.getSQLType({ name: 'created', type: 'timestamp' }, 'mysql')).toBe('DATETIME');
      expect(sqlSchema.getSQLType({ name: 'created', type: 'timestamp' }, 'generic')).toBe('TIMESTAMP');
    });
    
    test('handles enum types', () => {
      const col = { name: 'status', type: 'enum:active|inactive|pending' };
      expect(sqlSchema.getSQLType(col, 'mysql')).toContain('ENUM');
      expect(sqlSchema.getSQLType(col, 'mysql')).toContain("'active'");
      expect(sqlSchema.getSQLType(col, 'postgres')).toBe('VARCHAR(50)');
    });
    
    test('handles range types', () => {
      const col = { name: 'age', type: 'range:18-99' };
      expect(sqlSchema.getSQLType(col, 'postgres')).toBe('INTEGER');
    });
    
    test('handles pattern types', () => {
      const col = { name: 'code', type: 'pattern:PRD-######' };
      expect(sqlSchema.getSQLType(col, 'postgres')).toBe('VARCHAR(255)');
    });

    test('handles pattern types with custom length', () => {
      const col = { name: 'code', type: 'pattern:PRD-######', length: 20 };
      expect(sqlSchema.getSQLType(col, 'postgres')).toBe('VARCHAR(20)');
    });

    test('handles static types', () => {
      const col = { name: 'constant', type: 'static:ACTIVE' };
      expect(sqlSchema.getSQLType(col, 'postgres')).toBe('VARCHAR(255)');
    });

    test('handles enum types with SQLite dialect', () => {
      const col = { name: 'status', type: 'enum:active|inactive' };
      expect(sqlSchema.getSQLType(col, 'sqlite')).toBe('VARCHAR(50)');
    });

    test('handles enum types with generic dialect', () => {
      const col = { name: 'status', type: 'enum:active|inactive' };
      expect(sqlSchema.getSQLType(col, 'generic')).toBe('VARCHAR(50)');
    });

    test('uses default dialect when not provided', () => {
      const col = { name: 'name', type: 'fullName' };
      expect(sqlSchema.getSQLType(col)).toBe('VARCHAR(100)');
    });
    
    test('respects explicit sqlType', () => {
      const col = { name: 'data', type: 'text', sqlType: 'JSONB' };
      expect(sqlSchema.getSQLType(col, 'postgres')).toBe('JSONB');
    });
    
    test('uses generic fallback for unknown types', () => {
      const col = { name: 'unknown', type: 'unknownType' };
      expect(sqlSchema.getSQLType(col, 'postgres')).toBe('VARCHAR(255)');
    });

    test('handles range types with undefined dialect in type map', () => {
      const col = { name: 'age', type: 'range:18-99' };
      expect(sqlSchema.getSQLType(col, 'unknowndb')).toBeDefined();
    });

    test('handles pattern types with undefined dialect in type map', () => {
      const col = { name: 'code', type: 'pattern:PRD-######' };
      expect(sqlSchema.getSQLType(col, 'unknowndb')).toBe('VARCHAR(255)');
    });

    test('handles static types with undefined dialect in type map', () => {
      const col = { name: 'constant', type: 'static:ACTIVE' };
      expect(sqlSchema.getSQLType(col, 'unknowndb')).toBe('VARCHAR(255)');
    });

    test('handles types with undefined dialect in type map', () => {
      const col = { name: 'email', type: 'email' };
      expect(sqlSchema.getSQLType(col, 'unknowndb')).toBe('VARCHAR(255)');
    });

    test('handles uuid type in different dialects', () => {
      expect(sqlSchema.getSQLType({ name: 'id', type: 'uuid' }, 'postgres')).toBe('UUID');
      expect(sqlSchema.getSQLType({ name: 'id', type: 'uuid' }, 'mysql')).toBe('CHAR(36)');
      expect(sqlSchema.getSQLType({ name: 'id', type: 'uuid' }, 'sqlite')).toBe('TEXT');
    });

    test('falls back to generic string type for unknown type with unknown dialect', () => {
      // Covers the || sqlTypeMap.string.generic fallback when dialect is not in the map
      const col = { name: 'custom', type: 'unknownType' };
      expect(sqlSchema.getSQLType(col, 'unknowndb')).toBe('VARCHAR(255)');
    });

  });
  
  describe('generateDDL', () => {
    test('generates basic CREATE TABLE statement', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'name', type: 'fullName' },
        { name: 'email', type: 'email' }
      ];
      
      const ddl = sqlSchema.generateDDL('users', columns, { dialect: 'postgres' });
      
      expect(ddl).toContain('CREATE TABLE users');
      expect(ddl).toContain('id SERIAL PRIMARY KEY');
      expect(ddl).toContain('name VARCHAR(100)');
      expect(ddl).toContain('email VARCHAR(255)');
    });
    
    test('handles NOT NULL constraints', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'email', type: 'email', nullable: false }
      ];
      
      const ddl = sqlSchema.generateDDL('users', columns, { dialect: 'postgres' });
      
      expect(ddl).toContain('email VARCHAR(255) NOT NULL');
    });
    
    test('handles UNIQUE constraints', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'username', type: 'username', unique: true }
      ];
      
      const ddl = sqlSchema.generateDDL('users', columns, { dialect: 'postgres' });
      
      expect(ddl).toContain('username VARCHAR(50) UNIQUE');
    });
    
    test('handles DEFAULT values', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'status', type: 'string', default: 'active' },
        { name: 'count', type: 'number', default: 0 },
        { name: 'active', type: 'boolean', default: true }
      ];
      
      const ddl = sqlSchema.generateDDL('users', columns, { dialect: 'postgres' });
      
      expect(ddl).toContain("status VARCHAR(255) DEFAULT 'active'");
      expect(ddl).toContain('count INTEGER DEFAULT 0');
      expect(ddl).toContain('active BOOLEAN DEFAULT true');
    });

    test('handles boolean defaults for non-postgres dialects', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'active', type: 'boolean', default: true },
        { name: 'deleted', type: 'boolean', default: false }
      ];
      
      const ddl = sqlSchema.generateDDL('users', columns, { dialect: 'mysql' });
      
      expect(ddl).toContain('active TINYINT(1) DEFAULT 1');
      expect(ddl).toContain('deleted TINYINT(1) DEFAULT 0');
    });
    
    test('handles SQL function defaults', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'created_at', type: 'timestamp', default: 'NOW()' }
      ];
      
      const ddl = sqlSchema.generateDDL('users', columns, { dialect: 'postgres' });
      
      expect(ddl).toContain('created_at TIMESTAMP DEFAULT NOW()');
    });
    
    test('generates foreign key constraints', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'user_id', type: 'number', references: { table: 'users', column: 'id' } }
      ];
      
      const ddl = sqlSchema.generateDDL('orders', columns, { dialect: 'postgres' });
      
      expect(ddl).toContain('CONSTRAINT fk_orders_user_id');
      expect(ddl).toContain('FOREIGN KEY (user_id) REFERENCES users(id)');
    });
    
    test('handles foreign key with ON DELETE/UPDATE', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { 
          name: 'user_id', 
          type: 'number', 
          references: { table: 'users', column: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        }
      ];
      
      const ddl = sqlSchema.generateDDL('orders', columns, { dialect: 'postgres' });
      
      expect(ddl).toContain('ON DELETE CASCADE');
      expect(ddl).toContain('ON UPDATE CASCADE');
    });

    test('handles foreign key without explicit column (defaults to id)', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { 
          name: 'user_id', 
          type: 'number', 
          references: { table: 'users' }
        }
      ];
      
      const ddl = sqlSchema.generateDDL('orders', columns, { dialect: 'postgres' });
      
      expect(ddl).toContain('FOREIGN KEY (user_id) REFERENCES users(id)');
    });

    test('handles foreign key with only onDelete', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { 
          name: 'user_id', 
          type: 'number', 
          references: { table: 'users', column: 'id' },
          onDelete: 'SET NULL'
        }
      ];
      
      const ddl = sqlSchema.generateDDL('orders', columns, { dialect: 'postgres' });
      
      expect(ddl).toContain('ON DELETE SET NULL');
      expect(ddl).not.toContain('ON UPDATE');
    });

    test('handles foreign key with only onUpdate', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { 
          name: 'user_id', 
          type: 'number', 
          references: { table: 'users', column: 'id' },
          onUpdate: 'RESTRICT'
        }
      ];
      
      const ddl = sqlSchema.generateDDL('orders', columns, { dialect: 'postgres' });
      
      expect(ddl).toContain('ON UPDATE RESTRICT');
      expect(ddl).not.toContain('ON DELETE');
    });
    
    test('generates SQLite-specific autoincrement', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'name', type: 'fullName' }
      ];
      
      const ddl = sqlSchema.generateDDL('users', columns, { dialect: 'sqlite' });
      
      expect(ddl).toContain('id INTEGER PRIMARY KEY AUTOINCREMENT');
    });
    
    test('generates MySQL-specific autoincrement', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'name', type: 'fullName' }
      ];
      
      const ddl = sqlSchema.generateDDL('users', columns, { dialect: 'mysql' });
      
      expect(ddl).toContain('id INT AUTO_INCREMENT PRIMARY KEY');
    });

    test('generates generic autoincrement with primary key', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'name', type: 'fullName' }
      ];
      
      const ddl = sqlSchema.generateDDL('users', columns, { dialect: 'generic' });
      
      expect(ddl).toContain('id INTEGER PRIMARY KEY');
    });

    test('handles non-autoincrement primary key', () => {
      const columns = [
        { name: 'uuid', type: 'uuid', primaryKey: true },
        { name: 'name', type: 'fullName' }
      ];
      
      const ddl = sqlSchema.generateDDL('users', columns, { dialect: 'postgres' });
      
      expect(ddl).toContain('uuid UUID PRIMARY KEY');
    });

    test('handles CURRENT_TIMESTAMP as default value', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
      ];
      
      const ddl = sqlSchema.generateDDL('users', columns, { dialect: 'postgres' });
      
      expect(ddl).toContain('created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    });

    test('handles notNull constraint', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'email', type: 'email', notNull: true }
      ];
      
      const ddl = sqlSchema.generateDDL('users', columns, { dialect: 'postgres' });
      
      expect(ddl).toContain('email VARCHAR(255) NOT NULL');
    });

    test('handles DEFAULT value at false for boolean in MySQL', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'active', type: 'boolean', default: false }
      ];
      
      const ddl = sqlSchema.generateDDL('users', columns, { dialect: 'mysql' });
      
      expect(ddl).toContain('active TINYINT(1) DEFAULT 0');
    });

    test('generateDDL with autoIncrement and non-sqlite dialect', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'name', type: 'text' }
      ];
      
      const ddl = sqlSchema.generateDDL('users', columns, { dialect: 'mysql' });
      
      expect(ddl).toContain('id INT AUTO_INCREMENT PRIMARY KEY');
    });

    test('generateDDL with multiple foreign key constraints', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'user_id', type: 'number', references: { table: 'users', column: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' } },
        { name: 'product_id', type: 'number', references: { table: 'products', column: 'id' } }
      ];
      
      const ddl = sqlSchema.generateDDL('orders', columns, { dialect: 'postgres' });
      
      expect(ddl).toContain('FOREIGN KEY');
      expect(ddl).toContain('users');
      expect(ddl).toContain('products');
    });



    test('handles composite primary keys', () => {
      const columns = [
        { name: 'user_id', type: 'number', primaryKey: true },
        { name: 'product_id', type: 'number', primaryKey: true },
        { name: 'quantity', type: 'number' }
      ];
      
      const ddl = sqlSchema.generateDDL('cart_items', columns, { dialect: 'postgres' });
      
      expect(ddl).toContain('PRIMARY KEY');
      expect(ddl).toContain('user_id');
      expect(ddl).toContain('product_id');
    });

    test('allows calling generateDDL without options (defaults to generic dialect)', () => {
      // Covers the options = {} default-arg branch and the || 'generic' binary-expr branch
      const columns = [
        { name: 'id', type: 'number' },
        { name: 'name', type: 'fullName' }
      ];
      const ddl = sqlSchema.generateDDL('test_table', columns);
      expect(ddl).toContain('CREATE TABLE test_table');
      expect(ddl).toContain('INTEGER'); // generic dialect maps 'number' to INTEGER
    });

    test('allows calling generateDDL with empty options (dialect defaults to generic)', () => {
      // Covers the || 'generic' binary-expr branch at options.dialect || 'generic'
      const columns = [
        { name: 'id', type: 'number' }
      ];
      const ddl = sqlSchema.generateDDL('test_table', columns, {});
      expect(ddl).toContain('CREATE TABLE test_table');
      expect(ddl).toContain('INTEGER');
    });

    test('silently ignores non-string/number/boolean default values (null default)', () => {
      // Covers the else arm of the boolean type check in generateDDL default handling
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'tag', type: 'string', default: null }
      ];
      const ddl = sqlSchema.generateDDL('test_table', columns, { dialect: 'postgres' });
      expect(ddl).toContain('CREATE TABLE test_table');
      // null default is silently ignored (no DEFAULT clause generated)
      expect(ddl).not.toContain('DEFAULT null');
    });
  });
  
  describe('generateInserts', () => {
    const columns = [
      { name: 'id', type: 'autoIncrement' },
      { name: 'name', type: 'fullName' },
      { name: 'email', type: 'email' }
    ];
    
    const records = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ];
    
    test('generates individual INSERT statements', () => {
      const sql = sqlSchema.generateInserts('users', records, columns);
      
      expect(sql).toContain('INSERT INTO users (id, name, email) VALUES');
      expect(sql).toContain("(1, 'John Doe', 'john@example.com')");
      expect(sql).toContain("(2, 'Jane Smith', 'jane@example.com')");
    });
    
    test('generates batch INSERT statements', () => {
      const sql = sqlSchema.generateInserts('users', records, columns, { batch: true });
      
      expect(sql).toContain('INSERT INTO users (id, name, email) VALUES');
      expect(sql).toContain("(1, 'John Doe', 'john@example.com'),");
      expect(sql).toContain("(2, 'Jane Smith', 'jane@example.com')");
      expect(sql.match(/INSERT INTO/g).length).toBe(1);
    });
    
    test('escapes single quotes in values', () => {
      const records = [{ id: 1, name: "O'Brien", email: 'test@example.com' }];
      const sql = sqlSchema.generateInserts('users', records, columns);
      
      expect(sql).toContain("'O''Brien'");
    });
    
    test('handles NULL values', () => {
      const records = [{ id: 1, name: null, email: undefined }];
      const sql = sqlSchema.generateInserts('users', records, columns);
      
      expect(sql).toContain('(1, NULL, NULL)');
    });
    
    test('handles boolean values for PostgreSQL', () => {
      const cols = [{ name: 'id', type: 'number' }, { name: 'active', type: 'boolean' }];
      const records = [{ id: 1, active: true }, { id: 2, active: false }];
      const sql = sqlSchema.generateInserts('users', records, cols, { dialect: 'postgres' });
      
      expect(sql).toContain('(1, TRUE)');
      expect(sql).toContain('(2, FALSE)');
    });
    
    test('handles boolean values for MySQL', () => {
      const cols = [{ name: 'id', type: 'number' }, { name: 'active', type: 'boolean' }];
      const records = [{ id: 1, active: true }, { id: 2, active: false }];
      const sql = sqlSchema.generateInserts('users', records, cols, { dialect: 'mysql' });
      
      expect(sql).toContain('(1, 1)');
      expect(sql).toContain('(2, 0)');
    });
    
    test('returns empty string for empty records', () => {
      const sql = sqlSchema.generateInserts('users', [], columns);
      expect(sql).toBe('');
    });

    test('handles INSERT with batch mode for multiple records', () => {
      const columns = [
        { name: 'id', type: 'number' },
        { name: 'name', type: 'text' }
      ];
      const records = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ];
      
      const insert = sqlSchema.generateInserts('users', records, columns, { batch: true });
      
      expect(insert).toContain('INSERT INTO users');
      expect(insert).toContain('VALUES');
    });

    test('generateInserts with string values containing special escape sequences', () => {
      const columns = [
        { name: 'id', type: 'number' },
        { name: 'text', type: 'text' }
      ];
      const records = [
        { id: 1, text: "Line1\nLine2\tTabbed" }
      ];
      
      const insert = sqlSchema.generateInserts('notes', records, columns);
      
      expect(insert).toContain('INSERT INTO notes');
      expect(insert).toContain("'Line1");
    });

    test('handles numeric values in INSERT', () => {
      const columns = [
        { name: 'id', type: 'number' },
        { name: 'price', type: 'number' },
        { name: 'quantity', type: 'number' }
      ];
      const records = [
        { id: 1, price: 19.99, quantity: 5 }
      ];
      
      const insert = sqlSchema.generateInserts('items', records, columns);
      
      expect(insert).toContain('(1, 19.99, 5)');
    });

    test('handles boolean values for SQLite', () => {
      const cols = [{ name: 'id', type: 'number' }, { name: 'active', type: 'boolean' }];
      const records = [{ id: 1, active: true }, { id: 2, active: false }];
      const sql = sqlSchema.generateInserts('users', records, cols, { dialect: 'sqlite' });
      
      expect(sql).toContain('(1, 1)');
      expect(sql).toContain('(2, 0)');
    });

    test('handles boolean values for generic dialect', () => {
      const cols = [{ name: 'id', type: 'number' }, { name: 'active', type: 'boolean' }];
      const records = [{ id: 1, active: true }, { id: 2, active: false }];
      const sql = sqlSchema.generateInserts('users', records, cols, { dialect: 'generic' });
      
      // Generic should use 1 and 0
      expect(sql).toContain('(1, 1)');
      expect(sql).toContain('(2, 0)');
    });
  });
  
  describe('generateUpserts', () => {
    const columns = [
      { name: 'id', type: 'autoIncrement', primaryKey: true },
      { name: 'name', type: 'fullName' },
      { name: 'email', type: 'email' }
    ];
    
    const records = [
      { id: 1, name: 'John Doe', email: 'john@example.com' }
    ];
    
    test('generates PostgreSQL upsert with ON CONFLICT', () => {
      const sql = sqlSchema.generateUpserts('users', records, columns, { dialect: 'postgres' });
      
      expect(sql).toContain('INSERT INTO users');
      expect(sql).toContain('ON CONFLICT (id) DO UPDATE SET');
      expect(sql).toContain('name = EXCLUDED.name');
      expect(sql).toContain('email = EXCLUDED.email');
    });
    
    test('generates MySQL upsert with ON DUPLICATE KEY', () => {
      const sql = sqlSchema.generateUpserts('users', records, columns, { dialect: 'mysql' });
      
      expect(sql).toContain('INSERT INTO users');
      expect(sql).toContain('ON DUPLICATE KEY UPDATE');
      expect(sql).toContain('name = VALUES(name)');
      expect(sql).toContain('email = VALUES(email)');
    });
    
    test('generates SQLite upsert with INSERT OR REPLACE', () => {
      const sql = sqlSchema.generateUpserts('users', records, columns, { dialect: 'sqlite' });
      
      expect(sql).toContain('INSERT OR REPLACE INTO users');
    });

    test('generates generic fallback for unsupported dialect', () => {
      const sql = sqlSchema.generateUpserts('users', records, columns, { dialect: 'generic' });
      
      expect(sql).toContain('INSERT INTO users');
      expect(sql).not.toContain('ON CONFLICT');
      expect(sql).not.toContain('ON DUPLICATE KEY');
      expect(sql).not.toContain('OR REPLACE');
    });

    test('handles boolean values in PostgreSQL upserts', () => {
      const cols = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'active', type: 'boolean' }
      ];
      const recs = [{ id: 1, active: true }, { id: 2, active: false }];
      
      const sql = sqlSchema.generateUpserts('users', recs, cols, { dialect: 'postgres' });
      
      expect(sql).toContain('TRUE');
      expect(sql).toContain('FALSE');
    });

    test('handles boolean values in non-PostgreSQL upserts', () => {
      const cols = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'active', type: 'boolean' }
      ];
      const recs = [{ id: 1, active: true }, { id: 2, active: false }];
      
      const sql = sqlSchema.generateUpserts('users', recs, cols, { dialect: 'mysql' });
      
      expect(sql).toContain('VALUES (1, 1)');
      expect(sql).toContain('VALUES (2, 0)');
    });
    
    test('throws error when no unique columns', () => {
      const cols = [
        { name: 'name', type: 'fullName' },
        { name: 'email', type: 'email' }
      ];
      
      expect(() => {
        sqlSchema.generateUpserts('users', records, cols, { dialect: 'postgres' });
      }).toThrow('UPSERT requires at least one unique/primary key column');
    });
    
    test('returns empty string for empty records', () => {
      const sql = sqlSchema.generateUpserts('users', [], columns, { dialect: 'postgres' });
      expect(sql).toBe('');
    });

    test('handles UPSERT for SQLite dialect', () => {
      const columns = [
        { name: 'id', type: 'number', primaryKey: true },
        { name: 'name', type: 'text' }
      ];
      const records = [
        { id: 1, name: 'John' }
      ];
      
      const upsert = sqlSchema.generateUpserts('users', records, columns, {
        dialect: 'sqlite'
      });
      
      expect(upsert).toContain('INSERT OR REPLACE INTO users');
    });

    test('handles UPSERT for generic dialect', () => {
      const columns = [
        { name: 'id', type: 'number', primaryKey: true },
        { name: 'name', type: 'text' }
      ];
      const records = [
        { id: 1, name: 'John' }
      ];
      
      const upsert = sqlSchema.generateUpserts('users', records, columns, {
        dialect: 'generic'
      });
      
      expect(upsert).toContain('INSERT INTO users');
    });

    test('handles boolean values in PostgreSQL UPSERT', () => {
      const columns = [
        { name: 'id', type: 'number', primaryKey: true },
        { name: 'active', type: 'boolean' }
      ];
      const records = [
        { id: 1, active: true },
        { id: 2, active: false }
      ];
      
      const upsert = sqlSchema.generateUpserts('flags', records, columns, { dialect: 'postgres' });
      
      expect(upsert).toContain('TRUE');
      expect(upsert).toContain('FALSE');
    });

    test('handles boolean values in non-PostgreSQL UPSERT', () => {
      const columns = [
        { name: 'id', type: 'number', primaryKey: true },
        { name: 'active', type: 'boolean' }
      ];
      const records = [
        { id: 1, active: true },
        { id: 2, active: false }
      ];
      
      const upsert = sqlSchema.generateUpserts('flags', records, columns, { dialect: 'mysql' });
      
      expect(upsert).toContain('1');
      expect(upsert).toContain('0');
    });

    test('generateUpserts with MySQL dialect', () => {
      const columns = [
        { name: 'id', type: 'number', primaryKey: true },
        { name: 'email', type: 'email', unique: true },
        { name: 'name', type: 'text' }
      ];
      const records = [
        { id: 1, email: 'john@example.com', name: 'John' }
      ];
      
      const upsert = sqlSchema.generateUpserts('users', records, columns, {
        dialect: 'mysql'
      });
      
      expect(upsert).toContain('INSERT INTO users');
      expect(upsert).toContain('ON DUPLICATE KEY UPDATE');
    });

    test('generateUpserts handles NULL and undefined values in all dialects', () => {
      const columns = [
        { name: 'id', type: 'number', primaryKey: true },
        { name: 'data', type: 'text' }
      ];
      const records = [
        { id: 1, data: null }
      ];
      
      const pgUpsert = sqlSchema.generateUpserts('items', records, columns, { dialect: 'postgres' });
      expect(pgUpsert).toContain('NULL');
      
      const mysqlUpsert = sqlSchema.generateUpserts('items', records, columns, { dialect: 'mysql' });
      expect(mysqlUpsert).toContain('NULL');
    });

    test('handles UPSERT with unique column', () => {
      const columns = [
        { name: 'email', type: 'email', unique: true },
        { name: 'name', type: 'text' }
      ];
      const records = [
        { email: 'john@example.com', name: 'John' }
      ];
      
      const upsert = sqlSchema.generateUpserts('users', records, columns, { dialect: 'postgres' });
      
      expect(upsert).toContain('INSERT INTO users');
      expect(upsert).toContain('ON CONFLICT');
    });

    test('allows calling generateUpserts without options (defaults to postgres dialect)', () => {
      // Covers the options = {} default-arg branch and the || 'postgres' binary-expr branch
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'name', type: 'text' }
      ];
      const records = [{ id: 1, name: 'John' }];
      const sql = sqlSchema.generateUpserts('users', records, columns);
      // Default dialect is postgres
      expect(sql).toContain('ON CONFLICT (id) DO UPDATE SET');
    });

    test('allows calling generateUpserts with empty options (dialect defaults to postgres)', () => {
      // Covers the || 'postgres' binary-expr branch when options.dialect is not set
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'email', type: 'email' }
      ];
      const records = [{ id: 1, email: 'test@example.com' }];
      const sql = sqlSchema.generateUpserts('users', records, columns, {});
      expect(sql).toContain('ON CONFLICT (id) DO UPDATE SET');
    });
  });
  
  describe('generateSchema with dependency ordering', () => {
    test('INSERT mode: orders tables so parent INSERT precedes child INSERT', () => {
      const schema = {
        tables: [
          {
            table: 'orders',
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'user_id', type: 'number', references: { table: 'users', column: 'id' } }
            ],
            records: [{ id: 1, user_id: 1 }]
          },
          {
            table: 'users',
            columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }],
            records: [{ id: 1 }]
          }
        ],
        mode: 'insert',
        dialect: 'generic'
      };
      const sql = sqlSchema.generateSchema(schema);
      const usersPos = sql.indexOf('INSERT INTO users');
      const ordersPos = sql.indexOf('INSERT INTO orders');
      expect(usersPos).toBeGreaterThanOrEqual(0);
      expect(ordersPos).toBeGreaterThanOrEqual(0);
      expect(usersPos).toBeLessThan(ordersPos);
    });

    test('INSERT mode: multi-level dependency graph respected', () => {
      const schema = {
        tables: [
          {
            table: 'order_items',
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'order_id', type: 'number', references: { table: 'orders', column: 'id' } }
            ],
            records: [{ id: 1, order_id: 1 }]
          },
          {
            table: 'orders',
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'customer_id', type: 'number', references: { table: 'customers', column: 'id' } }
            ],
            records: [{ id: 1, customer_id: 1 }]
          },
          { table: 'customers', columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }], records: [{ id: 1 }] }
        ],
        mode: 'insert',
        dialect: 'generic'
      };
      const sql = sqlSchema.generateSchema(schema);
      const pos = t => sql.indexOf(`INSERT INTO ${t}`);
      expect(pos('customers')).toBeLessThan(pos('orders'));
      expect(pos('orders')).toBeLessThan(pos('order_items'));
    });

    test('INSERT mode: handles tables with records but no FK', () => {
      const schema = {
        tables: [
          { table: 'users', columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }], records: [{ id: 1 }] },
          { table: 'products', columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }], records: [{ id: 1 }] }
        ],
        mode: 'insert',
        dialect: 'generic'
      };
      const sql = sqlSchema.generateSchema(schema);
      expect(sql).toContain('INSERT INTO users');
      expect(sql).toContain('INSERT INTO products');
    });

    test('INSERT mode: manual order overrides FK sort', () => {
      const schema = {
        tables: [
          {
            table: 'child',
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'parent_id', type: 'number', references: { table: 'parent', column: 'id' } }
            ],
            records: [{ id: 1, parent_id: 1 }]
          },
          {
            table: 'parent',
            columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }],
            records: [{ id: 1 }]
          }
        ],
        mode: 'insert',
        dialect: 'generic',
        insertOrder: 'manual'
      };
      const sql = sqlSchema.generateSchema(schema);
      // In manual mode the given (child-first) order is preserved
      expect(sql.indexOf('INSERT INTO child')).toBeLessThan(sql.indexOf('INSERT INTO parent'));
    });

    test('INSERT mode: FK referencing external table still outputs row', () => {
      const schema = {
        tables: [
          {
            table: 'orders',
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'ext_id', type: 'number', references: { table: 'external_table', column: 'id' } }
            ],
            records: [{ id: 1, ext_id: 99 }]
          }
        ],
        mode: 'insert',
        dialect: 'generic'
      };
      const sql = sqlSchema.generateSchema(schema);
      expect(sql).toContain('INSERT INTO orders');
    });

    test('DDL mode: warns and falls back when circular FK detected', () => {
      const warnMessages = [];
      setLogger({ warn: (...args) => warnMessages.push(args.join(' ')), log() {}, info() {}, error() {} });
      try {
        const schema = {
          tables: [
            { table: 'a', columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }, { name: 'b_id', type: 'number', references: { table: 'b', column: 'id' } }] },
            { table: 'b', columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }, { name: 'a_id', type: 'number', references: { table: 'a', column: 'id' } }] }
          ],
          mode: 'ddl',
          dialect: 'generic'
        };
        const sql = sqlSchema.generateSchema(schema);
        // Should still produce DDL by falling back to original order
        expect(sql).toContain('CREATE TABLE a');
        expect(sql).toContain('CREATE TABLE b');
        expect(warnMessages.some(m => m.includes('Could not resolve'))).toBe(true);
      } finally {
        resetLogger();
      }
    });

    test('table with no columns property uses (t.columns || []) fallback (covers branch on line 426)', () => {
      // When a table entry omits the `columns` array, the expression
      // `(t.columns || [])` falls back to `[]` — covering the falsy branch.
      // Use mode: 'insert' with tables that have no records so generateDDL is not
      // called (which requires columns), but the dependency-ordering code still runs.
      const schema = {
        tables: [
          { table: 'no_cols_table' },  // no `columns` property → t.columns is undefined
          { table: 'has_cols', columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }] }
        ],
        mode: 'insert',
        dialect: 'generic'
      };
      // Should not throw; no_cols_table has no FK dependencies so ordering succeeds
      expect(() => sqlSchema.generateSchema(schema)).not.toThrow();
    });
  });
  
  describe('generateSchema', () => {
    test('generates DDL only', () => {
      const schema = {
        table: 'users',
        columns: [
          { name: 'id', type: 'autoIncrement', primaryKey: true },
          { name: 'name', type: 'fullName' }
        ],
        mode: 'ddl',
        dialect: 'postgres'
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      expect(sql).toContain('CREATE TABLE users');
      expect(sql).toContain('id SERIAL PRIMARY KEY');
      expect(sql).not.toContain('INSERT INTO');
    });
    
    test('generates INSERT only', () => {
      const schema = {
        table: 'users',
        columns: [
          { name: 'id', type: 'autoIncrement' },
          { name: 'name', type: 'fullName' }
        ],
        records: [
          { id: 1, name: 'John Doe' }
        ],
        mode: 'insert',
        dialect: 'postgres'
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      expect(sql).not.toContain('CREATE TABLE');
      expect(sql).toContain('INSERT INTO users');
    });
    
    test('generates DDL + INSERT', () => {
      const schema = {
        table: 'users',
        columns: [
          { name: 'id', type: 'autoIncrement', primaryKey: true },
          { name: 'name', type: 'fullName' }
        ],
        records: [
          { id: 1, name: 'John Doe' }
        ],
        mode: 'ddl+insert',
        dialect: 'postgres'
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      expect(sql).toContain('CREATE TABLE users');
      expect(sql).toContain('INSERT INTO users');
    });
    
    test('generates TRUNCATE + INSERT', () => {
      const schema = {
        table: 'users',
        columns: [
          { name: 'id', type: 'autoIncrement' },
          { name: 'name', type: 'fullName' }
        ],
        records: [
          { id: 1, name: 'John Doe' }
        ],
        mode: 'truncate+insert',
        dialect: 'postgres'
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      expect(sql).toContain('TRUNCATE TABLE users CASCADE');
      expect(sql).toContain('INSERT INTO users');
    });
    
    test('generates UPSERT statements', () => {
      const schema = {
        table: 'users',
        columns: [
          { name: 'id', type: 'autoIncrement', primaryKey: true },
          { name: 'name', type: 'fullName' }
        ],
        records: [
          { id: 1, name: 'John Doe' }
        ],
        mode: 'upsert',
        dialect: 'postgres'
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      expect(sql).toContain('ON CONFLICT');
    });
    
    test('handles multi-table schema', () => {
      const schema = {
        schema: 'ecommerce',
        dialect: 'postgres',
        mode: 'ddl+insert',
        tables: [
          {
            table: 'users',
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'name', type: 'fullName' }
            ],
            records: [{ id: 1, name: 'John Doe' }]
          },
          {
            table: 'orders',
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'user_id', type: 'number', references: { table: 'users', column: 'id' } }
            ],
            records: [{ id: 1, user_id: 1 }]
          }
        ]
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      expect(sql).toContain('-- Schema: ecommerce');
      expect(sql).toContain('CREATE TABLE users');
      expect(sql).toContain('CREATE TABLE orders');
      expect(sql).toContain('INSERT INTO users');
      expect(sql).toContain('INSERT INTO orders');
    });
    
    test('auto-resolves table dependencies', () => {
      const schema = {
        dialect: 'postgres',
        mode: 'ddl',
        insertOrder: 'auto',
        tables: [
          {
            table: 'orders',
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'user_id', type: 'number', references: { table: 'users' } }
            ]
          },
          {
            table: 'users',
            columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }]
          }
        ]
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      const usersIndex = sql.indexOf('CREATE TABLE users');
      const ordersIndex = sql.indexOf('CREATE TABLE orders');
      expect(usersIndex).toBeLessThan(ordersIndex);
    });

    test('handles circular dependencies gracefully', () => {
      const warnMock = vi.fn();
      setLogger({ log() {}, info() {}, warn: warnMock, error() {} });

      try {
        const schema = {
          dialect: 'postgres',
          mode: 'ddl',
          insertOrder: 'auto',
          tables: [
            {
              table: 'table_a',
              columns: [
                { name: 'id', type: 'autoIncrement', primaryKey: true },
                { name: 'b_id', type: 'number', references: { table: 'table_b' } }
              ]
            },
            {
              table: 'table_b',
              columns: [
                { name: 'id', type: 'autoIncrement', primaryKey: true },
                { name: 'a_id', type: 'number', references: { table: 'table_a' } }
              ]
            }
          ]
        };

        const sql = sqlSchema.generateSchema(schema);

        expect(warnMock).toHaveBeenCalled();
        expect(sql).toContain('CREATE TABLE table_a');
        expect(sql).toContain('CREATE TABLE table_b');
      } finally {
        resetLogger();
      }
    });

    test('generates batch inserts in schema mode', () => {
      const schema = {
        table: 'users',
        columns: [
          { name: 'id', type: 'autoIncrement' },
          { name: 'name', type: 'fullName' }
        ],
        records: Array.from({ length: 5 }, (_, i) => ({ id: i + 1, name: `User ${i + 1}` })),
        mode: 'insert',
        batch: true,
        dialect: 'postgres'
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      expect(sql.match(/INSERT INTO/g).length).toBe(1);
      expect(sql).toContain('VALUES');
    });

    test('generates non-postgres truncate without CASCADE', () => {
      const schema = {
        table: 'users',
        columns: [
          { name: 'id', type: 'autoIncrement' }
        ],
        records: [{ id: 1 }],
        mode: 'truncate+insert',
        dialect: 'mysql'
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      expect(sql).toContain('TRUNCATE TABLE users;');
      expect(sql).not.toContain('CASCADE');
    });

    test('generates multi-table truncate+insert with reverse order', () => {
      const schema = {
        dialect: 'postgres',
        mode: 'truncate+insert',
        tables: [
          {
            table: 'users',
            columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }],
            records: [{ id: 1 }]
          },
          {
            table: 'orders',
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'user_id', type: 'number', references: { table: 'users' } }
            ],
            records: [{ id: 1, user_id: 1 }]
          }
        ]
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      const truncateOrders = sql.indexOf('TRUNCATE TABLE orders');
      const truncateUsers = sql.indexOf('TRUNCATE TABLE users');
      expect(truncateOrders).toBeLessThan(truncateUsers);
      
      expect(sql).toContain('TRUNCATE TABLE orders CASCADE');
      expect(sql).toContain('TRUNCATE TABLE users CASCADE');
      expect(sql).toContain('INSERT INTO users');
      expect(sql).toContain('INSERT INTO orders');
    });

    test('generates multi-table schema with batch mode', () => {
      const schema = {
        dialect: 'postgres',
        mode: 'insert',
        batch: true,
        tables: [
          {
            table: 'users',
            columns: [{ name: 'id', type: 'autoIncrement' }],
            records: Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }))
          },
          {
            table: 'products',
            columns: [{ name: 'id', type: 'autoIncrement' }],
            records: Array.from({ length: 3 }, (_, i) => ({ id: i + 1 }))
          }
        ]
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      const userInserts = sql.match(/INSERT INTO users/g);
      const productInserts = sql.match(/INSERT INTO products/g);
      expect(userInserts).toHaveLength(1);
      expect(productInserts).toHaveLength(1);
    });

    test('generates multi-table schema with upsert mode', () => {
      const schema = {
        dialect: 'postgres',
        mode: 'upsert',
        tables: [
          {
            table: 'users',
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'name', type: 'fullName' }
            ],
            records: [{ id: 1, name: 'John Doe' }]
          },
          {
            table: 'products',
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'name', type: 'productName' }
            ],
            records: [{ id: 1, name: 'Widget' }]
          }
        ]
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      expect(sql).toContain('INSERT INTO users');
      expect(sql).toContain('INSERT INTO products');
      expect(sql).toContain('ON CONFLICT');
    });
    
    test('throws error when no table or tables provided', () => {
      expect(() => {
        sqlSchema.generateSchema({ dialect: 'postgres' });
      }).toThrow('Schema must have either "table" and "columns" or "tables" array');
    });

    test('generates multi-table DDL-only mode without records', () => {
      const schema = {
        dialect: 'postgres',
        mode: 'ddl',
        tables: [
          {
            table: 'users',
            columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }]
          },
          {
            table: 'products',
            columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }]
          }
        ]
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      expect(sql).toContain('CREATE TABLE users');
      expect(sql).toContain('CREATE TABLE products');
      expect(sql).not.toContain('INSERT INTO');
      expect(sql).not.toContain('-- Table:');
    });

    test('generates single-table truncate+insert with non-postgres dialect', () => {
      const schema = {
        table: 'users',
        columns: [{ name: 'id', type: 'autoIncrement' }],
        records: [{ id: 1 }, { id: 2 }],
        mode: 'truncate+insert',
        dialect: 'mysql'
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      expect(sql).toContain('TRUNCATE TABLE users;');
      expect(sql).not.toContain('CASCADE');
      expect(sql).toContain('INSERT INTO users');
    });

    test('generates multi-table insert mode with tables without records', () => {
      const schema = {
        dialect: 'postgres',
        mode: 'insert',
        tables: [
          {
            table: 'users',
            columns: [{ name: 'id', type: 'autoIncrement' }],
            records: [{ id: 1 }]
          },
          {
            table: 'empty_table',
            columns: [{ name: 'id', type: 'autoIncrement' }],
            records: []
          }
        ]
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      expect(sql).toContain('INSERT INTO users');
      expect(sql).not.toContain('INSERT INTO empty_table');
      expect(sql).not.toContain('-- Table: empty_table');
    });

    test('generates schema for insert only mode single table', () => {
      const schema = {
        table: 'users',
        columns: [
          { name: 'id', type: 'autoIncrement', primaryKey: true },
          { name: 'name', type: 'fullName' }
        ],
        records: [{ id: 1, name: 'John' }],
        mode: 'insert',
        dialect: 'postgres'
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      expect(sql).not.toContain('CREATE TABLE');
      expect(sql).toContain('INSERT INTO users');
    });

    test('generates schema for ddl only mode single table', () => {
      const schema = {
        table: 'users',
        columns: [
          { name: 'id', type: 'autoIncrement', primaryKey: true },
          { name: 'name', type: 'fullName' }
        ],
        records: [{ id: 1, name: 'John' }],
        mode: 'ddl',
        dialect: 'postgres'
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      expect(sql).toContain('CREATE TABLE');
      expect(sql).not.toContain('INSERT INTO');
    });

    test('generateSchema with DDL and batch inserts', () => {
      const schema = {
        table: 'users',
        columns: [
          { name: 'id', type: 'autoIncrement', primaryKey: true },
          { name: 'name', type: 'fullName' }
        ],
        records: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }],
        batch: true,
        mode: 'ddl+insert',
        dialect: 'mysql'
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      expect(sql).toContain('CREATE TABLE');
      expect(sql).toContain('INSERT INTO users');
      expect(sql).toContain('VALUES');
    });

    test('handles multi-table truncate mode for non-postgres', () => {
      const schema = {
        tables: [
          {
            table: 'users',
            columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }],
            records: [{ id: 1 }]
          },
          {
            table: 'posts',
            columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }],
            records: [{ id: 1 }]
          }
        ],
        mode: 'truncate+insert',
        dialect: 'mysql'
      };
      
      const result = sqlSchema.generateSchema(schema);
      
      expect(result).toContain('TRUNCATE TABLE');
      expect(result).not.toContain('CASCADE');
    });

    test('generateSchema handles single table with all INSERT modes', () => {
      const baseSchema = {
        table: 'users',
        columns: [
          { name: 'id', type: 'autoIncrement', primaryKey: true },
          { name: 'name', type: 'text' }
        ],
        records: [{ id: 1, name: 'John' }],
        dialect: 'postgres'
      };
      
      const insertOnly = sqlSchema.generateSchema({ ...baseSchema, mode: 'insert' });
      expect(insertOnly).not.toContain('CREATE TABLE');
      expect(insertOnly).toContain('INSERT INTO');
      
      const ddlOnly = sqlSchema.generateSchema({ ...baseSchema, mode: 'ddl' });
      expect(ddlOnly).toContain('CREATE TABLE');
      expect(ddlOnly).not.toContain('INSERT INTO');
    });

    test('getSQLType with unknown type falls back to string', () => {
      const col = { name: 'custom', type: 'unknownCustomType' };
      const result = sqlSchema.getSQLType(col, 'postgres');
      
      expect(result).toBe('VARCHAR(255)');
    });



    test('handles table with only primary key', () => {
      const schema = {
        table: 'simple',
        columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }],
        mode: 'ddl',
        dialect: 'postgres'
      };
      
      const sql = sqlSchema.generateSchema(schema);
      
      expect(sql).toContain('CREATE TABLE simple');
      expect(sql).toContain('id SERIAL PRIMARY KEY');
    });

    test('allows generating single-table schema without dialect and mode (uses defaults)', () => {
      // Covers || 'generic' and || 'ddl+insert' in generateSingleTable (lines 496-497)
      const schema = {
        table: 'defaults_test',
        columns: [{ name: 'id', type: 'number' }],
        records: [{ id: 1 }]
        // No dialect (defaults to 'generic') and no mode (defaults to 'ddl+insert')
      };
      const sql = sqlSchema.generateSchema(schema);
      expect(sql).toContain('CREATE TABLE defaults_test');
      expect(sql).toContain('INSERT INTO defaults_test');
    });

    test('allows generating multi-table schema without dialect (uses generic default)', () => {
      // Covers || 'generic' in generateSchema (line 419)
      const schema = {
        // No dialect - should default to 'generic'
        mode: 'ddl',
        tables: [
          {
            table: 'no_dialect_test',
            columns: [{ name: 'id', type: 'number', primaryKey: true }]
          }
        ]
      };
      const sql = sqlSchema.generateSchema(schema);
      expect(sql).toContain('CREATE TABLE no_dialect_test');
      expect(sql).toContain('INTEGER'); // generic dialect
    });
  });

  describe('getColumnConstraint', () => {
    test('(a) PostgreSQL enum column DDL includes CHECK constraint', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'status', type: 'enum:active|inactive|pending' }
      ];
      const ddl = sqlSchema.generateDDL('items', columns, { dialect: 'postgres' });
      expect(ddl).toContain("CHECK (status IN ('active', 'inactive', 'pending'))");
    });

    test('(b) MySQL enum column still uses ENUM(...) syntax — no regression', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'status', type: 'enum:active|inactive|pending' }
      ];
      const ddl = sqlSchema.generateDDL('items', columns, { dialect: 'mysql' });
      expect(ddl).toContain("ENUM('active', 'inactive', 'pending')");
      expect(ddl).not.toContain('CHECK');
    });

    test('(c) Generic/SQLite enum column uses VARCHAR(50) with no CHECK constraint', () => {
      const colGeneric = { name: 'status', type: 'enum:a|b' };
      const colSqlite  = { name: 'status', type: 'enum:a|b' };

      expect(sqlSchema.getColumnConstraint(colGeneric, 'generic')).toBeNull();
      expect(sqlSchema.getColumnConstraint(colSqlite,  'sqlite')).toBeNull();

      const ddlGeneric = sqlSchema.generateDDL('t', [colGeneric], { dialect: 'generic' });
      expect(ddlGeneric).toContain('VARCHAR(50)');
      expect(ddlGeneric).not.toContain('CHECK');

      const ddlSqlite = sqlSchema.generateDDL('t', [colSqlite], { dialect: 'sqlite' });
      expect(ddlSqlite).toContain('VARCHAR(50)');
      expect(ddlSqlite).not.toContain('CHECK');
    });

    test('returns null for non-enum columns in any dialect', () => {
      const col = { name: 'name', type: 'fullName' };
      expect(sqlSchema.getColumnConstraint(col, 'postgres')).toBeNull();
      expect(sqlSchema.getColumnConstraint(col, 'mysql')).toBeNull();
    });

    test('returns null when column.type is missing (falsy type branch)', () => {
      // Covers the `column.type &&` short-circuit branch when type is absent
      expect(sqlSchema.getColumnConstraint({ name: 'status' }, 'postgres')).toBeNull();
      expect(sqlSchema.getColumnConstraint({ name: 'status', type: undefined }, 'postgres')).toBeNull();
    });

    test('uses generic default dialect when no dialect argument is supplied', () => {
      // Covers the default parameter `dialect = "generic"` branch
      const col = { name: 'status', type: 'enum:active|inactive' };
      expect(sqlSchema.getColumnConstraint(col)).toBeNull();
    });
  });

  describe('FK ordering default in generateSchema', () => {
    test('(a) child table appears after parent by default — no insertOrder needed', () => {
      const schema = {
        dialect: 'generic',
        mode: 'ddl',
        // No insertOrder specified — FK ordering should apply by default
        tables: [
          {
            table: 'orders',
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'user_id', type: 'number', references: { table: 'users' } }
            ]
          },
          {
            table: 'users',
            columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }]
          }
        ]
      };

      const sql = sqlSchema.generateSchema(schema);
      const usersIndex = sql.indexOf('CREATE TABLE users');
      const ordersIndex = sql.indexOf('CREATE TABLE orders');
      expect(usersIndex).toBeLessThan(ordersIndex);
    });

    test('(b) insertOrder: manual bypasses sorting and preserves declaration order', () => {
      const schema = {
        dialect: 'generic',
        mode: 'ddl',
        insertOrder: 'manual',
        tables: [
          {
            table: 'orders',
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'user_id', type: 'number', references: { table: 'users' } }
            ]
          },
          {
            table: 'users',
            columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }]
          }
        ]
      };

      const sql = sqlSchema.generateSchema(schema);
      const ordersIndex = sql.indexOf('CREATE TABLE orders');
      const usersIndex = sql.indexOf('CREATE TABLE users');
      // Declaration order preserved: orders first, then users
      expect(ordersIndex).toBeLessThan(usersIndex);
    });

    test('(c) circular FK dependency falls back to original order without throwing', () => {
      const warnMock = vi.fn();
      setLogger({ log() {}, info() {}, warn: warnMock, error() {} });

      try {
        const schema = {
          dialect: 'generic',
          mode: 'ddl',
          // No insertOrder — default topological sort runs and should catch circular deps
          tables: [
            {
              table: 'alpha',
              columns: [
                { name: 'id', type: 'autoIncrement', primaryKey: true },
                { name: 'beta_id', type: 'number', references: { table: 'beta' } }
              ]
            },
            {
              table: 'beta',
              columns: [
                { name: 'id', type: 'autoIncrement', primaryKey: true },
                { name: 'alpha_id', type: 'number', references: { table: 'alpha' } }
              ]
            }
          ]
        };

        // Must not throw
        const sql = sqlSchema.generateSchema(schema);
        expect(sql).toContain('CREATE TABLE alpha');
        expect(sql).toContain('CREATE TABLE beta');
        expect(warnMock).toHaveBeenCalled();
      } finally {
        resetLogger();
      }
    });
  });
});

// ---------------------------------------------------------------------------
// C1 — date alias in sqlTypeMap
// ---------------------------------------------------------------------------

describe('getSQLType — date alias (C1)', () => {
  test('date type returns DATE for postgres', () => {
    expect(sqlSchema.getSQLType({ type: 'date' }, 'postgres')).toBe('DATE');
  });

  test('date type returns DATE for mysql', () => {
    expect(sqlSchema.getSQLType({ type: 'date' }, 'mysql')).toBe('DATE');
  });

  test('date type returns TEXT for sqlite', () => {
    expect(sqlSchema.getSQLType({ type: 'date' }, 'sqlite')).toBe('TEXT');
  });

  test('date type returns DATE for generic', () => {
    expect(sqlSchema.getSQLType({ type: 'date' }, 'generic')).toBe('DATE');
  });

  test('generateDDL emits DATE for a date column in postgres', () => {
    const ddl = sqlSchema.generateDDL('events', [{ name: 'event_date', type: 'date' }], { dialect: 'postgres' });
    expect(ddl).toContain('event_date DATE');
  });

  test('generateDDL emits TEXT for a date column in sqlite', () => {
    const ddl = sqlSchema.generateDDL('events', [{ name: 'event_date', type: 'date' }], { dialect: 'sqlite' });
    expect(ddl).toContain('event_date TEXT');
  });
});

// ---------------------------------------------------------------------------
// H1 — prefix and suffix in sqlTypeMap
// ---------------------------------------------------------------------------

describe('getSQLType — prefix and suffix (H1)', () => {
  test('prefix type returns VARCHAR(20) for postgres', () => {
    expect(sqlSchema.getSQLType({ type: 'prefix' }, 'postgres')).toBe('VARCHAR(20)');
  });

  test('prefix type returns TEXT for sqlite', () => {
    expect(sqlSchema.getSQLType({ type: 'prefix' }, 'sqlite')).toBe('TEXT');
  });

  test('suffix type returns VARCHAR(20) for postgres', () => {
    expect(sqlSchema.getSQLType({ type: 'suffix' }, 'postgres')).toBe('VARCHAR(20)');
  });

  test('suffix type returns TEXT for sqlite', () => {
    expect(sqlSchema.getSQLType({ type: 'suffix' }, 'sqlite')).toBe('TEXT');
  });
});

// ---------------------------------------------------------------------------
// C2 — SQLite autoIncrement DDL no longer overwrites def
// ---------------------------------------------------------------------------

describe('generateDDL — SQLite autoIncrement does not overwrite constraints (C2)', () => {
  test('autoIncrement PK with notNull preserves NOT NULL in SQLite', () => {
    const ddl = sqlSchema.generateDDL(
      'items',
      [{ name: 'id', type: 'autoIncrement', primaryKey: true, notNull: true }],
      { dialect: 'sqlite' }
    );
    expect(ddl).toContain('INTEGER PRIMARY KEY AUTOINCREMENT');
    expect(ddl).toContain('NOT NULL');
  });

  test('autoIncrement PK with default preserves DEFAULT value in SQLite', () => {
    const ddl = sqlSchema.generateDDL(
      'items',
      [{ name: 'id', type: 'autoIncrement', primaryKey: true, default: 0 }],
      { dialect: 'sqlite' }
    );
    expect(ddl).toContain('INTEGER PRIMARY KEY AUTOINCREMENT');
    expect(ddl).toContain('DEFAULT 0');
  });
});

// ---------------------------------------------------------------------------
// H2 — generic dialect UPSERT adds warning comment
// ---------------------------------------------------------------------------

describe('generateUpserts — generic dialect fallback (H2)', () => {
  const records = [{ id: 1, name: 'Alice' }];
  const columns = [{ name: 'id', primaryKey: true }, { name: 'name' }];

  test('generic dialect emits warning comment', () => {
    const sql = sqlSchema.generateUpserts('users', records, columns, { dialect: 'generic' });
    expect(sql).toContain('-- Note: UPSERT is not supported for the "generic" dialect; INSERT used instead.');
  });

  test('generic dialect still emits a valid INSERT statement', () => {
    const sql = sqlSchema.generateUpserts('users', records, columns, { dialect: 'generic' });
    expect(sql).toContain('INSERT INTO users');
    expect(sql).toContain("'Alice'");
  });

  test('generic dialect warning only appears once for multiple rows', () => {
    const multiRecords = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    const sql = sqlSchema.generateUpserts('users', multiRecords, columns, { dialect: 'generic' });
    const commentCount = (sql.match(/Note: UPSERT is not supported/g) || []).length;
    expect(commentCount).toBe(1);
  });
});

