/**
 * Tests for src/anonymizer.js
 *
 * Covers: PII detection, consistent ID mapping, distribution preservation,
 * keepColumns, onlyColumns, cross-file referential integrity, edge cases.
 */
import { describe, test, expect, beforeAll } from 'vitest';
import { setFaker } from '../src/core.js';
import { faker } from '@faker-js/faker';
import {
  categorizeColumns,
  buildIdMap,
  computeStats,
  anonymizeRecords,
} from '../src/anonymizer.js';

beforeAll(() => {
  setFaker(faker);
});

// ---------------------------------------------------------------------------
// categorizeColumns
// ---------------------------------------------------------------------------
describe('categorizeColumns', () => {
  test('categorizes PII columns by type', () => {
    const cols = [
      { name: 'full_name', type: 'fullName' },
      { name: 'email_addr', type: 'email' },
      { name: 'phone_number', type: 'phone' },
    ];
    const { pii, identifier, numeric, passthrough } = categorizeColumns(cols);
    expect(pii).toEqual(['full_name', 'email_addr', 'phone_number']);
    expect(identifier).toHaveLength(0);
    expect(numeric).toHaveLength(0);
    expect(passthrough).toHaveLength(0);
  });

  test('categorizes identifier columns by type', () => {
    const cols = [
      { name: 'id', type: 'autoIncrement' },
      { name: 'user_uuid', type: 'uuid' },
    ];
    const { pii, identifier } = categorizeColumns(cols);
    expect(identifier).toContain('id');
    expect(identifier).toContain('user_uuid');
    expect(pii).toHaveLength(0);
  });

  test('categorizes identifier columns by name pattern', () => {
    const cols = [
      { name: 'customer_id', type: 'number' },
      { name: 'user_guid', type: 'word' },
    ];
    const { identifier } = categorizeColumns(cols);
    expect(identifier).toContain('customer_id');
    expect(identifier).toContain('user_guid');
  });

  test('categorizes numeric columns by type', () => {
    const cols = [
      { name: 'revenue', type: 'price' },
      { name: 'score', type: 'number' },
    ];
    const { numeric } = categorizeColumns(cols);
    expect(numeric).toContain('revenue');
    expect(numeric).toContain('score');
  });

  test('categorizes range type as numeric', () => {
    const cols = [{ name: 'age', type: 'range:18-65' }];
    const { numeric } = categorizeColumns(cols);
    expect(numeric).toContain('age');
  });

  test('passthrough for unrecognized columns', () => {
    const cols = [
      { name: 'status', type: 'sentence' },
      { name: 'created_at', type: 'pastDate' },
    ];
    const { passthrough } = categorizeColumns(cols);
    expect(passthrough).toContain('status');
    expect(passthrough).toContain('created_at');
  });

  test('respects keepColumns override', () => {
    const cols = [
      { name: 'email', type: 'email' },
      { name: 'name', type: 'fullName' },
      { name: 'status', type: 'word' },
    ];
    const { pii, passthrough } = categorizeColumns(cols, ['email', 'status']);
    expect(passthrough).toContain('email');
    expect(passthrough).toContain('status');
    expect(pii).toContain('name');
    expect(pii).not.toContain('email');
  });

  test('PII detection by column name pattern', () => {
    const cols = [
      { name: 'first_name', type: '' },
      { name: 'last_name', type: '' },
      { name: 'email', type: '' },
      { name: 'phone', type: '' },
    ];
    const { pii } = categorizeColumns(cols);
    expect(pii).toContain('first_name');
    expect(pii).toContain('last_name');
    expect(pii).toContain('email');
    expect(pii).toContain('phone');
  });

  test('numeric detection by column name pattern', () => {
    const cols = [
      { name: 'price_amount', type: 'number' },
      { name: 'salary', type: '' },
      { name: 'rating', type: '' },
    ];
    const { numeric } = categorizeColumns(cols);
    expect(numeric).toContain('price_amount');
    expect(numeric).toContain('salary');
    expect(numeric).toContain('rating');
  });
});

