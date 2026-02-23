// Tests for formatters.browser module
import { describe, expect, test } from '@jest/globals';
import * as formatters from '../src/formatters.browser.js';

describe('Formatters Browser Module', () => {
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

    test('escapes newlines in values', () => {
      const records = [{ id: 1, name: 'John\nDoe', email: 'john@example.com' }];
      const csv = formatters.toCSV(records, sampleColumns);
      
      expect(csv).toContain('"John\nDoe"');
    });

    test('returns empty string for empty records', () => {
      const csv = formatters.toCSV([], sampleColumns);
      expect(csv).toBe('');
    });
  });

  describe('toJSON', () => {
    test('generates pretty JSON by default', () => {
      const json = formatters.toJSON(sampleRecords);
      const parsed = JSON.parse(json);
      
      expect(parsed).toEqual(sampleRecords);
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    test('generates compact JSON when pretty is false', () => {
      const json = formatters.toJSON(sampleRecords, false);
      const parsed = JSON.parse(json);
      
      expect(parsed).toEqual(sampleRecords);
      expect(json).not.toMatch(/\n\s+/);
    });

    test('handles empty records', () => {
      const json = formatters.toJSON([]);
      expect(json).toBe('[]');
    });
  });

  describe('toXML', () => {
    test('generates XML with default root and record elements', () => {
      const xml = formatters.toXML(sampleRecords);
      
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
      expect(xml).toContain('<data>');
      expect(xml).toContain('</data>');
      expect(xml).toContain('<record>');
      expect(xml).toContain('</record>');
      expect(xml).toContain('<id>1</id>');
      expect(xml).toContain('<name>John Doe</name>');
    });

    test('generates XML with custom root and record elements', () => {
      const xml = formatters.toXML(sampleRecords, 'users', 'user');
      
      expect(xml).toContain('<users>');
      expect(xml).toContain('</users>');
      expect(xml).toContain('<user>');
      expect(xml).toContain('</user>');
    });

    test('escapes special XML characters', () => {
      const records = [{ 
        id: 1, 
        name: 'John & Jane <test>', 
        email: 'test@"example".com' 
      }];
      const xml = formatters.toXML(records);
      
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&lt;');
      expect(xml).toContain('&gt;');
      expect(xml).toContain('&quot;');
    });

    test('converts non-string values to strings', () => {
      const records = [{ id: 1, active: true, count: 42 }];
      const xml = formatters.toXML(records);
      
      expect(xml).toContain('<id>1</id>');
      expect(xml).toContain('<active>true</active>');
      expect(xml).toContain('<count>42</count>');
    });

    test('handles empty records', () => {
      const xml = formatters.toXML([]);
      
      expect(xml).toContain('<data>');
      expect(xml).toContain('</data>');
      expect(xml).not.toContain('<record>');
    });
  });

  describe('toTSV', () => {
    test('generates TSV with headers and data', () => {
      const tsv = formatters.toTSV(sampleRecords, sampleColumns);
      const lines = tsv.split('\n');
      
      expect(lines[0]).toBe('Id\tName\tEmail');
      expect(lines[1]).toBe('1\tJohn Doe\tjohn@example.com');
      expect(lines.length).toBe(4);
    });

    test('replaces tabs with spaces in values', () => {
      const records = [{ id: 1, name: 'John\tDoe', email: 'john@example.com' }];
      const tsv = formatters.toTSV(records, sampleColumns);
      
      expect(tsv).toContain('John Doe');
      expect(tsv).not.toContain('John\tDoe');
    });

    test('replaces newlines with spaces in values', () => {
      const records = [{ id: 1, name: 'John\nDoe', email: 'john@example.com' }];
      const tsv = formatters.toTSV(records, sampleColumns);
      
      expect(tsv).toContain('John Doe');
      expect(tsv).not.toContain('John\nDoe');
    });

    test('handles numeric values', () => {
      const records = [{ id: 1, name: 'John', email: 'john@example.com' }];
      const tsv = formatters.toTSV(records, sampleColumns);
      
      expect(tsv).toContain('1\tJohn');
    });

    test('returns empty string for empty records', () => {
      const tsv = formatters.toTSV([], sampleColumns);
      expect(tsv).toBe('');
    });
  });

  describe('toSQL', () => {
    test('generates SQL INSERT statements with default table name', () => {
      const sql = formatters.toSQL(sampleRecords, sampleColumns);
      const statements = sql.split('\n');
      
      expect(statements[0]).toBe("INSERT INTO data_table (id, name, email) VALUES (1, 'John Doe', 'john@example.com');");
      expect(statements[1]).toBe("INSERT INTO data_table (id, name, email) VALUES (2, 'Jane Smith', 'jane@example.com');");
      expect(statements.length).toBe(3);
    });

    test('generates SQL INSERT statements with custom table name', () => {
      const sql = formatters.toSQL(sampleRecords, sampleColumns, 'users');
      
      expect(sql).toContain('INSERT INTO users');
    });

    test('escapes single quotes in values', () => {
      const records = [{ id: 1, name: "O'Brien", email: 'obrien@example.com' }];
      const sql = formatters.toSQL(records, sampleColumns);
      
      expect(sql).toContain("'O''Brien'");
    });

    test('handles NULL/undefined values', () => {
      const records = [{ id: 1, name: null, email: undefined }];
      const sql = formatters.toSQL(records, sampleColumns);
      
      expect(sql).toContain('NULL');
    });

    test('handles boolean values', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement' },
        { name: 'active', type: 'boolean' }
      ];
      const records = [
        { id: 1, active: true },
        { id: 2, active: false }
      ];
      const sql = formatters.toSQL(records, columns);
      
      expect(sql).toContain('VALUES (1, 1)');
      expect(sql).toContain('VALUES (2, 0)');
    });

    test('handles numeric values', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement' },
        { name: 'count', type: 'number' }
      ];
      const records = [{ id: 1, count: 42 }];
      const sql = formatters.toSQL(records, columns);
      
      expect(sql).toContain('VALUES (1, 42)');
    });

    test('returns empty string for empty records', () => {
      const sql = formatters.toSQL([], sampleColumns);
      expect(sql).toBe('');
    });

    test('uses default table name when called without table parameter', () => {
      const sql = formatters.toSQL(sampleRecords, sampleColumns, undefined);
      
      expect(sql).toContain('INSERT INTO data_table');
    });
    
    test('supports schema mode with DDL generation', () => {
      const columns = [
        { name: 'id', type: 'number' },
        { name: 'name', type: 'fullName' },
        { name: 'email', type: 'email' }
      ];
      const options = {
        tableName: 'users',
        mode: 'ddl',
        dialect: 'postgres'
      };
      const sql = formatters.toSQL(sampleRecords, columns, options);
      
      expect(sql).toContain('CREATE TABLE users');
      expect(sql).toContain('id INTEGER');
      expect(sql).toContain('name VARCHAR(100)');
      expect(sql).toContain('email VARCHAR(255)');
    });
    
    test('supports schema mode with DDL+INSERT', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'name', type: 'fullName' },
        { name: 'email', type: 'email' }
      ];
      const options = {
        tableName: 'users',
        mode: 'ddl+insert',
        dialect: 'postgres'
      };
      const sql = formatters.toSQL(sampleRecords, columns, options);
      
      expect(sql).toContain('CREATE TABLE users');
      expect(sql).toContain('id SERIAL PRIMARY KEY');
      expect(sql).toContain('INSERT INTO users');
    });
    
    test('supports batch inserts', () => {
      const options = {
        tableName: 'users',
        mode: 'insert',
        batch: true
      };
      const sql = formatters.toSQL(sampleRecords, sampleColumns, options);
      
      expect(sql).toContain('INSERT INTO users');
      expect(sql).toContain('VALUES');
      // Should have only one INSERT statement for batch mode
      expect(sql.match(/INSERT INTO/g).length).toBe(1);
    });
    
    test('supports upsert mode for PostgreSQL', () => {
      const columns = [
        { name: 'id', type: 'autoIncrement', primaryKey: true },
        { name: 'name', type: 'fullName' },
        { name: 'email', type: 'email' }
      ];
      const options = {
        tableName: 'users',
        mode: 'upsert',
        dialect: 'postgres'
      };
      const sql = formatters.toSQL(sampleRecords, columns, options);
      
      expect(sql).toContain('INSERT INTO users');
      expect(sql).toContain('ON CONFLICT');
      expect(sql).toContain('DO UPDATE SET');
    });
    
    test('backward compatibility: string table name still works', () => {
      const sql = formatters.toSQL(sampleRecords, sampleColumns, 'custom_table');
      expect(sql).toContain('INSERT INTO custom_table');
      expect(sql).not.toContain('CREATE TABLE');
    });

    test('uses default options when options is null', () => {
      const sql = formatters.toSQL(sampleRecords, sampleColumns, null);
      expect(sql).toContain('INSERT INTO data_table');
    });

    test('uses default options when options is undefined', () => {
      const sql = formatters.toSQL(sampleRecords, sampleColumns, undefined);
      expect(sql).toContain('INSERT INTO data_table');
    });

    test('uses default dialect when dialect not specified', () => {
      const columns = [{ name: 'id', type: 'number' }];
      const records = [{ id: 1 }];
      const options = { tableName: 'test', mode: 'ddl' };
      const sql = formatters.toSQL(records, columns, options);
      expect(sql).toContain('CREATE TABLE test');
      expect(sql).toContain('INTEGER'); // Generic SQL type
    });

    test('uses options.table as fallback for table name', () => {
      const columns = [{ name: 'id', type: 'number' }];
      const records = [{ id: 1 }];
      const options = { table: 'test_table', mode: 'insert' };
      const sql = formatters.toSQL(records, columns, options);
      expect(sql).toContain('INSERT INTO test_table');
    });

    test('handles empty records with schema mode', () => {
      const columns = [{ name: 'id', type: 'number' }];
      const options = { tableName: 'test', mode: 'ddl' };
      const sql = formatters.toSQL([], columns, options);
      expect(sql).toContain('CREATE TABLE test');
      expect(sql).not.toContain('INSERT');
    });

    test('handles empty records with legacy mode', () => {
      const sql = formatters.toSQL([], sampleColumns, 'test_table');
      expect(sql).toBe('');
    });

    test('legacy mode handles numeric values in records', () => {
      const cols = [{ name: 'id', type: 'number' }, { name: 'value', type: 'number' }];
      const records = [{ id: 1, value: 42 }];
      const sql = formatters.toSQL(records, cols, 'test_table');
      expect(sql).toContain('VALUES (1, 42)');
    });

    test('legacy mode handles float values', () => {
      const cols = [{ name: 'id', type: 'number' }, { name: 'price', type: 'float' }];
      const records = [{ id: 1, price: 19.99 }];
      const sql = formatters.toSQL(records, cols, 'test_table');
      expect(sql).toContain('VALUES (1, 19.99)');
    });

    test('legacy mode handles all value types in single record', () => {
      const cols = [
        { name: 'id', type: 'number' },
        { name: 'name', type: 'text' },
        { name: 'active', type: 'boolean' },
        { name: 'score', type: 'float' }
      ];
      const records = [{ id: 123, name: "Test", active: true, score: 88.5 }];
      const sql = formatters.toSQL(records, cols, 'test_table');
      expect(sql).toContain("'Test'");
      expect(sql).toContain('1');
      expect(sql).toContain('88.5');
    });

    test('legacy mode handles multiple single quotes in string', () => {
      const cols = [{ name: 'id', type: 'number' }, { name: 'text', type: 'text' }];
      const records = [{ id: 1, text: "It's a 'test' string" }];
      const sql = formatters.toSQL(records, cols, 'custom_table');
      expect(sql).toContain("It''s a ''test'' string");
    });

    test('legacy mode with custom table name in object still uses string parameter', () => {
      const cols = [{ name: 'id', type: 'number' }];
      const records = [{ id: 1 }];
      const sql = formatters.toSQL(records, cols, 'my_table');
      expect(sql).toContain('INSERT INTO my_table');
    });

    test('legacy mode handles undefined values', () => {
      const cols = [{ name: 'id', type: 'number' }, { name: 'data', type: 'text' }];
      const records = [{ id: 1, data: undefined }];
      const sql = formatters.toSQL(records, cols, 'test_table');
      expect(sql).toContain('NULL');
    });

    test('legacy mode handles false boolean values', () => {
      const cols = [{ name: 'id', type: 'number' }, { name: 'active', type: 'boolean' }];
      const records = [{ id: 1, active: false }, { id: 2, active: true }];
      const sql = formatters.toSQL(records, cols, 'test_table');
      expect(sql).toContain('1, 0');
      expect(sql).toContain('2, 1');
    });

    test('legacy mode with all edge case values in one record', () => {
      const cols = [
        { name: 'id', type: 'number' },
        { name: 'text', type: 'text' },
        { name: 'nullVal', type: 'text' },
        { name: 'active', type: 'boolean' },
        { name: 'cost', type: 'number' }
      ];
      const records = [{ id: 10, text: 'Test', nullVal: null, active: false, cost: 0 }];
      const sql = formatters.toSQL(records, cols, 'edge_cases');
      expect(sql).toContain('INSERT INTO edge_cases');
      expect(sql).toContain("'Test'");
      expect(sql).toContain('NULL');
      expect(sql).toContain('0');
    });
  });

  describe('formatData', () => {
    test('formats data as CSV', () => {
      const result = formatters.formatData(sampleRecords, sampleColumns, 'csv');
      expect(result).toContain('Id,Name,Email');
    });

    test('formats data as JSON', () => {
      const result = formatters.formatData(sampleRecords, sampleColumns, 'json');
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(sampleRecords);
    });

    test('formats data as JSON with pretty option', () => {
      const result = formatters.formatData(sampleRecords, sampleColumns, 'json', { pretty: true });
      expect(result).toContain('\n');
    });

    test('formats data as JSON with pretty false option', () => {
      const result = formatters.formatData(sampleRecords, sampleColumns, 'json', { pretty: false });
      expect(result).not.toMatch(/\n\s+/);
    });

    test('formats data as XML', () => {
      const result = formatters.formatData(sampleRecords, sampleColumns, 'xml');
      expect(result).toContain('<data>');
      expect(result).toContain('<record>');
    });

    test('formats data as XML with custom root element', () => {
      const result = formatters.formatData(sampleRecords, sampleColumns, 'xml', { rootElement: 'users' });
      expect(result).toContain('<users>');
    });

    test('formats data as XML with custom record element', () => {
      const result = formatters.formatData(sampleRecords, sampleColumns, 'xml', { recordElement: 'user' });
      expect(result).toContain('<user>');
    });

    test('formats data as TSV', () => {
      const result = formatters.formatData(sampleRecords, sampleColumns, 'tsv');
      expect(result).toContain('Id\tName\tEmail');
    });

    test('formats data as SQL', () => {
      const result = formatters.formatData(sampleRecords, sampleColumns, 'sql');
      expect(result).toContain('INSERT INTO data_table');
    });

    test('formats data as SQL with custom table name', () => {
      const result = formatters.formatData(sampleRecords, sampleColumns, 'sql', { tableName: 'users' });
      expect(result).toContain('INSERT INTO users');
    });

    test('throws error for unsupported format', () => {
      expect(() => {
        formatters.formatData(sampleRecords, sampleColumns, 'excel');
      }).toThrow('Unsupported format in browser');
    });

    test('handles case-insensitive format names', () => {
      expect(() => {
        formatters.formatData(sampleRecords, sampleColumns, 'CSV');
      }).not.toThrow();
    });
  });

  describe('getMimeType', () => {
    test('returns correct MIME type for CSV', () => {
      expect(formatters.getMimeType('csv')).toBe('text/csv');
    });

    test('returns correct MIME type for JSON', () => {
      expect(formatters.getMimeType('json')).toBe('application/json');
    });

    test('returns correct MIME type for XML', () => {
      expect(formatters.getMimeType('xml')).toBe('application/xml');
    });

    test('returns correct MIME type for TSV', () => {
      expect(formatters.getMimeType('tsv')).toBe('text/tab-separated-values');
    });

    test('returns correct MIME type for SQL', () => {
      expect(formatters.getMimeType('sql')).toBe('application/sql');
    });

    test('returns text/plain for unknown format', () => {
      expect(formatters.getMimeType('unknown')).toBe('text/plain');
    });

    test('handles case-insensitive format names', () => {
      expect(formatters.getMimeType('CSV')).toBe('text/csv');
    });
  });

  describe('getFileExtension', () => {
    test('returns correct extension for CSV', () => {
      expect(formatters.getFileExtension('csv')).toBe('csv');
    });

    test('returns correct extension for JSON', () => {
      expect(formatters.getFileExtension('json')).toBe('json');
    });

    test('returns correct extension for XML', () => {
      expect(formatters.getFileExtension('xml')).toBe('xml');
    });

    test('returns correct extension for TSV', () => {
      expect(formatters.getFileExtension('tsv')).toBe('tsv');
    });

    test('returns correct extension for SQL', () => {
      expect(formatters.getFileExtension('sql')).toBe('sql');
    });

    test('returns format as extension for unknown formats', () => {
      expect(formatters.getFileExtension('custom')).toBe('custom');
    });
  });

  describe('detectFormat', () => {
    test('detects CSV format from filename', () => {
      expect(formatters.detectFormat('data.csv')).toBe('csv');
    });

    test('detects JSON format from filename', () => {
      expect(formatters.detectFormat('data.json')).toBe('json');
    });

    test('detects XML format from filename', () => {
      expect(formatters.detectFormat('data.xml')).toBe('xml');
    });

    test('detects TSV format from filename', () => {
      expect(formatters.detectFormat('data.tsv')).toBe('tsv');
    });

    test('detects SQL format from filename', () => {
      expect(formatters.detectFormat('data.sql')).toBe('sql');
    });

    test('returns csv as default for unknown extensions', () => {
      expect(formatters.detectFormat('data.unknown')).toBe('csv');
    });

    test('handles case-insensitive extensions', () => {
      expect(formatters.detectFormat('data.CSV')).toBe('csv');
    });

    test('handles multiple dots in filename', () => {
      expect(formatters.detectFormat('my.data.file.json')).toBe('json');
    });
  });

  describe('toYAML', () => {
    test('generates valid YAML-like format', () => {
      const yaml = formatters.toYAML(sampleRecords);
      
      expect(yaml).toContain('id: 1');
      expect(yaml).toContain('name: John Doe');
      expect(yaml).toContain('email: john@example.com');
    });

    test('handles empty records', () => {
      const yaml = formatters.toYAML([]);
      expect(yaml).toBe('[]\n');
    });

    test('handles special characters in values', () => {
      const records = [{ id: 1, name: 'Test: Value', note: 'Special chars' }];
      const yaml = formatters.toYAML(records);
      
      expect(yaml).toBeDefined();
      expect(typeof yaml).toBe('string');
    });

    test('(a) quotes strings containing colons', () => {
      const records = [{ key: 'host: localhost' }];
      const yaml = formatters.toYAML(records);
      expect(yaml).toContain('"host: localhost"');
    });

    test('(b) quotes strings containing hash characters', () => {
      const records = [{ note: 'color #ff0000' }];
      const yaml = formatters.toYAML(records);
      expect(yaml).toContain('"color #ff0000"');
    });

    test('(c) multi-key records use block mapping indentation', () => {
      const records = [{ id: 1, name: 'Alice', active: true }];
      const yaml = formatters.toYAML(records);
      expect(yaml).toMatch(/^- id: 1/m);
      expect(yaml).toMatch(/^  name: Alice/m);
      expect(yaml).toMatch(/^  active: true/m);
    });

    test('(d) booleans and numbers are emitted unquoted', () => {
      const records = [{ flag: true, count: 42, score: 3.14, disabled: false }];
      const yaml = formatters.toYAML(records);
      expect(yaml).toContain('flag: true');
      expect(yaml).toContain('count: 42');
      expect(yaml).toContain('score: 3.14');
      expect(yaml).toContain('disabled: false');
      // None of these should be quoted
      expect(yaml).not.toContain('"true"');
      expect(yaml).not.toContain('"42"');
    });

    test('(e) quotes strings containing embedded double quotes', () => {
      const records = [{ msg: 'say "hello"' }];
      const yaml = formatters.toYAML(records);
      expect(yaml).toContain('\\"hello\\"');
    });

    test('null and undefined values are emitted as bare null (covers serializeYAMLScalar null branch)', () => {
      const records = [{ id: 1, missing: null, absent: undefined }];
      const yaml = formatters.toYAML(records);
      expect(yaml).toContain('missing: null');
      expect(yaml).toContain('absent: null');
    });
  });

  describe('toTOML', () => {
    test('generates valid TOML-like format', () => {
      const toml = formatters.toTOML(sampleRecords);
      
      expect(toml).toContain('[[records]]');
      expect(toml).toContain('id = 1');
      expect(toml).toContain('name = "John Doe"');
    });

    test('handles empty records', () => {
      const toml = formatters.toTOML([]);
      expect(toml).toBe('');
    });

    test('handles special characters in values', () => {
      const records = [{ id: 1, name: 'Test "quoted"' }];
      const toml = formatters.toTOML(records);
      
      expect(toml).toBeDefined();
      expect(typeof toml).toBe('string');
    });
  });

  describe('formatData - new formats', () => {
    test('formats data as YAML', () => {
      const result = formatters.formatData(sampleRecords, sampleColumns, 'yaml');
      expect(result).toContain('id: 1');
      expect(result).toContain('name: John Doe');
    });

    test('formats data as YML', () => {
      const result = formatters.formatData(sampleRecords, sampleColumns, 'yml');
      expect(result).toContain('id: 1');
    });

    test('formats data as TOML', () => {
      const result = formatters.formatData(sampleRecords, sampleColumns, 'toml');
      expect(result).toContain('[[records]]');
    });
  });

  describe('getMimeType - new formats', () => {
    test('returns correct MIME types for new formats', () => {
      expect(formatters.getMimeType('yaml')).toBe('text/yaml');
      expect(formatters.getMimeType('yml')).toBe('text/yaml');
      expect(formatters.getMimeType('toml')).toBe('application/toml');
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

  describe('formatters.shared.js direct exports', () => {
    test('formatColumnName, toCSV, and detectFormat are exported directly from formatters.shared.js', async () => {
      const shared = await import('../src/formatters.shared.js');
      expect(typeof shared.formatColumnName).toBe('function');
      expect(shared.formatColumnName('lastName')).toBe('Last Name');

      expect(typeof shared.toCSV).toBe('function');
      const csv = shared.toCSV(
        [{ id: 1, name: 'Bob' }],
        [{ name: 'id' }, { name: 'name' }]
      );
      expect(csv).toContain('Id');
      expect(csv).toContain('1');

      expect(typeof shared.detectFormat).toBe('function');
      expect(shared.detectFormat('output.csv')).toBe('csv');
    });
  });
});
