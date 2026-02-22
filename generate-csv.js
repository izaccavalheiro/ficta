#!/usr/bin/env node
// Install required packages:
// npm install @faker-js/faker csv-writer yargs

import { faker } from '@faker-js/faker';
import { createObjectCsvWriter } from 'csv-writer';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Available Faker data types mapped to their generators
const fakerTypes = {
  // Person
  firstName: () => faker.person.firstName(),
  lastName: () => faker.person.lastName(),
  fullName: () => faker.person.fullName(),
  jobTitle: () => faker.person.jobTitle(),
  prefix: () => faker.person.prefix(),
  suffix: () => faker.person.suffix(),
  
  // Internet
  email: () => faker.internet.email(),
  username: () => faker.internet.username(),
  password: () => faker.internet.password(),
  url: () => faker.internet.url(),
  ipv4: () => faker.internet.ipv4(),
  userAgent: () => faker.internet.userAgent(),
  
  // Phone
  phone: () => faker.phone.number(),
  
  // Address
  street: () => faker.location.streetAddress(),
  city: () => faker.location.city(),
  state: () => faker.location.state(),
  country: () => faker.location.country(),
  zipCode: () => faker.location.zipCode(),
  latitude: () => faker.location.latitude(),
  longitude: () => faker.location.longitude(),
  
  // Company
  company: () => faker.company.name(),
  department: () => faker.commerce.department(),
  
  // Commerce
  product: () => faker.commerce.productName(),
  price: () => faker.commerce.price({ min: 10, max: 1000, dec: 2 }),
  productDescription: () => faker.commerce.productDescription(),
  
  // Finance
  amount: () => faker.finance.amount({ min: 5, max: 5000, dec: 2 }),
  accountNumber: () => faker.finance.accountNumber(),
  iban: () => faker.finance.iban(),
  creditCardNumber: () => faker.finance.creditCardNumber(),
  currency: () => faker.finance.currencyCode(),
  
  // Date
  pastDate: () => faker.date.past({ years: 2 }).toISOString().split('T')[0],
  futureDate: () => faker.date.future({ years: 1 }).toISOString().split('T')[0],
  recentDate: () => faker.date.recent({ days: 30 }).toISOString().split('T')[0],
  timestamp: () => faker.date.recent().toISOString(),
  
  // Numbers
  number: () => faker.number.int({ min: 1, max: 10000 }),
  float: () => faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
  
  // Text
  word: () => faker.word.words(1),
  words: () => faker.word.words(5),
  sentence: () => faker.lorem.sentence(),
  paragraph: () => faker.lorem.paragraph(),
  
  // IDs
  uuid: () => faker.string.uuid(),
  nanoid: () => faker.string.nanoid(),
  
  // Boolean
  boolean: () => faker.datatype.boolean(),
  
  // Special
  color: () => faker.color.human(),
  emoji: () => faker.internet.emoji(),
  
  // Auto increment
  autoIncrement: null // Handled specially
};

