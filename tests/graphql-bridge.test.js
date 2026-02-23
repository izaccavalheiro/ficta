/**
 * Tests for src/graphql-bridge.js — GraphQL SDL → Ficta Schema Bridge
 */
import { describe, expect, test } from '@jest/globals';
import { fromGraphQLSDL, graphQLToFictaSchema } from '../src/graphql-bridge.js';

const sdl = `
  type User {
    id: ID!
    email: String!
    age: Int
    price: Float
    active: Boolean
    website: String
    name: String
    genericField: String
  }

  enum Status {
    ACTIVE
    INACTIVE
    PENDING
  }

  type Post {
    id: ID!
    title: String!
    status: Status
    tags: [String]
    authorId: Int
  }
`;

describe('fromGraphQLSDL', () => {
  test('maps ID to uuid (non-null)', () => {
    const cols = fromGraphQLSDL(sdl, { typeName: 'User' });
    const id = cols.find(c => c.name === 'id');
    expect(id.type).toBe('uuid');
    expect(id.nullable).toBe(false);
  });

  test('maps String to word', () => {
    const cols = fromGraphQLSDL(sdl, { typeName: 'User' });
    const genericField = cols.find(c => c.name === 'genericField');
    expect(genericField.type).toBe('word');
    expect(genericField.nullable).toBe(true);
  });

  test('maps Int to number', () => {
    const cols = fromGraphQLSDL(sdl, { typeName: 'User' });
    expect(cols.find(c => c.name === 'age').type).toBe('number');
  });

  test('maps Float to price', () => {
    const cols = fromGraphQLSDL(sdl, { typeName: 'User' });
    expect(cols.find(c => c.name === 'price').type).toBe('price');
  });

  test('maps Boolean to boolean', () => {
    const cols = fromGraphQLSDL(sdl, { typeName: 'User' });
    expect(cols.find(c => c.name === 'active').type).toBe('boolean');
  });

  test('non-null fields have nullable: false', () => {
    const cols = fromGraphQLSDL(sdl, { typeName: 'User' });
    expect(cols.find(c => c.name === 'email').nullable).toBe(false);
    expect(cols.find(c => c.name === 'id').nullable).toBe(false);
  });

  test('nullable fields have nullable: true', () => {
    const cols = fromGraphQLSDL(sdl, { typeName: 'User' });
    expect(cols.find(c => c.name === 'age').nullable).toBe(true);
    expect(cols.find(c => c.name === 'active').nullable).toBe(true);
  });

  test('resolves enum type to enum:VALUES', () => {
    const cols = fromGraphQLSDL(sdl, { typeName: 'Post' });
    const status = cols.find(c => c.name === 'status');
    expect(status.type).toBe('enum:ACTIVE|INACTIVE|PENDING');
  });

  test('skips list type fields', () => {
    const cols = fromGraphQLSDL(sdl, { typeName: 'Post' });
    expect(cols.find(c => c.name === 'tags')).toBeUndefined();
  });

  test('applies name-hint overrides (email trumps String)', () => {
    const cols = fromGraphQLSDL(sdl, { typeName: 'User' });
    expect(cols.find(c => c.name === 'email').type).toBe('email');
  });

  test('applies name-hint for name field', () => {
    const cols = fromGraphQLSDL(sdl, { typeName: 'User' });
    expect(cols.find(c => c.name === 'name').type).toBe('fullName');
  });

  test('defaults to first object type when typeName is omitted', () => {
    const cols = fromGraphQLSDL(sdl);
    // First type is User
    expect(cols.find(c => c.name === 'id')).toBeDefined();
    expect(cols.find(c => c.name === 'email')).toBeDefined();
  });

  test('returns empty array when typeName not found', () => {
    const cols = fromGraphQLSDL(sdl, { typeName: 'NonExistent' });
    expect(cols).toEqual([]);
  });

  test('throws for invalid SDL string', () => {
    expect(() => fromGraphQLSDL('not { valid graphql $$')).toThrow();
  });

  test('throws for empty string', () => {
    expect(() => fromGraphQLSDL('')).toThrow('fromGraphQLSDL: sdlString must be a non-empty string');
  });

  test('throws for non-string input', () => {
    expect(() => fromGraphQLSDL(null)).toThrow('fromGraphQLSDL: sdlString must be a non-empty string');
    expect(() => fromGraphQLSDL(42)).toThrow();
  });

  test('maps custom scalars: EmailAddress, URL, DateTime, Date', () => {
    const customSdl = `
      type Thing {
        contact: EmailAddress
        link: URL
        happenedAt: DateTime
        bornOn: Date
      }
    `;
    const cols = fromGraphQLSDL(customSdl, { typeName: 'Thing' });
    expect(cols.find(c => c.name === 'contact').type).toBe('email');
    expect(cols.find(c => c.name === 'link').type).toBe('url');
    expect(cols.find(c => c.name === 'happenedAt').type).toBe('timestamp');
    expect(cols.find(c => c.name === 'bornOn').type).toBe('timestamp');
  });

  test('returns word for unknown scalar types', () => {
    const unknownSdl = `
      type Foo {
        weirdField: SomeCustomScalar
      }
    `;
    const cols = fromGraphQLSDL(unknownSdl, { typeName: 'Foo' });
    expect(cols.find(c => c.name === 'weirdField').type).toBe('word');
  });

  test('applies name hints: firstName, lastName, phone, street, city, country, company, url, uuid', () => {
    const hintsSdl = `
      type Entity {
        firstName: String
        lastName: String
        phone: String
        street: String
        city: String
        country: String
        company: String
        homepage: String
        myUuid: String
        jobTitle: String
      }
    `;
    const cols = fromGraphQLSDL(hintsSdl, { typeName: 'Entity' });
    expect(cols.find(c => c.name === 'firstName').type).toBe('firstName');
    expect(cols.find(c => c.name === 'lastName').type).toBe('lastName');
    expect(cols.find(c => c.name === 'phone').type).toBe('phone');
    expect(cols.find(c => c.name === 'street').type).toBe('street');
    expect(cols.find(c => c.name === 'city').type).toBe('city');
    expect(cols.find(c => c.name === 'country').type).toBe('country');
    expect(cols.find(c => c.name === 'company').type).toBe('company');
    expect(cols.find(c => c.name === 'homepage').type).toBe('url');
    expect(cols.find(c => c.name === 'myUuid').type).toBe('uuid');
  });

  test('returns empty array when SDL has no object types', () => {
    const enumOnlySdl = `enum Color { RED GREEN BLUE }`;
    const cols = fromGraphQLSDL(enumOnlySdl, { typeName: 'Color' });
    expect(cols).toEqual([]);
  });
});

