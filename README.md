# Vectoris — AI-Native Engineering & Blueprint Takeoff Workstation

[![Release](https://img.shields.io/badge/Release-v0.2.5-orange?style=flat-square)](https://github.com/VectorisAI/Vectoris/releases)
[![Runtime](https://img.shields.io/badge/Runtime-Tauri%20v2%20(Rust%202021)-blue?style=flat-square)](https://tauri.app/)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript%20%7C%20Vite%207-61dafb?style=flat-square)](https://react.dev/)
[![Security](https://img.shields.io/badge/Security-Local--First%20%7C%20Zero--Telemetry-green?style=flat-square)](./SECURITY.md)
[![Verification](https://img.shields.io/badge/Cryptography-Minisign%20Ed25519-purple?style=flat-square)](./VERIFICATION.md)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](./LICENSE)

Official public release distribution, technical documentation, and architecture showcase for the **Vectoris Engineering Workstation**.

---

![Vectoris Engineering Workstation](./assets/pic.png)

> **Vectoris** is an advanced engineering workstation and project intelligence platform engineered for electrical estimators, MEP (Mechanical, Electrical, Plumbing) coordinators, and preconstruction teams. Combining a local-first desktop runtime with vision-language neural perception models, Vectoris automates the labor-intensive discipline of construction drawing takeoff, quantity calculation, and Bill of Quantities (BOQ) synthesis directly from native architectural drawings without exposing confidential project IP to uncontrolled third-party cloud infrastructure.

---

## ⚡ System Architecture & Workflow Hierarchy

Vectoris unifies preconstruction workflows into a structured **Project Intelligence Hierarchy**, transitioning from native blueprints to procurement-ready bids:

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

## 🚀 Key Engineering Capabilities

- **Local-First Blueprint Takeoff:** On-device vector extraction and layer segregation for multi-megabyte CAD DWG, DXF, and PDF sheets without cloud latency or security risk.
- **Multimodal Neural Symbol Perception:** High-accuracy classification of electrical receptacles, switchboards, luminaires, and low-voltage drops with a 99.1% benchmark precision rate.
- **Human-in-the-Loop Verification Queue:** Staged inspection queue with bounding overlays, confidence tiers, and batch approval tools ensuring zero "black box" estimation errors.
- **Automated NEC Feeder & Conduit Sizing:** Live AI engineering copilot calculating voltage drop across long feeder runs (e.g., proposing 350 kcmil conductor sizing for 184.6-meter runs) and raceway fill capacity.
- **Tauri v2 Native Desktop Shell:** Rust 2021 native core with hardware-accelerated WebView2, custom frameless window management, and sub-95MB idle RAM footprint.
- **Liquid Theme System:** 5-phase fluid Bézier wave compositor transitions between deep dark mode (black cherry/coffee bean) and alabaster light mode.
- **Cryptographic Trust Chain:** Minisign Ed25519 signature verification on all release binaries, featuring the atomic "Stay Put" update handoff.

---

## 📊 Production Benchmarks

| Metric | Benchmark Result | Industry Comparison |
|---|---|---|
| **Sheet Ingestion & Vectorization** | **< 1.2 seconds** (50MB drawing package) | 8–15s (Cloud-based SaaS) |
| **Idle Memory Footprint** | **< 95 MB RAM** | 850MB–1.4GB (Electron runtimes) |
| **Takeoff Detection Throughput** | **18,000+ items** across 400+ sheets | Days of manual tracing |
| **Perception Precision** | **99.1%** across standard MEP schedules | Variable human error |
| **Offline Reliability** | **100%** local compute availability | Fails without active internet |

---

## 📦 Downloads & Official Releases

Signed production installers and deployment packages are published on [GitHub Releases](https://github.com/VectorisAI/Vectoris/releases).

| Package | Target Platform | Description |
|---|---|---|
| **`Vectoris_0.2.5_x64-setup.exe`** | Windows 10/11 (x86_64) | Standard per-user NSIS interactive installer |
| **`Vectoris_0.2.5_x64_en-US.msi`** | Windows 10/11 (x86_64) | Enterprise MSI package for silent IT / GPO / Intune deployments |
| **`latest.json`** | All Windows Workstations | Cryptographically signed update manifest for in-app updater |

---

## 🔒 Cryptographic Release Trust Model

Every Vectoris software release is cryptographically signed using **Ed25519 asymmetric keys** in Minisign format.

### Official Minisign Public Key
```text
dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDVBM0NBNEIzQzFERDgxRjYKUldUMmdkM0JzNlE4V2xiaXJaZWkyWThFUFVYSDhMV0JROGl3T053V2FJNnFKVWl0L3hkNW4zNVEK
```

To verify a downloaded installer before execution:
```bash
minisign -Vm Vectoris_0.2.5_x64-setup.exe -p vectoris.pub
```
For complete verification steps and SHA-256 validation, see [VERIFICATION.md](./VERIFICATION.md).

---

## 📑 Complete System Documentation

Explore the comprehensive documentation suite for deep architectural and operational details:

| Document | Description |
|---|---|
| 🏛️ **[System Architecture](./docs/ARCHITECTURE.md)** | Deep technical blueprint: Tauri v2, Rust native FFI, React 19, and IPC service boundaries |
| 📐 **[Project Intelligence](./docs/PROJECT_INTELLIGENCE.md)** | Core domain model: Project containers, linear takeoffs, BOQ synthesis, and bidding |
| 🧠 **[AI Perception Pipeline](./docs/AI_PERCEPTION.md)** | Neural vision symbol classification, vector geometry extraction, and NEC sizing |
| 🎨 **[Liquid Design System](./docs/DESIGN_SYSTEM.md)** | 5-phase fluid Bézier wave compositor, dual color palettes, and workstation ergonomics |
| 💻 **[Installation & Deployment](./docs/INSTALLATION.md)** | System requirements, NSIS/MSI deployment instructions, and troubleshooting |
| ❓ **[Frequently Asked Questions](./docs/FAQ.md)** | Answers on local-first privacy, drawing formats, offline operation, and accuracy |
| 🗺️ **[Product Roadmap](./docs/ROADMAP.md)** | Strategic horizons: Revision diffing, spec parsing, and enterprise ERP connectors |
| 🛡️ **[Security Policy](./SECURITY.md)** | Vulnerability reporting protocol, supported versions, and runtime isolation |
| 🔐 **[Release Verification](./VERIFICATION.md)** | Guide for manual and automated cryptographic Ed25519 signature checks |
| 🤝 **[Contributing Guidelines](./CONTRIBUTING.md)** | Architectural guardrails, local development toolchain, and quality standards |
| 📜 **[Code of Conduct](./CODE_OF_CONDUCT.md)** | Engineering standards of technical craft, mathematical integrity, and ethics |
| 📄 **[License](./LICENSE)** | Proprietary and confidential enterprise software license |

---

## 🏢 About & Maintenance

Vectoris is developed and maintained by **Vectoris AI Inc.**

- **Public Distribution Repository:** [`VectorisAI/Vectoris`](https://github.com/VectorisAI/Vectoris)
- **Primary Upstream Repository:** [`HardikBhaskar2010/Vectoris`](https://github.com/HardikBhaskar2010/Vectoris)
- **Security Inquiries:** `security@vectoris.ai`
- **Engineering Contact:** `engineering@vectoris.ai`

---

## 📄 License

Proprietary Enterprise Software. Copyright © 2026 Vectoris AI Inc. All rights reserved.  
Unauthorized copying, reverse engineering, decompilation, or redistribution is strictly prohibited. See [LICENSE](./LICENSE) for terms.
