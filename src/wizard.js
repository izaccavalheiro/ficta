/**
 * Interactive CLI Wizard for Ficta schema creation.
 *
 * Lazily imports `@inquirer/prompts` to avoid bundling it for non-interactive
 * use-cases. This module is only executed when the user explicitly invokes
 * `ficta init` or passes `--interactive`.
 *
 * @module wizard
 */

import { listTemplates, listTypes, templates, parseColumns, columnStringToSchema } from './core.js';

/**
 * Lazily required prompts — package is optional and only pulled in at runtime.
 * @returns {Promise<import('@inquirer/prompts')>}
 */
/* v8 ignore next 10 */
async function getPrompts() {
  try {
    return await import('@inquirer/prompts');
  } catch {
    throw new Error(
      '"@inquirer/prompts" is required for the interactive wizard. ' +
      'Install it: npm install @inquirer/prompts'
    );
  }
}

const FORMATS = ['csv', 'json', 'xml', 'xlsx', 'tsv', 'sql', 'yaml', 'toml'];
const DIALECTS = ['postgres', 'mysql', 'sqlite', 'generic'];
const SPECIAL_TYPES = ['autoIncrement', 'uuid', 'enum:', 'range:', 'pattern:'];

/**
 * Run the interactive schema creation wizard.
 *
 * Guides the user step-by-step to produce a `ficta.schema.json`-compatible
 * object that can be passed directly to `generateFromSchemaFile()` or written
 * to disk.
 *
 * @param {Object|null} [prompter=null] - Optional prompter object for testing.
 *   Pass `{ input, select, confirm }` to bypass the dynamic import.
 * @returns {Promise<Object>} A ficta.schema.json-compatible schema object.
 */
export async function runInitWizard(prompter = null) {
  /* v8 ignore next 3 */
  if (!prompter) prompter = await getPrompts();
  const { input, select, confirm } = prompter;

  // -------------------------------------------------------------------------
  // Step 1: Template or scratch
  // -------------------------------------------------------------------------
  const mode = await select({
    message: 'How would you like to start?',
    /* v8 ignore next 4 */
    choices: [
      { name: 'Start from a template', value: 'template' },
      { name: 'Start from scratch', value: 'scratch' },
    ],
  });

  let tableName;
  let columnString = '';

  if (mode === 'template') {
    // -----------------------------------------------------------------------
    // Step 2a: Pick a template
    // -----------------------------------------------------------------------
    const templateNames = listTemplates();
    const selectedTemplate = await select({
      message: 'Choose a template:',
      choices: templateNames.map(name => ({ name, value: name })),
    });

    const tplDef = templates[selectedTemplate];
    tableName = selectedTemplate;
    /* v8 ignore next -- all registered templates are objects not plain strings */
    columnString = typeof tplDef === 'string' ? tplDef : tplDef.columns;

    const customize = await confirm({
      message: `Template "${selectedTemplate}" loaded. Customize columns?`,
      default: false,
    });

    if (customize) {
      columnString = await input({
        message: 'Column definitions (name:type,name:type, ...):',
        default: columnString,
      });
    }
  } else {
    // -----------------------------------------------------------------------
    // Step 2b: Scratch — enter table name
    // -----------------------------------------------------------------------
    tableName = await input({
      message: 'Table name:',
      default: 'my_table',
      /* v8 ignore next */
      validate: v => v.trim().length > 0 || 'Table name is required',
    });

    // -----------------------------------------------------------------------
    // Step 3: Add columns interactively
    // -----------------------------------------------------------------------
    const allTypes = [...SPECIAL_TYPES, ...listTypes()];
    const columns = [];

    let addMore = true;
    while (addMore) {
      const colName = await input({
        message: `Column name (or leave blank to finish):`,
        default: '',
      });

      if (!colName.trim()) {
        addMore = false;
        break;
      }

      const colType = await select({
        message: `Type for "${colName}":`,
        choices: allTypes.map(t => ({ name: t, value: t })),
      });

      const isPrimary = await confirm({
        message: `Is "${colName}" a primary key?`,
        default: colName === 'id',
      });

      const isNullable = await confirm({
        message: `Is "${colName}" nullable?`,
        default: !isPrimary,
      });

      columns.push({ name: colName, type: colType, primaryKey: isPrimary, nullable: isNullable });

      addMore = await confirm({
        message: 'Add another column?',
        default: true,
      });
    }

    columnString = columns.map(c => `${c.name}:${c.type}`).join(',');
  }

  // -------------------------------------------------------------------------
  // Step 4: Row count
  // -------------------------------------------------------------------------
  const rowsRaw = await input({
    message: 'How many rows to generate?',
    default: '100',
    /* v8 ignore next 4 */
    validate: v => {
      const n = Number(v);
      return (Number.isInteger(n) && n > 0) || 'Enter a positive integer';
    },
  });
  const rows = Number(rowsRaw);

  // -------------------------------------------------------------------------
  // Step 5: Output format
  // -------------------------------------------------------------------------
  const format = await select({
    message: 'Output format:',
    choices: FORMATS.map(f => ({ name: f, value: f })),
  });

  // -------------------------------------------------------------------------
  // Step 6: SQL dialect (only if SQL format)
  // -------------------------------------------------------------------------
  let dialect = 'generic';
  if (format === 'sql') {
    dialect = await select({
      message: 'SQL dialect:',
      choices: DIALECTS.map(d => ({ name: d, value: d })),
    });
  }

  // -------------------------------------------------------------------------
  // Build and return the schema object
  // -------------------------------------------------------------------------
  const parsedColumns = columnString
    ? columnStringToSchema(columnString)
    : [];

  const schemaObject = {
    $schema: 'node_modules/ficta/ficta-schema.v1.json',
    tables: [
      {
        name: tableName,
        columns: parsedColumns,
        rows,
      },
    ],
    format,
    ...(format === 'sql' ? { dialect } : {}),
  };

  return schemaObject;
}

