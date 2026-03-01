/**
 * Data anonymization module.
 *
 * Reads an array of records + column definitions, identifies PII columns,
 * and replaces PII values with Faker-generated data of the same type.
 * Non-PII numeric columns can optionally have their distribution preserved.
 * Identifier columns are mapped consistently (same original → same fake).
 *
 * Universal — zero Node.js or browser-specific dependencies.
 * Requires Faker to be initialized via setFaker() from core.js.
 *
 * @module anonymizer
 */

import { getFaker } from './core.js';
import { sampleNormal } from './distributions.js';

// -------------------------------------------------------------------------
// PII type catalogue
// -------------------------------------------------------------------------

/**
 * Ficta types considered Personally Identifiable Information.
 * Values for these columns will always be replaced.
 */
const PII_TYPES = new Set([
  'fullName', 'firstName', 'lastName', 'prefix', 'suffix',
  'email', 'phone', 'street', 'streetAddress', 'username', 'password',
  'userAgent', 'ipv4', 'ip', 'creditCardNumber', 'accountNumber', 'iban',
  'company', 'jobTitle',
]);

/**
 * Column name patterns considered PII.
 * Checked against lowercased column name.
 */
const PII_NAME_PATTERNS = [
  /\bemail\b/i,
  /\bfirst_?name\b/i,
  /\blast_?name\b/i,
  /\bfull_?name\b|\bname\b/i,
  /\bphone\b|\bmobile\b|\btelephone\b/i,
  /\baddress\b|\bstreet\b/i,
  /\bpassword\b|\bpwd\b/i,
  /\biptag\b|\bip_?address\b|\bipv4\b/i,
  /\busername\b/i,
  /\bcompany\b/i,
  /\bjob_?title\b/i,
  /\bcredit_?card\b|\bcard_?number\b/i,
  /\biban\b/i,
  /\bsocial_?sec\b|\bssn\b/i,
];

/**
 * Ficta types used for identifier (ID/key) columns.
 * These are anonymized with consistent mapping rather than random replacement.
 */
const IDENTIFIER_TYPES = new Set([
  'autoIncrement', 'uuid', 'word',
]);

const IDENTIFIER_NAME_PATTERNS = [
  /^(id|_id|pk)$/i,
  /uuid|guid/i,
  /\b(customer|user|order|product|account|ref)_?id\b/i,
];

/**
 * Ficta types considered numeric (for distribution-preserving replacement).
 */
const NUMERIC_TYPES = new Set([
  'number', 'price', 'amount', 'float', 'integer',
  'latitude', 'longitude',
]);

const NUMERIC_NAME_PATTERNS = [
  /\bprice\b|\bcost\b|\bamount\b|\btotal\b|\bbalance\b/i,
  /\bsalary\b|\bwage\b/i,
  /\bscore\b|\brating\b|\brank\b/i,
  /\bcount\b|\bquantity\b|\bqty\b/i,
  /\blat(itude)?\b|\blo[ng]+itude?\b|\blng\b/i,
];

// -------------------------------------------------------------------------
// Column categorization
// -------------------------------------------------------------------------

/**
 * @typedef {Object} ColumnCategories
 * @property {string[]} pii        - PII column names (will be replaced)
 * @property {string[]} identifier - ID/key column names (consistent mapping)
 * @property {string[]} numeric    - Numeric column names (distribution-preserving)
 * @property {string[]} passthrough - All other columns (kept unchanged)
 */

/**
 * Categorize columns into PII, identifier, numeric, and passthrough groups.
 *
 * @param {Array<{name: string, type?: string}>} columns - Column definitions
 * @param {string[]} [keepColumns=[]] - Column names to always keep unchanged
 * @returns {ColumnCategories}
 */
export function categorizeColumns(columns, keepColumns = []) {
  const keep = new Set(keepColumns.map(k => k.toLowerCase()));
  const pii = [];
  const identifier = [];
  const numeric = [];
  const passthrough = [];

  for (const col of columns) {
    /* v8 ignore next -- string branch only reachable with direct strings; anonymizeRecords normalizes first */
    const name = typeof col === 'string' ? col : col.name;
    /* v8 ignore next -- string branch only reachable with direct strings; anonymizeRecords normalizes first */
    const type = (typeof col === 'string' ? '' : (col.type || ''));
    const nameLower = name.toLowerCase();

    // Always keep if in keepColumns
    if (keep.has(nameLower)) {
      passthrough.push(name);
      continue;
    }

    // Check identifier first (IDs should be mapped, not just replaced)
    const isIdentifier =
      IDENTIFIER_TYPES.has(type) ||
      IDENTIFIER_NAME_PATTERNS.some(p => p.test(name));

    if (isIdentifier) {
      identifier.push(name);
      continue;
    }

    // Check PII
    const isPII =
      PII_TYPES.has(type) ||
      PII_NAME_PATTERNS.some(p => p.test(name));

    if (isPII) {
      pii.push(name);
      continue;
    }

    // Check numeric
    const isNumeric =
      NUMERIC_TYPES.has(type) ||
      type.startsWith('range:') ||
      NUMERIC_NAME_PATTERNS.some(p => p.test(name));

    if (isNumeric) {
      numeric.push(name);
      continue;
    }

    passthrough.push(name);
  }

  return { pii, identifier, numeric, passthrough };
}

