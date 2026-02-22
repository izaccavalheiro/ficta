# CONTRIBUTING.md

# Contributing to Ficta

Thank you for your interest in contributing! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [AI-Assisted Development](#ai-assisted-development)

---

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git

### Fork and Clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/YOUR_USERNAME/ficta.git
cd ficta
npm install
```

---

## Development Setup

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
npm test
npm run test:coverage  # With coverage report
```

### Build Browser Bundles

```bash
npm run build
```

### Project Structure

```
ficta/
├── src/                     # Source code
│   ├── core.js              # Universal core (no Node/browser deps)
│   ├── formatters.js        # Node.js formatters
│   ├── formatters.browser.js # Browser formatters
│   ├── node.js              # Node.js adapter + generateFromDDL()
│   ├── browser.js           # Browser adapter
│   ├── sql-schema.js        # SQL DDL/DML generator (universal)
│   ├── ddl-parser.js        # SQL DDL → TableDef parser (universal, pure)
│   └── schema-generator.js  # Multi-table FK-aware orchestrator (universal)
├── cli.js                   # CLI interface
├── tests/                   # Test suite (596 tests, 100% coverage)
├── examples/                # Usage examples
└── dist/                    # Built browser bundles
```

---

## Project Architecture

### Core Principles

1. **Universal Core**: `src/core.js` has ZERO Node.js or browser-specific code
2. **Pure Functions**: Core logic is functional and side-effect free
3. **Environment Adapters**: Platform-specific code in `node.js` and `browser.js`
4. **ES Modules**: All code uses ES6 import/export
5. **100% Test Coverage**: All new code must be tested
6. **SQL Schema Stack**: `ddl-parser.js` → `schema-generator.js` → `sql-schema.js` are universal and dependency-injected

### Read More

- [ARCHITECTURE.md](ARCHITECTURE.md) - Detailed architecture
- [AI_CONTEXT.md](AI_CONTEXT.md) - Quick overview
- [AGENTS.md](AGENTS.md) - Development guide

---

## Making Changes

### Types of Contributions

We welcome:
- 🐛 Bug fixes
- ✨ New features (data types, formats, templates)
- 📝 Documentation improvements
- ⚡ Performance optimizations
- 🧪 Test improvements

### Branch Naming

```
feature/add-yaml-format
fix/csv-escaping-newlines
docs/improve-readme
perf/optimize-large-datasets
```

### Common Tasks

#### Add New Data Type

1. Edit `src/core.js`
2. Add to `fakerTypes` object:
   ```javascript
   myType: () => getFaker().category.method()
   ```
3. Add test in `tests/core.test.js`
4. Run tests: `npm test`

#### Add New Template

1. Edit `src/core.js`
2. Add to `templates` object:
   ```javascript
   myTemplate: "id:autoIncrement,field1:type1,field2:type2"
   ```
3. Add test in `tests/core.test.js`
4. Update README.md

#### Add New Output Format

1. Add formatter in `src/formatters.js`
2. Add browser version in `src/formatters.browser.js`
3. Update `src/node.js` switch statement
4. Update `src/browser.js` switch statement
5. Add format to `cli.js` choices
6. Add tests in `tests/formatters.test.js`
7. Update README.md

#### Add SQL Column Type Mapping (new dialect or type)

1. Edit `src/sql-schema.js`
2. Add entry to `sqlTypeMap` for each relevant dialect:
   ```javascript
   myType: { postgres: 'TEXT', mysql: 'VARCHAR(255)', sqlite: 'TEXT', generic: 'VARCHAR(255)' }
   ```
3. Add test in `tests/sql-schema.test.js`
4. Run tests: `npm test`

#### Generate Data from a SQL DDL Schema

See [AI_WORKFLOWS.md — Workflow 11](AI_WORKFLOWS.md) for the full step-by-step guide.

Short version:
```javascript
import { generateFromDDL } from './src/node.js';
const sql = await generateFromDDL({
  schemaFile: './schema.sql',
  rows: 20,
  outputMode: 'ddl+insert',
  dialect: 'postgres'
});
```

---

## Testing

### Test Philosophy

- **100% coverage required** — All new code paths must be tested
- **Test behavior, not implementation** - Tests should survive refactoring
- **Fast tests** - Keep tests quick for rapid iteration

### Running Tests

```bash
# All tests
npm test

# Specific file
npm test -- core.test.js

# DDL/SQL tests
npm test -- ddl-parser.test.js
npm test -- schema-generator.test.js
npm test -- sql-schema.test.js

# Watch mode
npm test -- --watch

# Coverage
npm run test:coverage
```

### Writing Tests

```javascript
import { functionName } from '../src/module.js';

describe('functionName', () => {
  test('should handle normal case', () => {
    const result = functionName(input);
    expect(result).toEqual(expected);
  });
  
  test('should throw error for invalid input', () => {
    expect(() => functionName(invalid)).toThrow('Expected error message');
  });
  
  test('should handle edge case', () => {
    const result = functionName(edgeCase);
    expect(result).toBeDefined();
  });
});
```

### Test Coverage

Check coverage report after running `npm run test:coverage`:
- Open `coverage/lcov-report/index.html` in browser
- Ensure all lines/branches/functions are covered

---

## Code Style

### General Guidelines

- **ES Modules only** - Use import/export, never require
- **Pure functions** - Avoid side effects in core logic
- **Descriptive names** - Clear variable and function names
- **JSDoc comments** - Document public functions
- **Options objects** - Use destructured parameters

### Code Examples

#### ✅ Good

```javascript
/**
 * Generate data rows
 * @param {Object} options - Generation options
 * @param {Array} options.columns - Column definitions
 * @param {number} [options.rows=100] - Number of rows
 * @returns {Array} Generated rows
 */
export function generateRows({ columns, rows = 100 }) {
  return columns.map((col, index) => ({
    ...col,
    value: generateValue(col, index)
  }));
}
```

#### ❌ Avoid

```javascript
// No JSDoc, positional params, not pure
function generateRows(columns, rows) {
  globalState.rows = rows; // Side effect!
  return columns.map(c => c);
}
```

### Error Handling

Always provide descriptive error messages:

```javascript
// ✅ Good
if (!templates[template]) {
  throw new Error(
    `Unknown template: ${template}. Available: ${Object.keys(templates).join(', ')}`
  );
}

// ❌ Avoid
if (!templates[template]) {
  throw new Error('Invalid template');
}
```

### CSV Escaping

Always properly escape CSV values:

```javascript
function escapeCSV(value) {
  if (typeof value === 'string' && 
      (value.includes(',') || value.includes('"') || value.includes('\n'))) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
```

---

## Commit Guidelines

### Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting)
- **refactor**: Code refactoring
- **test**: Test additions or changes
- **perf**: Performance improvements
- **chore**: Build process or auxiliary tool changes

### Examples

```
feat(core): add support for IPv6 data type

Add ipv6 type to fakerTypes for generating IPv6 addresses.

Closes #123

---

fix(formatters): properly escape newlines in CSV

CSV values containing newlines were not being properly escaped,
causing malformed output.

---

docs(readme): add YAML format example

---

test(core): add edge case tests for range type
```

---

## Pull Request Process

### Before Submitting

1. ✅ All tests pass: `npm test`
2. ✅ Coverage is 100%: `npm run test:coverage`
3. ✅ Code follows style guide
4. ✅ Commits are clean and meaningful
5. ✅ Documentation updated (if needed)
6. ✅ No console.log or debug code

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] All tests pass
- [ ] New tests added
- [ ] Coverage remains 100%

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. Submit PR with clear description
2. Automated tests will run
3. Maintainer will review code
4. Address feedback if requested
5. PR will be merged once approved

