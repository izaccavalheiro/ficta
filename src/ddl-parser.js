/**
 * DDL Parser - Pure SQL DDL → Ficta TableDef converter
 *
 * Zero side effects. No Node.js APIs. Works in browser and Node.js.
 * @module ddl-parser
 */

// ---------------------------------------------------------------------------
// Column name → Ficta type hints (highest priority)
// ---------------------------------------------------------------------------
const NAME_HINTS = [
  // IDs
  [/^(id|_id|pk)$/i, 'autoIncrement'],
  [/uuid|guid/i, 'uuid'],

  // Person
  [/\bfirst_?name\b/i, 'firstName'],
  [/\blast_?name\b/i, 'lastName'],
  [/\bfull_?name\b|\bname\b/i, 'fullName'],
  [/\bjob_?title\b/i, 'jobTitle'],      // job_title / jobTitle only
  [/\btitle\b/i, 'sentence'],            // generic title → descriptive text
  [/\bprefix\b/i, 'prefix'],
  [/\bsuffix\b/i, 'suffix'],

  // Internet / auth
  [/\bemail\b/i, 'email'],
  [/\busername\b|\buser_?name\b/i, 'username'],
  [/\bpassword\b|\bpwd\b|\bhash\b/i, 'password'],
  [/\burl\b|\bwebsite\b|\bhomepage\b/i, 'url'],
  [/\bip(v4)?\b|\bip_?address\b/i, 'ipv4'],
  [/\buser_?agent\b/i, 'userAgent'],

  // Phone
  [/\bphone\b|\bmobile\b|\bfax\b|\btelephone\b/i, 'phone'],

  // Address
  [/\bstreet\b|\baddress1?\b/i, 'street'],
  [/\bcity\b|\btown\b/i, 'city'],
  [/\bstate\b|\bprovince\b|\bregion\b/i, 'state'],
  [/\bcountry\b/i, 'country'],
  [/\bzip\b|\bpostal_?code\b|\bpost_?code\b|\bpostal\b/i, 'zipCode'],
  [/\blat(itude)?\b/i, 'latitude'],
  [/\blo[ng]+itude?\b|\blng\b|\blon\b/i, 'longitude'],

  // Company
  [/\bcompany\b|\borganiz\b|\bfirm\b/i, 'company'],
  [/\bdep(art)?ment\b/i, 'department'],

  // Commerce / Finance
  [/\bprice\b|\bcost\b/i, 'price'],
  [/\bamount\b|\btotal\b|\bbalance\b/i, 'amount'],
  [/\biban\b/i, 'iban'],
  [/\bcard_?number\b|\bcredit_?card\b/i, 'creditCardNumber'],
  [/\baccount_?number\b|\baccount_?no\b/i, 'accountNumber'],
  [/\bcurrency\b|\bcurr\b/i, 'currency'],

  // Dates/time
  [/created_?at|registered|signup|joined/i, 'timestamp'],
  [/updated_?at|modified_?at|last_?updated/i, 'timestamp'],
  [/deleted_?at|archived_?at/i, 'timestamp'],
  [/\bbirthdate\b|\bbirth_?day\b|\bdob\b/i, 'pastDate'],
  [/\bexpires?(_?at|_?on|_?date)?\b/i, 'futureDate'],
  [/\bdate\b/i, 'pastDate'],
  [/\btimestamp\b|\btime\b/i, 'timestamp'],

  // Text
  [/\bdesc(ription)?\b|\bsummary\b|\bnotes?\b|\bcontent\b/i, 'sentence'],
  [/\bbio\b|\babout\b|\bdetails\b/i, 'paragraph'],

  // Boolean flags
  [/\bis_\w+|\bhas_\w+|\bactive\b|\benabled\b|\bflag\b/i, 'boolean'],

  // Colour
  [/\bcolou?r\b/i, 'color'],

  // JSON / metadata
  [/\bjson\b|\bmeta(data)?\b|\bconfig\b|\bsettings\b|\bproperties\b/i, 'json'],

  // Product
  [/\bproduct_?name\b|\bitem_?name\b/i, 'product'],
  [/\bproduct_?desc\b/i, 'productDescription'],

  // Generic fallbacks kept last
  [/\bslug\b|\bcode\b|\bkey\b|\btoken\b|\bref\b/i, 'word'],
];

