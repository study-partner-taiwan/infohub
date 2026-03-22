# InfoHub - Install & Launch Script

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "InfoHub Installer"

# Move to script directory
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "  ======================================" -ForegroundColor Cyan
Write-Host "       InfoHub  -  Install & Launch     " -ForegroundColor Cyan
Write-Host "  ======================================" -ForegroundColor Cyan
Write-Host ""

# ========== Step 1: Check Node.js ==========
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Yellow

$nodeExists = $null
try { $nodeExists = Get-Command node -ErrorAction SilentlyContinue } catch {}

if (-not $nodeExists) {
    Write-Host ""
    Write-Host "  Node.js not found. Installing..." -ForegroundColor Red
    Write-Host ""

    $nodeUrl = "https://nodejs.org/dist/v20.18.1/node-v20.18.1-x64.msi"
    $installerPath = "$env:TEMP\node-install.msi"

    Write-Host "  Downloading Node.js..." -ForegroundColor Gray
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $nodeUrl -OutFile $installerPath -UseBasicParsing
    } catch {
        Write-Host ""
        Write-Host "  [FAILED] Download failed." -ForegroundColor Red
        Write-Host "  Please install Node.js manually: https://nodejs.org" -ForegroundColor White
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }

    Write-Host "  Running installer..." -ForegroundColor Gray
    Start-Process msiexec.exe -ArgumentList "/i `"$installerPath`" /passive" -Wait

    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    try { $nodeExists = Get-Command node -ErrorAction SilentlyContinue } catch {}
    if (-not $nodeExists) {
        Write-Host ""
        Write-Host "  [FAILED] Node.js installation failed." -ForegroundColor Red
        Write-Host "  Please install manually: https://nodejs.org" -ForegroundColor White
        Write-Host "  Then run this script again." -ForegroundColor White
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }

    Write-Host "  [OK] Node.js installed!" -ForegroundColor Green
}

$nodeVer = node -v
Write-Host "  [OK] Node.js version: $nodeVer" -ForegroundColor Green

# ========== Step 2: Clean old files ==========
Write-Host ""
Write-Host "[2/5] Cleaning old files..." -ForegroundColor Yellow

if (Test-Path "node_modules") {
    Write-Host "  Removing old node_modules (this may take a moment)..." -ForegroundColor Gray
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}
if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
}
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
}
Write-Host "  [OK] Clean!" -ForegroundColor Green

# ========== Step 3: Install dependencies ==========
Write-Host ""
Write-Host "[3/5] Installing dependencies (npm install)..." -ForegroundColor Yellow
Write-Host ""

npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  [FAILED] npm install failed." -ForegroundColor Red
    Write-Host "  Check your internet connection and try again." -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""
Write-Host "  [OK] Dependencies installed!" -ForegroundColor Green

# ========== Step 4: Create .env.local ==========
Write-Host ""
Write-Host "[4/5] Setting up configuration..." -ForegroundColor Yellow

if (-not (Test-Path ".env.local")) {
    Copy-Item ".env.example" ".env.local"
    Write-Host "  [OK] Created .env.local" -ForegroundColor Green
    Write-Host ""
    Write-Host "  +-------------------------------------------------+" -ForegroundColor DarkCyan
    Write-Host "  |  OPTIONAL: Add Claude API Key for AI classify    |" -ForegroundColor DarkCyan
    Write-Host "  |  Without API Key = keyword-based classify (OK)   |" -ForegroundColor DarkCyan
    Write-Host "  |  With API Key    = smart AI classify (better)    |" -ForegroundColor DarkCyan
    Write-Host "  |                                                  |" -ForegroundColor DarkCyan
    Write-Host "  |  Get key: https://console.anthropic.com          |" -ForegroundColor DarkCyan
    Write-Host "  |  Edit:    .env.local                             |" -ForegroundColor DarkCyan
    Write-Host "  +-------------------------------------------------+" -ForegroundColor DarkCyan
} else {
    Write-Host "  [OK] .env.local already exists, skipping" -ForegroundColor Green
}

# ========== Step 5: Get local IP ==========
$localIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" -ErrorAction SilentlyContinue).IPAddress
if (-not $localIP) {
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress
}
if (-not $localIP) { $localIP = "check-your-ip" }

# ========== Step 6: Launch ==========
Write-Host ""
Write-Host "[5/5] Starting InfoHub..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  ======================================" -ForegroundColor Green
Write-Host "        InfoHub is ready!               " -ForegroundColor Green
Write-Host "  ======================================" -ForegroundColor Green
Write-Host ""
Write-Host "  PC:     http://localhost:3000" -ForegroundColor White
Write-Host "  Phone:  http://${localIP}:3000" -ForegroundColor White
Write-Host ""
Write-Host "  --- How to use on phone ---" -ForegroundColor DarkYellow
Write-Host "  1. Connect phone to same Wi-Fi" -ForegroundColor Gray
Write-Host "  2. Open http://${localIP}:3000 in phone browser" -ForegroundColor Gray
Write-Host "  3. 'Add to Home Screen' (install PWA)" -ForegroundColor Gray
Write-Host "  4. Now share from Instagram -> InfoHub!" -ForegroundColor Gray
Write-Host ""
Write-Host "  Press Ctrl+C to stop the server" -ForegroundColor DarkGray
Write-Host ""

# Open browser
Start-Process "http://localhost:3000"

# Start server
npx next dev
