/**
 * Tests for src/wizard.js
 *
 * The wizard uses dependency injection (prompter parameter) so we can pass
 * mock { input, select, confirm } objects without touching the real
 * @inquirer/prompts package.
 */

import { vi } from 'vitest';
import { faker } from '@faker-js/faker';
import { setFaker } from '../src/core.js';
import { runInitWizard, runInteractiveGenerate } from '../src/wizard.js';

setFaker(faker);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a mock prompter whose functions return responses in the given order.
 * Each response object has { input?, select?, confirm? } with a value.
 */
function makeSequentialPrompter(responses) {
  const inputQueue = [];
  const selectQueue = [];
  const confirmQueue = [];

  for (const r of responses) {
    if ('input' in r)   inputQueue.push(r.input);
    if ('select' in r)  selectQueue.push(r.select);
    if ('confirm' in r) confirmQueue.push(r.confirm);
  }

  return {
    input:   vi.fn().mockImplementation(() => Promise.resolve(inputQueue.shift())),
    select:  vi.fn().mockImplementation(() => Promise.resolve(selectQueue.shift())),
    confirm: vi.fn().mockImplementation(() => Promise.resolve(confirmQueue.shift())),
  };
}

// ---------------------------------------------------------------------------
// runInitWizard
// ---------------------------------------------------------------------------

describe('runInitWizard', () => {
  test('template mode — no customize: returns schema with template columns', async () => {
    const prompter = makeSequentialPrompter([
      { select: 'template' },   // mode
      { select: 'users' },      // template choice
      { confirm: false },        // customize?
      { input: '50' },           // rows
      { select: 'csv' },         // format
    ]);

    const schema = await runInitWizard(prompter);

    expect(schema.$schema).toBe('node_modules/ficta/ficta-schema.v1.json');
    expect(schema.tables).toHaveLength(1);
    expect(schema.tables[0].name).toBe('users');
    expect(schema.tables[0].rows).toBe(50);
    expect(Array.isArray(schema.tables[0].columns)).toBe(true);
    expect(schema.tables[0].columns.length).toBeGreaterThan(0);
    expect(schema.format).toBe('csv');
    expect(schema.dialect).toBeUndefined();
  });

  test('template mode — with customize: uses overridden column string', async () => {
    const prompter = makeSequentialPrompter([
      { select: 'template' },               // mode
      { select: 'users' },                  // template choice
      { confirm: true },                     // customize?
      { input: 'id:autoIncrement,label' },  // overridden columns
      { input: '100' },                      // rows
      { select: 'json' },                    // format
    ]);

    const schema = await runInitWizard(prompter);

    expect(schema.tables[0].name).toBe('users');
    expect(schema.tables[0].rows).toBe(100);
    expect(schema.format).toBe('json');
    // The columns come from the custom string — should have 2 entries
    expect(schema.tables[0].columns).toHaveLength(2);
    expect(schema.tables[0].columns[0].name).toBe('id');
    expect(schema.tables[0].columns[1].name).toBe('label');
  });

  test('scratch mode — one column then blank finish', async () => {
    const prompter = makeSequentialPrompter([
      { select: 'scratch' },        // mode
      { input: 'orders' },          // table name
      { input: 'id' },              // col name
      { select: 'autoIncrement' },  // col type
      { confirm: true },            // primary key?
      { confirm: false },           // nullable?
      { confirm: false },           // add more?
      { input: '10' },              // rows
      { select: 'json' },           // format
    ]);

    const schema = await runInitWizard(prompter);

    expect(schema.tables[0].name).toBe('orders');
    expect(schema.tables[0].rows).toBe(10);
    expect(schema.format).toBe('json');
    expect(schema.tables[0].columns).toHaveLength(1);
    expect(schema.tables[0].columns[0].name).toBe('id');
  });

  test('scratch mode — blank column name immediately finishes column loop', async () => {
    const prompter = makeSequentialPrompter([
      { select: 'scratch' },   // mode
      { input: 'empty_tbl' },  // table name
      { input: '' },           // blank col name → loop ends
      { input: '100' },        // rows
      { select: 'csv' },       // format
    ]);

    const schema = await runInitWizard(prompter);

    expect(schema.tables[0].name).toBe('empty_tbl');
    expect(schema.tables[0].columns).toEqual([]);
    expect(schema.tables[0].rows).toBe(100);
  });

  test('scratch mode — SQL format prompts for dialect', async () => {
    const prompter = makeSequentialPrompter([
      { select: 'scratch' },  // mode
      { input: 'orders' },    // table name
      { input: '' },          // blank col name
      { input: '5' },         // rows
      { select: 'sql' },      // format
      { select: 'mysql' },    // dialect
    ]);

    const schema = await runInitWizard(prompter);

    expect(schema.format).toBe('sql');
    expect(schema.dialect).toBe('mysql');
  });

  test('scratch mode — non-SQL format does not include dialect', async () => {
    const prompter = makeSequentialPrompter([
      { select: 'scratch' },  // mode
      { input: 'items' },     // table name
      { input: '' },          // blank col name
      { input: '20' },        // rows
      { select: 'json' },     // format (not sql)
    ]);

    const schema = await runInitWizard(prompter);

    expect(schema.format).toBe('json');
    expect(schema.dialect).toBeUndefined();
  });

  test('scratch mode — multiple columns with addMore=true then false', async () => {
    const prompter = makeSequentialPrompter([
      { select: 'scratch' },     // mode
      { input: 'people' },       // table name
      { input: 'id' },           // first col name
      { select: 'autoIncrement' },
      { confirm: true },         // isPrimary
      { confirm: false },        // isNullable
      { confirm: true },         // addMore? → yes
      { input: 'email' },        // second col name
      { select: 'email' },       // col type
      { confirm: false },        // isPrimary
      { confirm: false },        // isNullable
      { confirm: false },        // addMore? → no
      { input: '25' },           // rows
      { select: 'csv' },         // format
    ]);

    const schema = await runInitWizard(prompter);

    expect(schema.tables[0].columns).toHaveLength(2);
    expect(schema.tables[0].columns[0].name).toBe('id');
    expect(schema.tables[0].columns[1].name).toBe('email');
    expect(schema.tables[0].rows).toBe(25);
  });

  test('returns valid ficta.schema.json top-level structure', async () => {
    const prompter = makeSequentialPrompter([
      { select: 'template' },
      { select: 'products' },
      { confirm: false },
      { input: '10' },
      { select: 'yaml' },
    ]);

    const schema = await runInitWizard(prompter);

    // Must match ficta.schema.json shape
    expect(typeof schema.$schema).toBe('string');
    expect(Array.isArray(schema.tables)).toBe(true);
    expect(typeof schema.format).toBe('string');
    expect(schema.tables[0]).toHaveProperty('name');
    expect(schema.tables[0]).toHaveProperty('columns');
    expect(schema.tables[0]).toHaveProperty('rows');
  });
});

