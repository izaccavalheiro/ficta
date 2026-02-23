/**
 * Tests for src/openapi-bridge.js — OpenAPI → Ficta Schema Bridge
 */
import { describe, expect, test } from '@jest/globals';
import { fromOpenAPISchema, openAPIToFictaSchema } from '../src/openapi-bridge.js';

// Minimal OpenAPI 3.x fixture
const doc = {
  openapi: '3.0.0',
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          age: { type: 'integer' },
          balance: { type: 'number' },
          active: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          website: { type: 'string', format: 'uri' },
          hostname: { type: 'string', format: 'hostname' },
          ip: { type: 'string', format: 'ipv4' },
          passwd: { type: 'string', format: 'password' },
          birthDate: { type: 'string', format: 'date' },
          nickname: { type: 'string' },
        }
      },
      Product: {
        type: 'object',
        properties: {
          sku: { type: 'string' },
          qty: { type: 'integer' },
          price: { type: 'number' },
        }
      }
    }
  }
};

describe('fromOpenAPISchema', () => {
  test('maps id uuid, email, integer, number, boolean, date-time correctly', () => {
    const cols = fromOpenAPISchema(doc, { schemaName: 'User' });
    expect(cols.find(c => c.name === 'id').type).toBe('uuid');
    expect(cols.find(c => c.name === 'email').type).toBe('email');
    expect(cols.find(c => c.name === 'age').type).toBe('number');
    expect(cols.find(c => c.name === 'balance').type).toBe('price');
    expect(cols.find(c => c.name === 'active').type).toBe('boolean');
    expect(cols.find(c => c.name === 'createdAt').type).toBe('timestamp');
  });

  test('maps uri/url, hostname, ipv4, password, date formats', () => {
    const cols = fromOpenAPISchema(doc, { schemaName: 'User' });
    expect(cols.find(c => c.name === 'website').type).toBe('url');
    expect(cols.find(c => c.name === 'hostname').type).toBe('domainName');
    expect(cols.find(c => c.name === 'ip').type).toBe('ip');
    expect(cols.find(c => c.name === 'passwd').type).toBe('password');
    expect(cols.find(c => c.name === 'birthDate').type).toBe('date');
  });

  test('maps unknown format string → word', () => {
    const cols = fromOpenAPISchema(doc, { schemaName: 'User' });
    expect(cols.find(c => c.name === 'nickname').type).toBe('word');
  });

  test('returns array with correct names', () => {
    const cols = fromOpenAPISchema(doc, { schemaName: 'User' });
    const names = cols.map(c => c.name);
    expect(names).toContain('id');
    expect(names).toContain('email');
    expect(names).toContain('age');
  });

  test('defaults to first schema when schemaName is omitted', () => {
    const cols = fromOpenAPISchema(doc);
    // First schema is User
    expect(cols.find(c => c.name === 'email').type).toBe('email');
  });

  test('returns empty array for unknown schemaName', () => {
    const cols = fromOpenAPISchema(doc, { schemaName: 'NonExistent' });
    expect(cols).toEqual([]);
  });

  test('handles enum property', () => {
    const enumDoc = {
      components: {
        schemas: {
          Status: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['active', 'inactive'] }
            }
          }
        }
      }
    };
    const cols = fromOpenAPISchema(enumDoc, { schemaName: 'Status' });
    expect(cols.find(c => c.name === 'status').type).toBe('enum:active|inactive');
  });

  test('skips array type properties', () => {
    const arrDoc = {
      components: {
        schemas: {
          Blog: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
            }
          }
        }
      }
    };
    const cols = fromOpenAPISchema(arrDoc, { schemaName: 'Blog' });
    expect(cols.find(c => c.name === 'tags')).toBeUndefined();
    expect(cols.find(c => c.name === 'title')).toBeDefined();
  });

  test('skips nested object type properties', () => {
    const objDoc = {
      components: {
        schemas: {
          Entity: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              address: { type: 'object', properties: {} },
            }
          }
        }
      }
    };
    const cols = fromOpenAPISchema(objDoc, { schemaName: 'Entity' });
    expect(cols.find(c => c.name === 'address')).toBeUndefined();
    expect(cols.find(c => c.name === 'name')).toBeDefined();
  });

  test('resolves $ref one level deep', () => {
    const refDoc = {
      components: {
        schemas: {
          Address: {
            type: 'object',
            properties: {
              street: { type: 'string' }
            }
          },
          User: {
            type: 'object',
            properties: {
              addr: { $ref: '#/components/schemas/Address' },
              name: { type: 'string' }
            }
          }
        }
      }
    };
    // addr resolves to an object → should be skipped
    const cols = fromOpenAPISchema(refDoc, { schemaName: 'User' });
    expect(cols.find(c => c.name === 'addr')).toBeUndefined();
    expect(cols.find(c => c.name === 'name')).toBeDefined();
  });

  test('flags unresolvable $ref as word', () => {
    const refDoc = {
      components: {
        schemas: {
          Foo: {
            type: 'object',
            properties: {
              bar: { $ref: '#/components/schemas/Missing' }
            }
          }
        }
      }
    };
    const cols = fromOpenAPISchema(refDoc, { schemaName: 'Foo' });
    expect(cols.find(c => c.name === 'bar').type).toBe('word');
  });

  test('handles standalone JSON Schema (root properties)', () => {
    const jsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        count: { type: 'integer' },
      }
    };
    const cols = fromOpenAPISchema(jsonSchema);
    expect(cols.find(c => c.name === 'name').type).toBe('word');
    expect(cols.find(c => c.name === 'count').type).toBe('number');
  });

  test('returns empty array for null / non-object input', () => {
    expect(fromOpenAPISchema(null)).toEqual([]);
    expect(fromOpenAPISchema(undefined)).toEqual([]);
    expect(fromOpenAPISchema('string')).toEqual([]);
  });

  test('returns empty array when document has no schemas and no properties', () => {
    expect(fromOpenAPISchema({})).toEqual([]);
    expect(fromOpenAPISchema({ openapi: '3.0.0' })).toEqual([]);
  });

  test('returns empty array when components.schemas is empty', () => {
    expect(fromOpenAPISchema({ components: { schemas: {} } })).toEqual([]);
  });

  test('handles null property value gracefully', () => {
    const d = {
      components: {
        schemas: {
          X: { type: 'object', properties: { f: null } }
        }
      }
    };
    const cols = fromOpenAPISchema(d, { schemaName: 'X' });
    expect(cols.find(c => c.name === 'f').type).toBe('word');
  });
});

