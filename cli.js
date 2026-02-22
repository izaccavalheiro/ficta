#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generateAndSave, listTypes, listTemplates, templates } from './src/node.js';

// CLI setup
function setupCLI() {
  return yargs(hideBin(process.argv))
    .usage('Usage: $0 [options]')
    .example('$0 -o users.csv -c "id:autoIncrement,name:fullName,email" -r 100', 'Generate CSV file')
    .example('$0 -o users.json -f json -c "id:autoIncrement,name:fullName,email" -r 100', 'Generate JSON file')
    .example('$0 -o data.xlsx -f xlsx -t users -r 500', 'Generate Excel file using template')
    .example('$0 -t users -r 500 -f xml -o myusers.xml', 'Generate XML file using template')
    .example('$0 -c "status:enum:active|inactive,score:range:0-100"', 'Use special types')
    .example('$0 -c "email:pattern:user+{COUNTER}@example.com" -r 50', 'Generate emails with counter pattern')
    .option('output', {
      alias: 'o',
      describe: 'Output filename (extension determines format if -f not specified)',
      type: 'string'
    })
    .option('format', {
      alias: 'f',
      describe: 'Output format',
      type: 'string',
      choices: ['csv', 'json', 'xml', 'xlsx', 'tsv', 'sql', 'yaml', 'yml', 'toml']
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
    .option('pretty', {
      describe: 'Pretty print JSON output (default: true)',
      type: 'boolean',
      default: true
    })
    .option('sheet-name', {
      describe: 'Excel worksheet name (default: Sheet1)',
      type: 'string'
    })
    .option('table-name', {
      describe: 'SQL table name (default: data_table)',
      type: 'string'
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
    format: argv.format,
    rows: argv.rows,
    preview: argv.preview,
    columns: argv.columns,
    formatOptions: {}
  };

  // Add format-specific options
  if (argv.pretty !== undefined) {
    options.formatOptions.pretty = argv.pretty;
  }
  if (argv.sheetName) {
    options.formatOptions.sheetName = argv.sheetName;
  }
  if (argv.tableName) {
    options.formatOptions.tableName = argv.tableName;
  }

  // Use template if specified
  if (argv.template) {
    const template = templates[argv.template];
    options.columns = template.columns;
    if (!argv.rows || argv.rows === 100) {
      options.rows = template.rows;
    }
  }

  await generateAndSave(options);
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
  setupCLI,
  main,
  runCLI,
  checkIsMainModule,
  executeIfMain
};

// Main execution - only run if this file is executed directly
executeIfMain();
