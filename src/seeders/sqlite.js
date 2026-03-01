/**
 * SQLite seeder adapter.
 *
 * Requires `better-sqlite3` as a peer (optional) dependency.
 * Loaded lazily — only imported when this function is called.
 *
 * Uses the synchronous `better-sqlite3` API, wrapped in async for a
 * consistent interface with the other adapters.
 *
 * @module seeders/sqlite
 */

import { getLogger } from '../logger.js';

/**
 * @param {Object} opts
 * @param {string} opts.filePath - Path to the SQLite database file
 * @param {Array<{tableName:string, records:Object[], columns:Object[]}>} opts.tables
 * @param {boolean} [opts.truncate=false] - Clear tables before seeding
 * @returns {Promise<{tablesSeeded:number, rowsInserted:number, elapsed:number}>}
 */
export async function seedSQLite({ filePath, tables, truncate = false }) {
  let BetterSqlite3;
  try {
    const mod = await import('better-sqlite3');
    /* v8 ignore next -- mod.default || mod fallback only reachable when import succeeds */
    BetterSqlite3 = mod.default || mod;
  } catch {
    throw new Error('"better-sqlite3" is required for SQLite seeding. Install it: npm install better-sqlite3');
  }

  /* v8 ignore start -- requires live SQLite file/connection */
  const db = new BetterSqlite3(filePath);
  const logger = getLogger();
  const start = Date.now();
  let rowsInserted = 0;

  try {
    const runAll = db.transaction((tables) => {
      for (const { tableName, records, columns } of tables) {
        if (truncate) {
          db.prepare(`DELETE FROM "${tableName}"`).run();
          logger.log(`Truncated ${tableName}`);
        }

        if (!records || records.length === 0) continue;

        const colNames = (columns || Object.keys(records[0]).map(n => ({ name: n }))).map(c => c.name);
        const placeholders = colNames.map(() => '?').join(', ');
        const sql = `INSERT INTO "${tableName}" (${colNames.map(n => `"${n}"`).join(', ')}) VALUES (${placeholders})`;
        const stmt = db.prepare(sql);

        for (const record of records) {
          const values = colNames.map(n => record[n] ?? null);
          stmt.run(values);
          rowsInserted++;
        }
        logger.log(`Seeded ${records.length} rows into ${tableName}`);
      }
    });

    runAll(tables);
  } finally {
    db.close();
  }

  return { tablesSeeded: tables.length, rowsInserted, elapsed: Date.now() - start };
  /* v8 ignore stop */
}