describe('graphQLToFictaSchema', () => {
  test('returns a ficta.schema.json structure with tables array', () => {
    const result = graphQLToFictaSchema(sdl);
    expect(result).toHaveProperty('tables');
    expect(Array.isArray(result.tables)).toBe(true);
  });

  test('creates one table per object type', () => {
    const result = graphQLToFictaSchema(sdl);
    const names = result.tables.map(t => t.name);
    expect(names).toContain('user');
    expect(names).toContain('post');
  });

  test('enum-only types are not included as tables', () => {
    const result = graphQLToFictaSchema(sdl);
    const names = result.tables.map(t => t.name);
    expect(names).not.toContain('status');
  });

  test('respects rows and dialect options', () => {
    const result = graphQLToFictaSchema(sdl, { rows: 25, dialect: 'mysql' });
    expect(result.defaultRows).toBe(25);
    expect(result.dialect).toBe('mysql');
    result.tables.forEach(t => expect(t.rows).toBe(25));
  });

  test('throws for invalid SDL', () => {
    expect(() => graphQLToFictaSchema('invalid $$')).toThrow();
  });

  test('throws for empty string', () => {
    expect(() => graphQLToFictaSchema('')).toThrow('graphQLToFictaSchema: sdlString must be a non-empty string');
  });

  test('Post table columns include resolved enum for status', () => {
    const result = graphQLToFictaSchema(sdl);
    const postTable = result.tables.find(t => t.name === 'post');
    const statusCol = postTable.columns.find(c => c.name === 'status');
    expect(statusCol.type).toBe('enum:ACTIVE|INACTIVE|PENDING');
  });

  test('list-type fields are excluded from columns', () => {
    const result = graphQLToFictaSchema(sdl);
    const postTable = result.tables.find(t => t.name === 'post');
    const tagsCol = postTable.columns.find(c => c.name === 'tags');
    expect(tagsCol).toBeUndefined();
  });

  test('object types with all list fields produce no tables', () => {
    const listOnlySdl = `
      type Container {
        items: [String]
        tags: [Int]
      }
    `;
    const result = graphQLToFictaSchema(listOnlySdl);
    expect(result.tables).toHaveLength(0);
  });

  // Coverage gap fixes
  test('fromGraphQLSDL typeName option not found returns empty array', () => {
    // Covers the `targetDef = null → return []` path when typeName does not match any type
    const result = fromGraphQLSDL(
      `type User { id: ID! }`,
      { typeName: 'NonExistentType' }
    );
    expect(result).toEqual([]);
  });

  test('graphQLToFictaSchema skips types where all fields are lists (columns.length === 0)', () => {
    // Covers the `if (columns.length > 0)` false branch in graphQLToFictaSchema
    const sdlWithListOnly = `
      type Wrapper {
        items: [String]
      }
      type User {
        id: ID!
        name: String
      }
    `;
    const result = graphQLToFictaSchema(sdlWithListOnly);
    // Wrapper should be excluded (all list fields), User should be included
    const names = result.tables.map(t => t.name);
    expect(names).not.toContain('wrapper');
    expect(names).toContain('user');
  });
});
