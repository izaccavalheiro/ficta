# Ficta Node.js Examples

This folder contains examples of using Ficta in a Node.js environment.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the basic example:
```bash
npm start
```

3. Run the advanced example:
```bash
npm run advanced
```

## Examples Included

### basic-usage.js
Demonstrates:
- Generating data in CSV and JSON formats
- Using predefined templates
- Special types (enum, range, pattern)
- Saving data to files
- Listing available types and templates

### advanced-usage.js
Demonstrates:
- Generating data in all supported formats (CSV, JSON, XML, Excel, TSV, SQL, YAML, TOML)
- Complex column definitions
- Large datasets (1000+ rows)
- Custom format options (table names, sheet names, XML elements)

## Quick Start

```javascript
import { generateData, generateAndSave } from 'ficta';

// Generate CSV data
const csvData = await generateData({
  columns: 'id:autoIncrement,name:fullName,email',
  rows: 100,
  format: 'csv'
});

// Save to file
await generateAndSave({
  template: 'users',
  rows: 1000,
  output: 'users.json'
});
```

## Learn More

- [Main Documentation](../../README.md)
- [API Reference](../../AGENTS.md)
- [Architecture](../../ARCHITECTURE.md)
