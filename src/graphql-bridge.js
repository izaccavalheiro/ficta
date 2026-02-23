/**
 * GraphQL SDL → Ficta Schema Bridge
 *
 * Universal — no Node.js built-ins. Parses a GraphQL SDL string using the
 * `graphql` package and converts object types to Ficta column definitions.
 * @module graphql-bridge
 */

import { parse } from 'graphql';

// ---------------------------------------------------------------------------
// GraphQL scalar / type name → Ficta type mapping
// ---------------------------------------------------------------------------

/**
 * Map a GraphQL field's type information to a Ficta type string.
 *
 * @param {string} fieldName - Field name (used for name-hint resolution)
 * @param {string} typeName  - Resolved base GraphQL type name
 * @param {object} enumMap   - Map of enum type names → concatenated string e.g. 'ACTIVE|INACTIVE'
 * @returns {string} Ficta type
 */
function mapGqlType(fieldName, typeName, enumMap) {
  const lname = fieldName.toLowerCase();

  // Name hints (applied first, same precedence as NAME_HINTS in ddl-parser.js)
  if (/\bemail\b/.test(lname)) return 'email';
  if (/\burl\b|\bwebsite\b|\bhomepage\b/.test(lname)) return 'url';
  if (/uuid|guid/.test(lname)) return 'uuid';
  if (/\bfirst_?name\b/.test(lname)) return 'firstName';
  if (/\blast_?name\b/.test(lname)) return 'lastName';
  if (/\bfull_?name\b|\bname\b/.test(lname)) return 'fullName';
  if (/\bjob_?title\b/.test(lname)) return 'jobTitle';
  if (/\bphone\b|\bmobile\b/.test(lname)) return 'phone';
  if (/\bstreet\b|\baddress\b/.test(lname)) return 'street';
  if (/\bcity\b/.test(lname)) return 'city';
  if (/\bcountry\b/.test(lname)) return 'country';
  if (/\bcompany\b/.test(lname)) return 'company';

  // Enum type
  if (enumMap[typeName]) {
    return `enum:${enumMap[typeName]}`;
  }

  // Built-in GraphQL scalars
  switch (typeName) {
    case 'ID':
      return 'uuid';
    case 'String':
      return 'word';
    case 'Int':
      return 'number';
    case 'Float':
      return 'price';
    case 'Boolean':
      return 'boolean';
    // Custom scalars commonly found in GraphQL schemas
    case 'EmailAddress':
      return 'email';
    case 'URL':
      return 'url';
    case 'DateTime':
    case 'Date':
      return 'timestamp';
    default:
      // Unknown scalar / complex type → fallback
      return 'word';
  }
}

// ---------------------------------------------------------------------------
// SDL parsing helpers
// ---------------------------------------------------------------------------

/**
 * Extract the base type name from a GraphQL type node, unwrapping NonNull and
 * List wrappers.
 *
 * @param {object} typeNode - GraphQL AST type node
 * @returns {{ name: string, isList: boolean, isNonNull: boolean }}
 */
