/**
 * Factory builder for test data generation.
 *
 * Provides a `createFactory()` function that returns a builder compatible
 * with common factory patterns used in Jest/Vitest/Mocha test suites.
 *
 * Works in both Node.js and browser environments (environment-agnostic).
 *
 * @module factory
 */

import { generateData, columnStringToSchema, seedFaker } from './core.js';

/**
 * Create a test-data factory from a column definition string or a
 * `SchemaColumn[]` array.
 *
 * @template {Record<string, unknown>} T
 * @param {string | import('./core.js').SchemaColumn[]} schemaOrString
 *   Column definition string (e.g. `"id:autoIncrement,name:fullName,email"`) or
 *   an array of `SchemaColumn` objects.
 * @param {Object} [options]
 * @param {number} [options.seed] - Faker seed for reproducible output.
 * @param {Partial<T>} [options.defaults] - Default values applied to every record.
 * @returns {import('./factory.js').Factory<T>}
 */
export function createFactory(schemaOrString, options = {}) {
  if (!schemaOrString) {
    throw new Error('createFactory: schemaOrString is required');
  }
  if (typeof schemaOrString !== 'string' && !Array.isArray(schemaOrString)) {
    throw new Error('createFactory: first argument must be a column definition string or SchemaColumn[]');
  }
  if (typeof schemaOrString === 'string' && schemaOrString.trim() === '') {
    throw new Error('createFactory: column definition string cannot be empty');
  }

  const schema = typeof schemaOrString === 'string'
    ? columnStringToSchema(schemaOrString)
    : schemaOrString;

  const { seed, defaults = {} } = options;

  /**
   * Generate a single record with optional overrides.
   * @param {Partial<T>} [overrides]
   * @returns {T}
   */
  function build(overrides = {}) {
    if (seed !== undefined) seedFaker(seed);
    const result = generateData({ schema, rows: 1 });
    return /** @type {T} */({ ...result.records[0], ...defaults, ...overrides });
  }

  /**
   * Generate `count` records, each with the same optional overrides.
   * @param {number} count
   * @param {Partial<T>} [overrides]
   * @returns {T[]}
   */
  function buildMany(count, overrides = {}) {
    if (seed !== undefined) seedFaker(seed);
    const result = generateData({ schema, rows: count });
    return result.records.map(r => /** @type {T} */({ ...r, ...defaults, ...overrides }));
  }

  /**
   * Generate `count` records, applying a per-record override function.
   * @param {number} count
   * @param {((record: T, index: number) => Partial<T>) | Partial<T>} [overridesFn]
   * @returns {T[]}
   */
  function buildList(count, overridesFn) {
    if (seed !== undefined) seedFaker(seed);
    const result = generateData({ schema, rows: count });
    return result.records.map((r, i) => {
      const extra = typeof overridesFn === 'function' ? overridesFn(/** @type {T} */(r), i) : (overridesFn || {});
      return /** @type {T} */({ ...r, ...defaults, ...extra });
    });
  }

  return { build, buildMany, buildList, schema };
}