// ---------------------------------------------------------------------------
// SQL base type → Ficta type fallbacks (second priority)
// ---------------------------------------------------------------------------
const SQL_TYPE_FALLBACKS = [
  [/^(serial4?|bigserial|smallserial)$/i, 'autoIncrement'],
  [/^int(eger)?$|^int[248]$|^bigint$|^smallint$|^tinyint$/i, 'number'],
  [/^(bool(ean)?)$|^tinyint\(1\)$/i, 'boolean'],
  [/^(double(\s+precision)?|float[48]?|real|numeric|decimal)$/i, 'float'],
  [/^(uuid|uniqueidentifier)$/i, 'uuid'],
  [/^(datetime|timestamp(\s+with(out)?\s+time\s+zone)?)/i, 'timestamp'],
  [/^date$/i, 'pastDate'],
  [/^time$/i, 'timestamp'],
  [/^(json|jsonb)$/i, 'json'],
  [/^(text|tinytext|mediumtext|longtext|clob|ntext)$/i, 'sentence'],
  [/^(char|nchar)\(/i, 'word'],
  [/^(varchar|nvarchar|character\s+varying)\(/i, 'word'],
  [/^varchar$/i, 'word'],
  [/^(blob|binary|varbinary|bytea)$/i, 'word'],
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Strip SQL comments from a string.
 * Handles single-line (--) and block (/* * /) comments.
 * @param {string} sql
 * @returns {string}
 */
function stripComments(sql) {
  // Block comments /* ... */  (non-greedy, dot matches newline)
  let result = sql.replace(/\/\*[\s\S]*?\*\//g, ' ');
  // Single-line comments -- ...
  result = result.replace(/--[^\r\n]*/g, '');
  return result;
}

/**
 * Unquote a SQL identifier (removes backticks or double-quotes).
 * @param {string} id
 * @returns {string}
 */
function unquoteIdentifier(id) {
  return id.replace(/^[`"]|[`"]$/g, '').trim();
}

/**
 * Split a CREATE TABLE body (the text inside the outer parentheses) into
 * individual clause strings, respecting nested parentheses.
 * @param {string} body
 * @returns {string[]}
 */
function splitClauses(body) {
  const clauses = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '(') {
      depth++;
      current += ch;
    } else if (ch === ')') {
      depth--;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) clauses.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }

  const trimmed = current.trim();
  if (trimmed) clauses.push(trimmed);
  return clauses;
}

/**
 * Extract the text between the outermost balanced parentheses.
 * Returns null if none found.
 * @param {string} str
 * @returns {string|null}
 */
function extractOuterParens(str) {
  const start = str.indexOf('(');
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < str.length; i++) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') {
      depth--;
      if (depth === 0) return str.slice(start + 1, i);
    }
  }
  return null;
}

/**
 * Resolve a column name + raw SQL type to a Ficta type.
 * Two-layer resolution: name hints first, then SQL type fallback.
 * @param {string} colName
 * @param {string} sqlBaseType  - e.g. 'VARCHAR(255)', 'INT', 'SERIAL'
 * @param {boolean} isAutoIncrement
 * @param {string[]|null} enumValues
 * @returns {string}
 */
function resolveType(colName, sqlBaseType, isAutoIncrement, enumValues) {
  if (isAutoIncrement) return 'autoIncrement';

  if (enumValues && enumValues.length > 0) {
    return `enum:${enumValues.join('|')}`;
  }

  // Layer 1: column name hints
  for (const [pattern, fictaType] of NAME_HINTS) {
    if (pattern.test(colName)) return fictaType;
  }

  // Layer 2: SQL type fallback — strip length/precision for matching
  const baseOnly = sqlBaseType.trim().replace(/\s*\(.*$/, '');
  for (const [pattern, fictaType] of SQL_TYPE_FALLBACKS) {
    if (pattern.test(sqlBaseType.trim()) || pattern.test(baseOnly)) return fictaType;
  }

  return 'word'; // ultimate fallback
}

/**
 * Parse ENUM values from a SQL type string like ENUM('a','b','c').
 * @param {string} typeStr
 * @returns {string[]|null}
 */
function parseEnumValues(typeStr) {
  const match = typeStr.match(/^enum\s*\(([\s\S]+)\)$/i);
  if (!match) return null;
  const inner = match[1];
  const values = [];
  const re = /'((?:[^']|'')*)'/g;
  let m;
  while ((m = re.exec(inner)) !== null) {
    values.push(m[1].replace(/''/g, "'"));
  }
  return values.length > 0 ? values : null;
}