// ---------------------------------------------------------------------------
// runInteractiveGenerate
// ---------------------------------------------------------------------------

describe('runInteractiveGenerate', () => {
  test('all options missing — prompts for columns, rows, format, output', async () => {
    const prompter = makeSequentialPrompter([
      { input: 'id:autoIncrement,name:fullName' },  // columns
      { input: '20' },                               // rows
      { select: 'csv' },                             // format
      { input: 'output.csv' },                       // output file
    ]);

    const result = await runInteractiveGenerate({}, prompter);

    expect(result.columns).toBe('id:autoIncrement,name:fullName');
    expect(result.rows).toBe(20);
    expect(result.format).toBe('csv');
    expect(result.output).toBe('output.csv');
  });

  test('all options provided — no prompts are called', async () => {
    const prompter = {
      input: vi.fn(),
      select: vi.fn(),
      confirm: vi.fn(),
    };
    const existing = { columns: 'id,name', rows: 5, format: 'json', output: 'out.json' };

    const result = await runInteractiveGenerate(existing, prompter);

    expect(result).toEqual(existing);
    expect(prompter.input).not.toHaveBeenCalled();
    expect(prompter.select).not.toHaveBeenCalled();
    expect(prompter.confirm).not.toHaveBeenCalled();
  });

  test('columns and rows provided — only prompts for format and output', async () => {
    const prompter = makeSequentialPrompter([
      { select: 'json' },         // format
      { input: 'data.json' },     // output
    ]);
    const existing = { columns: 'id,name', rows: 50 };

    const result = await runInteractiveGenerate(existing, prompter);

    expect(result.columns).toBe('id,name');
    expect(result.rows).toBe(50);
    expect(result.format).toBe('json');
    expect(result.output).toBe('data.json');
  });

  test('format provided but output missing — only prompts for output', async () => {
    const prompter = makeSequentialPrompter([
      { input: 'result.csv' },  // output
    ]);
    const existing = { columns: 'id', rows: 10, format: 'csv' };

    const result = await runInteractiveGenerate(existing, prompter);

    expect(result.output).toBe('result.csv');
    expect(prompter.select).not.toHaveBeenCalled();
  });

  test('extra properties in existingOptions are preserved in the output', async () => {
    const prompter = {
      input: vi.fn(),
      select: vi.fn(),
      confirm: vi.fn(),
    };
    const existing = {
      columns: 'id',
      rows: 1,
      format: 'csv',
      output: 'out.csv',
      seed: 42,
      locale: 'fr',
    };

    const result = await runInteractiveGenerate(existing, prompter);

    expect(result.seed).toBe(42);
    expect(result.locale).toBe('fr');
  });

  test('rows coerced to number when prompted', async () => {
    const prompter = makeSequentialPrompter([
      { input: 'id:autoIncrement' },  // columns
      { input: '7' },                  // rows (string → should become 7)
      { select: 'tsv' },              // format
      { input: 'out.tsv' },           // output
    ]);

    const result = await runInteractiveGenerate({}, prompter);

    expect(typeof result.rows).toBe('number');
    expect(result.rows).toBe(7);
  });

  test('xlsx format uses "xlsx" as output extension default', async () => {
    // Covers branch: format === 'xlsx' → ext = 'xlsx'
    const prompter = makeSequentialPrompter([
      { input: 'id:autoIncrement,name:fullName' },  // columns
      { input: '10' },                               // rows
      { select: 'xlsx' },                            // format → ext = 'xlsx'
      { input: 'data.xlsx' },                        // output
    ]);

    const result = await runInteractiveGenerate({}, prompter);

    expect(result.format).toBe('xlsx');
    expect(result.output).toBe('data.xlsx');
  });

  test('yaml format uses "yaml" as output extension default', async () => {
    // Covers branch: format === 'yaml' → ext = 'yaml'
    const prompter = makeSequentialPrompter([
      { input: 'id:autoIncrement,name:fullName' },  // columns
      { input: '5' },                                // rows
      { select: 'yaml' },                            // format → ext = 'yaml'
      { input: 'data.yaml' },                        // output
    ]);

    const result = await runInteractiveGenerate({}, prompter);

    expect(result.format).toBe('yaml');
    expect(result.output).toBe('data.yaml');
  });
});
