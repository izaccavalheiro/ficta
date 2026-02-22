import React, { useState, useEffect } from 'react';
import { generateData, formatData, downloadFile, listTemplates, setFaker } from 'ficta/browser';
import { faker } from '@faker-js/faker';
import './App.css';

// Initialize Faker
setFaker(faker);

function App() {
  const [columns, setColumns] = useState('id:autoIncrement,firstName,lastName,email,phone');
  const [rows, setRows] = useState(10);
  const [format, setFormat] = useState('csv');
  const [template, setTemplate] = useState('');
  const [generatedData, setGeneratedData] = useState('');
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load available templates
    setAvailableTemplates(listTemplates());
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const options = {
        rows: parseInt(rows)
      };

      if (template) {
        options.template = template;
      } else {
        options.columns = columns;
      }

      // Generate raw data
      const result = await generateData(options);
      
      // Format the data according to selected format
      const formattedData = formatData(result.records, result.columns, format);
      setGeneratedData(formattedData);
    } catch (error) {
      console.error('Error generating data:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedData) {
      alert('Please generate data first');
      return;
    }

    const filename = `test-data.${format === 'xlsx' ? 'xlsx' : format}`;
    downloadFile(generatedData, filename, format);
  };

  const handleTemplateChange = (e) => {
    const selectedTemplate = e.target.value;
    setTemplate(selectedTemplate);
    if (selectedTemplate) {
      setColumns(''); // Clear custom columns when using template
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎲 Ficta - Test Data Generator</h1>
        <p>Generate realistic test data in multiple formats</p>
      </header>

      <div className="container">
        <div className="config-panel">
          <h2>Configuration</h2>

          <div className="form-group">
            <label>
              Template (optional)
              <select value={template} onChange={handleTemplateChange}>
                <option value="">-- Custom Columns --</option>
                {availableTemplates.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>

          {!template && (
            <div className="form-group">
              <label>
                Custom Columns
                <input
                  type="text"
                  value={columns}
                  onChange={(e) => setColumns(e.target.value)}
                  placeholder="id:autoIncrement,name:fullName,email"
                />
              </label>
              <small>Format: name:type,name:type,...</small>
            </div>
          )}

          <div className="form-group">
            <label>
              Number of Rows
              <input
                type="number"
                value={rows}
                onChange={(e) => setRows(e.target.value)}
                min="1"
                max="10000"
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              Output Format
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="xml">XML</option>
                <option value="tsv">TSV</option>
                <option value="sql">SQL</option>
                <option value="yaml">YAML</option>
              </select>
            </label>
          </div>

          <div className="button-group">
            <button
              onClick={handleGenerate}
              disabled={loading || (!columns && !template)}
              className="btn btn-primary"
            >
              {loading ? 'Generating...' : 'Generate Data'}
            </button>
            
            <button
              onClick={handleDownload}
              disabled={!generatedData}
              className="btn btn-secondary"
            >
              Download File
            </button>
          </div>
        </div>

        <div className="preview-panel">
          <h2>Preview</h2>
          {generatedData ? (
            <pre className="data-preview">
              {typeof generatedData === 'string' 
                ? generatedData.slice(0, 2000) + (generatedData.length > 2000 ? '\n...' : '')
                : 'Binary data (click Download to save)'}
            </pre>
          ) : (
            <div className="empty-state">
              <p>No data generated yet</p>
              <p>Configure options and click "Generate Data"</p>
            </div>
          )}
        </div>
      </div>

      <footer className="app-footer">
        <p>
          Built with <a href="https://github.com/yourusername/ficta" target="_blank" rel="noopener noreferrer">Ficta</a> - 
          Universal test data generator
        </p>
      </footer>
    </div>
  );
}

export default App;
