# Liquid Design System & Workstation Ergonomics

## Philosophy & Visual Identity

The **Vectoris Workstation** is designed for high-performing electrical estimators and MEP engineers who spend 8 to 12 hours a day analyzing complex, high-density blueprints. The interface rejects generic software aesthetics in favor of a specialized **Liquid Design System** that balances ultra-dense technical telemetry with fluid, tactile interactions.

---

## 1. The Liquid Theme System

Vectoris features an innovative **5-phase fluid Bézier wave compositor** that orchestrates theme transitions between deep dark mode and luminous light mode. Rather than an abrupt instant swap or basic alpha fade, the transition travels across the screen as an organic wavefront driven by custom SVG displacement filters and hardware-accelerated CSS custom properties.

```text
Phase 1: Trigger & Focal Ripple Origin
Phase 2: Radial Wavefront Propagation & Shadow Deformation
Phase 3: Color Token Interpolation & Gradient Inversion
Phase 4: Border Refraction & Glow Stabilization
Phase 5: Sub-Pixel Typography Sharpness Pass
```

---

## 2. Color Palette & Semantic Tokens

The color architecture is calibrated for maximum contrast and reduced eye strain during extended night estimating sessions:

### Deep Dark Palette (Default Night Operations)
| Token | Hex Value | Purpose |
|---|---|---|
| `--color-canvas-bg` | `#0E080A` | Deepest root viewport and titlebar background |
| `--color-surface-base` | `#181014` | Panel surfaces, card containers, and sidebar |
| `--color-surface-elevated` | `#24181E` | Hovered cards, dropdown menus, and active toolbars |
| `--color-border-subtle` | `#3A2832` | 1px clean gridlines and panel dividers |
| `--color-text-primary` | `#F5F2F0` | High-contrast headings and primary quantities |
| `--color-text-secondary` | `#A6989F` | Metadata labels, units, and secondary notes |
| `--color-accent-amber` | `#FF9E3B` | Highlighting critical takeoffs, warnings, and pending items |
| `--color-accent-cyan` | `#2DE2E6` | Active polyline tracing vectors and calibrated scale marks |
| `--color-status-success` | `#00F0A0` | Verified fixtures and completed BOQ line items |

### Alabaster Light Palette (High-Illumination Environments)
| Token | Hex Value | Purpose |
|---|---|---|
| `--color-canvas-bg` | `#FBF8F4` | Clean alabaster workstation root background |
| `--color-surface-base` | `#FFFFFF` | Sheet canvas background and card panels |
| `--color-surface-elevated` | `#F4F0EB` | Elevated dialogs, tool palettes, and tables |
| `--color-border-subtle` | `#E2DDD6` | Structural borders and table separators |
| `--color-text-primary` | `#1A1617` | High-legibility deep charcoal typography |
| `--color-text-secondary` | `#6B6366` | Trade categories and engineering annotations |
| `--color-accent-primary` | `#E06D14` | Primary actions and active takeoff selections |

---

## 3. Typography & Numerical Precision

Vectoris uses a dual-type hierarchy optimized for architectural scale and numerical legibility:

- **Primary Interface Font:** `Inter` (sans-serif)
  - Clear x-height, neutral letterforms, and optimized tabular figures (`font-variant-numeric: tabular-nums`) to prevent layout shifting during real-time length calculations.
- **Monospace & Measurement Font:** `JetBrains Mono`
  - Used for real-world coordinates, CAD layer codes, conduit trade sizes (`3/4"`, `1-1/2"`, `3"`), voltage drop percentages (`2.45%`), and cryptographic hashes.

---

## 4. Multi-Monitor & Dual-4K Workstation Layout

Professional estimators routinely operate across two or three 4K displays:

1. **Sheet Viewport (Display 1):** Full-screen, hardware-accelerated canvas displaying 50MB+ vector drawings at 60fps pan and zoom, with zero canvas stutter.
2. **Verification & BOQ Studio (Display 2):** High-density split inspector displaying the real-time Takeoff Tree, Human Verification Queue, Feeder Schedules, and live pricing summaries.
3. **Custom Frameless Titlebar:** Unified custom titlebar featuring window control physics, current project breadcrumb, active scale indicator, and the dynamic status pill.