function unwrapType(typeNode) {
  let isNonNull = false;
  let isList = false;
  let node = typeNode;

  if (node.kind === 'NonNullType') {
    isNonNull = true;
    node = node.type;
  }

  if (node.kind === 'ListType') {
    isList = true;
  }

  // Find the innermost named type
  while (node.kind === 'ListType' || node.kind === 'NonNullType') {
    node = node.type;
  }

  return {
    name: node.kind === 'NamedType' ? node.name.value : /* istanbul ignore next */ '',
    isList,
    isNonNull,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert fields from a GraphQL SDL object type to Ficta column definitions.
 *
 * Mapping rules:
 * - `ID`           → 'uuid'
 * - `String`       → 'word' (overridden by name hints)
 * - `Int`          → 'number'
 * - `Float`        → 'price'
 * - `Boolean`      → 'boolean'
 * - `EmailAddress` → 'email'
 * - `URL`          → 'url'
 * - `DateTime`/`Date` → 'timestamp'
 * - Enum type      → 'enum:VALUE1|VALUE2|…'
 * - List type      → skipped (not representable as a flat column)
 *
 * Non-null fields produce `nullable: false`; all others `nullable: true`.
 *
 * @param {string} sdlString - GraphQL SDL document as a string
 * @param {object} [options]
 * @param {string} [options.typeName] - Object type to process (defaults to first)
 * @returns {Array<{name: string, type: string, nullable: boolean}>}
 * @throws {Error} If sdlString is not valid GraphQL SDL
 */
export function fromGraphQLSDL(sdlString, options = {}) {
  if (typeof sdlString !== 'string' || sdlString.trim() === '') {
    throw new Error('fromGraphQLSDL: sdlString must be a non-empty string');
  }

  let document;
  try {
    document = parse(sdlString);
  } catch (err) {
    throw new Error(`fromGraphQLSDL: invalid SDL — ${err.message}`);
  }

  // Collect enum definitions first so object type processing can reference them
  const enumMap = {}; // { TypeName: 'VALUE1|VALUE2|...' }
  for (const def of document.definitions) {
    if (def.kind === 'EnumTypeDefinition') {
      /* istanbul ignore next */
      const values = (def.values || []).map(v => v.name.value);
      enumMap[def.name.value] = values.join('|');
    }
  }

  // Find the targeted object type
  let targetDef = null;
  if (options.typeName) {
    targetDef = document.definitions.find(
      d => d.kind === 'ObjectTypeDefinition' && d.name.value === options.typeName
    );
  } else {
    targetDef = document.definitions.find(d => d.kind === 'ObjectTypeDefinition');
  }

  if (!targetDef) return [];

  const columns = [];
  /* istanbul ignore next */
  for (const field of targetDef.fields || []) {
    const { name: typeName, isList, isNonNull } = unwrapType(field.type);

    // Skip list types — not representable as flat columns
    if (isList) continue;

    const fictaType = mapGqlType(field.name.value, typeName, enumMap);
    columns.push({
      name: field.name.value,
      type: fictaType,
      nullable: !isNonNull,
    });
  }

  return columns;
}

/**
 * Convert all object types in a GraphQL SDL document to a
 * `ficta.schema.json`-compatible object.
 *
 * @param {string} sdlString - GraphQL SDL document as a string
 * @param {object} [options]
 * @param {number} [options.rows=100] - Default row count per table
 * @param {string} [options.dialect='postgres'] - SQL dialect
 * @returns {object} ficta.schema.json-compatible object
 * @throws {Error} If sdlString is not valid GraphQL SDL
 */
export function graphQLToFictaSchema(sdlString, options = {}) {
  const { rows = 100, dialect = 'postgres' } = options;

  if (typeof sdlString !== 'string' || sdlString.trim() === '') {
    throw new Error('graphQLToFictaSchema: sdlString must be a non-empty string');
  }

  let document;
  try {
    document = parse(sdlString);
  } catch (err) {
    throw new Error(`graphQLToFictaSchema: invalid SDL — ${err.message}`);
  }

  // Collect enum definitions
  const enumMap = {};
  for (const def of document.definitions) {
    if (def.kind === 'EnumTypeDefinition') {
      /* istanbul ignore next */
      const values = (def.values || []).map(v => v.name.value);
      enumMap[def.name.value] = values.join('|');
    }
  }

  const tables = [];
  for (const def of document.definitions) {
    if (def.kind !== 'ObjectTypeDefinition') continue;

    const columns = [];
    /* istanbul ignore next */
    for (const field of def.fields || []) {
      const { name: typeName, isList, isNonNull } = unwrapType(field.type);
      if (isList) continue;
      const fictaType = mapGqlType(field.name.value, typeName, enumMap);
      columns.push({ name: field.name.value, type: fictaType, nullable: !isNonNull });
    }

    if (columns.length > 0) {
      tables.push({
        name: def.name.value.toLowerCase(),
        rows,
        columns,
      });
    }
  }

  return { dialect, defaultRows: rows, tables };
}
