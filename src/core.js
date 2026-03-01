// Ficta Core - Works in any JavaScript environment
// No Node.js or browser-specific dependencies

import { resolveDependencyOrder, resolveDependentValue, autoWireGeographicDependencies } from './dependencies.js';
import { sampleFromDistribution } from './distributions.js';

/**
 * @typedef {Object} SchemaColumn
 * @property {string} name - Column name
 * @property {string} type - Ficta type (e.g. 'autoIncrement', 'email', 'range:1-100')
 * @property {boolean} [primaryKey] - Whether this column is a primary key
 * @property {boolean} [nullable] - Whether this column allows NULL
 * @property {boolean} [unique] - Whether this column has a UNIQUE constraint
 * @property {string|number|boolean} [default] - Default value
 * @property {{table:string, column:string}} [references] - FK reference
 * @property {string} [sqlType] - SQL type override for DDL
 * @property {{column:string, mapping?:Record<string,string[]>}|false} [depends] - Cross-column dependency config, or false to opt out of auto-wiring
 * @property {{type:'uniform'|'normal'|'exponential'|'zipf', min?:number, max?:number, mean?:number, stddev?:number, lambda?:number, n?:number, s?:number}} [distribution] - Statistical distribution applied during value generation
 * @property {string} [constraint] - Extra constraint expression (reserved)
 */

// Faker.js instance - set externally via setFaker()
let fakerInstance = null;

// Get faker instance (lazy initialization)
export function getFaker() {
  if (!fakerInstance) {
    throw new Error('Faker.js not initialized. Import faker or call setFaker()');
  }
  return fakerInstance;
}

// Set faker instance for testing or custom configuration
export function setFaker(faker) {
  fakerInstance = faker;
}

/**
 * Set the locale on the current Faker instance.
 *
 * Locale resets are not guaranteed to persist across major Faker version
 * upgrades (e.g. v8 → v9 changed the locale API). The caller is responsible
 * for reverting the locale if needed after generation.
 *
 * Faker v9+: calls `fakerInstance.setLocale(locale)` when that method exists.
 * Faker v8 and below: sets `fakerInstance.locale = locale` directly.
 *
 * @param {string} locale - A Faker.js locale string (e.g. 'fr', 'de', 'pt_BR')
 * @throws {Error} If Faker has not been initialised via setFaker()
 */
export function setLocale(locale) {
  if (!fakerInstance) {
    throw new Error('Faker.js not initialized. Call setFaker() before setLocale()');
  }
  if (typeof fakerInstance.setLocale === 'function') {
    fakerInstance.setLocale(locale);
  } else {
    fakerInstance.locale = locale;
  }
}

/**
 * Seed the Faker instance for reproducible output.
 * @param {number} seed - Integer seed value
 */
export function seedFaker(seed) {
  if (!fakerInstance) {
    throw new Error('Faker.js not initialized. Call setFaker() before seedFaker()');
  }
  fakerInstance.seed(seed);
}

