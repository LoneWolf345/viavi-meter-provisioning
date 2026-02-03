

# UI Improvements for Provisioning Success State

## Summary

Three visual/UX improvements to the provisioning flow:
1. Turn step indicator #3 green when provisioning completes successfully
2. Clarify the "Current Status" label to distinguish previous vs. newly applied config
3. Improve layout alignment to reduce whitespace while maintaining readability

---

## Changes Overview

### 1. Step Indicator - Green on Success

**Current behavior:** Step 3 circle stays purple (active) even after provisioning completes successfully.

**New behavior:** When `provisionState === 'complete'`, the step 3 circle turns green with a checkmark, matching steps 1 and 2.

**File:** `src/components/ProvisioningPage.tsx`

**Logic change in `getStepIndicator()`:**
- Add a check: if on the provisioning step AND `mac?.provisionState === 'complete'`, apply the success style (`bg-success text-success-foreground`) and show the CheckCircle icon.

---

### 2. Clarify Status Labels After Provisioning

**Problem:** After successful provisioning, the card still shows "Current Status: Exists" with the **previous** profile data, which is misleading.

**Solution:** Context-aware labels based on provisioning state:

| Condition | Label | Badge |
|-----------|-------|-------|
| Before provisioning | "Previous Status" | "Exists" / "Available" |
| After successful provision | "Previous Status" (if existed) | "Replaced" or hidden |
| After successful provision | "Applied Config" | Show the new config clearly |

**File:** `src/components/MacStatusCard.tsx`

**Changes:**
- Rename "Current Status" to "Previous Status" to clarify it's the pre-provision state
- When `provisionState === 'complete'`:
  - Change the "Exists" badge to "Replaced" (success styling) if there was previous data
  - Add a new "Applied Config" row showing the successfully provisioned config with a success badge

---

### 3. Layout Alignment - Reduce Whitespace

**Current layout:** Labels far left, values far right using `justify-between` across the full card width creates excessive whitespace.

**Proposed solutions** (we will use option B):

**Option A - Inline with dotted leader:**
```
MAC Address .......... 00:07:11:22:9E:16
```

**Option B - Grid with max-width constraint (recommended):**
Use a CSS grid with fixed label column width and auto value column, constrained within `max-w-md` to bring items closer:
```
┌─────────────────────────────────────────┐
│  MAC Address         00:07:11:22:9E:16  │
│  Previous Status     ⚠ Replaced         │
│  Applied Config      ✓ r-2000-1000      │
│  Provision State     ✓ Complete         │
└─────────────────────────────────────────┘
```

**File:** `src/components/MacStatusCard.tsx`

**Changes:**
- Replace `flex justify-between` rows with a `grid grid-cols-[auto_1fr]` layout
- Add consistent gap between label and value (e.g., `gap-x-8 gap-y-2`)
- Wrap content area in `max-w-md` to prevent full-width stretching
- Align values to the end of their grid cell for visual consistency

---

## Technical Details

### File: `src/components/ProvisioningPage.tsx`

**Changes to `getStepIndicator()` (lines 206-241):**
- Add condition to check if current step is 'provisioning' AND `mac?.provisionState === 'complete'`
- Apply success styling in that case

### File: `src/components/MacStatusCard.tsx`

**Interface update:**
- No changes needed - already has `provisionState` and `currentData` in the `MacStatus` interface

**Layout restructure (lines 97-144):**
- Change `CardContent` inner div from `space-y-*` with `flex justify-between` children to a grid layout
- Apply `grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 max-w-md` pattern
- Align values with `justify-self-end`

**Label/badge logic updates:**
- "Current Status" becomes "Previous Status"
- When `provisionState === 'complete'` and `status === 'found'`:
  - Show "Replaced" badge with success styling instead of "Exists"
- Add new "Applied Config" row when `provisionState === 'complete'`:
  - Success badge with checkmark and the config file name

---

## Visual Summary

**Before provisioning completes:**
```
Step: [✓] [✓] [3]

MAC Address       00:07:11:22:9E:16
Previous Status   ⚠ Exists
                  ViaviMeterTool • r-100-10
Config to Apply   r-2000-1000
Provision State   ⏳ Provisioning...
```

**After provisioning completes:**
```
Step: [✓] [✓] [✓]  ← Step 3 now green

MAC Address       00:07:11:22:9E:16
Previous Status   ↺ Replaced
                  ViaviMeterTool • r-100-10
Applied Config    ✓ r-2000-1000  ← New row, success style
Provision State   ✓ Complete
```

