// Browser-specific utilities for Ficta
import * as core from './core.js';
import * as formatters from './formatters.browser.js';
import { faker } from '@faker-js/faker';

// Auto-initialize Faker so the bundle is self-contained
core.setFaker(faker);

// Re-export core functionality
export * from './core.js';

// Re-export formatters
export * from './formatters.browser.js';

/**
 * Download file in browser
 * @param {string} content - File content
 * @param {string} filename - Filename for download
 * @param {string} format - File format (determines MIME type)
 */
export function downloadFile(content, filename = 'data.csv', format = 'csv') {
  const mimeType = formatters.getMimeType(format);
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    // Modern browsers
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Download CSV as a file (legacy function for backward compatibility)
 * @param {string} csv - CSV content
 * @param {string} filename - Filename for download
 */
export function downloadCSV(csv, filename = 'data.csv') {
  downloadFile(csv, filename, 'csv');
}

/**
 * Generate data and download in specified format
 * @param {Object} options - Generation options
 * @param {string} options.columns - Column definitions
 * @param {number} options.rows - Number of rows
 * @param {string} options.filename - Output filename
 * @param {string} options.format - Output format (csv, json, xml, tsv, sql)
 * @param {Object} options.formatOptions - Additional format-specific options
 * @returns {Object} Generation result
 */
export function generateAndDownload(options) {
  // Detect format from filename if not specified
  let format = options.format;
  if (!format && options.filename) {
    format = formatters.detectFormat(options.filename);
  }
  format = format || 'csv';
  
  // Generate default filename if not specified
  let filename = options.filename || options.output;
  if (!filename) {
    const ext = formatters.getFileExtension(format);
    filename = `data.${ext}`;
  }
  
  const result = core.generateData(options);
  const formatOptions = options.formatOptions || {};
  const formattedData = formatters.formatData(
    result.records,
    result.columns,
    format,
    formatOptions
  );
  
  downloadFile(formattedData, filename, format);
  
  return {
    ...result,
    format,
    filename,
    data: formattedData
  };
}

/**
 * Supported output formats in the browser bundle
 * @type {string[]}
 */
const BROWSER_FORMATS = ['csv', 'json', 'xml', 'tsv', 'sql', 'yaml', 'toml'];

/**
 * Create an interactive UI for file generation
 * @param {string|HTMLElement} container - Container element or selector
 * @param {Object} options - UI options
 * @returns {Object} UI controller
 */
export function createUI(container, options = {}) {
  const element = typeof container === 'string' 
    ? document.querySelector(container)
    : container;
  
  if (!element) {
    throw new Error('Container element not found');
  }

  // Build format options dynamically so new formats are picked up automatically
  const formatOptions = BROWSER_FORMATS
    .map(f => `<option value="${f}">${f.toUpperCase()}</option>`)
    .join('\n          ');

  // Build template options dynamically from core.templates
  const templateOptions = [
    '<option value="">-- Custom Columns --</option>',
    ...Object.keys(core.templates).map(
      name => `<option value="${name}">${name.charAt(0).toUpperCase() + name.slice(1)}</option>`
    )
  ].join('\n          ');

  // Create UI HTML
  element.innerHTML = `
    <div class="ficta-ui" style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="margin-top: 0;">Ficta - Test Data Generator</h2>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Format:</label>
        <select id="file-format" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
          ${formatOptions}
        </select>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Template:</label>
        <select id="file-template" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
          ${templateOptions}
        </select>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Columns:</label>
        <input type="text" id="file-columns" placeholder="id:autoIncrement,name:fullName,email" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
        <small style="color: #666; font-size: 12px;">Format: name:type,name:type,...</small>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Rows:</label>
        <input type="number" id="file-rows" value="100" min="1" max="10000" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Filename:</label>
        <input type="text" id="file-filename" value="data.csv" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
      </div>
      
      <button id="file-generate" style="width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; font-weight: 500;">
        Generate & Download
      </button>
      
      <div id="file-status" style="margin-top: 15px; padding: 10px; border-radius: 4px; display: none;"></div>
    </div>
  `;
  
  // Get elements
  const formatSelect = element.querySelector('#file-format');
  const templateSelect = element.querySelector('#file-template');
  const columnsInput = element.querySelector('#file-columns');
  const rowsInput = element.querySelector('#file-rows');
  const filenameInput = element.querySelector('#file-filename');
  const generateBtn = element.querySelector('#file-generate');
  const statusDiv = element.querySelector('#file-status');
  
  // Update filename extension when format changes
  formatSelect.addEventListener('change', (e) => {
    const format = e.target.value;
    const currentFilename = filenameInput.value;
    const baseName = currentFilename.replace(/\.[^.]+$/, '');
    const ext = formatters.getFileExtension(format);
    filenameInput.value = `${baseName}.${ext}`;
  });
  
  // Handle template selection
  templateSelect.addEventListener('change', (e) => {
    const templateName = e.target.value;
    if (templateName && core.templates[templateName]) {
      const template = core.templates[templateName];
      columnsInput.value = template.columns;
      rowsInput.value = template.rows;
    }
  });
  
  // Handle generation
  generateBtn.addEventListener('click', () => {
    try {
      const format = formatSelect.value;
      const columns = columnsInput.value.trim();
      const rows = parseInt(rowsInput.value);
      const filename = filenameInput.value.trim() || `data.${formatters.getFileExtension(format)}`;
      
      if (!columns) {
        showStatus('error', 'Please specify columns');
        return;
      }
      
      if (rows < 1 || rows > 10000) {
        showStatus('error', 'Rows must be between 1 and 10,000');
        return;
      }
      
      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating...';
      
      // Allow UI to update
      setTimeout(() => {
        try {
          const result = generateAndDownload({ columns, rows, filename, format });
          showStatus('success', `✓ Generated ${result.rowCount} rows × ${result.columnCount} columns (${format.toUpperCase()})`);
        } catch (err) {
          showStatus('error', `Error: ${err.message}`);
        } finally {
          generateBtn.disabled = false;
          generateBtn.textContent = 'Generate & Download';
        }
      }, 10);
      
    } catch (err) {
      showStatus('error', `Error: ${err.message}`);
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate & Download';
    }
  });
  
  function showStatus(type, message) {
    statusDiv.style.display = 'block';
    statusDiv.textContent = message;
    statusDiv.style.background = type === 'success' ? '#d4edda' : '#f8d7da';
    statusDiv.style.color = type === 'success' ? '#155724' : '#721c24';
    statusDiv.style.border = `1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'}`;
  }
  
  return {
    element,
    setFormat: (format) => { formatSelect.value = format; },
    setColumns: (columns) => { columnsInput.value = columns; },
    setRows: (rows) => { rowsInput.value = rows; },
    setFilename: (filename) => { filenameInput.value = filename; },
    destroy: () => { element.innerHTML = ''; }
  };
}
