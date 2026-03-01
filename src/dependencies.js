/**
 * Cross-column dependency resolution engine.
 *
 * Implements two key capabilities:
 *  1. Topological ordering of columns that declare `depends` so dependent
 *     columns are always generated after the column they reference.
 *  2. Value resolution for dependent columns — either from an explicit
 *     `mapping` object or from the built-in geographic maps.
 *
 * @module dependencies
 */

import { BUILT_IN_DEPENDENCY_MAPS } from './dependency-maps.js';

/**
 * Topologically sort columns so that every column that has a `depends.column`
 * reference is placed after the column it depends on.
 *
 * Columns with no `depends` field are returned first in their original
 * relative order, followed by dependent columns in dependency order.
 *
 * @param {import('./core.js').SchemaColumn[]} columns
 * @returns {{ independent: import('./core.js').SchemaColumn[], dependent: import('./core.js').SchemaColumn[] }}
 *   Two partitioned arrays — independent columns and dependency-ordered
 *   dependent columns.
 * @throws {Error} When circular dependencies are detected.
 */
export function resolveDependencyOrder(columns) {
  const independent = [];
  const dependent = [];

  for (const col of columns) {
    if (col.depends && col.depends !== false) {
      dependent.push(col);
    } else {
      independent.push(col);
    }
  }

  if (dependent.length === 0) {
    return { independent, dependent: [] };
  }

  // Kahn's algorithm on the dependent subset only.
  // Build in-degree map using only the dependent columns.
  const nameToCol = new Map(columns.map(c => [c.name, c]));
  const inDegree = new Map(dependent.map(c => [c.name, 0]));
  const adj = new Map(dependent.map(c => [c.name, []]));

  for (const col of dependent) {
    const parentName = col.depends.column;
    if (!nameToCol.has(parentName)) {
      throw new Error(
        `Column "${col.name}" depends on unknown column "${parentName}".`
      );
    }
    // If the parent is also a dependent column, add an edge.
    if (inDegree.has(parentName)) {
      inDegree.set(col.name, (inDegree.get(col.name) || 0) + 1);
      /* v8 ignore next -- adj.get() || [] right-side only hit on first child; v8 maps both to left in static analysis */
      const children = adj.get(parentName) || [];
      children.push(col.name);
      adj.set(parentName, children);
    }
    // If the parent is an independent column, no edge needed (already resolved).
  }

  const queue = [];
  for (const [name, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(name);
  }

  const ordered = [];
  while (queue.length > 0) {
    const name = queue.shift();
    ordered.push(nameToCol.get(name));
    /* v8 ignore next -- || [] right-side hit for leaf nodes; v8 instrument conflates branch */
    for (const child of (adj.get(name) || [])) {
      inDegree.set(child, inDegree.get(child) - 1);
      /* v8 ignore next -- single-parent model means inDegree always reaches 0 here */
      if (inDegree.get(child) === 0) queue.push(child);
    }
  }

  if (ordered.length !== dependent.length) {
    throw new Error(
      'Circular dependency detected in column "depends" definitions.'
    );
  }

  return { independent, dependent: ordered };
}

/**
 * Resolve the value for a dependent column given the partially-built row.
 *
 * Supports two modes:
 *  - `mapping` mode: `{ column: "country", mapping: { "US": ["CA", "TX"] } }`
 *  - built-in geographic maps: auto-wired for known `column→name` pairs when
 *    no explicit `mapping` is provided.
 *
 * @param {import('./core.js').SchemaColumn} column - The column being generated.
 * @param {Object} row - Partially-built row (dependent-on column is already set).
 * @param {() => number} [rng] - Optional random function (default: Math.random).
 * @returns {string|number|null} Generated value.
 */
export function resolveDependentValue(column, row, rng = Math.random) {
  const { depends } = column;
  if (!depends || depends === false) return null;

  const parentValue = row[depends.column];

  // Explicit mapping takes first priority.
  if (depends.mapping) {
    const choices = depends.mapping[parentValue];
    if (!choices || choices.length === 0) return null;
    return choices[Math.floor(rng() * choices.length)];
  }

  // Fall back to built-in maps based on the parent column name and this column's name.
  const key = `${depends.column}→${column.name}`;
  const builtInMap = BUILT_IN_DEPENDENCY_MAPS[key];
  if (builtInMap) {
    const choices = builtInMap[parentValue];
    if (!choices || choices.length === 0) return null;
    return choices[Math.floor(rng() * choices.length)];
  }

  return null;
}

/**
 * Detect implicit geographic dependencies when a schema contains both a
 * `country` column and a dependent geographic column (`state`, `city`) but
 * neither has an explicit `depends` field.
 *
 * Mutates the passed-in array in place (adds `depends` to matching columns).
 *
 * @param {import('./core.js').SchemaColumn[]} columns - Full column array.
 * @returns {void}
 */
export function autoWireGeographicDependencies(columns) {
  const names = new Set(columns.map(c => c.name.toLowerCase()));
  const GEOGRAPHIC_PAIRS = [
    { parent: 'country', child: 'state' },
    { parent: 'country', child: 'city' },
  ];

  for (const col of columns) {
    if (col.depends === false) continue; // opted out
    if (col.depends) continue;           // already explicit

    const lower = col.name.toLowerCase();
    for (const { parent, child } of GEOGRAPHIC_PAIRS) {
      if (lower === child && names.has(parent)) {
        // Find the actual parent column name (preserve original casing).
        const parentCol = columns.find(c => c.name.toLowerCase() === parent);
        /* v8 ignore next -- defensive check; names set and columns array are always in sync */
        if (parentCol) {
          col.depends = { column: parentCol.name };
        }
        break;
      }
    }
  }
}
