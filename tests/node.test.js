import { jest } from '@jest/globals';
import {
  generateAndSave,
  writeFile,
  listTypes,
  listTemplates
} from '../src/node.js';
import fs from 'fs';
import { promisify } from 'util';
import { parse } from 'csv-parse/sync';

const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const exists = promisify(fs.exists);

describe('Node.js Module', () => {
  const testFile = 'test-output.csv';

  afterEach(async () => {
    // Clean up test files
    if (await exists(testFile)) {
      await unlink(testFile);
    }
  });

  describe('writeFile', () => {
    test('should write CSV to file', async () => {
      const csv = 'id,name\n1,John\n2,Jane';
      await writeFile(csv, testFile);
      
      const exists = fs.existsSync(testFile);
      expect(exists).toBe(true);
      
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
      
      const exists = fs.existsSync(testFile);
      expect(exists).toBe(true);
      
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
        
        const exists = fs.existsSync(defaultFile);
        expect(exists).toBe(true);
        
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
});
