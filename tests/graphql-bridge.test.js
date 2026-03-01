/**
 * Tests for src/graphql-bridge.js — GraphQL SDL → Ficta Schema Bridge
 */
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
  test('returns a Promise (async lazy-load)', async () => {
    const promise = fromGraphQLSDL(sdl, { typeName: 'User' });
    expect(promise instanceof Promise).toBe(true);
    await promise; // consume to avoid unhandled rejection
  });

  test('maps ID to uuid (non-null)', async () => {
    const cols = await fromGraphQLSDL(sdl, { typeName: 'User' });
    const id = cols.find(c => c.name === 'id');
    expect(id.type).toBe('uuid');
    expect(id.nullable).toBe(false);
  });

  test('maps String to word', async () => {
    const cols = await fromGraphQLSDL(sdl, { typeName: 'User' });
    const genericField = cols.find(c => c.name === 'genericField');
    expect(genericField.type).toBe('word');
    expect(genericField.nullable).toBe(true);
  });

  test('maps Int to number', async () => {
    const cols = await fromGraphQLSDL(sdl, { typeName: 'User' });
    expect(cols.find(c => c.name === 'age').type).toBe('number');
  });

  test('maps Float to price', async () => {
    const cols = await fromGraphQLSDL(sdl, { typeName: 'User' });
    expect(cols.find(c => c.name === 'price').type).toBe('price');
  });

  test('maps Boolean to boolean', async () => {
    const cols = await fromGraphQLSDL(sdl, { typeName: 'User' });
    expect(cols.find(c => c.name === 'active').type).toBe('boolean');
  });

  test('non-null fields have nullable: false', async () => {
    const cols = await fromGraphQLSDL(sdl, { typeName: 'User' });
    expect(cols.find(c => c.name === 'email').nullable).toBe(false);
    expect(cols.find(c => c.name === 'id').nullable).toBe(false);
  });

  test('nullable fields have nullable: true', async () => {
    const cols = await fromGraphQLSDL(sdl, { typeName: 'User' });
    expect(cols.find(c => c.name === 'age').nullable).toBe(true);
    expect(cols.find(c => c.name === 'active').nullable).toBe(true);
  });

  test('resolves enum type to enum:VALUES', async () => {
    const cols = await fromGraphQLSDL(sdl, { typeName: 'Post' });
    const status = cols.find(c => c.name === 'status');
    expect(status.type).toBe('enum:ACTIVE|INACTIVE|PENDING');
  });

  test('skips list type fields', async () => {
    const cols = await fromGraphQLSDL(sdl, { typeName: 'Post' });
    expect(cols.find(c => c.name === 'tags')).toBeUndefined();
  });

  test('applies name-hint overrides (email trumps String)', async () => {
    const cols = await fromGraphQLSDL(sdl, { typeName: 'User' });
    expect(cols.find(c => c.name === 'email').type).toBe('email');
  });

  test('applies name-hint for name field', async () => {
    const cols = await fromGraphQLSDL(sdl, { typeName: 'User' });
    expect(cols.find(c => c.name === 'name').type).toBe('fullName');
  });

  test('defaults to first object type when typeName is omitted', async () => {
    const cols = await fromGraphQLSDL(sdl);
    // First type is User
    expect(cols.find(c => c.name === 'id')).toBeDefined();
    expect(cols.find(c => c.name === 'email')).toBeDefined();
  });

  test('returns empty array when typeName not found', async () => {
    const cols = await fromGraphQLSDL(sdl, { typeName: 'NonExistent' });
    expect(cols).toEqual([]);
  });

  test('throws for invalid SDL string', async () => {
    await expect(fromGraphQLSDL('not { valid graphql $$')).rejects.toThrow();
  });

  test('throws for empty string', async () => {
    await expect(fromGraphQLSDL('')).rejects.toThrow('fromGraphQLSDL: sdlString must be a non-empty string');
  });

  test('throws for non-string input', async () => {
    await expect(fromGraphQLSDL(null)).rejects.toThrow('fromGraphQLSDL: sdlString must be a non-empty string');
    await expect(fromGraphQLSDL(42)).rejects.toThrow();
  });

  test('maps custom scalars: EmailAddress, URL, DateTime, Date', async () => {
    const customSdl = `
      type Thing {
        contact: EmailAddress
        link: URL
        happenedAt: DateTime
        bornOn: Date
      }
    `;
    const cols = await fromGraphQLSDL(customSdl, { typeName: 'Thing' });
    expect(cols.find(c => c.name === 'contact').type).toBe('email');
    expect(cols.find(c => c.name === 'link').type).toBe('url');
    expect(cols.find(c => c.name === 'happenedAt').type).toBe('timestamp');
    expect(cols.find(c => c.name === 'bornOn').type).toBe('timestamp');
  });

  test('returns word for unknown scalar types', async () => {
    const unknownSdl = `
      type Foo {
        weirdField: SomeCustomScalar
      }
    `;
    const cols = await fromGraphQLSDL(unknownSdl, { typeName: 'Foo' });
    expect(cols.find(c => c.name === 'weirdField').type).toBe('word');
  });

  test('applies name hints: firstName, lastName, phone, street, city, country, company, url, uuid', async () => {
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
    const cols = await fromGraphQLSDL(hintsSdl, { typeName: 'Entity' });
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

  test('returns empty array when SDL has no object types', async () => {
    const enumOnlySdl = `enum Color { RED GREEN BLUE }`;
    const cols = await fromGraphQLSDL(enumOnlySdl, { typeName: 'Color' });
    expect(cols).toEqual([]);
  });
});

