$ErrorActionPreference = "Stop"

Write-Host "=== Setting up LLVM-MinGW & Rust toolchain environment ==="
$llvmBin = "C:\Users\sesa457837\AppData\Local\Microsoft\WinGet\Packages\MartinStorsjo.LLVM-MinGW.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\llvm-mingw-20260616-ucrt-x86_64\bin"
$rustSelfContained = "C:\Users\sesa457837\.rustup\toolchains\stable-x86_64-pc-windows-gnu\lib\rustlib\x86_64-pc-windows-gnu\lib\self-contained"

$env:PATH = "$llvmBin;$env:PATH"
$env:LIBRARY_PATH = "$rustSelfContained"

Write-Host "=== Configuring Tauri Updater Minisign Signing Key ==="
$keyFile = "C:\Users\sesa457837\.tauri\vectoris.key"
if (-not (Test-Path $keyFile)) {
    $keyFile = "C:\Users\sesa457837\Music\Confidential\vectoris.key"
}
$env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content $keyFile -Raw).Trim()
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "reina"
Remove-Item env:TAURI_SIGNING_PRIVATE_KEY_PATH -ErrorAction SilentlyContinue

Write-Host "Verifying toolchain binaries..."
& gcc --version
& dlltool --version

Write-Host "=== Building Frontend Assets ==="
npm.cmd run build

Write-Host "=== Building Signed Tauri Release Bundle (v0.2.5) ==="
npm.cmd run tauri:build

Write-Host "=== Tauri Build Complete ==="
Get-ChildItem -Path "src-tauri\target\x86_64-pc-windows-gnu\release\bundle" -Recurse | Select-Object FullName, Length
