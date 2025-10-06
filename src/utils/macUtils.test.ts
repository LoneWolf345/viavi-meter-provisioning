import { describe, it, expect } from 'vitest';
import { normalizeMac, extractOui, validateMacFormat } from './macUtils';

describe('macUtils', () => {
  it('normalizes various MAC inputs to colon-separated uppercase', () => {
    expect(normalizeMac('aabb.ccdd.eeff')).toBe('AA:BB:CC:DD:EE:FF');
    expect(normalizeMac('aa-bb-cc-dd-ee-ff')).toBe('AA:BB:CC:DD:EE:FF');
  });

  it('extracts OUI from a MAC address', () => {
    expect(extractOui('AA:BB:CC:DD:EE:FF')).toBe('AABBCC');
  });

  it('validates MAC format correctly', () => {
    expect(validateMacFormat('AA:BB:CC:DD:EE:FF')).toBe(true);
    expect(validateMacFormat('AA-BB-CC-DD-EE-FF')).toBe(false);
  });
});
