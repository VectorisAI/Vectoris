# Cryptographic Release Verification

Vectoris release binaries (.exe installers, .msi packages) and update bundles are cryptographically signed using **Ed25519 digital signatures** in Minisign format. This prevents supply chain tampering, unauthorized binary modification, and transmission corruption.

---

## Official Minisign Public Key

The official Vectoris public signing key is:

```text
dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDVBM0NBNEIzQzFERDgxRjYKUldUMmdkM0JzNlE4V2xiaXJaZWkyWThFUFVYSDhMV0JROGl3T053V2FJNnFKVWl0L3hkNW4zNVEK
```

Save this public key to a file named `vectoris.pub`:

```bash
# On Linux / macOS / Git Bash:
echo "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDVBM0NBNEIzQzFERDgxRjYKUldUMmdkM0JzNlE4V2xiaXJaZWkyWThFUFVYSDhMV0JROGl3T053V2FJNnFKVWl0L3hkNW4zNVEK" > vectoris.pub

# On Windows PowerShell:
@"
dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDVBM0NBNEIzQzFERDgxRjYKUldUMmdkM0JzNlE4V2xiaXJaZWkyWThFUFVYSDhMV0JROGl3T053V2FJNnFKVWl0L3hkNW4zNVEK
"@ | Out-File -FilePath vectoris.pub -Encoding ascii
```

---

## Verifying an Installer Manually with Minisign

1. Download the release binary (`Vectoris_<version>_x64-setup.exe`) and its associated signature file (`Vectoris_<version>_x64-setup.exe.sig`) from [GitHub Releases](https://github.com/VectorisAI/Vectoris/releases).
2. Install [Minisign](https://jedisct1.github.io/minisign/) (available via `winget install minisign` or package managers).
3. Run the verification command:

```bash
minisign -Vm Vectoris_0.2.5_x64-setup.exe -p vectoris.pub
```

### Expected Output

Upon successful verification, Minisign displays:

```text
Signature and comment signature verified
Trusted comment: timestamp:1789066936    file:Vectoris_0.2.5_x64-setup.exe
```

If the binary has been modified, tampered with, or corrupted during download, Minisign will abort with:

```text
Signature verification failed
```

---

## Verifying File Integrity via SHA-256 Checksums

You can verify the downloaded binary's SHA-256 hash in PowerShell:

```powershell
Get-FileHash -Path .\Vectoris_0.2.5_x64-setup.exe -Algorithm SHA256 | Format-List
```

Compare the resulting hash against the official hash published in the release notes.

---

## Automated In-App Verification

When using the desktop application's built-in update engine:

1. **Manifest Retrieval:** The workstation fetches `latest.json` over HTTPS from the official release endpoint.
2. **In-Memory Signature Check:** The native Rust core verifies the download payload signature against the embedded public key before saving any bytes to temporary disk storage.
3. **"Stay Put" Handoff:** Once verified, the interface displays the dedicated "Stay Put" handoff sequence and launches the passive Windows installer, preventing race conditions and ensuring atomic installation.