// Available Faker data types mapped to their generators
export const fakerTypes = {
  // Person
  firstName: () => getFaker().person.firstName(),
  lastName: () => getFaker().person.lastName(),
  fullName: () => getFaker().person.fullName(),
  jobTitle: () => getFaker().person.jobTitle(),
  prefix: () => getFaker().person.prefix(),
  suffix: () => getFaker().person.suffix(),
  
  // Internet
  email: () => getFaker().internet.email(),
  username: () => getFaker().internet.username(),
  password: () => getFaker().internet.password(),
  url: () => getFaker().internet.url(),
  ipv4: () => getFaker().internet.ipv4(),
  userAgent: () => getFaker().internet.userAgent(),
  
  // Phone
  phone: () => getFaker().phone.number(),
  
  // Address
  street: () => getFaker().location.streetAddress(),
  city: () => getFaker().location.city(),
  state: () => getFaker().location.state(),
  country: () => getFaker().location.country(),
  zipCode: () => getFaker().location.zipCode(),
  latitude: () => getFaker().location.latitude(),
  longitude: () => getFaker().location.longitude(),
  
  // Company
  company: () => getFaker().company.name(),
  department: () => getFaker().commerce.department(),
  
  // Commerce
  product: () => getFaker().commerce.productName(),
  price: () => getFaker().commerce.price({ min: 10, max: 1000, dec: 2 }),
  productDescription: () => getFaker().commerce.productDescription(),
  
  // Finance
  amount: () => getFaker().finance.amount({ min: 5, max: 5000, dec: 2 }),
  accountNumber: () => getFaker().finance.accountNumber(),
  iban: () => getFaker().finance.iban(),
  creditCardNumber: () => getFaker().finance.creditCardNumber(),
  currency: () => getFaker().finance.currencyCode(),
  
  // Date
  pastDate: () => getFaker().date.past({ years: 2 }).toISOString().split('T')[0],
  futureDate: () => getFaker().date.future({ years: 1 }).toISOString().split('T')[0],
  recentDate: () => getFaker().date.recent({ days: 30 }).toISOString().split('T')[0],
  timestamp: () => getFaker().date.recent().toISOString(),
  
  // Numbers
  number: () => getFaker().number.int({ min: 1, max: 10000 }),
  float: () => getFaker().number.float({ min: 0, max: 100, fractionDigits: 2 }),
  
  // Text
  word: () => getFaker().word.words(1),
  words: () => getFaker().word.words(5),
  sentence: () => getFaker().lorem.sentence(),
  paragraph: () => getFaker().lorem.paragraph(),
  
  // IDs
  uuid: () => getFaker().string.uuid(),
  nanoid: () => getFaker().string.nanoid(),
  
  // Boolean
  boolean: () => getFaker().datatype.boolean(),

  // JSON
  json: () => JSON.stringify(getFaker().helpers.multiple(() => ({
    key: getFaker().word.sample(),
    value: getFaker().word.sample()
  }), { count: { min: 1, max: 3 } })),
  
  // Special
  color: () => getFaker().color.human(),
  emoji: () => getFaker().internet.emoji(),

  // Aliases — map intuitive names to appropriate Faker outputs
  string:  () => getFaker().word.sample(),
  text:    () => getFaker().lorem.sentence(),
  integer: () => getFaker().number.int({ min: 1, max: 10000 }),
  int:     () => getFaker().number.int({ min: 1, max: 10000 }),
  date:    () => getFaker().date.recent().toISOString().split('T')[0],

  // Auto increment
  autoIncrement: null // Handled specially
};

// Predefined templates
export const templates = {
  users: {
    columns: 'id:autoIncrement,firstName,lastName,email,phone,company,jobTitle,registeredDate:pastDate',
    rows: 100
  },
  products: {
    columns: 'sku:autoIncrement,name:product,category:department,price,stock:number,description:productDescription',
    rows: 100
  },
  transactions: {
    columns: 'id:uuid,date:timestamp,customerId:number,amount,currency,status:word,paymentMethod:word',
    rows: 100
  },
  addresses: {
    columns: 'id:autoIncrement,street,city,state,zipCode,country,lat:latitude,lng:longitude',
    rows: 100
  },
  contacts: {
    columns: 'id:autoIncrement,fullName,email,phone,company,jobTitle,website:url',
    rows: 100
  }
};

/**
 * Parse column definitions
 * @param {string} columnString - Column definitions (name:type,name:type,...)
 * @returns {Array} Array of column objects
 */
export function parseColumns(columnString) {
  const columns = columnString.split(',').map(col => {
    const colonIndex = col.trim().indexOf(':');
    if (colonIndex === -1) {
      return { name: col.trim(), type: 'word' };
    }
    const name = col.trim().substring(0, colonIndex).trim();
    const type = col.trim().substring(colonIndex + 1).trim();
    return { name, type };
  });
  return columns;
}

/**
 * Convert a legacy column definition string to an array of SchemaColumn objects.
 * @param {string} columnString - Column definitions (name:type,name:type,...)
 * @returns {SchemaColumn[]} Array of SchemaColumn objects
 */
export function columnStringToSchema(columnString) {
  return parseColumns(columnString).map(({ name, type }) => ({ name, type }));
}

/**
 * Convert an array of SchemaColumn objects back to a column definition string.
 * Only `name` and `type` are used; extended metadata fields are dropped.
 * @param {SchemaColumn[]} schemaColumns
 * @returns {string} Column definition string
 */
export function schemaToColumnString(schemaColumns) {
  return schemaColumns.map(col => `${col.name}:${col.type}`).join(',');
}

