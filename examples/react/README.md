# Ficta React Example

A complete React application demonstrating how to use Ficta in a React environment with Vite.

## Features

- 🎨 Modern React UI with hooks
- 🔧 Configure columns, rows, and output format
- 📋 Use predefined templates or custom columns
- 👀 Live preview of generated data
- 💾 Download generated files
- ⚡ Fast development with Vite

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Usage

The application provides an intuitive interface to:

1. **Choose a template** or define custom columns
2. **Set number of rows** to generate
3. **Select output format** (CSV, JSON, XML, TSV, SQL, YAML)
4. **Generate data** with live preview
5. **Download** the generated file

## Code Structure

```
src/
├── App.jsx         # Main application component
├── App.css        # Application styles
├── main.jsx       # React entry point
└── index.css      # Global styles
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
