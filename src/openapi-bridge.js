/**
 * OpenAPI → Ficta Schema Bridge
 *
 * Universal — no Node.js built-ins. Accepts parsed OpenAPI 3.x or JSON Schema
 * objects and returns Ficta column definitions.
 * @module openapi-bridge
 */

// ---------------------------------------------------------------------------
// JSON Schema type + format → Ficta type mapping
// ---------------------------------------------------------------------------

/**
 * Map a JSON Schema property definition to a Ficta type string.
 * @param {string} name - Property name
 * @param {object} prop - JSON Schema property object
 * @returns {string|null} Ficta type, or null if the property should be skipped
 */
function mapPropToFictaType(name, prop) {
  if (!prop || typeof prop !== 'object') return 'word';

  const type = prop.type;
  const format = prop.format || '';

  // Skip array and nested object types (not representable as flat columns)
  if (type === 'array') return null;
  if (type === 'object') return null;

  // Enum → ficta enum type
  if (Array.isArray(prop.enum) && prop.enum.length > 0) {
    return `enum:${prop.enum.join('|')}`;
  }

  // Name-based hints (email / uuid / id)
  const lname = name.toLowerCase();
  if (/^(id|_id|uuid)$/.test(lname) && (type === 'string' && format === 'uuid')) {
    return 'uuid';
  }

  // Type + format mapping table
  if (type === 'string') {
    switch (format) {
      case 'email':
        return 'email';
      case 'uri':
      case 'url':
        return 'url';
      case 'uuid':
        return 'uuid';
      case 'date':
        return 'date';
      case 'date-time':
        return 'timestamp';
      case 'hostname':
        return 'domainName';
      case 'ipv4':
        return 'ip';
      case 'password':
        return 'password';
      default:
        return 'word';
    }
  }

  if (type === 'integer') return 'number';
  if (type === 'number') return 'price';
  if (type === 'boolean') return 'boolean';

  // Fallback for unknown / missing type
  return 'word';
}

// ---------------------------------------------------------------------------
// $ref resolver (one level deep)
// ---------------------------------------------------------------------------

/**
 * Attempt to resolve a $ref one level deep within an OpenAPI document.
 * Handles only local `#/components/schemas/<name>` references.
 *
 * @param {object} doc - The root OpenAPI document
 * @param {string} ref - The $ref string (e.g. "#/components/schemas/Address")
 * @returns {object|null} The referenced schema, or null if unresolvable
 */
function resolveRef(doc, ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return null;
  const parts = ref.slice(2).split('/');
  // eslint-disable-next-line no-prototype-builtins
  let node = doc;
  for (const part of parts) {
    if (node == null || typeof node !== 'object') return null;
    node = node[part];
  }
  return node || null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a single OpenAPI / JSON Schema component to Ficta column definitions.
 *
 * For OpenAPI 3.x: provide the root document and set `options.schemaName` to
 * target a specific entry in `components.schemas`.
 * For standalone JSON Schemas: pass the schema object directly (root-level
 * `properties` will be processed).
 *
 * Unresolvable `$ref` values are flagged with type `'word'` in the output.
 *
 * @param {object} openApiOrJsonSchema - Parsed OpenAPI 3.x or JSON Schema object
 * @param {object} [options]
 * @param {string} [options.schemaName] - Component schema name to process
 * @returns {Array<{name: string, type: string}>} Ficta column definitions
 */
export function fromOpenAPISchema(openApiOrJsonSchema, options = {}) {
  if (!openApiOrJsonSchema || typeof openApiOrJsonSchema !== 'object') {
    return [];
  }

  const doc = openApiOrJsonSchema;
  let schemaObj;

  // Determine which schema object to process
  if (options.schemaName) {
    // Look up explicitly named component schema in OpenAPI 3.x
    schemaObj = doc?.components?.schemas?.[options.schemaName];
    if (!schemaObj) return [];
  } else if (doc?.components?.schemas) {
    // Default to the first schema in components.schemas
    const firstKey = Object.keys(doc.components.schemas)[0];
    schemaObj = firstKey ? doc.components.schemas[firstKey] : null;
    if (!schemaObj) return [];
  } else if (doc?.properties) {
    // Standalone JSON Schema
    schemaObj = doc;
  } else {
    return [];
  }

  const properties = schemaObj.properties || {};
  const columnList = [];

  for (const [name, rawProp] of Object.entries(properties)) {
    // Resolve $ref one level deep
    let prop = rawProp;
    if (prop && typeof prop === 'object' && prop.$ref) {
      const resolved = resolveRef(doc, prop.$ref);
      prop = resolved || { type: 'string' }; // flag unresolved as word
    }

    const fictaType = mapPropToFictaType(name, prop);

    // Skip array/object types
    if (fictaType === null) continue;

    columnList.push({ name, type: fictaType });
  }

  return columnList;
}

/**
 * Convert all `components.schemas` entries in an OpenAPI 3.x document to a
 * `ficta.schema.json`-compatible object.
 *
 * @param {object} openApiDoc - Parsed OpenAPI 3.x document
 * @param {object} [options]
 * @param {number} [options.rows=100] - Default row count per table
 * @param {string} [options.dialect='postgres'] - SQL dialect
 * @returns {object} ficta.schema.json-compatible object
 */
export function openAPIToFictaSchema(openApiDoc, options = {}) {
  const { rows = 100, dialect = 'postgres' } = options;

  const schemas = openApiDoc?.components?.schemas;
  const tables = [];

  if (schemas && typeof schemas === 'object') {
    for (const schemaName of Object.keys(schemas)) {
      const columns = fromOpenAPISchema(openApiDoc, { schemaName });
      if (columns.length > 0) {
        tables.push({
          name: schemaName.toLowerCase(),
          rows,
          columns,
        });
      }
    }
  }

  return {
    dialect,
    defaultRows: rows,
    tables,
  };
}