/**
 * Generate data for a single row
 * @param {Array} columns - Column definitions
 * @param {number} index - Row index
 * @returns {Object} Row data
 */
export function generateRow(columns, index) {
  const row = {};

  // Resolve dependency ordering once per row call.
  const { independent, dependent } = resolveDependencyOrder(columns);

  // ---- Pass 1: independent columns ----------------------------------------
  for (const col of independent) {
    const rng = () => getFaker().number.float({ min: 0, max: 1 });
    row[col.name] = _generateValue(col, index, rng);
  }

  // ---- Pass 2: dependent columns (in dependency-resolved order) -----------
  for (const col of dependent) {
    const rng = () => getFaker().number.float({ min: 0, max: 1 });
    const resolved = resolveDependentValue(col, row, rng);
    row[col.name] = resolved !== null ? resolved : _generateValue(col, index, rng);
  }

  return row;
}

/**
 * Generate a single column value (ignores `depends`).
 * @private
 * @param {Object} col - SchemaColumn
 * @param {number} index - 0-based row index
 * @param {() => number} [rng] - Uniform [0,1) RNG (defaults to Math.random)
 */
function _generateValue(col, index, rng = Math.random) {
  if (col.type === 'autoIncrement') {
    return index + 1;
  } else if (col.type.startsWith('static:')) {
    // Static value: static:SomeValue
    return col.type.replace('static:', '');
  } else if (col.type.startsWith('enum:')) {
    // Enum: enum:value1|value2|value3
    const values = col.type.replace('enum:', '').split('|');
    if (values.length === 0 || values.every(v => v === '')) {
      throw new Error(`enum type requires at least one value. Got: "${col.type}"`);
    }
    // If distribution is set (only zipf makes semantic sense for enums),
    // use the Zipf-sampled index to pick a value; rank 1 = values[0].
    if (col.distribution && col.distribution.type === 'zipf') {
      const { s = 1 } = col.distribution;
      const rank = sampleFromDistribution({ type: 'zipf', n: values.length, s, rng });
      return values[rank - 1]; // rank is 1-indexed
    }
    return getFaker().helpers.arrayElement(values);
  } else if (col.type.startsWith('range:')) {
    // Number range: range:1-100
    const [min, max] = col.type.replace('range:', '').split('-').map(Number);
    if (min > max) {
      throw new Error(`range min (${min}) must be less than or equal to max (${max}). Got: "${col.type}"`);
    }
    if (col.distribution) {
      // Apply the requested distribution; clamp result to [min, max].
      const raw = sampleFromDistribution({ ...col.distribution, min, max, rng });
      return Math.min(max, Math.max(min, Math.round(raw)));
    }
    return getFaker().number.int({ min, max });
  } else if (col.type.startsWith('pattern:')) {
    // Pattern: pattern:PRD-###### or pattern:user+{COUNTER}@example.com
    const pattern = col.type.replace('pattern:', '');
    let value = pattern;
    // Replace {COUNTER} with incrementing number
    value = value.replace(/\{COUNTER\}/g, index + 1);
    // Replace # with random digits
    value = value.replace(/#/g, () => getFaker().number.int({ min: 0, max: 9 }));
    return value;
  } else if (fakerTypes[col.type]) {
    // Numeric types that support distributions
    if (col.distribution) {
      const numericTypes = new Set(['number', 'float', 'price', 'amount', 'age', 'percentage', 'rating', 'score', 'temperature', 'weight', 'height']);
      if (numericTypes.has(col.type)) {
        const raw = sampleFromDistribution({ ...col.distribution, rng });
        return Number(raw.toFixed(2));
      }
    }
    return fakerTypes[col.type]();
  } else {
    return getFaker().word.words(2);
  }
}

/**
 * Generate data as array of objects
 * @param {Object} options - Generation options
 * @param {string} [options.columns] - Column definitions string
 * @param {SchemaColumn[]} [options.schema] - Structured schema columns (alternative to columns string)
 * @param {string} [options.template] - Template name (optional)
 * @param {number} [options.rows] - Number of rows to generate
 * @returns {Object} Object with records and metadata
 */
export function generateData(options) {
  // Resolve template if provided
  let columnString = options.columns;
  let rowCount = options.rows;
  
  if (options.template) {
    const template = templates[options.template];
    if (!template) {
      throw new Error(`Unknown template: ${options.template}. Available templates: ${Object.keys(templates).join(', ')}`);
    }
    // Use template columns if columns not explicitly provided and no schema object either
    if (!columnString && !options.schema) {
      columnString = template.columns;
    }
    // Use template rows as default if rows not specified
    if (!rowCount) {
      rowCount = template.rows;
    }
  }

  // Determine the canonical SchemaColumn[] to use
  let columns;
  if (options.schema && Array.isArray(options.schema) && options.schema.length > 0) {
    // Use schema object directly as canonical columns — shallow-clone to allow
    // auto-wiring without mutating the caller's array.
    columns = options.schema.map(c => ({ ...c }));
  } else if (columnString) {
    // Convert legacy column string to SchemaColumn[]
    columns = columnStringToSchema(columnString);
  } else {
    throw new Error('Either columns, schema, or template must be provided');
  }

  // Auto-wire implicit geographic dependencies (country→state, country→city)
  // on columns that don't already have an explicit `depends` field.
  autoWireGeographicDependencies(columns);

  const rows = rowCount || 100;
  const records = [];
  
  for (let i = 0; i < rows; i++) {
    records.push(generateRow(columns, i));
  }
  
  return {
    records,
    columns,
    rowCount: records.length,
    columnCount: columns.length
  };
}

/**
 * List available data types
 * @returns {Array} Array of available type names
 */
export function listTypes() {
  return Object.keys(fakerTypes);
}

/**
 * List available templates
 * @returns {Array} Array of template names
 */
export function listTemplates() {
  return Object.keys(templates);
}

// ---------------------------------------------------------------------------
// Plugin API — built-in name snapshots (captured once at module load)
// ---------------------------------------------------------------------------
const BUILT_IN_TYPES = new Set(Object.keys(fakerTypes));
const BUILT_IN_TEMPLATES = new Set(Object.keys(templates));

/**
 * Register a custom data type generator.
 * @param {string} name - Type name (used in column definitions as name:type)
 * @param {Function} generatorFn - Zero-argument function returning a value
 * @param {Object} [options]
 * @param {boolean} [options.override=false] - Allow overwriting an existing type
 */
export function registerType(name, generatorFn, { override = false } = {}) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('registerType: name must be a non-empty string');
  }
  if (typeof generatorFn !== 'function') {
    throw new Error(`registerType: generatorFn must be a function, got ${typeof generatorFn}`);
  }
  if (fakerTypes[name] !== undefined && !override) {
    throw new Error(
      `registerType: type "${name}" is already registered. Pass { override: true } to replace it.`
    );
  }
  fakerTypes[name] = generatorFn;
}