describe('openAPIToFictaSchema', () => {
  test('returns a ficta.schema.json structure with tables key', () => {
    const result = openAPIToFictaSchema(doc);
    expect(result).toHaveProperty('tables');
    expect(Array.isArray(result.tables)).toBe(true);
  });

  test('includes one table per schema component', () => {
    const result = openAPIToFictaSchema(doc);
    expect(result.tables.length).toBe(2);
    const names = result.tables.map(t => t.name);
    expect(names).toContain('user');
    expect(names).toContain('product');
  });

  test('respects rows and dialect options', () => {
    const result = openAPIToFictaSchema(doc, { rows: 50, dialect: 'mysql' });
    expect(result.defaultRows).toBe(50);
    expect(result.dialect).toBe('mysql');
    expect(result.tables[0].rows).toBe(50);
  });

  test('empty components.schemas returns empty tables array', () => {
    const result = openAPIToFictaSchema({ components: { schemas: {} } });
    expect(result.tables).toEqual([]);
  });

  test('handles missing components gracefully', () => {
    const result = openAPIToFictaSchema({});
    expect(result.tables).toEqual([]);
  });

  test('skips schemas whose properties produce only skipped columns', () => {
    const arrOnlyDoc = {
      components: {
        schemas: {
          Tags: {
            type: 'object',
            properties: {
              items: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    };
    const result = openAPIToFictaSchema(arrOnlyDoc);
    // All properties skipped → no table for Tags
    expect(result.tables).toHaveLength(0);
  });

  // Coverage gap fixes
  test('format: url (direct, not uri fallthrough) maps to url type', () => {
    // Covers the explicit `case 'url':` branch (line 49)
    const columns = fromOpenAPISchema({
      type: 'object',
      properties: {
        link: { type: 'string', format: 'url' }
      }
    });
    expect(columns.find(c => c.name === 'link').type).toBe('url');
  });

  test('property with unknown/null type falls back to word', () => {
    // Covers the final `return \'word\'` fallback (line 70) for non-string/int/num/bool types
    const columns = fromOpenAPISchema({
      type: 'object',
      properties: {
        meta: { type: 'null' },
        custom: { type: 'unknown-type' }
      }
    });
    // Both unknown types should map to 'word'
    expect(columns.find(c => c.name === 'meta').type).toBe('word');
    expect(columns.find(c => c.name === 'custom').type).toBe('word');
  });

  // ---------------------------------------------------------------------------
  // Coverage gap fixes
  // ---------------------------------------------------------------------------

  test('uuid format on non-id-named field hits switch case "uuid" (not name hint)', () => {
    // The name hint regex /^(id|_id|uuid)$/ does NOT match 'token', so the
    // code falls through to the switch statement, hitting case 'uuid': return 'uuid'
    const columns = fromOpenAPISchema({
      type: 'object',
      properties: {
        token: { type: 'string', format: 'uuid' },
      }
    });
    expect(columns.find(c => c.name === 'token').type).toBe('uuid');
  });

  test('external / non-hash $ref returns null from resolveRef → prop becomes word', () => {
    // resolveRef: branch 0 of line 86 (ref doesn't start with '#/') → returns null
    // Then line 149: prop = null || { type: 'string' } → 'word'
    const d = {
      type: 'object',
      properties: {
        data: { $ref: 'http://external.example.com/schemas/Something' }
      }
    };
    const cols = fromOpenAPISchema(d);
    expect(cols.find(c => c.name === 'data').type).toBe('word');
  });

  test('$ref with intermediate non-object path triggers null guard in resolveRef', () => {
    // resolveRef: line 91 branch — intermediate node is a non-object (number)
    // path: #/meta/count/child where meta.count = 5 (number → not an object)
    const d = {
      meta: { count: 5 },
      components: {
        schemas: {
          Foo: {
            type: 'object',
            properties: {
              bar: { $ref: '#/meta/count/child' }
            }
          }
        }
      }
    };
    const cols = fromOpenAPISchema(d, { schemaName: 'Foo' });
    // Unresolvable → falls back to word
    expect(cols.find(c => c.name === 'bar').type).toBe('word');
  });

  test('schema object with no properties field uses empty fallback (properties || {})', () => {
    // line 141: schemaObj.properties || {} — the || {} branch when properties is absent
    const d = {
      components: {
        schemas: {
          Empty: { type: 'object' }  // no 'properties' key
        }
      }
    };
    const cols = fromOpenAPISchema(d, { schemaName: 'Empty' });
    // No properties → empty column list
    expect(cols).toEqual([]);
  });
});