/**
 * Parse a single column clause into a column definition object.
 * Returns null if the clause is a table constraint (PRIMARY KEY, INDEX, etc.)
 * @param {string} clause
 * @returns {Object|null}
 */
function parseColumnClause(clause) {
  const trimmed = clause.trim();

  // Table-level constraints — handled separately
  if (/^(PRIMARY\s+KEY|UNIQUE\s+(KEY\s+|INDEX\s+)?\w*\s*\(|KEY\s+|INDEX\s+|CONSTRAINT\s+)/i.test(trimmed)) {
    return null;
  }

  // Identify column name — first quoted or unquoted identifier
  const nameMatch = trimmed.match(/^([`"]?\w+[`"]?)/);
  if (!nameMatch) return null;

  const name = unquoteIdentifier(nameMatch[1]);
  const rest = trimmed.slice(nameMatch[0].length).trim();

  // Extract SQL type — everything up to a keyword boundary or constraint
  // Be careful: type can contain parens e.g. VARCHAR(255), DECIMAL(10,2), ENUM(...)
  let typeStr = '';
  let depth = 0;
  let i = 0;
  for (; i < rest.length; i++) {
    const ch = rest[i];
    if (ch === '(') { depth++; typeStr += ch; }
    else if (ch === ')') { depth--; typeStr += ch; }
    else if (depth === 0) {
      // Stop at keywords that are not part of the type
      const remaining = rest.slice(i).trimStart();
      if (/^(NOT\s+NULL|NULL\b|DEFAULT\b|AUTO_INCREMENT\b|AUTOINCREMENT\b|GENERATED\b|PRIMARY\s+KEY\b|UNIQUE\b|CHECK\s*\(|REFERENCES\b|ON\s+(UPDATE|DELETE)\b|COMMENT\b|CHARACTER\s+SET\b|COLLATE\b)/i.test(remaining)) {
        break;
      }
      typeStr += ch;
    } else {
      typeStr += ch;
    }
  }
  typeStr = typeStr.trim();

  const afterType = rest.slice(i).trim().toUpperCase();

  const isAutoIncrement = /\bAUTO_?INCREMENT\b|\bSERIAL\b|\bGENERATED\b.*\bIDENTITY\b|\bIDENTITY\b/i.test(rest);
  const isNotNull = /\bNOT\s+NULL\b/i.test(rest);
  const isUnique = /\bUNIQUE\b/i.test(rest);
  const isPrimaryKey = /\bPRIMARY\s+KEY\b/i.test(rest);

  // DEFAULT value extraction
  let defaultValue = null;
  const defaultMatch = rest.match(/\bDEFAULT\s+((?:'(?:[^']|'')*'|[^\s,]+))/i);
  if (defaultMatch) {
    defaultValue = defaultMatch[1].replace(/^'(.*)'$/, '$1');
  }

  // REFERENCES (inline FK)
  let inlineRef = null;
  const refMatch = rest.match(/\bREFERENCES\s+[`"]?(\w+)[`"]?\s*\(\s*[`"]?(\w+)[`"]?\s*\)/i);
  if (refMatch) {
    inlineRef = { column: name, refTable: refMatch[1], refColumn: refMatch[2] };
  }

  const enumValues = parseEnumValues(typeStr);
  const fictaType = resolveType(name, typeStr, isAutoIncrement, enumValues);

  return {
    name,
    sqlType: typeStr.toUpperCase(),
    fictaType,
    nullable: !isNotNull,
    autoIncrement: isAutoIncrement,
    primaryKey: isPrimaryKey,
    unique: isUnique,
    defaultValue,
    enumValues,
    _inlineRef: inlineRef,
  };
}

/**
 * Parse table-level PRIMARY KEY clause, returning array of column names.
 * @param {string} clause
 * @returns {string[]|null}
 */
function parsePrimaryKeyClause(clause) {
  const match = clause.match(/^(?:CONSTRAINT\s+[`"]?\w+[`"]?\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
  if (!match) return null;
  return match[1].split(',').map(c => unquoteIdentifier(c.trim()));
}

/**
 * Parse a CONSTRAINT ... FOREIGN KEY clause.
 * Returns array of FK objects.
 * @param {string} clause
 * @returns {Array<{column:string,refTable:string,refColumn:string}>}
 */
function parseForeignKeyClause(clause) {
  // CONSTRAINT name FOREIGN KEY (col) REFERENCES table(col)
  const match = clause.match(
    /FOREIGN\s+KEY\s*\(\s*([^)]+)\)\s*REFERENCES\s+[`"]?(\w+)[`"]?\s*\(\s*([^)]+)\s*\)/i
  );
  if (!match) return [];

  const columns = match[1].split(',').map(c => unquoteIdentifier(c.trim()));
  const refTable = match[2];
  const refColumns = match[3].split(',').map(c => unquoteIdentifier(c.trim()));

  return columns.map((col, idx) => ({
    column: col,
    refTable,
    refColumn: refColumns[idx] || refColumns[0],
  }));
}

/**
 * Extract the table name from a CREATE TABLE statement.
 * @param {string} stmt
 * @returns {string|null}
 */
function extractTableName(stmt) {
  const match = stmt.match(/CREATE\s+(?:TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?/i);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse one or more SQL CREATE TABLE statements into an array of TableDef objects.
 *
 * Handles:
 * - SQL comments (single-line `--` and block `/* ... *\/` styles)
 * - Quoted identifiers (backtick and double-quote)
 * - Inline and table-level `FOREIGN KEY ... REFERENCES` syntax
 * - `AUTO_INCREMENT`, `SERIAL`, `IDENTITY` variants
 * - `ENUM('a','b','c')` column types
 * - Inline and table-level `PRIMARY KEY`
 * - `NOT NULL`, `DEFAULT`, `UNIQUE`
 *
 * @param {string} ddlString - Raw SQL DDL string containing CREATE TABLE statements
 * @returns {Array<{
 *   tableName: string,
 *   columns: Array<{
 *     name: string,
 *     sqlType: string,
 *     fictaType: string,
 *     nullable: boolean,
 *     autoIncrement: boolean,
 *     defaultValue: string|null,
 *     enumValues: string[]|null
 *   }>,
 *   primaryKey: string[]|null,
 *   foreignKeys: Array<{column: string, refTable: string, refColumn: string}>
 * }>} Array of table definitions
 *
 * @example
 * const tables = parseDDL(`
 *   CREATE TABLE users (
 *     id SERIAL PRIMARY KEY,
 *     email VARCHAR(255) NOT NULL,
 *     created_at TIMESTAMP
 *   );
 * `);
 */
export function parseDDL(ddlString) {
  if (typeof ddlString !== 'string' || !ddlString.trim()) {
    throw new Error('parseDDL requires a non-empty DDL string');
  }

  const cleaned = stripComments(ddlString);

  // Split into individual statements on semicolons (respecting parens)
  const statements = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '(') { depth++; current += ch; }
    else if (ch === ')') { depth--; current += ch; }
    else if (ch === ';' && depth === 0) {
      const t = current.trim();
      if (t) statements.push(t);
      current = '';
    } else {
      current += ch;
    }
  }
  const t = current.trim();
  if (t) statements.push(t);

  const tables = [];

  for (const stmt of statements) {
    if (!/CREATE\s+(?:TEMPORARY\s+)?TABLE/i.test(stmt)) continue;

    const tableName = extractTableName(stmt);
    if (!tableName) continue;

    const body = extractOuterParens(stmt);
    if (!body) continue;

    const clauses = splitClauses(body);

    const columns = [];
    const foreignKeys = [];
    let primaryKey = null;

    for (const clause of clauses) {
      const trimmed = clause.trim();

      // Table-level PRIMARY KEY
      if (/^(?:CONSTRAINT\s+[`"]?\w+[`"]?\s+)?PRIMARY\s+KEY\b/i.test(trimmed)) {
        const pk = parsePrimaryKeyClause(trimmed);
        if (pk) primaryKey = pk;
        continue;
      }

      // Table-level FOREIGN KEY
      if (/FOREIGN\s+KEY/i.test(trimmed)) {
        const fks = parseForeignKeyClause(trimmed);
        foreignKeys.push(...fks);
        continue;
      }

      // Table-level UNIQUE / INDEX / KEY / CHECK — skip
      if (/^(UNIQUE\s+(KEY\s+|INDEX\s+)?\w*\s*\(|KEY\s+|INDEX\s+|CHECK\s*\()/i.test(trimmed)) {
        continue;
      }

      // Named UNIQUE constraints — skip gracefully
      if (/^CONSTRAINT\s+[`"]?\w+[`"]?\s+UNIQUE\b/i.test(trimmed)) {
        continue;
      }

      const col = parseColumnClause(trimmed);
      if (!col) continue;

      // Collect inline FK references
      if (col._inlineRef) {
        foreignKeys.push(col._inlineRef);
      }

      // Collect inline PRIMARY KEY declarations
      if (col.primaryKey) {
        if (!primaryKey) primaryKey = [];
        if (!primaryKey.includes(col.name)) primaryKey.push(col.name);
      }

      // Clean private fields before exposing
      const { _inlineRef, primaryKey: _pk, unique: _uq, ...publicCol } = col;
      columns.push(publicCol);
    }

    // If no explicit PK found, check for autoIncrement column (common convention)
    if (!primaryKey) {
      const aiCol = columns.find(c => c.autoIncrement);
      if (aiCol) primaryKey = [aiCol.name];
    }

    tables.push({
      tableName,
      columns,
      primaryKey: primaryKey || null,
      foreignKeys,
    });
  }

  if (tables.length === 0) {
    throw new Error('No valid CREATE TABLE statements found in the provided DDL');
  }

  return tables;
}

/**
 * Sort an array of TableDef objects in dependency order so that tables
 * referenced via FOREIGN KEY are placed before the tables that reference them.
 * Uses Kahn's topological sort algorithm.
 *
 * Throws if circular dependencies are detected.
 *
 * @param {Array<{tableName: string, foreignKeys: Array<{refTable: string}>}>} tables
 * @returns {Array} The same tables in dependency-resolved order
 *
 * @example
 * const ordered = orderByDependencies(parseDDL(ddl));
 * // 'users' comes before 'orders' if orders.user_id → users.id
 */
export function orderByDependencies(tables) {
  const nameToTable = new Map(tables.map(t => [t.tableName, t]));
  const inDegree = new Map(tables.map(t => [t.tableName, 0]));
  const adjList = new Map(tables.map(t => [t.tableName, []]));

  for (const table of tables) {
    const seenRefs = new Set();
    for (const fk of table.foreignKeys) {
      if (fk.refTable === table.tableName) continue; // self-ref
      if (!nameToTable.has(fk.refTable)) continue;   // external ref, skip
      if (seenRefs.has(fk.refTable)) continue;
      seenRefs.add(fk.refTable);

      // refTable → table (refTable must come first)
      adjList.get(fk.refTable).push(table.tableName);
      inDegree.set(table.tableName, inDegree.get(table.tableName) + 1);
    }
  }

  // Kahn's algorithm
  const queue = tables
    .filter(t => inDegree.get(t.tableName) === 0)
    .map(t => t.tableName);

  const sorted = [];

  while (queue.length > 0) {
    const current = queue.shift();
    sorted.push(nameToTable.get(current));

    for (const neighbor of adjList.get(current)) {
      const newDegree = inDegree.get(neighbor) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  if (sorted.length !== tables.length) {
    const remaining = tables
      .filter(t => !sorted.includes(t))
      .map(t => t.tableName);
    throw new Error(`Circular foreign key dependency detected among tables: ${remaining.join(', ')}`);
  }

  return sorted;
}
