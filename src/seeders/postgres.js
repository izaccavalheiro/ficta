/**
 * PostgreSQL seeder adapter.
 *
 * Requires `pg` as a peer (optional) dependency.
 * Loaded lazily — only imported when this function is called.
 *
 * @module seeders/postgres
 */

import { getLogger } from '../logger.js';

/**
 * @param {Object} opts
 * @param {string} opts.connectionString - PostgreSQL connection URL
 * @param {Array<{tableName:string, records:Object[], columns:Object[]}>} opts.tables
 * @param {boolean} [opts.truncate=false] - Clear tables before seeding
 * @param {string} [opts.dialect='postgres']
 * @returns {Promise<{tablesSeeded:number, rowsInserted:number, elapsed:number}>}
 */
export async function seedPostgres({ connectionString, tables, truncate = false }) {
  let pg;
  try {
    pg = await import('pg');
  } catch {
    throw new Error('"pg" is required for PostgreSQL seeding. Install it: npm install pg');
  }

  /* v8 ignore start -- requires live PostgreSQL connection */
  const { Pool } = pg.default || pg;
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  const logger = getLogger();
  const start = Date.now();
  let rowsInserted = 0;

  try {
    await client.query('BEGIN');

    for (const { tableName, records, columns } of tables) {
      if (truncate) {
        await client.query(`TRUNCATE TABLE "${tableName}" CASCADE`);
        logger.log(`Truncated ${tableName}`);
      }

      if (!records || records.length === 0) continue;

      const colNames = (columns || Object.keys(records[0]).map(n => ({ name: n }))).map(c => c.name);
      const placeholders = colNames.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `INSERT INTO "${tableName}" (${colNames.map(n => `"${n}"`).join(', ')}) VALUES (${placeholders})`;

      for (const record of records) {
        const values = colNames.map(n => record[n] ?? null);
        await client.query(sql, values);
        rowsInserted++;
      }
      logger.log(`Seeded ${records.length} rows into ${tableName}`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }

  return { tablesSeeded: tables.length, rowsInserted, elapsed: Date.now() - start };
  /* v8 ignore stop */
}
