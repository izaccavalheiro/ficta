import { faker } from '@faker-js/faker';
import { setFaker } from '../src/core.js';
import { createFactory } from '../src/factory.js';

beforeAll(() => setFaker(faker));

// ---------------------------------------------------------------------------
// createFactory — input validation
// ---------------------------------------------------------------------------

describe('createFactory — input validation', () => {
  test('throws when called with no argument', () => {
    expect(() => createFactory()).toThrow('createFactory: schemaOrString is required');
  });

  test('throws when argument is neither string nor array', () => {
    expect(() => createFactory(42)).toThrow('must be a column definition string or SchemaColumn[]');
  });

  test('throws when column string is empty', () => {
    expect(() => createFactory('')).toThrow('createFactory: schemaOrString is required');
  });

  test('throws when column string is whitespace-only', () => {
    expect(() => createFactory('   ')).toThrow('createFactory: column definition string cannot be empty');
  });

  test('accepts a column definition string', () => {
    expect(() => createFactory('id:autoIncrement,name:fullName')).not.toThrow();
  });

  test('accepts a SchemaColumn array', () => {
    expect(() => createFactory([{ name: 'id', type: 'autoIncrement' }])).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Factory.build
// ---------------------------------------------------------------------------

describe('Factory.build', () => {
  test('returns one record with expected column keys', () => {
    const factory = createFactory('id:autoIncrement,name:fullName,email:email');
    const record = factory.build();
    expect(record).toHaveProperty('id');
    expect(record).toHaveProperty('name');
    expect(record).toHaveProperty('email');
  });

  test('overrides values when passed to build()', () => {
    const factory = createFactory('id:autoIncrement,name:fullName');
    const record = factory.build({ name: 'Alice Override' });
    expect(record.name).toBe('Alice Override');
  });

  test('defaults option is applied to every built record', () => {
    const factory = createFactory('id:autoIncrement,status:word', { defaults: { status: 'active' } });
    const record = factory.build();
    expect(record.status).toBe('active');
  });

  test('build overrides take precedence over defaults', () => {
    const factory = createFactory('id:autoIncrement,status:word', { defaults: { status: 'active' } });
    const record = factory.build({ status: 'inactive' });
    expect(record.status).toBe('inactive');
  });
});

// ---------------------------------------------------------------------------
// Factory.buildMany
// ---------------------------------------------------------------------------

describe('Factory.buildMany', () => {
  test('returns an array of the requested length', () => {
    const factory = createFactory('id:autoIncrement,name:fullName');
    const records = factory.buildMany(5);
    expect(records).toHaveLength(5);
  });

  test('each record has expected column keys', () => {
    const factory = createFactory('id:autoIncrement,email:email');
    const records = factory.buildMany(3);
    for (const r of records) {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('email');
    }
  });

  test('overrides applied uniformly to all records', () => {
    const factory = createFactory('id:autoIncrement,role:word');
    const records = factory.buildMany(4, { role: 'admin' });
    for (const r of records) {
      expect(r.role).toBe('admin');
    }
  });

  test('defaults applied to all records', () => {
    const factory = createFactory('id:autoIncrement,status:word', { defaults: { status: 'active' } });
    const records = factory.buildMany(3);
    for (const r of records) {
      expect(r.status).toBe('active');
    }
  });
});

// ---------------------------------------------------------------------------
// Factory.buildList
// ---------------------------------------------------------------------------

describe('Factory.buildList', () => {
  test('returns an array of the requested length', () => {
    const factory = createFactory('id:autoIncrement,name:fullName');
    const records = factory.buildList(3);
    expect(records).toHaveLength(3);
  });

  test('per-record override function receives record and index', () => {
    const factory = createFactory('id:autoIncrement,role:word');
    const records = factory.buildList(3, (r, i) => ({ role: i === 0 ? 'admin' : 'user' }));
    expect(records[0].role).toBe('admin');
    expect(records[1].role).toBe('user');
    expect(records[2].role).toBe('user');
  });

  test('accepts a plain overrides object (same as buildMany)', () => {
    const factory = createFactory('id:autoIncrement,status:word');
    const records = factory.buildList(2, { status: 'inactive' });
    for (const r of records) {
      expect(r.status).toBe('inactive');
    }
  });

  test('works with no override argument', () => {
    const factory = createFactory('email');
    const records = factory.buildList(4);
    expect(records).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Factory with seed option (deterministic output)
// ---------------------------------------------------------------------------

describe('Factory with seed', () => {
  test('seeded factory produces identical records on repeated calls', () => {
    const factory = createFactory('id:autoIncrement,name:fullName,email:email', { seed: 7 });
    const first = factory.build();
    const second = factory.build();
    expect(first).toEqual(second);
  });

  test('seeded buildMany produces identical arrays on repeated calls', () => {
    const factory = createFactory('id:autoIncrement,name:fullName', { seed: 42 });
    const first = factory.buildMany(5);
    const second = factory.buildMany(5);
    expect(first).toEqual(second);
  });

  test('seeded buildList produces identical arrays on repeated calls', () => {
    // Covers the `if (seed !== undefined) seedFaker(seed)` branch inside buildList
    const factory = createFactory('id:autoIncrement,name:fullName', { seed: 99 });
    const first = factory.buildList(3);
    const second = factory.buildList(3);
    expect(first).toEqual(second);
  });
});

// ---------------------------------------------------------------------------
// schema property
// ---------------------------------------------------------------------------

describe('Factory.schema', () => {
  test('schema property reflects the parsed column array', () => {
    const factory = createFactory('id:autoIncrement,email:email');
    expect(factory.schema).toEqual([
      { name: 'id', type: 'autoIncrement' },
      { name: 'email', type: 'email' },
    ]);
  });

  test('factory created from SchemaColumn array exposes it via schema', () => {
    const cols = [{ name: 'x', type: 'number', primaryKey: true }];
    const factory = createFactory(cols);
    expect(factory.schema).toBe(cols);
  });
});
