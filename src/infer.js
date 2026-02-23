/**
 * Schema Inference — Pure function to infer Ficta column types from data samples.
 *
 * Universal — no Node.js built-ins. Works in both browser and Node.js.
 * @module infer
 */

// ---------------------------------------------------------------------------
// Regex patterns for value matching
// ---------------------------------------------------------------------------
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const URL_REGEX = /^https?:\/\//i;

// ---------------------------------------------------------------------------
// Column name → Ficta type hints (same priority order as ddl-parser.js)
// ---------------------------------------------------------------------------
const NAME_HINTS = [
  [/^(id|_id|pk)$/i, 'autoIncrement'],
  [/uuid|guid/i, 'uuid'],
  [/\bfirst_?name\b/i, 'firstName'],
  [/\blast_?name\b/i, 'lastName'],
  [/\bfull_?name\b|\bname\b/i, 'fullName'],
  [/\bjob_?title\b/i, 'jobTitle'],
  [/\bemail\b/i, 'email'],
  [/\busername\b|\buser_?name\b/i, 'username'],
  [/\bpassword\b|\bpwd\b/i, 'password'],
  [/\burl\b|\bwebsite\b|\bhomepage\b/i, 'url'],
  [/\bip(v4)?\b|\bip_?address\b/i, 'ipv4'],
  [/\bphone\b|\bmobile\b|\btelephone\b/i, 'phone'],
  [/\bstreet\b|\baddress\b/i, 'street'],
  [/\bcity\b|\btown\b/i, 'city'],
  [/\bstate\b|\bprovince\b|\bregion\b/i, 'state'],
  [/\bcountry\b/i, 'country'],
  [/\bzip\b|\bpostal_?code\b|\bpost_?code\b|\bpostal\b/i, 'zipCode'],
  [/\blat(itude)?\b/i, 'latitude'],
  [/\blo[ng]+itude?\b|\blng\b|\blon\b/i, 'longitude'],
  [/\bcompany\b|\borganiz\b|\bfirm\b/i, 'company'],
  [/\bdep(art)?ment\b/i, 'department'],
  [/\bprice\b|\bcost\b/i, 'price'],
  [/\bamount\b|\btotal\b|\bbalance\b/i, 'amount'],
  [/created_?at|updated_?at|timestamp\b/i, 'timestamp'],
  [/\bdate\b/i, 'pastDate'],
  [/\bdesc(ription)?\b|\bnotes?\b|\bcontent\b/i, 'sentence'],
  [/\bactive\b|\benabled\b|\bis_\w+/i, 'boolean'],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Look up a column name in the name-hints table.
 * @param {string} name
 * @returns {string|null} Ficta type, or null if no hint matches
 */
function lookupNameHint(name) {
  for (const [pattern, type] of NAME_HINTS) {
    if (pattern.test(name)) {
      return type;
    }
  }
  return null;
}

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
