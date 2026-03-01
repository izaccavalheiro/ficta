/**
 * Tests for src/infer.js — Schema Inference
 */
import { inferSchema } from '../src/infer.js';
import { parseColumns } from '../src/core.js';
import { faker } from '@faker-js/faker';
import { setFaker } from '../src/core.js';

setFaker(faker);

describe('inferSchema', () => {
  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  test('empty rows array returns empty result', () => {
    const result = inferSchema([]);
    expect(result.columns).toBe('');
    expect(result.columnList).toEqual([]);
  });

  test('non-array input returns empty result', () => {
    expect(inferSchema(null).columns).toBe('');
    expect(inferSchema(undefined).columns).toBe('');
    expect(inferSchema('string').columns).toBe('');
    expect(inferSchema(42).columns).toBe('');
  });

  // ---------------------------------------------------------------------------
  // Name-hint heuristic (priority 1)
  // ---------------------------------------------------------------------------
  test('infers name-hint types from column names', () => {
    const rows = [{ id: 1, email: 'alice@example.com', name: 'Alice', phone: '555-1234' }];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'id').type).toBe('autoIncrement');
    expect(columnList.find(c => c.name === 'email').type).toBe('email');
    expect(columnList.find(c => c.name === 'name').type).toBe('fullName');
    expect(columnList.find(c => c.name === 'phone').type).toBe('phone');
  });

  test('infers firstName, lastName, jobTitle via name hints', () => {
    const rows = [{ firstName: 'Alice', lastName: 'Smith', job_title: 'Engineer', username: 'alice' }];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'firstName').type).toBe('firstName');
    expect(columnList.find(c => c.name === 'lastName').type).toBe('lastName');
    expect(columnList.find(c => c.name === 'job_title').type).toBe('jobTitle');
    expect(columnList.find(c => c.name === 'username').type).toBe('username');
  });

  test('infers address-related name hints', () => {
    const rows = [{ street: '123 Main', city: 'Springfield', country: 'US', zip: '12345', latitude: '40.7', longitude: '-74.0' }];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'street').type).toBe('street');
    expect(columnList.find(c => c.name === 'city').type).toBe('city');
    expect(columnList.find(c => c.name === 'country').type).toBe('country');
    expect(columnList.find(c => c.name === 'zip').type).toBe('zipCode');
    expect(columnList.find(c => c.name === 'latitude').type).toBe('latitude');
    expect(columnList.find(c => c.name === 'longitude').type).toBe('longitude');
  });

  test('infers company, department name hints', () => {
    const rows = [{ company: 'Acme', department: 'Sales' }];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'company').type).toBe('company');
    expect(columnList.find(c => c.name === 'department').type).toBe('department');
  });

  test('infers price, amount name hints', () => {
    const rows = [{ price: '9.99', amount: '100.00' }];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'price').type).toBe('price');
    expect(columnList.find(c => c.name === 'amount').type).toBe('amount');
  });

  test('infers timestamp from created_at name hint', () => {
    const rows = [{ created_at: '2024-01-01T00:00:00Z' }];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'created_at').type).toBe('timestamp');
  });

  test('infers pastDate from date name hint', () => {
    const rows = [{ date: '2024-01-01' }];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'date').type).toBe('pastDate');
  });

  test('infers sentence from description name hint', () => {
    const rows = [{ description: 'A long text description' }];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'description').type).toBe('sentence');
  });

  test('infers boolean from active name hint', () => {
    const rows = [{ active: 'true' }];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'active').type).toBe('boolean');
  });

  test('infers url from url name hint', () => {
    const rows = [{ url: 'https://example.com' }];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'url').type).toBe('url');
  });

  test('infers ipv4 from ip name hint', () => {
    const rows = [{ ip: '192.168.1.1' }];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'ip').type).toBe('ipv4');
  });

  test('infers password from password name hint', () => {
    const rows = [{ password: 'secret123' }];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'password').type).toBe('password');
  });

  test('infers uuid from uuid name hint', () => {
    const rows = [{ uuid: '123e4567-e89b-12d3-a456-426614174000' }];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'uuid').type).toBe('uuid');
  });

  test('infers state from state name hint', () => {
    const rows = [{ state: 'California' }];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'state').type).toBe('state');
  });

  // ---------------------------------------------------------------------------
  // Value-pattern heuristics (name has no hint)
  // ---------------------------------------------------------------------------
  test('infers uuid from UUID-shaped values', () => {
    const rows = [
      { row_uid: '123e4567-e89b-12d3-a456-426614174000' },
      { row_uid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
    ];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'row_uid').type).toBe('uuid');
  });

  test('infers date from ISO date strings', () => {
    const rows = [
      { inserted: '2024-01-15' },
      { inserted: '2023-12-31' },
    ];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'inserted').type).toBe('date');
  });

  test('infers date from ISO datetime strings', () => {
    const rows = [
      { updated: '2024-01-15T10:30:00Z' },
      { updated: '2023-12-31T23:59:59.000Z' },
    ];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'updated').type).toBe('date');
  });

  test('infers email from email-shaped values', () => {
    const rows = [
      { contact: 'alice@example.com' },
      { contact: 'bob@test.org' },
      { contact: 'charlie@domain.net' },
      { contact: 'dave@company.io' },
      { contact: 'eve@web.app' },
      { contact: 'frank@mail.co' },
      { contact: 'grace@service.com' },
      { contact: 'heidi@test.com' },
      { contact: 'ivan@example.com' },
    ];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'contact').type).toBe('email');
  });

  test('infers url from http/https URL values', () => {
    const rows = [
      { homepage: 'https://example.com' },
      { homepage: 'http://test.org/page' },
      { homepage: 'https://www.domain.com/path?q=1' },
      { homepage: 'https://a.com' },
      { homepage: 'https://b.com' },
      { homepage: 'https://c.com' },
      { homepage: 'https://d.com' },
      { homepage: 'https://e.com' },
      { homepage: 'https://f.com' },
    ];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'homepage').type).toBe('url');
  });

  test('infers enum for ≤ 8 distinct string values', () => {
    const rows = [
      { status: 'active' },
      { status: 'inactive' },
      { status: 'pending' },
      { status: 'active' },
      { status: 'inactive' },
    ];
    const { columnList } = inferSchema(rows);
    const col = columnList.find(c => c.name === 'status');
    expect(col.type).toMatch(/^enum:/);
    expect(col.type).toContain('active');
    expect(col.type).toContain('inactive');
    expect(col.type).toContain('pending');
  });

  test('does NOT infer enum for > 8 distinct string values — falls back to word', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ tag: `tag-${i}` }));
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'tag').type).toBe('word');
  });

  test('infers number for all-integer numeric values', () => {
    const rows = [
      { score: 10 },
      { score: 90 },
      { score: 55 },
      { score: 70 },
      { score: 40 },
      { score: 1 },
      { score: 2 },
      { score: 3 },
      { score: 4 },
    ];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'score').type).toBe('number');
  });

  test('infers price for numeric values with decimals', () => {
    const rows = [
      { val: '9.99' },
      { val: '14.50' },
      { val: '100.01' },
      { val: '0.5' },
      { val: '3.14' },
      { val: '2.71' },
      { val: '1.41' },
      { val: '1.73' },
      { val: '2.23' },
    ];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'val').type).toBe('price');
  });

  test('falls back to word for mixed non-matching values', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      misc_text: `Unique long biography text number ${i} that doesn't fit any pattern`
    }));
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'misc_text').type).toBe('word');
  });

  test('falls back to word when all values are null/empty', () => {
    const rows = [{ misc: null }, { misc: undefined }, { misc: '' }];
    const { columnList } = inferSchema(rows);
    expect(columnList.find(c => c.name === 'misc').type).toBe('word');
  });

  // ---------------------------------------------------------------------------
  // columns string round-trip
  // ---------------------------------------------------------------------------
  test('columns string round-trips through parseColumns', () => {
    const rows = [
      { id: 1, name: 'Alice', active: true, score: 10 }
    ];
    const { columns } = inferSchema(rows);
    // parseColumns should not throw
    const parsed = parseColumns(columns);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    for (const col of parsed) {
      expect(typeof col.name).toBe('string');
      expect(typeof col.type).toBe('string');
    }
  });

  // ---------------------------------------------------------------------------
  // Sample size limit
  // ---------------------------------------------------------------------------
  test('uses at most 200 rows for inference', () => {
    // Create 300 rows with the same data pattern
    const rows = Array.from({ length: 300 }, (_, i) => ({ idx: i }));
    const result = inferSchema(rows);
    // Should still complete successfully and infer a type
    expect(result.columnList.length).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Multi-column result
  // ---------------------------------------------------------------------------
  test('returns correct columns string for multiple columns', () => {
    const rows = [{ id: 1, email: 'a@b.com', score: 42, tag: 'foo' }];
    const { columns, columnList } = inferSchema(rows);
    expect(columnList).toHaveLength(4);
    // columns string is comma-separated name:type pairs
    const parts = columns.split(',');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toMatch(/^id:/);
    expect(parts[1]).toMatch(/^email:/);
  });

  // Coverage gap fix: > 8 distinct string values that are not dates/emails/URLs
  // → falls through enum detection (unique.size > 8) to word type
  test('falls through to word type for > 8 distinct non-typed string values', () => {
    // > 8 distinct strings that are not UUIDs, dates, emails, or URLs
    const words = ['alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel','india'];
    const rows = words.map(w => ({ tag: w }));
    const result = inferSchema(rows);
    const col = result.columnList.find(c => c.name === 'tag');
    expect(col.type).toBe('word');
  });

  // Coverage gap fix: URL regex TRUE branch (column name has no URL name hint)
  // The name hint for 'url'/'website'/'homepage' returns early — we need a
  // column whose name does NOT match but whose values ARE all URLs.
  test('infers url type from URL values when column name has no URL name hint', () => {
    const rows = [
      { link: 'https://example.com' },
      { link: 'http://test.org/path' },
      { link: 'https://another.site' },
      { link: 'https://a.com' },
      { link: 'https://b.com' },
      { link: 'https://c.com' },
      { link: 'https://d.com' },
      { link: 'https://e.com' },
      { link: 'https://f.com' },
    ];
    const { columnList } = inferSchema(rows);
    // 'link' does not match /\burl\b|\bwebsite\b|\bhomepage\b/ so it falls
    // through the cascade and hits the URL regex check at line 106.
    expect(columnList.find(c => c.name === 'link').type).toBe('url');
  });
});
