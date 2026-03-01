#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generateAndSave, generateStream, generateFromDDL, generateFromSchemaFile, listTypes, listTemplates, templates, inferSchemaFromFile, fromOpenAPIFile, fromGraphQLFile, watchAndGenerate, setLogger, resetLogger } from './src/node.js';

/**
 * Read all data from stdin if it is piped (non-TTY). Returns null if stdin
 * is interactive, empty, or unavailable.
 * @returns {Promise<string|null>}
 */
async function readStdin() {
  if (process.stdin.isTTY !== false) return null;
  /* v8 ignore start -- stdin event callbacks only execute with real piped input */
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => resolve(null), 200);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data.trim() || null); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(null); });
  });
  /* v8 ignore stop */
}

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
      choices: ['csv', 'json', 'xml', 'xlsx', 'tsv', 'sql', 'yaml', 'yml', 'toml', 'parquet', 'ndjson']
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
    .option('stream', {
      describe: 'Stream output row-by-row instead of generating all data in memory (csv and ndjson formats only)',
      type: 'boolean',
      default: false
    })
    .option('batch-size', {
      describe: 'Number of rows per chunk when using --stream (default: 500)',
      type: 'number',
      default: 500
    })
    .option('schema-file', {
      alias: 's',
      describe: 'Path to a ficta.schema.json file for structured multi-table generation',
      type: 'string'
    })
    .option('interactive', {
      alias: 'i',
      describe: 'Prompt interactively for any missing generation options',
      type: 'boolean',
      default: false
    })
    .option('quiet', {
      alias: 'q',
      describe: 'Suppress all non-data output (status messages and progress)',
      type: 'boolean',
      default: false
    })
    .option('json-output', {
      describe: 'Output a structured JSON result object to stdout instead of formatted data',
      type: 'boolean',
      default: false
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
          .option('seed', {
            describe: 'Integer seed for reproducible output',
            type: 'number'
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
            seed: argv.seed,
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
    .command(
      'seed',
      'Seed a database with generated test data',
      /* v8 ignore start -- seed/init handlers require live DB or interactive terminal */
      (yargs) => {
        return yargs
          .option('connection', {
            alias: 'c',
            describe: 'Database connection string or SQLite file path',
            type: 'string',
            demandOption: true,
          })
          .option('schema', {
            alias: 's',
            describe: 'Path to a .sql DDL file or ficta.schema.json',
            type: 'string',
            demandOption: true,
          })
          .option('rows', {
            alias: 'r',
            describe: 'Rows per table',
            type: 'number',
            default: 10,
          })
          .option('truncate', {
            describe: 'Truncate/clear tables before seeding',
            type: 'boolean',
            default: false,
          })
          .option('dialect', {
            describe: 'SQL dialect (auto-detected from connection string when omitted)',
            type: 'string',
            choices: ['postgres', 'mysql', 'sqlite'],
          });
      },
      async (argv) => {
        try {
          const { generateFromDDL, generateFromSchemaFile } = await import('./src/node.js');
          const { seedDatabase } = await import('./src/seeder.js');
          const isJson = argv.schema.endsWith('.json');
          let tables;
          if (isJson) {
            const fs = await import('fs');
            const raw = JSON.parse(await fs.promises.readFile(argv.schema, 'utf-8'));
            const results = [];
            for (const tbl of raw.tables || []) {
              const { generateData } = await import('./src/core.js');
              const { setFaker } = await import('./src/core.js');
              const { faker } = await import('@faker-js/faker');
              setFaker(faker);
              const res = generateData({ schema: tbl.columns, rows: tbl.rows || argv.rows });
              results.push({ tableName: tbl.name, records: res.records, columns: res.columns });
            }
            tables = results;
          } else {
            // DDL mode: generate SQL string then parse records out
            const { generateFromSchema } = await import('./src/schema-generator.js');
            const { parseDDL } = await import('./src/ddl-parser.js');
            const { faker } = await import('@faker-js/faker');
            const { setFaker } = await import('./src/core.js');
            setFaker(faker);
            const fs = await import('fs');
            const ddl = await fs.promises.readFile(argv.schema, 'utf-8');
            const parsed = parseDDL(ddl);
            const { generateTableData } = await import('./src/schema-generator.js');
            tables = [];
            const pkStore = {};
            for (const tableDef of parsed) {
              const records = generateTableData({ tableDef, rows: argv.rows, pkStore });
              tables.push({ tableName: tableDef.tableName, records, columns: tableDef.columns });
            }
          }
          const result = await seedDatabase({
            connectionString: argv.connection,
            dialect: argv.dialect,
            tables,
            truncate: argv.truncate,
          });
          console.log(`✓ Seeded ${result.tablesSeeded} table(s), ${result.rowsInserted} rows in ${result.elapsed}ms`);
        } catch (err) {
          console.error('Error:', err.message);
          process.exit(1);
        }
      }
      /* v8 ignore stop */
    )
    .command(
      'init',
      'Create a ficta.schema.json file interactively',
      /* v8 ignore start -- init handler requires interactive terminal */
      (yargs) => {
        return yargs.option('output', {
          alias: 'o',
          describe: 'Output path for the schema file',
          type: 'string',
          default: 'ficta.schema.json'
        });
      },
      async (argv) => {
        try {
          const { runInitWizard } = await import('./src/wizard.js');
          const schema = await runInitWizard();
          const out = JSON.stringify(schema, null, 2);
          const fs = await import('fs');
          await fs.promises.writeFile(argv.output, out, 'utf-8');
          console.log(`✓ Schema written to ${argv.output}`);
        } catch (err) {
          console.error('Error:', err.message);
          process.exit(1);
        }
      }
      /* v8 ignore stop */
    )
    .command(
      'mask <input>',
      'Anonymize PII in a CSV or JSON file',
      (yargs) => {
        return yargs
          .positional('input', {
            describe: 'Path to the input file (.csv or .json)',
            type: 'string',
          })
          .option('output', {
            alias: 'o',
            describe: 'Path for the anonymized output file',
            type: 'string',
          })
          .option('keep', {
            describe: 'Comma-separated column names to pass through unchanged',
            type: 'string',
          })
          .option('columns', {
            alias: 'c',
            describe: 'Comma-separated column names to anonymize (default: auto-detect PII)',
            type: 'string',
          })
          .option('seed', {
            alias: 's',
            describe: 'Faker seed for reproducible anonymization',
            type: 'number',
          });
      },
      async (argv) => {
        try {
          const { anonymizeFile } = await import('./src/node.js');
          const { setFaker } = await import('./src/core.js');
          const { faker } = await import('@faker-js/faker');
          setFaker(faker);

          if (argv.seed != null) {
            const { seedFaker } = await import('./src/core.js');
            seedFaker(argv.seed);
          }

          const opts = {};
          if (argv.keep) opts.keepColumns = argv.keep.split(',').map(s => s.trim());
          if (argv.columns) opts.onlyColumns = argv.columns.split(',').map(s => s.trim());

          const { records } = await anonymizeFile(argv.input, argv.output || null, opts);
          if (!argv.output) {
            // No output file — write CSV to stdout
            const { toCSV } = await import('./src/formatters.shared.js');
            const cols = records.length > 0
              ? Object.keys(records[0]).map(name => ({ name }))
              : [];
            process.stdout.write(toCSV(records, cols) + '\n');
          } else {
            console.log(`✓ Anonymized ${records.length} records → ${argv.output}`);
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
      if (['schema', 'infer', 'from-openapi', 'from-graphql', 'init', 'seed', 'mask'].includes(argv._[0])) {
        return true;
      }
      if (argv.schemaFile) {
        return true;
      }
      // Interactive mode fills missing options at runtime
      if (argv.interactive) {
        return true;
      }
      // Allow stdin piping: columns/template will come from stdin
      if (process.stdin.isTTY === false) {
        return true;
      }
      if (!argv.columns && !argv.template) {
        throw new Error('Either --columns, --template, --schema-file, or --interactive must be specified');
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

  // Handle piped stdin: JSON ficta.schema or SQL DDL provided via stdin
  if (argv._stdinData && !argv.columns && !argv.template && !argv.schemaFile) {
    const stdinStr = argv._stdinData;
    const isJSON = stdinStr.trimStart().startsWith('{');
    const isDDL = !isJSON && /CREATE\s+TABLE/i.test(stdinStr);

    if (isJSON || isDDL) {
      const os = await import('os');
      const path = await import('path');
      const fs = await import('fs');
      const ext = isJSON ? '.json' : '.sql';
      const tmpFile = path.join(os.tmpdir(), `ficta-stdin-${Date.now()}${ext}`);
      await fs.promises.writeFile(tmpFile, stdinStr, 'utf-8');
      try {
        let sql;
        if (isJSON) {
          sql = await generateFromSchemaFile({
            schemaFile: tmpFile,
            rows: argv.rows,
            outputMode: argv.sqlMode || 'ddl+insert',
            output: argv.output,
            locale: argv.locale,
            seed: argv.seed,
          });
        } else {
          sql = await generateFromDDL({
            schemaFile: tmpFile,
            rows: argv.rows || 10,
            outputMode: argv.sqlMode || 'insert',
            dialect: argv.sqlDialect || 'generic',
            output: argv.output,
            locale: argv.locale,
            seed: argv.seed,
          });
        }
        if (!argv.output) {
          if (argv.jsonOutput) {
            process.stdout.write(JSON.stringify({ sql, format: 'sql', source: 'stdin' }) + '\n');
          } else {
            process.stdout.write(sql);
          }
        }
      } finally {
        /* v8 ignore next -- unlink error is non-fatal; cleanup only */
        await fs.promises.unlink(tmpFile).catch(() => {});
      }
      return;
    }
  }

  // Handle --schema-file option
  if (argv.schemaFile) {
    const sql = await generateFromSchemaFile({
      schemaFile: argv.schemaFile,
      rows: argv.rows,
      outputMode: argv.sqlMode || 'ddl+insert',
      output: argv.output,
      locale: argv.locale,
      dialect: argv.sqlDialect,
      seed: argv.seed !== undefined ? argv.seed : undefined,
    });
    if (!argv.output) {
      process.stdout.write(sql);
    }
    return;
  }

  // Handle --stream flag: use generateStream to avoid loading all rows into memory
  if (argv.stream) {
    const streamFormat = argv.format || 'csv';
    if (streamFormat !== 'csv' && streamFormat !== 'ndjson') {
      console.error(`Error: --stream only supports csv and ndjson formats (got "${streamFormat}")`);
      process.exit(1);
      /* istanbul ignore next */
      return;
    }

    let streamColumns = argv.columns;
    let streamRows = argv.rows;
    if (argv.template) {
      const tmpl = templates[argv.template];
      if (!streamColumns) streamColumns = tmpl.columns;
      if (!streamRows) streamRows = tmpl.rows;
    }
    if (!streamRows) {
      console.error('Error: --rows is required when using --stream');
      process.exit(1);
      /* istanbul ignore next */
      return;
    }

    const readable = generateStream({
      columns: streamColumns,
      rows: streamRows,
      format: streamFormat,
      batchSize: argv.batchSize,
      seed: argv.seed,
      locale: argv.locale,
      formatOptions: {
        header: argv.header !== false,
        headerFormat: argv.headerFormat || 'title',
      },
    });

    if (argv.output) {
      const fs = await import('fs');
      const dest = fs.createWriteStream(argv.output);
      await new Promise((resolve, reject) => {
        readable.pipe(dest);
        dest.on('finish', resolve);
        dest.on('error', reject);
        readable.on('error', reject);
      });
      console.log(`✓ Streamed ${streamRows} rows to ${argv.output} (${streamFormat.toUpperCase()} format)`);
    } else {
      await new Promise((resolve, reject) => {
        readable.pipe(process.stdout);
        readable.on('end', resolve);
        readable.on('error', reject);
      });
    }
    return;
  }

  // Handle --interactive flag: fill in missing options via wizard
  if (argv.interactive) {
    const { runInteractiveGenerate } = await import('./src/wizard.js');
    const interactiveOptions = await runInteractiveGenerate({
      columns: argv.columns,
      rows: argv.rows,
      format: argv.format,
      output: argv.output,
    });
    // Merge wizard answers back into argv
    argv.columns = interactiveOptions.columns;
    argv.rows = interactiveOptions.rows;
    argv.format = interactiveOptions.format;
    argv.output = interactiveOptions.output;
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

  // When no --output specified, write formatted data to stdout instead of a file
  if (!options.output) {
    const result = await generateAndSave({ ...options, noFile: true });
    if (argv.jsonOutput) {
      process.stdout.write(JSON.stringify({
        rowCount: result.rowCount,
        columnCount: result.columnCount,
        format: result.format,
        message: result.message,
      }) + '\n');
    } else {
      const out = result.data instanceof Buffer ? result.data : String(result.data);
      process.stdout.write(out instanceof Buffer ? out : (out.endsWith('\n') ? out : out + '\n'));
    }
    return;
  }

  // --json-output: generate to file as normal but also emit structured JSON on stdout
  if (argv.jsonOutput) {
    const result = await generateAndSave(options);
    process.stdout.write(JSON.stringify({
      rowCount: result.rowCount,
      columnCount: result.columnCount,
      format: result.format,
      output: result.output,
      message: result.message,
    }) + '\n');
    return;
  }

  await generateAndSave(options);
}

// CLI runner function
async function runCLI() {
  // UNIX convention: data on stdout, status/progress messages on stderr.
  // logger.log() is for data output (list-types, list-templates, preview rows) → stdout
  // logger.info/warn/error() are for status messages (✓ Generated...) → stderr
  setLogger({
    log: (...args) => process.stdout.write(args.join(' ') + '\n'),
    /* v8 ignore next 2 -- info/warn stderr routing; verified by subprocess tests */
    info: (...args) => process.stderr.write(args.join(' ') + '\n'),
    warn: (...args) => process.stderr.write(args.join(' ') + '\n'),
    error: (...args) => process.stderr.write(args.join(' ') + '\n'),
  });

  // Check for schema subcommand before yargs processes args (yargs v18 returns
  // undefined for argv._ after command dispatch, so we check raw process.argv)
  const isSubcommand = ['schema', 'infer', 'from-openapi', 'from-graphql', 'init', 'seed', 'mask'].includes(process.argv[2]);

  const argv = setupCLI();

  // --quiet suppresses all non-data output
  if (argv.quiet) {
    resetLogger();
  }

  // Subcommands are fully handled by their own yargs command handlers
  if (isSubcommand) {
    return;
  }

  // Read piped stdin before calling main (will be null when not piped)
  const stdinData = await readStdin();
  if (stdinData) {
    argv._stdinData = stdinData;
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
  readStdin,
  checkIsMainModule,
  executeIfMain
};

// Main execution - only run if this file is executed directly
executeIfMain();
