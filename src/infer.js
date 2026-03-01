/**
 * Schema Inference — Pure function to infer Ficta column types from data samples.
 *
 * Universal — no Node.js built-ins. Works in both browser and Node.js.
 * @module infer
 */

import { lookupNameHint } from './name-hints.js';

// ---------------------------------------------------------------------------
// Regex patterns for value matching
// ---------------------------------------------------------------------------
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const URL_REGEX = /^https?:\/\//i;

/**
 * Infer the Ficta type for a column from its name and sample values.
 *
 * Cascade:
 * 1. Name-hint lookup
 * 2. UUID regex
 * 3. ISO date string
 * 4. Email regex
 * 5. URL regex
 * 6. Small closed set (≤ 8 distinct values) → enum
 * 7. All numeric, integers only → 'number'
 * 8. All numeric, has decimals → 'price'
 * 9. Fallback → 'word'
 *
 * @param {string} name - Column name
 * @param {unknown[]} values - Raw values from sample rows
 * @returns {string} Ficta type string
 */
function inferColumnType(name, values) {
  // 1. Name-hint lookup (highest priority)
  const hint = lookupNameHint(name);
  if (hint) return hint;

  // Filter out null / undefined / empty for pattern analysis
  const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonEmpty.length === 0) return 'word';

  const strings = nonEmpty.map(v => String(v));

  // 2. UUID
  if (strings.every(v => UUID_REGEX.test(v))) return 'uuid';

  // 3. ISO date
  if (strings.every(v => ISO_DATE_REGEX.test(v))) return 'date';

  // 4. Email
  if (strings.every(v => EMAIL_REGEX.test(v))) return 'email';

  // 5. URL
  if (strings.every(v => URL_REGEX.test(v))) return 'url';

  // 6. Small closed set → enum (≤ 8 distinct values)
  const unique = new Set(strings);
  if (unique.size <= 8) return `enum:${[...unique].join('|')}`;

  // 7 & 8. Numeric?
  const allNumeric = nonEmpty.every(v => !isNaN(Number(v)) && String(v).trim() !== '');
  if (allNumeric) {
    const hasDecimals = nonEmpty.some(v => {
      const n = Number(v);
      return n !== Math.floor(n);
    });
    return hasDecimals ? 'price' : 'number';
  }

  // 9. Fallback
  return 'word';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Infer Ficta column definitions from a sample of rows.
 *
 * Reads at most 200 rows. For each column, applies a cascade of heuristics:
 * name hints, UUID, ISO date, email, URL, enum (≤ 8 distinct values),
 * numeric integer, numeric decimal, then falls back to 'word'.
 *
 * @param {Array<Record<string, unknown>>} rows - Sample rows (plain objects)
 * @returns {{ columns: string, columnList: Array<{name: string, type: string}> }}
 */
export function inferSchema(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { columns: '', columnList: [] };
  }

  // Use at most 200 rows
  const sample = rows.slice(0, 200);

  // Collect column names from the first row
  const columnNames = Object.keys(sample[0]);

  const columnList = columnNames.map(name => {
    const values = sample.map(row => row[name]);
    const type = inferColumnType(name, values);
    return { name, type };
  });

  const columns = columnList.map(c => `${c.name}:${c.type}`).join(',');

  return { columns, columnList };
}
