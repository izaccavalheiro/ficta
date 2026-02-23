import { jest } from '@jest/globals';
import {
  generateAndSave,
  writeFile,
  listTypes,
  listTemplates,
  generateFromDDL,
  seedFaker
} from '../src/node.js';
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
});
