# Frequently Asked Questions (FAQ)

## General & Product Architecture

### Why is Vectoris built as a local-first desktop application rather than cloud SaaS?
Preconstruction blueprints and MEP schedules are confidential intellectual property containing proprietary mechanical layouts, critical infrastructure routing, and competitive pricing strategies. Uploading multi-gigabyte drawing packages to multi-tenant cloud platforms introduces significant data governance, IT compliance, and leakage risks.

Furthermore, rendering and interacting with complex 50MB–200MB architectural vector sheets demands local GPU acceleration and instant filesystem access. Vectoris delivers sub-1.2s sheet vectorization and sub-95MB idle RAM usage that cloud web browsers cannot achieve.

### Can Vectoris function completely offline?
**Yes.** Vectoris operates with 100% functionality without an active internet connection. All vector parsing, linear run calculations, symbol detection, and BOQ synthesis run directly on your workstation hardware. Internet access is only required if you check for in-app software updates.

---

## Blueprint Ingestion & Takeoff

### What drawing formats are supported?
Vectoris supports both vector-based and raster-based engineering formats:
- **Vector Formats:** AutoCAD DWG, DXF, and vector-embedded PDF drawings.
- **Raster Formats:** Scanned blueprint PDFs, multi-page TIFFs, PNGs, and high-resolution JPEGs (up to 600 DPI).

### How does Vectoris calibrate drawing scale?
Vectoris offers dual scale calibration:
1. **Automated Titleblock Detection:** Automatically reads standard architectural and engineering scale annotations (e.g. `1/8" = 1'-0"`, `3/16" = 1'-0"`, `1:50`, `1:100`).
2. **Two-Point Manual Calibration:** Estimators can click any known dimension on the plan (such as a 30-foot structural grid column span or doorway width) and specify the precise real-world length to calibrate the entire sheet coordinate space.

### How accurate is the neural symbol classification? Can estimators trust it?
Vectoris achieves a 99.1% benchmark precision rate across standard MEP symbol schedules. Crucially, Vectoris is engineered with a **Human-in-the-Loop** philosophy: the software never silently commits quantities to a bid. Every detected element is staged in the visual verification queue, allowing estimators to review, approve, reclassify, or override items in seconds.

### How are vertical drops and elevation rises calculated?
Because 2D blueprints only show horizontal path travel, Vectoris incorporates automatic elevation compensation:
- Panel drops (+1.5m to floor level)
- Switch and receptacle heights (+0.45m or +1.1m)
- Overhead ladder cable tray routing (+3.6m to +4.5m ceiling plenum elevation)
These parameters are customizable at the project, sheet, or individual circuit level.

---

## Electrical Engineering & NEC Calculations

### Does Vectoris verify National Electrical Code (NEC) compliance?
Yes. The built-in Engineering Copilot assists estimators with code-compliant feeder and raceway sizing:
- **Voltage Drop Analysis:** Computes voltage drop along long feeder runs based on circuit length, voltage, and expected load ampacity.
- **Conductor Upsizing Recommendations:** Flags circuits exceeding the 3% branch circuit or 5% feeder voltage drop threshold and suggests code-compliant upsized conductors (e.g. recommending 350 kcmil copper for 184.6-meter runs).
- **Conduit Fill Verification:** Ensures recommended conduit trade sizes do not exceed Chapter 9, Table 1 raceway fill limitations.

---

## Security & Enterprise Deployment

### How do I know the downloaded installer hasn't been tampered with?
All Vectoris binaries and update manifests are cryptographically signed using Ed25519 digital signatures in Minisign format. You can verify the integrity of any downloaded binary using our official public key as described in [`VERIFICATION.md`](../VERIFICATION.md).

### How can enterprise IT departments deploy Vectoris silently?
We provide an official Windows Enterprise MSI package (`Vectoris_<version>_x64_en-US.msi`) supporting standard silent deployment flags:
```cmd
msiexec /i Vectoris_0.2.5_x64_en-US.msi /qn /norestart
```
See [`INSTALLATION.md`](./INSTALLATION.md) for full deployment details.
