# OpenClaw One-Click Upgrade Script
# Usage: powershell -ExecutionPolicy Bypass -File "upgrade-openclaw.ps1"
Write-Host "=== OpenClaw Upgrade Tool ===" -ForegroundColor Cyan

# 1. Stop OpenClaw
Write-Host "`n[1/5] Stopping OpenClaw..." -ForegroundColor Yellow
Get-Process -Name "openclaw" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    try { $_.CommandLine -match "openclaw" } catch { $false }
} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 2. Install latest
Write-Host "[2/5] Installing latest OpenClaw..." -ForegroundColor Yellow
npm install -g openclaw@latest
$newVersion = npx openclaw --version 2>&1
Write-Host "  Installed: $newVersion"

# 3. Compile wrapper
Write-Host "[3/5] Compiling wrapper exe..." -ForegroundColor Yellow
bun build "wrapper.js" --compile --outfile "openclaw.exe"

# 4. Patch netstat maxBuffer
Write-Host "[4/5] Patching netstat maxBuffer..." -ForegroundColor Yellow
$distDir = (npm root -g).Trim() + "\openclaw\dist"

if (-not (Test-Path $distDir)) {
    Write-Host "  ERROR: dist dir not found: $distDir" -ForegroundColor Red
    exit 1
}

$patchedCount = 0
$jsFiles = Get-ChildItem "$distDir\*.js" -File

foreach ($file in $jsFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    if (-not $content) { continue }
    
    $modified = $false
    
    # Patch execFileSync("netstat", ...) without maxBuffer
    if ($content -match 'execFileSync\("netstat"' -and $content -notmatch 'execFileSync\("netstat"[\s\S]*?maxBuffer') {
        $content = $content -replace 'execFileSync\("netstat",\s*\[[^\]]*\],\s*\{\s*encoding:\s*"utf-8"\s*\}\)', 'execFileSync("netstat", ["-ano", "-p", "TCP"], { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 })'
        $modified = $true
    }
    
    # Patch spawnSync("netstat", ...) without maxBuffer
    if ($content -match 'spawnSync\("netstat"' -and $content -notmatch 'spawnSync\("netstat"[\s\S]{0,500}?maxBuffer') {
        $content = $content -replace '(windowsHide:\s*true)(\s*\}\s*\);)', "`$1,`r`n`t`tmaxBuffer: 10 * 1024 * 1024`$2"
        $modified = $true
    }
    
    if ($modified) {
        Set-Content $file.FullName $content -NoNewline -Encoding UTF8
        Write-Host "  Patched: $($file.Name)" -ForegroundColor Green
        $patchedCount++
    }
}

if ($patchedCount -eq 0) {
    Write-Host "  No files needed patching (may already be fixed)" -ForegroundColor Gray
}

# 5. Verify
Write-Host "[5/5] Verifying..." -ForegroundColor Yellow
$version = & ".\openclaw.exe" --version 2>&1
Write-Host "`n=== Upgrade Complete ===" -ForegroundColor Cyan
Write-Host "Version: $version" -ForegroundColor Green
Write-Host "`nPlease restart OpenClaw in Cherry Studio" -ForegroundColor Yellow
