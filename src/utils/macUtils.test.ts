import { describe, it, expect } from 'vitest';
import { normalizeMac, extractOui, validateMacFormat, isCompleteMac } from './macUtils';

describe('macUtils', () => {
  describe('normalizeMac', () => {
    it('normalizes compact format (no separators)', () => {
      expect(normalizeMac('aabbccddeeff')).toBe('AA:BB:CC:DD:EE:FF');
    });

    it('normalizes hyphen-separated (Windows format)', () => {
      expect(normalizeMac('AA-BB-CC-DD-EE-FF')).toBe('AA:BB:CC:DD:EE:FF');
    });

    it('normalizes dot-separated (Cisco format)', () => {
      expect(normalizeMac('AABB.CCDD.EEFF')).toBe('AA:BB:CC:DD:EE:FF');
      expect(normalizeMac('aabb.ccdd.eeff')).toBe('AA:BB:CC:DD:EE:FF');
    });

    it('normalizes space-separated format', () => {
      expect(normalizeMac('AA BB CC DD EE FF')).toBe('AA:BB:CC:DD:EE:FF');
    });

    it('normalizes colon-separated (already correct format)', () => {
      expect(normalizeMac('AA:BB:CC:DD:EE:FF')).toBe('AA:BB:CC:DD:EE:FF');
      expect(normalizeMac('aa:bb:cc:dd:ee:ff')).toBe('AA:BB:CC:DD:EE:FF');
    });

    it('handles partial input during typing', () => {
      expect(normalizeMac('aaBB')).toBe('AA:BB');
      expect(normalizeMac('aabbcc')).toBe('AA:BB:CC');
      expect(normalizeMac('a')).toBe('A');
    });

    it('strips non-hex characters', () => {
      expect(normalizeMac('ghij1234')).toBe('12:34');
      expect(normalizeMac(':::AABBCC:::')).toBe('AA:BB:CC');
    });
  });

  describe('isCompleteMac', () => {
    it('returns true for complete MAC addresses', () => {
      expect(isCompleteMac('AA:BB:CC:DD:EE:FF')).toBe(true);
    });

    it('returns false for incomplete MAC addresses', () => {
      expect(isCompleteMac('AA:BB:CC')).toBe(false);
      expect(isCompleteMac('')).toBe(false);
    });
  });

  it('extracts OUI from a MAC address', () => {
    expect(extractOui('AA:BB:CC:DD:EE:FF')).toBe('AABBCC');
  });

  it('validates MAC format correctly', () => {
    expect(validateMacFormat('AA:BB:CC:DD:EE:FF')).toBe(true);
    expect(validateMacFormat('AA-BB-CC-DD-EE-FF')).toBe(false);
  });
});
