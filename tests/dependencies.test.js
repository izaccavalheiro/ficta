import { faker } from '@faker-js/faker';
import { setFaker, generateData } from '../src/core.js';
import {
  resolveDependencyOrder,
  resolveDependentValue,
  autoWireGeographicDependencies,
} from '../src/dependencies.js';
import {
  COUNTRY_STATE_MAP,
  COUNTRY_CITY_MAP,
  BUILT_IN_DEPENDENCY_MAPS,
} from '../src/dependency-maps.js';

beforeAll(() => setFaker(faker));

// ---------------------------------------------------------------------------
// resolveDependencyOrder
// ---------------------------------------------------------------------------

describe('resolveDependencyOrder', () => {
  test('columns without depends are all returned as independent', () => {
    const cols = [
      { name: 'id', type: 'autoIncrement' },
      { name: 'email', type: 'email' },
    ];
    const { independent, dependent } = resolveDependencyOrder(cols);
    expect(independent).toHaveLength(2);
    expect(dependent).toHaveLength(0);
  });

  test('columns with depends are placed in dependent list', () => {
    const cols = [
      { name: 'country', type: 'country' },
      { name: 'state', type: 'word', depends: { column: 'country' } },
    ];
    const { independent, dependent } = resolveDependencyOrder(cols);
    expect(independent.map(c => c.name)).toEqual(['country']);
    expect(dependent.map(c => c.name)).toEqual(['state']);
  });

  test('depends: false is treated as independent', () => {
    const cols = [
      { name: 'country', type: 'country' },
      { name: 'state', type: 'word', depends: false },
    ];
    const { independent, dependent } = resolveDependencyOrder(cols);
    expect(independent).toHaveLength(2);
    expect(dependent).toHaveLength(0);
  });

  test('multi-level dependency: A→B→C is ordered correctly', () => {
    const cols = [
      { name: 'a', type: 'word' },
      { name: 'c', type: 'word', depends: { column: 'b' } },
      { name: 'b', type: 'word', depends: { column: 'a' } },
    ];
    const { dependent } = resolveDependencyOrder(cols);
    const names = dependent.map(c => c.name);
    expect(names.indexOf('b')).toBeLessThan(names.indexOf('c'));
  });

  test('throws when depends references an unknown column', () => {
    const cols = [
      { name: 'state', type: 'word', depends: { column: 'nonexistent' } },
    ];
    expect(() => resolveDependencyOrder(cols)).toThrow(/unknown column "nonexistent"/i);
  });

  test('throws on circular dependency', () => {
    const cols = [
      { name: 'a', type: 'word', depends: { column: 'b' } },
      { name: 'b', type: 'word', depends: { column: 'a' } },
    ];
    expect(() => resolveDependencyOrder(cols)).toThrow(/circular dependency/i);
  });

  test('two dependent cols sharing same dependent parent hit adj array-reuse branch', () => {
    // a is independent. b depends on a. c and d BOTH depend on b.
    // When processing c: adj.get('b') === undefined → creates []. Covers || [] false branch.
    // When processing d: adj.get('b') === ['c'] (truthy) → reuses existing array. Covers || [] true branch.
    const cols = [
      { name: 'a', type: 'word' },
      { name: 'b', type: 'word', depends: { column: 'a' } },
      { name: 'c', type: 'word', depends: { column: 'b' } },
      { name: 'd', type: 'word', depends: { column: 'b' } },
    ];
    const { independent, dependent } = resolveDependencyOrder(cols);
    expect(independent.map(x => x.name)).toEqual(['a']);
    const names = dependent.map(x => x.name);
    expect(names).toContain('b');
    expect(names).toContain('c');
    expect(names).toContain('d');
    // b must appear before c and d
    expect(names.indexOf('b')).toBeLessThan(names.indexOf('c'));
    expect(names.indexOf('b')).toBeLessThan(names.indexOf('d'));
  });
});

// ---------------------------------------------------------------------------
// resolveDependentValue
// ---------------------------------------------------------------------------

