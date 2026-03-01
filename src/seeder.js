/**
 * Database seeder dispatcher.
 *
 * Routes to the correct adapter based on `dialect` or by detecting the
 * dialect from the connection string / file path.
 *
 * All adapters use optional peer dependencies loaded lazily.
 *
 * @module seeder
 */

import { getLogger } from './logger.js';

/**
 * Detect the SQL dialect from a connection string or file path.
 * @param {string} connectionString
 * @returns {'postgres'|'mysql'|'sqlite'|null}
 */
function detectDialect(connectionString) {
  if (!connectionString) return null;
  const s = connectionString.toLowerCase();
  if (s.startsWith('postgres://') || s.startsWith('postgresql://')) return 'postgres';
  if (s.startsWith('mysql://') || s.startsWith('mariadb://')) return 'mysql';
  if (s.endsWith('.sqlite') || s.endsWith('.sqlite3') || s.endsWith('.db')) return 'sqlite';
  return null;
}

/**
 * Seed a database with generated test data.
 *
 * @param {Object} opts
 * @param {string} opts.connectionString - DB connection URL or SQLite file path
 * @param {string} [opts.dialect] - Explicit dialect ('postgres'|'mysql'|'sqlite').
 *   Auto-detected from connectionString when not provided.
 * @param {Array<{tableName:string, records:Object[], columns:Object[]}>} opts.tables
 *   Pre-generated table data to insert.
 * @param {boolean} [opts.truncate=false] - Truncate/clear tables before seeding.
 * @returns {Promise<{tablesSeeded:number, rowsInserted:number, elapsed:number}>}
 */
export async function seedDatabase({ connectionString, dialect, tables, truncate = false }) {
  const logger = getLogger();
  const resolvedDialect = dialect || detectDialect(connectionString);

  if (!resolvedDialect) {
    throw new Error(
      `Cannot detect database dialect from connection string "${connectionString}". ` +
      'Pass an explicit --dialect (postgres|mysql|sqlite).'
    );
  }

  logger.log(`Connecting to ${resolvedDialect} database…`);

  switch (resolvedDialect) {
    case 'postgres': {
      const { seedPostgres } = await import('./seeders/postgres.js');
      return seedPostgres({ connectionString, tables, truncate });
    }
    case 'mysql': {
      const { seedMySQL } = await import('./seeders/mysql.js');
      return seedMySQL({ connectionString, tables, truncate });
    }
    case 'sqlite': {
      const { seedSQLite } = await import('./seeders/sqlite.js');
      return seedSQLite({ filePath: connectionString, tables, truncate });
    }
    default:
      throw new Error(`Unsupported dialect: "${resolvedDialect}". Supported: postgres, mysql, sqlite.`);
  }
}

export { detectDialect };
