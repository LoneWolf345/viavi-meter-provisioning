

# Universal MAC Address Input Implementation

## Summary

Enhance the MAC address input to accept all common formats and provide real-time visual formatting feedback as the user types. The input will auto-format to the canonical uppercase colon-separated format.

---

## Supported Input Formats

| Format | Example | Source |
|--------|---------|--------|
| Colon-separated | `AA:BB:CC:DD:EE:FF` | Unix/Linux |
| Hyphen-separated | `AA-BB-CC-DD-EE-FF` | Windows |
| Dot-separated (Cisco) | `AABB.CCDD.EEFF` | Cisco IOS |
| No separator | `AABBCCDDEEFF` | Compact |
| Space-separated | `AA BB CC DD EE FF` | Human-readable |
| Lowercase | `aa:bb:cc:dd:ee:ff` | Any |
| Mixed case | `Aa:Bb:Cc:Dd:Ee:Ff` | Any |

**Output format:** `AA:BB:CC:DD:EE:FF` (uppercase, colon-separated)

---

## User Experience Improvements

### Real-Time Formatting
As the user types, the input will auto-format:
- `aabbcc` → `AA:BB:CC`
- `aa-bb-cc-dd` → `AA:BB:CC:DD`
- `aabb.ccdd.eeff` → `AA:BB:CC:DD:EE:FF`

### Visual Feedback
- Show formatted preview below input while typing
- Green checkmark when format is complete and valid
- Clearer placeholder showing accepted formats

### Simplified Error Messages
- Remove format-specific errors (handled automatically)
- Keep only OUI validation message

---

## Technical Changes

### File: `src/utils/macUtils.ts`

**Enhanced `normalizeMac` function:**

```typescript
/**
 * Normalizes MAC input to uppercase colon-separated format
 * Supports: colons, hyphens, dots (Cisco), spaces, no separator
 * Handles progressive formatting during typing
 */
export function normalizeMac(input: string): string {
  // Strip all non-hex characters and uppercase
  const cleaned = input.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  
  // Insert colons every 2 characters for what we have
  const pairs = cleaned.match(/.{1,2}/g) || [];
  return pairs.join(':');
}

/**
 * Checks if the normalized MAC has complete 12 hex digits
 */
export function isCompleteMac(mac: string): boolean {
  const hexOnly = mac.replace(/:/g, '');
  return hexOnly.length === 12;
}
```

**Add test cases:**
```typescript
// New test cases
expect(normalizeMac('aabbccddeeff')).toBe('AA:BB:CC:DD:EE:FF');
expect(normalizeMac('AA-BB-CC-DD-EE-FF')).toBe('AA:BB:CC:DD:EE:FF');
expect(normalizeMac('AABB.CCDD.EEFF')).toBe('AA:BB:CC:DD:EE:FF');
expect(normalizeMac('AA BB CC DD EE FF')).toBe('AA:BB:CC:DD:EE:FF');
expect(normalizeMac('aaBB')).toBe('AA:BB'); // Partial input
expect(normalizeMac('aabbcc')).toBe('AA:BB:CC'); // Partial input
```

---

### File: `src/components/MacValidator.tsx`

**Changes:**

1. **Import shared utilities** instead of defining locally:
   ```typescript
   import { normalizeMac, validateMacFormat, isCompleteMac } from '@/utils/macUtils';
   ```

2. **Real-time formatting on input change:**
   ```typescript
   const handleInputChange = (value: string) => {
     const normalized = normalizeMac(value);
     setMac(normalized);
     setError('');
     setIsValid(false);
   };
   ```

3. **Update placeholder** to show format flexibility:
   ```typescript
   placeholder="Enter MAC (any format)"
   ```

4. **Add helper text** below input:
   ```typescript
   <p className="text-xs text-muted-foreground">
     Accepts: AA:BB:CC:DD:EE:FF, AA-BB-CC-DD-EE-FF, AABB.CCDD.EEFF
   </p>
   ```

5. **Increase maxLength** to accommodate longest format (17 chars for colon-separated):
   ```typescript
   maxLength={23} // Cisco format with dots: AABB.CCDD.EEFF = 14 chars, with extra room
   ```

6. **Simplify error handling** - remove format error (auto-corrected), keep only:
   - Incomplete MAC (less than 12 hex digits)
   - OUI not approved

7. **Show completion indicator** while typing:
   ```typescript
   {isCompleteMac(mac) && !isValid && (
     <span className="text-xs text-muted-foreground">
       Press Validate to continue
     </span>
   )}
   ```

---

## Updated Component Structure

```text
┌─────────────────────────────────────────────────────────────┐
│  MAC Address                                                │
│  ┌─────────────────────────────────────┐  ┌──────────────┐  │
│  │ AA:BB:CC:DD:EE:FF                   │  │  Validate    │  │
│  └─────────────────────────────────────┘  └──────────────┘  │
│  Accepts: AA:BB:CC:DD:EE:FF, AA-BB-CC-DD-EE-FF, AABB.CCDD   │
│                                                             │
│  ✓ MAC validated successfully                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/macUtils.ts` | Add `isCompleteMac`, enhance `normalizeMac` for progressive formatting |
| `src/utils/macUtils.test.ts` | Add test cases for all MAC formats |
| `src/components/MacValidator.tsx` | Use shared utils, update UX, add helper text |

---

## Edge Cases Handled

| Input | Normalized Output | Notes |
|-------|-------------------|-------|
| `aabbccddeeff` | `AA:BB:CC:DD:EE:FF` | No separators |
| `AA-BB-CC-DD-EE-FF` | `AA:BB:CC:DD:EE:FF` | Windows format |
| `AABB.CCDD.EEFF` | `AA:BB:CC:DD:EE:FF` | Cisco format |
| `aa bb cc dd ee ff` | `AA:BB:CC:DD:EE:FF` | Space-separated |
| `aabb` | `AA:BB` | Partial during typing |
| `AA:BB:CC:` | `AA:BB:CC` | Trailing separator stripped |
| `:::AABBCC:::` | `AA:BB:CC` | Extra separators ignored |
| `ghij1234` | `12:34` | Non-hex chars stripped |

