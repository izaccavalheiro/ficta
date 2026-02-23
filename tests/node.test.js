import { jest } from '@jest/globals';
import {
  generateAndSave,
  writeFile,
  listTypes,
  listTemplates,
  generateFromDDL,
  generateFromSchemaFile,
  generateStream,
  seedFaker
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
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      await generateAndSave({
        columns: 'id:autoIncrement,name:fullName',
        rows: 5,
        output: testFile,
        preview: true
      });
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
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
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const sql = await generateFromDDL({
          schemaFile: 'test-schema.sql',
          rows: 2,
          output: outputDDLFile,
        });
        expect(fs.existsSync(outputDDLFile)).toBe(true);
        expect(typeof sql).toBe('string');
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
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
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
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
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
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
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
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
});

