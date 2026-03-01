/**
 * MySQL / MariaDB seeder adapter.
 *
 * Requires `mysql2` as a peer (optional) dependency.
 * Loaded lazily — only imported when this function is called.
 *
 * @module seeders/mysql
 */

import { getLogger } from '../logger.js';

/**
 * @param {Object} opts
 * @param {string} opts.connectionString - MySQL connection URL
 * @param {Array<{tableName:string, records:Object[], columns:Object[]}>} opts.tables
 * @param {boolean} [opts.truncate=false] - Clear tables before seeding
 * @returns {Promise<{tablesSeeded:number, rowsInserted:number, elapsed:number}>}
 */
export async function seedMySQL({ connectionString, tables, truncate = false }) {
  let mysql2;
  try {
    mysql2 = await import('mysql2/promise');
  } catch {
    throw new Error('"mysql2" is required for MySQL seeding. Install it: npm install mysql2');
  }

  /* v8 ignore start -- requires live MySQL connection */
  const mysql = mysql2.default || mysql2;
  const connection = await mysql.createConnection(connectionString);
  const logger = getLogger();
  const start = Date.now();
  let rowsInserted = 0;

  try {
    await connection.beginTransaction();

    for (const { tableName, records, columns } of tables) {
      if (truncate) {
        await connection.execute(`TRUNCATE TABLE \`${tableName}\``);
        logger.log(`Truncated ${tableName}`);
      }

      if (!records || records.length === 0) continue;

      const colNames = (columns || Object.keys(records[0]).map(n => ({ name: n }))).map(c => c.name);
      const placeholders = colNames.map(() => '?').join(', ');
      const sql = `INSERT INTO \`${tableName}\` (${colNames.map(n => `\`${n}\``).join(', ')}) VALUES (${placeholders})`;

      for (const record of records) {
        const values = colNames.map(n => record[n] ?? null);
        await connection.execute(sql, values);
        rowsInserted++;
      }
      logger.log(`Seeded ${records.length} rows into ${tableName}`);
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.end();
  }

  return { tablesSeeded: tables.length, rowsInserted, elapsed: Date.now() - start };
  /* v8 ignore stop */
}