/**
 * Interactively fill in any missing generation options.
 *
 * Called when the user passes `--interactive` to the default generate command.
 * Only prompts for options that are not already supplied.
 *
 * @param {Object} existingOptions - Options already parsed from CLI flags.
 * @param {Object|null} [prompter=null] - Optional prompter for testing.
 * @returns {Promise<Object>} Complete options object ready for `generateAndSave()`.
 */
export async function runInteractiveGenerate(existingOptions = {}, prompter = null) {
  /* v8 ignore next 3 */
  if (!prompter) prompter = await getPrompts();
  const { input, select } = prompter;

  let { columns, rows, format, output } = existingOptions;

  if (!columns) {
    columns = await input({
      message: 'Column definitions (name:type,...) or template name:',
      default: 'id:autoIncrement,name:fullName,email',
      /* v8 ignore next */
      validate: v => v.trim().length > 0 || 'Column definitions are required',
    });
  }

  if (!rows) {
    const rowsRaw = await input({
      message: 'Number of rows to generate:',
      default: '100',
      /* v8 ignore next 4 */
      validate: v => {
        const n = Number(v);
        return (Number.isInteger(n) && n > 0) || 'Enter a positive integer';
      },
    });
    rows = Number(rowsRaw);
  }

  if (!format) {
    format = await select({
      message: 'Output format:',
      choices: FORMATS.map(f => ({ name: f, value: f })),
    });
  }

  if (!output) {
    const ext = format === 'xlsx' ? 'xlsx' : format === 'yaml' ? 'yaml' : format;
    output = await input({
      message: 'Output filename:',
      default: `data.${ext}`,
      /* v8 ignore next */
      validate: v => v.trim().length > 0 || 'Output filename is required',
    });
  }

  return { ...existingOptions, columns, rows, format, output };
}
