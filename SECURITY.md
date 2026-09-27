# Security Policy

Vectoris is engineered with an uncompromising security-first, local-first architecture. This policy details how vulnerability reports are handled, our cryptographic release chain, and runtime security isolation.

---

## Supported Versions

Only current production release lines receive active security patches and cryptographic hotfixes:

| Version | Status | Security Updates |
|---|---|---|
| `v0.2.x` | Active Production | Supported with urgent hotfixes |
| `< v0.2.0` | Deprecated / End-of-Life | Not supported |

---

## Reporting a Vulnerability

If you discover a security vulnerability, privilege escalation risk, or potential data exposure in Vectoris:

1. **Do not create public GitHub issues or discussions** for security vulnerabilities.
2. Submit your findings directly to the Vectoris Security Team at **`security@vectoris.ai`**.
3. To assist our rapid triage, please provide:
   - Operating system and build number (e.g. Windows 11 23H2 x86_64)
   - Vectoris version and binary checksum (SHA-256)
   - Detailed description of the vulnerability (e.g. IPC permission bypass, local WebView sandbox breakout, signature verification flaw)
   - Step-by-step reproduction steps or a minimal proof of concept (PoC)

### Our Response SLA
- **Initial Acknowledgement:** Within 24 hours of receipt.
- **Triage & Assessment:** Within 72 hours.
- **Remediation & Patch Release:** Prioritized based on CVSS severity scoring, distributed via signed out-of-band updates.

---

## Cryptographic Release Trust Model

Vectoris mitigates software supply chain and binary tampering risks through strict cryptographic guarantees:

- **Ed25519 Digital Signatures:** Every release installer (`.exe` and `.msi`) is signed using Ed25519 asymmetric keys with Minisign format before publication.
- **Air-Gapped Private Keys:** Release signing private keys (`TAURI_SIGNING_PRIVATE_KEY`) reside exclusively in encrypted hardware security modules (HSM) outside any public or private source code repository.
- **Embedded Verification Anchor:** The desktop runtime embeds the trusted public key directly in its core configuration (`tauri.conf.json`), verifying signatures in system memory before initiating installer handoff.
- **Public Key:**
  ```text
  dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDVBM0NBNEIzQzFERDgxRjYKUldUMmdkM0JzNlE4V2xiaXJaZWkyWThFUFVYSDhMV0JROGl3T053V2FJNnFKVWl0L3hkNW4zNVEK
  ```

---

## Runtime Isolation & Data Confidentiality

1. **Local-First Processing:** Customer blueprints, CAD vectors, circuit schedules, and quantity takeoff data are processed exclusively on the local host machine.
2. **Zero Involuntary Telemetry:** Vectoris does not upload raster drawings, PDF documents, or estimation schedules to third-party cloud infrastructure.
3. **Strict Content Security Policy (CSP):** The embedded WebView2 engine enforces a locked-down CSP prohibiting arbitrary remote script injection, inline eval, or unapproved network origins.
4. **Sandboxed IPC:** Inter-Process Communication between the React frontend and Rust native core is restricted to strictly typed and audited Tauri v2 commands.
