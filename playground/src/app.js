/**
 * Ficta Playground — main application.
 *
 * Orchestrates the Editor and Preview components, handles state management,
 * URL-hash-based persistence (shareable links), generation, download, and
 * clipboard copy.
 *
 * Assumes `window.Ficta` is available (loaded from dist/ficta.browser.min.js).
 *
 * @module playground/app
 */
import { h, render } from 'preact';
import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { Editor } from './editor.js';
import { Preview } from './preview.js';
import { readStateFromHash, writeStateToHash, buildShareURL } from './share.js';

const DEFAULT_STATE = {
  columns: 'id:autoIncrement,firstName,lastName,email,phone,company',
  template: '',
  rows: 20,
  format: 'csv',
  dialect: 'postgres',
};

function App() {
  // ---- State ----
  const [columns, setColumns] = useState(DEFAULT_STATE.columns);
  const [template, setTemplate] = useState(DEFAULT_STATE.template);
  const [rows, setRows] = useState(DEFAULT_STATE.rows);
  const [format, setFormat] = useState(DEFAULT_STATE.format);
  const [dialect, setDialect] = useState(DEFAULT_STATE.dialect);

  const [data, setData] = useState(null);     // { records, columns }
  const [raw, setRaw] = useState('');          // formatted string
  const [elapsedMs, setElapsedMs] = useState(null);
  const [activeTab, setActiveTab] = useState('table');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);   // { message, type }
  const toastTimer = useRef(null);

  // ---- Load state from URL hash on mount ----
  useEffect(() => {
    const saved = readStateFromHash();
    if (saved) {
      if (saved.columns) setColumns(saved.columns);
      if (saved.template) setTemplate(saved.template);
      if (saved.rows) setRows(Number(saved.rows) || DEFAULT_STATE.rows);
      if (saved.format) setFormat(saved.format);
      if (saved.dialect) setDialect(saved.dialect);
    }
  }, []);

  // ---- Persist state to URL hash whenever values change ----
  useEffect(() => {
    writeStateToHash({ columns, template, rows, format, dialect });
  }, [columns, template, rows, format, dialect]);

  // ---- Toast helper ----
  function showToast(message, type = 'info') {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

  // ---- Generate ----
  const generate = useCallback(async () => {
    if (!columns.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const Ficta = window.Ficta;
      if (!Ficta) throw new Error('Ficta library not loaded. Please refresh the page.');

      const t0 = performance.now();

      // Generate records
      const result = Ficta.generateData({ columns: columns.trim(), rows });
      const { records, columns: cols } = result;

      // Format raw output
      let rawOutput = '';
      const fmtOptions = format === 'sql'
        ? { tableName: 'data_table', dialect }
        : {};

      switch (format) {
        case 'csv':   rawOutput = Ficta.toCSV(records, cols); break;
        case 'tsv':   rawOutput = Ficta.toTSV ? Ficta.toTSV(records, cols) : Ficta.toCSV(records, cols, { delimiter: '\t' }); break;
        case 'json':  rawOutput = Ficta.toJSON(records, true); break;
        case 'xml':   rawOutput = Ficta.toXML ? await Ficta.toXML(records) : JSON.stringify(records, null, 2); break;
        case 'sql':   rawOutput = Ficta.toSQL(records, cols, fmtOptions); break;
        case 'yaml':  rawOutput = Ficta.toYAML ? Ficta.toYAML(records) : JSON.stringify(records, null, 2); break;
        case 'toml':  rawOutput = Ficta.toTOML ? Ficta.toTOML(records) : JSON.stringify(records, null, 2); break;
        default:      rawOutput = Ficta.toCSV(records, cols);
      }

      const elapsed = Math.round(performance.now() - t0);

      setData({ records, columns: cols });
      setRaw(rawOutput);
      setElapsedMs(elapsed);
    } catch (err) {
      setError(err.message || String(err));
      setData(null);
      setRaw('');
    } finally {
      setLoading(false);
    }
  }, [columns, rows, format, dialect]);

  // Auto-generate on initial load
  useEffect(() => {
    generate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Download ----
  function handleDownload() {
    if (!raw) return;
    const Ficta = window.Ficta;
    if (Ficta?.downloadFile) {
      Ficta.downloadFile(raw, `ficta-data.${format}`, format);
    } else {
      // Fallback
      const blob = new Blob([raw], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficta-data.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  // ---- Copy to clipboard ----
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(raw);
      showToast('Copied to clipboard!', 'success');
    } catch {
      showToast('Copy failed — try selecting and copying manually.', 'error');
    }
  }

  // ---- Share link ----
  function handleShare() {
    const url = buildShareURL({ columns, template, rows, format, dialect });
    navigator.clipboard.writeText(url).then(
      () => showToast('Share link copied!', 'success'),
      () => {
        // Fallback: show in prompt
        window.prompt('Copy this shareable link:', url);
      }
    );
  }

  // ---- Render ----
  return h('div', { class: 'app' },

    // Header
    h('header', { role: 'banner' },
      h('a', { class: 'header-brand', href: '#', 'aria-label': 'Ficta Playground home' },
        h('span', { class: 'logo' }, 'ficta'),
        h('span', { class: 'logo-sub' }, 'playground'),
      ),
      h('div', { class: 'header-actions' },
        h('button', {
          class: 'btn btn-ghost btn-sm',
          type: 'button',
          onClick: handleShare,
          title: 'Copy shareable link',
          'aria-label': 'Share configuration',
        }, h('span', null, '🔗 Share')),
        h('a', {
          class: 'btn btn-ghost btn-sm',
          href: 'https://github.com/izaccavalheiro/ficta',
          target: '_blank',
          rel: 'noopener noreferrer',
          'aria-label': 'View Ficta on GitHub',
          title: 'GitHub',
        }, h('span', null, '⭐ GitHub')),
      ),
    ),

    // Main content
    h('main', { role: 'main' },
      // Left: Editor panel
      h('div', { class: 'editor-panel', role: 'complementary', 'aria-label': 'Schema editor' },
        h(Editor, {
          columns,
          template,
          rows,
          format,
          dialect,
          loading,
          onColumnsChange: setColumns,
          onTemplateChange: setTemplate,
          onRowsChange: setRows,
          onFormatChange: setFormat,
          onDialectChange: setDialect,
          onGenerate: generate,
        }),
      ),

      // Right: Preview panel
      h(Preview, {
        data,
        raw,
        format,
        elapsedMs,
        activeTab,
        loading,
        error,
        onTabChange: setActiveTab,
        onDownload: handleDownload,
        onCopy: handleCopy,
      }),
    ),

    // Footer
    h('footer', { role: 'contentinfo' },
      h('span', null, '© ', new Date().getFullYear(), ' Ficta — Universal test data generator'),
      h('a', {
        href: 'https://github.com/izaccavalheiro/ficta',
        target: '_blank',
        rel: 'noopener noreferrer',
        style: 'color:var(--color-primary); text-decoration:none;',
      }, 'View on GitHub'),
    ),

    // Toast notification
    toast && h('div', {
      class: `toast ${toast.type}`,
      role: 'status',
      'aria-live': 'polite',
    }, toast.message),
  );
}

// Mount the app
const root = document.getElementById('app');
if (root) {
  render(h(App, null), root);
}

// Export App for testing
export { App };
