# Implementation Plan - Exceto Domingo De Carnaval +7 & Astronomical Seasonal Rule Processing

## User Requirements & Clarifications
1. **Rule**: 'Exceto Domingo De Carnaval +7' (and variations) properly processed for all years using precise astronomical calculations (Meeus/Jones/Butcher algorithm for Easter and movable feasts).
2. **Indicator**: In "Posição Personalizada" (Custom Position / Season Manager), display a clear indicator showing whether the exception applies and when/how the date shifts for the given year.
3. **Scope**: Universal astronomical calculations covering all past, current, and future years automatically in both `App.tsx` and `src/lib/solarTime.ts`.

## Proposed Changes

### 1. `src/lib/solarTime.ts` & `src/App.tsx`
- Ensure robust implementation of Meeus/Jones/Butcher Computus algorithm for Easter and movable feasts (Carnaval, Ash Wednesday, Palm Sunday).
- Implement precise handling of rules containing `'Exceto Domingo De Carnaval +7'` or `'exceto domingo de carnaval'` with offset adjustments.
- When the 3rd Sunday of February coincides with Domingo de Carnaval, automatically shift the date by +7 days.

### 2. UI Updates (`SeasonManagerModal.tsx` / `App.tsx`)
- In "Posição Personalizada" / Season Manager, add visual indicators and preview labels showing:
  - Base calculated date.
  - Whether the Carnival exception triggered for the selected year.
  - Final effective date after applying the +7 days postponement.

### 3. Verification
- Compile applet with `compile_applet`.
- Verify behavior across different years (e.g., 2023, 2026, 2030).