/**
 * Unregister a previously registered custom type.
 * Built-in types cannot be removed.
 * @param {string} name - Type name to remove
 */
export function unregisterType(name) {
  if (BUILT_IN_TYPES.has(name)) {
    throw new Error(`unregisterType: "${name}" is a built-in type and cannot be removed`);
  }
  if (!(name in fakerTypes)) {
    throw new Error(`unregisterType: type "${name}" is not registered`);
  }
  delete fakerTypes[name];
}

/**
 * Register a custom column template.
 * @param {string} name - Template name
 * @param {{ columns: string, rows: number }} config - Template configuration
 * @param {Object} [options]
 * @param {boolean} [options.override=false] - Allow overwriting an existing template
 */
export function registerTemplate(name, config, { override = false } = {}) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('registerTemplate: name must be a non-empty string');
  }
  if (!config || typeof config.columns !== 'string') {
    throw new Error('registerTemplate: config.columns must be a string');
  }
  if (templates[name] !== undefined && !override) {
    throw new Error(
      `registerTemplate: template "${name}" is already registered. Pass { override: true } to replace it.`
    );
  }
  templates[name] = { columns: config.columns, rows: config.rows || 100 };
}

/**
 * Unregister a previously registered custom template.
 * Built-in templates cannot be removed.
 * @param {string} name - Template name to remove
 */
export function unregisterTemplate(name) {
  if (BUILT_IN_TEMPLATES.has(name)) {
    throw new Error(`unregisterTemplate: "${name}" is a built-in template and cannot be removed`);
  }
  if (!(name in templates)) {
    throw new Error(`unregisterTemplate: template "${name}" is not registered`);
  }
  delete templates[name];
}
