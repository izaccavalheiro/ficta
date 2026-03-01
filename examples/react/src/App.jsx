import React, { useState } from 'react';
import {
  // Core generation
  generateData,
  formatData,
  downloadFile,
  // Faker control
  setFaker,
  seedFaker,
  setLocale,
  // Type / template registry
  listTypes,
  listTemplates,
  registerType,
  unregisterType,
  registerTemplate,
  unregisterTemplate,
  templates as builtinTemplates,
  // Schema-first API (v1.2.0)
  columnStringToSchema,
  schemaToColumnString,
  // Factory API (v1.2.0)
  createFactory,
  // Statistical distributions (v1.2.0)
  sampleUniform,
  sampleNormal,
  sampleExponential,
  sampleZipf,
  sampleFromDistribution,
  // Schema inference (pure, browser-safe)
  inferSchema,
  // OpenAPI bridge (pure, browser-safe)
  openAPIToFictaSchema,
  fromOpenAPISchema,
  // GraphQL bridge (pure, browser-safe) — async since v1.2.0
  graphQLToFictaSchema,
  fromGraphQLSDL,
  // DDL parser + multi-table generator (pure, browser-safe)
  parseDDL,
  orderByDependencies,
  generateFromSchema,
} from 'ficta/browser';
import { faker } from '@faker-js/faker';
import './App.css';

// Self-contained bundle auto-initialises Faker, but we call setFaker here too
// so the example explicitly documents the pattern.
setFaker(faker);

// ---------------------------------------------------------------------------
// Shared UI helpers
// ---------------------------------------------------------------------------

function PreviewBox({ data, label = 'Output' }) {
  if (!data) {
    return (
      <div className="empty-state">
        <p>No output yet — configure options on the left and click the action button.</p>
      </div>
    );
  }
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const preview = text.length > 4000 ? text.slice(0, 4000) + '\n\n… (truncated for display)' : text;
  return (
    <div className="preview-box">
      <div className="preview-header">
        <span className="preview-label">{label}</span>
        <span className="preview-size">{text.length.toLocaleString()} chars</span>
      </div>
      <pre className="data-preview">{preview}</pre>
    </div>
  );
}

function FormRow({ label, hint, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
      {hint && <small className="form-hint">{hint}</small>}
    </div>
  );
}

