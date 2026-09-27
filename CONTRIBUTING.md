# Contributing to Vectoris

Welcome to the **Vectoris** engineering and distribution ecosystem. This repository serves as the public release distribution and architecture showcase for Vectoris.

While the primary core perception engine and proprietary workstation implementation are developed in private enterprise repositories, we welcome issue reports, architecture discussions, integration proposals, and documentation contributions here.

---

## Architectural Guardrails

All code and architecture proposals for Vectoris must adhere to the following core tenets:

1. **Local-First Isolation:** Customer drawings, blueprint raster tiles, and takeoff quantities must never be transmitted to external cloud APIs without explicit per-job operator authorization.
2. **Domain Boundary Encapsulation:** React UI components must not directly invoke raw Tauri IPC (`invoke()`) or Tauri plugin methods. All desktop interactions belong inside dedicated service boundaries in `src/services/` (`dataService.ts`, `engineService.ts`, `updateService.ts`).
3. **Strict Cryptographic Trust:** In-app updates must use the official Tauri updater with Ed25519 public key verification. Never stage or commit private signing keys (`*.key`).
4. **Zero Simulated Telemetry:** Do not implement fake loading spinners, simulated timeouts, or invented progress percentages. Report honest system and runtime diagnostics.
5. **Design System Fidelity:** Maintain the proprietary Vectoris CSS custom properties and motion tokens. Avoid ad-hoc utility classes or arbitrary styling overrides.

---

## Development & Build Environment

For enterprise partners and authorized contributors with codebase access:

### Toolchain Prerequisites
- **Node.js**: v20.x or higher (LTS recommended)
- **Package Manager**: npm 10.x or pnpm
- **Rust Toolchain**: Rust 1.77+ with target `x86_64-pc-windows-msvc`
- **Native Runtime**: Microsoft Edge WebView2 Runtime (pre-installed on Windows 10/11)
- **Build Tools**: Visual Studio 2022 C++ Build Tools

### Internal Workflow Commands

```bash
# Install frontend dependencies
npm install

# Start local frontend preview server (Vite 7)
npm run dev

# Launch native Tauri v2 desktop workstation in development mode
npm run tauri:dev

# Run strict TypeScript typecheck
npm run typecheck

# Build frontend production bundle
npm run build

# Build signed desktop installer bundle (.exe / .msi)
npm run tauri:build
```

---

## Repository Structure

```text
Vectoris/
├── assets/                     # Visual assets, interface diagrams, and previews
│   ├── description.md          # Full architectural and engineering deep dive
│   └── pic.png                 # Workstation dual-screen viewport screenshot
├── docs/                       # Complete engineering specifications
│   ├── ARCHITECTURE.md         # Tauri v2, Rust FFI, and React 19 architecture
│   ├── PROJECT_INTELLIGENCE.md # Core domain model: Projects, Takeoff, BOQ, Bids
│   ├── AI_PERCEPTION.md        # Neural symbol classification & vector geometry
│   ├── DESIGN_SYSTEM.md        # Liquid Theme System & fluid Bezier wave tokens
│   ├── INSTALLATION.md         # System requirements and deployment guide
│   ├── FAQ.md                  # Frequently asked technical questions
│   └── ROADMAP.md              # Vision, feature pipeline, and release horizons
├── CODE_OF_CONDUCT.md          # Technical craft standards and ethics
├── CONTRIBUTING.md             # Contribution guidelines and workflow rules
├── LICENSE                     # Proprietary software license
├── README.md                   # Public distribution repository showcase
├── SECURITY.md                 # Security disclosure and cryptographic policy
└── VERIFICATION.md             # Cryptographic installer signature verification guide
```

---

## Issue Reporting & Feedback

- **Bug Reports:** Open an issue with a clear reproduction path, platform details, and sample non-confidential drawing sheets if applicable.
- **Security Disclosures:** For vulnerabilities or data leakage risks, consult [`SECURITY.md`](./SECURITY.md) and email `security@vectoris.ai`.
- **Feature Requests:** Submit detailed workflow proposals detailing trade-specific requirements (e.g. NEC conduit derating formulas, custom symbol dictionaries).