describe('resolveDependentValue', () => {
  test('returns null when column has no depends', () => {
    const col = { name: 'state', type: 'word' };
    const row = { country: 'United States' };
    expect(resolveDependentValue(col, row)).toBeNull();
  });

  test('explicit mapping picks from correct options for parent value', () => {
    const col = {
      name: 'state',
      type: 'word',
      depends: {
        column: 'country',
        mapping: { US: ['California', 'Texas'], UK: ['England', 'Scotland'] },
      },
    };
    const row = { country: 'US' };
    const result = resolveDependentValue(col, row, () => 0);
    expect(result).toBe('California');
  });

  test('explicit mapping returns null when parent value not in map', () => {
    const col = {
      name: 'state',
      type: 'word',
      depends: { column: 'country', mapping: { US: ['California'] } },
    };
    const row = { country: 'Unknown Country' };
    expect(resolveDependentValue(col, row)).toBeNull();
  });

  test('built-in country→state map is used when no explicit mapping', () => {
    const col = {
      name: 'state',
      type: 'word',
      depends: { column: 'country' },
    };
    const row = { country: 'United States' };
    const result = resolveDependentValue(col, row, () => 0);
    expect(COUNTRY_STATE_MAP['United States']).toContain(result);
  });

  test('built-in country→city map is used when no explicit mapping', () => {
    const col = {
      name: 'city',
      type: 'word',
      depends: { column: 'country' },
    };
    const row = { country: 'Japan' };
    const result = resolveDependentValue(col, row, () => 0);
    expect(COUNTRY_CITY_MAP['Japan']).toContain(result);
  });

  test('returns null when built-in map has no entry for parent value', () => {
    const col = {
      name: 'state',
      type: 'word',
      depends: { column: 'country' },
    };
    const row = { country: 'ZZ-Unknown' };
    expect(resolveDependentValue(col, row)).toBeNull();
  });

  test('returns null when depends.column+col.name combo not in BUILT_IN_DEPENDENCY_MAPS', () => {
    // key = 'country→province' which is NOT in BUILT_IN_DEPENDENCY_MAPS
    // (only country→state and country→city are built-in)
    // This covers the final `return null` at the end of resolveDependentValue
    const col = {
      name: 'province',
      type: 'word',
      depends: { column: 'country' },
    };
    const row = { country: 'United States' };
    expect(resolveDependentValue(col, row)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// autoWireGeographicDependencies
// ---------------------------------------------------------------------------

describe('autoWireGeographicDependencies', () => {
  test('adds depends to state column when country column exists', () => {
    const cols = [
      { name: 'country', type: 'country' },
      { name: 'state', type: 'state' },
    ];
    autoWireGeographicDependencies(cols);
    expect(cols[1].depends).toEqual({ column: 'country' });
  });

  test('adds depends to city column when country column exists', () => {
    const cols = [
      { name: 'country', type: 'country' },
      { name: 'city', type: 'city' },
    ];
    autoWireGeographicDependencies(cols);
    expect(cols[1].depends).toEqual({ column: 'country' });
  });

  test('does not overwrite an existing explicit depends', () => {
    const explicitDepends = { column: 'country', mapping: { US: ['NY'] } };
    const cols = [
      { name: 'country', type: 'country' },
      { name: 'state', type: 'state', depends: explicitDepends },
    ];
    autoWireGeographicDependencies(cols);
    expect(cols[1].depends).toBe(explicitDepends);
  });

  test('does not wire when depends: false (opt-out)', () => {
    const cols = [
      { name: 'country', type: 'country' },
      { name: 'state', type: 'state', depends: false },
    ];
    autoWireGeographicDependencies(cols);
    expect(cols[1].depends).toBe(false);
  });

  test('does not wire when country column is absent', () => {
    const cols = [
      { name: 'region', type: 'word' },
      { name: 'state', type: 'state' },
    ];
    autoWireGeographicDependencies(cols);
    expect(cols[1].depends).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Built-in dependency maps
// ---------------------------------------------------------------------------

describe('dependency-maps module', () => {
  test('COUNTRY_STATE_MAP has entries for at least 5 countries', () => {
    expect(Object.keys(COUNTRY_STATE_MAP).length).toBeGreaterThanOrEqual(5);
  });

  test('each COUNTRY_STATE_MAP entry has at least 4 states', () => {
    for (const states of Object.values(COUNTRY_STATE_MAP)) {
      expect(states.length).toBeGreaterThanOrEqual(4);
    }
  });

  test('COUNTRY_CITY_MAP has entries for at least 5 countries', () => {
    expect(Object.keys(COUNTRY_CITY_MAP).length).toBeGreaterThanOrEqual(5);
  });

  test('BUILT_IN_DEPENDENCY_MAPS has country→state and country→city', () => {
    expect(BUILT_IN_DEPENDENCY_MAPS['country→state']).toBe(COUNTRY_STATE_MAP);
    expect(BUILT_IN_DEPENDENCY_MAPS['country→city']).toBe(COUNTRY_CITY_MAP);
  });
});

// ---------------------------------------------------------------------------
// Integration tests via generateData
// ---------------------------------------------------------------------------

describe('generateData — cross-column dependencies integration', () => {
  test('explicit depends mapping: state matches country', () => {
    const schema = [
      { name: 'country', type: 'country' },
      {
        name: 'state',
        type: 'word',
        depends: {
          column: 'country',
          mapping: { US: ['California', 'Texas'], AU: ['Victoria', 'Queensland'] },
        },
      },
    ];
    const { records } = generateData({ schema, rows: 20 });
    for (const r of records) {
      if (r.country === 'US') expect(['California', 'Texas']).toContain(r.state);
      if (r.country === 'AU') expect(['Victoria', 'Queensland']).toContain(r.state);
    }
  });

  test('auto-wired country→state gives geographically consistent data', () => {
    const { records } = generateData({
      columns: 'country:country,state:state',
      rows: 50,
    });
    const knownCountries = Object.keys(COUNTRY_STATE_MAP);
    for (const r of records) {
      if (knownCountries.includes(r.country)) {
        expect(COUNTRY_STATE_MAP[r.country]).toContain(r.state);
      }
    }
  });

  test('auto-wired country→city gives geographically consistent data', () => {
    const { records } = generateData({
      columns: 'country:country,city:city',
      rows: 50,
    });
    const knownCountries = Object.keys(COUNTRY_CITY_MAP);
    for (const r of records) {
      if (knownCountries.includes(r.country)) {
        expect(COUNTRY_CITY_MAP[r.country]).toContain(r.city);
      }
    }
  });

  test('depends: false opts out of auto-wiring', () => {
    const schema = [
      { name: 'country', type: 'country' },
      { name: 'state', type: 'state', depends: false },
    ];
    // Should not throw and should generate data (state is independently random).
    const { records } = generateData({ schema, rows: 5 });
    expect(records).toHaveLength(5);
    for (const r of records) {
      expect(typeof r.state).toBe('string');
    }
  });

  test('schema without country column is unchanged (no auto-wiring)', () => {
    const { records } = generateData({ columns: 'id:autoIncrement,email', rows: 5 });
    expect(records).toHaveLength(5);
  });

  test('original schema object is not mutated by auto-wiring', () => {
    const schema = [
      { name: 'country', type: 'country' },
      { name: 'state', type: 'state' },
    ];
    generateData({ schema, rows: 1 });
    expect(schema[1].depends).toBeUndefined();
  });
});
