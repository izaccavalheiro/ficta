import { vi } from 'vitest';
import { seedDatabase, detectDialect } from '../src/seeder.js';
import { resetLogger, setLogger } from '../src/logger.js';

beforeEach(() => resetLogger());

// ---------------------------------------------------------------------------
// detectDialect
// ---------------------------------------------------------------------------

describe('detectDialect', () => {
  test('detects postgres:// scheme', () => {
    expect(detectDialect('postgres://user:pass@localhost/mydb')).toBe('postgres');
  });

  test('detects postgresql:// scheme', () => {
    expect(detectDialect('postgresql://user:pass@localhost/mydb')).toBe('postgres');
  });

  test('detects mysql:// scheme', () => {
    expect(detectDialect('mysql://user:pass@localhost/mydb')).toBe('mysql');
  });

  test('detects mariadb:// scheme', () => {
    expect(detectDialect('mariadb://user:pass@localhost/mydb')).toBe('mysql');
  });

  test('detects .sqlite extension', () => {
    expect(detectDialect('/tmp/dev.sqlite')).toBe('sqlite');
  });

  test('detects .sqlite3 extension', () => {
    expect(detectDialect('/tmp/dev.sqlite3')).toBe('sqlite');
  });

  test('detects .db extension', () => {
    expect(detectDialect('/tmp/dev.db')).toBe('sqlite');
  });

  test('returns null for an unrecognised string', () => {
    expect(detectDialect('unknown://something')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(detectDialect('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// seedDatabase — routing and error messages
// ---------------------------------------------------------------------------

describe('seedDatabase routing', () => {
  test('throws descriptive error when dialect cannot be detected', async () => {
    await expect(
      seedDatabase({ connectionString: 'unknown://something', tables: [] })
    ).rejects.toThrow(/cannot detect database dialect/i);
  });

  test('throws when explicit dialect is unsupported', async () => {
    await expect(
      seedDatabase({ connectionString: 'something', dialect: 'oracle', tables: [] })
    ).rejects.toThrow(/unsupported dialect/i);
  });

  test('routes postgres connections to seedPostgres', async () => {
    // Mock the dynamic import by having pg throw (simulates pg not installed
    // but also confirms correct routing because the error message is pg-specific)
    await expect(
      seedDatabase({
        connectionString: 'postgres://localhost/test',
        tables: [{ tableName: 'users', records: [{ id: 1 }], columns: [{ name: 'id' }] }],
      })
    ).rejects.toThrow(/"pg" is required/);
  });

  test('routes mysql connections to seedMySQL', async () => {
    await expect(
      seedDatabase({
        connectionString: 'mysql://localhost/test',
        tables: [{ tableName: 'users', records: [{ id: 1 }], columns: [{ name: 'id' }] }],
      })
    ).rejects.toThrow(/"mysql2" is required/);
  });

  test('routes sqlite file paths to seedSQLite', async () => {
    await expect(
      seedDatabase({
        connectionString: '/tmp/nonexistent.sqlite',
        tables: [{ tableName: 'users', records: [{ id: 1 }], columns: [{ name: 'id' }] }],
      })
    ).rejects.toThrow(/"better-sqlite3" is required/);
  });

  test('explicit dialect overrides auto-detection', async () => {
    await expect(
      seedDatabase({
        connectionString: 'mysql://localhost/test',
        dialect: 'postgres',
        tables: [{ tableName: 'users', records: [{ id: 1 }], columns: [{ name: 'id' }] }],
      })
    ).rejects.toThrow(/"pg" is required/);
  });

  test('logs connecting message to logger', async () => {
    const logs = [];
    setLogger({ log: m => logs.push(m), warn() {}, info() {}, error() {} });
    await seedDatabase({ connectionString: 'postgres://localhost/test', tables: [] })
      .catch(() => {}); // driver not installed — swallow
    expect(logs.some(m => /postgres/i.test(m))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Adapter error messages when driver is missing
// ---------------------------------------------------------------------------

describe('adapter error messages', () => {
  test('postgres adapter error mentions npm install pg', async () => {
    const { seedPostgres } = await import('../src/seeders/postgres.js');
    // pg is not installed as a dev dependency, so the dynamic import fails
    await expect(
      seedPostgres({ connectionString: 'postgres://localhost/test', tables: [] })
    ).rejects.toThrow(/npm install pg/);
  });

  test('mysql adapter error mentions npm install mysql2', async () => {
    const { seedMySQL } = await import('../src/seeders/mysql.js');
    await expect(
      seedMySQL({ connectionString: 'mysql://localhost/test', tables: [] })
    ).rejects.toThrow(/npm install mysql2/);
  });

  test('sqlite adapter error mentions npm install better-sqlite3', async () => {
    const { seedSQLite } = await import('../src/seeders/sqlite.js');
    await expect(
      seedSQLite({ filePath: '/tmp/test.sqlite', tables: [] })
    ).rejects.toThrow(/npm install better-sqlite3/);
  });
});
