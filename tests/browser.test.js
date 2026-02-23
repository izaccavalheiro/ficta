import { jest } from '@jest/globals';
import { setFaker, templates } from '../src/core.js';
import { faker } from '@faker-js/faker';

// Set faker before importing browser module
setFaker(faker);

// Mock DOM globals for Node environment
global.document = {
  createElement: jest.fn((tag) => ({
    href: '',
    download: '',
    click: jest.fn(),
    style: {},
    value: '',
    options: [],
    addEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    setAttribute: jest.fn()
  })),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    innerHTML: ''
  },
  querySelector: jest.fn()
};

global.URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn()
};

global.Blob = jest.fn(function(parts, options) {
  this.parts = parts;
  this.type = options?.type || '';
});

import {
  downloadFile,
  downloadCSV,
  generateAndDownload,
  createUI
} from '../src/browser.js';

describe('Browser Module', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    // Reset createElement to return link with download support by default
    global.document.createElement = jest.fn((tag) => ({
      href: '',
      download: '',
      click: jest.fn(),
      style: {},
      value: '',
      options: [],
      addEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
      setAttribute: jest.fn()
    }));
  });

  describe('downloadCSV', () => {
    test('should create link and trigger download', () => {
      downloadCSV('id,name\n1,John', 'test.csv');
      
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    test('should create Blob with correct MIME type', () => {
      downloadCSV('test,data', 'file.csv');
      
      expect(global.Blob).toHaveBeenCalledWith(['test,data'], { type: 'text/csv;charset=utf-8;' });
    });

    test('should use default filename', () => {
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
        style: {},
        setAttribute: jest.fn()
      };
      
      global.document.createElement.mockReturnValue(mockLink);
      
      downloadCSV('test,data');
      
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'data.csv');
    });

    test('should handle link without download support', () => {
      const mockLink = {
        href: '',
        download: undefined,
        click: jest.fn(),
        style: {},
        setAttribute: jest.fn()
      };
      delete mockLink.download;
      
      global.document.createElement.mockReturnValue(mockLink);
      
      // Should not throw
      downloadCSV('test,data', 'file.csv');
      
      // Should not call URL methods if download not supported
      expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    });
  });

  describe('downloadFile', () => {
    test('should download file with all defaults', () => {
      downloadFile('test content');
      
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(global.Blob).toHaveBeenCalledWith(['test content'], { type: 'text/csv;charset=utf-8;' });
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    test('should download file with default format', () => {
      downloadFile('test content', 'custom.txt');
      
      expect(global.Blob).toHaveBeenCalledWith(['test content'], { type: 'text/csv;charset=utf-8;' });
    });

    test('should download JSON file with correct MIME type', () => {
      downloadFile('{"test": "data"}', 'data.json', 'json');
      
      expect(global.Blob).toHaveBeenCalledWith(['{"test": "data"}'], { type: 'application/json;charset=utf-8;' });
    });

    test('should download XML file with correct MIME type', () => {
      downloadFile('<root></root>', 'data.xml', 'xml');
      
      expect(global.Blob).toHaveBeenCalledWith(['<root></root>'], { type: 'application/xml;charset=utf-8;' });
    });
  });

  describe('generateAndDownload', () => {
    test('should generate CSV and trigger download', () => {
      const result = generateAndDownload({
        columns: 'id:autoIncrement,name:fullName',
        rows: 5,
        filename: 'generated.csv'
      });
      
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('records');
      expect(result.rowCount).toBe(5);
      expect(document.createElement).toHaveBeenCalled();
    });

    test('should use filename from options', () => {
      generateAndDownload({
        columns: 'id:autoIncrement',
        rows: 1,
        filename: 'custom.csv'
      });
      
      expect(document.createElement).toHaveBeenCalled();
    });

    test('should use output from options if no filename', () => {
      generateAndDownload({
        columns: 'id:autoIncrement',
        rows: 1,
        output: 'output.csv'
      });
      
      expect(document.createElement).toHaveBeenCalled();
    });

    test('should use default filename if neither provided', () => {
      generateAndDownload({
        columns: 'id:autoIncrement',
        rows: 1
      });
      
      expect(document.createElement).toHaveBeenCalled();
    });
  });

  describe('createUI', () => {
    test('should throw error for invalid container string', () => {
      document.querySelector.mockReturnValue(null);
      
      expect(() => createUI('#non-existent')).toThrow('Container element not found');
    });

    test('should accept HTMLElement as container', () => {
      const mockContainer = {
        innerHTML: '',
        querySelector: jest.fn((selector) => {
          if (selector === '#file-format') return { value: 'csv', addEventListener: jest.fn() };
          if (selector === '#file-format') return { value: 'csv', addEventListener: jest.fn() };
          if (selector === '#file-columns') return { value: 'id' };
          if (selector === '#file-rows') return { value: '100' };
          if (selector === '#file-template') return { value: '', addEventListener: jest.fn() };
          if (selector === '#file-generate') return { addEventListener: jest.fn() };
          if (selector === '#file-filename') return { value: 'data.csv' };
          if (selector === '#file-status') return { style: {}, textContent: '' };
          return null;
        })
      };
      
      const ui = createUI(mockContainer);
      
      expect(ui).toHaveProperty('setColumns');
      expect(ui).toHaveProperty('element');
      expect(ui.element).toBe(mockContainer);
    });

    test('should handle template selection', () => {
      let templateChangeHandler;
      const mockTemplateSelect = {
        value: '',
        addEventListener: jest.fn((event, handler) => {
          if (event === 'change') templateChangeHandler = handler;
        })
      };
      
      const mockColumnsInput = { value: '' };
      const mockRowsInput = { value: '100' };
      
      const mockContainer = {
        innerHTML: '',
        querySelector: jest.fn((selector) => {
          if (selector === '#file-format') return { value: 'csv', addEventListener: jest.fn() };
          if (selector === '#file-columns') return mockColumnsInput;
          if (selector === '#file-rows') return mockRowsInput;
          if (selector === '#file-template') return mockTemplateSelect;
          if (selector === '#file-generate') return { addEventListener: jest.fn() };
          if (selector === '#file-filename') return { value: 'data.csv' };
          if (selector === '#file-status') return { style: {}, textContent: '' };
          return null;
        })
      };
      
      document.querySelector.mockReturnValue(mockContainer);
      
      createUI('#container');
      
      // Simulate template selection
      templateChangeHandler({ target: { value: 'users' } });
      
      expect(mockColumnsInput.value).toBe(templates.users.columns);
      expect(mockRowsInput.value).toBe(templates.users.rows);
    });

    test('should handle empty template selection', () => {
      let templateChangeHandler;
      const mockTemplateSelect = {
        value: '',
        addEventListener: jest.fn((event, handler) => {
          if (event === 'change') templateChangeHandler = handler;
        })
      };
      
      const mockColumnsInput = { value: 'existing' };
      const mockRowsInput = { value: '50' };
      
      const mockContainer = {
        innerHTML: '',
        querySelector: jest.fn((selector) => {
          if (selector === '#file-format') return { value: 'csv', addEventListener: jest.fn() };
          if (selector === '#file-columns') return mockColumnsInput;
          if (selector === '#file-rows') return mockRowsInput;
          if (selector === '#file-template') return mockTemplateSelect;
          if (selector === '#file-generate') return { addEventListener: jest.fn() };
          if (selector === '#file-filename') return { value: 'data.csv' };
          if (selector === '#file-status') return { style: {}, textContent: '' };
          return null;
        })
      };
      
      document.querySelector.mockReturnValue(mockContainer);
      
      createUI('#container');
      
      // Simulate selecting empty template
      templateChangeHandler({ target: { value: '' } });
      
      // Values should remain unchanged
      expect(mockColumnsInput.value).toBe('existing');
    });

    test('should update filename extension when format changes', () => {
      let formatChangeHandler;
      const mockFormatSelect = {
        value: 'csv',
        addEventListener: jest.fn((event, handler) => {
          if (event === 'change') formatChangeHandler = handler;
        })
      };
      
      const mockFilenameInput = { value: 'mydata.csv' };
      
      const mockContainer = {
        innerHTML: '',
        querySelector: jest.fn((selector) => {
          if (selector === '#file-format') return mockFormatSelect;
          if (selector === '#file-columns') return { value: 'id' };
          if (selector === '#file-rows') return { value: '10' };
          if (selector === '#file-template') return { value: '', addEventListener: jest.fn() };
          if (selector === '#file-generate') return { addEventListener: jest.fn() };
          if (selector === '#file-filename') return mockFilenameInput;
          if (selector === '#file-status') return { style: {}, textContent: '' };
          return null;
        })
      };
      
      document.querySelector.mockReturnValue(mockContainer);
      
      createUI('#container');
      
      // Change format to JSON
      formatChangeHandler({ target: { value: 'json' } });
      
      expect(mockFilenameInput.value).toBe('mydata.json');
      
      // Change format to XML
      formatChangeHandler({ target: { value: 'xml' } });
      
      expect(mockFilenameInput.value).toBe('mydata.xml');
    });

    test('should validate empty columns on generate', () => {
      jest.useFakeTimers();
      
      let generateClickHandler;
      const mockGenerateBtn = {
        disabled: false,
        textContent: '',
        addEventListener: jest.fn((event, handler) => {
          if (event === 'click') generateClickHandler = handler;
        })
      };
      
      const mockStatusDiv = { style: {}, textContent: '' };
      
      const mockContainer = {
        innerHTML: '',
        querySelector: jest.fn((selector) => {
          if (selector === '#file-format') return { value: 'csv', addEventListener: jest.fn() };
          if (selector === '#file-columns') return { value: '  ' };
          if (selector === '#file-rows') return { value: '100' };
          if (selector === '#file-template') return { value: '', addEventListener: jest.fn() };
          if (selector === '#file-generate') return mockGenerateBtn;
          if (selector === '#file-filename') return { value: 'data.csv' };
          if (selector === '#file-status') return mockStatusDiv;
          return null;
        })
      };
      
      document.querySelector.mockReturnValue(mockContainer);
      
      createUI('#container');
      generateClickHandler();
      
      expect(mockStatusDiv.textContent).toBe('Please specify columns');
      expect(mockStatusDiv.style.background).toBe('#f8d7da');
      expect(mockStatusDiv.style.color).toBe('#721c24');
      
      jest.useRealTimers();
    });

    test('should validate rows less than 1', () => {
      jest.useFakeTimers();
      
      let generateClickHandler;
      const mockGenerateBtn = {
        disabled: false,
        textContent: '',
        addEventListener: jest.fn((event, handler) => {
          if (event === 'click') generateClickHandler = handler;
        })
      };
      
      const mockStatusDiv = { style: {}, textContent: '' };
      
      const mockContainer = {
        innerHTML: '',
        querySelector: jest.fn((selector) => {
          if (selector === '#file-format') return { value: 'csv', addEventListener: jest.fn() };
          if (selector === '#file-columns') return { value: 'id' };
          if (selector === '#file-rows') return { value: '0' };
          if (selector === '#file-template') return { value: '', addEventListener: jest.fn() };
          if (selector === '#file-generate') return mockGenerateBtn;
          if (selector === '#file-filename') return { value: 'data.csv' };
          if (selector === '#file-status') return mockStatusDiv;
          return null;
        })
      };
      
      document.querySelector.mockReturnValue(mockContainer);
      
      createUI('#container');
      generateClickHandler();
      
      expect(mockStatusDiv.textContent).toBe('Rows must be between 1 and 10,000');
      
      jest.useRealTimers();
    });

    test('should validate rows greater than 10000', () => {
      jest.useFakeTimers();
      
      let generateClickHandler;
      const mockGenerateBtn = {
        disabled: false,
        textContent: '',
        addEventListener: jest.fn((event, handler) => {
          if (event === 'click') generateClickHandler = handler;
        })
      };
      
      const mockStatusDiv = { style: {}, textContent: '' };
      
      const mockContainer = {
        innerHTML: '',
        querySelector: jest.fn((selector) => {
          if (selector === '#file-format') return { value: 'csv', addEventListener: jest.fn() };
          if (selector === '#file-columns') return { value: 'id' };
          if (selector === '#file-rows') return { value: '10001' };
          if (selector === '#file-template') return { value: '', addEventListener: jest.fn() };
          if (selector === '#file-generate') return mockGenerateBtn;
          if (selector === '#file-filename') return { value: 'data.csv' };
          if (selector === '#file-status') return mockStatusDiv;
          return null;
        })
      };
      
      document.querySelector.mockReturnValue(mockContainer);
      
      createUI('#container');
      generateClickHandler();
      
      expect(mockStatusDiv.textContent).toBe('Rows must be between 1 and 10,000');
      
      jest.useRealTimers();
    });

    test('should generate CSV successfully', (done) => {
      jest.useFakeTimers();
      
      let generateClickHandler;
      const mockGenerateBtn = {
        disabled: false,
        textContent: 'Generate',
        addEventListener: jest.fn((event, handler) => {
          if (event === 'click') generateClickHandler = handler;
        })
      };
      
      const mockStatusDiv = { style: {}, textContent: '' };
      
      const mockContainer = {
        innerHTML: '',
        querySelector: jest.fn((selector) => {
          if (selector === '#file-format') return { value: 'csv', addEventListener: jest.fn() };
          if (selector === '#file-columns') return { value: 'id:autoIncrement' };
          if (selector === '#file-rows') return { value: '5' };
          if (selector === '#file-template') return { value: '', addEventListener: jest.fn() };
          if (selector === '#file-generate') return mockGenerateBtn;
          if (selector === '#file-filename') return { value: 'test.csv' };
          if (selector === '#file-status') return mockStatusDiv;
          return null;
        })
      };
      
      document.querySelector.mockReturnValue(mockContainer);
      
      createUI('#container');
      generateClickHandler();
      
      expect(mockGenerateBtn.disabled).toBe(true);
      expect(mockGenerateBtn.textContent).toBe('Generating...');
      
      // Fast-forward time to trigger setTimeout
      jest.advanceTimersByTime(15);
      
      expect(mockGenerateBtn.disabled).toBe(false);
      expect(mockGenerateBtn.textContent).toBe('Generate & Download');
      expect(mockStatusDiv.textContent).toContain('Generated 5 rows');
      expect(mockStatusDiv.style.background).toBe('#d4edda');
      expect(mockStatusDiv.style.color).toBe('#155724');
      
      jest.useRealTimers();
      done();
    });

    test('should handle generation error in setTimeout', (done) => {
      jest.useFakeTimers();
      
      let generateClickHandler;
      const mockGenerateBtn = {
        disabled: false,
        textContent: 'Generate',
        addEventListener: jest.fn((event, handler) => {
          if (event === 'click') generateClickHandler = handler;
        })
      };
      
      const mockStatusDiv = { style: {}, textContent: '' };
      
      // Mock generateAndDownload to throw an error
      const originalCreateElement = global.document.createElement;
      global.document.createElement = jest.fn(() => {
        throw new Error('Download failed');
      });
      
      const mockContainer = {
        innerHTML: '',
        querySelector: jest.fn((selector) => {
          if (selector === '#file-format') return { value: 'csv', addEventListener: jest.fn() };
          if (selector === '#file-columns') return { value: 'id:autoIncrement' };
          if (selector === '#file-rows') return { value: '5' };
          if (selector === '#file-template') return { value: '', addEventListener: jest.fn() };
          if (selector === '#file-generate') return mockGenerateBtn;
          if (selector === '#file-filename') return { value: 'test.csv' };
          if (selector === '#file-status') return mockStatusDiv;
          return null;
        })
      };
      
      document.querySelector.mockReturnValue(mockContainer);
      
      createUI('#container');
      generateClickHandler();
      
      // Fast-forward time to trigger setTimeout
      jest.advanceTimersByTime(15);
      
      expect(mockGenerateBtn.disabled).toBe(false);
      expect(mockStatusDiv.textContent).toContain('Error:');
      expect(mockStatusDiv.style.background).toBe('#f8d7da');
      
      // Restore original
      global.document.createElement = originalCreateElement;
      jest.useRealTimers();
      done();
    });

    test('should handle synchronous error', () => {
      jest.useFakeTimers();
      
      let generateClickHandler;
      const mockGenerateBtn = {
        disabled: false,
        textContent: 'Generate',
        addEventListener: jest.fn((event, handler) => {
          if (event === 'click') generateClickHandler = handler;
        })
      };
      
      const mockStatusDiv = { style: {}, textContent: '' };
      const mockColumnsInput = {
        get value() {
          throw new Error('Test error');
        }
      };
      
      const mockContainer = {
        innerHTML: '',
        querySelector: jest.fn((selector) => {
          if (selector === '#file-format') return { value: 'csv', addEventListener: jest.fn() };
          if (selector === '#file-columns') return mockColumnsInput;
          if (selector === '#file-rows') return { value: '5' };
          if (selector === '#file-template') return { value: '', addEventListener: jest.fn() };
          if (selector === '#file-generate') return mockGenerateBtn;
          if (selector === '#file-filename') return { value: 'test.csv' };
          if (selector === '#file-status') return mockStatusDiv;
          return null;
        })
      };
      
      document.querySelector.mockReturnValue(mockContainer);
      
      createUI('#container');
      generateClickHandler();
      
      expect(mockStatusDiv.textContent).toBe('Error: Test error');
      expect(mockGenerateBtn.disabled).toBe(false);
      
      jest.useRealTimers();
    });

    test('should allow setting filename', () => {
      const mockFilenameInput = { value: 'old.csv' };
      
      const mockContainer = {
        innerHTML: '',
        querySelector: jest.fn((selector) => {
          if (selector === '#file-format') return { value: 'csv', addEventListener: jest.fn() };
          if (selector === '#file-columns') return { value: 'id' };
          if (selector === '#file-rows') return { value: '100' };
          if (selector === '#file-template') return { value: '', addEventListener: jest.fn() };
          if (selector === '#file-generate') return { addEventListener: jest.fn() };
          if (selector === '#file-filename') return mockFilenameInput;
          if (selector === '#file-status') return { style: {}, textContent: '' };
          return null;
        })
      };
      
      document.querySelector.mockReturnValue(mockContainer);
      
      const ui = createUI('#container');
      ui.setFilename('new.csv');
      
      expect(mockFilenameInput.value).toBe('new.csv');
    });

    test('should destroy UI', () => {
      const mockContainer = {
        innerHTML: 'content',
        querySelector: jest.fn((selector) => {
          if (selector === '#file-format') return { value: 'csv', addEventListener: jest.fn() };
          if (selector === '#file-columns') return { value: 'id' };
          if (selector === '#file-rows') return { value: '100' };
          if (selector === '#file-template') return { value: '', addEventListener: jest.fn() };
          if (selector === '#file-generate') return { addEventListener: jest.fn() };
          if (selector === '#file-filename') return { value: 'data.csv' };
          if (selector === '#file-status') return { style: {}, textContent: '' };
          return null;
        })
      };
      
      document.querySelector.mockReturnValue(mockContainer);
      
      const ui = createUI('#container');
      ui.destroy();
      
      expect(mockContainer.innerHTML).toBe('');
    });

    test('should set all UI values', () => {
      const mockColumnsInput = { value: '' };
      const mockRowsInput = { value: '' };
      const mockFilenameInput = { value: '' };
      
      const mockContainer = {
        innerHTML: '',
        querySelector: jest.fn((selector) => {
          if (selector === '#file-format') return { value: 'csv', addEventListener: jest.fn() };
          if (selector === '#file-columns') return mockColumnsInput;
          if (selector === '#file-rows') return mockRowsInput;
          if (selector === '#file-template') return { value: '', addEventListener: jest.fn() };
          if (selector === '#file-generate') return { addEventListener: jest.fn() };
          if (selector === '#file-filename') return mockFilenameInput;
          if (selector === '#file-status') return { style: {}, textContent: '' };
          return null;
        })
      };
      
      document.querySelector.mockReturnValue(mockContainer);
      
      const ui = createUI('#container');
      ui.setColumns('name:fullName,email');
      ui.setRows(250);
      ui.setFilename('output.csv');
      
      expect(mockColumnsInput.value).toBe('name:fullName,email');
      expect(mockRowsInput.value).toBe(250);
      expect(mockFilenameInput.value).toBe('output.csv');
    });

    test('should allow setting format via setFormat method', () => {
      const mockFormatSelect = { value: 'csv', addEventListener: jest.fn() };
      
      const mockContainer = {
        innerHTML: '',
        querySelector: jest.fn((selector) => {
          if (selector === '#file-format') return mockFormatSelect;
          if (selector === '#file-columns') return { value: '' };
          if (selector === '#file-rows') return { value: '10' };
          if (selector === '#file-template') return { value: '', addEventListener: jest.fn() };
          if (selector === '#file-generate') return { addEventListener: jest.fn() };
          if (selector === '#file-filename') return { value: 'data.csv' };
          if (selector === '#file-status') return { style: {}, textContent: '' };
          return null;
        })
      };
      
      document.querySelector.mockReturnValue(mockContainer);
      
      const ui = createUI('#container');
      ui.setFormat('json');
      
      expect(mockFormatSelect.value).toBe('json');
    });

    test('should use empty filename when not provided', () => {
      jest.useFakeTimers();
      
      let generateClickHandler;
      const mockGenerateBtn = {
        disabled: false,
        textContent: 'Generate',
        addEventListener: jest.fn((event, handler) => {
          if (event === 'click') generateClickHandler = handler;
        })
      };
      
      const mockStatusDiv = { style: {}, textContent: '' };
      
      const mockContainer = {
        innerHTML: '',
        querySelector: jest.fn((selector) => {
          if (selector === '#file-format') return { value: 'csv', addEventListener: jest.fn() };
          if (selector === '#file-columns') return { value: 'id:autoIncrement' };
          if (selector === '#file-rows') return { value: '2' };
          if (selector === '#file-template') return { value: '', addEventListener: jest.fn() };
          if (selector === '#file-generate') return mockGenerateBtn;
          if (selector === '#file-filename') return { value: '  ' };
          if (selector === '#file-status') return mockStatusDiv;
          return null;
        })
      };
      
      document.querySelector.mockReturnValue(mockContainer);
      
      createUI('#container');
      generateClickHandler();
      
      // Fast-forward time to trigger setTimeout
      jest.advanceTimersByTime(15);
      
      expect(mockStatusDiv.textContent).toContain('Generated');
      
      jest.useRealTimers();
    });

    test('should render yaml and toml format options dynamically', () => {
      let capturedHTML = '';
      const mockContainer = {
        get innerHTML() { return capturedHTML; },
        set innerHTML(html) { capturedHTML = html; },
        querySelector: jest.fn((selector) => {
          if (selector === '#file-format') return { value: 'csv', addEventListener: jest.fn() };
          if (selector === '#file-template') return { value: '', addEventListener: jest.fn() };
          if (selector === '#file-columns') return { value: '' };
          if (selector === '#file-rows') return { value: '100' };
          if (selector === '#file-generate') return { addEventListener: jest.fn() };
          if (selector === '#file-filename') return { value: 'data.csv' };
          if (selector === '#file-status') return { style: {}, textContent: '' };
          return null;
        })
      };

      createUI(mockContainer);

      expect(capturedHTML).toContain('value="yaml"');
      expect(capturedHTML).toContain('value="toml"');
    });

    test('template select contains exactly Object.keys(templates).length + 1 options', () => {
      let capturedHTML = '';
      const mockContainer = {
        get innerHTML() { return capturedHTML; },
        set innerHTML(html) { capturedHTML = html; },
        querySelector: jest.fn((selector) => {
          if (selector === '#file-format') return { value: 'csv', addEventListener: jest.fn() };
          if (selector === '#file-template') return { value: '', addEventListener: jest.fn() };
          if (selector === '#file-columns') return { value: '' };
          if (selector === '#file-rows') return { value: '100' };
          if (selector === '#file-generate') return { addEventListener: jest.fn() };
          if (selector === '#file-filename') return { value: 'data.csv' };
          if (selector === '#file-status') return { style: {}, textContent: '' };
          return null;
        })
      };

      createUI(mockContainer);

      // Count <option value="..."> occurrences within the #file-template select block
      // We check via counting template name options + the blank option
      const expectedCount = Object.keys(templates).length + 1; // +1 for "-- Custom Columns --"
      const templateOptionsCount = (capturedHTML.match(/value="[a-z]+"/g) || [])
        .filter(m => Object.keys(templates).some(t => m === `value="${t}"`)).length;
      expect(templateOptionsCount).toBe(Object.keys(templates).length);
      // Blank option is also present
      expect(capturedHTML).toContain('-- Custom Columns --');
      expect(templateOptionsCount + 1).toBe(expectedCount);
    });
  });

  describe('parseDDL re-export', () => {
    test('parseDDL is exported from the browser module', async () => {
      const mod = await import('../src/browser.js');
      expect(typeof mod.parseDDL).toBe('function');
    });

    test('parseDDL parses a simple CREATE TABLE statement', async () => {
      const mod = await import('../src/browser.js');
      const tables = mod.parseDDL('CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100));');
      expect(tables.length).toBe(1);
      expect(tables[0].tableName).toBe('users');
    });
  });
});
