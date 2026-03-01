/**
 * Schema editor component.
 *
 * Renders the left-panel controls: column definitions textarea,
 * template selector, row-count slider, format selector, and
 * SQL dialect selector. Uses Preact JSX.
 *
 * @module playground/editor
 */
import { h } from 'preact';
import { useState } from 'preact/hooks';

const FORMATS = [
  'csv', 'json', 'xml', 'tsv', 'sql', 'yaml', 'toml',
];

const SQL_DIALECTS = ['postgres', 'mysql', 'sqlite', 'generic'];

// Template names — read from window.Ficta at render time
function getTemplates() {
  try {
    return Object.keys(window.Ficta?.templates || {});
  } catch {
    return [];
  }
}

// Type suggestions for a lightweight autocomplete hint
const TYPE_EXAMPLES = [
  'autoIncrement', 'uuid', 'fullName', 'firstName', 'lastName',
  'email', 'phone', 'company', 'jobTitle', 'street', 'city',
  'state', 'zipCode', 'country', 'latitude', 'longitude',
  'url', 'username', 'password', 'color', 'product', 'price',
  'number', 'boolean', 'word', 'sentence', 'paragraph',
  'pastDate', 'futureDate', 'timestamp', 'ip', 'mac',
  'enum:value1|value2|value3', 'range:1-100', 'pattern:{COUNTER}-test',
];

/**
 * @param {Object} props
 * @param {string} props.columns - Current column definitions string
 * @param {string} props.template - Selected template name (empty = none)
 * @param {number} props.rows - Row count
 * @param {string} props.format - Output format
 * @param {string} props.dialect - SQL dialect
 * @param {boolean} props.loading - Whether generation is in progress
 * @param {Function} props.onColumnsChange
 * @param {Function} props.onTemplateChange
 * @param {Function} props.onRowsChange
 * @param {Function} props.onFormatChange
 * @param {Function} props.onDialectChange
 * @param {Function} props.onGenerate
 */
export function Editor({
  columns,
  template,
  rows,
  format,
  dialect,
  loading,
  onColumnsChange,
  onTemplateChange,
  onRowsChange,
  onFormatChange,
  onDialectChange,
  onGenerate,
}) {
  const [showTypes, setShowTypes] = useState(false);
  const templates = getTemplates();

  function handleTemplateChange(e) {
    const t = e.target.value;
    onTemplateChange(t);
    if (t && window.Ficta?.templates?.[t]) {
      const tmpl = window.Ficta.templates[t];
      const cols = typeof tmpl === 'string' ? tmpl : (tmpl.columns || '');
      onColumnsChange(cols);
    }
  }

  return h('div', { class: 'editor' },
    // Columns textarea
    h('div', { class: 'form-group' },
      h('label', { for: 'columns-input' }, 'Column Definitions'),
      h('textarea', {
        id: 'columns-input',
        value: columns,
        rows: 4,
        placeholder: 'id:autoIncrement,name:fullName,email',
        'aria-label': 'Column definitions',
        onInput: (e) => onColumnsChange(e.target.value),
      }),
      h('div', { style: 'display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.25rem;' },
        h('button', {
          class: 'btn btn-ghost btn-sm',
          type: 'button',
          onClick: () => setShowTypes(!showTypes),
          'aria-expanded': showTypes,
          'aria-controls': 'type-list',
          title: 'Show available types',
        }, showTypes ? '▲ Hide types' : '▾ Show types'),
      ),
      showTypes && h('div', {
        id: 'type-list',
        style: 'display:flex; flex-wrap:wrap; gap:0.25rem; margin-top:0.375rem;',
      },
        TYPE_EXAMPLES.map(t =>
          h('button', {
            key: t,
            class: 'btn btn-ghost btn-sm',
            type: 'button',
            style: 'font-size:0.7rem; padding:0.2rem 0.4rem;',
            title: `Append :${t}`,
            onClick: () => {
              const trimmed = columns.trim();
              const sep = trimmed ? ',' : '';
              onColumnsChange(trimmed + sep + 'field:' + t);
            },
          }, t)
        ),
      ),
    ),

    h('hr', { class: 'divider' }),

    // Template selector
    h('div', { class: 'form-group' },
      h('label', { for: 'template-select' }, 'Template'),
      h('select', {
        id: 'template-select',
        value: template,
        onChange: handleTemplateChange,
        'aria-label': 'Select template',
      },
        h('option', { value: '' }, '-- None --'),
        templates.map(t => h('option', { key: t, value: t }, t)),
      ),
    ),

    h('hr', { class: 'divider' }),

    // Format selector
    h('div', { class: 'form-group' },
      h('label', { for: 'format-select' }, 'Output Format'),
      h('select', {
        id: 'format-select',
        value: format,
        onChange: (e) => onFormatChange(e.target.value),
        'aria-label': 'Select output format',
      },
        FORMATS.map(f => h('option', { key: f, value: f }, f.toUpperCase())),
      ),
    ),

    // SQL dialect (only when format === 'sql')
    format === 'sql' && h('div', { class: 'form-group' },
      h('label', { for: 'dialect-select' }, 'SQL Dialect'),
      h('select', {
        id: 'dialect-select',
        value: dialect,
        onChange: (e) => onDialectChange(e.target.value),
        'aria-label': 'Select SQL dialect',
      },
        SQL_DIALECTS.map(d => h('option', { key: d, value: d }, d)),
      ),
    ),

    h('hr', { class: 'divider' }),

    // Row count
    h('div', { class: 'form-group' },
      h('label', { for: 'rows-slider' }, 'Rows'),
      h('div', { class: 'row-count-display' },
        h('input', {
          id: 'rows-slider',
          type: 'range',
          min: 1,
          max: 10000,
          value: rows,
          step: 1,
          'aria-label': `Row count: ${rows}`,
          onInput: (e) => onRowsChange(Number(e.target.value)),
          style: 'flex:1',
        }),
        h('input', {
          type: 'number',
          min: 1,
          max: 10000,
          value: rows,
          class: 'row-count-value',
          style: 'width:70px; flex-shrink:0;',
          'aria-label': 'Row count',
          onInput: (e) => {
            const n = Math.min(10000, Math.max(1, Number(e.target.value) || 1));
            onRowsChange(n);
          },
        }),
      ),
    ),

    h('hr', { class: 'divider' }),

    // Generate button
    h('button', {
      class: 'btn btn-primary btn-full',
      type: 'button',
      onClick: onGenerate,
      disabled: loading || !columns.trim(),
      'aria-busy': loading,
    },
      loading
        ? h('span', null, h('span', { class: 'spinner' }), ' Generating…')
        : h('span', null, '▶ Generate'),
    ),
  );
}