describe('graphQLToFictaSchema', () => {
  test('returns a Promise (async lazy-load)', async () => {
    const promise = graphQLToFictaSchema(sdl);
    expect(promise instanceof Promise).toBe(true);
    await promise; // consume to avoid unhandled rejection
  });

  test('returns a ficta.schema.json structure with tables array', async () => {
    const result = await graphQLToFictaSchema(sdl);
    expect(result).toHaveProperty('tables');
    expect(Array.isArray(result.tables)).toBe(true);
  });

  test('creates one table per object type', async () => {
    const result = await graphQLToFictaSchema(sdl);
    const names = result.tables.map(t => t.name);
    expect(names).toContain('user');
    expect(names).toContain('post');
  });

  test('enum-only types are not included as tables', async () => {
    const result = await graphQLToFictaSchema(sdl);
    const names = result.tables.map(t => t.name);
    expect(names).not.toContain('status');
  });

  test('respects rows and dialect options', async () => {
    const result = await graphQLToFictaSchema(sdl, { rows: 25, dialect: 'mysql' });
    expect(result.defaultRows).toBe(25);
    expect(result.dialect).toBe('mysql');
    result.tables.forEach(t => expect(t.rows).toBe(25));
  });

  test('throws for invalid SDL', async () => {
    await expect(graphQLToFictaSchema('invalid $$')).rejects.toThrow();
  });

  test('throws for empty string', async () => {
    await expect(graphQLToFictaSchema('')).rejects.toThrow('graphQLToFictaSchema: sdlString must be a non-empty string');
  });

  test('Post table columns include resolved enum for status', async () => {
    const result = await graphQLToFictaSchema(sdl);
    const postTable = result.tables.find(t => t.name === 'post');
    const statusCol = postTable.columns.find(c => c.name === 'status');
    expect(statusCol.type).toBe('enum:ACTIVE|INACTIVE|PENDING');
  });

  test('list-type fields are excluded from columns', async () => {
    const result = await graphQLToFictaSchema(sdl);
    const postTable = result.tables.find(t => t.name === 'post');
    const tagsCol = postTable.columns.find(c => c.name === 'tags');
    expect(tagsCol).toBeUndefined();
  });

  test('object types with all list fields produce no tables', async () => {
    const listOnlySdl = `
      type Container {
        items: [String]
        tags: [Int]
      }
    `;
    const result = await graphQLToFictaSchema(listOnlySdl);
    expect(result.tables).toHaveLength(0);
  });

  // Coverage gap fixes
  test('fromGraphQLSDL typeName option not found returns empty array', async () => {
    // Covers the `targetDef = null → return []` path when typeName does not match any type
    const result = await fromGraphQLSDL(
      `type User { id: ID! }`,
      { typeName: 'NonExistentType' }
    );
    expect(result).toEqual([]);
  });

  test('graphQLToFictaSchema skips types where all fields are lists (columns.length === 0)', async () => {
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
    const result = await graphQLToFictaSchema(sdlWithListOnly);
    // Wrapper should be excluded (all list fields), User should be included
    const names = result.tables.map(t => t.name);
    expect(names).not.toContain('wrapper');
    expect(names).toContain('user');
  });
});


