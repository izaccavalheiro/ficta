// Tests for shared name-hints module
import { NAME_HINTS, lookupNameHint } from '../src/name-hints.js';

describe('name-hints', () => {
  describe('NAME_HINTS array', () => {
    test('exports a non-empty array', () => {
      expect(Array.isArray(NAME_HINTS)).toBe(true);
      expect(NAME_HINTS.length).toBeGreaterThan(10);
    });

    test('each entry is a [RegExp, string] pair', () => {
      NAME_HINTS.forEach(([pattern, type]) => {
        expect(pattern).toBeInstanceOf(RegExp);
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });

  describe('lookupNameHint', () => {
    test('returns autoIncrement for "id"', () => {
      expect(lookupNameHint('id')).toBe('autoIncrement');
    });

    test('returns uuid for "uuid" column', () => {
      expect(lookupNameHint('uuid')).toBe('uuid');
      expect(lookupNameHint('user_guid')).toBe('uuid');
    });

    test('returns email for "email" column', () => {
      expect(lookupNameHint('email')).toBe('email');
    });

    test('returns firstName / lastName for name columns', () => {
      expect(lookupNameHint('firstName')).toBe('firstName');
      expect(lookupNameHint('first_name')).toBe('firstName');
      expect(lookupNameHint('lastName')).toBe('lastName');
      expect(lookupNameHint('last_name')).toBe('lastName');
    });

    test('returns url for website columns', () => {
      expect(lookupNameHint('website')).toBe('url');
      expect(lookupNameHint('homepage')).toBe('url');
    });

    test('returns phone for phone/mobile columns', () => {
      expect(lookupNameHint('phone')).toBe('phone');
      expect(lookupNameHint('mobile')).toBe('phone');
    });

    test('returns address-related types', () => {
      expect(lookupNameHint('street')).toBe('street');
      expect(lookupNameHint('city')).toBe('city');
      expect(lookupNameHint('country')).toBe('country');
      // zip as standalone word matches
      expect(lookupNameHint('zip')).toBe('zipCode');
      expect(lookupNameHint('postal_code')).toBe('zipCode');
    });

    test('returns company for company columns', () => {
      expect(lookupNameHint('company')).toBe('company');
    });

    test('returns timestamp for created_at / updated_at', () => {
      expect(lookupNameHint('created_at')).toBe('timestamp');
      expect(lookupNameHint('updated_at')).toBe('timestamp');
    });

    test('returns boolean for is_active / active columns', () => {
      expect(lookupNameHint('is_active')).toBe('boolean');
      expect(lookupNameHint('active')).toBe('boolean');
    });

    test('returns null for unrecognised column names', () => {
      expect(lookupNameHint('foobar_xyz_totally_unknown')).toBeNull();
    });

    test('is case-insensitive', () => {
      expect(lookupNameHint('EMAIL')).toBe('email');
      expect(lookupNameHint('FIRST_NAME')).toBe('firstName');
    });
  });
});
