# Installation & Deployment Guide

This guide covers system prerequisites, installation methods, enterprise mass deployment, and in-app updates for the **Vectoris Engineering Workstation**.

---

## System Requirements

| Specification | Minimum Requirement | Recommended Specification |
|---|---|---|
| **Operating System** | Windows 10 (Build 19041+) or Windows 11 (64-bit) | Windows 11 (23H2 or later, 64-bit) |
| **Processor** | Intel Core i5 / AMD Ryzen 5 (4 cores, 2.5 GHz+) | Intel Core i7/i9 or AMD Ryzen 7/9 (8+ cores) |
| **System Memory** | 8 GB RAM | 16 GB to 32 GB RAM (for multi-hundred sheet drawing sets) |
| **Graphics** | DirectX 11 compatible integrated graphics | Dedicated GPU (NVIDIA RTX / AMD Radeon) with 4GB+ VRAM |
| **Display** | 1920 × 1080 resolution | Dual 4K (3840 × 2160) workstation displays |
| **Disk Space** | 500 MB free storage for application | 5 GB+ SSD storage for local project caches and DWG sets |
| **Prerequisites** | Microsoft Edge WebView2 Runtime | Evergreen WebView2 (pre-installed on Windows 10/11) |

---

## Installation Methods

Official signed installation packages are published on the [GitHub Releases](https://github.com/VectorisAI/Vectoris/releases) page.

### Method 1: Standard User Installer (NSIS Setup)

Recommended for individual estimators and single workstations:

1. Download `Vectoris_<version>_x64-setup.exe` from [Releases](https://github.com/VectorisAI/Vectoris/releases).
2. *(Optional but Recommended)* Verify the installer's digital signature as outlined in [`VERIFICATION.md`](../VERIFICATION.md).
3. Double-click the installer and follow the guided setup wizard.
4. Vectoris will install to your local user application directory and launch automatically.

### Method 2: Enterprise MSI Package

Engineered for corporate IT administrators deploying across corporate fleets via Microsoft Intune, SCCM, or Group Policy (GPO):

1. Download `Vectoris_<version>_x64_en-US.msi`.
2. Run standard or silent installation via command line:

```cmd
:: Silent installation without user interaction
msiexec /i Vectoris_0.2.5_x64_en-US.msi /qn /norestart

:: Silent installation with verbose logging
msiexec /i Vectoris_0.2.5_x64_en-US.msi /qn /l*v "C:\Logs\vectoris_install.log"
```

---

## Automatic In-App Updates

Vectoris includes a built-in cryptographic updater powered by Tauri v2:

1. **Background Update Polling:** When launched, the workstation queries `latest.json` on the official release server over HTTPS.
2. **Cryptographic Validation:** The update package is verified in memory using the embedded Minisign Ed25519 public key before any file write operations.
3. **The "Stay Put" Experience:** When the operator chooses to update, Vectoris transitions into a dedicated update handoff view:
   - Closes open drawing locks cleanly to prevent database corruption.
   - Flushes pending project state and verification items to local IndexedDB.
   - Silently launches the updated installer and restarts the workstation.

---

## Troubleshooting Common Issues

### 1. Windows SmartScreen Warning
- **Symptom:** Windows Defender SmartScreen displays *"Windows protected your PC"*.
- **Cause:** New software releases establish reputational trust over time as download volume accumulates.
- **Resolution:** Click **More info** → **Run anyway**. You can independently verify the binary's cryptographic signature using [`VERIFICATION.md`](../VERIFICATION.md) to confirm authenticity.

### 2. Missing WebView2 Runtime
- **Symptom:** Error dialog stating *"WebView2 Runtime not found"*.
- **Resolution:** Download and install the Evergreen Bootstrapper directly from [Microsoft WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

### 3. High-DPI Scaling Adjustments
- If running dual-4K displays with unequal scaling (e.g. 150% on Display 1 and 100% on Display 2), ensure Windows Display Settings have *"Fix scaling for apps"* enabled for optimal sub-pixel drawing vector rendering.