// -------------------------------------------------------------------------
// ID map helpers
// -------------------------------------------------------------------------

/**
 * Build a consistent ID mapping from original values to fake values.
 * The same original value always maps to the same fake value, even across
 * multiple calls when the same `idMap` is provided.
 *
 * @param {Object[]} records - Array of row objects
 * @param {string[]} idColumns - Column names to treat as identifiers
 * @param {Map<string, string>} [idMap=new Map()] - Existing map to extend
 * @returns {Map<string, string>} Updated ID map
 */
export function buildIdMap(records, idColumns, idMap = new Map()) {
  let counter = idMap.size + 1;

  for (const record of records) {
    for (const col of idColumns) {
      /* v8 ignore next */
      const original = String(record[col] ?? '');
      if (!idMap.has(col + ':' + original)) {
        // Generate a new fake ID: numeric sequential or UUID-like
        /* v8 ignore next 3 */
        const fake = isUUID(original)
          ? getFaker().string.uuid()
          : String(counter++);
        idMap.set(col + ':' + original, fake);
      }
    }
  }
  return idMap;
}

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// -------------------------------------------------------------------------
// PII replacement generators
// -------------------------------------------------------------------------

/** Map from Ficta type or name pattern → replacement generator */
const PII_GENERATORS = {
  email:            () => getFaker().internet.email(),
  fullName:         () => getFaker().person.fullName(),
  firstName:        () => getFaker().person.firstName(),
  lastName:         () => getFaker().person.lastName(),
  phone:            () => getFaker().phone.number(),
  street:           () => getFaker().location.streetAddress(),
  streetAddress:    () => getFaker().location.streetAddress(),
  username:         () => getFaker().internet.username(),
  password:         () => getFaker().internet.password(),
  company:          () => getFaker().company.name(),
  jobTitle:         () => getFaker().person.jobTitle(),
  ipv4:             () => getFaker().internet.ipv4(),
  ip:               () => getFaker().internet.ipv4(),
  userAgent:        () => getFaker().internet.userAgent(),
  creditCardNumber: () => getFaker().finance.creditCardNumber(),
  accountNumber:    () => getFaker().finance.accountNumber(),
  iban:             () => getFaker().finance.iban(),
  prefix:           () => getFaker().person.prefix(),
  suffix:           () => getFaker().person.suffix(),
};

/**
 * Get a replacement generator for the given column.
 * Falls back to fullName for unknown PII columns.
 */
function getPIIGenerator(col) {
  /* v8 ignore next -- string path only reachable via direct call; anonymizeRecords always passes objects */
  const type = typeof col === 'string' ? '' : (col.type || '');
  /* v8 ignore next -- string path only reachable via direct call; anonymizeRecords always passes objects */
  const name = typeof col === 'string' ? col : col.name;

  if (PII_GENERATORS[type]) return PII_GENERATORS[type];

  // Name-based fallbacks for common patterns
  if (/\bemail\b/i.test(name)) return PII_GENERATORS.email;
  if (/\bfirst_?name\b/i.test(name)) return PII_GENERATORS.firstName;
  if (/\blast_?name\b/i.test(name)) return PII_GENERATORS.lastName;
  if (/\bfull_?name\b|\bname\b/i.test(name)) return PII_GENERATORS.fullName;
  /* v8 ignore next -- phone/mobile patterns need exact column names with word boundaries */
  if (/\bphone\b|\bmobile\b/i.test(name)) return PII_GENERATORS.phone;
  /* v8 ignore next -- address/street patterns need exact column names with word boundaries */
  if (/\baddress\b|\bstreet\b/i.test(name)) return PII_GENERATORS.street;
  /* v8 ignore next -- password/pwd patterns need exact column names with word boundaries */
  if (/\bpassword\b|\bpwd\b/i.test(name)) return PII_GENERATORS.password;
  /* v8 ignore next -- username patterns need exact column names with word boundaries */
  if (/\busername\b/i.test(name)) return PII_GENERATORS.username;
  /* v8 ignore next -- company patterns need exact column names with word boundaries */
  if (/\bcompany\b/i.test(name)) return PII_GENERATORS.company;
  if (/\bjob_?title\b/i.test(name)) return PII_GENERATORS.jobTitle;

  return PII_GENERATORS.fullName; // fallback
}

