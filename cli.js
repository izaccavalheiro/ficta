#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generateAndSave, generateFromDDL, generateFromSchemaFile, listTypes, listTemplates, templates, inferSchemaFromFile, fromOpenAPIFile, fromGraphQLFile, watchAndGenerate } from './src/node.js';

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
    .example('$0 -o schema.sql --sql-mode ddl+insert --sql-dialect postgres -t users', 'Generate PostgreSQL schema with data')
    .example('$0 -o data.sql --sql-mode upsert --sql-dialect mysql -c "id,name,email" -r 100', 'Generate MySQL upsert statements')
    .option('output', {
      alias: 'o',
      describe: 'Output filename (extension determines format if -f not specified)',
      type: 'string'
    })
    .option('format', {
      alias: 'f',
      describe: 'Output format',
      type: 'string',
      choices: ['csv', 'json', 'xml', 'xlsx', 'tsv', 'sql', 'yaml', 'yml', 'toml', 'parquet']
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
      default: undefined
    })
    .option('template', {
      alias: 't',
      describe: 'Use predefined template. Built-in templates only; custom registered templates are not reflected here.',
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
    .option('sql-dialect', {
      describe: 'SQL dialect for DDL generation',
      type: 'string',
      choices: ['postgres', 'mysql', 'sqlite', 'generic']
    })
    .option('sql-mode', {
      describe: 'SQL generation mode',
      type: 'string',
      choices: ['insert', 'ddl', 'ddl+insert', 'upsert', 'truncate+insert'],
      default: 'insert'
    })
    .option('sql-batch', {
      describe: 'Use batch INSERT statements (multiple VALUES)',
      type: 'boolean',
      default: false
    })
    .option('seed', {
      describe: 'Seed for reproducible output (integer)',
      type: 'number'
    })
    .option('locale', {
      describe: 'Faker.js locale for localized data (e.g. fr, de, ja, pt_BR)',
      type: 'string'
    })
    .option('header', {
      describe: 'Include header row in CSV/TSV output (use --no-header to omit)',
      type: 'boolean',
      default: true
    })
    .option('header-format', {
      describe: 'Header casing: "title" (default) or "raw" (exact column key names)',
      type: 'string',
      choices: ['title', 'raw'],
      default: 'title'
    })
    .option('schema-file', {
      alias: 's',
      describe: 'Path to a ficta.schema.json file for structured multi-table generation',
      type: 'string'
    })
    .command(
      'schema <file>',
      'Generate test data from a SQL DDL schema file',
      (yargs) => {
        return yargs
          .positional('file', {
            describe: 'Path to the .sql DDL schema file',
            type: 'string'
          })
          .option('rows', {
            alias: 'r',
            describe: 'Number of rows to generate per table',
            type: 'number',
            default: 10
          })
          .option('dialect', {
            describe: 'SQL dialect',
            type: 'string',
            choices: ['postgres', 'mysql', 'sqlite', 'generic'],
            default: 'generic'
          })
          .option('mode', {
            describe: 'SQL output mode',
            type: 'string',
            choices: ['insert', 'upsert', 'truncate+insert', 'ddl+insert'],
            default: 'insert'
          })
          .option('output', {
            alias: 'o',
            describe: 'Output file path (optional)',
            type: 'string'
          })
          .option('locale', {
            describe: 'Faker.js locale for localized data (e.g. fr, de, ja, pt_BR)',
            type: 'string'
          })
          .option('watch', {
            alias: 'w',
            describe: 'Watch input file and regenerate on change',
            type: 'boolean',
            default: false
          });
      },
      async (argv) => {
        try {
          const ddlOptions = {
            schemaFile: argv.file,
            rows: argv.rows,
            dialect: argv.dialect,
            outputMode: argv.mode,
            output: argv.output,
            locale: argv.locale,
          };
          if (argv.watch) {
            // Run once immediately
            const sql = await generateFromDDL(ddlOptions);
            if (!argv.output) process.stdout.write(sql);
            process.stderr.write(`Watching ${argv.file} for changes…\n`);
            /* istanbul ignore next -- callback only fires on successful file-change regeneration during live watch session */
            const _onWatchSuccess = (outputPath, elapsedMs) => {
              const ts = new Date().toISOString();
              process.stderr.write(`[${ts}] Regenerated → ${outputPath} (${elapsedMs}ms)\n`);
            };
            /* istanbul ignore next -- callback only fires when file-change regeneration errors during live watch session */
            const _onWatchError = (err) => {
              const ts = new Date().toISOString();
              process.stderr.write(`[${ts}] Error: ${err.message}\n`);
            };
            const watcher = watchAndGenerate({
              ...ddlOptions,
              onSuccess: _onWatchSuccess,
              onError: _onWatchError,
            });
            process.on('SIGINT', /* istanbul ignore next -- SIGINT can't be triggered in tests */ () => { watcher.stop(); process.exit(0); });
          } else {
            const sql = await generateFromDDL(ddlOptions);
            if (!argv.output) {
              process.stdout.write(sql);
            }
          }
        } catch (err) {
          console.error('Error:', err.message);
          process.exit(1);
        }
      }
    )
    .command(
      'infer <file>',
      'Infer Ficta column definitions from an existing CSV or JSON file',
      (yargs) => {
        return yargs
          .positional('file', {
            describe: 'Path to the .csv or .json input file',
            type: 'string'
          })
          .option('format', {
            describe: 'Output format: "string" (default) or "json"',
            type: 'string',
            choices: ['string', 'json'],
            default: 'string'
          })
          .option('output', {
            alias: 'o',
            describe: 'Write output to a file instead of stdout',
            type: 'string'
          });
      },
      async (argv) => {
        try {
          const result = await inferSchemaFromFile(argv.file);
          const out = argv.format === 'json'
            ? JSON.stringify(result.columnList, null, 2)
            : result.columns;
          if (argv.output) {
            const fs = await import('fs');
            await fs.promises.writeFile(argv.output, out, 'utf-8');
          } else {
            process.stdout.write(out + '\n');
          }
        } catch (err) {
          console.error('Error:', err.message);
          process.exit(1);
        }
      }
    )
    .command(
      'from-openapi <file>',
      'Convert an OpenAPI 3.x or JSON Schema file to a ficta.schema.json structure',
      (yargs) => {
        return yargs
          .positional('file', {
            describe: 'Path to the .json, .yaml, or .yml OpenAPI file',
            type: 'string'
          })
          .option('schema', {
            describe: 'Component schema name to target (OpenAPI)',
            type: 'string'
          })
          .option('rows', {
            alias: 'r',
            describe: 'Rows per table in the generated ficta.schema.json',
            type: 'number',
            default: 100
          })
          .option('dialect', {
            describe: 'SQL dialect',
            type: 'string',
            choices: ['postgres', 'mysql', 'sqlite', 'generic'],
            default: 'postgres'
          })
          .option('output', {
            alias: 'o',
            describe: 'Write ficta.schema.json to a file; if omitted, prints to stdout',
            type: 'string'
          });
      },
      async (argv) => {
        try {
          const schema = await fromOpenAPIFile(argv.file, {
            schemaName: argv.schema,
            rows: argv.rows,
            dialect: argv.dialect,
          });
          const out = JSON.stringify(schema, null, 2);
          if (argv.output) {
            const fs = await import('fs');
            await fs.promises.writeFile(argv.output, out, 'utf-8');
          } else {
            process.stdout.write(out + '\n');
          }
        } catch (err) {
          console.error('Error:', err.message);
          process.exit(1);
        }
      }
    )
    .command(
      'from-graphql <file>',
      'Convert a GraphQL SDL file to a ficta.schema.json structure',
      (yargs) => {
        return yargs
          .positional('file', {
            describe: 'Path to the .graphql or .gql file',
            type: 'string'
          })
          .option('type', {
            describe: 'GraphQL object type to target (defaults to first)',
            type: 'string'
          })
          .option('rows', {
            alias: 'r',
            describe: 'Rows per table',
            type: 'number',
            default: 100
          })
          .option('dialect', {
            describe: 'SQL dialect',
            type: 'string',
            choices: ['postgres', 'mysql', 'sqlite', 'generic'],
            default: 'postgres'
          })
          .option('output', {
            alias: 'o',
            describe: 'Write ficta.schema.json to a file; if omitted, prints to stdout',
            type: 'string'
          });
      },
      async (argv) => {
        try {
          const schema = await fromGraphQLFile(argv.file, {
            typeName: argv.type,
            rows: argv.rows,
            dialect: argv.dialect,
          });
          const out = JSON.stringify(schema, null, 2);
          if (argv.output) {
            const fs = await import('fs');
            await fs.promises.writeFile(argv.output, out, 'utf-8');
          } else {
            process.stdout.write(out + '\n');
          }
        } catch (err) {
          console.error('Error:', err.message);
          process.exit(1);
        }
      }
    )
    .check((argv) => {
      if (argv.listTypes || argv.listTemplates) {
        return true;
      }
      // Subcommands with their own positional args — skip check
      if (['schema', 'infer', 'from-openapi', 'from-graphql'].includes(argv._[0])) {
        return true;
      }
      if (argv.schemaFile) {
        return true;
      }
      if (!argv.columns && !argv.template) {
        throw new Error('Either --columns, --template, or --schema-file must be specified');
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

  // Handle --schema-file option
  if (argv.schemaFile) {
    const sql = await generateFromSchemaFile({
      schemaFile: argv.schemaFile,
      rows: argv.rows,
      outputMode: argv.sqlMode || 'ddl+insert',
      output: argv.output,
    });
    if (!argv.output) {
      process.stdout.write(sql);
    }
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
  if (argv.sqlDialect) {
    options.formatOptions.dialect = argv.sqlDialect;
  }
  if (argv.sqlMode) {
    options.formatOptions.mode = argv.sqlMode;
  }
  if (argv.sqlBatch) {
    options.formatOptions.batch = argv.sqlBatch;
  }
  if (argv.header === false) {
    options.formatOptions.header = false;
  }
  if (argv.headerFormat) {
    options.formatOptions.headerFormat = argv.headerFormat;
  }
  if (argv.seed !== undefined) {
    options.seed = argv.seed;
  }
  if (argv.locale) {
    options.locale = argv.locale;
  }

  // Use template if specified
  if (argv.template) {
    const template = templates[argv.template];
    options.columns = template.columns;
    if (!argv.rows) {
      options.rows = template.rows;
    }
  }

  await generateAndSave(options);
}

// CLI runner function
async function runCLI() {
  // Check for schema subcommand before yargs processes args (yargs v18 returns
  // undefined for argv._ after command dispatch, so we check raw process.argv)
  const isSubcommand = ['schema', 'infer', 'from-openapi', 'from-graphql'].includes(process.argv[2]);

  const argv = setupCLI();

  // Subcommands are fully handled by their own yargs command handlers
  if (isSubcommand) {
    return;
  }
  
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
