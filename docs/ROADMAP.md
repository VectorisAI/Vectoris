# Product Roadmap & Engineering Horizons

## Strategic Direction

Vectoris is progressing along an intentional multi-phase roadmap, expanding from an ultra-fast local takeoff tool into an end-to-end **AI-Native Project Management & Intelligence Workspace** for electrical and MEP engineering contracting.

---

## Horizon 1: The Takeoff MVP (Current — v0.2.x)

The foundation focused on solving the core preconstruction bottleneck: high-accuracy, local-first blueprint measurement.

- [x] **Tauri v2 Desktop Architecture:** Native Rust shell, sub-95MB idle RAM, hardware-accelerated WebView2 canvas.
- [x] **On-Device Vector Parsing:** Sub-1.2s parsing and vectorization of 50MB+ architectural DWG and PDF sheets.
- [x] **Linear Takeoff Engine:** Accurate measurement for conduit, wireways, and ladder cable trays with elevation drop compensation.
- [x] **Neural Symbol Classification:** Automated detection and counting of receptacles, fixtures, panels, and switches with 99.1% precision.
- [x] **Human Verification Queue:** Visual staging and bulk review queue with bounding box overlays and confidence scoring.
- [x] **Cryptographic Update Trust Model:** Ed25519 Minisign release signing with the dedicated "Stay Put" handoff experience.
- [x] **Liquid Theme System:** 5-phase fluid Bézier wave compositor transitions between deep dark and alabaster light modes.

---

## Horizon 2: Spatial Continuity & Revision Intelligence (Next)

Focusing on multi-sheet spatial awareness and automated change order management:

- [ ] **Multi-Sheet Floor-to-Floor Continuity:** Tracing vertical feeder risers across multi-story drawing sets with automatic elevation alignment.
- [ ] **Automated Drawing Revision Diffing:** Overlaying Addendum and Bulletin drawing revisions against baseline sheets to visually highlight added, modified, or deleted runs in real time.
- [ ] **Delta Takeoff Synthesis:** Instant calculation of material variances between drawing revisions, generating change-order line items automatically.
- [ ] **Custom Symbol Library Training:** Enabling estimator teams to annotate proprietary trade symbols and train localized on-device classifiers with few-shot learning.

---

## Horizon 3: Project Document Intelligence & Spec Linking

Unifying drawing plans with specification books and equipment schedules:

- [ ] **Division 26 Specification Book Parser:** Ingesting 500+ page project manuals and extracting trade requirements, approved manufacturer lists, and cable insulation criteria.
- [ ] **Automated Schedule Cross-Referencing:** Linking luminaire tags on drawings (e.g. Type `L-1`) directly to Luminaire Schedules, extracting wattage, lumen output, and manufacturer part numbers.
- [ ] **Code Compliance Verification:** Expanded automated compliance checks for local amendments to the National Electrical Code (NEC) and NFPA 72 fire alarm spacing rules.

---

## Horizon 4: Enterprise Estimating & Commercial Delivery

Closing the loop from takeoff to bid submission:

- [ ] **Enterprise Estimating Software Connectors:** Bidirectional export/import connectors for enterprise estimating tools (Accubid, McCormick, ConEst, Procore).
- [ ] **Real-Time Local-Network Collaboration:** Multi-seat live estimating sessions over secure local area networks without external cloud exposure.
- [ ] **Procurement Vendor Integration:** Instant pricing integration with major electrical distributor APIs for real-time conductor, conduit, and gear cost indexing.
