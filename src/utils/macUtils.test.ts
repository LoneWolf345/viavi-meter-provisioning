import { describe, it, expect } from 'vitest';
import { normalizeMac, extractOui, generateSequentialMacs, validateMacFormat } from './macUtils';

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

  it('generates sequential MACs within 48-bit limit', () => {
    const result = generateSequentialMacs('00:00:00:00:00:00');
    expect(result.success).toBe(true);
    expect(result.macs).toEqual([
      '00:00:00:00:00:00',
      '00:00:00:00:00:01',
      '00:00:00:00:00:02',
      '00:00:00:00:00:03'
    ]);
  });

  it('fails when sequential generation exceeds 48-bit limit', () => {
    const result = generateSequentialMacs('FF:FF:FF:FF:FF:FF');
    expect(result.success).toBe(false);
    expect(result.error).toContain('overflow');
  });
});
