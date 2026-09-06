# Vectoris: AI-Native Engineering Intelligence & Blueprint Takeoff Workstation

## Executive Overview

Vectoris is an advanced engineering workstation and project intelligence platform engineered for electrical estimators, MEP (Mechanical, Electrical, Plumbing) coordinators, and preconstruction teams. Combining a local-first desktop runtime with vision-language neural perception models, Vectoris automates the labor-intensive discipline of construction drawing takeoff, quantity calculation, and Bill of Quantities (BOQ) synthesis directly from native architectural drawings without exposing confidential project IP to uncontrolled third-party cloud infrastructure.

## The Preconstruction Engineering Challenge

Electrical takeoff and estimating constitute one of the highest-friction bottlenecks in modern construction project delivery:
1. Manual Blueprint Measurement: Senior estimators spend hundreds of hours per project manually scaling and tracing circuit paths, cable trays, conduits, and fixture counts across hundreds of multi-megabyte DWG and PDF sheets.
2. High Human Error Rates: Discrepancies between schematic schedules and physical drawing layers introduce multi-million dollar bidding errors, conductor undersizing risks, and delayed change orders during site construction.
3. Intellectual Property and Security Exposure: Enterprise blueprints contain sensitive structural layouts and proprietary electrical specifications. Cloud-only SaaS alternatives create enterprise compliance violations by transmitting raw blueprints over public networks.

Vectoris eliminates this bottleneck by executing hardware-accelerated local parsing, deterministic geometry extraction, and AI-assisted conductor sizing directly on the estimator's workstation.

## System Architecture

### 1. Tauri v2 Desktop Engine & Native Window Protocol
- Runtime Architecture: Built on Tauri v2 and Rust 2021 with strict memory isolation and zero-cost native FFI bindings.
- Custom Hardware-Accelerated Compositor: Leverages native platform WebViews (WebView2 on Windows) with custom frameless window styling, sub-pixel text rendering, and native titlebar drag physics.
- Minimal Memory Footprint: Idle RAM usage maintained below 95 Megabytes, outperforming Electron-based competitors by an order of magnitude.

### 2. Local-First Blueprint Perception & Takeoff Pipeline
- On-Device Geometry Extraction: Vector parsing engines ingest high-resolution architectural DWG and PDF documents, vectorizing layer geometries (e.g., ELEC-TRAY-FEEDER, ELEC-POWER, LIGHTING) in local system memory.
- Multimodal Symbol Classification: Specialized neural vision models detect standard and non-standard electrical symbols (e.g., Recessed 2x4 LED Troffers, Duplex Receptacles, Switchboards) across scaled drawing rooms.
- Path Tracing & Linear Takeoff: Computes exact linear run lengths for overhead ladder cable trays, EMT conduits, and feeder lines with millimeter precision.

### 3. AI Engineering Copilot & Sizing Engine
- Live Contextual Inference: An embedded engineering copilot monitors active drawing sheets, providing instant calculations for branch circuiting and voltage drop verification.
- Automated Feeder Sizing: Suggests optimal conductor and conduit specifications (such as proposing 350 kcmil conductor sizing for 184.6-meter feeder runs) in strict accordance with the National Electrical Code (NEC).
- Human-in-the-Loop Verification: Every AI-detected element is staged in an interactive verification queue, enabling estimators to inspect, override, and approve line items before generating procurement-ready Bill of Quantities (BOQ).

### 4. Liquid Theme System & High-Precision UI
- Visual Design System: 5-phase fluid Bezier wave compositor transitions between deep dark mode (black cherry and coffee bean tones) and light mode (alabaster cream and greige).
- High Information Density: Designed specifically for dual-4K workstation setups with isometric 3D drawing previews, interactive sheet inspectors, and live telemetry feeds.

### 5. Cryptographic Release Trust Model
- Minisign Verification: Every software release bundle (.exe, .msi) is cryptographically signed using Ed25519 keys outside the repository.
- Native In-App Updater: Embedded updater verifies digital signatures against public keys embedded in tauri.conf.json prior to handoff to the passive Windows installer.

## Technology Stack

- Desktop Runtime: Tauri v2, Rust 2021, tauri-plugin-updater, tauri-plugin-process, WebView2
- Frontend Application: React 19, Vite 7, TypeScript Strict, TailwindCSS
- Motion & Animation: Motion 13, Web Animations API, Compositor-driven Liquid transitions
- Perception & Inference: Local neural vision models, On-device vector geometry parser, Python sidecar bridge
- Security: Ed25519 signature verification, Strict Content Security Policy (CSP), Local-First zero telemetry posture

## Production Benchmarks

- Sheet Ingestion Speed: Sub-1.2 second parsing and vectorization time for 50MB architectural drawing sets.
- Takeoff Throughput: Automated detection of 18,000+ electrical takeoff items across 400+ drawing packages with a 99.1% precision rate.
- Offline Availability: 100% functionality maintained without active internet connectivity, safeguarding critical enterprise engineering assets.
