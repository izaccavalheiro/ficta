// Tests for formatters module
import { describe, expect, test } from '@jest/globals';
import * as formatters from '../src/formatters.js';

describe('Formatters Module', () => {
  const sampleColumns = [
    { name: 'id', type: 'autoIncrement' },
    { name: 'name', type: 'fullName' },
    { name: 'email', type: 'email' }
  ];

  const sampleRecords = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
  ];

  describe('formatColumnName', () => {
    test('formats simple names correctly', () => {
      expect(formatters.formatColumnName('firstName')).toBe('First Name');
      expect(formatters.formatColumnName('email')).toBe('Email');
      expect(formatters.formatColumnName('id')).toBe('Id');
    });

    test('formats camelCase names correctly', () => {
      expect(formatters.formatColumnName('customerId')).toBe('Customer Id');
      expect(formatters.formatColumnName('fullName')).toBe('Full Name');
    });
  });

  describe('toCSV', () => {
    test('generates CSV with headers and data', () => {
      const csv = formatters.toCSV(sampleRecords, sampleColumns);
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('Id,Name,Email');
      expect(lines[1]).toBe('1,John Doe,john@example.com');
      expect(lines.length).toBe(4); // header + 3 rows
    });

    test('escapes commas in values', () => {
      const records = [{ id: 1, name: 'Doe, John', email: 'john@example.com' }];
      const csv = formatters.toCSV(records, sampleColumns);
      
      expect(csv).toContain('"Doe, John"');
    });

    test('escapes quotes in values', () => {
      const records = [{ id: 1, name: 'John "Johnny" Doe', email: 'john@example.com' }];
      const csv = formatters.toCSV(records, sampleColumns);
      
      expect(csv).toContain('"John ""Johnny"" Doe"');
    });

    test('returns empty string for empty records', () => {
      const csv = formatters.toCSV([], sampleColumns);
      expect(csv).toBe('');
    });

    test('accepts columns as a string', () => {
      const records = [{ id: 1, name: 'John' }];
      const csv = formatters.toCSV(records, 'id,name');
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('Id,Name');
      expect(lines[1]).toBe('1,John');
    });
  });

  describe('toJSON', () => {
    test('generates pretty JSON by default', () => {
      const json = formatters.toJSON(sampleRecords);
      expect(json).toContain('  ');
      expect(json).toContain('\n');
      
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(sampleRecords);
    });

    test('generates compact JSON when pretty is false', () => {
      const json = formatters.toJSON(sampleRecords, false);
      expect(json).not.toContain('  ');
      
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(sampleRecords);
    });
  });

  describe('toXML', () => {
    test('generates valid XML with default element names', async () => {
      const xml = await formatters.toXML(sampleRecords);
      
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"');
      expect(xml).toContain('<data>');
      expect(xml).toContain('</data>');
      expect(xml).toContain('<record>');
      expect(xml).toContain('</record>');
      expect(xml).toContain('<id>1</id>');
      expect(xml).toContain('<name>John Doe</name>');
    });

    test('generates XML with custom element names', async () => {
      const xml = await formatters.toXML(sampleRecords, 'users', 'user');
      
      expect(xml).toContain('<users>');
      expect(xml).toContain('</users>');
      expect(xml).toContain('<user>');
      expect(xml).toContain('</user>');
    });

    test('escapes special XML characters', async () => {
      const records = [{ id: 1, name: 'John & Jane <Test>', email: 'test@example.com' }];
      const xml = await formatters.toXML(records);
      
      expect(xml).toContain('John &amp; Jane &lt;Test&gt;');
    });
  });

  describe('toExcel', () => {
    test('generates Excel buffer', async () => {
      const buffer = await formatters.toExcel(sampleRecords, sampleColumns);
      
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    test('generates Excel with custom sheet name', async () => {
      const buffer = await formatters.toExcel(sampleRecords, sampleColumns, 'MySheet');
      
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    test('handles empty records', async () => {
      const buffer = await formatters.toExcel([], sampleColumns);
      
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    test('handles empty/null cell values', async () => {
      const records = [{ id: 1, name: '', email: null }];
      const buffer = await formatters.toExcel(records, sampleColumns);
      
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('toTSV', () => {
    test('generates TSV with headers and data', () => {
      const tsv = formatters.toTSV(sampleRecords, sampleColumns);
      const lines = tsv.split('\n');
      
      expect(lines[0]).toBe('Id\tName\tEmail');
      expect(lines[1]).toBe('1\tJohn Doe\tjohn@example.com');
      expect(lines.length).toBe(4); // header + 3 rows
    });

    test('replaces tabs in values with spaces', () => {
      const records = [{ id: 1, name: 'John\tDoe', email: 'john@example.com' }];
      const tsv = formatters.toTSV(records, sampleColumns);
      
      expect(tsv).toContain('John Doe');
      expect(tsv).not.toContain('John\tDoe');
    });

    test('returns empty string for empty records', () => {
      const tsv = formatters.toTSV([], sampleColumns);
      expect(tsv).toBe('');
    });
  });

  describe('toSQL', () => {
    test('generates SQL INSERT statements', () => {
      const sql = formatters.toSQL(sampleRecords, sampleColumns);
      const statements = sql.split('\n');
      
      expect(statements[0]).toBe("INSERT INTO data_table (id, name, email) VALUES (1, 'John Doe', 'john@example.com');");
      expect(statements.length).toBe(3);
    });

    test('generates SQL with custom table name', () => {
      const sql = formatters.toSQL(sampleRecords, sampleColumns, 'users');
      
      expect(sql).toContain('INSERT INTO users');
    });

    test('escapes single quotes in values', () => {
      const records = [{ id: 1, name: "O'Brien", email: 'obrien@example.com' }];
      const sql = formatters.toSQL(records, sampleColumns);
      
      expect(sql).toContain("'O''Brien'");
    });

    test('handles null and undefined values', () => {
      const records = [{ id: 1, name: null, email: undefined }];
      const sql = formatters.toSQL(records, sampleColumns);
      
      expect(sql).toContain('NULL');
    });

    test('handles boolean values', () => {
      const cols = [{ name: 'id', type: 'number' }, { name: 'active', type: 'boolean' }];
      const records = [{ id: 1, active: true }, { id: 2, active: false }];
      const sql = formatters.toSQL(records, cols);
      
      expect(sql).toContain('VALUES (1, 1)');
      expect(sql).toContain('VALUES (2, 0)');
    });

    test('returns empty string for empty records', () => {
      const sql = formatters.toSQL([], sampleColumns);
      expect(sql).toBe('');
    });
  });

  describe('formatData', () => {
    test('formats data as CSV', async () => {
      const result = await formatters.formatData(sampleRecords, sampleColumns, 'csv');
      expect(result).toContain('Id,Name,Email');
    });

    test('formats data as JSON', async () => {
      const result = await formatters.formatData(sampleRecords, sampleColumns, 'json');
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(sampleRecords);
    });

    test('formats data as XML', async () => {
      const result = await formatters.formatData(sampleRecords, sampleColumns, 'xml');
      expect(result).toContain('<data>');
    });

    test('formats data as Excel', async () => {
      const result = await formatters.formatData(sampleRecords, sampleColumns, 'xlsx');
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    test('formats data as TSV', async () => {
      const result = await formatters.formatData(sampleRecords, sampleColumns, 'tsv');
      expect(result).toContain('Id\tName\tEmail');
    });

    test('formats data as SQL', async () => {
      const result = await formatters.formatData(sampleRecords, sampleColumns, 'sql');
      expect(result).toContain('INSERT INTO');
    });

    test('throws error for unsupported format', async () => {
      await expect(
        formatters.formatData(sampleRecords, sampleColumns, 'unsupported')
      ).rejects.toThrow('Unsupported format');
    });

    test('handles format-specific options', async () => {
      const result = await formatters.formatData(
        sampleRecords, 
        sampleColumns, 
        'sql', 
        { tableName: 'custom_table' }
      );
      expect(result).toContain('INSERT INTO custom_table');
    });
  });

  describe('getFileExtension', () => {
    test('returns correct extensions for formats', () => {
      expect(formatters.getFileExtension('csv')).toBe('csv');
      expect(formatters.getFileExtension('json')).toBe('json');
      expect(formatters.getFileExtension('xml')).toBe('xml');
      expect(formatters.getFileExtension('xlsx')).toBe('xlsx');
      expect(formatters.getFileExtension('xls')).toBe('xlsx');
      expect(formatters.getFileExtension('excel')).toBe('xlsx');
      expect(formatters.getFileExtension('tsv')).toBe('tsv');
      expect(formatters.getFileExtension('sql')).toBe('sql');
    });

    test('is case-insensitive', () => {
      expect(formatters.getFileExtension('CSV')).toBe('csv');
      expect(formatters.getFileExtension('JSON')).toBe('json');
    });

    test('returns unknown format in lowercase', () => {
      expect(formatters.getFileExtension('txt')).toBe('txt');
      expect(formatters.getFileExtension('PDF')).toBe('pdf');
    });
  });

  describe('detectFormat', () => {
    test('detects format from filename', () => {
      expect(formatters.detectFormat('data.csv')).toBe('csv');
      expect(formatters.detectFormat('users.json')).toBe('json');
      expect(formatters.detectFormat('export.xml')).toBe('xml');
      expect(formatters.detectFormat('report.xlsx')).toBe('xlsx');
      expect(formatters.detectFormat('data.tsv')).toBe('tsv');
      expect(formatters.detectFormat('schema.sql')).toBe('sql');
    });

    test('handles paths with multiple dots', () => {
      expect(formatters.detectFormat('my.data.file.csv')).toBe('csv');
    });

    test('defaults to csv for unknown extensions', () => {
      expect(formatters.detectFormat('file.txt')).toBe('csv');
      expect(formatters.detectFormat('file')).toBe('csv');
    });
  });

  describe('toYAML', () => {
    test('generates valid YAML', () => {
      const yaml = formatters.toYAML(sampleRecords);
      
      expect(yaml).toContain('id: 1');
      expect(yaml).toContain('name: John Doe');
      expect(yaml).toContain('email: john@example.com');
    });

    test('handles special characters', () => {
      const records = [{ id: 1, name: 'Test: Value', note: 'Line1\nLine2' }];
      const yaml = formatters.toYAML(records);
      
      expect(yaml).toBeDefined();
      expect(typeof yaml).toBe('string');
    });

    test('handles empty records', () => {
      const yaml = formatters.toYAML([]);
      expect(yaml).toBeDefined();
    });
  });

  describe('toTOML', () => {
    test('generates valid TOML', () => {
      const toml = formatters.toTOML(sampleRecords);
      
      expect(toml).toContain('[[records]]');
      expect(toml).toContain('id = 1');
      expect(toml).toContain('name = "John Doe"');
    });

    test('handles special characters', () => {
      const records = [{ id: 1, name: 'Test "quoted"' }];
      const toml = formatters.toTOML(records);
      
      expect(toml).toBeDefined();
      expect(typeof toml).toBe('string');
    });

    test('handles empty records', () => {
      const toml = formatters.toTOML([]);
      expect(toml).toBeDefined();
    });
  });

  describe('formatData - new formats', () => {
    test('formats data as YAML', async () => {
      const result = await formatters.formatData(sampleRecords, sampleColumns, 'yaml');
      expect(result).toContain('id: 1');
      expect(result).toContain('name: John Doe');
    });

    test('formats data as YML', async () => {
      const result = await formatters.formatData(sampleRecords, sampleColumns, 'yml');
      expect(result).toContain('id: 1');
    });

    test('formats data as TOML', async () => {
      const result = await formatters.formatData(sampleRecords, sampleColumns, 'toml');
      expect(result).toContain('[[records]]');
    });
  });

  describe('getFileExtension - new formats', () => {
    test('returns correct extensions for new formats', () => {
      expect(formatters.getFileExtension('yaml')).toBe('yaml');
      expect(formatters.getFileExtension('yml')).toBe('yml');
      expect(formatters.getFileExtension('toml')).toBe('toml');
    });
  });

  describe('detectFormat - new formats', () => {
    test('detects new formats from filename', () => {
      expect(formatters.detectFormat('data.yaml')).toBe('yaml');
      expect(formatters.detectFormat('config.yml')).toBe('yml');
      expect(formatters.detectFormat('settings.toml')).toBe('toml');
    });
  });
});
