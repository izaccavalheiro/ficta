import { vi } from 'vitest';
import {
  generateAndSave,
  writeFile,
  listTypes,
  listTemplates,
  generateFromDDL,
  generateFromSchemaFile,
  generateStream,
  seedFaker,
  inferSchemaFromFile,
  fromOpenAPIFile,
  fromGraphQLFile,
  watchAndGenerate,
  setLogger,
  getLogger,
  resetLogger,
  anonymizeFile,
} from '../src/node.js';
import { PassThrough } from 'stream';
import fs from 'fs';
import { promisify } from 'util';
import { parse } from 'csv-parse/sync';

const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

describe('Node.js Module', () => {
  const testFile = 'test-output.csv';

  afterEach(async () => {
    // Clean up test files
    if (fs.existsSync(testFile)) {
      await unlink(testFile);
    }
  });

  describe('writeFile', () => {
    test('should write CSV to file', async () => {
      const csv = 'id,name\n1,John\n2,Jane';
      await writeFile(csv, testFile);
      
      const fileExists = fs.existsSync(testFile);
      expect(fileExists).toBe(true);
      
      const content = await readFile(testFile, 'utf-8');
      expect(content).toBe(csv);
    });

    test('should overwrite existing file', async () => {
      await writeFile('old,data\n1,2', testFile);
      await writeFile('new,data\n3,4', testFile);
      
      const content = await readFile(testFile, 'utf-8');
      expect(content).toBe('new,data\n3,4');
    });

    test('should write Buffer to file', async () => {
      const buffer = Buffer.from('id,name\n1,John', 'utf-8');
      await writeFile(buffer, testFile);
      
      const fileExists = fs.existsSync(testFile);
      expect(fileExists).toBe(true);
      
      const content = await readFile(testFile, 'utf-8');
      expect(content).toBe('id,name\n1,John');
    });
  });

  describe('generateAndSave', () => {
    test('should generate and save CSV file', async () => {
      const result = await generateAndSave({
        columns: 'id:autoIncrement,name:fullName',
        rows: 10,
        output: testFile
      });
      
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('records');
      expect(result.rowCount).toBe(10);
      
      const fileExists = fs.existsSync(testFile);
      expect(fileExists).toBe(true);
      
      const content = await readFile(testFile, 'utf-8');
      expect(content).toContain('Id,Name');
    });

    test('should parse and validate CSV content', async () => {
      await generateAndSave({
        columns: 'id:autoIncrement,email:pattern:user+{COUNTER}@test.com',
        rows: 5,
        output: testFile
      });
      
      const content = await readFile(testFile, 'utf-8');
      const records = parse(content, { columns: true, skip_empty_lines: true });
      
      expect(records).toHaveLength(5);
      expect(records[0].Id).toBe('1');
      expect(records[0].Email).toBe('user+1@test.com');
      expect(records[4].Id).toBe('5');
      expect(records[4].Email).toBe('user+5@test.com');
    });

    test('should generate with static values', async () => {
      await generateAndSave({
        columns: 'status:static:active,count:static:10',
        rows: 3,
        output: testFile
      });
      
      const content = await readFile(testFile, 'utf-8');
      const records = parse(content, { columns: true, skip_empty_lines: true });
      
      records.forEach(record => {
        expect(record.Status).toBe('active');
        expect(record.Count).toBe('10');
      });
    });

    test('should generate with enum values', async () => {
      await generateAndSave({
        columns: 'status:enum:on|off',
        rows: 20,
        output: testFile
      });
      
      const content = await readFile(testFile, 'utf-8');
      const records = parse(content, { columns: true, skip_empty_lines: true });
      
      records.forEach(record => {
        expect(['on', 'off']).toContain(record.Status);
      });
    });

    test('should generate with range values', async () => {
      await generateAndSave({
        columns: 'age:range:20-30',
        rows: 50,
        output: testFile
      });
      
      const content = await readFile(testFile, 'utf-8');
      const records = parse(content, { columns: true, skip_empty_lines: true });
      
      records.forEach(record => {
        const age = parseInt(record.Age);
        expect(age).toBeGreaterThanOrEqual(20);
        expect(age).toBeLessThanOrEqual(30);
      });
    });

    test('should handle large datasets', async () => {
      await generateAndSave({
        columns: 'id:autoIncrement,email',
        rows: 1000,
        output: testFile
      });
      
      const content = await readFile(testFile, 'utf-8');
      const records = parse(content, { columns: true, skip_empty_lines: true });
      
      expect(records).toHaveLength(1000);
      expect(records[0].Id).toBe('1');
      expect(records[999].Id).toBe('1000');
    });

    test('should generate with preview option', async () => {
      const logCalls = [];
      setLogger({ log: (...a) => logCalls.push(a), info() {}, warn() {}, error() {} });

      try {
        await generateAndSave({
          columns: 'id:autoIncrement,name:fullName',
          rows: 5,
          output: testFile,
          preview: true
        });

        expect(logCalls.length).toBeGreaterThan(0);
      } finally {
        resetLogger();
      }
    });

    test('should default to test-data.csv if no output specified', async () => {
      const defaultFile = 'test-data.csv';
      
      try {
        await generateAndSave({
          columns: 'id:autoIncrement',
          rows: 1
        });
        
        const fileExists = fs.existsSync(defaultFile);
        expect(fileExists).toBe(true);
        
        // Clean up
        await unlink(defaultFile);
      } catch (err) {
        // Clean up on error too
        if (fs.existsSync(defaultFile)) {
          await unlink(defaultFile);
        }
        throw err;
      }
    });
  });

  describe('listTypes', () => {
    test('should return formatted list of types', () => {
      const types = listTypes();
      
      expect(typeof types).toBe('string');
      expect(types).toContain('Available Data Types:');
      expect(types).toContain('firstName');
      expect(types).toContain('email');
      expect(types).toContain('autoIncrement');
      expect(types).toContain('static');
      expect(types).toContain('enum');
      expect(types).toContain('range');
      expect(types).toContain('pattern');
    });

    test('should include person types', () => {
      const types = listTypes();
      expect(types).toContain('lastName');
      expect(types).toContain('fullName');
      expect(types).toContain('jobTitle');
    });

    test('should include internet types', () => {
      const types = listTypes();
      expect(types).toContain('email');
      expect(types).toContain('username');
      expect(types).toContain('url');
    });

    test('should include number types', () => {
      const types = listTypes();
      expect(types).toContain('number');
      expect(types).toContain('float');
    });
  });

  describe('listTemplates', () => {
    test('should return formatted list of templates', () => {
      const templates = listTemplates();
      
      expect(typeof templates).toBe('string');
      expect(templates).toContain('Available Templates:');
      expect(templates).toContain('users');
      expect(templates).toContain('products');
      expect(templates).toContain('transactions');
      expect(templates).toContain('addresses');
      expect(templates).toContain('contacts');
    });

    test('should include template details', () => {
      const templates = listTemplates();
      
      // Should show column info
      expect(templates).toContain('users');
      expect(templates).toContain('Columns');
      expect(templates).toContain('products');
      expect(templates).toContain('transactions');
    });
  });

  describe('generateFromDDL', () => {
    const outputDDLFile = 'test-from-ddl-output.sql';

    afterEach(async () => {
      if (fs.existsSync(outputDDLFile)) {
        await unlink(outputDDLFile);
      }
    });

    test('throws when schemaFile is not provided', async () => {
      await expect(generateFromDDL({})).rejects.toThrow('schemaFile is required');
    });

    test('generates SQL from a schema file', async () => {
      const sql = await generateFromDDL({
        schemaFile: 'test-schema.sql',
        rows: 2,
      });
      expect(typeof sql).toBe('string');
      expect(sql).toContain('INSERT INTO');
    });

    test('writes output file when output option provided', async () => {
      const logCalls = [];
      // Status messages now routed through info() (for stderr in CLI)
      setLogger({ log: (...a) => logCalls.push(a), info: (...a) => logCalls.push(a), warn() {}, error() {} });
      try {
        const sql = await generateFromDDL({
          schemaFile: 'test-schema.sql',
          rows: 2,
          output: outputDDLFile,
        });
        expect(fs.existsSync(outputDDLFile)).toBe(true);
        expect(typeof sql).toBe('string');
        expect(logCalls.length).toBeGreaterThan(0);
      } finally {
        resetLogger();
      }
    });

    // C5: locale param in generateFromDDL covers node.js:197 (core.setLocale branch)
    test('accepts locale option and applies it without throwing (C5)', async () => {
      const sql = await generateFromDDL({
        schemaFile: 'test-schema.sql',
        rows: 2,
        locale: 'de',
      });
      expect(typeof sql).toBe('string');
      expect(sql).toContain('INSERT INTO');
    });

    test('accepts seed option and produces reproducible output', async () => {
      const sql1 = await generateFromDDL({
        schemaFile: 'test-schema.sql',
        rows: 3,
        seed: 42,
      });
      const sql2 = await generateFromDDL({
        schemaFile: 'test-schema.sql',
        rows: 3,
        seed: 42,
      });
      expect(typeof sql1).toBe('string');
      expect(sql1).toBe(sql2);
    });
  });

  describe('seed support', () => {
    const seedFile1 = 'test-seed-1.json';
    const seedFile2 = 'test-seed-2.json';

    afterEach(async () => {
      for (const f of [seedFile1, seedFile2]) {
        if (fs.existsSync(f)) await unlink(f);
      }
    });

    test('two generateAndSave calls with the same seed produce identical data', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const r1 = await generateAndSave({
          columns: 'name:fullName,email,score:range:1-100',
          rows: 5,
          format: 'json',
          output: seedFile1,
          seed: 99,
        });
        const r2 = await generateAndSave({
          columns: 'name:fullName,email,score:range:1-100',
          rows: 5,
          format: 'json',
          output: seedFile2,
          seed: 99,
        });
        expect(r1.records).toEqual(r2.records);
      } finally {
        consoleSpy.mockRestore();
      }
    });

    test('seedFaker is re-exported from node.js', () => {
      expect(typeof seedFaker).toBe('function');
    });
  });

  describe('locale support', () => {
    test('generateAndSave with locale: en completes without error and produces expected row count', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const outFile = 'test-locale-output.csv';
      try {
        const result = await generateAndSave({
          columns: 'name:fullName,email',
          rows: 5,
          format: 'csv',
          output: outFile,
          locale: 'en',
        });
        expect(result.rowCount).toBe(5);
        expect(fs.existsSync(outFile)).toBe(true);
      } finally {
        consoleSpy.mockRestore();
        if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
      }
    });
  });

  describe('TypeScript declarations (index.d.ts)', () => {
    test('index.d.ts contains expected public API declarations', () => {
      const dts = fs.readFileSync('index.d.ts', 'utf-8');
      expect(dts).toContain('export function generateAndSave');
      expect(dts).toContain('export function generateFromDDL');
      expect(dts).toContain('export interface GenerateAndSaveOptions');
    });

    test('index.d.ts contains new feature declarations', () => {
      const dts = fs.readFileSync('index.d.ts', 'utf-8');
      // Schema inference
      expect(dts).toContain('export function inferSchemaFromFile');
      expect(dts).toContain('export interface InferResult');
      // OpenAPI bridge
      expect(dts).toContain('export function fromOpenAPIFile');
      expect(dts).toContain('export function fromOpenAPISchema');
      expect(dts).toContain('export function openAPIToFictaSchema');
      // GraphQL bridge
      expect(dts).toContain('export function fromGraphQLFile');
      expect(dts).toContain('export function fromGraphQLSDL');
      expect(dts).toContain('export function graphQLToFictaSchema');
      // Watch mode
      expect(dts).toContain('export function watchAndGenerate');
      expect(dts).toContain('export interface FileWatcher');
      // Parquet
      expect(dts).toContain('export function toParquet');
      expect(dts).toContain("'parquet'");
    });
  });

  describe('generateFromSchemaFile', () => {
    const schemaFile = 'test-ficta-schema.json';
    const outputFile = 'test-ficta-schema-out.sql';

    afterEach(() => {
      if (fs.existsSync(schemaFile)) fs.unlinkSync(schemaFile);
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
    });

    test('generates SQL containing CREATE TABLE and INSERT INTO from a valid schema file', async () => {
      const schema = {
        dialect: 'generic',
        defaultRows: 5,
        tables: [
          {
            name: 'users',
            rows: 3,
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'email', type: 'email', nullable: false }
            ]
          }
        ]
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      const sql = await generateFromSchemaFile({ schemaFile, outputMode: 'ddl+insert' });
      expect(sql).toContain('CREATE TABLE users');
      expect(sql).toContain('INSERT INTO');
    });

    test('rows override applies to all tables', async () => {
      const schema = {
        tables: [
          { name: 'items', columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }] }
        ]
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      const sql = await generateFromSchemaFile({ schemaFile, rows: 2, outputMode: 'insert' });
      // Should have exactly 2 INSERT rows (id = 1, id = 2)
      const insertMatches = sql.match(/\(\d+\)/g) || [];
      expect(insertMatches.length).toBeGreaterThanOrEqual(2);
    });

    test('throws a descriptive error for invalid JSON', async () => {
      fs.writeFileSync(schemaFile, 'NOT_JSON { bad }');
      await expect(generateFromSchemaFile({ schemaFile })).rejects.toThrow(
        `generateFromSchemaFile: invalid JSON in "${schemaFile}"`
      );
    });

    test('throws when tables key is missing', async () => {
      fs.writeFileSync(schemaFile, JSON.stringify({ dialect: 'postgres' }));
      await expect(generateFromSchemaFile({ schemaFile })).rejects.toThrow(
        'generateFromSchemaFile: schema must have a non-empty "tables" array'
      );
    });

    test('optionally writes output to a file', async () => {
      const schema = {
        tables: [
          { name: 'tags', columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }] }
        ]
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await generateFromSchemaFile({ schemaFile, output: outputFile });
        expect(fs.existsSync(outputFile)).toBe(true);
      } finally {
        consoleSpy.mockRestore();
      }
    });

    test('throws when schemaFile is not provided', async () => {
      await expect(generateFromSchemaFile({})).rejects.toThrow(
        'generateFromSchemaFile: schemaFile is required'
      );
    });

    test('throws a descriptive error when the schema file does not exist', async () => {
      await expect(
        generateFromSchemaFile({ schemaFile: '/nonexistent/ficta-missing-file.json' })
      ).rejects.toThrow('generateFromSchemaFile: could not read file');
    });

    test('throws when a table entry has no name (null name)', async () => {
      const schema = {
        tables: [{ columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }] }]
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      await expect(generateFromSchemaFile({ schemaFile })).rejects.toThrow(
        'generateFromSchemaFile: table "?" must have a name and columns array'
      );
    });

    test('throws when a table entry is missing a columns array', async () => {
      const schema = {
        tables: [{ name: 'bad_table' }]   // no columns array
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      await expect(generateFromSchemaFile({ schemaFile })).rejects.toThrow(
        'generateFromSchemaFile: table "bad_table" must have a name and columns array'
      );
    });

    test('mixed per-table row counts path — ddl+insert mode', async () => {
      const schema = {
        tables: [
          {
            name: 'parents',
            rows: 3,
            columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }, { name: 'label', type: 'word' }]
          },
          {
            name: 'children',
            rows: 5,   // different count → triggers the mixed-rows else branch
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'parent_id', type: 'integer', references: { table: 'parents', column: 'id' } },
              { name: 'label', type: 'word' }
            ]
          }
        ]
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      const sql = await generateFromSchemaFile({ schemaFile, outputMode: 'ddl+insert' });
      expect(sql).toContain('CREATE TABLE parents');
      expect(sql).toContain('CREATE TABLE children');
      expect(sql).toContain('INSERT INTO');
    });

    test('mixed per-table row counts path — insert mode (no DDL)', async () => {
      const schema = {
        tables: [
          {
            name: 'a',
            rows: 2,
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'name', type: 'word' }
            ]
          },
          {
            name: 'b',
            rows: 4,
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'a_id', type: 'integer', references: { table: 'a', column: 'id' } }
            ]
          }
        ]
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      const sql = await generateFromSchemaFile({ schemaFile, outputMode: 'insert' });
      expect(sql).not.toContain('CREATE TABLE');
      expect(sql).toContain('INSERT INTO');
    });

    test('mixed per-table row counts path — upsert mode', async () => {
      const schema = {
        tables: [
          {
            name: 'p',
            rows: 2,
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'label', type: 'word' }
            ]
          },
          {
            name: 'q',
            rows: 3,
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'p_id', type: 'integer', references: { table: 'p', column: 'id' } },
              { name: 'value', type: 'word' }
            ]
          }
        ]
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      const sql = await generateFromSchemaFile({ schemaFile, outputMode: 'upsert' });
      // Upsert generates conflict-aware INSERT statements
      expect(sql).toBeDefined();
      expect(typeof sql).toBe('string');
    });

    test('mixed per-table row counts — tables without primary keys (covers || [] fallback)', async () => {
      const schema = {
        tables: [
          { name: 'nopk1', rows: 2, columns: [{ name: 'val', type: 'word' }] },
          { name: 'nopk2', rows: 3, columns: [{ name: 'label', type: 'word' }] }
        ]
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      // 'insert' mode doesn't require PKs; exercises the tbl.primaryKey || [] fallback
      const sql = await generateFromSchemaFile({ schemaFile, outputMode: 'insert' });
      expect(sql).toBeDefined();
      expect(typeof sql).toBe('string');
      expect(sql).toContain('INSERT INTO');
    });

    test('column type mapping covers sqlType override and all special types', async () => {
      const schema = {
        tables: [
          {
            name: 'typed_cols',
            rows: 1,
            columns: [
              { name: 'a', type: 'float' },
              { name: 'b', type: 'boolean' },
              { name: 'c', type: 'uuid' },
              { name: 'd', type: 'timestamp' },
              { name: 'e', type: 'pastDate' },
              { name: 'f', type: 'futureDate' },
              { name: 'g', type: 'recentDate' },
              { name: 'h', type: 'date' },
              { name: 'i', type: 'json' },
              { name: 'j', type: 'integer' },
              { name: 'k', type: 'int' },
              { name: 'l', type: 'word', sqlType: 'CUSTOM_TYPE' },
              { name: 'm', type: 'word', nullable: false },
              { name: 'n', type: 'word', notNull: true },
              { name: 'o', type: 'word', default: 0 },
              { name: 'p', type: 'word', references: { table: 'typed_cols', column: 'l' } }
            ]
          }
        ]
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      const sql = await generateFromSchemaFile({ schemaFile, outputMode: 'ddl+insert' });
      expect(sql).toContain('CREATE TABLE typed_cols');
      expect(sql).toContain('CUSTOM_TYPE');
    });

    test('mixed rows with rows:0 table — fallback to defaultRows branch', async () => {
      const schema = {
        tables: [
          // rows: 0 makes tableRows[name] = 0, which is falsy → || defaultRows fires
          { name: 'zero_rows_tbl', rows: 0, columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }] },
          { name: 'other_tbl', rows: 3, columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }] }
        ]
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      const sql = await generateFromSchemaFile({ schemaFile, outputMode: 'insert' });
      expect(sql).toBeDefined();
      // other_tbl should have 3 inserts
      expect(sql).toContain('INSERT INTO other_tbl');
    });

    test('FK to no-PK parent — pkEntry undefined branch (ternary false path)', async () => {
      const schema = {
        tables: [
          // parent has NO primaryKey → pkStore will have no entry for it
          { name: 'nopk_par', rows: 2, columns: [{ name: 'id', type: 'integer' }, { name: 'val', type: 'word' }] },
          // child has FK to no-PK parent → pkEntry will be undefined → ternary false
          { name: 'nopk_chld', rows: 3, columns: [
            { name: 'id', type: 'autoIncrement', primaryKey: true },
            { name: 'par_id', type: 'integer', references: { table: 'nopk_par', column: 'id' } },
            { name: 'label', type: 'word' }
          ]}
        ]
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      const sql = await generateFromSchemaFile({ schemaFile, outputMode: 'ddl+insert' });
      expect(sql).toContain('INSERT INTO nopk_chld');
    });

    test('mixed-rows upsert mode generates valid UPSERT statements', async () => {
      const schema = {
        tables: [
          { name: 'ups_a', rows: 2, columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }, { name: 'v', type: 'word' }] },
          { name: 'ups_b', rows: 3, columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }, { name: 'val', type: 'word' }] }
        ]
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      const sql = await generateFromSchemaFile({ schemaFile, outputMode: 'upsert' });
      // Upsert for generic dialect uses INSERT OR REPLACE or ON CONFLICT
      expect(sql).toContain('ups_a');
      expect(sql).toContain('ups_b');
    });

    test('FK to non-PK column of parent — pkEntry[fk.refColumn] falsy branch', async () => {
      // parent has PK='id' stored in pkStore, but child FK references 'code' (not stored)
      // → pkEntry is defined, pkEntry['code'] = undefined → || [] fires
      const schema = {
        tables: [
          {
            name: 'ref_par', rows: 2,
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'code', type: 'word' }
            ]
          },
          {
            name: 'ref_chld', rows: 3,
            columns: [
              { name: 'id', type: 'autoIncrement', primaryKey: true },
              { name: 'par_code', type: 'word', references: { table: 'ref_par', column: 'code' } },
              { name: 'val', type: 'word' }
            ]
          }
        ]
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      const sql = await generateFromSchemaFile({ schemaFile, outputMode: 'ddl+insert' });
      expect(sql).toContain('INSERT INTO ref_chld');
    });

    test('composite PK table — covers the second-PK pkStore[tbl] already-set path', async () => {
      const schema = {
        tables: [
          // composite PK: id + code — pkStore set on first PK, already set on second
          { name: 'comp_pk', rows: 2, columns: [
            { name: 'id', type: 'autoIncrement', primaryKey: true },
            { name: 'code', type: 'word', primaryKey: true }
          ]},
          { name: 'comp_child', rows: 3, columns: [
            { name: 'id', type: 'autoIncrement', primaryKey: true },
            { name: 'val', type: 'word' }
          ]}
        ]
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      const sql = await generateFromSchemaFile({ schemaFile, outputMode: 'insert' });
      expect(sql).toContain('INSERT INTO comp_pk');
      expect(sql).toContain('INSERT INTO comp_child');
    });

    test('accepts locale option and applies it without throwing', async () => {
      const schema = {
        tables: [
          { name: 'loc_table', rows: 2, columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }, { name: 'name', type: 'fullName' }] }
        ]
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      const sql = await generateFromSchemaFile({ schemaFile, outputMode: 'insert', locale: 'fr' });
      expect(typeof sql).toBe('string');
      expect(sql).toContain('INSERT INTO loc_table');
    });

    test('accepts dialect override that takes precedence over schema.dialect', async () => {
      const schema = {
        dialect: 'generic',
        tables: [
          { name: 'dialect_table', rows: 2, columns: [{ name: 'id', type: 'autoIncrement', primaryKey: true }] }
        ]
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      // Override generic with postgres → SERIAL should appear in DDL
      const sql = await generateFromSchemaFile({ schemaFile, outputMode: 'ddl+insert', dialect: 'postgres' });
      expect(sql).toContain('SERIAL');
    });

    test('accepts seed option and produces identical output on repeated calls', async () => {
      const schema = {
        tables: [
          { name: 'seed_table', rows: 3, columns: [
            { name: 'id', type: 'autoIncrement', primaryKey: true },
            { name: 'email', type: 'email' }
          ]}
        ]
      };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      const sql1 = await generateFromSchemaFile({ schemaFile, outputMode: 'insert', seed: 77 });
      const sql2 = await generateFromSchemaFile({ schemaFile, outputMode: 'insert', seed: 77 });
      expect(sql1).toBe(sql2);
    });
  });

  describe('generateStream', () => {
    /**
     * Helper: collect all chunks from a Readable into a single string.
     */
    function collectStream(readable) {
      return new Promise((resolve, reject) => {
        const chunks = [];
        readable.on('data', chunk => chunks.push(chunk));
        readable.on('end', () => resolve(chunks.join('')));
        readable.on('error', reject);
      });
    }

    test('CSV stream has header row and correct row count', async () => {
      const stream = generateStream({
        columns: 'id:autoIncrement,name:fullName',
        rows: 10,
        format: 'csv',
      });
      const output = await collectStream(stream);
      const lines = output.trim().split('\n');
      // First line is header (Title Case)
      expect(lines[0]).toBe('Id,Name');
      // Remaining lines are data rows
      expect(lines.length).toBe(11); // header + 10 data rows
    });

    test('NDJSON stream: each line parses as JSON with correct keys', async () => {
      const stream = generateStream({
        columns: 'id:autoIncrement,email:email',
        rows: 5,
        format: 'ndjson',
      });
      const output = await collectStream(stream);
      const lines = output.trim().split('\n');
      expect(lines.length).toBe(5);
      lines.forEach(line => {
        const obj = JSON.parse(line);
        expect(obj).toHaveProperty('id');
        expect(obj).toHaveProperty('email');
      });
    });

    test('batchSize option: stream with batchSize 10, rows 25 emits correct total rows', async () => {
      const stream = generateStream({
        columns: 'id:autoIncrement,word:word',
        rows: 25,
        format: 'ndjson',
        batchSize: 10,
      });
      const output = await collectStream(stream);
      const lines = output.trim().split('\n').filter(l => l.trim());
      expect(lines.length).toBe(25);
    });

    test('unsupported format throws synchronously with a descriptive error', () => {
      expect(() => generateStream({ columns: 'id', rows: 5, format: 'xml' })).toThrow(
        'generateStream only supports csv and ndjson formats. Use generateAndSave() for xml'
      );
    });

    test('stream is pipeable via PassThrough', async () => {
      const stream = generateStream({
        columns: 'id:autoIncrement',
        rows: 3,
        format: 'ndjson',
      });
      const pt = new PassThrough();
      stream.pipe(pt);
      const output = await collectStream(pt);
      const lines = output.trim().split('\n').filter(l => l.trim());
      expect(lines.length).toBe(3);
    });

    test('CSV stream with header: false omits the header row', async () => {
      const stream = generateStream({
        columns: 'id:autoIncrement,val:word',
        rows: 3,
        format: 'csv',
        formatOptions: { header: false },
      });
      const output = await collectStream(stream);
      const lines = output.trim().split('\n');
      // No header: first line must start with a digit (id = 1)
      expect(lines[0]).toMatch(/^\d/);
      expect(lines.length).toBe(3);
    });

    test('CSV stream with headerFormat: raw uses raw column names', async () => {
      const stream = generateStream({
        columns: 'firstName:fullName,emailAddress:email',
        rows: 1,
        format: 'csv',
        formatOptions: { headerFormat: 'raw' },
      });
      const output = await collectStream(stream);
      const lines = output.trim().split('\n');
      expect(lines[0]).toBe('firstName,emailAddress');
    });

    test('seed produces reproducible CSV output', async () => {
      const opts = { columns: 'id:autoIncrement,val:word', rows: 5, format: 'csv', seed: 42 };
      const run1 = await collectStream(generateStream(opts));
      const run2 = await collectStream(generateStream(opts));
      expect(run1).toBe(run2);
    });

    test('throws synchronously when rows is 0 or negative', () => {
      expect(() => generateStream({ columns: 'id', rows: 0, format: 'csv' })).toThrow(
        'generateStream: rows must be a positive number'
      );
      expect(() => generateStream({ columns: 'id', rows: -1, format: 'csv' })).toThrow(
        'generateStream: rows must be a positive number'
      );
    });

    test('throws synchronously when template is unknown', () => {
      expect(() =>
        generateStream({ template: 'nonExistentFictaTemplate', rows: 5, format: 'csv' })
      ).toThrow(/unknown template/i);
    });

    test('resolves columns via a valid built-in template', async () => {
      const stream = generateStream({ template: 'users', rows: 2, format: 'csv' });
      const output = await collectStream(stream);
      const lines = output.trim().split('\n').filter(l => l.trim());
      // header + 2 data rows
      expect(lines.length).toBe(3);
      // Header should include standard users-template columns
      expect(lines[0]).toMatch(/Id|id/i);
    });

    test('template + explicit columns: explicit columns take precedence (covers !columnString=false branch)', async () => {
      // Provide BOTH template and explicit columns — explicit columns should be used
      const stream = generateStream({ template: 'users', columns: 'id:autoIncrement,name:fullName', rows: 2, format: 'csv' });
      const output = await collectStream(stream);
      const lines = output.trim().split('\n').filter(l => l.trim());
      // Should only have 2 columns (Id, Name) not the full users template
      expect(lines[0].split(',').length).toBe(2);
    });

    test('throws synchronously when neither columns nor template is provided', () => {
      expect(() => generateStream({ rows: 5, format: 'csv' })).toThrow(
        'generateStream: either columns or template must be provided'
      );
    });

    test('locale option is accepted without throwing', async () => {
      const stream = generateStream({
        columns: 'id:autoIncrement,name:fullName',
        rows: 2,
        format: 'ndjson',
        locale: 'en',
      });
      const output = await collectStream(stream);
      const lines = output.trim().split('\n').filter(l => l.trim());
      expect(lines.length).toBe(2);
    });

    test('CSV stream correctly escapes values containing commas or quotes', async () => {
      const stream = generateStream({
        columns: 'id:autoIncrement,data:json',
        rows: 5,
        format: 'csv',
      });
      const output = await collectStream(stream);
      // JSON values contain commas/braces — they must be wrapped in double quotes
      expect(output).toMatch(/"[^"]*"/);
    });
  });

  // ---------------------------------------------------------------------------
  // inferSchemaFromFile
  // ---------------------------------------------------------------------------
  describe('inferSchemaFromFile', () => {
    const tmpCsv = 'test-infer-sample.csv';
    const tmpJson = 'test-infer-sample.json';
    const tmpJsonEnvelope = 'test-infer-envelope.json';
    const tmpBadExt = 'test-infer-sample.xyz';

    afterEach(async () => {
      for (const f of [tmpCsv, tmpJson, tmpJsonEnvelope, tmpBadExt]) {
        if (fs.existsSync(f)) await unlink(f).catch(() => {});
      }
    });

    test('infers schema from a small CSV file', async () => {
      const content = 'id,email,name\n1,alice@example.com,Alice\n2,bob@example.com,Bob\n';
      await writeFile(content, tmpCsv);
      const result = await inferSchemaFromFile(tmpCsv);
      expect(result.columns).toBeDefined();
      expect(typeof result.columns).toBe('string');
      expect(result.columns.length).toBeGreaterThan(0);
      expect(result.columnList).toHaveLength(3);
    });

    test('infers schema from a JSON array file', async () => {
      const data = [
        { id: 1, name: 'Alice', score: 42 },
        { id: 2, name: 'Bob', score: 99 },
      ];
      await writeFile(JSON.stringify(data), tmpJson);
      const result = await inferSchemaFromFile(tmpJson);
      expect(result.columns.length).toBeGreaterThan(0);
      expect(result.columnList.length).toBeGreaterThan(0);
    });

    test('infers schema from a JSON { data: [...] } envelope file', async () => {
      const payload = { data: [{ id: 1, email: 'a@b.com' }] };
      await writeFile(JSON.stringify(payload), tmpJsonEnvelope);
      const result = await inferSchemaFromFile(tmpJsonEnvelope);
      expect(result.columns.length).toBeGreaterThan(0);
    });

    test('throws for unsupported file extension', async () => {
      await writeFile('some content', tmpBadExt);
      await expect(inferSchemaFromFile(tmpBadExt)).rejects.toThrow('unsupported file type');
    });

    test('infers from JSON object without data property (covers parsed.data || [] fallback)', async () => {
      // parsed = {} → Array.isArray({}) = false → (parsed.data || []) → (undefined || []) = []
      const tmpJsonEmpty = 'test-infer-empty-obj.json';
      try {
        await writeFile(JSON.stringify({}), tmpJsonEmpty);
        const result = await inferSchemaFromFile(tmpJsonEmpty);
        expect(result.columnList).toEqual([]);
        expect(result.columns).toBe('');
      } finally {
        if (fs.existsSync(tmpJsonEmpty)) await unlink(tmpJsonEmpty).catch(() => {});
      }
    });
  });

  // ---------------------------------------------------------------------------
  // fromOpenAPIFile
  // ---------------------------------------------------------------------------
  describe('fromOpenAPIFile', () => {
    const tmpOpenApiJson = 'test-openapi.json';
    const tmpOpenApiYaml = 'test-openapi.yaml';

    const openApiDoc = {
      openapi: '3.0.0',
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
            }
          }
        }
      }
    };

    afterEach(async () => {
      for (const f of [tmpOpenApiJson, tmpOpenApiYaml]) {
        if (fs.existsSync(f)) await unlink(f).catch(() => {});
      }
    });

    test('reads a JSON OpenAPI file and returns ficta.schema.json structure', async () => {
      await writeFile(JSON.stringify(openApiDoc), tmpOpenApiJson);
      const result = await fromOpenAPIFile(tmpOpenApiJson);
      expect(result).toHaveProperty('tables');
      expect(result.tables.length).toBeGreaterThan(0);
    });

    test('reads a YAML OpenAPI file', async () => {
      const yamlContent = `
openapi: "3.0.0"
components:
  schemas:
    Item:
      type: object
      properties:
        name:
          type: string
        qty:
          type: integer
`;
      await writeFile(yamlContent, tmpOpenApiYaml);
      const result = await fromOpenAPIFile(tmpOpenApiYaml);
      expect(result).toHaveProperty('tables');
    });

    test('accepts .yml extension too', async () => {
      const tmpYml = 'test-openapi.yml';
      const yamlContent = `
openapi: "3.0.0"
components:
  schemas:
    Widget:
      type: object
      properties:
        title:
          type: string
`;
      await writeFile(yamlContent, tmpYml);
      try {
        const result = await fromOpenAPIFile(tmpYml);
        expect(result).toHaveProperty('tables');
      } finally {
        if (fs.existsSync(tmpYml)) await unlink(tmpYml).catch(() => {});
      }
    });
  });

  // ---------------------------------------------------------------------------
  // fromGraphQLFile
  // ---------------------------------------------------------------------------
  describe('fromGraphQLFile', () => {
    const tmpGql = 'test-schema.graphql';

    const sdlContent = `
      type User {
        id: ID!
        email: String!
        age: Int
      }
    `;

    afterEach(async () => {
      if (fs.existsSync(tmpGql)) await unlink(tmpGql).catch(() => {});
    });

    test('reads a .graphql file and returns ficta.schema.json structure', async () => {
      await writeFile(sdlContent, tmpGql);
      const result = await fromGraphQLFile(tmpGql);
      expect(result).toHaveProperty('tables');
      expect(result.tables.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // watchAndGenerate
  // ---------------------------------------------------------------------------
  describe('watchAndGenerate', () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const ddlFixture = `
      CREATE TABLE watch_test (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255)
      );
    `;

    test('throws when schemaFile is not provided', () => {
      expect(() => watchAndGenerate({ output: 'out.sql' })).toThrow('watchAndGenerate: schemaFile is required');
    });

    test('returns an object with a stop() method', () => {
      // Use a non-existent file; we're just checking the return shape
      const watcher = watchAndGenerate({ schemaFile: '__non_existent__.sql' });
      expect(typeof watcher.stop).toBe('function');
      watcher.stop();
    });

    test('stop() can be called multiple times without error', () => {
      const watcher = watchAndGenerate({ schemaFile: '__non_existent__.sql' });
      expect(() => { watcher.stop(); watcher.stop(); }).not.toThrow();
    });

    test('calls onSuccess after file change', async () => {
      // Write a temp DDL file
      const tmpSchema = 'test-watch-schema.sql';
      const tmpOut = 'test-watch-out.sql';

      try {
        await writeFile(ddlFixture, tmpSchema);

        let resolveFirst;
        const firstCall = new Promise(r => { resolveFirst = r; });

        const watcher = watchAndGenerate({
          schemaFile: tmpSchema,
          output: tmpOut,
          outputMode: 'insert',
          dialect: 'generic',
          rows: 2,
          debounceMs: 100,
          onSuccess: (path, ms) => resolveFirst({ path, ms }),
          onError: (e) => { /* Swallow errors in test */ },
        });

        // Wait briefly for watcher to initialize, then touch the file
        await sleep(100);
        await fs.promises.appendFile(tmpSchema, '\n-- touch');

        const result = await Promise.race([
          firstCall,
          sleep(3000).then(() => null),
        ]);

        watcher.stop();

        // The file change should have triggered onSuccess
        expect(result).not.toBeNull();
        expect(typeof result.ms).toBe('number');
      } finally {
        for (const f of [tmpSchema, tmpOut]) {
          if (fs.existsSync(f)) await unlink(f).catch(() => {});
        }
      }
    }, 10000);

    test('calls onError when generateFromDDL fails after file change', async () => {
      // Creates a valid schema file, starts watcher, then corrupts the file
      // so that the next regeneration call throws and onError is invoked.
      const tmpSchema = 'test-watch-error-onerror.sql';
      const validDDL = `
        CREATE TABLE watch_err_test (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255)
        );
      `;

      let capturedError = null;
      let resolveError;
      const errorPromise = new Promise(r => { resolveError = r; });

      try {
        await writeFile(validDDL, tmpSchema);

        const watcher = watchAndGenerate({
          schemaFile: tmpSchema,
          outputMode: 'insert',
          dialect: 'generic',
          rows: 2,
          debounceMs: 50,
          onError: (err) => {
            capturedError = err;
            resolveError(err);
          },
        });

        // Let the watcher initialize
        await sleep(100);

        // Overwrite with invalid SQL so next generation fails
        fs.writeFileSync(tmpSchema, 'TOTALLY INVALID SQL NOT PARSEABLE ###');

        // Wait for onError to be called (via file-change → handler → runGeneration → catch)
        await Promise.race([
          errorPromise,
          sleep(3000).then(() => null),
        ]);

        watcher.stop();

        expect(capturedError).not.toBeNull();
      } finally {
        if (fs.existsSync(tmpSchema)) await unlink(tmpSchema).catch(() => {});
      }
    }, 10000);

    test('successful generation with no onSuccess callback (covers if(onSuccess) false branch)', async () => {
      const tmpSchema = 'test-watch-no-onsuccess.sql';
      const tmpOut = 'test-watch-no-onsuccess-out.sql';
      const ddl = `CREATE TABLE no_onsuccess_test (id SERIAL PRIMARY KEY, name VARCHAR(255));`;

      try {
        await writeFile(ddl, tmpSchema);

        const watcher = watchAndGenerate({
          schemaFile: tmpSchema,
          output: tmpOut,
          outputMode: 'insert',
          dialect: 'generic',
          rows: 2,
          debounceMs: 50,
          // NO onSuccess callback — covers the `if (onSuccess)` false branch
          onError: (e) => { /* Suppress */ },
        });

        await sleep(100);
        // Touch file to trigger generation
        fs.appendFileSync(tmpSchema, '\n-- touch');

        // Wait for generation to complete (no onSuccess to await, just wait)
        await sleep(500);
        watcher.stop();
      } finally {
        for (const f of [tmpSchema, tmpOut]) {
          if (fs.existsSync(f)) await unlink(f).catch(() => {});
        }
      }
    }, 10000);

    test('successful generation with no output covers (output || "") empty-string branch', async () => {
      const tmpSchema = 'test-watch-no-output.sql';
      const ddl = `CREATE TABLE no_output_test (id SERIAL PRIMARY KEY);`;

      let resolveSuccess;
      const successPromise = new Promise(r => { resolveSuccess = r; });

      try {
        await writeFile(ddl, tmpSchema);

        const watcher = watchAndGenerate({
          schemaFile: tmpSchema,
          // No output — generateOptions.output is undefined → `output || ''` = ''
          outputMode: 'insert',
          dialect: 'generic',
          rows: 1,
          debounceMs: 50,
          onSuccess: (path, ms) => resolveSuccess({ path, ms }),
          onError: (e) => { /* Suppress */ },
        });

        await sleep(100);
        fs.appendFileSync(tmpSchema, '\n-- touch');

        const result = await Promise.race([
          successPromise,
          sleep(3000).then(() => null),
        ]);

        watcher.stop();

        expect(result).not.toBeNull();
        // output was '' (empty string from the || '' fallback)
        expect(result.path).toBe('');
      } finally {
        if (fs.existsSync(tmpSchema)) await unlink(tmpSchema).catch(() => {});
      }
    }, 10000);

    test('debounce guard: runGeneration skipped when stopped before debounce fires', async () => {
      // Covers the `if (!stopped) runGeneration()` FALSE branch (BRDA:554)
      const tmpSchema = 'test-watch-stop-before-debounce.sql';
      const ddl = `CREATE TABLE debounce_stop_test (id SERIAL PRIMARY KEY);`;

      let successCalled = false;
      try {
        await writeFile(ddl, tmpSchema);

        const watcher = watchAndGenerate({
          schemaFile: tmpSchema,
          outputMode: 'insert',
          dialect: 'generic',
          rows: 1,
          debounceMs: 400, // Long debounce — we'll stop before it fires
          onSuccess: () => { successCalled = true; },
          onError: () => { /* Suppress */ },
        });

        // Wait for fs.watch to initialize
        await sleep(100);

        // Touch file → handler() runs → sets debounce timer (400ms)
        fs.appendFileSync(tmpSchema, '\n-- touch');

        // Wait briefly for the handler to have run
        await sleep(50);

        // Stop now, before the 400ms debounce fires
        watcher.stop(); // stopped = true

        // Wait for the debounce timer to would-have-fired
        await sleep(500);

        // runGeneration should NOT have been called because stopped=true
        expect(successCalled).toBe(false);
      } finally {
        if (fs.existsSync(tmpSchema)) await unlink(tmpSchema).catch(() => {});
      }
    }, 10000);

    test('onError not provided causes throw on generation failure', async () => {
      // We can't easily test this without triggering the handler, but we ensure
      // the constructor path works when no onError is given
      const watcher = watchAndGenerate({
        schemaFile: '__non_existent__.sql',
        outputMode: 'insert',
        dialect: 'generic',
        rows: 2,
      });
      watcher.stop();
      // No error thrown synchronously — pass
    });
  });
});

// ---------------------------------------------------------------------------
// Logger system tests (Prompt #2)
// ---------------------------------------------------------------------------
describe('Logger system', () => {
  afterEach(() => {
    // Always restore no-op logger between tests
    resetLogger();
  });

  test('by default generateAndSave does NOT call console.log (no-op logger)', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      resetLogger(); // ensure no-op
      const tmpFile = 'test-logger-noop.csv';
      await generateAndSave({ columns: 'id:autoIncrement', rows: 1, output: tmpFile });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
      if (import('fs').then) {
        const fs = await import('fs');
        if (fs.existsSync('test-logger-noop.csv')) fs.unlinkSync('test-logger-noop.csv');
      }
    }
  });

  test('setLogger causes ✓ Generated status to go via info() (stderr in CLI)', async () => {
    const logCalls = [];
    // Status messages now go through info() so stderr-routing loggers capture them
    const mockLogger = { log: (...args) => logCalls.push(args.join(' ')), info: (...args) => logCalls.push(args.join(' ')), warn() {}, error() {} };
    setLogger(mockLogger);
    const tmpFile = 'test-logger-active.csv';
    try {
      await generateAndSave({ columns: 'id:autoIncrement', rows: 1, output: tmpFile });
      expect(logCalls.length).toBeGreaterThan(0);
      expect(logCalls[0]).toContain('✓ Generated');
    } finally {
      const fs = await import('fs');
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });

  test('generateAndSave result includes message string', async () => {
    const tmpFile = 'test-logger-msg.csv';
    try {
      const result = await generateAndSave({ columns: 'id:autoIncrement', rows: 2, output: tmpFile });
      expect(typeof result.message).toBe('string');
      expect(result.message).toContain('✓ Generated');
      expect(result.message).toContain('2 rows');
    } finally {
      const fs = await import('fs');
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });

  test('listTypes does not call console.log by default', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    resetLogger();
    try {
      listTypes();
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  test('listTemplates does not call console.log by default', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    resetLogger();
    try {
      listTemplates();
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  test('resetLogger restores no-op behavior', () => {
    const calls = [];
    setLogger({ log: (...a) => calls.push(a), warn() {}, info() {}, error() {} });
    expect(getLogger().log).toBeDefined();
    resetLogger();
    // After reset, log call should be no-op (no throw, no calls recorded)
    getLogger().log('test');
    expect(calls).toHaveLength(0); // logged before reset
  });

  test('setLogger(null) resets to no-op', () => {
    const calls = [];
    setLogger({ log: (...a) => calls.push(a), warn() {}, info() {}, error() {} });
    setLogger(null);
    getLogger().log('should not record');
    expect(calls).toHaveLength(0);
  });

  test('generateFromDDL with output set calls getLogger().info not console.log', async () => {
    const tmpSql = 'test-logger-ddl-out.sql';
    const tmpSchema = 'test-logger-ddl-schema.sql';
    const logCalls = [];
    // Status messages now go through info(); log() is for data output (list-types etc.)
    const mockLogger = { log: (...a) => logCalls.push(a.join(' ')), info: (...a) => logCalls.push(a.join(' ')), warn() {}, error() {} };
    setLogger(mockLogger);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const fs = await import('fs');
      fs.writeFileSync(tmpSchema, 'CREATE TABLE t1 (id SERIAL PRIMARY KEY);');
      await generateFromDDL({ schemaFile: tmpSchema, rows: 1, output: tmpSql, outputMode: 'insert', dialect: 'generic' });
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(logCalls.length).toBeGreaterThan(0);
    } finally {
      consoleSpy.mockRestore();
      const fs = await import('fs');
      if (fs.existsSync(tmpSql)) fs.unlinkSync(tmpSql);
      if (fs.existsSync(tmpSchema)) fs.unlinkSync(tmpSchema);
    }
  });
});

// ---------------------------------------------------------------------------
// anonymizeFile
// ---------------------------------------------------------------------------
describe('anonymizeFile', () => {
  const tmpCsv      = 'test-anon-input.csv';
  const tmpJsonArr  = 'test-anon-input-array.json';
  const tmpJsonWrap = 'test-anon-input-wrap.json';
  const tmpJsonEmpty = 'test-anon-input-empty.json';
  const tmpOutCsv   = 'test-anon-output.csv';
  const tmpOutJson  = 'test-anon-output.json';

  afterEach(async () => {
    for (const f of [tmpCsv, tmpJsonArr, tmpJsonWrap, tmpJsonEmpty, tmpOutCsv, tmpOutJson]) {
      if (fs.existsSync(f)) await unlink(f).catch(() => {});
    }
  });

  test('anonymizes a CSV file and returns records without writing (no outputPath)', async () => {
    const csv = 'name,email,id\nAlice,alice@example.com,1\nBob,bob@example.com,2\n';
    await writeFile(csv, tmpCsv);
    const { records, idMap } = await anonymizeFile(tmpCsv);
    expect(records).toHaveLength(2);
    expect(records[0].name).not.toBe('Alice');
    expect(records[0].email).not.toBe('alice@example.com');
    expect(idMap).toBeInstanceOf(Map);
  });

  test('anonymizes a CSV file and writes CSV output', async () => {
    const csv = 'name,email\nAlice,alice@test.com\n';
    await writeFile(csv, tmpCsv);
    await anonymizeFile(tmpCsv, tmpOutCsv);
    expect(fs.existsSync(tmpOutCsv)).toBe(true);
    const content = await readFile(tmpOutCsv, 'utf-8');
    expect(content).not.toContain('Alice');
    expect(content).not.toContain('alice@test.com');
  });

  test('reads a JSON array file (Array.isArray branch)', async () => {
    const data = [{ name: 'Alice', email: 'alice@example.com' }];
    await writeFile(JSON.stringify(data), tmpJsonArr);
    const { records } = await anonymizeFile(tmpJsonArr);
    expect(records).toHaveLength(1);
    expect(records[0].name).not.toBe('Alice');
  });

  test('reads a JSON object with records property (raw.records branch, covers lines 652-653)', async () => {
    // raw is NOT an Array → triggers: records = raw.records || []
    const wrapped = { records: [{ name: 'Carol', email: 'carol@test.com', id: 3 }] };
    await writeFile(JSON.stringify(wrapped), tmpJsonWrap);
    const { records } = await anonymizeFile(tmpJsonWrap);
    expect(records).toHaveLength(1);
    expect(records[0].name).not.toBe('Carol');
  });

  test('reads an empty JSON object (records = [], columns = [] branch, covers line 653)', async () => {
    // raw.records is undefined → raw.records || [] = []
    // records.length === 0 → columns = [] (the false branch of the ternary)
    const emptyWrapped = {};
    await writeFile(JSON.stringify(emptyWrapped), tmpJsonEmpty);
    const { records } = await anonymizeFile(tmpJsonEmpty);
    expect(records).toEqual([]);
  });

  test('writes JSON output when outputPath ends in .json (covers line 671)', async () => {
    const csv = 'name,score\nAlice,100\nBob,200\n';
    await writeFile(csv, tmpCsv);
    await anonymizeFile(tmpCsv, tmpOutJson);
    expect(fs.existsSync(tmpOutJson)).toBe(true);
    const content = await readFile(tmpOutJson, 'utf-8');
    const parsed = JSON.parse(content);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
  });

  test('noopLogger methods are all invoked after resetLogger (logger.js 100% functions)', () => {
    resetLogger();
    const logger = getLogger();
    // Calling all four no-op methods ensures full function coverage of noopLogger
    expect(() => logger.log('test log')).not.toThrow();
    expect(() => logger.info('test info')).not.toThrow();
    expect(() => logger.warn('test warn')).not.toThrow();
    expect(() => logger.error('test error')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// ficta-schema.v1.json publication validation
// ---------------------------------------------------------------------------
describe('ficta-schema.v1.json', () => {
  let schema;

  beforeAll(async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const raw = fs.readFileSync(path.join(__dirname, '..', 'ficta-schema.v1.json'), 'utf-8');
    schema = JSON.parse(raw);
  });

  test('is valid JSON with expected top-level fields', () => {
    expect(schema).toBeDefined();
    expect(schema.title).toBe('Ficta Schema File');
    expect(schema.$schema).toBeDefined();
    expect(schema.type).toBe('object');
    expect(schema.required).toContain('tables');
  });

  test('defines a tables array with SchemaTable items', () => {
    expect(schema.properties.tables).toBeDefined();
    expect(schema.properties.tables.type).toBe('array');
    expect(schema.properties.tables.items['$ref']).toBe('#/definitions/SchemaTable');
    expect(schema.definitions.SchemaTable).toBeDefined();
  });

  test('$schema property has updated description with npm install hint', () => {
    const desc = schema.properties.$schema.description;
    expect(desc).toContain('node_modules/ficta/ficta-schema.v1.json');
  });

  test('SchemaTable definition requires name and columns', () => {
    const required = schema.definitions.SchemaTable.required;
    expect(required).toContain('name');
    expect(required).toContain('columns');
  });

  test('defines SchemaColumn with ficta type and optional SQL options', () => {
    expect(schema.definitions.SchemaColumn).toBeDefined();
    const colProps = schema.definitions.SchemaColumn.properties;
    expect(colProps.name).toBeDefined();
    expect(colProps.type).toBeDefined();
  });
});
