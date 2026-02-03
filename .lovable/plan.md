

# Add Unit Test Cases

## Summary

Add comprehensive unit tests to cover the recently updated components (`MacStatusCard`, `ProvisioningPage`) and the `MacValidator` component, which currently lacks dedicated tests.

---

## Current Test Coverage Analysis

| File | Current Status | Notes |
|------|----------------|-------|
| `src/utils/macUtils.test.ts` | Good coverage | Covers all utility functions including new `normalizeMac` and `isCompleteMac` |
| `src/utils/errorUtils.test.ts` | Comprehensive | All error classification scenarios covered |
| `src/services/provisioningApi.test.ts` | Comprehensive | Stub and real API modes covered |
| `src/components/ErrorDisplay.test.tsx` | Comprehensive | All modes and interactions covered |
| `src/components/MacStatusCard.test.tsx` | Minimal | Only 3 basic tests, missing new UI states |
| `src/components/MacValidator.tsx` | Missing | No dedicated test file |
| `src/components/ProvisioningPage.tsx` | Minimal | Only 1 test in `ProvisioningPage.test.tsx` |
| `src/e2e/provisioningFlow.test.tsx` | Good | E2E flow tests for key scenarios |

---

## New Tests to Add

### 1. MacStatusCard Tests (expand existing file)

**File:** `src/components/MacStatusCard.test.tsx`

New test cases for recent UI improvements:

```typescript
// Status badge variations
it('shows "Checking..." badge when status is checking')
it('shows "Exists" badge when status is found')
it('shows "Unknown" badge when status is unknown')
it('shows "Pending" badge when status is pending')

// Provisioning complete state - NEW UI behavior
it('shows "Replaced" badge when provisioning complete with previous data')
it('shows "Previous Status" label when provisioning is complete')
it('shows "Current Status" label when provisioning is not complete')
it('shows "Applied Config" with success badge when provisioning complete')
it('shows "Config to Apply" with code style when provisioning not complete')

// Provision state badges
it('shows "Provisioning..." badge during provisioning')
it('shows "Error" badge on provision error')

// Layout structure
it('displays MAC address in the grid layout')
it('displays current data account and configfile when present')
```

---

### 2. MacValidator Tests (new file)

**File:** `src/components/MacValidator.test.tsx`

Test cases for the universal MAC input:

```typescript
describe('MacValidator', () => {
  // Input normalization (uses shared macUtils)
  it('normalizes input as user types')
  it('accepts compact format and normalizes to colon-separated')
  it('accepts hyphen-separated format')
  it('accepts Cisco dot format')
  it('uppercases lowercase input')

  // Validation flow
  it('shows error for incomplete MAC address')
  it('shows error for non-approved OUI')
  it('calls onValidated with normalized MAC on success')
  it('shows success message after validation')

  // Helper text
  it('displays format helper text')
  it('shows "Press Validate to continue" hint when MAC is complete')

  // Button state
  it('disables validate button when input is empty')
  it('disables validate button when isLoading is true')

  // OUI check
  it('fetches approved OUIs from config')
  it('handles OUI config fetch failure gracefully')
})
```

---

### 3. ProvisioningPage Step Indicator Tests

**File:** `src/components/ProvisioningPage.test.tsx` (expand)

Test the step indicator logic:

```typescript
describe('ProvisioningPage step indicator', () => {
  it('shows step 1 as active initially')
  it('shows step 1 complete and step 2 active after MAC validated')
  it('shows steps 1-2 complete and step 3 active during provisioning')
  it('shows all three steps green with checkmarks on successful provisioning')
})
```

---

## Files to Create/Modify

| File | Action | Test Count |
|------|--------|------------|
| `src/components/MacStatusCard.test.tsx` | Expand | +12 tests |
| `src/components/MacValidator.test.tsx` | Create | +14 tests |
| `src/components/ProvisioningPage.test.tsx` | Expand | +4 tests |

---

## Technical Details

### MacStatusCard Tests Structure

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MacStatusCard, MacStatus } from './MacStatusCard';

const createMockMac = (overrides: Partial<MacStatus> = {}): MacStatus => ({
  mac: 'AA:BB:CC:DD:EE:FF',
  configfile: 'r-2000-1000',
  status: 'pending',
  provisionState: 'pending',
  ...overrides,
});

describe('MacStatusCard', () => {
  describe('status badges', () => {
    it('shows "Replaced" badge when provisioning complete with previous data', () => {
      const mac = createMockMac({
        status: 'found',
        provisionState: 'complete',
        currentData: { account: 'test', configfile: 'old-cfg', isp: 'isp' },
      });
      render(<MacStatusCard mac={mac} showProvisionState />);
      expect(screen.getByText('Replaced')).toBeInTheDocument();
    });
  });

  describe('contextual labels', () => {
    it('shows "Previous Status" when provisioning is complete', () => {
      const mac = createMockMac({ provisionState: 'complete' });
      render(<MacStatusCard mac={mac} />);
      expect(screen.getByText('Previous Status')).toBeInTheDocument();
    });

    it('shows "Current Status" when provisioning is not complete', () => {
      const mac = createMockMac({ provisionState: 'pending' });
      render(<MacStatusCard mac={mac} />);
      expect(screen.getByText('Current Status')).toBeInTheDocument();
    });
  });
});
```

### MacValidator Tests Structure

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MacValidator } from './MacValidator';

const mockFetch = (approved: boolean) => {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ approved_ouis: approved ? ['AABBCC'] : [] }),
  });
};

describe('MacValidator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes input as user types', async () => {
    global.fetch = mockFetch(true);
    const user = userEvent.setup();
    const onValidated = vi.fn();
    
    render(<MacValidator onValidated={onValidated} />);
    
    const input = screen.getByPlaceholderText(/Enter MAC/);
    await user.type(input, 'aabbccddeeff');
    
    expect(input).toHaveValue('AA:BB:CC:DD:EE:FF');
  });

  it('shows error for non-approved OUI', async () => {
    global.fetch = mockFetch(false);
    const user = userEvent.setup();
    
    render(<MacValidator onValidated={vi.fn()} />);
    
    const input = screen.getByPlaceholderText(/Enter MAC/);
    await user.type(input, 'AABBCCDDEEFF');
    await user.click(screen.getByText('Validate'));
    
    await waitFor(() => {
      expect(screen.getByText(/not a known Viavi meter/)).toBeInTheDocument();
    });
  });
});
```

### ProvisioningPage Step Indicator Tests

```typescript
describe('ProvisioningPage step indicator', () => {
  it('shows all steps green on successful provisioning', async () => {
    global.fetch = setupFetch({ approved: true });
    vi.mocked(provisioningApi.searchByMac).mockResolvedValue([]);
    vi.mocked(provisioningApi.addHsd).mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<ProvisioningPage />);
    
    // Complete the flow
    await typeAndValidate(user);
    await user.click(screen.getByText('Provision MAC'));
    
    // All three checkmarks should be visible
    await waitFor(() => {
      const checkmarks = screen.getAllByTestId('check-circle-icon');
      expect(checkmarks).toHaveLength(3);
    });
  });
});
```

---

## Test Execution

After implementation, run tests with:
```bash
npm test
```

Or run specific test files:
```bash
npm test -- src/components/MacStatusCard.test.tsx
npm test -- src/components/MacValidator.test.tsx
```