// Predefined templates
const templates = {
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

// Parse column definitions
function parseColumns(columnString) {
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

// Generate data for a row
function generateRow(columns, index) {
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
      row[col.name] = faker.helpers.arrayElement(values);
    } else if (col.type.startsWith('range:')) {
      // Number range: range:1-100
      const [min, max] = col.type.replace('range:', '').split('-').map(Number);
      row[col.name] = faker.number.int({ min, max });
    } else if (col.type.startsWith('pattern:')) {
      // Pattern: pattern:PRD-###### or pattern:user+{COUNTER}@example.com
      const pattern = col.type.replace('pattern:', '');
      let value = pattern;
      // Replace {COUNTER} with incrementing number
      value = value.replace(/\{COUNTER\}/g, index + 1);
      // Replace # with random digits
      value = value.replace(/#/g, () => faker.number.int({ min: 0, max: 9 }));
      row[col.name] = value;
    } else if (fakerTypes[col.type]) {
      row[col.name] = fakerTypes[col.type]();
    } else {
      row[col.name] = faker.word.words(2);
    }
  }
  
  return row;
}

// Generate CSV
async function generateCSV(options) {
  const columns = parseColumns(options.columns);
  
  const headers = columns.map(col => ({
    id: col.name,
    title: col.name.replace(/([A-Z])/g, ' $1').trim()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }));

  const csvWriter = createObjectCsvWriter({
    path: options.output,
    header: headers
  });

  const records = [];
  for (let i = 0; i < options.rows; i++) {
    records.push(generateRow(columns, i));
  }

  await csvWriter.writeRecords(records);
  console.log(`✓ Generated ${options.output} with ${options.rows} rows and ${columns.length} columns`);
  
  if (options.preview) {
    console.log('\nPreview (first 3 rows):');
    console.table(records.slice(0, 3));
  }
}

// List available types
function listTypes() {
  console.log('\n📋 Available Data Types:\n');
  
  const categories = {
    'Person': ['firstName', 'lastName', 'fullName', 'jobTitle', 'prefix', 'suffix'],
    'Internet': ['email', 'username', 'password', 'url', 'ipv4', 'userAgent'],
    'Phone': ['phone'],
    'Address': ['street', 'city', 'state', 'country', 'zipCode', 'latitude', 'longitude'],
    'Company': ['company', 'department'],
    'Commerce': ['product', 'price', 'productDescription'],
    'Finance': ['amount', 'accountNumber', 'iban', 'creditCardNumber', 'currency'],
    'Date': ['pastDate', 'futureDate', 'recentDate', 'timestamp'],
    'Numbers': ['number', 'float'],
    'Text': ['word', 'words', 'sentence', 'paragraph'],
    'IDs': ['uuid', 'nanoid', 'autoIncrement'],
    'Other': ['boolean', 'color', 'emoji']
  };

  for (const [category, types] of Object.entries(categories)) {
    console.log(`${category}:`);
    types.forEach(type => console.log(`  - ${type}`));
    console.log('');
  }

  console.log('Special Types:');
  console.log('  - static:VALUE        Fixed value for all rows');
  console.log('  - enum:val1|val2|val3 Random choice from list');
  console.log('  - range:MIN-MAX       Random number in range');
  console.log('  - pattern:PRD-######  Custom pattern (# for digits, {COUNTER} for auto-increment)');
  console.log('  - pattern:user+{COUNTER}@example.com  Email pattern with auto-increment');
}

// List templates
function listTemplates() {
  console.log('\n📋 Available Templates:\n');
  
  for (const [name, config] of Object.entries(templates)) {
    console.log(`${name}:`);
    console.log(`  Columns: ${config.columns}`);
    console.log(`  Default rows: ${config.rows}`);
    console.log('');
  }
}

// CLI setup
function setupCLI() {
  return yargs(hideBin(process.argv))
    .usage('Usage: $0 [options]')
    .example('$0 -o users.csv -c "id:autoIncrement,name:fullName,email" -r 100', 'Generate basic CSV')
    .example('$0 -t users -r 500 -o myusers.csv', 'Use template with custom rows')
    .example('$0 -c "status:enum:active|inactive,score:range:0-100"', 'Use special types')
    .example('$0 -c "email:pattern:user+{COUNTER}@example.com" -r 50', 'Generate emails with counter pattern')
    .option('output', {
      alias: 'o',
      describe: 'Output filename',
      type: 'string',
      default: 'test-data.csv'
    })
    .option('columns', {
      alias: 'c',
      describe: 'Column definitions (name:type,name:type,...)',
      type: 'string'
    })
    .option('rows', {
      alias: 'r',
      describe: 'Number of rows to generate',
      type: 'number',
      default: 100
    })
    .option('template', {
      alias: 't',
      describe: 'Use predefined template',
      type: 'string',
      choices: Object.keys(templates)
    })
    .option('preview', {
      alias: 'p',
      describe: 'Show preview of generated data',
      type: 'boolean',
      default: false
    })
    .option('list-types', {
      describe: 'List all available data types',
      type: 'boolean'
    })
    .option('list-templates', {
      describe: 'List all available templates',
      type: 'boolean'
    })
    .check((argv) => {
      if (argv.listTypes || argv.listTemplates) {
        return true;
      }
      if (!argv.columns && !argv.template) {
        throw new Error('Either --columns or --template must be specified');
      }
      return true;
    })
    .help()
    .alias('help', 'h')
    .argv;
}

// Main execution function
async function main(argv) {
  if (argv.listTypes) {
    listTypes();
    return;
  }

  if (argv.listTemplates) {
    listTemplates();
    return;
  }

  const options = {
    output: argv.output,
    rows: argv.rows,
    preview: argv.preview,
    columns: argv.columns
  };

  // Use template if specified
  if (argv.template) {
    const template = templates[argv.template];
    options.columns = template.columns;
    if (!argv.rows || argv.rows === 100) {
      options.rows = template.rows;
    }
  }

  await generateCSV(options);
}

// CLI runner function
async function runCLI() {
  const argv = setupCLI();
  
  try {
    await main(argv);
    if (argv.listTypes || argv.listTemplates) {
      process.exit(0);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

// Check if this module is being run directly
function checkIsMainModule() {
  return import.meta.url === `file://${process.argv[1]}`;
}

// Execute CLI if this file is run directly
function executeIfMain() {
  const isMainModule = checkIsMainModule();
  /* istanbul ignore next - this branch only executes when file is run directly, covered by subprocess tests */
  if (isMainModule) {
    runCLI();
  }
  return isMainModule;
}

// Export for testing
export {
  fakerTypes,
  templates,
  parseColumns,
  generateRow,
  generateCSV,
  listTypes,
  listTemplates,
  setupCLI,
  main,
  runCLI,
  checkIsMainModule,
  executeIfMain
};

// Main execution - only run if this file is executed directly
executeIfMain();