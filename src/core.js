// Ficta Core - Works in any JavaScript environment
// No Node.js or browser-specific dependencies

// Faker.js instance - can be set externally or will be auto-detected
let fakerInstance = null;

// Try to auto-detect faker in different environments
if (typeof window !== 'undefined' && window.faker) {
  // Browser environment with global faker
  fakerInstance = window.faker;
}

// Get faker instance (lazy initialization)
function getFaker() {
  if (!fakerInstance) {
    throw new Error('Faker.js not initialized. Import faker or call setFaker()');
  }
  return fakerInstance;
}

// Set faker instance for testing or custom configuration
export function setFaker(faker) {
  fakerInstance = faker;
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
  
  // Special
  color: () => getFaker().color.human(),
  emoji: () => getFaker().internet.emoji(),
  
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
 * Generate data for a single row
 * @param {Array} columns - Column definitions
 * @param {number} index - Row index
 * @returns {Object} Row data
 */
export function generateRow(columns, index) {
  const row = {};
  
  for (const col of columns) {
    if (col.type === 'autoIncrement') {
      row[col.name] = index + 1;
    } else if (col.type.startsWith('static:')) {
      // Static value: static:SomeValue
      row[col.name] = col.type.replace('static:', '');
    } else if (col.type.startsWith('enum:')) {
      // Enum: enum:value1|value2|value3
      const values = col.type.replace('enum:', '').split('|');
      row[col.name] = getFaker().helpers.arrayElement(values);
    } else if (col.type.startsWith('range:')) {
      // Number range: range:1-100
      const [min, max] = col.type.replace('range:', '').split('-').map(Number);
      row[col.name] = getFaker().number.int({ min, max });
    } else if (col.type.startsWith('pattern:')) {
      // Pattern: pattern:PRD-###### or pattern:user+{COUNTER}@example.com
      const pattern = col.type.replace('pattern:', '');
      let value = pattern;
      // Replace {COUNTER} with incrementing number
      value = value.replace(/\{COUNTER\}/g, index + 1);
      // Replace # with random digits
      value = value.replace(/#/g, () => getFaker().number.int({ min: 0, max: 9 }));
      row[col.name] = value;
    } else if (fakerTypes[col.type]) {
      row[col.name] = fakerTypes[col.type]();
    } else {
      row[col.name] = getFaker().word.words(2);
    }
  }
  
  return row;
}

/**
 * Generate data as array of objects
 * @param {Object} options - Generation options
 * @param {string} options.columns - Column definitions
 * @param {number} options.rows - Number of rows to generate
 * @returns {Object} Object with records and metadata
 */
export function generateData(options) {
  const columns = parseColumns(options.columns);
  const rows = options.rows || 100;
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
