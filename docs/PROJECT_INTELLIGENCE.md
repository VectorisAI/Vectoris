# Project Intelligence & Estimating Workflow

## Conceptual Framework

Vectoris is architected from first principles as an **AI-Native Project Management & Intelligence Workspace** for electrical and mechanical contracting. In traditional estimating software, blueprint takeoff is an isolated, disconnected calculation tool. In Vectoris, takeoff is a core operational workflow embedded inside a persistent **Project Container**.

```text
                    VECTORIS WORKSPACE
                            │
               ┌─────────── PROJECT ───────────┐
               │                               │
        PROJECT INTELLIGENCE                   │
               │                               │
   ┌───────────┼────────────┐                  │
   ↓           ↓            ↓                  ↓
Drawings   Documents    AI Models        Collaboration
   │
   ↓
Takeoff (Linear Runs & Symbol Counts)
   │
   ↓
Bill of Quantities (BOQ Synthesis)
   │
   ↓
Engineering (Conductor & Conduit Sizing)
   │
   ↓
Estimation (Labor Units & Material Pricing)
   │
   ↓
Commercial Bidding & Proposal Delivery
```

---

## 1. The Project as the Central Intelligence Container

Every estimating effort begins with a Project Container that serves as the single source of truth:

- **Drawings Repository:** Multi-discipline drawing sets (Architectural, Structural, Electrical, Mechanical) indexed with spatial relationships and cross-sheet references.
- **Specification Documents:** Division 26 (Electrical) project manuals, addenda, and equipment schedules parsed for specification compliance.
- **AI Context & Evidence Chains:** Natural language query threads grounded in drawing callouts, sheet schedules, and engineer-of-record notes.
- **Role-Based Collaboration:** Preconstruction managers, senior estimators, and junior detailers collaborating with revision history.

---

## 2. Takeoff Pipeline: From Raster Blueprint to Verified BOQ

The takeoff pipeline moves methodically from raw input to verified procurement output:

```text
Drawing Import → Scale Calibration → Layer Segregation → Neural Perception → Human Verification → BOQ Synthesis
```

### A. Scale Calibration & Spatial Indexing
- Automatic scale detection from architectural titleblocks (e.g. `1/4" = 1'-0"`, `1:100`).
- Two-point user calibration with dimension verification across known structural grid lines.
- Coordinate transformation matrix mapping drawing canvas pixels directly to real-world millimeters.

### B. Linear Takeoff: Cable Trays, Feeders & Branch Circuits
- Automated tracing of overhead ladder cable tray paths and EMT/RMC conduit runs.
- Elevation drop calculation (automatic vertical rise/drop addition at panels, switchgear, and terminal drops).
- Segment categorization by trade service code (`FEEDER`, `BRANCH-LIGHTING`, `BRANCH-POWER`, `LOW-VOLTAGE`).

### C. Count Takeoff: Receptacles, Panels & Luminaires
- Symbol identification across complex floor plans (e.g., Duplex Receptacles, GFCI Outlets, 2x4 LED Troffers, Emergency Exit Signs, Distribution Panels).
- Rotation-invariant and scale-invariant template matching powered by neural vision models.
- Automatic symbol schedule correlation to cross-reference drawing symbols with Luminaire/Panel Schedules.

---

## 3. Human-in-the-Loop Verification Queue

Vectoris avoids "black box" automated estimating. Every computer vision detection is staged in an interactive verification queue:

1. **Visual Bounding Overlays:** High-contrast bounding boxes indicate detected symbols, color-coded by confidence tier (Green >95%, Amber 80–95%, Red <80%).
2. **Batch Approval & Rejection:** Estimators can rapidly approve high-confidence groups or bulk-reclassify misidentified items.
3. **Manual Override & Calibration:** Instant point-and-click addition of missed fixtures with automatic magnetic snapping to architectural wall lines.
4. **Audit Trail:** Every quantity modification records timestamp, operator identity, and original detection score for accountability.

---

## 4. Engineering Intelligence & Conductor Sizing

Beyond simple counts and lengths, Vectoris incorporates NEC (National Electrical Code) electrical engineering intelligence:

- **Voltage Drop Verification:** Calculates voltage drop along long feeder runs (e.g. 184.6-meter run lengths) based on nominal system voltage (480V / 208V / 120V) and design ampacity.
- **Conductor Optimization:** Proposes code-compliant conductor sizing (such as 350 kcmil copper conductors in 3" EMT conduit) to maintain voltage drop below the recommended 3% branch / 5% total threshold.
- **Conduit Fill Calculation:** Verifies conduit raceway sizing against Chapter 9, Table 1 fill capacity limits.

---

## 5. Bill of Quantities (BOQ) Synthesis & Export

Upon takeoff completion, Vectoris synthesizes an itemized, procurement-ready Bill of Quantities:

- **Categorized Line Items:** Clear hierarchy organized by MasterFormat Division 26 (Rough-in, Feeders, Branch Wiring, Luminaires, Gear).
- **Material & Labor Aggregation:** Linear footages adjusted for waste factors (typically 5–10% on conduit/wire) and standard installation labor units.
- **Export Formats:** Direct export to CSV, Excel (`.xlsx`), JSON, and enterprise estimating formats.
