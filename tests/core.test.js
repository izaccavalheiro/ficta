import { jest } from '@jest/globals';
import {
  fakerTypes,
  templates,
  parseColumns,
  generateRow,
  generateData,
  setFaker
} from '../src/core.js';
import { toCSV as toCSVString } from '../src/formatters.js';
import { faker } from '@faker-js/faker';

// Set faker before running tests
setFaker(faker);

describe('Core Module', () => {
  describe('Browser environment detection', () => {
    test('should detect faker in browser window object', async () => {
      // Save original window value (if any)
      const originalWindow = global.window;
      
      try {
        // Mock browser environment with window.faker
        global.window = {
          faker: faker
        };
        
        // Clear module cache to force re-evaluation
        const modulePath = '../src/core.js';
        const cacheKey = Object.keys(jest.requireActual.cache || {}).find(key => key.includes('core.js'));
        
        // Dynamic import to trigger the browser detection code
        const coreModule = await import(`${modulePath}?t=${Date.now()}`);
        
        // Verify module loaded (this tests line 8-10 in core.js)
        expect(coreModule.fakerTypes).toBeDefined();
        expect(coreModule.generateData).toBeDefined();
        
        // Set faker for the new module instance
        coreModule.setFaker(faker);
        
        // Test that it works
        const result = coreModule.generateData({ columns: 'id:autoIncrement', rows: 1 });
        expect(result.records).toHaveLength(1);
      } finally {
        // Restore original state
        if (originalWindow === undefined) {
          delete global.window;
        } else {
          global.window = originalWindow;
        }
      }
    });
  });

  describe('fakerTypes', () => {
    test('should have all expected faker type categories', () => {
      // Person
      expect(fakerTypes.firstName).toBeDefined();
      expect(fakerTypes.lastName).toBeDefined();
      expect(fakerTypes.fullName).toBeDefined();
      expect(fakerTypes.jobTitle).toBeDefined();
      expect(fakerTypes.prefix).toBeDefined();
      expect(fakerTypes.suffix).toBeDefined();

      // Internet
      expect(fakerTypes.email).toBeDefined();
      expect(fakerTypes.username).toBeDefined();
      expect(fakerTypes.password).toBeDefined();
      expect(fakerTypes.url).toBeDefined();
      expect(fakerTypes.ipv4).toBeDefined();
      expect(fakerTypes.userAgent).toBeDefined();

      // Phone
      expect(fakerTypes.phone).toBeDefined();

      // Address
      expect(fakerTypes.street).toBeDefined();
      expect(fakerTypes.city).toBeDefined();
      expect(fakerTypes.state).toBeDefined();
      expect(fakerTypes.country).toBeDefined();
      expect(fakerTypes.zipCode).toBeDefined();
      expect(fakerTypes.latitude).toBeDefined();
      expect(fakerTypes.longitude).toBeDefined();

      // Company
      expect(fakerTypes.company).toBeDefined();
      expect(fakerTypes.department).toBeDefined();

      // Commerce
      expect(fakerTypes.product).toBeDefined();
      expect(fakerTypes.price).toBeDefined();
      expect(fakerTypes.productDescription).toBeDefined();

      // Finance
      expect(fakerTypes.amount).toBeDefined();
      expect(fakerTypes.accountNumber).toBeDefined();
      expect(fakerTypes.iban).toBeDefined();
      expect(fakerTypes.creditCardNumber).toBeDefined();
      expect(fakerTypes.currency).toBeDefined();

      // Date
      expect(fakerTypes.pastDate).toBeDefined();
      expect(fakerTypes.futureDate).toBeDefined();
      expect(fakerTypes.recentDate).toBeDefined();
      expect(fakerTypes.timestamp).toBeDefined();

      // Numbers
      expect(fakerTypes.number).toBeDefined();
      expect(fakerTypes.float).toBeDefined();

      // Text
      expect(fakerTypes.word).toBeDefined();
      expect(fakerTypes.words).toBeDefined();
      expect(fakerTypes.sentence).toBeDefined();
      expect(fakerTypes.paragraph).toBeDefined();

      // IDs
      expect(fakerTypes.uuid).toBeDefined();
      expect(fakerTypes.nanoid).toBeDefined();

      // Boolean
      expect(fakerTypes.boolean).toBeDefined();

      // Special
      expect(fakerTypes.color).toBeDefined();
      expect(fakerTypes.emoji).toBeDefined();
    });

    test('faker functions should return expected types', () => {
      expect(typeof fakerTypes.firstName()).toBe('string');
      expect(typeof fakerTypes.email()).toBe('string');
      expect(typeof fakerTypes.number()).toBe('number');
      expect(typeof fakerTypes.boolean()).toBe('boolean');
      expect(typeof fakerTypes.uuid()).toBe('string');
    });

    test('text type functions should work correctly', () => {
      expect(typeof fakerTypes.word()).toBe('string');
      expect(typeof fakerTypes.words()).toBe('string');
      expect(typeof fakerTypes.sentence()).toBe('string');
      expect(typeof fakerTypes.paragraph()).toBe('string');
      
      // Verify they return non-empty strings
      expect(fakerTypes.word().length).toBeGreaterThan(0);
      expect(fakerTypes.words().split(' ').length).toBeGreaterThan(1);
      expect(fakerTypes.sentence().length).toBeGreaterThan(0);
    });

    test('color and emoji types should work correctly', () => {
      expect(typeof fakerTypes.color()).toBe('string');
      expect(typeof fakerTypes.emoji()).toBe('string');
      
      expect(fakerTypes.color().length).toBeGreaterThan(0);
      expect(fakerTypes.emoji().length).toBeGreaterThan(0);
    });

    test('should handle special types correctly', () => {
      const num = fakerTypes.number();
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(10000);

      const float = fakerTypes.float();
      expect(float).toBeGreaterThanOrEqual(0);
      expect(float).toBeLessThan(100);

      const bool = fakerTypes.boolean();
      expect([true, false]).toContain(bool);
    });
  });

  describe('templates', () => {
    test('should have users template', () => {
      expect(templates.users).toBeDefined();
      expect(templates.users.columns).toContain('firstName');
      expect(templates.users.columns).toContain('email');
    });

    test('should have products template', () => {
      expect(templates.products).toBeDefined();
      expect(templates.products.columns).toContain('sku');
      expect(templates.products.columns).toContain('price');
    });

    test('should have transactions template', () => {
      expect(templates.transactions).toBeDefined();
      expect(templates.transactions.columns).toContain('amount');
    });

    test('should have addresses template', () => {
      expect(templates.addresses).toBeDefined();
      expect(templates.addresses.columns).toContain('street');
      expect(templates.addresses.columns).toContain('city');
    });

    test('should have contacts template', () => {
      expect(templates.contacts).toBeDefined();
      expect(templates.contacts.columns).toContain('email');
      expect(templates.contacts.columns).toContain('phone');
    });
  });

  describe('parseColumns', () => {
    test('should parse simple column names', () => {
      const result = parseColumns('firstName,lastName,email');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'firstName', type: 'word' });
      expect(result[1]).toEqual({ name: 'lastName', type: 'word' });
      expect(result[2]).toEqual({ name: 'email', type: 'word' });
    });

    test('should parse columns with explicit types', () => {
      const result = parseColumns('id:autoIncrement,name:fullName,age:number');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'id', type: 'autoIncrement' });
      expect(result[1]).toEqual({ name: 'name', type: 'fullName' });
      expect(result[2]).toEqual({ name: 'age', type: 'number' });
    });

    test('should parse static columns', () => {
      const result = parseColumns('status:static:active');
      expect(result[0]).toEqual({ 
        name: 'status', 
        type: 'static:active'
      });
    });

    test('should parse enum columns', () => {
      const result = parseColumns('status:enum:active|inactive|pending');
      expect(result[0]).toEqual({
        name: 'status',
        type: 'enum:active|inactive|pending'
      });
    });

    test('should parse range columns', () => {
      const result = parseColumns('age:range:18-65');
      expect(result[0]).toEqual({
        name: 'age',
        type: 'range:18-65'
      });
    });

    test('should parse pattern columns', () => {
      const result = parseColumns('email:pattern:user+{COUNTER}@test.com');
      expect(result[0]).toEqual({
        name: 'email',
        type: 'pattern:user+{COUNTER}@test.com'
      });
    });

    test('should handle mixed column types', () => {
      const result = parseColumns('id:autoIncrement,status:enum:on|off,age:range:1-100');
      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('autoIncrement');
      expect(result[1].type).toBe('enum:on|off');
      expect(result[2].type).toBe('range:1-100');
    });

    test('should handle whitespace', () => {
      const result = parseColumns(' firstName , lastName , email ');
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('firstName');
    });

    test('should handle empty string', () => {
      const result = parseColumns('');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('');
    });
  });

  describe('generateRow', () => {
    test('should generate row with basic types', () => {
      const columns = parseColumns('firstName,lastName,email');
      const row = generateRow(columns, 0);
      
      expect(row).toHaveProperty('firstName');
      expect(row).toHaveProperty('lastName');
      expect(row).toHaveProperty('email');
      expect(typeof row.firstName).toBe('string');
      expect(typeof row.lastName).toBe('string');
      expect(typeof row.email).toBe('string');
    });

    test('should handle autoIncrement', () => {
      const columns = parseColumns('id:autoIncrement');
      expect(generateRow(columns, 0).id).toBe(1);
      expect(generateRow(columns, 4).id).toBe(5);
      expect(generateRow(columns, 99).id).toBe(100);
    });

    test('should handle static values', () => {
      const columns = parseColumns('status:static:active');
      expect(generateRow(columns, 0).status).toBe('active');
      expect(generateRow(columns, 49).status).toBe('active');
    });

    test('should handle enum values', () => {
      const columns = parseColumns('status:enum:a|b|c');
      const row = generateRow(columns, 0);
      expect(['a', 'b', 'c']).toContain(row.status);
    });

    test('should handle range values', () => {
      const columns = parseColumns('age:range:18-65');
      const age = generateRow(columns, 0).age;
      expect(age).toBeGreaterThanOrEqual(18);
      expect(age).toBeLessThanOrEqual(65);
    });

    test('should handle pattern with {COUNTER}', () => {
      const columns = parseColumns('email:pattern:user+{COUNTER}@test.com');
      expect(generateRow(columns, 0).email).toBe('user+1@test.com');
      expect(generateRow(columns, 41).email).toBe('user+42@test.com');
    });

    test('should handle pattern with # (random digit)', () => {
      const columns = parseColumns('code:pattern:ABC-###');
      const code = generateRow(columns, 0).code;
      expect(code).toMatch(/^ABC-\d{3}$/);
    });

    test('should handle pattern with both {COUNTER} and #', () => {
      const columns = parseColumns('id:pattern:USR-{COUNTER}-##');
      const id1 = generateRow(columns, 0).id;
      const id2 = generateRow(columns, 1).id;
      
      expect(id1).toMatch(/^USR-1-\d{2}$/);
      expect(id2).toMatch(/^USR-2-\d{2}$/);
    });

    test('should handle unknown type as random words', () => {
      const columns = parseColumns('custom:unknownType');
      const value = generateRow(columns, 0).custom;
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });

    test('should generate multiple columns', () => {
      const columns = parseColumns('id:autoIncrement,email:pattern:user+{COUNTER}@test.com,status:enum:on|off');
      const row = generateRow(columns, 4);
      
      expect(row.id).toBe(5);
      expect(row.email).toBe('user+5@test.com');
      expect(['on', 'off']).toContain(row.status);
    });
  });

  describe('generateData - row generation', () => {
    test('should generate specified number of rows', () => {
      const result = generateData({
        columns: 'id:autoIncrement,name:fullName',
        rows: 50
      });
      
      expect(result.records).toHaveLength(50);
      expect(result.records[0].id).toBe(1);
      expect(result.records[49].id).toBe(50);
    });

    test('should generate data with all column types', () => {
      const result = generateData({
        columns: 'id:autoIncrement,status:static:active,age:range:20-30',
        rows: 10
      });
      
      expect(result.records).toHaveLength(10);
      result.records.forEach((row, index) => {
        expect(row.id).toBe(index + 1);
        expect(row.status).toBe('active');
        expect(row.age).toBeGreaterThanOrEqual(20);
        expect(row.age).toBeLessThanOrEqual(30);
      });
    });

    test('should handle counter patterns correctly', () => {
      const result = generateData({
        columns: 'email:pattern:user+{COUNTER}@test.com',
        rows: 5
      });
      
      expect(result.records[0].email).toBe('user+1@test.com');
      expect(result.records[4].email).toBe('user+5@test.com');
    });

    test('should default to 100 rows', () => {
      const result = generateData({
        columns: 'id:autoIncrement'
      });
      
      expect(result.records).toHaveLength(100);
    });
  });

  describe('toCSVString', () => {
    test('should convert data to CSV string', () => {
      const data = [
        { id: 1, name: 'John', age: 30 },
        { id: 2, name: 'Jane', age: 25 }
      ];
      const columns = [
        { name: 'id' },
        { name: 'name' },
        { name: 'age' }
      ];
      
      const csv = toCSVString(data, columns);
      const lines = csv.trim().split('\n');
      
      expect(lines[0]).toBe('Id,Name,Age');
      expect(lines[1]).toBe('1,John,30');
      expect(lines[2]).toBe('2,Jane,25');
    });

    test('should handle empty data', () => {
      const csv = toCSVString([], [{ name: 'id' }, { name: 'name' }]);
      expect(csv.trim()).toBe('');
    });

    test('should accept columns as string', () => {
      const data = [
        { id: 1, name: 'Test' }
      ];
      // Pass columns as string instead of array
      const csv = toCSVString(data, 'id,name');
      const lines = csv.trim().split('\n');
      
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('Id,Name');
      expect(lines[1]).toBe('1,Test');
    });

    test('should handle single row', () => {
      const data = [{ id: 1, name: 'Test' }];
      const csv = toCSVString(data, [{ name: 'id' }, { name: 'name' }]);
      const lines = csv.trim().split('\n');
      
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('Id,Name');
      expect(lines[1]).toBe('1,Test');
    });

    test('should escape commas in values', () => {
      const data = [{ name: 'Last, First' }];
      const csv = toCSVString(data, [{ name: 'name' }]);
      
      expect(csv).toContain('"Last, First"');
    });

    test('should escape quotes in values', () => {
      const data = [{ quote: 'He said "hello"' }];
      const csv = toCSVString(data, [{ name: 'quote' }]);
      
      expect(csv).toContain('""hello""');
    });

    test('should handle newlines in values', () => {
      const data = [{ text: 'Line 1\nLine 2' }];
      const csv = toCSVString(data, [{ name: 'text' }]);
      
      expect(csv).toContain('"Line 1\nLine 2"');
    });
  });

  describe('generateData', () => {
    test('should generate data with metadata', () => {
      const result = generateData({
        columns: 'id:autoIncrement,name:fullName',
        rows: 10
      });
      
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('columns');
      expect(result).toHaveProperty('rowCount');
      expect(result).toHaveProperty('columnCount');
      
      expect(result.rowCount).toBe(10);
      expect(result.columnCount).toBe(2);
      expect(result.records).toHaveLength(10);
      expect(result.columns[0].name).toBe('id');
      expect(result.columns[1].name).toBe('name');
    });

    test('should generate valid data records', () => {
      const result = generateData({
        columns: 'id:autoIncrement,value:static:test',
        rows: 5
      });
      
      expect(result.records).toHaveLength(5);
      expect(result.records[0].id).toBe(1);
      expect(result.records[0].value).toBe('test');
      expect(result.records[4].id).toBe(5);
      expect(result.records[4].value).toBe('test');
    });

    test('should use template columns', () => {
      const result = generateData({
        columns: templates.users.columns,
        rows: 3
      });
      
      expect(result.columnCount).toBeGreaterThan(5);
      expect(result.records[0]).toHaveProperty('email');
      expect(result.records[0]).toHaveProperty('firstName');
    });

    test('should handle large datasets', () => {
      const result = generateData({
        columns: 'id:autoIncrement,email:pattern:user+{COUNTER}@test.com',
        rows: 1000
      });
      
      expect(result.rowCount).toBe(1000);
      expect(result.records[0].email).toBe('user+1@test.com');
      expect(result.records[999].email).toBe('user+1000@test.com');
    });
  });

  describe('setFaker', () => {
    test('should allow setting faker instance', () => {
      const customFaker = { ...faker };
      setFaker(customFaker);
      
      // Verify by generating data (internal test)
      const result = generateData({ columns: 'name', rows: 1 });
      expect(result.records).toHaveLength(1);
    });

    test('should work after being set', () => {
      setFaker(faker);
      
      // Should not throw
      expect(() => generateData({ columns: 'name', rows: 1 })).not.toThrow();
    });
  });

  describe('getFaker error handling', () => {
    test('should throw error when faker not initialized', () => {
      // Save current faker instance
      const currentFaker = faker;
      
      // Set to null to test error case
      setFaker(null);
      
      // Attempt to generate data should throw
      expect(() => {
        generateData({ columns: 'name', rows: 1 });
      }).toThrow('Faker.js not initialized');
      
      // Restore faker for other tests
      setFaker(currentFaker);
    });

    test('should handle window global in browser environment', () => {
      // This tests the typeof window check (line 10 in core.js)
      // In Node.js, window is undefined, so this branch is not taken
      // We can at least verify the module loads without error
      expect(typeof window).toBe('undefined');
      
      // We can also verify setFaker works as the alternative
      setFaker(faker);
      expect(() => generateData({ columns: 'id', rows: 1 })).not.toThrow();
    });
  });

  describe('All faker type coverage', () => {
    test('should generate data with all text types', () => {
      const result = generateData({
        columns: 'w:word,ws:words,s:sentence,p:paragraph',
        rows: 1
      });
      
      expect(result.records[0]).toHaveProperty('w');
      expect(result.records[0]).toHaveProperty('ws');
      expect(result.records[0]).toHaveProperty('s');
      expect(result.records[0]).toHaveProperty('p');
    });

    test('should generate data with color and emoji types', () => {
      const result = generateData({
        columns: 'c:color,e:emoji',
        rows: 1
      });
      
      expect(result.records[0]).toHaveProperty('c');
      expect(result.records[0]).toHaveProperty('e');
      expect(typeof result.records[0].c).toBe('string');
      expect(typeof result.records[0].e).toBe('string');
    });

    test('should generate data with all person types', () => {
      const result = generateData({
        columns: 'fn:firstName,ln:lastName,full:fullName,job:jobTitle,pre:prefix,suf:suffix',
        rows: 1
      });
      
      expect(result.records[0]).toHaveProperty('fn');
      expect(result.records[0]).toHaveProperty('ln');
      expect(result.records[0]).toHaveProperty('full');
      expect(result.records[0]).toHaveProperty('job');
      expect(result.records[0]).toHaveProperty('pre');
      expect(result.records[0]).toHaveProperty('suf');
    });

    test('should generate data with all internet types', () => {
      const result = generateData({
        columns: 'em:email,user:username,pass:password,site:url,ip:ipv4,ua:userAgent',
        rows: 1
      });
      
      expect(result.records[0]).toHaveProperty('em');
      expect(result.records[0]).toHaveProperty('user');
      expect(result.records[0]).toHaveProperty('pass');
      expect(result.records[0]).toHaveProperty('site');
      expect(result.records[0]).toHaveProperty('ip');
      expect(result.records[0]).toHaveProperty('ua');
    });

    test('should generate data with phone type', () => {
      const result = generateData({
        columns: 'ph:phone',
        rows: 1
      });
      
      expect(result.records[0]).toHaveProperty('ph');
      expect(typeof result.records[0].ph).toBe('string');
    });

    test('should generate data with all address types', () => {
      const result = generateData({
        columns: 'st:street,ct:city,s:state,co:country,z:zipCode,lat:latitude,lon:longitude',
        rows: 1
      });
      
      expect(result.records[0]).toHaveProperty('st');
      expect(result.records[0]).toHaveProperty('ct');
      expect(result.records[0]).toHaveProperty('s');
      expect(result.records[0]).toHaveProperty('co');
      expect(result.records[0]).toHaveProperty('z');
      expect(result.records[0]).toHaveProperty('lat');
      expect(result.records[0]).toHaveProperty('lon');
    });

    test('should generate data with company types', () => {
      const result = generateData({
        columns: 'comp:company,dept:department',
        rows: 1
      });
      
      expect(result.records[0]).toHaveProperty('comp');
      expect(result.records[0]).toHaveProperty('dept');
    });

    test('should generate data with commerce types', () => {
      const result = generateData({
        columns: 'prod:product,pr:price,desc:productDescription',
        rows: 1
      });
      
      expect(result.records[0]).toHaveProperty('prod');
      expect(result.records[0]).toHaveProperty('pr');
      expect(result.records[0]).toHaveProperty('desc');
    });

    test('should generate data with finance types', () => {
      const result = generateData({
        columns: 'amt:amount,acc:accountNumber,ib:iban,cc:creditCardNumber,cur:currency',
        rows: 1
      });
      
      expect(result.records[0]).toHaveProperty('amt');
      expect(result.records[0]).toHaveProperty('acc');
      expect(result.records[0]).toHaveProperty('ib');
      expect(result.records[0]).toHaveProperty('cc');
      expect(result.records[0]).toHaveProperty('cur');
    });

    test('should generate data with all date types', () => {
      const result = generateData({
        columns: 'past:pastDate,future:futureDate,recent:recentDate,ts:timestamp',
        rows: 1
      });
      
      expect(result.records[0]).toHaveProperty('past');
      expect(result.records[0]).toHaveProperty('future');
      expect(result.records[0]).toHaveProperty('recent');
      expect(result.records[0]).toHaveProperty('ts');
    });

    test('should generate data with number types', () => {
      const result = generateData({
        columns: 'n:number,f:float',
        rows: 1
      });
      
      expect(result.records[0]).toHaveProperty('n');
      expect(result.records[0]).toHaveProperty('f');
      expect(typeof result.records[0].n).toBe('number');
      expect(typeof result.records[0].f).toBe('number');
    });

    test('should generate data with ID types', () => {
      const result = generateData({
        columns: 'uid:uuid,nid:nanoid',
        rows: 1
      });
      
      expect(result.records[0]).toHaveProperty('uid');
      expect(result.records[0]).toHaveProperty('nid');
      expect(typeof result.records[0].uid).toBe('string');
      expect(typeof result.records[0].nid).toBe('string');
    });
  });
});
