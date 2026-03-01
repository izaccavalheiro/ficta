/**
 * Data preview component.
 *
 * Renders the right-panel preview area with two sub-views:
 *   - Table view (first N rows as an HTML table)
 *   - Raw output view (formatted text: CSV, JSON, XML, etc.)
 *
 * Also renders the toolbar with stats (row count, generation time).
 *
 * @module playground/preview
 */
import { h } from 'preact';

const MAX_TABLE_ROWS = 10;
const MAX_RAW_CHARS = 50_000; // Truncate raw output in the view to avoid rendering too much

/**
 * @param {Object} props
 * @param {{ records: Object[], columns: Object[] } | null} props.data - Generated data
 * @param {string} props.raw - Formatted raw output string
 * @param {string} props.format - Current output format
 * @param {number} props.elapsedMs - Generation time in ms
 * @param {'table' | 'raw'} props.activeTab - Which tab is shown
 * @param {boolean} props.loading - Whether generation is in progress
 * @param {string | null} props.error - Error message (if any)
 * @param {Function} props.onTabChange
 * @param {Function} props.onDownload
 * @param {Function} props.onCopy
 */
export function Preview({
  data,
  raw,
  format,
  elapsedMs,
  activeTab,
  loading,
  error,
  onTabChange,
  onDownload,
  onCopy,
}) {
  const hasData = data && data.records && data.records.length > 0;
  const rowCount = data?.records?.length ?? 0;
  const colCount = data?.columns?.length ?? 0;

  return h('div', { class: 'preview-panel' },

    // Tabs
    h('div', { class: 'preview-tabs', role: 'tablist' },
      h('button', {
        class: `tab-btn ${activeTab === 'table' ? 'active' : ''}`,
        role: 'tab',
        'aria-selected': activeTab === 'table',
        'aria-controls': 'tab-table',
        onClick: () => onTabChange('table'),
      }, '⊞ Table'),
      h('button', {
        class: `tab-btn ${activeTab === 'raw' ? 'active' : ''}`,
        role: 'tab',
        'aria-selected': activeTab === 'raw',
        'aria-controls': 'tab-raw',
        onClick: () => onTabChange('raw'),
      }, '⌨ Raw'),
    ),

    // Toolbar
    h('div', { class: 'preview-toolbar' },
      h('div', { class: 'preview-stats', 'aria-live': 'polite' },
        hasData && h('span', null, h('strong', null, rowCount.toLocaleString()), ' rows'),
        hasData && h('span', null, h('strong', null, colCount), ' columns'),
        hasData && elapsedMs != null && h('span', null, 'in ', h('strong', null, `${elapsedMs}ms`)),
        loading && h('span', null, h('span', { class: 'spinner' })),
      ),
      hasData && h('button', {
        class: 'btn btn-ghost btn-sm',
        type: 'button',
        onClick: onCopy,
        title: 'Copy raw output to clipboard',
        'aria-label': 'Copy to clipboard',
      }, '⧉ Copy'),
      hasData && h('button', {
        class: 'btn btn-secondary btn-sm',
        type: 'button',
        onClick: onDownload,
        title: `Download as .${format}`,
        'aria-label': `Download as ${format}`,
      }, `⬇ Download .${format}`),
    ),

    // Content
    h('div', { class: 'preview-content', id: 'tab-content' },
      error && h('div', { style: 'padding:1rem;' },
        h('div', { class: 'error-banner', role: 'alert' }, '⚠ ', error),
      ),

      !error && !hasData && !loading && h('div', { class: 'empty-state', 'aria-live': 'polite' },
        h('div', { class: 'empty-icon' }, '📊'),
        h('p', null, 'Configure columns and click Generate to preview data.'),
      ),

      !error && hasData && activeTab === 'table' && h(TableView, {
        id: 'tab-table',
        records: data.records.slice(0, MAX_TABLE_ROWS),
        columns: data.columns,
        totalRows: rowCount,
      }),

      !error && hasData && activeTab === 'raw' && h(RawView, {
        id: 'tab-raw',
        raw,
        totalChars: raw?.length ?? 0,
      }),
    ),
  );
}

/**
 * Renders records as an HTML table.
 */
function TableView({ id, records, columns, totalRows }) {
  const colNames = columns.map(c => c.name || c);

  return h('div', { class: 'data-table-wrapper', id, role: 'tabpanel' },
    h('table', { class: 'data-table', 'aria-label': 'Generated data preview' },
      h('thead', null,
        h('tr', null,
          colNames.map(name => h('th', { key: name, scope: 'col' }, name)),
        ),
      ),
      h('tbody', null,
        records.map((row, i) =>
          h('tr', { key: i },
            colNames.map(name =>
              h('td', { key: name, title: String(row[name] ?? '') },
                formatCellValue(row[name]),
              )
            ),
          )
        ),
      ),
    ),
    totalRows > MAX_TABLE_ROWS && h('div', {
      style: 'padding:0.5rem 1rem; font-size:0.8rem; color:var(--color-text-muted); border-top:1px solid var(--color-border);',
    }, `Showing first ${MAX_TABLE_ROWS} of ${totalRows.toLocaleString()} rows. Download to see all.`),
  );
}

/**
 * Renders raw formatted output text.
 */
function RawView({ id, raw, totalChars }) {
  const truncated = totalChars > MAX_RAW_CHARS;
  const display = truncated ? raw.slice(0, MAX_RAW_CHARS) + '\n\n… (truncated — download to see full output)' : raw;

  return h('pre', { class: 'raw-output', id, role: 'tabpanel', 'aria-label': 'Raw formatted output' },
    display,
  );
}

/**
 * Format a cell value for display (truncate long strings, handle booleans/null).
 */
function formatCellValue(value) {
  if (value === null || value === undefined) return h('span', { style: 'color:var(--color-text-muted); font-style:italic;' }, 'null');
  if (typeof value === 'boolean') return h('span', { style: `color:${value ? 'var(--color-success)' : 'var(--color-error)'}` }, String(value));
  const str = String(value);
  if (str.length > 60) return str.slice(0, 57) + '…';
  return str;
}