function ActionButton({ onClick, loading, disabled, children, variant = 'primary' }) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={loading || disabled}
    >
      {loading ? 'Working…' : children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Tab 1 - Basic Generator
// Covers: all 7 browser formats (CSV/JSON/XML/TSV/SQL/YAML/TOML), predefined
//         templates, custom columns, seedFaker, setLocale, header/headerFormat.
// ---------------------------------------------------------------------------
function BasicGeneratorTab() {
  const [template, setTemplate] = useState('');
  const [columns, setColumns] = useState(
    'id:autoIncrement,firstName,lastName,email,phone,city,country'
  );
  const [rows, setRows] = useState(10);
  const [format, setFormat] = useState('csv');
  const [seed, setSeed] = useState('');
  const [locale_, setLocale_] = useState('');
  const [header, setHeader] = useState(true);
  const [headerFormat, setHeaderFormat] = useState('title');
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);

  const availableTemplates = listTemplates();

  const handleTemplateChange = (tpl) => {
    setTemplate(tpl);
    if (tpl && builtinTemplates[tpl]) {
      setColumns(builtinTemplates[tpl].columns);
      setRows(builtinTemplates[tpl].rows);
    }
  };

  const generate = async () => {
    setLoading(true);
    try {
      if (seed !== '') seedFaker(Number(seed));
      if (locale_ !== '') setLocale(locale_);

      const opts = { rows: Number(rows) };
      if (template) opts.template = template;
      else opts.columns = columns;

      const result = generateData(opts);
      const fmtOpts = {};
      if (format === 'csv' || format === 'tsv') {
        fmtOpts.header = header;
        fmtOpts.headerFormat = headerFormat;
      }
      const data = await formatData(result.records, result.columns, format, fmtOpts);
      setOutput({ data, format, rowCount: result.records.length });
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!output) return;
    downloadFile(output.data, `ficta-data.${output.format}`, output.format);
  };

  return (
    <div className="tab-layout">
      <div className="config-panel">
        <h3>Basic Generator</h3>
        <p className="tab-desc">
          All 7 browser formats, predefined templates, custom columns,
          reproducible seeding, locale selection, and CSV/TSV header options.
        </p>

        <FormRow label="Template">
          <select value={template} onChange={(e) => handleTemplateChange(e.target.value)}>
            <option value="">— Custom columns —</option>
            {availableTemplates.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormRow>

        {!template && (
          <FormRow label="Custom Columns" hint="name:type,name:type,…">
            <input
              type="text"
              value={columns}
              onChange={(e) => setColumns(e.target.value)}
              placeholder="id:autoIncrement,name:fullName,email"
            />
          </FormRow>
        )}

        <FormRow label="Rows">
          <input type="number" value={rows} min={1} max={10000}
            onChange={(e) => setRows(e.target.value)} />
        </FormRow>

        <FormRow label="Format">
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            {['csv', 'json', 'xml', 'tsv', 'sql', 'yaml', 'toml'].map(f => (
              <option key={f} value={f}>{f.toUpperCase()}</option>
            ))}
          </select>
        </FormRow>

        <FormRow label="Seed" hint="Integer → deterministic output; leave blank for random">
          <input type="number" value={seed} placeholder="e.g. 42"
            onChange={(e) => setSeed(e.target.value)} />
        </FormRow>

        <FormRow label="Locale" hint="Faker.js locale, e.g. fr, de, ja, pt_BR">
          <input type="text" value={locale_} placeholder="e.g. fr"
            onChange={(e) => setLocale_(e.target.value)} />
        </FormRow>

        {(format === 'csv' || format === 'tsv') && (
          <>
            <FormRow label="Header Row">
              <label className="checkbox-label">
                <input type="checkbox" checked={header}
                  onChange={(e) => setHeader(e.target.checked)} />
                {' '}Include header row
              </label>
            </FormRow>
            <FormRow label="Header Format">
              <select value={headerFormat} onChange={(e) => setHeaderFormat(e.target.value)}>
                <option value="title">Title Case (default)</option>
                <option value="raw">Raw (exact key names)</option>
              </select>
            </FormRow>
          </>
        )}

        <div className="button-group">
          <ActionButton onClick={generate} loading={loading}>Generate</ActionButton>
          <ActionButton onClick={download} disabled={!output} variant="secondary">
            Download
          </ActionButton>
        </div>
      </div>

      <div className="preview-panel">
        <PreviewBox
          data={output?.data}
          label={output ? `${output.format.toUpperCase()} — ${output.rowCount} rows` : 'Output'}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2 - Special Types
// Covers: autoIncrement, enum:, range:, pattern: (# and {COUNTER}), static:
// ---------------------------------------------------------------------------
function SpecialTypesTab() {
  const DEMO_COLUMNS = [
    'id:autoIncrement',
    'sku:pattern:PRD-######',
    'trackingCode:pattern:TRK-{COUNTER}',
    'age:range:18-65',
    'score:range:0-100',
    'role:enum:admin|editor|viewer|guest',
    'currency:enum:USD|EUR|GBP|JPY',
    'env:static:production',
    'status:enum:pending|processing|shipped|delivered|cancelled',
    'email:pattern:user+{COUNTER}@example.com',
  ].join(',');

  const [columns, setColumns] = useState(DEMO_COLUMNS);
  const [rows, setRows] = useState(6);
  const [output, setOutput] = useState(null);

  const typeDescriptions = [
    { type: 'autoIncrement', example: 'id:autoIncrement', desc: 'Sequential integer starting at 1' },
    { type: 'enum:…', example: 'role:enum:admin|editor|viewer', desc: 'Random pick from a |-delimited list' },
    { type: 'range:…', example: 'age:range:18-65', desc: 'Random integer between min and max' },
    { type: 'pattern: #', example: 'sku:pattern:PRD-######', desc: '# = random digit 0-9' },
    { type: 'pattern: {COUNTER}', example: 'email:pattern:user+{COUNTER}@test.com', desc: '{COUNTER} = row index (1, 2, 3…)' },
    { type: 'static:…', example: 'env:static:production', desc: 'Same literal value on every row' },
  ];

  const generate = () => {
    try {
      const result = generateData({ columns, rows: Number(rows) });
      setOutput(result.records);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="tab-layout">
      <div className="config-panel">
        <h3>Special Types</h3>
        <p className="tab-desc">
          Beyond Faker types, Ficta provides six column modifiers for computed
          and fixed-value columns. Edit the column string to experiment.
        </p>

        <div className="type-cards">
          {typeDescriptions.map(d => (
            <div key={d.type} className="type-card">
              <code className="type-name">{d.type}</code>
              <p className="type-desc">{d.desc}</p>
              <code className="type-example">{d.example}</code>
            </div>
          ))}
        </div>

        <FormRow label="Column Definitions" hint="Edit any column to experiment">
          <textarea value={columns} rows={4} onChange={(e) => setColumns(e.target.value)} />
        </FormRow>

        <FormRow label="Rows">
          <input type="number" value={rows} min={1} max={50}
            onChange={(e) => setRows(e.target.value)} />
        </FormRow>

        <ActionButton onClick={generate}>Generate Rows</ActionButton>
      </div>

      <div className="preview-panel">
        {output ? (
          <div className="preview-box">
            <div className="preview-header">
              <span className="preview-label">JSON Records — {output.length} rows</span>
            </div>
            <pre className="data-preview">{JSON.stringify(output, null, 2)}</pre>
          </div>
        ) : (
          <div className="empty-state">
            <p>Click &ldquo;Generate Rows&rdquo; to see all special types in action.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3 - Plugin API
// Covers: registerType, unregisterType, registerTemplate, unregisterTemplate
// ---------------------------------------------------------------------------
function PluginApiTab() {
  const [typeName, setTypeName] = useState('hashtag');
  const [templateName, setTemplateName] = useState('devTeam');
  const [registeredType, setRegisteredType] = useState(false);
  const [registeredTemplate, setRegisteredTemplate] = useState(false);
  const [typeOutput, setTypeOutput] = useState(null);
  const [templateOutput, setTemplateOutput] = useState(null);

  const DEV_TEAM_COLS = 'id:autoIncrement,firstName,lastName,email,jobTitle,company';

  const handleRegisterType = () => {
    try {
      if (registeredType) {
        try { unregisterType(typeName); } catch (_) { /* ignore */ }
      }
      registerType(typeName, () => '#' + faker.word.sample().toLowerCase());
      setRegisteredType(true);
      const result = generateData({
        columns: `id:autoIncrement,tweet:sentence,tag:${typeName}`,
        rows: 5,
      });
      setTypeOutput(result.records);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleUnregisterType = () => {
    try {
      unregisterType(typeName);
      setRegisteredType(false);
      setTypeOutput(null);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleRegisterTemplate = () => {
    try {
      if (registeredTemplate) {
        try { unregisterTemplate(templateName); } catch (_) { /* ignore */ }
      }
      registerTemplate(templateName, { columns: DEV_TEAM_COLS, rows: 8 });
      setRegisteredTemplate(true);
      const result = generateData({ template: templateName, rows: 5 });
      setTemplateOutput(result.records);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleUnregisterTemplate = () => {
    try {
      unregisterTemplate(templateName);
      setRegisteredTemplate(false);
      setTemplateOutput(null);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="tab-layout">
      <div className="config-panel">
        <h3>Plugin API</h3>
        <p className="tab-desc">
          Extend Ficta at runtime without modifying core source files.
          Demonstrates <code>registerType</code>, <code>unregisterType</code>,{' '}
          <code>registerTemplate</code>, and <code>unregisterTemplate</code>.
        </p>

        <div className="plugin-section">
          <h4>Custom Type</h4>
          <FormRow label="Type name">
            <input type="text" value={typeName} onChange={(e) => setTypeName(e.target.value)} />
          </FormRow>
          <p className="code-hint">
            Generator: <code>{"() => '#' + faker.word.sample().toLowerCase()"}</code>
          </p>
          <div className="button-group-inline">
            <ActionButton onClick={handleRegisterType}>
              {registeredType ? 'Re-register & Use' : 'Register & Use'}
            </ActionButton>
            {registeredType && (
              <ActionButton onClick={handleUnregisterType} variant="danger">Unregister</ActionButton>
            )}
          </div>
          {typeOutput && (
            <pre className="data-preview inline-preview">{JSON.stringify(typeOutput, null, 2)}</pre>
          )}
        </div>

        <div className="plugin-section">
          <h4>Custom Template</h4>
          <FormRow label="Template name">
            <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          </FormRow>
          <p className="code-hint">Columns: <code>{DEV_TEAM_COLS}</code></p>
          <div className="button-group-inline">
            <ActionButton onClick={handleRegisterTemplate}>
              {registeredTemplate ? 'Re-register & Use' : 'Register & Use'}
            </ActionButton>
            {registeredTemplate && (
              <ActionButton onClick={handleUnregisterTemplate} variant="danger">Unregister</ActionButton>
            )}
          </div>
          {templateOutput && (
            <pre className="data-preview inline-preview">{JSON.stringify(templateOutput, null, 2)}</pre>
          )}
        </div>
      </div>

      <div className="preview-panel">
        <div className="empty-state">
          <p>Register a custom type or template; output appears inline below each button.</p>
          <p>After unregistering, attempting to use the type/template throws an error.</p>
          <p>Registering the same name twice without <code>override: true</code> also throws.</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 4 - Schema Inference
// Covers: inferSchema (pure, browser-safe)
// ---------------------------------------------------------------------------
const INFER_SAMPLE = JSON.stringify([
  { id: 1, first_name: 'Alice', last_name: 'Smith', email: 'alice@example.com', phone: '555-1234', city: 'London', active: true,  created_at: '2024-01-15T08:30:00Z' },
  { id: 2, first_name: 'Bob',   last_name: 'Jones', email: 'bob@example.com',   phone: '555-5678', city: 'Paris',  active: false, created_at: '2024-03-22T14:00:00Z' },
  { id: 3, first_name: 'Carol', last_name: 'Lee',   email: 'carol@example.com', phone: '555-9012', city: 'Berlin', active: true,  created_at: '2025-07-11T09:15:00Z' },
], null, 2);

function SchemaInferenceTab() {
  const [jsonInput, setJsonInput] = useState(INFER_SAMPLE);
  const [inferred, setInferred] = useState(null);
  const [genRows, setGenRows] = useState(10);
  const [genOutput, setGenOutput] = useState(null);

  const handleInfer = () => {
    try {
      const rows = JSON.parse(jsonInput);
      if (!Array.isArray(rows)) throw new Error('Input must be a JSON array of row objects.');
      const result = inferSchema(rows);
      setInferred(result);
      setGenOutput(null);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const generate = () => {
    if (!inferred) return;
    try {
      const result = generateData({ columns: inferred.columns, rows: Number(genRows) });
      setGenOutput(result.records);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="tab-layout">
      <div className="config-panel">
        <h3>Schema Inference</h3>
        <p className="tab-desc">
          Paste a JSON array of sample rows. <code>inferSchema()</code> detects Ficta
          column types using name hints, UUID / ISO-date / email / URL patterns,
          small closed sets (auto-enum), and numeric fallback.
          Pure function — no Node.js needed.
        </p>

        <FormRow label="Sample JSON Rows" hint="Must be a JSON array of objects">
          <textarea value={jsonInput} rows={10} onChange={(e) => setJsonInput(e.target.value)} />
        </FormRow>

        <ActionButton onClick={handleInfer}>Infer Schema</ActionButton>

        {inferred && (
          <>
            <div className="inferred-results">
              <h4>Inferred Column Definitions</h4>
              <code className="columns-string">{inferred.columns}</code>
              <table className="type-table">
                <thead><tr><th>Column</th><th>Inferred Type</th></tr></thead>
                <tbody>
                  {inferred.columnList.map(col => (
                    <tr key={col.name}>
                      <td><code>{col.name}</code></td>
                      <td><code>{col.type}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <FormRow label="Rows to generate">
              <input type="number" value={genRows} min={1} max={1000}
                onChange={(e) => setGenRows(e.target.value)} />
            </FormRow>
            <ActionButton onClick={generate} variant="secondary">
              Generate Synthetic Data
            </ActionButton>
          </>
        )}
      </div>

      <div className="preview-panel">
        <PreviewBox
          data={genOutput}
          label={genOutput ? `Synthetic data — ${genOutput.length} rows` : 'Generated Output'}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 5 - OpenAPI Bridge
// Covers: fromOpenAPISchema, openAPIToFictaSchema (pure, browser-safe)
// ---------------------------------------------------------------------------
const OPENAPI_SAMPLE = JSON.stringify({
  openapi: '3.0.3',
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id:         { type: 'string', format: 'uuid' },
          email:      { type: 'string', format: 'email' },
          username:   { type: 'string' },
          password:   { type: 'string', format: 'password' },
          website:    { type: 'string', format: 'uri' },
          ip_address: { type: 'string', format: 'ipv4' },
          age:        { type: 'integer' },
          balance:    { type: 'number' },
          active:     { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
          role:       { type: 'string', enum: ['admin', 'editor', 'viewer'] },
        },
      },
    },
  },
}, null, 2);

function OpenApiBridgeTab() {
  const [docInput, setDocInput] = useState(OPENAPI_SAMPLE);
  const [schemaName, setSchemaName] = useState('');
  const [converted, setConverted] = useState(null);
  const [rows, setRows] = useState(8);
  const [dialect, setDialect] = useState('postgres');
  const [genOutput, setGenOutput] = useState(null);

  const convert = () => {
    try {
      const doc = JSON.parse(docInput);
      const columns = fromOpenAPISchema(doc, schemaName ? { schemaName } : {});
      const schema = openAPIToFictaSchema(doc, { rows: Number(rows), dialect });
      setConverted({ columns, schema });
      setGenOutput(null);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const generate = () => {
    if (!converted) return;
    try {
      const colStr = converted.columns.map(c => `${c.name}:${c.type}`).join(',');
      const result = generateData({ columns: colStr, rows: Number(rows) });
      setGenOutput(result.records);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="tab-layout">
      <div className="config-panel">
        <h3>OpenAPI Bridge</h3>
        <p className="tab-desc">
          Paste an OpenAPI 3.x JSON document. <code>fromOpenAPISchema()</code> maps
          one component schema to Ficta columns. <code>openAPIToFictaSchema()</code>
          converts all schemas to ficta.schema.json. Both are pure and browser-safe.
        </p>

        <FormRow label="OpenAPI JSON Document">
          <textarea value={docInput} rows={10} onChange={(e) => setDocInput(e.target.value)} />
        </FormRow>

        <FormRow label="Component schema name" hint="Leave blank to use first schema">
          <input type="text" value={schemaName} placeholder="e.g. User"
            onChange={(e) => setSchemaName(e.target.value)} />
        </FormRow>

        <FormRow label="Rows">
          <input type="number" value={rows} min={1} max={500}
            onChange={(e) => setRows(e.target.value)} />
        </FormRow>

        <FormRow label="SQL Dialect">
          <select value={dialect} onChange={(e) => setDialect(e.target.value)}>
            {['postgres', 'mysql', 'sqlite', 'generic'].map(d =>
              <option key={d} value={d}>{d}</option>)}
          </select>
        </FormRow>

        <div className="button-group-inline">
          <ActionButton onClick={convert}>Convert Schema</ActionButton>
          {converted && (
            <ActionButton onClick={generate} variant="secondary">Generate Data</ActionButton>
          )}
        </div>

        {converted && (
          <div className="inferred-results">
            <h4>Mapped Columns</h4>
            <table className="type-table">
              <thead><tr><th>Column</th><th>Ficta Type</th><th>Nullable</th></tr></thead>
              <tbody>
                {converted.columns.map(col => (
                  <tr key={col.name}>
                    <td><code>{col.name}</code></td>
                    <td><code>{col.type}</code></td>
                    <td>{col.nullable === false ? 'NOT NULL' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="preview-panel">
        {converted && !genOutput && (
          <PreviewBox data={converted.schema} label="ficta.schema.json — openAPIToFictaSchema" />
        )}
        {genOutput && (
          <PreviewBox data={genOutput} label={`Generated records — ${genOutput.length} rows`} />
        )}
        {!converted && !genOutput && (
          <div className="empty-state"><p>Paste an OpenAPI document and click &ldquo;Convert Schema&rdquo;.</p></div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 6 - GraphQL Bridge
// Covers: fromGraphQLSDL, graphQLToFictaSchema (pure, browser-safe)
// ---------------------------------------------------------------------------
const GRAPHQL_SAMPLE = `type User {
  id:         ID!
  email:      String!
  username:   String
  full_name:  String
  phone:      String
  city:       String
  company:    String
  job_title:  String
  age:        Int
  balance:    Float
  active:     Boolean!
  created_at: String
}

type Post {
  id:        ID!
  title:     String!
  body:      String
  author_id: ID!
  published: Boolean
  views:     Int
}`;

function GraphQLBridgeTab() {
  const [sdlInput, setSdlInput] = useState(GRAPHQL_SAMPLE);
  const [typeName, setTypeName] = useState('User');
  const [converted, setConverted] = useState(null);
  const [rows, setRows] = useState(8);
  const [dialect, setDialect] = useState('postgres');
  const [genOutput, setGenOutput] = useState(null);

  const convert = async () => {
    try {
      // fromGraphQLSDL and graphQLToFictaSchema are async since v1.2.0
      const columns = await fromGraphQLSDL(sdlInput, typeName ? { typeName } : {});
      const schema = await graphQLToFictaSchema(sdlInput, { rows: Number(rows), dialect });
      setConverted({ columns, schema });
      setGenOutput(null);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const generate = () => {
    if (!converted) return;
    try {
      const colStr = converted.columns
        .filter(c => c.type && c.type !== 'skip')
        .map(c => `${c.name}:${c.type}`)
        .join(',');
      const result = generateData({ columns: colStr, rows: Number(rows) });
      setGenOutput(result.records);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="tab-layout">
      <div className="config-panel">
        <h3>GraphQL Bridge</h3>
        <p className="tab-desc">
          Paste a GraphQL SDL. <code>fromGraphQLSDL()</code> maps one object type
          to Ficta columns. <code>graphQLToFictaSchema()</code> converts all types
          to ficta.schema.json. Both are pure and browser-safe.
        </p>

        <FormRow label="GraphQL SDL">
          <textarea value={sdlInput} rows={10} onChange={(e) => setSdlInput(e.target.value)} />
        </FormRow>

        <FormRow label="Target type" hint="Leave blank to use first object type">
          <input type="text" value={typeName} placeholder="e.g. User"
            onChange={(e) => setTypeName(e.target.value)} />
        </FormRow>

        <FormRow label="Rows">
          <input type="number" value={rows} min={1} max={500}
            onChange={(e) => setRows(e.target.value)} />
        </FormRow>

        <FormRow label="SQL Dialect">
          <select value={dialect} onChange={(e) => setDialect(e.target.value)}>
            {['postgres', 'mysql', 'sqlite', 'generic'].map(d =>
              <option key={d} value={d}>{d}</option>)}
          </select>
        </FormRow>

        <div className="button-group-inline">
          <ActionButton onClick={convert}>Convert Schema</ActionButton>
          {converted && (
            <ActionButton onClick={generate} variant="secondary">Generate Data</ActionButton>
          )}
        </div>

        {converted && (
          <div className="inferred-results">
            <h4>Mapped Columns — {typeName || 'first type'}</h4>
            <table className="type-table">
              <thead><tr><th>Field</th><th>Ficta Type</th><th>Nullable</th></tr></thead>
              <tbody>
                {converted.columns.map(col => (
                  <tr key={col.name}>
                    <td><code>{col.name}</code></td>
                    <td><code>{col.type}</code></td>
                    <td>{col.nullable === false ? 'NOT NULL' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="preview-panel">
        {converted && !genOutput && (
          <PreviewBox data={converted.schema}
            label="ficta.schema.json — graphQLToFictaSchema (all types)" />
        )}
        {genOutput && (
          <PreviewBox data={genOutput} label={`Generated records — ${genOutput.length} rows`} />
        )}
        {!converted && !genOutput && (
          <div className="empty-state">
            <p>Paste a GraphQL SDL and click &ldquo;Convert Schema&rdquo;.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 7 - DDL Multi-Table
// Covers: parseDDL, orderByDependencies, generateFromSchema (pure / browser-safe)
// ---------------------------------------------------------------------------
const DDL_SAMPLE = `-- E-commerce schema with FK relationships
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  category_id INT     NOT NULL REFERENCES categories(id),
  sku         VARCHAR(50)  NOT NULL,
  name        VARCHAR(255) NOT NULL,
  price       DECIMAL(10,2),
  stock       INT DEFAULT 0
);

CREATE TABLE customers (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name  VARCHAR(50),
  phone      VARCHAR(30),
  created_at TIMESTAMP
);

CREATE TABLE orders (
  id          SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id),
  total       DECIMAL(10,2),
  status      VARCHAR(20) DEFAULT 'pending',
  placed_at   TIMESTAMP
);`;

function DdlMultiTableTab() {
  const [ddlInput, setDdlInput] = useState(DDL_SAMPLE);
  const [rows, setRows] = useState(5);
  const [dialect, setDialect] = useState('postgres');
  const [mode, setMode] = useState('ddl+insert');
  const [parsed, setParsed] = useState(null);
  const [sqlOutput, setSqlOutput] = useState(null);

  const handleParse = () => {
    try {
      const tables = parseDDL(ddlInput);
      const ordered = orderByDependencies(tables);
      setParsed(ordered);
      setSqlOutput(null);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const generate = () => {
    if (!parsed) return;
    try {
      const sql = generateFromSchema({
        tables: parsed,
        rows: Number(rows),
        outputMode: mode,
        dialect,
      });
      setSqlOutput(sql);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const download = () => {
    if (!sqlOutput) return;
    downloadFile(sqlOutput, 'seed.sql', 'sql');
  };

  return (
    <div className="tab-layout">
      <div className="config-panel">
        <h3>DDL Multi-Table</h3>
        <p className="tab-desc">
          Paste a SQL DDL string. <code>parseDDL()</code> extracts tables, columns,
          PKs, FKs, and ENUM values. <code>orderByDependencies()</code> topologically
          sorts them. <code>generateFromSchema()</code> produces FK-consistent seed
          data. All three are pure functions — no Node.js required.
        </p>

        <FormRow label="SQL DDL">
          <textarea value={ddlInput} rows={10} onChange={(e) => setDdlInput(e.target.value)} />
        </FormRow>

        <FormRow label="Rows per table">
          <input type="number" value={rows} min={1} max={200}
            onChange={(e) => setRows(e.target.value)} />
        </FormRow>

        <FormRow label="Dialect">
          <select value={dialect} onChange={(e) => setDialect(e.target.value)}>
            {['postgres', 'mysql', 'sqlite', 'generic'].map(d =>
              <option key={d} value={d}>{d}</option>)}
          </select>
        </FormRow>

        <FormRow label="Output Mode">
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            {['insert', 'ddl+insert', 'upsert', 'truncate+insert'].map(m =>
              <option key={m} value={m}>{m}</option>)}
          </select>
        </FormRow>

        <div className="button-group-inline">
          <ActionButton onClick={handleParse}>Parse DDL</ActionButton>
          {parsed && (
            <ActionButton onClick={generate} variant="secondary">Generate SQL</ActionButton>
          )}
          {sqlOutput && (
            <ActionButton onClick={download} variant="secondary">Download .sql</ActionButton>
          )}
        </div>

        {parsed && (
          <div className="inferred-results">
            <h4>Parsed Tables — FK order ({parsed.length} tables)</h4>
            {parsed.map(t => (
              <div key={t.tableName} className="ddl-table-card">
                <div className="ddl-table-header">
                  <strong>{t.tableName}</strong>
                  {t.primaryKey.length > 0 && (
                    <span className="badge pk">PK: {t.primaryKey.join(', ')}</span>
                  )}
                  {t.foreignKeys.length > 0 && (
                    <span className="badge fk">
                      FK → {t.foreignKeys.map(fk => fk.referencedTable).join(', ')}
                    </span>
                  )}
                </div>
                <div className="col-list">
                  {t.columns.map(c => (
                    <code key={c.name}>{c.name}:{c.fictaType}</code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="preview-panel">
        <PreviewBox data={sqlOutput} label="Generated SQL — FK-consistent seed data" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 8 - Types & Templates Browser
// Covers: listTypes(), listTemplates()
// ---------------------------------------------------------------------------
function TypesBrowserTab() {
  const allTypes = listTypes();
  const allTemplates = listTemplates();

  const typeCategories = {
    'Person':             ['firstName', 'lastName', 'fullName', 'jobTitle', 'prefix', 'suffix'],
    'Internet':           ['email', 'username', 'password', 'url', 'ipv4', 'userAgent'],
    'Phone & Address':    ['phone', 'street', 'city', 'state', 'country', 'zipCode', 'latitude', 'longitude'],
    'Company & Commerce': ['company', 'department', 'product', 'price', 'productDescription'],
    'Finance':            ['amount', 'accountNumber', 'iban', 'creditCardNumber', 'currency'],
    'Dates':              ['pastDate', 'futureDate', 'recentDate', 'timestamp'],
    'Numbers & Text':     ['number', 'float', 'word', 'words', 'sentence', 'paragraph', 'string', 'text', 'int', 'integer', 'date'],
    'IDs':                ['uuid', 'nanoid', 'autoIncrement'],
    'Other':              ['boolean', 'color', 'emoji', 'json'],
  };

  return (
    <div className="types-layout">
      <div className="types-section">
        <h3>Data Types <span className="count-badge">{allTypes.length} total</span></h3>
        <p className="tab-desc">
          All registered types returned by <code>listTypes()</code>.
          Use as the <code>type</code> half of a <code>name:type</code> column definition.
        </p>
        {Object.entries(typeCategories).map(([cat, types]) => (
          <div key={cat} className="type-category">
            <h4>{cat}</h4>
            <div className="type-chips">
              {types.filter(t => allTypes.includes(t)).map(t => (
                <code key={t} className="type-chip">{t}</code>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="types-section">
        <h3>Templates <span className="count-badge">{allTemplates.length} total</span></h3>
        <p className="tab-desc">
          All registered templates returned by <code>listTemplates()</code>.
          Pass <code>template: 'name'</code> to <code>generateData()</code>.
        </p>
        {allTemplates.map(name => {
          const tpl = builtinTemplates[name];
          return (
            <div key={name} className="template-card">
              <div className="template-header">
                <strong>{name}</strong>
                <span className="badge">{tpl?.rows} default rows</span>
              </div>
              <code className="template-columns">{tpl?.columns}</code>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 9 - Factory API (v1.2.0)
// Covers: createFactory, build(), buildMany(), buildList(), factory.schema
// ---------------------------------------------------------------------------
function FactoryApiTab() {
  const DEFAULT_COLUMNS = 'id:autoIncrement,firstName,lastName,email,role:enum:admin|editor|viewer,score:range:0-100';
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [seed, setSeed] = useState('42');
  const [overrideField, setOverrideField] = useState('role');
  const [overrideValue, setOverrideValue] = useState('admin');
  const [buildCount, setBuildCount] = useState(5);
  const [output, setOutput] = useState(null);
  const [schemaInfo, setSchemaInfo] = useState(null);

  const runFactory = () => {
    try {
      const seedNum = seed !== '' ? Number(seed) : undefined;
      const factory = createFactory(columns, seedNum !== undefined ? { seed: seedNum } : {});

      // Expose factory.schema metadata
      setSchemaInfo(factory.schema);

      // build() — single record with optional override
      const override = overrideField && overrideValue
        ? { [overrideField]: overrideValue }
        : {};
      const single = factory.build(override);

      // buildMany() — N identical-override records
      const many = factory.buildMany(Number(buildCount));

      // buildList() — per-record override function
      const listed = factory.buildList(3, (rec, i) => ({
        email: `override${i + 1}@example.com`,
      }));

      setOutput({ single, many, listed });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="tab-layout">
      <div className="config-panel">
        <h3>Factory API <span className="badge-new">v1.2.0</span></h3>
        <p className="tab-desc">
          <code>createFactory()</code> creates a reusable test-data factory.
          Use <code>build()</code> for a single record, <code>buildMany(n)</code> for
          N records with shared overrides, and <code>buildList(n, fn)</code> for
          per-record override functions. The <code>seed</code> option makes output
          fully reproducible across runs.
        </p>

        <FormRow label="Column Definitions">
          <textarea value={columns} rows={3} onChange={(e) => setColumns(e.target.value)} />
        </FormRow>

        <FormRow label="Seed" hint="Integer → deterministic; blank for random">
          <input type="number" value={seed} placeholder="e.g. 42"
            onChange={(e) => setSeed(e.target.value)} />
        </FormRow>

        <FormRow label="build() override field">
          <input type="text" value={overrideField} placeholder="e.g. role"
            onChange={(e) => setOverrideField(e.target.value)} />
        </FormRow>

        <FormRow label="build() override value">
          <input type="text" value={overrideValue} placeholder="e.g. admin"
            onChange={(e) => setOverrideValue(e.target.value)} />
        </FormRow>

        <FormRow label="buildMany count">
          <input type="number" value={buildCount} min={1} max={50}
            onChange={(e) => setBuildCount(e.target.value)} />
        </FormRow>

        <ActionButton onClick={runFactory}>Create Factory &amp; Run</ActionButton>

        {schemaInfo && (
          <div className="inferred-results">
            <h4>factory.schema — parsed column metadata</h4>
            <table className="type-table">
              <thead><tr><th>name</th><th>type</th></tr></thead>
              <tbody>
                {schemaInfo.map(col => (
                  <tr key={col.name}>
                    <td><code>{col.name}</code></td>
                    <td><code>{col.type}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="preview-panel">
        {output ? (
          <div className="preview-box">
            <div className="preview-header">
              <span className="preview-label">Factory output</span>
            </div>
            <pre className="data-preview">
              {'=== build() — 1 record (with override) ===\n'}
              {JSON.stringify(output.single, null, 2)}
              {'\n\n=== buildMany(' + buildCount + ') ===\n'}
              {JSON.stringify(output.many, null, 2)}
              {'\n\n=== buildList(3, fn) — sequential email override ===\n'}
              {JSON.stringify(output.listed, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="empty-state">
            <p>Configure a column string and click “Create Factory &amp; Run”.</p>
            <p>The factory uses <code>seed</code> for reproducible output — the same seed always produces identical data.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 10 - Statistical Distributions (v1.2.0)
// Covers: sampleNormal, sampleZipf, sampleExponential, sampleFromDistribution,
//         distribution field on SchemaColumn, Zipf-weighted enums
// ---------------------------------------------------------------------------
const DIST_SCHEMA_DEFAULT = JSON.stringify([
  { name: 'userId',   type: 'autoIncrement' },
  { name: 'age',      type: 'range:18-80',  distribution: { type: 'normal',      mean: 35, stddev: 10 } },
  { name: 'sessions', type: 'range:1-500',  distribution: { type: 'exponential', lambda: 0.1 } },
  { name: 'plan',     type: 'enum:free|starter|pro|enterprise', distribution: { type: 'zipf', n: 4, s: 1.8 } },
  { name: 'score',    type: 'range:0-100',  distribution: { type: 'normal',      mean: 72, stddev: 12 } },
], null, 2);

function DistributionsTab() {
  const [schemaInput, setSchemaInput] = useState(DIST_SCHEMA_DEFAULT);
  const [rows, setRows] = useState(20);
  const [output, setOutput]   = useState(null);
  const [samplerOutput, setSamplerOutput] = useState(null);

  const generate = () => {
    try {
      const schema = JSON.parse(schemaInput);
      if (!Array.isArray(schema)) throw new Error('Must be a JSON array of SchemaColumn objects.');
      const result = generateData({ schema, rows: Number(rows) });
      setOutput(result.records);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const runSamplers = () => {
    try {
      const results = [
        { fn: 'sampleUniform(18, 65)',         values: Array.from({ length: 6 }, () => sampleUniform(18, 65).toFixed(1)) },
        { fn: 'sampleNormal(70, 10)',           values: Array.from({ length: 6 }, () => Math.round(sampleNormal(70, 10))) },
        { fn: 'sampleExponential(0.5)',         values: Array.from({ length: 6 }, () => sampleExponential(0.5).toFixed(2)) },
        { fn: 'sampleZipf(4, 1.5)',             values: Array.from({ length: 10 }, () => sampleZipf(4, 1.5)) },
        { fn: 'sampleFromDistribution normal',  values: Array.from({ length: 6 }, () => sampleFromDistribution({ type: 'normal', mean: 100, stddev: 15 }).toFixed(1)) },
      ];
      setSamplerOutput(results);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="tab-layout">
      <div className="config-panel">
        <h3>Distributions <span className="badge-new">v1.2.0</span></h3>
        <p className="tab-desc">
          Add a <code>distribution</code> field to any <code>SchemaColumn</code> to
          control the statistical shape of generated values.
          Numeric and range columns are clamped to their declared bounds;
          enum columns use Zipf rank to select from the value list (making some
          values far more likely than others).
        </p>

        <FormRow label="Schema (SchemaColumn[] JSON)" hint='Array of objects with optional "distribution" field'>
          <textarea value={schemaInput} rows={12} onChange={(e) => setSchemaInput(e.target.value)} />
        </FormRow>

        <FormRow label="Rows">
          <input type="number" value={rows} min={5} max={1000}
            onChange={(e) => setRows(e.target.value)} />
        </FormRow>

        <div className="button-group">
          <ActionButton onClick={generate}>Generate with Distributions</ActionButton>
          <ActionButton onClick={runSamplers} variant="secondary">Run Raw Samplers</ActionButton>
        </div>

        {samplerOutput && (
          <div className="inferred-results">
            <h4>Raw sampler results</h4>
            <table className="type-table">
              <thead><tr><th>Function</th><th>Samples</th></tr></thead>
              <tbody>
                {samplerOutput.map(r => (
                  <tr key={r.fn}>
                    <td><code>{r.fn}</code></td>
                    <td>{r.values.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="preview-panel">
        {output ? (
          <PreviewBox data={output} label={`${output.length} rows with statistical distributions`} />
        ) : (
          <div className="empty-state">
            <p>The schema above uses <code>distribution</code> on every column.</p>
            <p><strong>plan</strong> uses Zipf weighting: <em>free</em> will appear most often,
              <em>enterprise</em> least.</p>
            <p><strong>age</strong> uses a Normal distribution centred at 35.</p>
            <p>Click “Generate with Distributions” to see it in action.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 11 - Schema API (v1.2.0)
// Covers: columnStringToSchema, schemaToColumnString, generateData with schema:
// ---------------------------------------------------------------------------
function SchemaApiTab() {
  const DEFAULT_STR = 'id:autoIncrement,firstName,lastName,email,score:range:0-100,role:enum:admin|editor|viewer';
  const [columnString, setColumnString] = useState(DEFAULT_STR);
  const [schemaInput, setSchemaInput] = useState('');
  const [parsed, setParsed] = useState(null);
  const [roundTrip, setRoundTrip] = useState(null);
  const [rows, setRows] = useState(5);
  const [genOutput, setGenOutput] = useState(null);

  const parseToSchema = () => {
    try {
      const schema = columnStringToSchema(columnString);
      setParsed(schema);
      setSchemaInput(JSON.stringify(schema, null, 2));
      setRoundTrip(schemaToColumnString(schema));
      setGenOutput(null);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const generateFromSchema = () => {
    try {
      const schema = JSON.parse(schemaInput);
      // Add extra metadata (not expressible in string form) to demonstrate the power
      // of the schema-first API — e.g. mark id as primaryKey, email as nullable: false
      if (schema[0]?.name === 'id') schema[0].primaryKey = true;
      const emailCol = schema.find(c => c.type === 'email');
      if (emailCol) emailCol.nullable = false;

      const result = generateData({ schema, rows: Number(rows) });
      setGenOutput(result.records);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="tab-layout">
      <div className="config-panel">
        <h3>Schema API <span className="badge-new">v1.2.0</span></h3>
        <p className="tab-desc">
          <code>columnStringToSchema()</code> converts a column-definition string
          into a <code>SchemaColumn[]</code> array, unlocking richer metadata such
          as <code>primaryKey</code>, <code>nullable</code>, and <code>distribution</code>.
          <code>schemaToColumnString()</code> converts back (metadata is stripped).
          Pass <code>schema: SchemaColumn[]</code> directly to <code>generateData()</code>.
        </p>

        <FormRow label="Column definition string" hint="name:type,name:type,…">
          <input type="text" value={columnString}
            onChange={(e) => setColumnString(e.target.value)} />
        </FormRow>

        <ActionButton onClick={parseToSchema}>Parse to SchemaColumn[]</ActionButton>

        {parsed && (
          <>
            <div className="inferred-results">
              <h4>Round-trip: schemaToColumnString()</h4>
              <code className="columns-string">{roundTrip}</code>
            </div>

            <FormRow label="Editable SchemaColumn[] (add primaryKey, nullable, distribution…)" hint="Edit JSON, then click Generate">
              <textarea value={schemaInput} rows={10}
                onChange={(e) => setSchemaInput(e.target.value)} />
            </FormRow>

            <FormRow label="Rows">
              <input type="number" value={rows} min={1} max={500}
                onChange={(e) => setRows(e.target.value)} />
            </FormRow>

            <ActionButton onClick={generateFromSchema} variant="secondary">
              Generate with schema:
            </ActionButton>
          </>
        )}
      </div>

      <div className="preview-panel">
        {genOutput ? (
          <PreviewBox data={genOutput} label={`${genOutput.length} rows generated from SchemaColumn[]`} />
        ) : parsed ? (
          <div className="preview-box">
            <div className="preview-header">
              <span className="preview-label">Parsed SchemaColumn[] — {parsed.length} columns</span>
            </div>
            <pre className="data-preview">{JSON.stringify(parsed, null, 2)}</pre>
          </div>
        ) : (
          <div className="empty-state">
            <p>Enter a column string and click “Parse to SchemaColumn[]”.</p>
            <p>You can then enrich the JSON (add <code>primaryKey: true</code>,
              <code>nullable: false</code>, <code>distribution: &#123;…&#125;</code>) and
              generate data using the richer schema-first API.</p>
          </div>
        )}
      </div>
    </div>
  );
}
const TABS = [
  { id: 'basic',         label: '⚡ Basic Generator',        component: BasicGeneratorTab },
  { id: 'special',       label: '🔧 Special Types',           component: SpecialTypesTab },
  { id: 'plugin',        label: '🔌 Plugin API',             component: PluginApiTab },
  { id: 'factory',       label: '🏭 Factory API',           component: FactoryApiTab },
  { id: 'distributions', label: '📈 Distributions',          component: DistributionsTab },
  { id: 'schema-api',    label: '🧩 Schema API',             component: SchemaApiTab },
  { id: 'infer',         label: '🔍 Schema Inference',       component: SchemaInferenceTab },
  { id: 'openapi',       label: '📄 OpenAPI Bridge',         component: OpenApiBridgeTab },
  { id: 'graphql',       label: '◈ GraphQL Bridge',           component: GraphQLBridgeTab },
  { id: 'ddl',           label: '🗄️ DDL Multi-Table',       component: DdlMultiTableTab },
  { id: 'types',         label: '📚 Types & Templates',       component: TypesBrowserTab },
];

function App() {
  const [activeTab, setActiveTab] = useState('basic');
  const CurrentTab = TABS.find(t => t.id === activeTab)?.component ?? BasicGeneratorTab;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎲 Ficta — Test Data Generator</h1>
        <p>Universal browser-side fake data in 7 formats · Factory API · Distributions · Schema API · All features demonstrated</p>
      </header>

      <nav className="tab-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="tab-content">
        <CurrentTab />
      </main>

      <footer className="app-footer">
        <p>
          Built with{' '}
          <a href="https://github.com/izaccavalheiro/ficta" target="_blank" rel="noopener noreferrer">
            Ficta
          </a>{' '}
          — Universal test data generator · Node.js · Browser · CLI
        </p>
      </footer>
    </div>
  );
}

export default App;
