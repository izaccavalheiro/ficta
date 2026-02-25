# Ficta React Example

A complete React application demonstrating **every browser-safe Ficta feature** through 8
interactive tabs. Built with React 18 + Vite.

## Features

All features covered in a single app — no Node.js required for any of them:

| Tab | Feature | Ficta APIs |
|-----|---------|------------|
| ⚡ Basic Generator | 7 formats, templates, seed, locale, header options | `generateData`, `formatData`, `downloadFile`, `seedFaker`, `setLocale`, `listTemplates` |
| 🔧 Special Types | autoIncrement, enum, range, pattern, static | column syntax: `autoIncrement`, `enum:`, `range:`, `pattern:`, `static:` |
| 🔌 Plugin API | Custom types & templates at runtime | `registerType`, `unregisterType`, `registerTemplate`, `unregisterTemplate` |
| 🔍 Schema Inference | Infer types from existing data rows | `inferSchema` |
| 📄 OpenAPI Bridge | Convert OpenAPI 3.x JSON → Ficta schema | `fromOpenAPISchema`, `openAPIToFictaSchema` |
| ◈ GraphQL Bridge | Convert GraphQL SDL → Ficta schema | `fromGraphQLSDL`, `graphQLToFictaSchema` |
| 🗄️ DDL Multi-Table | Parse DDL, topological FK sort, generate SQL | `parseDDL`, `orderByDependencies`, `generateFromSchema` |
| 📚 Types & Templates | Browse all 40+ types and 5 built-in templates | `listTypes`, `listTemplates` |

## Setup

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production bundle
npm run preview   # preview production build
```

## Architecture

### Environment
- The Vite config aliases `ficta/browser` → `../../src/browser.js`, so this example
  always runs against the local source — no `npm link` needed.
- Faker is bundled inside the Ficta browser build; `setFaker(faker)` is still called
  explicitly in `App.jsx` to document the pattern.

### Key modules used (all pure / browser-safe)
| Module | Purpose |
|--------|---------|
| `src/core.js` | `generateData`, `formatData`, `seedFaker`, `setLocale`, plugin API |
| `src/formatters.browser.js` | CSV, JSON, XML, TSV, SQL, YAML, TOML output |
| `src/browser.js` | Entry point; re-exports everything below |
| `src/infer.js` | `inferSchema` |
| `src/openapi-bridge.js` | `fromOpenAPISchema`, `openAPIToFictaSchema` |
| `src/graphql-bridge.js` | `fromGraphQLSDL`, `graphQLToFictaSchema` |
| `src/ddl-parser.js` | `parseDDL`, `orderByDependencies` |
| `src/schema-generator.js` | `generateFromSchema`, `buildInsertStatements` |

## Code Structure

```
src/
├── App.jsx         # Main app — 8 tab components + root App
├── App.css         # All styles (tab nav, layout, form, preview, cards)
├── main.jsx        # React entry point
└── index.css       # Body / html reset
```

## Key Components

### Data Generation

```javascript
import { generateData, downloadFile } from 'ficta/browser';
import { faker } from '@faker-js/faker';

// Initialize Faker
window.faker = faker;

// Generate data
const data = await generateData({
  columns: 'id:autoIncrement,name:fullName,email',
  rows: 100,
  format: 'csv'
});

// Download file
downloadFile(data, 'output.csv', 'csv');
```

### Available Templates

The app automatically loads available templates:
- users
- products
- transactions
- addresses
- contacts

## Customization

You can customize the application by:

1. **Adding new templates** - Edit the template selection
2. **Styling** - Modify `App.css` and `index.css`
3. **Adding features** - Extend `App.jsx` with new functionality

## Technologies

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Ficta** - Test data generator
- **Faker.js** - Fake data generation

## Learn More

- [Ficta Documentation](../../README.md)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