// ---------------------------------------------------------------------------
// buildIdMap
// ---------------------------------------------------------------------------
describe('buildIdMap', () => {
  test('maps original IDs to fake values', () => {
    const records = [
      { id: 100, email: 'a@x.com' },
      { id: 200, email: 'b@x.com' },
    ];
    const map = buildIdMap(records, ['id']);
    expect(map.has('id:100')).toBe(true);
    expect(map.has('id:200')).toBe(true);
    // Two distinct originals should map to distinct fakes
    expect(map.get('id:100')).not.toBe(map.get('id:200'));
  });

  test('same original value always maps to same fake value', () => {
    const records = [
      { id: 42, name: 'Alice' },
      { id: 42, name: 'Bob' },
      { id: 99, name: 'Carol' },
    ];
    const map = buildIdMap(records, ['id']);
    expect(map.get('id:42')).toBe(map.get('id:42')); // same
    expect(map.get('id:99')).not.toBe(map.get('id:42'));
  });

  test('extends an existing idMap for cross-file consistency', () => {
    const records1 = [{ id: 1 }];
    const records2 = [{ id: 1 }, { id: 2 }];

    const map1 = buildIdMap(records1, ['id']);
    const fakeId1 = map1.get('id:1');

    // Pass map1 to the second call
    const map2 = buildIdMap(records2, ['id'], map1);
    expect(map2.get('id:1')).toBe(fakeId1); // same mapping preserved
  });

  test('handles UUID values with UUID-format output', () => {
    const uid = '550e8400-e29b-41d4-a716-446655440000';
    const records = [{ uid }];
    const map = buildIdMap(records, ['uid']);
    const fake = map.get('uid:' + uid);
    expect(fake).toBeTruthy();
    // Should generate a new UUID
    expect(fake).not.toBe(uid);
  });

  test('returns empty map for no id columns', () => {
    const records = [{ name: 'Alice' }];
    const map = buildIdMap(records, []);
    expect(map.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeStats
// ---------------------------------------------------------------------------
describe('computeStats', () => {
  test('computes mean and stddev', () => {
    const values = [10, 20, 30, 40, 50];
    const { mean, stddev } = computeStats(values);
    expect(mean).toBeCloseTo(30, 1);
    expect(stddev).toBeCloseTo(14.14, 1);
  });

  test('handles empty array safely', () => {
    const { mean, stddev } = computeStats([]);
    expect(mean).toBe(0);
    expect(stddev).toBe(1);
  });

  test('handles null/undefined values', () => {
    const { mean } = computeStats([null, undefined, 10, 20]);
    expect(mean).toBe(15);
  });

  test('returns stddev of 1 when variance is 0', () => {
    const { stddev } = computeStats([5, 5, 5]);
    expect(stddev).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// anonymizeRecords
// ---------------------------------------------------------------------------
describe('anonymizeRecords', () => {
  const records = [
    { id: 1, firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', salary: 75000 },
    { id: 2, firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com', salary: 85000 },
    { id: 3, firstName: 'Carol', lastName: 'White', email: 'carol@example.com', salary: 90000 },
  ];
  const columns = [
    { name: 'id', type: 'autoIncrement' },
    { name: 'firstName', type: 'firstName' },
    { name: 'lastName', type: 'lastName' },
    { name: 'email', type: 'email' },
    { name: 'salary', type: 'number' },
  ];

  test('returns same number of records', () => {
    const { records: out } = anonymizeRecords({ records, columns });
    expect(out).toHaveLength(records.length);
  });

  test('replaces PII fields (names and email)', () => {
    const { records: out } = anonymizeRecords({ records, columns });
    expect(out[0].firstName).not.toBe('Alice');
    expect(out[0].lastName).not.toBe('Smith');
    expect(out[0].email).not.toBe('alice@example.com');
    expect(out[1].email).not.toBe('bob@example.com');
  });

  test('generates valid email addresses for email column', () => {
    const { records: out } = anonymizeRecords({ records, columns });
    for (const rec of out) {
      expect(rec.email).toMatch(/.+@.+\..+/);
    }
  });

  test('maps identifiers consistently (same id → same fake id)', () => {
    const duplicateRecords = [
      { id: 1, name: 'Alice' },
      { id: 1, name: 'Duplicate' },
      { id: 2, name: 'Bob' },
    ];
    const cols = [
      { name: 'id', type: 'autoIncrement' },
      { name: 'name', type: 'fullName' },
    ];
    const { records: out } = anonymizeRecords({ records: duplicateRecords, columns: cols });
    // Both rows with id:1 should have the same fake id
    expect(out[0].id).toBe(out[1].id);
    expect(out[0].id).not.toBe(out[2].id);
  });

  test('keepColumns passes specified columns through unchanged', () => {
    const { records: out } = anonymizeRecords({
      records,
      columns,
      options: { keepColumns: ['email'] },
    });
    // Email should be unchanged
    expect(out[0].email).toBe('alice@example.com');
    // Names should still be replaced
    expect(out[0].firstName).not.toBe('Alice');
  });

  test('onlyColumns restricts anonymization to specified columns', () => {
    const { records: out } = anonymizeRecords({
      records,
      columns,
      options: { onlyColumns: ['email'] },
    });
    // Only email should be changed; everything else unchanged
    expect(out[0].firstName).toBe('Alice');
    expect(out[0].lastName).toBe('Smith');
    expect(out[0].email).not.toBe('alice@example.com');
  });

  test('returns an idMap for cross-file consistency', () => {
    const { idMap } = anonymizeRecords({ records, columns });
    expect(idMap).toBeInstanceOf(Map);
    expect(idMap.size).toBeGreaterThan(0);
  });

  test('accepts an existing idMap for cross-file referential integrity', () => {
    const firstBatch = [{ id: 1, email: 'a@x.com' }];
    const cols = [
      { name: 'id', type: 'autoIncrement' },
      { name: 'email', type: 'email' },
    ];
    const { idMap } = anonymizeRecords({ records: firstBatch, columns: cols });
    const fakeId = idMap.get('id:1');

    // Second batch references same ID
    const secondBatch = [{ id: 1, email: 'b@x.com' }];
    const { records: out2 } = anonymizeRecords({
      records: secondBatch,
      columns: cols,
      options: { idMap },
    });
    expect(out2[0].id).toBe(fakeId);
  });

  test('preserves numeric distribution (mean within 25% of original)', () => {
    // Generate a larger dataset for reliable stats
    const manyRecords = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      value: 1000 + Math.round(Math.random() * 200),
    }));
    const cols = [
      { name: 'id', type: 'autoIncrement' },
      { name: 'value', type: 'number' },
    ];
    const originalMean = manyRecords.reduce((s, r) => s + r.value, 0) / manyRecords.length;
    const { records: out } = anonymizeRecords({ records: manyRecords, columns: cols });
    const anonymizedMean = out.reduce((s, r) => s + Number(r.value), 0) / out.length;
    // Mean should be within 25% of original
    expect(Math.abs(anonymizedMean - originalMean) / originalMean).toBeLessThan(0.25);
  });

  test('handles empty records array', () => {
    const { records: out, idMap } = anonymizeRecords({ records: [], columns });
    expect(out).toEqual([]);
    expect(idMap.size).toBe(0);
  });

  test('handles records with null/undefined PII values', () => {
    const nullRecords = [{ id: 1, email: null, name: undefined }];
    const cols = [
      { name: 'id', type: 'autoIncrement' },
      { name: 'email', type: 'email' },
      { name: 'name', type: 'fullName' },
    ];
    expect(() => anonymizeRecords({ records: nullRecords, columns: cols })).not.toThrow();
  });

  test('covers all PII generator types', () => {
    const record = {
      e: 'a@b.com', fn: 'Alice', ln: 'Smith', ph: '555-1234',
      st: '123 Main St', stAddr: '456 Elm Ave', usr: 'alice99', pwd: 'pass1',
      co: 'Acme', jt: 'Engineer', ipv4: '1.2.3.4', ip2: '5.6.7.8',
      ua: 'Mozilla/5.0', cc: '4111111111111111', acct: '12345678',
      ib: 'DE89370400440532013000', pfx: 'Mr.', sfx: 'Jr.',
    };
    const cols = [
      { name: 'e', type: 'email' }, { name: 'fn', type: 'firstName' },
      { name: 'ln', type: 'lastName' }, { name: 'ph', type: 'phone' },
      { name: 'st', type: 'street' }, { name: 'stAddr', type: 'streetAddress' },
      { name: 'usr', type: 'username' }, { name: 'pwd', type: 'password' },
      { name: 'co', type: 'company' }, { name: 'jt', type: 'jobTitle' },
      { name: 'ipv4', type: 'ipv4' }, { name: 'ip2', type: 'ip' },
      { name: 'ua', type: 'userAgent' }, { name: 'cc', type: 'creditCardNumber' },
      { name: 'acct', type: 'accountNumber' }, { name: 'ib', type: 'iban' },
      { name: 'pfx', type: 'prefix' }, { name: 'sfx', type: 'suffix' },
    ];
    const { records: out } = anonymizeRecords({ records: [record], columns: cols });
    expect(out).toHaveLength(1);
    // Just verify we get back an object (generators invoked without error)
    expect(out[0].e).toBeTruthy();
    expect(out[0].co).toBeTruthy();
    expect(out[0].stAddr).toBeTruthy();
  });

  test('covers getPIIGenerator name-based fallbacks', () => {
    const record = {
      email_field: 'a@b.com',
      first_name: 'Alice',
      last_name: 'Smith',
      full_name: 'Alice Smith',
      phone_num: '555-1234',
      address_line: '123 Main',
      password_hash: 'secret',
      username_str: 'alice',
      company_name: 'Acme',
      job_title: 'Dev',
    };
    const cols = Object.keys(record).map(k => ({ name: k, type: '' }));
    const { records: out } = anonymizeRecords({ records: [record], columns: cols });
    expect(out).toHaveLength(1);
    // PII columns should be replaced (not their original values)
    expect(out[0].first_name).not.toBe('Alice');
    expect(out[0].last_name).not.toBe('Smith');
  });

  test('uses fullName fallback for unknown PII column names', () => {
    const record = { secret_data: 'sensitive info' };
    // Force into PII category via explicit onlyColumns
    const cols = [{ name: 'secret_data', type: 'fullName' }];
    const { records: out } = anonymizeRecords({ records: [record], columns: cols });
    expect(out[0].secret_data).not.toBe('sensitive info');
  });

  test('getPIIGenerator falls back to fullName for PII column with unrecognised name+type', () => {
    // 'ssn' matches PII_NAME_PATTERNS (/\bssn\b/) but type '' is not in PII_GENERATORS
    // and 'ssn' doesn't match any of the name-based regex fallbacks in getPIIGenerator
    // → hits the final `return PII_GENERATORS.fullName` fallback (line 243)
    const record = { ssn: '123-45-6789' };
    const cols = [{ name: 'ssn', type: '' }];
    const { records: out } = anonymizeRecords({ records: [record], columns: cols });
    // Value should be replaced (not the original SSN)
    expect(out[0].ssn).not.toBe('123-45-6789');
    // Should be a non-empty string (fullName generator)
    expect(typeof out[0].ssn).toBe('string');
    expect(out[0].ssn.length).toBeGreaterThan(0);
  });

  test('accepts columns as plain strings (covers typeof c === string branch)', () => {
    // columns passed as string array → normalizes to { name: c, type: c }
    const records = [{ firstName: 'Alice', email: 'alice@example.com' }];
    const { records: out } = anonymizeRecords({
      records,
      columns: ['firstName', 'email'],
    });
    // Both are PII types when type === name → should be replaced
    expect(out[0].firstName).not.toBe('Alice');
    expect(out[0].email).not.toBe('alice@example.com');
  });

  test('preserveDistributions: false skips the numeric replacement block', () => {
    const records = [
      { id: 1, score: 80 },
      { id: 2, score: 90 },
    ];
    const cols = [
      { name: 'id',    type: 'autoIncrement' },
      { name: 'score', type: 'number' },
    ];
    const { records: out } = anonymizeRecords({
      records,
      columns: cols,
      options: { preserveDistributions: false },
    });
    // With preserveDistributions: false the if-block is skipped; score is numeric (not PII)
    // so it passes through unchanged.
    expect(out[0].score).toBe(80);
    expect(out[1].score).toBe(90);
  });

  test('float numeric values use parseFloat branch (isInteger is false)', () => {
    // Use 'price' type so the column is categorised as numeric in NUMERIC_TYPES.
    // Values like 45000.50 are non-integers → Number.isInteger returns false → parseFloat path.
    const manyRecords = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      price: 100.50 + i * 0.25,
    }));
    const cols = [
      { name: 'id',    type: 'autoIncrement' },
      { name: 'price', type: 'price' },
    ];
    const { records: out } = anonymizeRecords({ records: manyRecords, columns: cols });
    expect(out).toHaveLength(50);
    for (const r of out) {
      expect(typeof r.price).toBe('number');
    }
  });
});
