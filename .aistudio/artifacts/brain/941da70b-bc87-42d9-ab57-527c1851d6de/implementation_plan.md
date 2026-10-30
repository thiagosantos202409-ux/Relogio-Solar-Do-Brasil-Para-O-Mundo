# Implementation Plan - Configuração de Luzes da Rua Solar (Nuvens Dinâmicas)

Add customizable solar altitude threshold controls (+90° to -90°) and gradual transition settings for streetlights in the "Nuvens Dinâmicas / Rua Solar" panel.

## Proposed Changes

### 1. Streetlight Altitude State & Calculation (`src/App.tsx`)
- Default Standard Configuration:
  - Solar Altitude > -0.8°: Streetlights 100% OFF (0% intensity).
  - Solar Altitude between -0.8° and -6.0°: Proportional gradual transition (fading from 0% at -0.8° to 100% at -6.0°).
  - Solar Altitude < -6.0°: Streetlights 100% ON (100% intensity).
- Customizable State Controls:
  - `streetlightOffAngle`: Altitude angle above which lights turn off (range -90° to +90°, default -0.8°).
  - `streetlightOnAngle`: Altitude angle below which lights reach 100% (range -90° to +90°, default -6.0°).
  - `isStreetlightTransitionEnabled`: Toggle for proportional gradual transition vs instant step ON/OFF.
- Live Intensity Calculation: Computes current streetlight intensity percentage (0% to 100%) in real time based on solar elevation.

### 2. UI Controls in Nuvens Dinâmicas / Rua Solar
- Dedicated control card inside the "Nuvens Dinâmicas / Rua Solar" section with:
  - Slider controls for OFF Angle and ON Angle (+90° to -90°).
  - Toggle switch for Proportional Transition vs Instant Step.
  - Live visual indicator displaying current solar altitude and resulting streetlight intensity %.
  - Button to restore standard default settings (-0.8° / -6.0°).

## Verification Plan

### Automated Build & Lint Verification
1. Run `compile_applet` to verify clean build.
2. Run `lint_applet` to verify zero linting errors.