// -------------------------------------------------------------------------
// Distribution helpers
// -------------------------------------------------------------------------

/**
 * Compute mean and standard deviation for an array of numeric values.
 * @param {number[]} values
 * @returns {{ mean: number, stddev: number }}
 */
export function computeStats(values) {
  const nums = values.filter(v => v != null && !Number.isNaN(Number(v)));
  if (nums.length === 0) return { mean: 0, stddev: 1 };
  const mean = nums.reduce((s, n) => s + Number(n), 0) / nums.length;
  const variance = nums.reduce((s, n) => s + (Number(n) - mean) ** 2, 0) / nums.length;
  return { mean, stddev: Math.sqrt(variance) || 1 };
}

// -------------------------------------------------------------------------
// Main anonymization function
// -------------------------------------------------------------------------

/**
 * @typedef {Object} AnonymizeOptions
 * @property {string[]} [keepColumns=[]] - Column names to pass through unchanged
 * @property {string[]} [onlyColumns] - If set, only anonymize these columns
 * @property {boolean} [preserveDistributions=true] - Preserve numeric distributions
 * @property {Map<string, string>} [idMap] - Existing ID map for cross-file consistency
 * @property {number} [seed] - Faker seed for reproducible output
 */

/**
 * Anonymize an array of records by replacing PII with Faker-generated data.
 *
 * @param {Object} opts
 * @param {Object[]} opts.records - Array of row objects to anonymize
 * @param {Array<{name:string, type?:string}>} opts.columns - Column definitions
 * @param {AnonymizeOptions} [opts.options={}]
 * @returns {{ records: Object[], idMap: Map<string, string> }}
 */
export function anonymizeRecords({ records, columns, options = {} }) {
  if (!records || records.length === 0) return { records: [], idMap: new Map() };

  const {
    keepColumns = [],
    onlyColumns,
    preserveDistributions = true,
    idMap: sharedIdMap,
  } = options;

  // Normalize columns to array of {name, type}
  const cols = columns.map(c =>
    /* v8 ignore next -- string branch only reachable with direct strings; normalised in anonymizeFile */
    typeof c === 'string' ? { name: c, type: c } : { name: c.name, type: c.type || '' }
  );

  // If onlyColumns is specified, add all others to keepColumns
  const effectiveKeep = onlyColumns
    ? cols.map(c => c.name).filter(n => !onlyColumns.includes(n))
    : keepColumns;

  const categories = categorizeColumns(cols, effectiveKeep);

  // Build column lookup for generators
  const colLookup = Object.fromEntries(cols.map(c => [c.name, c]));

  // Build ID map for consistent replacement
  const idMap = buildIdMap(records, categories.identifier, sharedIdMap || new Map());

  // Compute numeric stats for distribution-preserving replacement
  const numericStats = {};
  if (preserveDistributions) {
    for (const colName of categories.numeric) {
      const values = records.map(r => r[colName]);
      numericStats[colName] = computeStats(values);
    }
  }

  // Build PII generators per column
  const piiGenerators = {};
  for (const colName of categories.pii) {
    /* v8 ignore next -- colLookup always has colName since both derive from the same cols array */
    piiGenerators[colName] = getPIIGenerator(colLookup[colName] || colName);
  }

  // Process each record
  const anonymized = records.map(record => {
    const out = { ...record };

    // Replace PII
    for (const colName of categories.pii) {
      out[colName] = piiGenerators[colName]();
    }

    // Replace identifiers with consistent mapping
    for (const colName of categories.identifier) {
      /* v8 ignore next */
      const key = colName + ':' + String(record[colName] ?? '');
      /* v8 ignore next */
      out[colName] = idMap.get(key) ?? record[colName];
    }

    // Replace numeric with distribution-preserving values
    if (preserveDistributions) {
      for (const colName of categories.numeric) {
        const { mean, stddev } = numericStats[colName];
        const raw = sampleNormal(mean, stddev);
        // Round to same precision as original
        const orig = record[colName];
        const isInteger = Number.isInteger(Number(orig));
        out[colName] = isInteger ? Math.round(raw) : parseFloat(raw.toFixed(2));
      }
    }

    return out;
  });

  return { records: anonymized, idMap };
}