---

## AI-Assisted Development

This project has comprehensive AI integration support!

### AI Documentation

- **[AI_CONTEXT.md](AI_CONTEXT.md)** - Quick reference (start here!)
- **[AGENTS.md](AGENTS.md)** - Complete AI development guide
- **[AI_WORKFLOWS.md](AI_WORKFLOWS.md)** - Step-by-step task workflows
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** - GitHub Copilot instructions

### Using AI Assistants

When using AI assistants (GitHub Copilot, Cursor, etc.):

1. **Read AI_CONTEXT.md first** - Get quick project overview
2. **Follow patterns** - AI docs show established patterns
3. **Test thoroughly** - AI-generated code still needs testing
4. **Review carefully** - Ensure changes follow project principles

### AI Code Review Checklist

When reviewing AI-generated code:
- [ ] Uses ES Modules (import/export)
- [ ] No Node/browser code in `src/core.js`
- [ ] Pure functions where appropriate
- [ ] Descriptive error messages
- [ ] Has corresponding tests
- [ ] Follows existing patterns
- [ ] Properly documented (JSDoc)

---

## Questions?

- 💬 Open an issue for questions
- 📚 Check documentation files
- 💡 Look at existing code for patterns
- 🤖 Use AI docs for development guidance

---

## License

By contributing, you agree that your contributions will be licensed under the ISC License.

---

**Thank you for contributing!** 🎉
